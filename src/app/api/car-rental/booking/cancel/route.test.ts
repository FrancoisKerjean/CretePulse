import { describe, it, expect, vi, beforeEach } from "vitest";

const refundsCreate = vi.fn(async () => ({ id: "re_1" }));
vi.mock("@/lib/stays/stripe-helpers", () => ({
  stripeClient: () => ({ refunds: { create: refundsCreate } }),
}));
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/car-quote", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  hashToken: (t: string) => `hash(${t})`,
}));

import { POST } from "./route";

function req(body: unknown = { token: "t" }): Request {
  return new Request("http://localhost/api/car-rental/booking/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Depart dans longtemps : la fenetre de remboursement est ouverte. */
const FAR = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
/** Depart demain : la fenetre est fermee (moins de 48 h). */
const SOON = new Date(Date.now() + 20 * 3_600_000).toISOString().slice(0, 10);

const PAID = {
  id: 25, booking_status: "paid", booking_amount_eur: 315,
  cancellation_option: true, booking_payment_intent_id: "pi_b1",
  date_from: FAR, transfer_id: null,
};

function wiring(row: unknown = PAID) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }),
    update: (patch: Record<string, unknown>) => {
      updates.push(patch);
      return { eq: async () => ({ error: null }) };
    },
  }));
  return updates;
}

describe("POST /api/car-rental/booking/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAR_BOOKING_ENABLED = "on";
  });

  it("rembourse integralement avec l option, hors des 48 h", async () => {
    const updates = wiring();
    const res = await POST(req() as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.refundedEur).toBe(310);
    // Aucun reverse_transfer : rien n'a ete transfere, les fonds sont encore chez nous.
    expect(refundsCreate).toHaveBeenCalledWith({
      payment_intent: "pi_b1",
      amount: 31_000,
    });
    expect(updates[0].booking_status).toBe("refunded");
    expect(updates[0].refund_amount_eur).toBe(310);
    expect(updates[0].cancelled_at).toBeTruthy();
  });

  it("ne rembourse pas le prix de l option elle-meme", async () => {
    wiring();
    await POST(req() as never);
    // 315 payes, 310 rendus : les 5 EUR de l option sont acquis.
    const call = refundsCreate.mock.calls[0][0] as unknown as { amount: number };
    expect(call.amount).toBe(31_000);
  });

  it("annule sans rembourser quand l option n a pas ete prise", async () => {
    const updates = wiring({ ...PAID, cancellation_option: false, booking_amount_eur: 310 });
    const res = await POST(req() as never);

    expect(res.status).toBe(200);
    expect((await res.json()).refundedEur).toBe(0);
    expect(refundsCreate).not.toHaveBeenCalled();
    expect(updates[0].booking_status).toBe("cancelled");
  });

  it("annule sans rembourser dans les 48 h, meme avec l option", async () => {
    const updates = wiring({ ...PAID, date_from: SOON });
    const res = await POST(req() as never);

    expect((await res.json()).refundedEur).toBe(0);
    expect(refundsCreate).not.toHaveBeenCalled();
    expect(updates[0].booking_status).toBe("cancelled");
  });

  it("refuse d annuler une reservation deja versee au loueur", async () => {
    // A ce stade l'argent est parti : rembourser exigerait de le reprendre, ce
    // que ce modele existe precisement pour eviter.
    wiring({ ...PAID, booking_status: "transferred", transfer_id: "tr_1" });
    const res = await POST(req() as never);
    expect(res.status).toBe(409);
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("refuse une seconde annulation", async () => {
    wiring({ ...PAID, booking_status: "refunded" });
    expect((await POST(req() as never)).status).toBe(409);
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("404 sur un jeton inconnu", async () => {
    wiring(null);
    expect((await POST(req() as never)).status).toBe(404);
  });

  it("habille une panne Stripe et ne marque rien d annule", async () => {
    const updates = wiring();
    refundsCreate.mockRejectedValueOnce(
      Object.assign(new Error("charge already refunded"), { requestId: "req_ref_1" }) as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req() as never);

    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("payment_provider");
    // Rien n'est ecrit : la reservation reste payee, l'annulation est rejouable.
    expect(updates).toHaveLength(0);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("req_ref_1");
    errSpy.mockRestore();
  });
});
