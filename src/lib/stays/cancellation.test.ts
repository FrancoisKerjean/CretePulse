import { describe, it, expect } from "vitest";
import { daysUntil, computeRefund } from "./cancellation";

describe("computeRefund", () => {
  it(">14 days -> 100%", () => {
    expect(computeRefund(735, 20)).toBe(735);
  });
  it("2-14 days -> 50%", () => {
    expect(computeRefund(735, 10)).toBe(367.5);
  });
  it("<48h -> 0%", () => {
    expect(computeRefund(735, 1)).toBe(0);
  });
});

describe("daysUntil", () => {
  it("returns whole days from now to check-in", () => {
    const inTen = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    expect(daysUntil(inTen)).toBeGreaterThanOrEqual(9);
  });
});
