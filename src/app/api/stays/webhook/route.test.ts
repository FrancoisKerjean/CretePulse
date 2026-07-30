import { describe, it, expect, vi, beforeEach } from "vitest";

const { constructEvent, insert, rpc, maybeSingle, requestMaybeSingle, refundsCreate } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  insert: vi.fn(async () => ({ error: null })),
  rpc: vi.fn(async () => ({ data: [{ id: 5, guest_email: "j@x.com", listing_id: 9 }], error: null })),
  maybeSingle: vi.fn(async () => ({ data: { title: "Villa" } })),
  // Lectures sur stay_requests : la locale du voyageur, et la demande relue sur
  // le chemin de collision. Une file distincte de celle des annonces et des
  // proprietaires, sinon l'ordre des mocks depend de l'ordre des requetes.
  requestMaybeSingle: vi.fn(async () => ({
    data: { locale: "de" } as Record<string, unknown> | null,
  })),
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
    from: (t: string) => {
      if (t === "stripe_webhook_events") return { insert };
      if (t === "stay_requests") {
        return { select: () => ({ eq: () => ({ maybeSingle: requestMaybeSingle }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle }) }) };
    },
    rpc,
  },
}));
const sendGuestConfirmed = vi.fn(async () => {});
const sendGuestConflict = vi.fn(async () => {});
const sendOwnerBooked = vi.fn(async () => {});
const sendGuestBalancePaid = vi.fn(async () => {});
vi.mock("@/lib/stays/emails", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  sendGuestConfirmed: (...a: unknown[]) => sendGuestConfirmed(...a),
  sendGuestConflict: (...a: unknown[]) => sendGuestConflict(...a),
  sendOwnerBooked: (...a: unknown[]) => sendOwnerBooked(...a),
  sendGuestBalancePaid: (...a: unknown[]) => sendGuestBalancePaid(...a),
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

  // Sans cet email, un proprietaire accepte une demande puis n apprend jamais qu il
  // a une reservation. C est le trou le plus grave cote offre.
  it("previent aussi le proprietaire, avec son net et le contact voyageur", async () => {
    rpc.mockResolvedValueOnce({
      data: [{
        id: 5, listing_id: 9, guest_email: "j@x.com", guest_name: "Jane",
        guest_phone: "+33600000000", date_from: "2026-08-01", date_to: "2026-08-08",
        quoted_price_eur: 100,
      }],
      error: null,
    });
    maybeSingle
      .mockResolvedValueOnce({
        data: { title: "Villa Danae", owner_id: 3, cleaning_fee_eur: 60, commission_rate: 5 },
      })
      .mockResolvedValueOnce({ data: { email: "owner@x.com", locale: "el" } });

    await POST(evt("ev_owner") as never);

    expect(sendOwnerBooked).toHaveBeenCalledWith(
      "owner@x.com",
      expect.objectContaining({
        guestName: "Jane",
        guestEmail: "j@x.com",
        guestPhone: "+33600000000",
        // 100 EUR x 7 nuits + 60 de menage
        ownerNetEur: 760,
      }),
      // Le proprietaire lit sa langue, le voyageur la sienne : deux locales
      // distinctes dans le meme evenement.
      "el",
    );
    expect(sendGuestConfirmed).toHaveBeenCalledWith("j@x.com", "Villa Danae", "de");
  });

  // Les dates ont ete prises entre l'acceptation et le paiement : la contrainte GIST
  // leve 23P01. L'argent est deja encaisse, on ne peut pas se contenter d'un 200 muet.
  it("rembourse, previent le voyageur et alerte quand les dates sont parties", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "23P01", message: "conflict" } });
    requestMaybeSingle.mockResolvedValueOnce({
      data: { guest_email: "j@x.com", listing_id: 9, deposit_amount: 220.5, locale: "de" },
    });
    maybeSingle.mockResolvedValueOnce({ data: { title: "Villa Danae" } });

    const res = await POST(evt("ev_conflict") as never);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ conflict: true, refunded: true });
    // Charge de destination : l'acompte est DEJA parti chez le proprietaire.
    // Sans reverse_transfer, crete.direct rembourse le voyageur de sa poche et le
    // proprietaire garde l'argent d'un sejour qui n'aura pas lieu.
    expect(refundsCreate).toHaveBeenCalledWith({
      payment_intent: "pi_1",
      reverse_transfer: true,
      refund_application_fee: true,
    });
    expect(sendGuestConflict).toHaveBeenCalledWith(
      "j@x.com",
      expect.objectContaining({ listingTitle: "Villa Danae", amountEur: 220.5 }),
      "de",
    );
    expect(notifyTelegram).toHaveBeenCalledWith(expect.stringMatching(/collision/i));
    expect(sendGuestConfirmed).not.toHaveBeenCalled();
  });

  it("signale l echec du remboursement au lieu de le passer sous silence", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "23P01", message: "conflict" } });
    refundsCreate.mockRejectedValueOnce(new Error("stripe down"));
    requestMaybeSingle.mockResolvedValueOnce({
      data: { guest_email: "j@x.com", listing_id: 9, deposit_amount: 220.5, locale: "fr" },
    });
    maybeSingle.mockResolvedValueOnce({ data: { title: "Villa Danae" } });

    const res = await POST(evt("ev_conflict_2") as never);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ refunded: false });
    expect(notifyTelegram).toHaveBeenCalledWith(expect.stringMatching(/main/i));
  });

  it("passe la demande en confirmed au paiement du solde", async () => {
    constructEvent.mockReturnValueOnce({
      id: "ev_balance",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_b", payment_intent: "pi_b",
          metadata: { request_id: "5", payment_type: "balance", brand: "crete.direct" },
        },
      },
    });
    rpc.mockResolvedValueOnce({
      data: [{ id: 5, listing_id: 9, guest_email: "j@x.com" }],
      error: null,
    });
    maybeSingle.mockResolvedValueOnce({ data: { title: "Villa Danae" } });

    const res = await POST(new Request("http://localhost/api/stays/webhook", {
      method: "POST", headers: { "stripe-signature": "sig" }, body: "{}",
    }) as never);

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("mark_stay_balance_paid", {
      p_request_id: 5,
      p_payment_intent_id: "pi_b",
    });
    expect(sendGuestBalancePaid).toHaveBeenCalledWith("j@x.com", "Villa Danae", "de");
    expect(sendOwnerBooked).not.toHaveBeenCalled();
  });

  it("is idempotent on duplicate delivery", async () => {
    insert.mockResolvedValueOnce({ error: { code: "23505" } });
    const res = await POST(evt("ev_1") as never);
    expect(res.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});
