import { describe, it, expect } from "vitest";
import { depositKpis, kpis, type MonitorInvite, type DepositKpiRow } from "./car-monitoring";

const row = (o: Partial<DepositKpiRow>): DepositKpiRow => ({
  booking_status: null, deposit_eur: null, booking_paid_at: null, partner_confirmed_at: null,
  refund_reason: null, hasCatalogueOption: false, ...o,
});

// Jeu de 5 demandes :
// 1 confirmée (catalogue, payée, 30 min), 2 cancelled_kept (catalogue, payée, 90 min),
// 3 remboursée partner_declined (catalogue, payée), 4 sans acompte (catalogue),
// 5 devis classique seul.
const FIVE: DepositKpiRow[] = [
  row({ booking_status: "confirmed", deposit_eur: 33.333, booking_paid_at: "2026-12-01T10:00:00Z",
        partner_confirmed_at: "2026-12-01T10:30:00Z", hasCatalogueOption: true }),
  row({ booking_status: "cancelled_kept", deposit_eur: 20.005, booking_paid_at: "2026-12-02T10:00:00Z",
        partner_confirmed_at: "2026-12-02T11:30:00Z", refund_reason: "client_cancelled", hasCatalogueOption: true }),
  row({ booking_status: "refunded", deposit_eur: 50, booking_paid_at: "2026-12-03T10:00:00Z",
        refund_reason: "partner_declined", hasCatalogueOption: true }),
  row({ booking_status: "pending_payment", deposit_eur: 40, hasCatalogueOption: true }),
  row({}),
];

describe("depositKpis", () => {
  const k = depositKpis(FIVE);
  it("couverture catalogue = demandes avec une option catalogue / demandes", () => {
    expect(k.catalogueCoverage).toBeCloseTo(4 / 5);
  });
  it("offre -> acompte = acomptes payés / demandes avec option catalogue", () => {
    expect(k.offerToDeposit).toBeCloseTo(3 / 4);
  });
  it("taux de confirmation = (confirmed + cancelled_kept) / acomptes payés", () => {
    expect(k.confirmRate).toBeCloseTo(2 / 3);
  });
  it("délai médian de confirmation en minutes (paiement -> confirmation)", () => {
    expect(k.medianConfirmMinutes).toBe(60);
  });
  it("médiane nulle sans aucune confirmation", () => {
    expect(depositKpis([row({})]).medianConfirmMinutes).toBeNull();
  });
  it("remboursements par motif : les 5 clés, 0 par défaut", () => {
    expect(k.refundsByReason).toEqual({
      partner_declined: 1, partner_timeout: 0, client_cancelled: 1, partner_cancelled: 0, ops: 0,
    });
  });
  it("commission = somme des deposit_eur confirmed + cancelled_kept, au centime", () => {
    expect(k.commissionEur).toBe(53.34);
  });
  it("aucune demande : ratios null (n/d), jamais NaN", () => {
    const z = depositKpis([]);
    expect(z.catalogueCoverage).toBeNull();
    expect(z.offerToDeposit).toBeNull();
    expect(z.confirmRate).toBeNull();
    expect(z.commissionEur).toBe(0);
  });
});

describe("kpis : R25, les offres de grille n'entrent pas dans le délai du 1er devis", () => {
  const inv = (o: Partial<MonitorInvite>): MonitorInvite => ({
    id: 1, request_id: 1, partner_id: 1, partner_name: "A", status: "quoted", quote_price: 100,
    quote_currency: "EUR", quote_car_model: null, created_at: "2026-12-01T10:00:00Z",
    quoted_at: "2026-12-01T10:00:00Z", declined_at: null, relanced_at: null, ...o,
  });
  const req = { id: 1, status: "quoted", created_at: "2026-12-01T10:00:00Z", accepted_at: null,
    client_relanced_at: null, client_relance_count: 0 };
  it("une invite de grille (instantanée) ne fausse pas le délai médian", () => {
    const m = new Map([[1, [
      inv({ id: 1, source: "catalogue" }),
      inv({ id: 2, partner_id: 2, quoted_at: "2026-12-01T14:00:00Z" }),
    ]]]);
    expect(kpis([req], m, 0).medianFirstQuoteHours).toBe(4);
  });
  it("demande avec grille seule : pas de délai", () => {
    const m = new Map([[1, [inv({ source: "catalogue" })]]]);
    expect(kpis([req], m, 0).medianFirstQuoteHours).toBeNull();
  });
});
