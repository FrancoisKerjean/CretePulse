import { describe, it, expect } from "vitest";
import { isInvoiceable, invoiceAmounts, type InvoiceCandidate } from "./car-invoice";

const START = "2026-08-05";
const TODAY = "2026-08-07";

const ok: InvoiceCandidate = {
  id: 39,
  accepted_at: "2026-07-26T12:00:00Z",
  outcome: null,
  date_from: "2026-08-07",
  booking_paid_at: null,
  quoted_by_partner_id: 16,
  quoted_price: 200,
};

describe("isInvoiceable", () => {
  it("facture une location qui demarre aujourd hui", () => {
    expect(isInvoiceable(ok, TODAY, START)).toBe(true);
  });

  it("rattrape une location dont le depart est passe", () => {
    // Le cron est son propre rattrapage : une journee de panne ne doit pas
    // perdre une facture definitivement.
    expect(isInvoiceable({ ...ok, date_from: "2026-08-06" }, TODAY, START)).toBe(true);
  });

  it("ne facture pas une location qui n a pas encore demarre", () => {
    expect(isInvoiceable({ ...ok, date_from: "2026-08-08" }, TODAY, START)).toBe(false);
  });

  it("ne rattrape jamais l historique anterieur a la mise en service", () => {
    // car_requests id=27 a ete facturee a la main le 30/07 (NOVAI-2026-003).
    expect(isInvoiceable({ ...ok, date_from: "2026-07-30" }, TODAY, START)).toBe(false);
  });

  it("ne ressuscite pas une location deja perdue", () => {
    // Sans cette garde, une location marquee « lost » garde son accepted_at et
    // sa date_from passee : le cron la repasserait en « rented » et facturerait
    // un loueur pour une location dont on sait qu elle n a pas eu lieu.
    expect(isInvoiceable({ ...ok, outcome: "lost" }, TODAY, START)).toBe(false);
    expect(isInvoiceable({ ...ok, outcome: "rented" }, TODAY, START)).toBe(false);
  });

  it("ne facture pas une location deja payee en ligne", () => {
    // Commission deja prelevee par le tunnel de paiement : facturer serait
    // encaisser deux fois.
    expect(isInvoiceable({ ...ok, booking_paid_at: "2026-08-01T09:00:00Z" }, TODAY, START)).toBe(false);
  });

  it("ne facture rien sans loueur gagnant ni sans prix accepte", () => {
    expect(isInvoiceable({ ...ok, quoted_by_partner_id: null }, TODAY, START)).toBe(false);
    expect(isInvoiceable({ ...ok, quoted_price: null }, TODAY, START)).toBe(false);
    expect(isInvoiceable({ ...ok, accepted_at: null }, TODAY, START)).toBe(false);
  });
});

describe("invoiceAmounts", () => {
  it("calcule la commission sur le prix du devis accepte", () => {
    expect(invoiceAmounts(200, 0.1)).toEqual({ base: 200, rate: 0.1, amount: 20 });
  });

  it("arrondit au centime", () => {
    expect(invoiceAmounts(333.33, 0.1)).toEqual({ base: 333.33, rate: 0.1, amount: 33.33 });
  });

  it("rend null sous le minimum encaissable par Stripe", () => {
    expect(invoiceAmounts(4, 0.1)).toBeNull();
  });
});
