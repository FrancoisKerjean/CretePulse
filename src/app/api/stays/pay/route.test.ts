import { describe, it, expect, vi, beforeEach } from "vitest";

const getRequestByPayHash = vi.fn();
const getListingById = vi.fn();
vi.mock("@/lib/stays/db", () => ({
  getRequestByPayHash: (...a: unknown[]) => getRequestByPayHash(...a),
  getListingById: (...a: unknown[]) => getListingById(...a),
}));
const sessionsCreate = vi.fn(async () => ({ id: "cs_1", url: "https://checkout/x" }));
vi.mock("@/lib/stays/stripe-helpers", async (orig: () => Promise<Record<string, unknown>>) => {
  const mod = await orig();
  return {
    ...mod,
    stripeClient: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
  };
});
// vi.hoisted ensures `from` is initialized before the hoisted vi.mock factory runs
const { from } = vi.hoisted(() => ({
  from: vi.fn(() => ({ update: () => ({ eq: async () => ({ error: null }) }) })),
}));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/stays/tokens", () => ({ hashToken: (t: string) => `hash(${t})`, siteBase: () => "https://crete.direct" }));

import { POST } from "./route";
function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("POST /api/stays/pay", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a destination-charge checkout session for an approved request", async () => {
    getRequestByPayHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "approved", quoted_price_eur: 700, guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5 });
    from.mockImplementationOnce(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { stripe_connect_account_id: "acct_1", kyc_status: "complete" } }) }) }) }));
    const res = await POST(req({ token: "pay-plain", locale: "fr" }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout/x");
    expect(sessionsCreate).toHaveBeenCalledOnce();
  });

  it("409 when the request is not approved", async () => {
    getRequestByPayHash.mockResolvedValueOnce({ id: 5, status: "pending" });
    const res = await POST(req({ token: "pay-plain" }) as never);
    expect(res.status).toBe(409);
  });

  it("404 on unknown token", async () => {
    getRequestByPayHash.mockResolvedValueOnce(null);
    const res = await POST(req({ token: "x" }) as never);
    expect(res.status).toBe(404);
  });

  it("502 lisible quand Stripe refuse la session d acompte", async () => {
    getRequestByPayHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "approved", quoted_price_eur: 700, guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5 });
    from.mockImplementationOnce(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { stripe_connect_account_id: "acct_1", kyc_status: "complete" } }) }) }) }));
    sessionsCreate.mockRejectedValueOnce(
      Object.assign(new Error("No such destination: acct_1TDPicEQ3UQbwGzY"), {
        type: "invalid_request_error", statusCode: 400, requestId: "req_pay_1",
      }) as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req({ token: "pay-plain", locale: "fr" }) as never);

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("payment_provider");
    expect(String(json.error).length).toBeGreaterThan(20);
    expect(JSON.stringify(json)).not.toMatch(/stripe|acct_|No such destination/i);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("req_pay_1");
    // Pas de session en base pour une session qui n'existe pas : seule la lecture
    // du proprietaire a touche supabase.
    expect(from).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("503 lisible quand la plateforme Connect n est pas activee", async () => {
    getRequestByPayHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "approved", quoted_price_eur: 700, guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5 });
    from.mockImplementationOnce(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { stripe_connect_account_id: "acct_1", kyc_status: "complete" } }) }) }) }));
    sessionsCreate.mockRejectedValueOnce(
      new Error("You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect.") as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req({ token: "pay-plain", locale: "fr" }) as never);

    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("payouts_unavailable");
    errSpy.mockRestore();
  });

  it("409 when the owner KYC is not complete", async () => {
    getRequestByPayHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "approved", quoted_price_eur: 700, guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5 });
    from.mockImplementationOnce(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { stripe_connect_account_id: "acct_1", kyc_status: "pending" } }) }) }) }));
    const res = await POST(req({ token: "pay-plain", locale: "fr" }) as never);
    expect(res.status).toBe(409);
  });
});
