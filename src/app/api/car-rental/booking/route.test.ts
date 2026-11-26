import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { athensWallToUtcMs } from "@/lib/car-deposit";

const sessionsCreate = vi.fn<(params: unknown) => Promise<{ id: string; url: string }>>(
  async () => ({ id: "cs_live_d1", url: "https://checkout/deposit" }),
);
const sessionsRetrieve = vi.fn<(id: string) => Promise<{ id: string; status: string; url: string | null }>>(
  async () => ({ id: "cs_live_d0", status: "open", url: "https://checkout/open" }),
);
const sessionsExpire = vi.fn<(id: string) => Promise<{ id: string; status: string }>>(
  async () => ({ id: "cs_live_d1", status: "expired" }),
);
vi.mock("@/lib/stays/stripe-helpers", () => ({
  stripeClient: () => ({ checkout: { sessions: { create: sessionsCreate, retrieve: sessionsRetrieve, expire: sessionsExpire } } }),
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

// Lundi 12/07/2027 à 09:00 heure d'Athènes, prise le 20/07 à 10:00.
const NOW = athensWallToUtcMs("2027-07-12", "09:00");

const ROW = {
  id: 25,
  status: "quoted",
  booking_status: null as string | null,
  booking_session_id: null as string | null,
  // Copie figée par startDeposit : 412 EUR à 10 %.
  deposit_eur: 41.2 as number | null,
  quoted_price: 412,
  partner_name: "Zorbas Rent a Car",
  quoted_car_model: "Fiat Panda · Manual",
  customer_email: "n@example.com",
  date_from: "2027-07-20",
  date_to: "2027-07-27",
  time_from: "10:00",
};

interface Wiring {
  updates: Array<{ patch: Record<string, unknown>; filters: Array<[string, string, unknown]> }>;
}

function wiring(opts: {
  row?: Partial<typeof ROW> | null;
  lockRows?: unknown[];
  sessionWriteError?: { message: string } | null;
} = {}): Wiring {
  const w: Wiring = { updates: [] };
  from.mockImplementation((table: string) => {
    if (table !== "car_requests") throw new Error(`table inattendue : ${table}`);
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: opts.row === null ? null : { ...ROW, ...opts.row }, error: null }),
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        const entry = { patch, filters: [] as Array<[string, string, unknown]> };
        w.updates.push(entry);
        const chain = {
          eq: (col: string, val: unknown) => { entry.filters.push(["eq", col, val]); return chain; },
          is: (col: string, val: unknown) => { entry.filters.push(["is", col, val]); return chain; },
          select: async () => {
            if (patch.booking_status === "pending_payment") return { data: opts.lockRows ?? [{ id: 25 }], error: null };
            if ("booking_session_id" in patch) return { data: [{ id: 25 }], error: opts.sessionWriteError ?? null };
            return { data: [{ id: 25 }], error: null };
          },
        };
        return chain;
      },
    };
  });
  return w;
}

describe("POST /api/car-rental/booking (acompte)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    delete process.env.CAR_CATALOGUE_ENABLED;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("crée la session sur deposit_eur lu sur la demande : 4120 centimes, même si la grille a changé", async () => {
    // Le loueur a monté sa grille depuis le choix : quoted_price ne compte plus,
    // et la route ne lit ni la grille ni le taux du loueur (toute autre table lève).
    const w = wiring({ row: { quoted_price: 999 } });
    const res = await POST(req({ token: "t", locale: "fr" }) as never);

    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe("https://checkout/deposit");
    const params = sessionsCreate.mock.calls[0][0] as {
      line_items: Array<{ price_data: { unit_amount: number } }>;
      metadata: Record<string, string>;
      expires_at: number;
      success_url: string;
    };
    expect(params.line_items.map((l) => l.price_data.unit_amount)).toEqual([4120]);
    expect(params.metadata.payment_type).toBe("car_deposit");
    expect(params.metadata.car_request_id).toBe("25");
    expect(params.expires_at).toBe(Math.floor(NOW / 1000) + 1860);
    expect(params.success_url).toBe("https://crete.direct/fr/car-booking/t?paid=1");

    const sessionPatch = w.updates.find((u) => u.patch.booking_session_id === "cs_live_d1");
    expect(sessionPatch).toBeDefined();
  });

  it("verrou optimiste : null vers pending_payment, conditionné à quoted et booking_status vide", async () => {
    const w = wiring();
    await POST(req({ token: "t" }) as never);
    const lock = w.updates.find((u) => u.patch.booking_status === "pending_payment");
    expect(lock?.filters).toContainEqual(["is", "booking_status", null]);
    expect(lock?.filters).toContainEqual(["eq", "status", "quoted"]);
  });

  it("n'est pas gardée par l'interrupteur : une demande n'a de deposit_eur que s'il était allumé", async () => {
    wiring();
    expect((await POST(req({ token: "t" }) as never)).status).toBe(200);
  });

  it("un second appel pendant pending_payment rend 409 inProgress sans nouvelle session", async () => {
    const w = wiring({ row: { booking_status: "pending_payment", booking_session_id: "cs_live_d0" } });
    const res = await POST(req({ token: "t" }) as never);

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ inProgress: true, checkoutUrl: "https://checkout/open" });
    expect(sessionsRetrieve).toHaveBeenCalledWith("cs_live_d0");
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(w.updates).toHaveLength(0);
  });

  it("pending_payment : pas de checkoutUrl quand la session n'est plus ouverte", async () => {
    sessionsRetrieve.mockResolvedValueOnce({ id: "cs_live_d0", status: "expired", url: null } as never);
    wiring({ row: { booking_status: "pending_payment", booking_session_id: "cs_live_d0" } });
    const res = await POST(req({ token: "t" }) as never);
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.inProgress).toBe(true);
    expect(json).not.toHaveProperty("checkoutUrl");
  });

  it("pending_payment : pas de checkoutUrl quand la session est déjà payée", async () => {
    sessionsRetrieve.mockResolvedValueOnce({ id: "cs_live_d0", status: "complete", url: null } as never);
    wiring({ row: { booking_status: "pending_payment", booking_session_id: "cs_live_d0" } });
    expect(await (await POST(req({ token: "t" }) as never)).json()).not.toHaveProperty("checkoutUrl");
  });

  it("pending_payment sans session encore écrite : 409 inProgress sans appel Stripe", async () => {
    wiring({ row: { booking_status: "pending_payment", booking_session_id: null } });
    const res = await POST(req({ token: "t" }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, inProgress: true });
    expect(sessionsRetrieve).not.toHaveBeenCalled();
  });

  it("pending_payment : une session illisible chez Stripe ne casse pas la réponse", async () => {
    sessionsRetrieve.mockRejectedValueOnce(new Error("boom") as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    wiring({ row: { booking_status: "pending_payment", booking_session_id: "cs_live_d0" } });
    const res = await POST(req({ token: "t" }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, inProgress: true });
    errSpy.mockRestore();
  });

  it("409 notReady sans deposit_eur sur la demande", async () => {
    const w = wiring({ row: { deposit_eur: null } });
    const res = await POST(req({ token: "t" }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, notReady: true });
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(w.updates).toHaveLength(0);
  });

  it("409 notReady quand la demande n'est plus « quoted »", async () => {
    wiring({ row: { status: "cancelled" } });
    const res = await POST(req({ token: "t" }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, notReady: true });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it.each(["awaiting_partner", "confirmed", "refunded", "cancelled_kept"])(
    "409 alreadySettled quand booking_status vaut %s",
    async (status) => {
      const w = wiring({ row: { booking_status: status } });
      const res = await POST(req({ token: "t" }) as never);
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ ok: false, alreadySettled: true });
      expect(sessionsCreate).not.toHaveBeenCalled();
      expect(w.updates).toHaveLength(0);
    },
  );

  it("409 tooClose en comptant la durée de vie de la session (page rouverte des heures après le choix)", async () => {
    // 09:00 : prise à 15:10 tiendrait la marge à l'instant, plus au bout des 31 min.
    const w = wiring({ row: { date_from: "2027-07-12", time_from: "15:10" } });
    const res = await POST(req({ token: "t" }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, tooClose: true });
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(w.updates).toHaveLength(0);
  });

  it("verrou perdu : 409 inProgress, aucune session", async () => {
    wiring({ lockRows: [] });
    const res = await POST(req({ token: "t" }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, inProgress: true });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("panne Stripe : erreur habillée, jamais de 500 brut ni de détail, verrou relâché", async () => {
    const w = wiring();
    sessionsCreate.mockRejectedValueOnce(
      Object.assign(new Error("Invalid request: acct_x"), {
        type: "invalid_request_error", statusCode: 400, requestId: "req_dep_1",
      }) as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req({ token: "t" }) as never);

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.code).toBe("payment_provider");
    expect(JSON.stringify(json)).not.toMatch(/stripe|acct_|Invalid request/i);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("req_dep_1");
    const release = w.updates.find((u) => u.patch.booking_status === null);
    expect(release).toBeDefined();
    // On ne relâche que NOTRE verrou, jamais un état posé depuis par le webhook.
    expect(release?.filters).toContainEqual(["eq", "booking_status", "pending_payment"]);
    errSpy.mockRestore();
  });

  it("identifiant de session non écrit : la session est fermée, le verrou relâché, pas d'URL", async () => {
    // Sans booking_session_id en base, un paiement sur cette session serait pris
    // pour une session étrangère et remboursé : on ne la donne pas au client.
    const w = wiring({ sessionWriteError: { message: "permission denied" } });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req({ token: "t" }) as never);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe("payment_provider");
    expect(json).not.toHaveProperty("url");
    expect(sessionsExpire).toHaveBeenCalledWith("cs_live_d1");
    expect(w.updates.some((u) => u.patch.booking_status === null)).toBe(true);
    errSpy.mockRestore();
  });

  it("404 sur un jeton inconnu", async () => {
    wiring({ row: null });
    expect((await POST(req({ token: "x" }) as never)).status).toBe(404);
  });

  it("une locale inconnue retombe sur l'anglais dans les URLs de retour", async () => {
    wiring();
    await POST(req({ token: "t", locale: "../evil" }) as never);
    const params = sessionsCreate.mock.calls[0][0] as { success_url: string };
    expect(params.success_url).toBe("https://crete.direct/en/car-booking/t?paid=1");
  });
});
