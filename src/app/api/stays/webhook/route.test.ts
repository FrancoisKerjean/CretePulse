import { describe, it, expect, vi, beforeEach } from "vitest";

const { constructEvent, insert, rpc, maybeSingle, refundsCreate } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  insert: vi.fn(async () => ({ error: null })),
  rpc: vi.fn(async () => ({ data: [{ id: 5, guest_email: "j@x.com", listing_id: 9 }], error: null })),
  maybeSingle: vi.fn(async () => ({ data: { title: "Villa" } })),
  refundsCreate: vi.fn(async () => ({ id: "re_1" })),
}));
vi.mock("@/lib/stays/stripe-helpers", async (orig: () => Promise<Record<string, unknown>>) => {
  const mod = await orig();
  return {
    ...mod,
    stripeClient: () => ({
      webhooks: { constructEvent },
      refunds: { create: refundsCreate },
    }),
  };
});
const notifyTelegram = vi.fn(async () => {});
vi.mock("@/lib/stays/telegram", () => ({
  notifyTelegram: (...a: unknown[]) => notifyTelegram(...a),
}));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (t: string) => t === "stripe_webhook_events"
      ? { insert }
      : { select: () => ({ eq: () => ({ maybeSingle }) }) },
    rpc,
  },
}));
const sendGuestConfirmed = vi.fn(async () => {});
const sendGuestConflict = vi.fn(async () => {});
vi.mock("@/lib/stays/emails", () => ({
  sendGuestConfirmed: (...a: unknown[]) => sendGuestConfirmed(...a),
  sendGuestConflict: (...a: unknown[]) => sendGuestConflict(...a),
}));

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

function foreignEvt(id: string, metadata: Record<string, string>): Request {
  constructEvent.mockReturnValueOnce({
    id, type: "checkout.session.completed",
    data: { object: { id: "cs_x", payment_intent: "pi_x", metadata } },
  });
  return new Request("http://localhost/api/stays/webhook", {
    method: "POST", headers: { "stripe-signature": "sig" }, body: "{}",
  });
}

describe("POST /api/stays/webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  // Le compte Stripe est partage (NovAI acct_1TDPicEQ3UQbwGzY) : IEUF, Eleni et le
  // moteur Kairos emettent leurs propres checkout.session.completed, qui arrivent
  // aussi sur cet endpoint. Les ignorer sans rien ecrire ni renvoyer d'erreur.
  it("ignore une session d une autre marque du compte", async () => {
    const res = await POST(foreignEvt("ev_ieuf", { order_id: "42" }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, ignored: true });
    expect(insert).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ignore un request_id vide, que Number() convertirait en 0", async () => {
    const res = await POST(foreignEvt("ev_empty", { request_id: "" }) as never);
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ignore une session portant explicitement une autre marque", async () => {
    const res = await POST(
      foreignEvt("ev_other", { request_id: "5", brand: "iletaitunfut" }) as never,
    );
    expect(res.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("confirms the booking on first delivery", async () => {
    const res = await POST(evt("ev_1") as never);
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("mark_stay_deposit_paid", expect.objectContaining({ p_request_id: 5 }));
    expect(sendGuestConfirmed).toHaveBeenCalledOnce();
  });

  // Les dates ont ete prises entre l'acceptation et le paiement : la contrainte GIST
  // leve 23P01. L'argent est deja encaisse, on ne peut pas se contenter d'un 200 muet.
  it("rembourse, previent le voyageur et alerte quand les dates sont parties", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "23P01", message: "conflict" } });
    maybeSingle
      .mockResolvedValueOnce({
        data: { guest_email: "j@x.com", listing_id: 9, deposit_amount: 220.5 },
      })
      .mockResolvedValueOnce({ data: { title: "Villa Danae" } });

    const res = await POST(evt("ev_conflict") as never);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ conflict: true, refunded: true });
    expect(refundsCreate).toHaveBeenCalledWith({ payment_intent: "pi_1" });
    expect(sendGuestConflict).toHaveBeenCalledWith(
      "j@x.com",
      expect.objectContaining({ listingTitle: "Villa Danae", amountEur: 220.5 }),
    );
    expect(notifyTelegram).toHaveBeenCalledWith(expect.stringMatching(/collision/i));
    expect(sendGuestConfirmed).not.toHaveBeenCalled();
  });

  it("signale l echec du remboursement au lieu de le passer sous silence", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "23P01", message: "conflict" } });
    refundsCreate.mockRejectedValueOnce(new Error("stripe down"));
    maybeSingle
      .mockResolvedValueOnce({
        data: { guest_email: "j@x.com", listing_id: 9, deposit_amount: 220.5 },
      })
      .mockResolvedValueOnce({ data: { title: "Villa Danae" } });

    const res = await POST(evt("ev_conflict_2") as never);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ refunded: false });
    expect(notifyTelegram).toHaveBeenCalledWith(expect.stringMatching(/main/i));
  });

  it("is idempotent on duplicate delivery", async () => {
    insert.mockResolvedValueOnce({ error: { code: "23505" } });
    const res = await POST(evt("ev_1") as never);
    expect(res.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});
