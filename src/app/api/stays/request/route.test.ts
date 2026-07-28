import { describe, it, expect, vi, beforeEach } from "vitest";

const getListingBySlug = vi.fn();
const recentDuplicateExists = vi.fn(async () => false);
const ipRateLimited = vi.fn(async () => false);
const createStayRequest = vi.fn(async () => ({ id: 5, listing_id: 9 }));
const bookedRangesForListing = vi.fn(async () => [] as unknown[]);
vi.mock("@/lib/stays/db", () => ({
  getListingBySlug: (...a: unknown[]) => getListingBySlug(...a),
  recentDuplicateExists: (...a: unknown[]) => recentDuplicateExists(...a),
  ipRateLimited: (...a: unknown[]) => ipRateLimited(...a),
  createStayRequest: (...a: unknown[]) => createStayRequest(...a),
  bookedRangesForListing: (...a: unknown[]) => bookedRangesForListing(...a),
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

  // La contrainte GIST en base ne se declenche qu'au paiement, quand l'argent est
  // deja pris. Le refus doit venir bien avant.
  it("409 quand les nuits demandees sont deja prises", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, status: "published", owner_id: 1, min_nights: 1 });
    bookedRangesForListing.mockResolvedValueOnce([
      { dateFrom: "2026-07-05", dateTo: "2026-07-09" },
    ]);
    const res = await POST(req(good) as never);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Dates unavailable");
    expect(createStayRequest).not.toHaveBeenCalled();
  });

  it("accepte un sejour qui commence le jour d un depart", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, status: "published", owner_id: 1, min_nights: 1 });
    bookedRangesForListing.mockResolvedValueOnce([
      { dateFrom: "2026-06-25", dateTo: "2026-07-01" },
    ]);
    const res = await POST(req(good) as never);
    expect(res.status).toBe(200);
    expect(createStayRequest).toHaveBeenCalledOnce();
  });

  it("422 sous le minimum de nuits, avec le minimum renvoye", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, status: "published", owner_id: 1, min_nights: 5 });
    const res = await POST(req({ ...good, dateTo: "2026-07-03" }) as never);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("Minimum stay");
    expect(body.minNights).toBe(5);
    expect(createStayRequest).not.toHaveBeenCalled();
  });
});
