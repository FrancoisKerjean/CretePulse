import { describe, it, expect, vi, beforeEach } from "vitest";

const { update, retrieve } = vi.hoisted(() => ({
  update: vi.fn(() => ({ eq: async () => ({ error: null }) })),
  retrieve: vi.fn(async () => ({ charges_enabled: true, details_submitted: true })),
}));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from: () => ({ update }) } }));
vi.mock("@/lib/stays/tokens", () => ({ siteBase: () => "https://crete.direct" }));
vi.mock("@/lib/stays/stripe-helpers", () => ({ stripeClient: () => ({ accounts: { retrieve } }) }));

import { GET } from "./route";

describe("GET /api/stays/connect/onboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks KYC complete when Stripe confirms the account is enabled", async () => {
    retrieve.mockResolvedValueOnce({ charges_enabled: true, details_submitted: true });
    const res = await GET(new Request("http://localhost/api/stays/connect/onboard?success=true&owner=1&account=acct_1") as never);
    expect([302, 307]).toContain(res.status);
    expect(update).toHaveBeenCalledWith({ kyc_status: "complete" });
  });

  it("does NOT mark complete when Stripe says the account is not yet enabled", async () => {
    retrieve.mockResolvedValueOnce({ charges_enabled: false, details_submitted: false });
    const res = await GET(new Request("http://localhost/api/stays/connect/onboard?success=true&owner=1&account=acct_1") as never);
    expect([302, 307]).toContain(res.status);
    expect(update).not.toHaveBeenCalledWith({ kyc_status: "complete" });
  });

  it("redirects without any update on refresh", async () => {
    const res = await GET(new Request("http://localhost/api/stays/connect/onboard?refresh=true&owner=1") as never);
    expect([302, 307]).toContain(res.status);
    expect(update).not.toHaveBeenCalled();
  });
});
