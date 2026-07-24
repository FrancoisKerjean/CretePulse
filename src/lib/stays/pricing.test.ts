import { describe, it, expect } from "vitest";
import { nightsBetween, computeQuote } from "./pricing";

describe("nightsBetween", () => {
  it("counts nights exclusive of checkout", () => {
    expect(nightsBetween("2026-07-01", "2026-07-08")).toBe(7);
  });
  it("throws on non-positive range", () => {
    expect(() => nightsBetween("2026-07-08", "2026-07-01")).toThrow();
  });
});

describe("computeQuote", () => {
  it("adds 5% commission on top of owner net (100 EUR/night x7)", () => {
    const q = computeQuote({
      basePriceEur: 700,
      cleaningFeeEur: 0,
      commissionRate: 5,
      dateFrom: "2026-07-01",
      dateTo: "2026-07-08",
    });
    expect(q.nights).toBe(7);
    expect(q.ownerNetEur).toBe(700);
    expect(q.commissionEur).toBe(35);
    expect(q.guestTotalEur).toBe(735);
    expect(q.depositEur).toBe(220.5);
    expect(q.balanceEur).toBe(514.5);
    expect(q.applicationFeeCents).toBe(1050);
  });

  it("includes cleaning fee in owner net and commission base", () => {
    const q = computeQuote({
      basePriceEur: 300,
      cleaningFeeEur: 50,
      commissionRate: 5,
      dateFrom: "2026-08-01",
      dateTo: "2026-08-04",
    });
    expect(q.ownerNetEur).toBe(350);
    expect(q.commissionEur).toBe(17.5);
    expect(q.guestTotalEur).toBe(367.5);
  });
});
