import { describe, expect, it } from "vitest";
import {
  athensWallToUtcMs,
  DEPOSIT_CHECKOUT_LIFETIME_S,
  buildDepositCheckoutParams,
  clientCancelRefundEur,
  clientCancelNowEur,
  confirmDeadlineMs,
  isBookableOnline,
  isDepositBookable,
  partnerViewState,
  reminderDueMs,
  shouldSuspendPartner,
} from "./car-deposit";

const at = (d: string, t: string) => athensWallToUtcMs(d, t);

const INPUT = {
  requestId: 25,
  customerEmail: "client@example.com",
  depositEur: 41.2,
  carLabel: "Fiat Panda",
  dateFrom: "2027-07-12",
  dateTo: "2027-07-19",
  bookingToken: "tok123",
  locale: "fr",
  nowMs: Date.UTC(2027, 6, 10, 9, 0, 0),
};

describe("car-deposit", () => {
  it("athensWallToUtcMs follows summer and winter time", () => {
    expect(at("2027-07-10", "10:00")).toBe(Date.UTC(2027, 6, 10, 7, 0));
    expect(at("2027-01-10", "10:00")).toBe(Date.UTC(2027, 0, 10, 8, 0));
  });
  it("deadline inside opening hours is +4 h", () => {
    expect(confirmDeadlineMs(at("2027-07-10", "10:00"))).toBe(at("2027-07-10", "14:00"));
  });
  it("keeps the seconds offset", () => {
    expect(confirmDeadlineMs(at("2027-07-10", "10:00") + 30_000)).toBe(
      at("2027-07-10", "14:00") + 30_000,
    );
  });
  it("deadline spills over the night", () => {
    expect(confirmDeadlineMs(at("2027-07-10", "21:30"))).toBe(at("2027-07-11", "11:30"));
  });
  it("payment at night starts counting at 08:00", () => {
    expect(confirmDeadlineMs(at("2027-07-10", "23:15"))).toBe(at("2027-07-11", "12:00"));
  });
  it("payment early morning starts counting at 08:00", () => {
    expect(confirmDeadlineMs(at("2027-07-10", "07:00"))).toBe(at("2027-07-10", "12:00"));
  });
  it("deadline across the switch to summer time", () => {
    expect(confirmDeadlineMs(at("2027-03-27", "21:30"))).toBe(at("2027-03-28", "11:30"));
  });
  it("not bookable when the deadline lands less than 2 h before pickup", () => {
    const now = at("2027-07-10", "21:30");
    expect(isBookableOnline(now, at("2027-07-11", "13:30"))).toBe(true);
    expect(isBookableOnline(now, at("2027-07-11", "13:29"))).toBe(false);
  });
  it("keeps milliseconds across closing time", () => {
    const paid = at("2027-07-10", "21:59") + 59_500;
    expect(confirmDeadlineMs(paid)).toBe(at("2027-07-11", "11:59") + 59_500);
  });
  it("reminder is at half the open delay", () => {
    const p1 = at("2027-07-10", "10:00");
    expect(reminderDueMs(p1, confirmDeadlineMs(p1))).toBe(at("2027-07-10", "12:00"));
    const p2 = at("2027-07-10", "21:30");
    expect(reminderDueMs(p2, confirmDeadlineMs(p2))).toBe(at("2027-07-11", "09:30"));
  });
  it("reminder is capped at the deadline", () => {
    const p = at("2027-07-10", "10:00");
    const early = at("2027-07-10", "11:00");
    expect(reminderDueMs(p, early)).toBe(early);
  });
  it("client cancellation: unconfirmed is always refunded, confirmed follows 48 h", () => {
    expect(clientCancelRefundEur("awaiting_partner", 41.2, 3)).toBe(41.2);
    expect(clientCancelRefundEur("confirmed", 41.2, 48)).toBe(41.2);
    expect(clientCancelRefundEur("confirmed", 41.2, 47.9)).toBe(0);
    expect(clientCancelRefundEur("refunded", 41.2, 100)).toBe(0);
  });
  it("client cancellation now: hours from the Athens pick-up time, closed once pick-up has passed", () => {
    const H = 3_600_000;
    const pickup = at("2027-07-20", "10:00");
    expect(clientCancelNowEur("confirmed", 41.2, "2027-07-20", "10:00", pickup - 48 * H)).toBe(41.2);
    // Postgres rend l'heure avec ses secondes.
    expect(clientCancelNowEur("confirmed", 41.2, "2027-07-20", "10:00:00", pickup - 47 * H)).toBe(0);
    expect(clientCancelNowEur("awaiting_partner", 41.2, "2027-07-20", "10:00", pickup - H)).toBe(41.2);
    expect(clientCancelNowEur("awaiting_partner", 41.2, "2027-07-20", "10:00", pickup)).toBeNull();
    expect(clientCancelNowEur("confirmed", 41.2, "2027-07-20", "10:00", pickup + 1)).toBeNull();
    // Sans heure de prise : 00:00.
    expect(clientCancelNowEur("confirmed", 41.2, "2027-07-20", null, at("2027-07-18", "00:00"))).toBe(41.2);
    expect(clientCancelNowEur("confirmed", 41.2, "2027-07-20", null, at("2027-07-18", "00:01"))).toBe(0);
    for (const s of ["pending_payment", "refunded", "cancelled_kept", null]) {
      expect(clientCancelNowEur(s, 41.2, "2027-07-20", "10:00", pickup - 100 * H)).toBeNull();
    }
  });
  it("names the Stripe product in the client's language, with readable dates", () => {
    const name = (locale: string) => buildDepositCheckoutParams({ ...INPUT, locale }).line_items?.[0]?.price_data?.product_data?.name;
    expect(name("fr")).toBe("Acompte : Fiat Panda, du lundi 12 juillet 2027 au lundi 19 juillet 2027");
    expect(name("en")).toBe("Deposit: Fiat Panda, Monday, July 12, 2027 to Monday, July 19, 2027");
    expect(name("de")).toMatch(/^Anzahlung: Fiat Panda, Montag, 12\. Juli 2027 bis Montag, 19\. Juli 2027$/);
    expect(name("el")).toMatch(/^Προκαταβολή: Fiat Panda/);
    // Locale non servie : anglais.
    expect(name("it")).toBe(name("en"));
    for (const l of ["en", "fr", "de", "el"]) expect(name(l)).not.toContain(String.fromCharCode(8212));

  });
  it("suspends a partner after 3 failures", () => {
    expect(shouldSuspendPartner(2)).toBe(false);
    expect(shouldSuspendPartner(3)).toBe(true);
  });
  it("deposit checkout carries the deposit in cents and the car_deposit tag", () => {
    const p = buildDepositCheckoutParams(INPUT);
    expect(p.mode).toBe("payment");
    expect(p.line_items?.[0]?.price_data?.unit_amount).toBe(4120);
    expect(p.line_items?.[0]?.price_data?.currency).toBe("eur");
    expect(p.metadata).toMatchObject({ payment_type: "car_deposit", brand: "crete.direct", car_request_id: "25" });
    expect(p.payment_intent_data?.metadata).toEqual(p.metadata);
    expect(p.payment_intent_data?.statement_descriptor_suffix).toBe("CRETE DIRECT");
    expect(DEPOSIT_CHECKOUT_LIFETIME_S).toBe(1860);
    expect(p.expires_at).toBe(Math.floor(INPUT.nowMs / 1000) + 1860);
    expect(p.customer_email).toBe("client@example.com");
    expect(p.success_url).toMatch(/\/fr\/car-booking\/tok123\?paid=1$/);
    expect(p.cancel_url).toMatch(/\/fr\/car-booking\/tok123$/);
  });
  it("refuses a deposit below the Stripe minimum or not finite", () => {
    expect(() => buildDepositCheckoutParams({ ...INPUT, depositEur: 0.3 })).toThrow();
    expect(() => buildDepositCheckoutParams({ ...INPUT, depositEur: NaN })).toThrow();
  });

  it("isDepositBookable counts the Stripe session lifetime and reads a missing time as 00:00", () => {
    const now = at("2027-07-12", "09:00");
    // 09:00 + 31 min -> deadline 13:31, pick-up must be at 15:31 or later.
    expect(isDepositBookable(now, "2027-07-12", "15:31")).toBe(true);
    expect(isDepositBookable(now, "2027-07-12", "15:30")).toBe(false);
    expect(isBookableOnline(now, at("2027-07-12", "15:30"))).toBe(true);
    // Postgres time columns come back with seconds.
    expect(isDepositBookable(now, "2027-07-12", "15:31:00")).toBe(true);
    const evening = at("2027-07-11", "20:00");
    expect(isDepositBookable(evening, "2027-07-12", null)).toBe(false);
    expect(isDepositBookable(evening, "2027-07-12", "18:00")).toBe(true);
    expect(isDepositBookable(now, "", "18:00")).toBe(false);
  });
});

describe("partnerViewState", () => {
  it("dit au loueur l'état réel de la réservation", () => {
    expect(partnerViewState("awaiting_partner", null)).toBe("awaiting");
    expect(partnerViewState("confirmed", null)).toBe("confirmed");
    expect(partnerViewState("refunded", "partner_declined")).toBe("declined");
    expect(partnerViewState("refunded", "partner_timeout")).toBe("expired");
    expect(partnerViewState("refunded", "client_cancelled")).toBe("cancelled");
    expect(partnerViewState("refunded", "ops")).toBe("cancelled");
    expect(partnerViewState("refunded", "partner_cancelled")).toBe("cancelled");
    expect(partnerViewState("cancelled_kept", null)).toBe("cancelled");
    expect(partnerViewState("pending_payment", null)).toBe("closed");
    expect(partnerViewState(null, null)).toBe("closed");
  });
});
