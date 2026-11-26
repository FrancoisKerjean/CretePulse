import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, cancelByClient } = vi.hoisted(() => ({ from: vi.fn(), cancelByClient: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/car-quote", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  hashToken: (t: string) => `hash(${t})`,
}));
// Le calcul et les écritures sont testés dans car-deposit-server.test.ts (fausse
// base, Stripe simulé) : ici, seulement l'authentification par jeton et les codes.
vi.mock("@/lib/car-deposit-server", () => ({ cancelByClient }));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/car-rental/booking/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Lecture de la demande par jeton : rend `row` et note la colonne et la valeur cherchées. */
function wiring(row: unknown = { id: 25 }, error: { message: string } | null = null) {
  const lookups: Array<[string, unknown]> = [];
  from.mockImplementation(() => ({
    select: () => ({
      eq: (col: string, val: unknown) => {
        lookups.push([col, val]);
        return { maybeSingle: async () => ({ data: row, error }) };
      },
    }),
  }));
  return lookups;
}

describe("POST /api/car-rental/booking/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    cancelByClient.mockResolvedValue({ refundedEur: 41.2, status: "refunded" });
  });

  it("jeton de réservation : cherche par booking_token_hash et annule", async () => {
    const lookups = wiring();
    const res = await POST(req({ token: "book-tok" }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, refundedEur: 41.2, status: "refunded" });
    expect(lookups).toEqual([["booking_token_hash", "hash(book-tok)"]]);
    // Sans montant attendu : comportement d'avant R49.
    expect(cancelByClient).toHaveBeenCalledWith(25, expect.any(Number), undefined);
  });

  it("transmet le montant affiché avant le clic (R49)", async () => {
    wiring();
    await POST(req({ offerToken: "client-tok", expectedRefundEur: 41.2 }) as never);
    expect(cancelByClient).toHaveBeenCalledWith(25, expect.any(Number), 41.2);
    await POST(req({ token: "book-tok", expectedRefundEur: 0 }) as never);
    expect(cancelByClient).toHaveBeenLastCalledWith(25, expect.any(Number), 0);
  });

  it("409 changed avec le nouveau montant quand le résultat serait pire que l'affiché", async () => {
    wiring();
    cancelByClient.mockResolvedValue({ error: "changed", refundEur: 0 });
    const res = await POST(req({ offerToken: "client-tok", expectedRefundEur: 41.2 }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, changed: true, refundEur: 0 });
  });

  it("jeton d'offres (lien des e-mails) : cherche par accept_token_hash et annule", async () => {
    const lookups = wiring();
    cancelByClient.mockResolvedValue({ refundedEur: 0, status: "cancelled_kept" });
    const res = await POST(req({ offerToken: "client-tok" }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, refundedEur: 0, status: "cancelled_kept" });
    expect(lookups).toEqual([["accept_token_hash", "hash(client-tok)"]]);
  });

  it("n'est plus gardée par CAR_BOOKING_ENABLED (R45)", async () => {
    vi.stubEnv("CAR_BOOKING_ENABLED", "");
    wiring();
    expect((await POST(req({ token: "book-tok" }) as never)).status).toBe(200);
  });

  it.each([
    ["les deux jetons", { token: "a", offerToken: "b" }],
    ["aucun jeton", {}],
    ["jetons vides", { token: "", offerToken: "" }],
    ["jeton qui n'est pas une chaîne", { token: 42 }],
    ["corps qui n'est pas un objet", [1, 2]],
    ["JSON illisible", "{pas du json"],
    ["montant attendu en texte", { token: "a", expectedRefundEur: "41.2" }],
    ["montant attendu négatif", { token: "a", expectedRefundEur: -1 }],
    ["montant attendu nul (null)", { token: "a", expectedRefundEur: null }],
  ])("400 : %s, sans lecture ni annulation", async (_label, body) => {
    wiring();
    const res = await POST(req(body) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
    expect(cancelByClient).not.toHaveBeenCalled();
  });

  it("404 sur un jeton inconnu", async () => {
    wiring(null);
    expect((await POST(req({ offerToken: "nope" }) as never)).status).toBe(404);
    expect(cancelByClient).not.toHaveBeenCalled();
  });

  it("409 notCancellable avec l'état courant de la réservation", async () => {
    wiring();
    cancelByClient.mockResolvedValue({ error: "not_cancellable", bookingStatus: "refunded" });
    const res = await POST(req({ token: "book-tok" }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, notCancellable: true, bookingStatus: "refunded" });
  });

  it("503 avec un message de nouvel essai quand Stripe refuse le remboursement", async () => {
    wiring();
    cancelByClient.mockResolvedValue({ error: "refund_failed" });
    const res = await POST(req({ token: "book-tok" }) as never);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/try again/i);
  });

  it("500 quand l'annulation lève (base refusée), sans détail interne", async () => {
    wiring();
    cancelByClient.mockRejectedValue(new Error("permission denied for table car_requests"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(req({ token: "book-tok" }) as never);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("permission denied");
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("500 quand la lecture par jeton est refusée, sans annuler", async () => {
    wiring(null, { message: "timeout" });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(req({ token: "book-tok" }) as never)).status).toBe(500);
    expect(cancelByClient).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
