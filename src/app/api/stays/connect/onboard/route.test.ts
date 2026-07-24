import { describe, it, expect, vi, beforeEach } from "vitest";

const { update } = vi.hoisted(() => ({ update: vi.fn(() => ({ eq: async () => ({ error: null }) })) }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from: () => ({ update }) } }));
vi.mock("@/lib/stays/tokens", () => ({ siteBase: () => "https://crete.direct" }));

import { GET } from "./route";

describe("GET /api/stays/connect/onboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks KYC complete on success return and redirects", async () => {
    const res = await GET(new Request("http://localhost/api/stays/connect/onboard?success=true&owner=1&account=acct_1") as never);
    expect([302, 307]).toContain(res.status);
    expect(update).toHaveBeenCalled();
  });

  it("redirects without update on refresh", async () => {
    const res = await GET(new Request("http://localhost/api/stays/connect/onboard?refresh=true&owner=1") as never);
    expect([302, 307]).toContain(res.status);
    expect(update).not.toHaveBeenCalled();
  });
});
