import { describe, it, expect, vi, beforeEach } from "vitest";

const sessionsCreate = vi.fn(async () => ({ id: "cs_live_1", url: "https://checkout/commission" }));
const sessionsRetrieve = vi.fn(async () => ({ status: "open", url: "https://checkout.stripe.com/old" }));
const sessionsExpire = vi.fn(async () => ({ id: "cs_live_1", status: "expired" }));
vi.mock("./stays/stripe-helpers", () => ({
  stripeClient: () => ({
    checkout: { sessions: { create: sessionsCreate, retrieve: sessionsRetrieve, expire: sessionsExpire } },
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
  // Meme contrat que le vrai assertWritten : zero ligne touchee est un succes,
  // seule une erreur PostgREST leve.
  assertWritten: (op: string, id: number, error: { message: string } | null) => {
    if (!error) return;
    throw new Error(`${op}(${id}) refuse par la base: ${error.message}`);
  },
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
function wiring(
  opts: {
    lockRows?: unknown[];
    request?: unknown;
    partner?: unknown;
    /** Injecte une erreur PostgREST sur l update dont le patch matche. */
    updateError?: (patch: Record<string, unknown>) => { message: string } | null;
  } = {},
) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation((table: string) => {
    if (table === "car_requests") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.request ?? REQUEST }) }) }),
        update: (patch: Record<string, unknown>) => {
          updates.push(patch);
          const error = opts.updateError?.(patch) ?? null;
          return {
            eq: () => ({
              is: () => ({
                select: async () => ({ data: error ? null : (opts.lockRows ?? [{ id: 42 }]), error }),
              }),
              select: async () => ({ data: error ? null : [{ id: 42 }], error }),
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

  it("le verrou refuse par la base : un vrai refus PostgREST n est pas une concurrence gagnee", async () => {
    // `!locked` se lit exactement comme un verrou deja pris par un autre appel.
    // Un refus reel (droits, contrainte, panne reseau) doit rester distinguable :
    // "already_requested" dirait a tort qu il n y a rien a faire, alors que la
    // facturation ne fonctionne plus du tout.
    const updates = wiring({
      updateError: (patch) =>
        typeof patch.commission_requested_at === "string" ? { message: "permission denied" } : null,
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await requestCommission(42);

    expect(res).toMatchObject({ status: "failed", code: "lock_write_failed" });
    expect(createInvoiceForRequest).not.toHaveBeenCalled();
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
    // Le verrou n a jamais ete pose : pas de releaseLock, donc un seul update tente.
    expect(updates).toHaveLength(1);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("permission denied");
    errSpy.mockRestore();
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

  it("verrou non libere : journalise sans remplacer l erreur d origine, la fonction ne leve pas", async () => {
    // releaseLock() est appelee depuis un chemin d echec DEJA journalise : lever
    // ici ecraserait le motif reel (numerotation impossible) par « releaseLock
    // refuse », et ferait en plus planter l appelant. Le cron appelle
    // requestCommission ligne par ligne SANS try/catch : une exception ici
    // ferait tomber toutes les lignes suivantes.
    const updates = wiring({
      updateError: (patch) =>
        patch.commission_requested_at === null ? { message: "permission denied" } : null,
    });
    createInvoiceForRequest.mockRejectedValueOnce(new Error("numerotation impossible") as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await requestCommission(42);

    expect(res).toMatchObject({ status: "failed", code: "invoice_creation_failed" });
    expect(updates.some((u) => u.commission_requested_at === null)).toBe(true);
    // Le motif d origine reste present et lisible, pas remplace.
    const originalLog = errSpy.mock.calls.find(
      (call) => (call[1] as { err?: Error })?.err?.message === "numerotation impossible",
    );
    expect(originalLog).toBeTruthy();
    // Le refus du verrou est journalise a part, distinctement (l Error n est
    // pas serialisable par JSON.stringify : on lit l objet reel).
    const lockLog = errSpy.mock.calls.find(
      (call) => (call[1] as { err?: Error })?.err?.message?.includes("permission denied"),
    );
    expect(lockLog).toBeTruthy();
    expect(lockLog?.[0]).toContain("verrou non libere");
    errSpy.mockRestore();
  });

  it("l enregistrement de l envoi refuse ne passe pas pour un succes", async () => {
    // markInvoiceSent leve maintenant quand PostgREST refuse l ecriture. L email
    // EST parti, mais sent_at reste vide : la facture s affichera « jamais
    // envoyee » au back-office. Rendre « requested » ferait compter au cron une
    // facture en bon ordre alors qu elle appelle une main humaine.
    wiring();
    markInvoiceSent.mockRejectedValueOnce(
      new Error("markInvoiceSent(7) refuse par la base: permission denied") as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await requestCommission(42);

    expect(res).toMatchObject({ status: "failed", code: "invoice_sent_not_recorded" });
    expect(sendPartnerCommissionRequest).toHaveBeenCalledOnce();
    expect(JSON.stringify(errSpy.mock.calls)).toContain("CD-2026-0007");
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

  it("demande passee en perdue : plus rien a payer, avoir ou pas", async () => {
    // Le bouton « Perdu » du back-office n emet aucun avoir (une piece
    // comptable n est pas un effet de bord d un clic de statut). Sans cette
    // garde, le lien de paiement deja parti par email reste vivant et encaisse
    // la commission d une location qui n a pas eu lieu.
    wiring({ request: { ...REQUEST, outcome: "lost" } });
    expect(await ensureCommissionCheckout("tok")).toEqual({ error: "request_lost" });
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(sessionsRetrieve).not.toHaveBeenCalled();
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

  it("session Stripe creee mais non enregistree : elle est expiree, l url n est jamais rendue", async () => {
    // La session Stripe existe deja et vit 24 h. Sans son id en base, ni un
    // avoir ni le bouton « Perdu » ne peuvent plus l expirer : elle
    // continuerait d encaisser sur une location qu on croit close. On ne peut
    // pas rendre l url dans cet etat : ce serait rouvrir exactement le defaut
    // qu expireCommissionSession existe pour fermer.
    const updates = wiring({
      updateError: (patch) => ("commission_session_id" in patch ? { message: "permission denied" } : null),
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await ensureCommissionCheckout("tok");

    expect(res).toEqual({ error: "session_not_recorded" });
    expect(sessionsExpire).toHaveBeenCalledWith("cs_live_1");
    expect(updates.some((u) => u.commission_session_id === "cs_live_1")).toBe(true);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("permission denied");
    errSpy.mockRestore();
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
