// L'écriture d'issue a trois écrivains (admin, lien loueur, cron). Une seule
// fonction les porte : ce fichier verrouille son contrat, et les tests de
// setOutcome (actions.test.ts) verrouillent que l'admin n'a pas bougé.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, requestCommission, expireCommissionSession, creditCommissionInvoice, notifyOps } = vi.hoisted(() => ({
  from: vi.fn(),
  requestCommission: vi.fn(),
  expireCommissionSession: vi.fn(async () => {}),
  creditCommissionInvoice: vi.fn(),
  notifyOps: vi.fn(async () => true),
}));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("./car-commission-server", () => ({ requestCommission }));
vi.mock("./car-invoice-credit", () => ({ creditCommissionInvoice, expireCommissionSession }));
vi.mock("./ops-notify", () => ({ notifyOps, echeance: () => "09/09" }));

import { applyOutcome } from "./car-outcome-server";

interface Wiring {
  updates: Array<{ table: string; patch: Record<string, unknown> }>;
  filters: Array<[string, string, unknown]>;
}

/**
 * Chaîne PostgREST modelée à la main : la forme fait partie du contrat.
 * Lecture : select().eq().maybeSingle(). Écriture : update().eq()[.is()|.eq()].select().
 */
function wiring(opts: { partnerCommission?: number | null; updatedRows?: unknown[]; updateError?: { message: string } } = {}): Wiring {
  const w: Wiring = { updates: [], filters: [] };
  from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      eq: (col: string, val: unknown) => { w.filters.push(["eq", col, val]); return chain; },
      is: (col: string, val: unknown) => { w.filters.push(["is", col, val]); return chain; },
      maybeSingle: async () => ({
        data: table === "car_requests"
          ? { quoted_by_partner_id: 111 }
          : opts.partnerCommission === undefined ? { commission: 0.1 } : opts.partnerCommission === null ? null : { commission: opts.partnerCommission },
        error: null,
      }),
      select: async () => ({ data: opts.updateError ? null : (opts.updatedRows ?? [{ id: 42 }]), error: opts.updateError ?? null }),
    });
    return {
      select: () => chain,
      update: (patch: Record<string, unknown>) => { w.updates.push({ table, patch }); return chain; },
    };
  });
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
  requestCommission.mockResolvedValue({ status: "requested", invoiceNumber: "NOVAI-CD-2026-009" });
});

describe("applyOutcome · louée", () => {
  it("écrit outcome, outcome_source, le montant et la commission au taux du loueur", async () => {
    const w = wiring();
    const res = await applyOutcome({ id: 42, outcome: "rented", source: "partner_link", finalAmountEur: 320 });
    expect(res).toMatchObject({ status: "rented", commission: { status: "requested" } });
    expect(w.updates[0].table).toBe("car_requests");
    expect(w.updates[0].patch).toMatchObject({ outcome: "rented", outcome_source: "partner_link", final_amount_eur: 320, commission_eur: 32 });
    expect(typeof w.updates[0].patch.outcome_at).toBe("string");
  });

  it("appelle requestCommission APRÈS l'update : shouldRequestCommission exige outcome === rented", async () => {
    wiring();
    await applyOutcome({ id: 42, outcome: "rented", source: "admin", finalAmountEur: 320 });
    expect(requestCommission).toHaveBeenCalledWith(42);
    expect(from.mock.invocationCallOrder.at(-1)!).toBeLessThan(requestCommission.mock.invocationCallOrder[0]);
  });

  it("rend le résultat réel de la facturation, l'issue restant posée", async () => {
    wiring();
    requestCommission.mockResolvedValueOnce({ status: "partner_identity_incomplete", missing: ["vat_id"] });
    const res = await applyOutcome({ id: 42, outcome: "rented", source: "admin", finalAmountEur: 320 });
    expect(res).toEqual({ status: "rented", commission: { status: "partner_identity_incomplete", missing: ["vat_id"] } });
  });

  it("laisse la commission nulle quand le loueur est introuvable", async () => {
    const w = wiring({ partnerCommission: null });
    await applyOutcome({ id: 42, outcome: "rented", source: "admin", finalAmountEur: 320 });
    expect(w.updates[0].patch.commission_eur).toBeNull();
  });
});

describe("applyOutcome · perdue", () => {
  it("remet commission_paid_at à null et tue la session Stripe, sans facturer", async () => {
    const w = wiring();
    const res = await applyOutcome({ id: 42, outcome: "lost", source: "admin" });
    expect(res).toEqual({ status: "lost" });
    expect(w.updates[0].patch).toMatchObject({ outcome: "lost", outcome_source: "admin", commission_paid_at: null, final_amount_eur: null, commission_eur: null });
    expect(expireCommissionSession).toHaveBeenCalledWith(42);
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("n'émet JAMAIS d'avoir ici : la pièce comptable est une décision de l'appelant", async () => {
    wiring();
    await applyOutcome({ id: 42, outcome: "lost", source: "partner_link" });
    expect(creditCommissionInvoice).not.toHaveBeenCalled();
  });
});

describe("applyOutcome · verrou optimiste", () => {
  it("expect outcome_null ajoute .is(outcome, null) et gagne la course quand une ligne est touchée", async () => {
    const w = wiring();
    const res = await applyOutcome({ id: 42, outcome: "rented", source: "partner_link", finalAmountEur: 320, expect: "outcome_null" });
    expect(res.status).toBe("rented");
    expect(w.filters).toContainEqual(["is", "outcome", null]);
  });

  it("expect source_auto ajoute .eq(outcome_source, auto)", async () => {
    const w = wiring();
    await applyOutcome({ id: 42, outcome: "lost", source: "partner_link", expect: "source_auto" });
    expect(w.filters).toContainEqual(["eq", "outcome_source", "auto"]);
  });

  it("zéro ligne touchée avec expect = course perdue : aucune facturation, aucune expiration", async () => {
    wiring({ updatedRows: [] });
    const res = await applyOutcome({ id: 42, outcome: "rented", source: "partner_link", finalAmountEur: 320, expect: "outcome_null" });
    expect(res).toEqual({ status: "lost_race" });
    expect(requestCommission).not.toHaveBeenCalled();
    expect(expireCommissionSession).not.toHaveBeenCalled();
  });

  it("zéro ligne touchée SANS expect n'est pas une course : le chemin admin continue", async () => {
    wiring({ updatedRows: [] });
    const res = await applyOutcome({ id: 42, outcome: "lost", source: "admin" });
    expect(res).toEqual({ status: "lost" });
    expect(expireCommissionSession).toHaveBeenCalledWith(42);
  });

  it("un refus de la base lève, rien ne suit", async () => {
    wiring({ updateError: { message: "permission denied" } });
    await expect(applyOutcome({ id: 42, outcome: "rented", source: "admin", finalAmountEur: 320 })).rejects.toThrow("permission denied");
    expect(requestCommission).not.toHaveBeenCalled();
  });
});
