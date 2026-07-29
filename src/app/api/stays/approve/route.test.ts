import { describe, it, expect, vi, beforeEach } from "vitest";

const getRequestByApproveHash = vi.fn();
const getListingById = vi.fn();
vi.mock("@/lib/stays/db", () => ({
  getRequestByApproveHash: (...a: unknown[]) => getRequestByApproveHash(...a),
  getListingById: (...a: unknown[]) => getListingById(...a),
}));
const from = vi.fn();
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from: (...a: unknown[]) => from(...a) } }));
const createConnectOnboardingLink = vi.fn(async () => ({ accountId: "acct_1", url: "https://connect/x" }));
vi.mock("@/lib/stays/stripe-helpers", () => ({
  createConnectOnboardingLink: (...a: unknown[]) => createConnectOnboardingLink(...a),
}));
const sendGuestApproved = vi.fn(async () => {});
vi.mock("@/lib/stays/emails", () => ({ sendGuestApproved: (...a: unknown[]) => sendGuestApproved(...a) }));
vi.mock("@/lib/stays/tokens", () => ({
  newToken: () => "pay-plain",
  hashToken: (t: string) => `hash(${t})`,
  siteBase: () => "https://crete.direct",
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/approve", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

function chainUpdate() {
  const eq = vi.fn(() => ({ error: null }));
  return { update: vi.fn(() => ({ eq })) };
}

describe("POST /api/stays/approve", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a KYC link when owner has no connect account", async () => {
    getRequestByApproveHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "pending", guest_email: "j@x.com" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa" });
    from.mockImplementation((table: string) => {
      if (table === "stay_owners") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1, email: "o@x.com", stripe_connect_account_id: null } }) }) }),
                 update: () => ({ eq: async () => ({ error: null }) }) };
      }
      return chainUpdate();
    });
    const res = await POST(req({ token: "app-plain", action: "accept", price: 700 }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.kycUrl).toBe("https://connect/x");
    expect(sendGuestApproved).not.toHaveBeenCalled();
  });

  it("approves + emails guest when owner already onboarded", async () => {
    getRequestByApproveHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "pending", guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5 });
    from.mockImplementation((table: string) => {
      if (table === "stay_owners") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1, email: "o@x.com", stripe_connect_account_id: "acct_1" } }) }) }) };
      }
      return chainUpdate();
    });
    const res = await POST(req({ token: "app-plain", action: "accept", price: 700 }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.approved).toBe(true);
    expect(sendGuestApproved).toHaveBeenCalledOnce();
  });

  it("declines the request", async () => {
    getRequestByApproveHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "pending" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1 });
    from.mockImplementation(() => chainUpdate());
    const res = await POST(req({ token: "app-plain", action: "decline" }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.declined).toBe(true);
  });

  it("404 on unknown token", async () => {
    getRequestByApproveHash.mockResolvedValueOnce(null);
    const res = await POST(req({ token: "x", action: "accept", price: 1 }) as never);
    expect(res.status).toBe(404);
  });
});
