import { describe, it, expect, vi, beforeEach } from "vitest";

const getListingBySlug = vi.fn();
const publishListing = vi.fn(async () => {});
vi.mock("@/lib/stays/db", () => ({
  getListingBySlug: (...a: unknown[]) => getListingBySlug(...a),
  publishListing: (...a: unknown[]) => publishListing(...a),
}));
vi.mock("@/lib/stays/ical", () => ({
  parseICalText: vi.fn(() => [{ dateFrom: "2026-07-01", dateTo: "2026-07-08" }]),
}));
global.fetch = vi.fn(async () => ({ ok: true, text: async () => "BEGIN:VCALENDAR" }) as never);

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/stays/publish", () => {
  beforeEach(() => vi.clearAllMocks());

  it("publishes a draft when a valid private iCal is provided", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, slug: "villa-abc", status: "draft" });
    const res = await POST(req({ slug: "villa-abc", icalUrl: "https://airbnb.com/calendar/ical/x.ics" }) as never);
    expect(res.status).toBe(200);
    expect(publishListing).toHaveBeenCalledWith(9, "https://airbnb.com/calendar/ical/x.ics");
  });

  it("404s an unknown slug", async () => {
    getListingBySlug.mockResolvedValueOnce(null);
    const res = await POST(req({ slug: "nope", icalUrl: "https://airbnb.com/x.ics" }) as never);
    expect(res.status).toBe(404);
  });

  it("422s when the iCal URL is not an ics feed", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, slug: "villa-abc", status: "draft" });
    const res = await POST(req({ slug: "villa-abc", icalUrl: "not-a-url" }) as never);
    expect(res.status).toBe(422);
  });
});
