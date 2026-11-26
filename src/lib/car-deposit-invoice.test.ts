// Facture réglée par compensation (J1) et rappel d'échéance de grille.
// Aucune base, aucun Stripe, aucun Resend : tout est simulé.
import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;

const h = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  calls: [] as Array<{ table: string; op: string; payload?: unknown; filters: unknown[][] }>,
  invoiceForRequest: vi.fn(),
  createInvoiceForRequest: vi.fn(),
  markInvoicePaid: vi.fn(),
  rotateInvoiceToken: vi.fn(),
  ensurePortalToken: vi.fn(),
  notifyOps: vi.fn(),
  sendCarDepositMail: vi.fn(),
  claimResult: { data: [{ id: 1 }] as unknown, error: null as unknown },
  sendClaim: { data: [{ id: 1 }] as unknown, error: null as unknown },
  reread: null as null | string,
  updateError: null as null | { message: string },
}));

// Chaîne PostgREST minimale : lecture = la table programmée, écriture = journal.
function chain(table: string) {
  const call = { table, op: "select", payload: undefined as unknown, filters: [] as unknown[][] };
  h.calls.push(call);
  const q: Record<string, unknown> = {};
  const rec = (name: string) => (...a: unknown[]) => { call.filters.push([name, ...a]); return q; };
  for (const m of ["eq", "in", "lte", "gte", "is", "not", "order", "limit", "or", "lt"]) q[m] = rec(m);
  q.select = (...a: unknown[]) => { call.filters.push(["select", ...a]); return q; };
  q.update = (p: unknown) => { call.op = "update"; call.payload = p; return q; };
  q.then = (res: (v: unknown) => unknown) => {
    if (call.op === "update") {
      const isClaim = table === "car_partners" && call.filters.some((f) => f[0] === "is" && f[1] === "rates_expiry_reminded_at");
      const isSendClaim = table === "car_commission_invoices"
        && (call.payload as Row).sent_at != null
        && call.filters.some((f) => f[0] === "is" && f[1] === "sent_at");
      if (isSendClaim) return Promise.resolve(h.sendClaim).then(res);
      return Promise.resolve(
        isClaim && (call.payload as Row).rates_expiry_reminded_at !== null
          ? h.claimResult
          : { data: [{ id: 1 }], error: h.updateError },
      ).then(res);
    }
    return Promise.resolve({ data: h.tables[table] ?? [], error: null }).then(res);
  };
  q.maybeSingle = async () => {
    if (table === "car_requests" && h.reread !== null && call.filters.some((f) => f[0] === "select" && f[1] === "booking_status")) {
      return { data: { booking_status: h.reread }, error: null };
    }
    return { data: ((h.tables[table] as Row[]) ?? [])[0] ?? null, error: null };
  };
  return q;
}

vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }));
vi.mock("./car-invoice-server", () => ({
  invoiceForRequest: h.invoiceForRequest,
  createInvoiceForRequest: h.createInvoiceForRequest,
  markInvoicePaid: h.markInvoicePaid,
  rotateInvoiceToken: h.rotateInvoiceToken,
  assertWritten: (op: string, id: number, error: { message: string } | null) => {
    if (error) throw new Error(`${op}(${id}) refuse: ${error.message}`);
  },
}));
vi.mock("./car-catalogue-db", () => ({ ensurePortalToken: h.ensurePortalToken }));
vi.mock("./ops-notify", () => ({ notifyOps: h.notifyOps, echeance: () => "27/11" }));
vi.mock("./email", () => ({ sendCarDepositMail: h.sendCarDepositMail }));
vi.mock("./car-quote", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  siteBase: () => "https://crete.direct",
}));

import { runDepositInvoicePass, runRatesExpiryReminderPass } from "./car-deposit-invoice";

const EM_DASH = String.fromCharCode(8212);

const PARTNER = {
  id: 9, name: "Zorbas", email: "info@zorbas.gr",
  legal_name: "Zorbas IKE", legal_form: "IKE", address_line: "1 Street", postal_code: "71601",
  city: "Heraklion", country: "Greece", vat_id: "EL801122501", vat_verified_at: "2026-07-30",
};

const reqRow = (id: number, extra: Row = {}): Row => ({
  id, booking_status: "confirmed", date_from: "2026-11-26", date_to: "2026-12-03",
  pickup_slug: "heraklion-airport", quoted_car_model: "Fiat Panda", car_type: "economy",
  quoted_price: 412, deposit_eur: 41.2, deposit_rate: 0.1, quoted_by_partner_id: 9,
  booking_paid_at: "2026-11-10T08:00:00.000Z", ...extra,
});

const INVOICE = (id: number, extra: Row = {}) => ({
  id: 100 + id, number: `F-2026-00${id}`, request_id: id, partner_id: 9,
  base_amount_eur: 412, rate: 0.1, amount_eur: 41.2, issued_at: "2026-11-26T06:00:00Z",
  sent_at: null, paid_at: null, credited_at: null, credit_number: null, credit_reason: null, ...extra,
});

function created(id: number, over: Partial<{ token: string | null; reused: boolean; invoice: Row }> = {}) {
  return { invoice: INVOICE(id, over.invoice), token: "tok-" + id, reused: false, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.calls.length = 0;
  h.tables = { car_requests: [reqRow(1)], car_partners: [PARTNER], car_partner_rates: [] };
  h.updateError = null;
  h.claimResult = { data: [{ id: 1 }], error: null };
  h.invoiceForRequest.mockResolvedValue(null);
  h.createInvoiceForRequest.mockImplementation(async (i: { requestId: number }) => created(i.requestId));
  h.markInvoicePaid.mockResolvedValue(undefined);
  h.sendClaim = { data: [{ id: 1 }], error: null };
  h.reread = "confirmed";
  h.rotateInvoiceToken.mockResolvedValue("rotated-tok");
  h.ensurePortalToken.mockResolvedValue("portal-tok");
  h.notifyOps.mockResolvedValue(true);
  h.sendCarDepositMail.mockResolvedValue(true);
});

describe("runDepositInvoicePass", () => {
  it("facture une réservation confirmed dont la prise est aujourd'hui, la règle par compensation et l'envoie", async () => {
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 1, failed: [] });
    expect(h.createInvoiceForRequest).toHaveBeenCalledWith({
      requestId: 1, partnerId: 9, base: 412, rate: 0.1, amount: 41.2,
    });
    const settle = h.calls.find((c) => c.table === "car_commission_invoices" && c.op === "update");
    expect(settle?.payload).toEqual({ settlement: "deposit_compensation" });
    expect(h.markInvoicePaid).toHaveBeenCalledWith(1);
    expect(h.sendCarDepositMail).toHaveBeenCalledTimes(1);
    const [to, mail] = h.sendCarDepositMail.mock.calls[0];
    expect(to).toBe("info@zorbas.gr");
    expect(mail.html).toContain("https://crete.direct/en/invoice/tok-1");
    expect(mail.html).toContain("F-2026-001");
    expect(mail.html).toContain("2026-11-10");
    expect(mail.html + mail.subject).not.toContain(EM_DASH);
    const claim = h.calls.find((c) => (c.payload as Row | undefined)?.sent_at != null)!;
    expect(claim.filters).toContainEqual(["eq", "id", 101]);
    expect(claim.filters).toContainEqual(["is", "sent_at", null]);
    expect(h.notifyOps).not.toHaveBeenCalled();
  });

  it("l'ordre est : facture, paiement, verrou d'envoi, jeton, e-mail", async () => {
    const order: string[] = [];
    h.createInvoiceForRequest.mockImplementation(async () => { order.push("create"); return created(1, { token: null, reused: true }); });
    h.markInvoicePaid.mockImplementation(async () => { order.push("paid"); });
    h.rotateInvoiceToken.mockImplementation(async () => {
      order.push(`rotate@claims=${h.calls.filter((c) => (c.payload as Row | undefined)?.sent_at != null).length}`);
      return "r";
    });
    h.sendCarDepositMail.mockImplementation(async () => { order.push("mail"); return true; });
    await runDepositInvoicePass("2026-11-26");
    expect(order).toEqual(["create", "paid", "rotate@claims=1", "mail"]);
  });

  it("sélectionne confirmed et cancelled_kept, prise <= aujourd'hui, au plus 100 lignes", async () => {
    await runDepositInvoicePass("2026-11-26");
    const sel = h.calls.find((c) => c.table === "car_requests")!;
    expect(sel.filters).toContainEqual(["in", "booking_status", ["confirmed", "cancelled_kept"]]);
    expect(sel.filters).toContainEqual(["lte", "date_from", "2026-11-26"]);
    expect(sel.filters).toContainEqual(["limit", 100]);
  });

  it("cancelled_kept est facturée comme une location", async () => {
    h.tables.car_requests = [reqRow(2, { booking_status: "cancelled_kept" })];
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r.invoiced).toBe(1);
    expect(h.createInvoiceForRequest).toHaveBeenCalledWith(expect.objectContaining({ requestId: 2 }));
  });

  it("une demande déjà facturée ET envoyée n'est pas refacturée ni réenvoyée", async () => {
    h.invoiceForRequest.mockResolvedValue(INVOICE(1, { sent_at: "2026-11-26T06:00:05Z", paid_at: "2026-11-26T06:00:04Z" }));
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 0, failed: [] });
    expect(h.createInvoiceForRequest).not.toHaveBeenCalled();
    expect(h.sendCarDepositMail).not.toHaveBeenCalled();
  });

  it("une facture à moitié faite (sent_at nul) est terminée sans second numéro, avec un seul e-mail", async () => {
    h.invoiceForRequest.mockResolvedValue(INVOICE(1));
    h.createInvoiceForRequest.mockResolvedValue({ invoice: INVOICE(1), token: null, reused: true });
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 1, failed: [] });
    expect(h.rotateInvoiceToken).toHaveBeenCalledWith(101);
    expect(h.sendCarDepositMail).toHaveBeenCalledTimes(1);
    expect(h.sendCarDepositMail.mock.calls[0][1].html).toContain("/en/invoice/rotated-tok");
  });

  it("une facture avoirée est ignorée", async () => {
    h.invoiceForRequest.mockResolvedValue(INVOICE(1, { credited_at: "2026-11-20T00:00:00Z" }));
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 0, failed: [] });
    expect(h.createInvoiceForRequest).not.toHaveBeenCalled();
    expect(h.sendCarDepositMail).not.toHaveBeenCalled();
  });

  it("échec d'envoi : sent_at reste nul, l'id est dans failed, ops alertée une fois", async () => {
    h.sendCarDepositMail.mockResolvedValue(false);
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 0, failed: [1] });
    const release = h.calls.filter((c) => c.table === "car_commission_invoices" && c.op === "update").pop()!;
    expect(release.payload).toEqual({ sent_at: null });
    expect(h.notifyOps).toHaveBeenCalledTimes(1);
  });

  it("facture réutilisée déjà envoyée (lecture initiale ratée) : ni rotation ni e-mail", async () => {
    h.createInvoiceForRequest.mockResolvedValue({ invoice: INVOICE(1, { sent_at: "2026-11-26T06:00:05Z" }), token: null, reused: true });
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 0, failed: [] });
    expect(h.rotateInvoiceToken).not.toHaveBeenCalled();
    expect(h.sendCarDepositMail).not.toHaveBeenCalled();
  });

  it("verrou d'envoi perdu (0 ligne) : ni rotation ni e-mail", async () => {
    h.sendClaim = { data: [], error: null };
    h.createInvoiceForRequest.mockResolvedValue({ invoice: INVOICE(1), token: null, reused: true });
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 0, failed: [] });
    expect(h.rotateInvoiceToken).not.toHaveBeenCalled();
    expect(h.sendCarDepositMail).not.toHaveBeenCalled();
  });

  it("rotation du jeton qui lève : le verrou est rendu", async () => {
    h.createInvoiceForRequest.mockResolvedValue({ invoice: INVOICE(1), token: null, reused: true });
    h.rotateInvoiceToken.mockRejectedValue(new Error("refus"));
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r.failed).toEqual([1]);
    const release = h.calls.filter((c) => c.table === "car_commission_invoices" && c.op === "update").pop()!;
    expect(release.payload).toEqual({ sent_at: null });
  });

  it("réservation remboursée entre la sélection et la facture : ni paiement ni e-mail, alerte avoir", async () => {
    h.reread = "refunded";
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 0, failed: [1] });
    expect(h.markInvoicePaid).not.toHaveBeenCalled();
    expect(h.sendCarDepositMail).not.toHaveBeenCalled();
    expect(JSON.stringify(h.notifyOps.mock.calls[0][0])).toContain("avoir à émettre");
  });

  it("échec le dernier jour de la fenêtre : alerte « à facturer à la main » nommant la demande", async () => {
    h.tables.car_requests = [reqRow(5, { date_from: "2026-10-12" })];
    h.createInvoiceForRequest.mockRejectedValue(new Error("boom"));
    await runDepositInvoicePass("2026-11-26");
    const txt = JSON.stringify(h.notifyOps.mock.calls[0][0]);
    expect(txt).toContain("dernière tentative automatique, à facturer à la main");
    expect(txt).toContain("demande 5");
  });

  it("un échec avant le dernier jour de la fenêtre n'ajoute pas cette ligne", async () => {
    h.createInvoiceForRequest.mockRejectedValue(new Error("boom"));
    await runDepositInvoicePass("2026-11-26");
    expect(JSON.stringify(h.notifyOps.mock.calls[0][0])).not.toContain("à facturer à la main");
  });

  it("une passe qui rend exactement 100 lignes alerte les ops (plafond)", async () => {
    h.tables.car_requests = Array.from({ length: 100 }, (_, i) => reqRow(i + 1));
    h.invoiceForRequest.mockImplementation(async (id: number) => INVOICE(id, { sent_at: "2026-11-26T06:00:05Z" }));
    await runDepositInvoicePass("2026-11-26");
    expect(h.notifyOps).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(h.notifyOps.mock.calls[0][0])).toContain("plafond");
  });

  it("l'e-mail dit la vérité selon le statut, avec la location et la date d'acompte à Athènes", async () => {
    // 22:30 UTC le 10/11 = 00:30 le 11/11 à Athènes.
    h.tables.car_requests = [reqRow(1, { booking_paid_at: "2026-11-10T22:30:00.000Z" })];
    await runDepositInvoicePass("2026-11-26");
    const confirmed = h.sendCarDepositMail.mock.calls[0][1].html as string;
    expect(confirmed).not.toContain("starts today");
    expect(confirmed).toContain("collect the rest");
    expect(confirmed).toContain("Pick-up");
    expect(confirmed).toContain("2026-11-26");
    expect(confirmed).toContain("Fiat Panda");
    expect(confirmed).toContain("2026-11-11");
    expect(confirmed).not.toContain(EM_DASH);

    h.sendCarDepositMail.mockClear();
    h.tables.car_requests = [reqRow(2, { booking_status: "cancelled_kept" })];
    await runDepositInvoicePass("2026-11-26");
    const kept = h.sendCarDepositMail.mock.calls[0][1].html as string;
    expect(kept).toContain("cancelled less than 48 hours before pickup");
    expect(kept).toContain("settles this invoice");
    expect(kept).not.toContain("collect the rest");
    expect(kept).not.toContain("counter");
    expect(kept).not.toContain(EM_DASH);
  });

  it("une ligne qui lève n'arrête pas la suivante", async () => {
    h.tables.car_requests = [reqRow(1), reqRow(2)];
    h.createInvoiceForRequest.mockImplementation(async (i: { requestId: number }) => {
      if (i.requestId === 1) throw new Error("numerotation impossible");
      return created(i.requestId);
    });
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 1, failed: [1] });
    expect(h.sendCarDepositMail).toHaveBeenCalledTimes(1);
    expect(h.notifyOps).toHaveBeenCalledTimes(1);
  });

  it("écriture du règlement refusée : rien n'est payé ni envoyé, id dans failed", async () => {
    h.updateError = { message: "permission denied" };
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 0, failed: [1] });
    expect(h.markInvoicePaid).not.toHaveBeenCalled();
    expect(h.sendCarDepositMail).not.toHaveBeenCalled();
  });

  it("identité légale du loueur incomplète : aucun numéro consommé, id dans failed", async () => {
    h.tables.car_partners = [{ ...PARTNER, vat_id: null }];
    const r = await runDepositInvoicePass("2026-11-26");
    expect(r).toEqual({ invoiced: 0, failed: [1] });
    expect(h.createInvoiceForRequest).not.toHaveBeenCalled();
    expect(h.notifyOps).toHaveBeenCalledTimes(1);
  });
});

describe("runRatesExpiryReminderPass", () => {
  // Le mock ne trie pas : la requête réelle rend la plus tardive d'abord (order desc, limit 1).
  const grid = (to: string) => [{ partner_id: 9, period_to: to }];
  const livePartner = { ...PARTNER, rates_status: "live", rates_expiry_reminded_at: null };

  it("une grille qui finit dans 30 jours reçoit un rappel avec le lien du portail", async () => {
    h.tables.car_partners = [livePartner];
    h.tables.car_partner_rates = grid("2026-12-26");
    const r = await runRatesExpiryReminderPass("2026-11-26");
    expect(r).toEqual({ reminded: 1 });
    const [to, mail] = h.sendCarDepositMail.mock.calls[0];
    expect(to).toBe("info@zorbas.gr");
    expect(mail.html).toContain("https://crete.direct/en/car-rates/portal-tok");
    expect(mail.html).toContain("2026-12-26");
    const sel = h.calls.find((c) => c.table === "car_partners")!;
    expect(sel.filters).toContainEqual(["eq", "rates_status", "live"]);
    expect(sel.filters).toContainEqual(["is", "rates_expiry_reminded_at", null]);
    const rq = h.calls.find((c) => c.table === "car_partner_rates")!;
    expect(rq.filters).toContainEqual(["order", "period_to", { ascending: false }]);
    expect(rq.filters).toContainEqual(["limit", 1]);
  });

  it("le lien du portail est calculé AVANT la revendication; s'il échoue, rien n'est revendiqué", async () => {
    h.tables.car_partners = [livePartner];
    h.tables.car_partner_rates = grid("2026-12-10");
    h.ensurePortalToken.mockRejectedValue(new Error("refus"));
    const r = await runRatesExpiryReminderPass("2026-11-26");
    expect(r).toEqual({ reminded: 0 });
    expect(h.calls.some((c) => c.table === "car_partners" && c.op === "update")).toBe(false);
  });

  it("envoi qui lève : la revendication est rendue", async () => {
    h.tables.car_partners = [livePartner];
    h.tables.car_partner_rates = grid("2026-12-10");
    h.sendCarDepositMail.mockRejectedValue(new Error("resend down"));
    const r = await runRatesExpiryReminderPass("2026-11-26");
    expect(r).toEqual({ reminded: 0 });
    const undo = h.calls.filter((c) => c.table === "car_partners" && c.op === "update").pop()!;
    expect(undo.payload).toEqual({ rates_expiry_reminded_at: null });
  });

  it("le rappel est revendiqué par une écriture conditionnelle AVANT l'envoi", async () => {
    h.tables.car_partners = [livePartner];
    h.tables.car_partner_rates = grid("2026-12-26");
    let callsAtMail = -1;
    h.sendCarDepositMail.mockImplementation(async () => { callsAtMail = h.calls.length; return true; });
    await runRatesExpiryReminderPass("2026-11-26");
    const claim = h.calls.find((c) => c.table === "car_partners" && c.op === "update")!;
    expect(claim.payload).toEqual({ rates_expiry_reminded_at: expect.any(String) });
    expect(claim.filters).toContainEqual(["is", "rates_expiry_reminded_at", null]);
    expect(h.calls.indexOf(claim)).toBeLessThan(callsAtMail);
  });

  it("une grille qui finit dans 31 jours n'en reçoit pas", async () => {
    h.tables.car_partners = [livePartner];
    h.tables.car_partner_rates = grid("2026-12-27");
    const r = await runRatesExpiryReminderPass("2026-11-26");
    expect(r).toEqual({ reminded: 0 });
    expect(h.sendCarDepositMail).not.toHaveBeenCalled();
  });

  it("une grille déjà expirée reçoit quand même le rappel, une fois", async () => {
    h.tables.car_partners = [livePartner];
    h.tables.car_partner_rates = grid("2026-11-01");
    expect((await runRatesExpiryReminderPass("2026-11-26")).reminded).toBe(1);
  });

  it("une grille en pause n'en reçoit pas (filtre rates_status = live)", async () => {
    h.tables.car_partners = [];
    const r = await runRatesExpiryReminderPass("2026-11-26");
    expect(r).toEqual({ reminded: 0 });
    expect(h.sendCarDepositMail).not.toHaveBeenCalled();
  });

  it("revendication perdue : aucun e-mail", async () => {
    h.tables.car_partners = [livePartner];
    h.tables.car_partner_rates = grid("2026-12-10");
    h.claimResult = { data: [], error: null };
    const r = await runRatesExpiryReminderPass("2026-11-26");
    expect(r).toEqual({ reminded: 0 });
    expect(h.sendCarDepositMail).not.toHaveBeenCalled();
  });

  it("envoi refusé : la revendication est rendue pour réessayer demain", async () => {
    h.tables.car_partners = [livePartner];
    h.tables.car_partner_rates = grid("2026-12-10");
    h.sendCarDepositMail.mockResolvedValue(false);
    const r = await runRatesExpiryReminderPass("2026-11-26");
    expect(r).toEqual({ reminded: 0 });
    const undo = h.calls.filter((c) => c.table === "car_partners" && c.op === "update").pop()!;
    expect(undo.payload).toEqual({ rates_expiry_reminded_at: null });
  });
});
