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
vi.mock("@/lib/stays/tokens", () => ({ hashToken: (t: string) => `hash(${t})` }));
global.fetch = vi.fn(async () => ({ ok: true, text: async () => "BEGIN:VCALENDAR" }) as never);

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const draft = { id: 9, slug: "villa-abc", status: "draft", publish_token_hash: "hash(pub-plain)" };

describe("POST /api/stays/publish", () => {
  beforeEach(() => vi.clearAllMocks());

  it("publishes a draft when the owner token and a valid iCal are provided", async () => {
    getListingBySlug.mockResolvedValueOnce(draft);
    const res = await POST(req({ slug: "villa-abc", icalUrl: "https://airbnb.com/calendar/ical/x.ics", token: "pub-plain" }) as never);
    expect(res.status).toBe(200);
    expect(publishListing).toHaveBeenCalledWith(9, "https://airbnb.com/calendar/ical/x.ics");
  });

  it("403s when the ownership token is wrong", async () => {
    getListingBySlug.mockResolvedValueOnce(draft);
    const res = await POST(req({ slug: "villa-abc", icalUrl: "https://airbnb.com/calendar/ical/x.ics", token: "wrong" }) as never);
    expect(res.status).toBe(403);
    expect(publishListing).not.toHaveBeenCalled();
  });

  it("404s an unknown slug", async () => {
    getListingBySlug.mockResolvedValueOnce(null);
    const res = await POST(req({ slug: "nope", icalUrl: "https://airbnb.com/x.ics", token: "pub-plain" }) as never);
    expect(res.status).toBe(404);
  });

  it("422s when the iCal URL is not an ics feed", async () => {
    getListingBySlug.mockResolvedValueOnce(draft);
    const res = await POST(req({ slug: "villa-abc", icalUrl: "not-a-url", token: "pub-plain" }) as never);
    expect(res.status).toBe(422);
  });
});
