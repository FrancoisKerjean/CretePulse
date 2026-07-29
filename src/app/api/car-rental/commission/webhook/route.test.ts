import { describe, it, expect, vi, beforeEach } from "vitest";

const constructEvent = vi.fn();
vi.mock("@/lib/stays/stripe-helpers", () => ({
  stripeClient: () => ({ webhooks: { constructEvent } }),
}));
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

import { POST } from "./route";

function req(body = "{}"): Request {
  return new Request("http://localhost/api/car-rental/commission/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body,
  });
}

function event(metadata: Record<string, string>, id = "evt_1") {
  return {
    id,
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_intent: "pi_1", metadata } },
  };
}

const CAR_META = { car_request_id: "42", payment_type: "car_commission", brand: "crete.direct" };

function wiring(opts: { ledgerError?: { code?: string } } = {}) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation((table: string) => {
    if (table === "stripe_webhook_events") {
      return { insert: async () => ({ error: opts.ledgerError ?? null }) };
    }
    return {
      update: (patch: Record<string, unknown>) => {
        updates.push(patch);
        return { eq: async () => ({ error: null }) };
      },
    };
  });
  return updates;
}

describe("POST /api/car-rental/commission/webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400 sur une signature invalide, rien en base", () => {
    constructEvent.mockImplementationOnce(() => { throw new Error("bad sig"); });
    wiring();
    return POST(req() as never).then(async (res) => {
      expect(res.status).toBe(400);
      expect(from).not.toHaveBeenCalled();
    });
  });

  it("marque la commission encaissee", async () => {
    constructEvent.mockReturnValueOnce(event(CAR_META));
    const updates = wiring();
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    expect(updates).toHaveLength(1);
    expect(updates[0].commission_paid_at).toBeTruthy();
    expect(updates[0].commission_payment_intent_id).toBe("pi_1");
  });

  it("ignore un evenement Stays sans rien ecrire", async () => {
    // Le compte est partage : cet endpoint recoit AUSSI les sessions Stays,
    // IEUF, Eleni et Kairos. Un 200 muet, jamais un 4xx qui ferait retenter
    // Stripe pendant 3 jours.
    constructEvent.mockReturnValueOnce(
      event({ request_id: "5", payment_type: "deposit", brand: "crete.direct" }),
    );
    wiring();
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("ignore un evenement d une autre marque", async () => {
    constructEvent.mockReturnValueOnce(event({ order_id: "9" }));
    wiring();
    const res = await POST(req() as never);
    expect((await res.json()).ignored).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("refuse un car_request_id qui n est pas un entier positif", async () => {
    constructEvent.mockReturnValueOnce(event({ ...CAR_META, car_request_id: "abc" }));
    wiring();
    expect((await (await POST(req() as never)).json()).ignored).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejoue le meme evenement sans double ecriture", async () => {
    constructEvent.mockReturnValueOnce(event(CAR_META));
    const updates = wiring({ ledgerError: { code: "23505" } });
    const res = await POST(req() as never);
    expect((await res.json()).duplicate).toBe(true);
    expect(updates).toHaveLength(0);
  });

  it("inscrit l evenement au registre sous le scope car", async () => {
    constructEvent.mockReturnValueOnce(event(CAR_META));
    const inserts: Array<Record<string, unknown>> = [];
    from.mockImplementation((table: string) => {
      if (table === "stripe_webhook_events") {
        return { insert: async (row: Record<string, unknown>) => { inserts.push(row); return { error: null }; } };
      }
      return { update: () => ({ eq: async () => ({ error: null }) }) };
    });
    await POST(req() as never);
    // `request_id` seul est ambigu entre stay_requests et car_requests : sans
    // scope, deux lignes de tables differentes se confondent au reconcile.
    expect(inserts[0]).toMatchObject({ scope: "car", request_id: 42 });
  });
});
