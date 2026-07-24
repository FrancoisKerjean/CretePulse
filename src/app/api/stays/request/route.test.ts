import { describe, it, expect, vi, beforeEach } from "vitest";

const getListingBySlug = vi.fn();
const recentDuplicateExists = vi.fn(async () => false);
const ipRateLimited = vi.fn(async () => false);
const createStayRequest = vi.fn(async () => ({ id: 5, listing_id: 9 }));
vi.mock("@/lib/stays/db", () => ({
  getListingBySlug: (...a: unknown[]) => getListingBySlug(...a),
  recentDuplicateExists: (...a: unknown[]) => recentDuplicateExists(...a),
  ipRateLimited: (...a: unknown[]) => ipRateLimited(...a),
  createStayRequest: (...a: unknown[]) => createStayRequest(...a),
}));
const sendOwnerRequest = vi.fn(async () => {});
vi.mock("@/lib/stays/emails", () => ({ sendOwnerRequest: (...a: unknown[]) => sendOwnerRequest(...a) }));
vi.mock("@/lib/stays/tokens", () => ({
  newToken: () => "tok-plain",
  hashToken: (t: string) => `hash(${t})`,
  siteBase: () => "https://crete.direct",
}));
const notifyTelegram = vi.fn(async () => {});
vi.mock("@/lib/stays/telegram", () => ({ notifyTelegram: (...a: unknown[]) => notifyTelegram(...a) }));
const ownerMaybeSingle = vi.fn(async () => ({ data: { email: "o@x.com" } }));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: ownerMaybeSingle }) }) }),
  },
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/request", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}
const good = { slug: "villa-abc", guestName: "Jane", guestEmail: "jane@x.com", dateFrom: "2026-07-01", dateTo: "2026-07-08", pax: 2 };

describe("POST /api/stays/request", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a pending request and emails the owner", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, slug: "villa-abc", status: "published", owner_id: 1, title: "Villa" });
    const res = await POST(req(good) as never);
    expect(res.status).toBe(200);
    expect(createStayRequest).toHaveBeenCalledOnce();
    expect(sendOwnerRequest).toHaveBeenCalledOnce();
  });

  it("honeypot -> silent ok, no request created", async () => {
    // honeypot short-circuits BEFORE any DB lookup, do NOT queue getListingBySlug here,
    // a leftover mockResolvedValueOnce would leak into the next test (Vitest clearAllMocks
    // does not drain once-queues).
    const res = await POST(req({ ...good, website: "bot" }) as never);
    expect(res.status).toBe(200);
    expect(createStayRequest).not.toHaveBeenCalled();
  });

  it("rate-limited -> silent ok, no request created", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, status: "published", owner_id: 1 });
    ipRateLimited.mockResolvedValueOnce(true);
    const res = await POST(req(good) as never);
    expect(res.status).toBe(200);
    expect(createStayRequest).not.toHaveBeenCalled();
  });

  it("404 for an unpublished listing", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, status: "draft", owner_id: 1 });
    const res = await POST(req(good) as never);
    expect(res.status).toBe(404);
  });
});
