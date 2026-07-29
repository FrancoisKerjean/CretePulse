import { describe, it, expect, vi, beforeEach } from "vitest";

const getListingBySlug = vi.fn();
const bookedRangesForListing = vi.fn();
vi.mock("@/lib/stays/db", () => ({
  getListingBySlug: (...a: unknown[]) => getListingBySlug(...a),
  bookedRangesForListing: (...a: unknown[]) => bookedRangesForListing(...a),
}));

import { GET } from "./route";

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("GET /api/stays/availability/[slug]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 sur une annonce inconnue", async () => {
    getListingBySlug.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://x") as never, ctx("nope"));
    expect(res.status).toBe(404);
  });

  it("404 sur une annonce non publiee", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 7, status: "draft" });
    const res = await GET(new Request("http://x") as never, ctx("villa"));
    expect(res.status).toBe(404);
  });

  it("renvoie les nuits indisponibles et le minimum de nuits", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 7, status: "published", min_nights: 3 });
    bookedRangesForListing.mockResolvedValueOnce([
      { dateFrom: "2026-08-10", dateTo: "2026-08-12" },
    ]);
    const res = await GET(new Request("http://x") as never, ctx("villa"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unavailable).toEqual(["2026-08-10", "2026-08-11"]);
    expect(body.minNights).toBe(3);
  });

  it("met en cache CDN sans exposer de donnee personnelle", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 7, status: "published", min_nights: 1 });
    bookedRangesForListing.mockResolvedValueOnce([]);
    const res = await GET(new Request("http://x") as never, ctx("villa"));
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
    expect(JSON.stringify(await res.json())).not.toMatch(/@|guest/i);
  });
});
