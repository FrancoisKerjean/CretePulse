import { describe, it, expect, vi, beforeEach } from "vitest";

const getRequestByBalanceHash = vi.fn();
const getListingById = vi.fn();
vi.mock("@/lib/stays/db", () => ({
  getRequestByBalanceHash: (...a: unknown[]) => getRequestByBalanceHash(...a),
  getListingById: (...a: unknown[]) => getListingById(...a),
}));
const sessionsCreate = vi.fn(async () => ({ id: "cs_b", url: "https://checkout/balance" }));
vi.mock("@/lib/stays/stripe-helpers", async (orig: () => Promise<Record<string, unknown>>) => {
  const mod = await orig();
  return {
    ...mod,
    stripeClient: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
  };
});
const { from } = vi.hoisted(() => ({
  from: vi.fn(() => ({ update: () => ({ eq: async () => ({ error: null }) }) })),
}));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/stays/tokens", () => ({
  hashToken: (t: string) => `hash(${t})`,
  siteBase: () => "https://crete.direct",
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/pay-balance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ownerReady = () => ({
  select: () => ({
    eq: () => ({
      maybeSingle: async () => ({
        data: { stripe_connect_account_id: "acct_1", kyc_status: "complete" },
      }),
    }),
  }),
});

describe("POST /api/stays/pay-balance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 sur un jeton inconnu", async () => {
    getRequestByBalanceHash.mockResolvedValueOnce(null);
    expect((await POST(req({ token: "x" }) as never)).status).toBe(404);
  });

  it("409 tant que l acompte n est pas paye", async () => {
    getRequestByBalanceHash.mockResolvedValueOnce({ id: 5, status: "approved" });
    expect((await POST(req({ token: "t" }) as never)).status).toBe(409);
  });

  it("409 sur une demande deja confirmee, pas de second prelevement", async () => {
    getRequestByBalanceHash.mockResolvedValueOnce({ id: 5, status: "confirmed" });
    expect((await POST(req({ token: "t" }) as never)).status).toBe(409);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("cree la session de solde et laisse la commission totale intacte", async () => {
    getRequestByBalanceHash.mockResolvedValueOnce({
      id: 5, listing_id: 9, status: "deposit_paid", quoted_price_eur: 100,
      guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08",
    });
    getListingById.mockResolvedValueOnce({
      id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5,
    });
    from.mockImplementationOnce(ownerReady);

    const res = await POST(req({ token: "bal", locale: "fr" }) as never);

    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe("https://checkout/balance");

    // 100 EUR x 7 nuits = 700 net, commission 35 EUR = 3500 centimes.
    // L'acompte a preleve 30 % de 35 EUR = 1050 centimes, le solde porte 2450.
    const params = sessionsCreate.mock.calls[0][0] as unknown as {
      payment_intent_data: { application_fee_amount: number };
      line_items: Array<{ price_data: { unit_amount: number } }>;
    };
    expect(params.payment_intent_data.application_fee_amount).toBe(2450);
    expect(params.payment_intent_data.application_fee_amount + 1050).toBe(3500);
    // Solde = 70 % du total voyageur 735 EUR.
    expect(params.line_items[0].price_data.unit_amount).toBe(51450);
  });

  it("409 quand le compte de versement du proprietaire n est pas pret", async () => {
    getRequestByBalanceHash.mockResolvedValueOnce({
      id: 5, listing_id: 9, status: "deposit_paid", quoted_price_eur: 100,
      guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08",
    });
    getListingById.mockResolvedValueOnce({
      id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5,
    });
    from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { stripe_connect_account_id: "acct_1", kyc_status: "pending" },
          }),
        }),
      }),
    }));
    expect((await POST(req({ token: "bal", locale: "fr" }) as never)).status).toBe(409);
  });

  it("502 lisible quand Stripe refuse la session de solde", async () => {
    getRequestByBalanceHash.mockResolvedValueOnce({
      id: 5, listing_id: 9, status: "deposit_paid", quoted_price_eur: 100,
      guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08",
    });
    getListingById.mockResolvedValueOnce({
      id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5,
    });
    from.mockImplementationOnce(ownerReady);
    sessionsCreate.mockRejectedValueOnce(
      Object.assign(new Error("No such destination: acct_1TDPicEQ3UQbwGzY"), {
        type: "invalid_request_error", statusCode: 400, requestId: "req_balance_1",
      }) as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req({ token: "bal", locale: "fr" }) as never);

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("payment_provider");
    // Corps non vide et sans fuite : ni identifiant de compte, ni texte Stripe.
    expect(String(json.error).length).toBeGreaterThan(20);
    expect(JSON.stringify(json)).not.toMatch(/stripe|acct_|No such destination/i);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("req_balance_1");
    // Aucune ecriture de montant sur une session qui n'existe pas.
    expect(from).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });
});
