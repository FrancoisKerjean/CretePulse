import { describe, it, expect, vi, beforeEach } from "vitest";

const { constructEvent, insert, rpc, maybeSingle } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  insert: vi.fn(async () => ({ error: null })),
  rpc: vi.fn(async () => ({ data: [{ id: 5, guest_email: "j@x.com", listing_id: 9 }], error: null })),
  maybeSingle: vi.fn(async () => ({ data: { title: "Villa" } })),
}));
vi.mock("@/lib/stays/stripe-helpers", async (orig: () => Promise<Record<string, unknown>>) => {
  const mod = await orig();
  return { ...mod, stripeClient: () => ({ webhooks: { constructEvent } }) };
});
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (t: string) => t === "stripe_webhook_events"
      ? { insert }
      : { select: () => ({ eq: () => ({ maybeSingle }) }) },
    rpc,
  },
}));
const sendGuestConfirmed = vi.fn(async () => {});
vi.mock("@/lib/stays/emails", () => ({ sendGuestConfirmed: (...a: unknown[]) => sendGuestConfirmed(...a) }));

import { POST } from "./route";

function evt(id: string): Request {
  constructEvent.mockReturnValueOnce({
    id, type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_intent: "pi_1", metadata: { request_id: "5", payment_type: "deposit" } } },
  });
  return new Request("http://localhost/api/stays/webhook", {
    method: "POST", headers: { "stripe-signature": "sig" }, body: "{}",
  });
}

describe("POST /api/stays/webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("confirms the booking on first delivery", async () => {
    const res = await POST(evt("ev_1") as never);
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("mark_stay_deposit_paid", expect.objectContaining({ p_request_id: 5 }));
    expect(sendGuestConfirmed).toHaveBeenCalledOnce();
  });

  it("is idempotent on duplicate delivery", async () => {
    insert.mockResolvedValueOnce({ error: { code: "23505" } });
    const res = await POST(evt("ev_1") as never);
    expect(res.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});
