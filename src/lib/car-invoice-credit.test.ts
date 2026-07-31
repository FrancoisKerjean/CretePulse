import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Resend accepte par defaut : le refus a son propre test, il doit rester une
// exception visible et pas le cas de base.
const sendCreditNote = vi.fn(async () => true);
const sendPartnerCommissionRequest = vi.fn(async () => true);
vi.mock("./email", () => ({
  sendCreditNote: (...a: unknown[]) => sendCreditNote(...a),
  sendPartnerCommissionRequest: (...a: unknown[]) => sendPartnerCommissionRequest(...a),
}));

const sessionsExpire = vi.fn(async () => ({ id: "cs_open_1", status: "expired" }));
vi.mock("./stays/stripe-helpers", () => ({
  stripeClient: () => ({ checkout: { sessions: { expire: sessionsExpire } } }),
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
  sent_at: null as string | null,
  paid_at: null as string | null,
  credited_at: null as string | null,
  credit_number: null as string | null,
  credit_reason: null as string | null,
};

const invoiceForRequest = vi.fn(async () => INVOICE as typeof INVOICE | null);
const creditInvoice = vi.fn(async (_id: number, number: string) => `${number}-A`);
const markInvoiceSent = vi.fn(async () => {});
let tokenSeq = 0;
const rotateInvoiceToken = vi.fn(async () => `tok_neuf_${++tokenSeq}`);
vi.mock("./car-invoice-server", () => ({
  invoiceForRequest: (...a: unknown[]) => invoiceForRequest(...a),
  creditInvoice: (...a: unknown[]) => creditInvoice(...(a as [number, string, string])),
  markInvoiceSent: (...a: unknown[]) => markInvoiceSent(...a),
  rotateInvoiceToken: (...a: unknown[]) => rotateInvoiceToken(...a),
  // Meme contrat que le vrai assertWritten : zero ligne touchee est un succes,
  // seule une erreur PostgREST leve.
  assertWritten: (op: string, id: number, error: { message: string } | null) => {
    if (!error) return;
    throw new Error(`${op}(${id}) refuse par la base: ${error.message}`);
  },
}));

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));

import { creditCommissionInvoice, resendCommissionInvoice } from "./car-invoice-credit";

const PARTNER = { id: 111, name: "Zorbas Rent a Car", email: "info@zorbas.gr" };
const REQUEST = {
  id: 42,
  date_from: "2026-08-01",
  date_to: "2026-08-08",
  commission_session_id: "cs_open_1",
};

interface Wiring {
  tables: string[];
  /** Filtres `.eq()` poses, dans l ordre, tous appels confondus. */
  filters: Array<[string, unknown]>;
  updates: Array<Record<string, unknown>>;
}

/**
 * Chaine PostgREST modelee a la main plutot qu un faux builder permissif : la
 * FORME de la chaine fait partie de ce que le test verifie. Une lecture passe
 * par `select().eq().maybeSingle()`, une ecriture par `update().eq().select()`.
 */
function wiring(
  opts: {
    partner?: unknown;
    request?: unknown;
    /** Injecte une erreur PostgREST sur l update `car_requests` qui repasse la demande en perdue. */
    outcomeUpdateError?: { message: string } | null;
  } = {},
): Wiring {
  const w: Wiring = { tables: [], filters: [], updates: [] };
  from.mockImplementation((table: string) => {
    w.tables.push(table);
    const row = () =>
      table === "car_partners"
        ? "partner" in opts
          ? opts.partner
          : PARTNER
        : "request" in opts
          ? opts.request
          : REQUEST;
    return {
      select: () => ({
        eq: (col: string, val: unknown) => {
          w.filters.push([col, val]);
          return { maybeSingle: async () => ({ data: row() }) };
        },
      }),
      update: (patch: Record<string, unknown>) => {
        w.updates.push(patch);
        return {
          eq: (col: string, val: unknown) => {
            w.filters.push([col, val]);
            const error = "outcome" in patch ? (opts.outcomeUpdateError ?? null) : null;
            return { select: async () => ({ data: error ? null : [{ id: 42 }], error }) };
          },
        };
      },
    };
  });
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenSeq = 0;
  invoiceForRequest.mockResolvedValue(INVOICE);
  creditInvoice.mockImplementation(async (_id: number, number: string) => `${number}-A`);
  rotateInvoiceToken.mockImplementation(async () => `tok_neuf_${++tokenSeq}`);
  sendCreditNote.mockResolvedValue(true);
  sendPartnerCommissionRequest.mockResolvedValue(true);
  sessionsExpire.mockResolvedValue({ id: "cs_open_1", status: "expired" });
});

describe("creditCommissionInvoice", () => {
  it("emet l avoir, repasse la demande en perdue et previent le loueur", async () => {
    const w = wiring();
    const res = await creditCommissionInvoice(42, "location annulee par le client");

    expect(res).toMatchObject({ creditNumber: "CD-2026-0007-A", notified: true });
    expect(creditInvoice).toHaveBeenCalledWith(7, "CD-2026-0007", "location annulee par le client");

    // La demande redevient perdue et surtout ne garde aucune commission
    // encaissable : sans ce reset, l ecran continuerait a compter cet argent.
    const patch = w.updates.find((u) => "outcome" in u);
    expect(patch).toMatchObject({ outcome: "lost", commission_paid_at: null });
    expect(typeof patch?.outcome_at).toBe("string");
    expect(w.filters).toContainEqual(["id", 42]);

    expect(sendCreditNote).toHaveBeenCalledOnce();
    expect(sendCreditNote.mock.calls[0][0]).toBe("info@zorbas.gr");
    expect(sendCreditNote.mock.calls[0][1]).toMatchObject({
      creditNumber: "CD-2026-0007-A",
      number: "CD-2026-0007",
      partnerName: "Zorbas Rent a Car",
      amountEur: 31.5,
      reason: "location annulee par le client",
    });
  });

  it("refuse d avoirer une facture deja reglee", async () => {
    // Le remboursement Stripe est manuel et hors perimetre : mieux vaut refuser
    // que produire un avoir sur de l argent deja encaisse.
    invoiceForRequest.mockResolvedValue({ ...INVOICE, paid_at: "2026-08-02T10:00:00.000Z" });
    const w = wiring();

    expect(await creditCommissionInvoice(42, "annulation")).toEqual({ error: "already_paid" });
    expect(creditInvoice).not.toHaveBeenCalled();
    expect(sendCreditNote).not.toHaveBeenCalled();
    expect(w.updates).toHaveLength(0);
  });

  it("refuse une facture deja avoiree", async () => {
    invoiceForRequest.mockResolvedValue({
      ...INVOICE,
      credited_at: "2026-08-02T10:00:00.000Z",
      credit_number: "CD-2026-0007-A",
    });
    const w = wiring();

    expect(await creditCommissionInvoice(42, "annulation")).toEqual({ error: "already_credited" });
    expect(creditInvoice).not.toHaveBeenCalled();
    expect(sendCreditNote).not.toHaveBeenCalled();
    expect(w.updates).toHaveLength(0);
  });

  it("rend une erreur quand aucune facture n existe pour cette demande", async () => {
    invoiceForRequest.mockResolvedValue(null);
    const w = wiring();

    expect(await creditCommissionInvoice(42, "annulation")).toEqual({ error: "no_invoice" });
    expect(creditInvoice).not.toHaveBeenCalled();
    expect(w.updates).toHaveLength(0);
  });

  it("un loueur sans email n empeche pas l avoir, mais l absence est signalee", async () => {
    // L avoir est un acte comptable : il doit exister meme quand on ne peut pas
    // le notifier. C est la notification qui manque, pas la piece.
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = wiring({ partner: { id: 111, name: "Zorbas", email: null } });

    const res = await creditCommissionInvoice(42, "location annulee");

    expect(res).toEqual({ creditNumber: "CD-2026-0007-A", notified: false });
    expect(creditInvoice).toHaveBeenCalledOnce();
    expect(w.updates.find((u) => "outcome" in u)).toMatchObject({ outcome: "lost" });
    expect(sendCreditNote).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("tue la session Stripe encore ouverte et vide commission_session_id", async () => {
    // Cas reel : le loueur a clique « Pay by card », la session s est ouverte
    // (24 h de vie), il n a pas abouti. La location est annulee, l avoir part.
    // S il revient sur son onglet et paie, l argent est encaisse sur une facture
    // annulee et personne n apprend qu il faut rembourser.
    const w = wiring();
    await creditCommissionInvoice(42, "location annulee");

    expect(sessionsExpire).toHaveBeenCalledWith("cs_open_1");
    expect(w.updates.find((u) => "outcome" in u)).toMatchObject({ commission_session_id: null });
  });

  it("expire la session AVANT d ecrire l avoir", async () => {
    // Entre les deux, une session vivante encaisserait sur une facture qu on
    // vient d annuler. La fenetre doit etre la plus courte possible.
    wiring();
    await creditCommissionInvoice(42, "location annulee");

    expect(sessionsExpire.mock.invocationCallOrder[0]).toBeLessThan(
      creditInvoice.mock.invocationCallOrder[0],
    );
  });

  it("aucune session ouverte : Stripe n est pas derange", async () => {
    wiring({ request: { ...REQUEST, commission_session_id: null } });
    const res = await creditCommissionInvoice(42, "location annulee");

    expect(sessionsExpire).not.toHaveBeenCalled();
    expect(res).toMatchObject({ creditNumber: "CD-2026-0007-A" });
  });

  it("ecriture de l avoir refusee : rien n est notifie, rien n est repasse en perdu", async () => {
    // creditInvoice leve quand PostgREST refuse. L erreur remonte telle quelle :
    // sans ca, on rendrait un numero d avoir qui n existe nulle part, la demande
    // passerait en « perdue » et le loueur recevrait la notification d une piece
    // comptable inexistante.
    creditInvoice.mockRejectedValueOnce(
      new Error("creditInvoice(7) refuse par la base: permission denied") as never,
    );
    const w = wiring();

    await expect(creditCommissionInvoice(42, "location annulee")).rejects.toThrow(
      /refuse par la base/,
    );
    expect(sendCreditNote).not.toHaveBeenCalled();
    expect(w.updates.find((u) => "outcome" in u)).toBeUndefined();
  });

  it("etat de la demande non mis a jour : l avoir existe deja, le loueur est quand meme prevenu", async () => {
    // creditInvoice a deja reussi : la piece comptable est irreversible et deja
    // en base a ce point. Rejouer creditCommissionInvoice est bloque par le
    // garde `already_credited` (test ci-dessus), donc une exception ICI ne
    // reparerait rien et empecherait en plus le seul geste qui reste possible :
    // prevenir le loueur. On journalise fort pour une correction manuelle de
    // car_requests, et on continue.
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = wiring({ outcomeUpdateError: { message: "permission denied" } });

    const res = await creditCommissionInvoice(42, "location annulee");

    expect(res).toEqual({ creditNumber: "CD-2026-0007-A", notified: true });
    expect(creditInvoice).toHaveBeenCalledOnce();
    expect(sendCreditNote).toHaveBeenCalledOnce();
    expect(w.updates.find((u) => "outcome" in u)).toMatchObject({ outcome: "lost" });
    // L Error n est pas serialisable par JSON.stringify (pas de proprietes
    // enumerables) : on verifie l objet reellement journalise, pas sa forme JSON.
    const logged = err.mock.calls.find(
      (call) => (call[1] as { err?: Error })?.err?.message?.includes("permission denied"),
    );
    expect(logged).toBeTruthy();
    expect(JSON.stringify(err.mock.calls)).toContain("CD-2026-0007-A");
    err.mockRestore();
  });

  it("Stripe refuse l expiration : l avoir est emis quand meme", async () => {
    // Session deja expiree, deja consommee, ou API muette. L avoir est un acte
    // comptable : il ne depend pas de la sante de Stripe. On journalise et on
    // continue.
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    sessionsExpire.mockRejectedValueOnce(new Error("No such checkout.session"));
    const w = wiring();

    const res = await creditCommissionInvoice(42, "location annulee");

    expect(res).toMatchObject({ creditNumber: "CD-2026-0007-A", notified: true });
    expect(creditInvoice).toHaveBeenCalledOnce();
    expect(w.updates.find((u) => "outcome" in u)).toMatchObject({ commission_session_id: null });
    expect(JSON.stringify(err.mock.calls)).toContain("cs_open_1");
    err.mockRestore();
  });
});

describe("resendCommissionInvoice", () => {
  it("regenere le jeton, renvoie l email et note le nouvel envoi", async () => {
    const w = wiring();
    const res = await resendCommissionInvoice(42);

    expect(res).toEqual({ number: "CD-2026-0007" });
    expect(rotateInvoiceToken).toHaveBeenCalledWith(7);

    expect(sendPartnerCommissionRequest).toHaveBeenCalledOnce();
    expect(sendPartnerCommissionRequest.mock.calls[0][0]).toBe("info@zorbas.gr");
    const mail = sendPartnerCommissionRequest.mock.calls[0][1] as Record<string, unknown>;
    expect(mail).toMatchObject({
      requestId: 42,
      partnerName: "Zorbas Rent a Car",
      commissionEur: 31.5,
      finalAmountEur: 210,
      dateFrom: "2026-08-01",
      dateTo: "2026-08-08",
      invoiceNumber: "CD-2026-0007",
    });
    // Le lien porte le jeton NEUF : l ancien n est pas relisible, il est hache.
    expect(mail.payUrl).toBe("https://crete.direct/en/invoice/tok_neuf_1");

    expect(markInvoiceSent).toHaveBeenCalledWith(7);
    expect(w.tables).toContain("car_requests");
    expect(w.tables).toContain("car_partners");
  });

  it("le NUMERO de facture ne change jamais, meme apres deux renvois", async () => {
    // Exigence comptable : une piece emise garde son numero. Seul le jeton du
    // lien de paiement se renouvelle.
    wiring();
    const first = await resendCommissionInvoice(42);
    const firstUrl = (sendPartnerCommissionRequest.mock.calls[0][1] as Record<string, unknown>)
      .payUrl;

    wiring();
    const second = await resendCommissionInvoice(42);
    const secondUrl = (sendPartnerCommissionRequest.mock.calls[1][1] as Record<string, unknown>)
      .payUrl;

    expect(first).toEqual({ number: "CD-2026-0007" });
    expect(second).toEqual({ number: "CD-2026-0007" });
    for (const call of sendPartnerCommissionRequest.mock.calls) {
      expect((call[1] as Record<string, unknown>).invoiceNumber).toBe("CD-2026-0007");
    }
    // Le jeton, lui, DOIT changer d un renvoi a l autre.
    expect(firstUrl).not.toBe(secondUrl);
  });

  it("refuse de renvoyer une facture payee ou avoiree", async () => {
    invoiceForRequest.mockResolvedValue({ ...INVOICE, paid_at: "2026-08-02T10:00:00.000Z" });
    wiring();
    expect(await resendCommissionInvoice(42)).toEqual({ error: "already_paid" });

    invoiceForRequest.mockResolvedValue({ ...INVOICE, credited_at: "2026-08-02T10:00:00.000Z" });
    wiring();
    expect(await resendCommissionInvoice(42)).toEqual({ error: "already_credited" });

    expect(rotateInvoiceToken).not.toHaveBeenCalled();
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
    expect(markInvoiceSent).not.toHaveBeenCalled();
  });

  it("rend une erreur quand aucune facture n existe, sans generer de jeton", async () => {
    invoiceForRequest.mockResolvedValue(null);
    wiring();
    expect(await resendCommissionInvoice(42)).toEqual({ error: "no_invoice" });
    expect(rotateInvoiceToken).not.toHaveBeenCalled();
  });

  it("loueur sans email : rien n est envoye et aucun envoi n est note", async () => {
    wiring({ partner: { id: 111, name: "Zorbas", email: null } });
    expect(await resendCommissionInvoice(42)).toEqual({ error: "partner_without_email" });
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
    expect(markInvoiceSent).not.toHaveBeenCalled();
  });

  it("rotation du jeton refusee : AUCUN email ne part avec un lien mort", async () => {
    // rotateInvoiceToken leve quand PostgREST refuse l ecriture. Le jeton rendu
    // ne correspondrait a rien en base : l email partirait avec un lien qui ne
    // mene nulle part, et le loueur ne pourrait ni voir ni payer sa facture.
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    rotateInvoiceToken.mockRejectedValueOnce(
      new Error("rotateInvoiceToken(7) refuse par la base: permission denied") as never,
    );
    wiring();

    expect(await resendCommissionInvoice(42)).toEqual({ error: "token_rotation_failed" });
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
    expect(markInvoiceSent).not.toHaveBeenCalled();
    expect(JSON.stringify(err.mock.calls)).toContain("CD-2026-0007");
    err.mockRestore();
  });

  it("envoi note refuse : un motif propre, jamais « Resend a refuse »", async () => {
    // L email EST parti cette fois. Confondre ce cas avec mail_refused ferait
    // afficher « Resend a refuse l envoi » sur un envoi reussi, et la facture
    // resterait « jamais envoyee » sans que personne ne sache pourquoi.
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    markInvoiceSent.mockRejectedValueOnce(
      new Error("markInvoiceSent(7) refuse par la base: permission denied") as never,
    );
    wiring();

    expect(await resendCommissionInvoice(42)).toEqual({ error: "sent_not_recorded" });
    expect(sendPartnerCommissionRequest).toHaveBeenCalledOnce();
    err.mockRestore();
  });

  it("Resend refuse a nouveau : sent_at n est pas mis a jour et l erreur remonte", async () => {
    // Sinon la facture serait comptee comme envoyee alors qu elle n est jamais
    // arrivee, et le bouton de renvoi disparaitrait de l ecran.
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    sendPartnerCommissionRequest.mockResolvedValue(false);
    wiring();

    expect(await resendCommissionInvoice(42)).toEqual({ error: "mail_refused" });
    expect(rotateInvoiceToken).toHaveBeenCalledOnce();
    expect(markInvoiceSent).not.toHaveBeenCalled();
    err.mockRestore();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
