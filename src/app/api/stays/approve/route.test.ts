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
vi.mock("@/lib/stays/emails", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  sendGuestApproved: (...a: unknown[]) => sendGuestApproved(...a),
}));
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

  // Le voyageur a demande dans sa langue : l'acceptation, la page de paiement et
  // l'email doivent rester dans la meme langue.
  it("ecrit au voyageur dans sa langue et lui donne une page de paiement dans sa langue", async () => {
    getRequestByApproveHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "pending", guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08", locale: "de" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5 });
    from.mockImplementation((table: string) => {
      if (table === "stay_owners") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1, email: "o@x.com", stripe_connect_account_id: "acct_1" } }) }) }) };
      }
      return chainUpdate();
    });
    await POST(req({ token: "app-plain", action: "accept", price: 700 }) as never);
    expect(sendGuestApproved).toHaveBeenCalledWith(
      "j@x.com",
      expect.objectContaining({ payUrl: "https://crete.direct/de/stays/pay/pay-plain" }),
      "de",
    );
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

  it("503 lisible quand la plateforme Connect n est pas activee", async () => {
    const ownerUpdate = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    getRequestByApproveHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "pending", guest_email: "j@x.com" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa" });
    from.mockImplementation((table: string) => {
      if (table === "stay_owners") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1, email: "o@x.com", stripe_connect_account_id: null } }) }) }),
                 update: ownerUpdate };
      }
      return chainUpdate();
    });
    createConnectOnboardingLink.mockRejectedValueOnce(
      Object.assign(
        new Error("You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect."),
        { type: "invalid_request_error", statusCode: 400, requestId: "req_LTgM8Q2P3wMWA8" },
      ),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req({ token: "app-plain", action: "accept", price: 700 }) as never);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe("payouts_unavailable");
    // Rien de Stripe ne doit atteindre le navigateur.
    expect(JSON.stringify(json)).not.toMatch(/stripe|acct_|You can only create/i);
    // Le serveur, lui, garde le requestId pour retrouver la requete dans Workbench.
    expect(JSON.stringify(errSpy.mock.calls)).toContain("req_LTgM8Q2P3wMWA8");
    // Aucun compte fantome ecrit sur le proprietaire, aucun email au voyageur.
    expect(ownerUpdate).not.toHaveBeenCalled();
    expect(sendGuestApproved).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("502 sur toute autre panne Stripe a la creation du compte", async () => {
    getRequestByApproveHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "pending", guest_email: "j@x.com" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa" });
    from.mockImplementation((table: string) => {
      if (table === "stay_owners") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1, email: "o@x.com", stripe_connect_account_id: null } }) }) }),
                 update: () => ({ eq: async () => ({ error: null }) }) };
      }
      return chainUpdate();
    });
    createConnectOnboardingLink.mockRejectedValueOnce(new Error("fetch failed"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req({ token: "app-plain", action: "accept", price: 700 }) as never);

    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("payment_provider");
    errSpy.mockRestore();
  });
});
