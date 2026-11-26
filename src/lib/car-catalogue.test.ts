import { describe, expect, it } from "vitest";
import {
  catalogueQuote,
  depositEur,
  fromPricePerDay,
  validateRatesInput,
  type RateRow,
} from "./car-catalogue";

const R = (from: string, to: string, min: number, eur: number): RateRow => ({
  category: "compact",
  period_from: from,
  period_to: to,
  min_days: min,
  eur_per_day: eur,
});
const RATES: RateRow[] = [
  R("2027-06-01", "2027-06-30", 3, 45),
  R("2027-06-01", "2027-06-30", 7, 40),
  R("2027-07-01", "2027-08-31", 3, 55),
  R("2027-07-01", "2027-08-31", 7, 50),
];
const REQ_7D = {
  category: "compact",
  pickupSlug: "chania",
  dateFrom: "2027-06-28",
  dateTo: "2027-07-05",
  timeFrom: "10:00",
  timeTo: "10:00",
};
const ROW = (from: string, to: string, min: number, extra: Record<string, unknown> = {}) => ({
  category: "compact",
  period_from: from,
  period_to: to,
  min_days: min,
  eur_per_day: 45,
  ...extra,
});

describe("catalogueQuote", () => {
  it("sums each day at its period's rate with the bracket chosen on total days", () => {
    expect(catalogueQuote(RATES, null, REQ_7D)).toEqual({ total: 320, days: 7 });
  });
  it("adds the delivery fee of the pickup", () => {
    expect(
      catalogueQuote(RATES, { delivery_fees: { "chania-airport": 15 } }, { ...REQ_7D, pickupSlug: "chania-airport" })?.total,
    ).toBe(335);
  });
  it("uses the 3-day bracket for a 5-day July rental", () => {
    expect(
      catalogueQuote(RATES, null, { category: "compact", pickupSlug: "chania", dateFrom: "2027-07-10", dateTo: "2027-07-15", timeFrom: "09:00", timeTo: "09:00" })?.total,
    ).toBe(275);
  });
  it("returns null when one day falls outside every period", () => {
    expect(catalogueQuote(RATES, null, { ...REQ_7D, dateFrom: "2027-08-28", dateTo: "2027-09-04" })).toBeNull();
  });
  it("returns null for a category without rates", () => {
    expect(catalogueQuote(RATES, null, { ...REQ_7D, category: "suv" })).toBeNull();
  });
  it("returns null when the stay is shorter than every bracket", () => {
    expect(catalogueQuote(RATES, null, { ...REQ_7D, dateFrom: "2027-07-10", dateTo: "2027-07-12" })).toBeNull();
  });
});

describe("fromPricePerDay", () => {
  it("gives the cheapest per-day for the dates", () => {
    expect(
      fromPricePerDay(RATES, { dateFrom: "2027-07-10", dateTo: "2027-07-20", timeFrom: "09:00", timeTo: "09:00" }, "compact"),
    ).toBe(50);
  });
  it("is null when a day is uncovered", () => {
    expect(
      fromPricePerDay(RATES, { dateFrom: "2027-08-28", dateTo: "2027-09-10", timeFrom: "09:00", timeTo: "09:00" }, "compact"),
    ).toBeNull();
  });
});

describe("depositEur", () => {
  it("rounds to the cent and refuses below Stripe's minimum", () => {
    expect(depositEur(412, 0.1)).toBe(41.2);
    expect(depositEur(333.33, 0.1)).toBe(33.33);
    expect(depositEur(4, 0.1)).toBeNull();
    expect(depositEur(400, 0)).toBeNull();
    expect(depositEur(400, 1)).toBeNull();
  });
});

describe("validateRatesInput", () => {
  it("accepts valid rows and normalises numbers and dates", () => {
    const r = validateRatesInput([ROW("2027-07-01", "2027-07-31", "3" as unknown as number, { eur_per_day: "45.5", source: "pdf" })]);
    expect(r).toEqual({
      ok: true,
      rows: [{ category: "compact", period_from: "2027-07-01", period_to: "2027-07-31", min_days: 3, eur_per_day: 45.5, source: "pdf" }],
    });
  });
  it("rejects overlapping periods for the same category and bracket", () => {
    expect(validateRatesInput([ROW("2027-07-01", "2027-07-31", 3), ROW("2027-07-15", "2027-08-15", 3)]).ok).toBe(false);
  });
  it("allows the same period on another bracket", () => {
    expect(validateRatesInput([ROW("2027-07-01", "2027-07-31", 3), ROW("2027-07-01", "2027-07-31", 7)]).ok).toBe(true);
  });
  it("rejects a duplicate key", () => {
    const r = validateRatesInput([ROW("2027-07-01", "2027-07-31", 3), ROW("2027-07-01", "2027-07-10", 3)]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toMatch(/doublon/i);
  });
  it("rejects an unknown category", () => {
    expect(validateRatesInput([ROW("2027-07-01", "2027-07-31", 3, { category: "van" })]).ok).toBe(false);
  });
  it("rejects a reversed period", () => {
    expect(validateRatesInput([ROW("2027-07-31", "2027-07-01", 3)]).ok).toBe(false);
  });
  it("rejects min_days below 1 or non integer", () => {
    expect(validateRatesInput([ROW("2027-07-01", "2027-07-31", 0)]).ok).toBe(false);
    expect(validateRatesInput([ROW("2027-07-01", "2027-07-31", 2.5)]).ok).toBe(false);
  });
  it("rejects a price <= 0 or > 1000", () => {
    expect(validateRatesInput([ROW("2027-07-01", "2027-07-31", 3, { eur_per_day: 0 })]).ok).toBe(false);
    expect(validateRatesInput([ROW("2027-07-01", "2027-07-31", 3, { eur_per_day: 1001 })]).ok).toBe(false);
    expect(validateRatesInput([ROW("2027-07-01", "2027-07-31", 3, { eur_per_day: "abc" })]).ok).toBe(false);
  });
  it("rejects non ISO and impossible dates", () => {
    expect(validateRatesInput([ROW("01/07/2027", "2027-07-31", 3)]).ok).toBe(false);
    expect(validateRatesInput([ROW("2027-02-30", "2027-03-10", 3)]).ok).toBe(false);
  });
  it("rejects a non array input", () => {
    expect(validateRatesInput({}).ok).toBe(false);
  });
});
