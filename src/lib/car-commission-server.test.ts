import { describe, it, expect, vi, beforeEach } from "vitest";

const sessionsCreate = vi.fn(async () => ({ id: "cs_live_1", url: "https://checkout/commission" }));
const sessionsRetrieve = vi.fn(async () => ({ status: "open", url: "https://checkout.stripe.com/old" }));
vi.mock("./stays/stripe-helpers", () => ({
  stripeClient: () => ({
    checkout: { sessions: { create: sessionsCreate, retrieve: sessionsRetrieve } },
  }),
}));
// Resend accepte par defaut : le refus a son propre test, et il doit rester
// visible comme une exception, pas comme le cas de base.
const sendPartnerCommissionRequest = vi.fn(async () => true);
vi.mock("./email", () => ({
  sendPartnerCommissionRequest: (...a: unknown[]) => sendPartnerCommissionRequest(...a),
}));

const INVOICE = {
  id: 7,
  number: "CD-2026-0007",
  request_id: 42,
  partner_id: 111,
  base_amount_eur: 210,
  rate: 0.15,
  amount_eur: 31.5,
  issued_at: "2026-08-01T05:00:00.000Z",
  sent_at: null,
  paid_at: null,
  credited_at: null,
  credit_number: null,
  credit_reason: null,
};
const createInvoiceForRequest = vi.fn(async () => ({
  invoice: INVOICE,
  token: "tok_en_clair",
  reused: false,
}));
const markInvoiceSent = vi.fn(async () => {});
const invoiceByToken = vi.fn(async () => INVOICE as typeof INVOICE | null);
vi.mock("./car-invoice-server", () => ({
  createInvoiceForRequest: (...a: unknown[]) => createInvoiceForRequest(...a),
  markInvoiceSent: (...a: unknown[]) => markInvoiceSent(...a),
  invoiceByToken: (...a: unknown[]) => invoiceByToken(...a),
}));

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));

import { requestCommission, ensureCommissionCheckout } from "./car-commission-server";

const REQUEST = {
  id: 42, outcome: "rented", commission_eur: 31.5, commission_paid_at: null,
  commission_session_id: null, quoted_by_partner_id: 111,
  final_amount_eur: 210, date_from: "2026-08-01", date_to: "2026-08-08",
};
const PARTNER = { id: 111, name: "Zorbas Rent a Car", email: "info@zorbas.gr" };

/** Verrou pris : l'update conditionnel renvoie la ligne. */
function wiring(opts: { lockRows?: unknown[]; request?: unknown; partner?: unknown } = {}) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation((table: string) => {
    if (table === "car_requests") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.request ?? REQUEST }) }) }),
        update: (patch: Record<string, unknown>) => {
          updates.push(patch);
          return {
            eq: () => ({
              is: () => ({ select: async () => ({ data: opts.lockRows ?? [{ id: 42 }], error: null }) }),
              select: async () => ({ data: [{ id: 42 }], error: null }),
            }),
          };
        },
      };
    }
    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: "partner" in opts ? opts.partner : PARTNER }) }),
      }),
    };
  });
  return updates;
}

describe("requestCommission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Interrupteur allume pour les cas nominaux ; son extinction a son propre test.
    process.env.CAR_COMMISSION_ENABLED = "on";
  });

  it("eteint par defaut : ni session Stripe, ni email, ni ecriture", async () => {
    // Tant que le systeme n'est pas juge pret, aucune facture ne doit partir chez
    // un loueur reel, meme si le code est deja deploye en production.
    delete process.env.CAR_COMMISSION_ENABLED;
    const updates = wiring();
    const res = await requestCommission(42);
    expect(res.status).toBe("disabled");
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(createInvoiceForRequest).not.toHaveBeenCalled();
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it("toute valeur autre que \"on\" laisse le systeme eteint", async () => {
    for (const value of ["", "off", "true", "1", "ON "]) {
      process.env.CAR_COMMISSION_ENABLED = value;
      vi.clearAllMocks();
      wiring();
      expect((await requestCommission(42)).status).toBe("disabled");
      expect(sessionsCreate).not.toHaveBeenCalled();
      expect(createInvoiceForRequest).not.toHaveBeenCalled();
    }
  });

  it("cree la facture, ecrit au loueur et note l envoi", async () => {
    wiring();
    const res = await requestCommission(42);
    expect(res).toMatchObject({ status: "requested" });
    expect(createInvoiceForRequest).toHaveBeenCalledOnce();
    expect(createInvoiceForRequest.mock.calls[0][0]).toMatchObject({
      requestId: 42, partnerId: 111, base: 210, amount: 31.5,
    });
    expect(sendPartnerCommissionRequest).toHaveBeenCalledOnce();
    expect(sendPartnerCommissionRequest.mock.calls[0][0]).toBe("info@zorbas.gr");
    expect(markInvoiceSent).toHaveBeenCalledWith(7);
  });

  it("ne parle plus a Stripe a l emission : une session expire en 24 h", async () => {
    // Le cron nocturne appelle requestCommission a 5 h. Une session creee la
    // serait morte avant que le loueur n'ouvre son courrier : le lien doit naitre
    // au clic, pas a l'emission.
    wiring();
    await requestCommission(42);
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(sessionsRetrieve).not.toHaveBeenCalled();
  });

  it("l email pointe vers la page facture, jamais vers Stripe", async () => {
    wiring();
    await requestCommission(42);
    const mail = sendPartnerCommissionRequest.mock.calls[0][1] as { payUrl: string };
    expect(mail.payUrl).toContain("/invoice/");
    expect(mail.payUrl).toContain("tok_en_clair");
    expect(mail.payUrl).not.toContain("stripe.com");
  });

  it("transmet le numero de facture a l email, pour le rapprochement du loueur", async () => {
    wiring();
    await requestCommission(42);
    const mail = sendPartnerCommissionRequest.mock.calls[0][1] as { invoiceNumber?: string };
    expect(mail.invoiceNumber).toBe("CD-2026-0007");
  });

  it("ne pose sent_at que si Resend a accepte, et garde la facture", async () => {
    // ⛔ Une facture numerotee non envoyee se rattrape depuis le back-office ;
    // une facture envoyee non enregistree est perdue. On ne detruit rien.
    wiring();
    sendPartnerCommissionRequest.mockResolvedValueOnce(false as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await requestCommission(42);

    expect(res.status).toBe("failed");
    expect(markInvoiceSent).not.toHaveBeenCalled();
    expect(createInvoiceForRequest).toHaveBeenCalledOnce();
    expect(JSON.stringify(errSpy.mock.calls)).toContain("CD-2026-0007");
    errSpy.mockRestore();
  });

  it("ne renvoie pas une facture deja envoyee", async () => {
    wiring();
    createInvoiceForRequest.mockResolvedValueOnce({
      invoice: { ...INVOICE, sent_at: "2026-08-01T05:00:00.000Z" },
      token: null,
      reused: true,
    } as never);
    const res = await requestCommission(42);
    expect(res.status).toBe("already_requested");
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
    expect(markInvoiceSent).not.toHaveBeenCalled();
  });

  it("ne facture pas deux fois : verrou perdu, aucune facture creee", async () => {
    wiring({ lockRows: [] });
    const res = await requestCommission(42);
    expect(res.status).toBe("already_requested");
    expect(createInvoiceForRequest).not.toHaveBeenCalled();
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
  });

  it("ne facture pas une location perdue", async () => {
    wiring({ request: { ...REQUEST, outcome: "lost" } });
    const res = await requestCommission(42);
    expect(res.status).toBe("skipped");
    expect(createInvoiceForRequest).not.toHaveBeenCalled();
  });

  it("ne facture pas une commission sous le minimum Stripe", async () => {
    wiring({ request: { ...REQUEST, commission_eur: 0.4 } });
    expect((await requestCommission(42)).status).toBe("skipped");
    expect(createInvoiceForRequest).not.toHaveBeenCalled();
  });

  it("relache le verrou quand la facture est impossible, pour permettre un nouvel essai", async () => {
    const updates = wiring();
    createInvoiceForRequest.mockRejectedValueOnce(new Error("numerotation impossible") as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await requestCommission(42);

    expect(res).toMatchObject({ status: "failed", code: "invoice_creation_failed" });
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
    // commission_requested_at remis a null : sans cela la location resterait
    // facturable a vie sans que personne ne puisse relancer.
    expect(updates.some((u) => u.commission_requested_at === null)).toBe(true);
    errSpy.mockRestore();
  });

  it("relache le verrou quand le loueur n a pas d email", async () => {
    const updates = wiring({ partner: null });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await requestCommission(42);
    expect(res).toMatchObject({ status: "failed", code: "partner_without_email" });
    expect(createInvoiceForRequest).not.toHaveBeenCalled();
    expect(updates.some((u) => u.commission_requested_at === null)).toBe(true);
    errSpy.mockRestore();
  });
});

describe("ensureCommissionCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAR_COMMISSION_ENABLED = "on";
  });

  it("token inconnu : rien a payer", async () => {
    wiring();
    invoiceByToken.mockResolvedValueOnce(null);
    expect(await ensureCommissionCheckout("inconnu")).toEqual({ error: "not_found" });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("facture deja payee : aucune seconde session", async () => {
    wiring();
    invoiceByToken.mockResolvedValueOnce({ ...INVOICE, paid_at: "2026-08-02T10:00:00.000Z" });
    expect(await ensureCommissionCheckout("tok")).toEqual({ error: "already_paid" });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("facture avoiree : plus rien a encaisser", async () => {
    wiring();
    invoiceByToken.mockResolvedValueOnce({ ...INVOICE, credited_at: "2026-08-02T10:00:00.000Z" });
    expect(await ensureCommissionCheckout("tok")).toEqual({ error: "credited" });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("cas nominal : la session nait au clic et son id est note sur la demande", async () => {
    const updates = wiring();
    const res = await ensureCommissionCheckout("tok");
    expect(res).toEqual({ url: "https://checkout/commission" });
    expect(sessionsCreate).toHaveBeenCalledOnce();
    // Le montant facture est bien celui de la commission, pas celui de la location.
    const params = sessionsCreate.mock.calls[0][0] as unknown as {
      line_items: Array<{ price_data: { unit_amount: number } }>;
    };
    expect(params.line_items[0].price_data.unit_amount).toBe(3150);
    expect(updates.some((u) => u.commission_session_id === "cs_live_1")).toBe(true);
  });

  it("reutilise une session encore ouverte plutot que d en creer une seconde", async () => {
    wiring({ request: { ...REQUEST, commission_session_id: "cs_open_1" } });
    const res = await ensureCommissionCheckout("tok");
    expect(res).toEqual({ url: "https://checkout.stripe.com/old" });
    expect(sessionsRetrieve).toHaveBeenCalledWith("cs_open_1");
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("session expiree : on en cree une neuve", async () => {
    wiring({ request: { ...REQUEST, commission_session_id: "cs_expired" } });
    sessionsRetrieve.mockResolvedValueOnce({ status: "expired", url: null } as never);
    const res = await ensureCommissionCheckout("tok");
    expect(res).toEqual({ url: "https://checkout/commission" });
    expect(sessionsCreate).toHaveBeenCalledOnce();
  });

  it("Stripe refuse au clic : le code de panne remonte, rien n est note", async () => {
    const updates = wiring();
    sessionsCreate.mockRejectedValueOnce(
      Object.assign(new Error("card_declined"), { requestId: "req_car_9" }) as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await ensureCommissionCheckout("tok");
    expect(res).toEqual({ error: "payment_provider" });
    expect(updates.some((u) => "commission_session_id" in u)).toBe(false);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("req_car_9");
    errSpy.mockRestore();
  });
});
