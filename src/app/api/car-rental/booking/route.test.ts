import { describe, it, expect, vi, beforeEach } from "vitest";

const sessionsCreate = vi.fn(async () => ({ id: "cs_live_b1", url: "https://checkout/booking" }));
vi.mock("@/lib/stays/stripe-helpers", () => ({
  stripeClient: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
}));
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/car-quote", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  hashToken: (t: string) => `hash(${t})`,
  siteBase: () => "https://crete.direct",
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/car-rental/booking", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ROW = {
  id: 25,
  status: "accepted",
  booking_status: null,
  booking_session_id: null,
  quoted_price: 310,
  quoted_by_partner_id: 111,
  quoted_car_model: "City car · Manual",
  customer_email: "n@example.com",
  date_from: "2026-09-25",
  date_to: "2026-10-09",
};
const PARTNER = {
  id: 111, name: "Zorbas Rent a Car", commission: 0.1,
  stripe_connect_account_id: "acct_zorbas", kyc_status: "complete",
};

function wiring(opts: { row?: unknown; lockRows?: unknown[]; partner?: unknown } = {}) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation((table: string) => {
    if (table === "car_requests") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.row === undefined ? ROW : opts.row }) }) }),
        update: (patch: Record<string, unknown>) => {
          updates.push(patch);
          return {
            eq: () => ({
              is: () => ({ select: async () => ({ data: opts.lockRows ?? [{ id: 25 }], error: null }) }),
              select: async () => ({ data: [{ id: 25 }], error: null }),
            }),
          };
        },
      };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.partner === undefined ? PARTNER : opts.partner }) }) }) };
  });
  return updates;
}

describe("POST /api/car-rental/booking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAR_BOOKING_ENABLED = "on";
  });

  it("desarme par defaut : aucun appel Stripe, aucune ecriture", async () => {
    delete process.env.CAR_BOOKING_ENABLED;
    const updates = wiring();
    const res = await POST(req({ token: "t", hasOption: true }) as never);
    expect(res.status).toBe(404);
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it("cree la session et note le montant paye", async () => {
    const updates = wiring();
    const res = await POST(req({ token: "t", hasOption: true, locale: "fr" }) as never);
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe("https://checkout/booking");

    const params = sessionsCreate.mock.calls[0][0] as unknown as {
      line_items: Array<{ price_data: { unit_amount: number } }>;
      payment_intent_data: Record<string, unknown>;
    };
    // 310 de location + 5 d option, sur deux lignes.
    expect(params.line_items.map((l) => l.price_data.unit_amount)).toEqual([31_000, 500]);
    // Charges separees : les fonds restent sur le compte plateforme.
    expect(params.payment_intent_data.transfer_data).toBeUndefined();

    const patch = updates.find((u) => u.booking_session_id === "cs_live_b1");
    expect(patch).toBeDefined();
    expect(patch?.booking_amount_eur).toBe(315);
    expect(patch?.cancellation_option).toBe(true);
  });

  it("sans option : une seule ligne et pas d option en base", async () => {
    const updates = wiring();
    await POST(req({ token: "t", hasOption: false }) as never);
    const params = sessionsCreate.mock.calls[0][0] as unknown as { line_items: unknown[] };
    expect(params.line_items).toHaveLength(1);
    expect(updates.find((u) => u.booking_amount_eur === 310)?.cancellation_option).toBe(false);
  });

  it("encaisse meme si le loueur n a pas encore de compte de versement", async () => {
    // C est le levier d inscription : son argent l attend. Refuser le paiement
    // ferait perdre la reservation ET la raison de s inscrire.
    wiring({ partner: { ...PARTNER, stripe_connect_account_id: null, kyc_status: "none" } });

    const res = await POST(req({ token: "t" }) as never);

    expect(res.status).toBe(200);
    expect(sessionsCreate).toHaveBeenCalledOnce();
  });

  it("404 sur un jeton inconnu", async () => {
    wiring({ row: null });
    expect((await POST(req({ token: "x" }) as never)).status).toBe(404);
  });

  it("409 tant que le client n a pas accepte une offre", async () => {
    wiring({ row: { ...ROW, status: "sent" } });
    const res = await POST(req({ token: "t" }) as never);
    expect(res.status).toBe(409);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("409 sur une reservation deja payee, pas de second prelevement", async () => {
    wiring({ row: { ...ROW, booking_status: "paid" } });
    expect((await POST(req({ token: "t" }) as never)).status).toBe(409);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("ne cree pas deux sessions quand le verrou est perdu", async () => {
    wiring({ lockRows: [] });
    const res = await POST(req({ token: "t" }) as never);
    expect(res.status).toBe(409);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("habille la panne Stripe, jamais de 500 brut ni de detail", async () => {
    const updates = wiring();
    sessionsCreate.mockRejectedValueOnce(
      Object.assign(new Error("No such destination: acct_x"), {
        type: "invalid_request_error", statusCode: 400, requestId: "req_book_1",
      }) as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req({ token: "t" }) as never);

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.code).toBe("payment_provider");
    expect(JSON.stringify(json)).not.toMatch(/stripe|acct_|No such destination/i);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("req_book_1");
    // Verrou relache : le client doit pouvoir reessayer.
    expect(updates.some((u) => u.booking_status === null)).toBe(true);
    errSpy.mockRestore();
  });
});
