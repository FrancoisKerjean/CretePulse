import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stays/airbnb-scrape", () => ({
  scrapeAirbnbUrl: vi.fn(async () => ({
    ok: true,
    data: { airbnbId: "123", title: "Villa", description: "Nice", photos: ["p1"] },
  })),
}));
const upsertOwnerByEmail = vi.fn(async () => ({ id: 1, email: "o@x.com" }));
const createDraftListing = vi.fn(async () => ({ id: 9, slug: "villa-abc", status: "draft" }));
vi.mock("@/lib/stays/db", () => ({
  upsertOwnerByEmail: (...a: unknown[]) => upsertOwnerByEmail(...a),
  createDraftListing: (...a: unknown[]) => createDraftListing(...a),
  slugify: (s: string, suffix?: string) => (suffix ? `${s}-${suffix}` : s),
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/new", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/stays/new", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a draft listing from a pasted Airbnb URL", async () => {
    const res = await POST(req({
      airbnbUrl: "https://www.airbnb.com/rooms/123",
      ownerEmail: "o@x.com",
      basePriceEur: 100,
    }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.slug).toBeTruthy();
    expect(createDraftListing).toHaveBeenCalledOnce();
  });

  it("rejects a missing URL", async () => {
    const res = await POST(req({ ownerEmail: "o@x.com" }) as never);
    expect(res.status).toBe(422);
  });

  it("silently accepts a honeypot without creating a listing", async () => {
    const res = await POST(req({
      airbnbUrl: "https://www.airbnb.com/rooms/123",
      ownerEmail: "o@x.com",
      website: "bot",
    }) as never);
    expect(res.status).toBe(200);
    expect(createDraftListing).not.toHaveBeenCalled();
  });
});
