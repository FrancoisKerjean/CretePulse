import { describe, expect, it } from "vitest";
import {
  catalogueQuote,
  depositEur,
  fromPricePerDay,
  isPartnerBookable,
  validateConditionsInput,
  CAR_TERMS_VERSION,
  validateRatesInput,
  planFanOut,
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
    if (!r.ok) expect(r.errors.join(" ")).toMatch(/duplicate/i);
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

describe("validateRatesInput, bornes et anglais", () => {
  it("refuse plus de 200 lignes et plafonne source à 120 caractères", () => {
    const many = Array.from({ length: 201 }, () => ({ category: "city", period_from: "2027-06-01", period_to: "2027-06-02", min_days: 1, eur_per_day: 30 }));
    expect(validateRatesInput(many).ok).toBe(false);
    const r = validateRatesInput([{ category: "city", period_from: "2027-06-01", period_to: "2027-06-02", min_days: 1, eur_per_day: 30, source: "x".repeat(300) }]);
    expect(r.ok && r.rows[0].source?.length).toBe(120);
  });
  it("messages en anglais", () => {
    const r = validateRatesInput([{ category: "boat" }]);
    expect(!r.ok && r.errors.join(" ")).toMatch(/unknown category/);
  });
});

describe("isPartnerBookable", () => {
  it("faux sans acceptation ou avec une ancienne version", () => {
    expect(isPartnerBookable({ terms_version: null, terms_accepted_at: null })).toBe(false);
    expect(isPartnerBookable({ terms_version: "2026-01", terms_accepted_at: "2026-02-01T10:00:00Z" })).toBe(false);
  });
  it("faux si la version est la bonne mais sans date d'acceptation", () => {
    expect(isPartnerBookable({ terms_version: "2027-01", terms_accepted_at: null })).toBe(false);
  });
  it("vrai pour la version courante avec une date", () => {
    expect(CAR_TERMS_VERSION).toBe("2027-01");
    expect(isPartnerBookable({ terms_version: "2027-01", terms_accepted_at: "2026-12-01T10:00:00Z" })).toBe(true);
  });
});

describe("validateConditionsInput", () => {
  it("accepte des conditions complètes et normalise les textes", () => {
    const res = validateConditionsInput({
      models: { compact: { model: "  Fiat Panda ", gearbox: "manual" }, suv: { model: "Jimny", gearbox: null } },
      inclusions: ["unlimited_km", "child_seat"],
      deposit_hold_eur: "300",
      child_seat_eur_day: 3,
      delivery_fees: { heraklion: 15, chania: 0 },
      cancellation_terms: " Free until 48h ",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.conditions.models?.compact).toEqual({ model: "Fiat Panda", gearbox: "manual" });
      expect(res.conditions.deposit_hold_eur).toBe(300);
      expect(res.conditions.cancellation_terms).toBe("Free until 48h");
      expect(res.conditions.delivery_fees).toEqual({ heraklion: 15, chania: 0 });
    }
  });
  it("accepte null et un objet vide", () => {
    expect(validateConditionsInput(null).ok).toBe(true);
    expect(validateConditionsInput({}).ok).toBe(true);
  });
  it("refuse catégorie, boîte, inclusion et lieu inconnus", () => {
    expect(validateConditionsInput({ models: { truck: { model: "x", gearbox: null } } }).ok).toBe(false);
    expect(validateConditionsInput({ models: { city: { model: "x", gearbox: "cvt" } } }).ok).toBe(false);
    expect(validateConditionsInput({ inclusions: ["wifi"] }).ok).toBe(false);
    expect(validateConditionsInput({ delivery_fees: { atlantis: 5 } }).ok).toBe(false);
  });
  it("refuse les montants hors 0..10000 et les textes trop longs", () => {
    expect(validateConditionsInput({ deposit_hold_eur: -1 }).ok).toBe(false);
    expect(validateConditionsInput({ child_seat_eur_day: 10001 }).ok).toBe(false);
    expect(validateConditionsInput({ delivery_fees: { heraklion: "abc" } }).ok).toBe(false);
    expect(validateConditionsInput({ cancellation_terms: "x".repeat(301) }).ok).toBe(false);
    expect(validateConditionsInput({ models: { city: { model: "x".repeat(301), gearbox: null } } }).ok).toBe(false);
  });
});

describe("planFanOut", () => {
  const P = (id: number, extra: Record<string, unknown> = {}) => ({
    id, name: `P${id}`, email: `p${id}@x.com`, phone: null, whatsapp: null, zone_ids: [], commission: 0.1,
    lead_routing: "direct" as const, active: true, min_days: null,
    terms_version: CAR_TERMS_VERSION, terms_accepted_at: "2026-12-01T00:00:00Z",
    default_insurance_type: "cdw_excess", default_excess_eur: 500, default_zero_excess_upsell_eur_day: 8,
    ...extra,
  });
  const cats = new Map([
    [1, { rates: RATES, conditions: { models: { compact: { model: "Fiat Panda", gearbox: "manual" as const } }, inclusions: ["cdw"], cancellation_terms: "Free until 48h" } }],
  ]);
  const partners = [P(1), P(2), P(3, { terms_version: null, terms_accepted_at: null }), P(4, { lead_routing: "relay" })];

  it("switch off: everything goes to quote", () => {
    const r = planFanOut({ enabled: false, partners, catalogues: cats, req: REQ_7D });
    expect(r.catalogue).toEqual([]);
    expect(r.quote).toEqual([1, 2, 3, 4]);
  });
  it("switch on: grid covers -> catalogue, no grid -> quote, unbookable and relay excluded", () => {
    const r = planFanOut({ enabled: true, partners, catalogues: cats, req: REQ_7D });
    expect(r.catalogue).toEqual([{
      partnerId: 1, total: 320, carModel: "Fiat Panda", gearbox: "manual", inclusions: ["cdw"],
      insuranceType: "cdw_excess", excessEur: 500, zeroExcessUpsellEurDay: 8, note: "Free until 48h",
    }]);
    expect(r.quote).toEqual([2]);
  });
  it("switch on: a live grid that does not cover the request falls back to quote", () => {
    const r = planFanOut({ enabled: true, partners: [P(1)], catalogues: cats, req: { ...REQ_7D, category: "suv" } });
    expect(r.catalogue).toEqual([]);
    expect(r.quote).toEqual([1]);
  });
});

describe("validateConditionsInput, coordonnées retirées", () => {
  it("strips phone and email from cancellation terms and model names", () => {
    const r = validateConditionsInput({
      cancellation_terms: "Cancel by WhatsApp +30 694 123 4567 or a@b.gr",
      models: { compact: { model: "Fiat Panda, call 6941234567", gearbox: null } },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.conditions.cancellation_terms).toBe("Cancel by WhatsApp or");
    expect(r.conditions.models?.compact?.model).toBe("Fiat Panda, call");
  });
});
