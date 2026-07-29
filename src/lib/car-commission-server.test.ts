import { describe, it, expect, vi, beforeEach } from "vitest";

const sessionsCreate = vi.fn(async () => ({ id: "cs_live_1", url: "https://checkout/commission" }));
vi.mock("./stays/stripe-helpers", () => ({
  stripeClient: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
}));
const sendPartnerCommissionRequest = vi.fn(async () => {});
vi.mock("./email", () => ({
  sendPartnerCommissionRequest: (...a: unknown[]) => sendPartnerCommissionRequest(...a),
}));
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));

import { requestCommission } from "./car-commission-server";

const REQUEST = {
  id: 42, outcome: "rented", commission_eur: 31.5, commission_paid_at: null,
  commission_session_id: null, quoted_by_partner_id: 111,
  final_amount_eur: 210, date_from: "2026-08-01", date_to: "2026-08-08",
};
const PARTNER = { id: 111, name: "Zorbas Rent a Car", email: "info@zorbas.gr" };

/** Verrou pris : l'update conditionnel renvoie la ligne. */
function wiring(opts: { lockRows?: unknown[]; request?: unknown } = {}) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation((table: string) => {
    if (table === "car_requests") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.request ?? REQUEST }) }) }),
        update: (patch: Record<string, unknown>) => {
          updates.push(patch);
          return {
            eq: () => ({
              is: () => ({ select: async () => ({ data: opts.lockRows ?? [{ id: 42 }], error: null }) }),
              select: async () => ({ data: [{ id: 42 }], error: null }),
            }),
          };
        },
      };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: PARTNER }) }) }) };
  });
  return updates;
}

describe("requestCommission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Interrupteur allume pour les cas nominaux ; son extinction a son propre test.
    process.env.CAR_COMMISSION_ENABLED = "on";
  });

  it("eteint par defaut : ni session Stripe, ni email, ni ecriture", async () => {
    // Tant que le systeme n'est pas juge pret, aucune facture ne doit partir chez
    // un loueur reel, meme si le code est deja deploye en production.
    delete process.env.CAR_COMMISSION_ENABLED;
    const updates = wiring();
    const res = await requestCommission(42);
    expect(res.status).toBe("disabled");
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it("toute valeur autre que \"on\" laisse le systeme eteint", async () => {
    for (const value of ["", "off", "true", "1", "ON "]) {
      process.env.CAR_COMMISSION_ENABLED = value;
      vi.clearAllMocks();
      wiring();
      expect((await requestCommission(42)).status).toBe("disabled");
      expect(sessionsCreate).not.toHaveBeenCalled();
    }
  });

  it("cree la session, note l id et ecrit au loueur", async () => {
    const updates = wiring();
    const res = await requestCommission(42);
    expect(res.status).toBe("requested");
    expect(sessionsCreate).toHaveBeenCalledOnce();
    expect(sendPartnerCommissionRequest).toHaveBeenCalledOnce();
    expect(sendPartnerCommissionRequest.mock.calls[0][0]).toBe("info@zorbas.gr");
    // Le montant facture est bien celui de la commission, pas celui de la location.
    const params = sessionsCreate.mock.calls[0][0] as unknown as {
      line_items: Array<{ price_data: { unit_amount: number } }>;
    };
    expect(params.line_items[0].price_data.unit_amount).toBe(3150);
    expect(updates.some((u) => u.commission_session_id === "cs_live_1")).toBe(true);
  });

  it("ne facture pas deux fois : verrou perdu, aucun appel Stripe", async () => {
    wiring({ lockRows: [] });
    const res = await requestCommission(42);
    expect(res.status).toBe("already_requested");
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
  });

  it("ne facture pas une location perdue", async () => {
    wiring({ request: { ...REQUEST, outcome: "lost" } });
    const res = await requestCommission(42);
    expect(res.status).toBe("skipped");
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("ne facture pas une commission sous le minimum Stripe", async () => {
    wiring({ request: { ...REQUEST, commission_eur: 0.4 } });
    expect((await requestCommission(42)).status).toBe("skipped");
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("relache le verrou quand Stripe refuse, pour permettre un nouvel essai", async () => {
    const updates = wiring();
    sessionsCreate.mockRejectedValueOnce(
      Object.assign(new Error("card_declined"), { requestId: "req_car_1" }) as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await requestCommission(42);

    expect(res.status).toBe("failed");
    expect(res.code).toBe("payment_provider");
    expect(sendPartnerCommissionRequest).not.toHaveBeenCalled();
    // commission_requested_at remis a null : sans cela la location resterait
    // facturable a vie sans que personne ne puisse relancer.
    expect(updates.some((u) => u.commission_requested_at === null)).toBe(true);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("req_car_1");
    errSpy.mockRestore();
  });
});
