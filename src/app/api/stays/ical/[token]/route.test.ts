import { describe, it, expect, vi, beforeEach } from "vitest";

const { getListingBySlug, bookedRangesForListing } = vi.hoisted(() => ({
  getListingBySlug: vi.fn(async () => ({ id: 9, slug: "villa-abc" })),
  bookedRangesForListing: vi.fn(async () => [{ dateFrom: "2026-07-01", dateTo: "2026-07-08" }]),
}));
vi.mock("@/lib/stays/db", () => ({ getListingBySlug, bookedRangesForListing }));

import { GET } from "./route";

describe("GET /api/stays/ical/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a text/calendar feed with booked ranges", async () => {
    const res = await GET(new Request("http://localhost/api/stays/ical/villa-abc") as never, { params: Promise.resolve({ token: "villa-abc" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("DTSTART;VALUE=DATE:20260701");
  });

  it("404 for an unknown token", async () => {
    getListingBySlug.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/stays/ical/nope") as never, { params: Promise.resolve({ token: "nope" }) });
    expect(res.status).toBe(404);
  });
});
