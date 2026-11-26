import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  partnersForZoneWithTerms: vi.fn(),
  liveCataloguesForPartners: vi.fn(),
}));
vi.mock("@/lib/car-catalogue-db", () => db);

import { GET } from "./route";
import { CAR_TERMS_VERSION } from "@/lib/car-catalogue";

const P = (id: number, extra: Record<string, unknown> = {}) => ({
  id, name: `P${id}`, lead_routing: "direct", active: true, min_days: null,
  terms_version: CAR_TERMS_VERSION, terms_accepted_at: "2026-12-01T00:00:00Z", ...extra,
});
const grid = (eur: number) => ({
  rates: [{ category: "compact", period_from: "2027-06-01", period_to: "2027-06-30", min_days: 1, eur_per_day: eur }],
  conditions: null,
});
const QS = "pickup=chania&dateFrom=2027-06-10&dateTo=2027-06-15&timeFrom=10:00&timeTo=10:00";
const call = (qs: string) => GET(new Request(`http://localhost/api/car-rental/catalogue-from?${qs}`));

beforeEach(() => {
  vi.stubEnv("CAR_CATALOGUE_ENABLED", "on");
  db.partnersForZoneWithTerms.mockReset();
  db.liveCataloguesForPartners.mockReset();
  db.partnersForZoneWithTerms.mockResolvedValue([P(1), P(2)]);
  db.liveCataloguesForPartners.mockResolvedValue(new Map([[1, grid(50)], [2, grid(47)]]));
});
afterEach(() => vi.unstubAllEnvs());

describe("GET catalogue-from", () => {
  it("switch off: empty prices, no database read", async () => {
    vi.stubEnv("CAR_CATALOGUE_ENABLED", "off");
    const res = await call(QS);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=300");
    expect(await res.json()).toEqual({ prices: {} });
    expect(db.partnersForZoneWithTerms).not.toHaveBeenCalled();
    expect(db.liveCataloguesForPartners).not.toHaveBeenCalled();
  });

  it("switch on: lowest price among bookable partners", async () => {
    const res = await call(QS);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=300");
    expect((await res.json()).prices).toEqual({ compact: 47 });
  });

  it("ignores relay, unbookable and min_days-excluded partners", async () => {
    db.partnersForZoneWithTerms.mockResolvedValue([
      P(1), P(2, { lead_routing: "relay" }), P(3, { terms_version: null, terms_accepted_at: null }), P(4, { min_days: 30 }),
    ]);
    db.liveCataloguesForPartners.mockResolvedValue(new Map([[1, grid(50)], [2, grid(10)], [3, grid(11)], [4, grid(12)]]));
    expect((await (await call(QS)).json()).prices).toEqual({ compact: 50 });
  });

  it("a partner without live catalogue is skipped", async () => {
    db.liveCataloguesForPartners.mockResolvedValue(new Map([[1, grid(50)]]));
    expect((await (await call(QS)).json()).prices).toEqual({ compact: 50 });
  });

  it.each([
    ["unknown pickup", "pickup=nowhere&dateFrom=2027-06-10&dateTo=2027-06-15"],
    ["missing pickup", "dateFrom=2027-06-10&dateTo=2027-06-15"],
    ["bad dateFrom", "pickup=chania&dateFrom=2027-02-30&dateTo=2027-06-15"],
    ["missing dateTo", "pickup=chania&dateFrom=2027-06-10"],
    ["dateTo before dateFrom", "pickup=chania&dateFrom=2027-06-15&dateTo=2027-06-10"],
    ["span over 90 days", "pickup=chania&dateFrom=2027-06-10&dateTo=2099-06-15"],
    ["bad timeFrom", `${QS}&timeFrom=25:00`.replace("timeFrom=10:00&", "")],
    ["bad timeTo", "pickup=chania&dateFrom=2027-06-10&dateTo=2027-06-15&timeTo=10h"],
  ])("400 on %s, before any database read", async (_n, qs) => {
    const res = await call(qs);
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe("string");
    expect(db.partnersForZoneWithTerms).not.toHaveBeenCalled();
  });

  it("accepts omitted times", async () => {
    const res = await call("pickup=chania&dateFrom=2027-06-10&dateTo=2027-06-15");
    expect(res.status).toBe(200);
  });
});
