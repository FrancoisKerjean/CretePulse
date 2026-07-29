import { describe, it, expect, vi, beforeEach } from "vitest";

const transfersCreate = vi.fn(async () => ({ id: "tr_1" }));
vi.mock("@/lib/stays/stripe-helpers", () => ({
  stripeClient: () => ({ transfers: { create: transfersCreate } }),
}));
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

import { GET } from "./route";

function req(secret = "s3cret"): Request {
  return new Request("http://localhost/api/cron/car-transfers", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

const DUE = {
  id: 25,
  quoted_price: 310,
  quoted_by_partner_id: 111,
  date_from: "2026-01-01", // largement echu
  booking_status: "paid",
  transfer_id: null,
  cancelled_at: null,
  car_partners: { id: 111, name: "Zorbas", commission: 0.1, stripe_connect_account_id: "acct_z", kyc_status: "complete" },
};

function wiring(rows: unknown[] = [DUE]) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation(() => ({
    select: () => ({
      eq: () => ({ is: () => ({ lte: async () => ({ data: rows, error: null }) }) }),
    }),
    update: (patch: Record<string, unknown>) => {
      updates.push(patch);
      return { eq: async () => ({ error: null }) };
    },
  }));
  return updates;
}

describe("GET /api/cron/car-transfers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "s3cret";
    process.env.CAR_BOOKING_ENABLED = "on";
  });

  it("401 sans le secret du cron", async () => {
    wiring();
    expect((await GET(req("mauvais") as never)).status).toBe(401);
    expect(transfersCreate).not.toHaveBeenCalled();
  });

  it("desarme : ne verse rien", async () => {
    delete process.env.CAR_BOOKING_ENABLED;
    wiring();
    const res = await GET(req() as never);
    expect((await res.json()).disabled).toBe(true);
    expect(transfersCreate).not.toHaveBeenCalled();
  });

  it("verse au loueur le prix moins la commission", async () => {
    const updates = wiring();
    const res = await GET(req() as never);

    expect(res.status).toBe(200);
    expect((await res.json()).transferred).toBe(1);
    // 310 EUR moins 10 % = 279 EUR. L option d annulation n entre jamais ici.
    expect(transfersCreate).toHaveBeenCalledWith({
      amount: 27_900,
      currency: "eur",
      destination: "acct_z",
      metadata: { car_request_id: "25", brand: "crete.direct" },
    });
    expect(updates[0].transfer_id).toBe("tr_1");
    expect(updates[0].booking_status).toBe("transferred");
    expect(updates[0].transferred_at).toBeTruthy();
  });

  it("ne verse pas avant l echeance", async () => {
    // Depart dans un mois : le droit au remboursement est encore ouvert.
    const far = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    wiring([{ ...DUE, date_from: far }]);
    const res = await GET(req() as never);
    expect((await res.json()).transferred).toBe(0);
    expect(transfersCreate).not.toHaveBeenCalled();
  });

  it("ignore un loueur sans compte de versement, sans planter la passe", async () => {
    const updates = wiring([
      { ...DUE, id: 26, car_partners: { ...DUE.car_partners, stripe_connect_account_id: null } },
      DUE,
    ]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(req() as never);

    // La location versable passe quand meme : une ligne bloquee n'arrete pas tout.
    expect((await res.json()).transferred).toBe(1);
    expect(updates.filter((u) => u.transfer_id === "tr_1")).toHaveLength(1);
    errSpy.mockRestore();
  });

  it("un echec Stripe n interrompt pas la passe et ne marque rien", async () => {
    transfersCreate.mockRejectedValueOnce(
      Object.assign(new Error("insufficient funds"), { requestId: "req_tr_1" }) as never,
    );
    const updates = wiring([DUE, { ...DUE, id: 27 }]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(req() as never);
    const json = await res.json();

    expect(json.transferred).toBe(1);
    expect(json.failed).toBe(1);
    // La ligne en echec reste `paid` : la passe suivante la reprendra.
    expect(updates).toHaveLength(1);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("req_tr_1");
    errSpy.mockRestore();
  });
});
