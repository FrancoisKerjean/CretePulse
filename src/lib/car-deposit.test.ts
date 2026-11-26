import { describe, expect, it } from "vitest";
import {
  athensWallToUtcMs,
  buildDepositCheckoutParams,
  clientCancelRefundEur,
  confirmDeadlineMs,
  isBookableOnline,
  reminderDueMs,
  shouldSuspendPartner,
} from "./car-deposit";

const at = (d: string, t: string) => athensWallToUtcMs(d, t);

const INPUT = {
  requestId: 25,
  customerEmail: "client@example.com",
  depositEur: 41.2,
  partnerName: "Heronia",
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
  it("reminder is the midpoint", () => {
    expect(reminderDueMs(1000, 3000)).toBe(2000);
  });
  it("client cancellation: unconfirmed is always refunded, confirmed follows 48 h", () => {
    expect(clientCancelRefundEur("awaiting_partner", 41.2, 3)).toBe(41.2);
    expect(clientCancelRefundEur("confirmed", 41.2, 48)).toBe(41.2);
    expect(clientCancelRefundEur("confirmed", 41.2, 47.9)).toBe(0);
    expect(clientCancelRefundEur("refunded", 41.2, 100)).toBe(0);
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
    expect(p.expires_at).toBe(Math.floor(INPUT.nowMs / 1000) + 1800);
    expect(p.customer_email).toBe("client@example.com");
    expect(p.success_url).toMatch(/\/fr\/car-booking\/tok123\?paid=1$/);
    expect(p.cancel_url).toMatch(/\/fr\/car-booking\/tok123$/);
  });
  it("refuses a deposit below the Stripe minimum or not finite", () => {
    expect(() => buildDepositCheckoutParams({ ...INPUT, depositEur: 0.3 })).toThrow();
    expect(() => buildDepositCheckoutParams({ ...INPUT, depositEur: NaN })).toThrow();
  });
});
