import { describe, it, expect } from "vitest";
import { computeAggregate } from "../aggregate";

describe("computeAggregate", () => {
  it("returns zeros on empty input", () => {
    expect(computeAggregate([])).toEqual({ avg: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  });
  it("computes average to 2 decimals", () => {
    expect(computeAggregate([5, 4, 3]).avg).toBe(4);
    expect(computeAggregate([5, 4]).avg).toBe(4.5);
  });
  it("counts distribution", () => {
    expect(computeAggregate([5, 5, 4, 3, 1]).distribution).toEqual({ 1: 1, 2: 0, 3: 1, 4: 1, 5: 2 });
  });
});
