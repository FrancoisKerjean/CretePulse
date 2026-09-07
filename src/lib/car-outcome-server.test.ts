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
          : opts.partnerCommission === null
            ? null
            : { name: "Zorbas Rent a Car", email: "info@zorbas.gr", whatsapp: "+306912345678", commission: opts.partnerCommission ?? 0.1 },
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

import { handleOutcomeClick, requestByOutcomeToken, type OutcomeRequestRow } from "./car-outcome-server";

const ROW: OutcomeRequestRow = {
  id: 33, status: "accepted", outcome: null, outcome_source: null, outcome_at: null,
  outcome_token: "tok-33", date_from: "2026-09-08", date_to: "2026-09-15",
  pickup_slug: "heraklion-airport", quoted_car_model: "Toyota Yaris", quoted_price: 320,
  customer_name: "Marie Dupont", quoted_by_partner_id: 111,
};
const INVOICE = {
  id: 7, number: "NOVAI-CD-2026-002", request_id: 33, partner_id: 111, base_amount_eur: 320, rate: 0.1,
  amount_eur: 32, issued_at: "2026-09-08T05:00:00.000Z", sent_at: "2026-09-08T05:00:01.000Z",
  paid_at: null as string | null, credited_at: null as string | null, credit_number: null, credit_reason: null,
};

describe("handleOutcomeClick", () => {
  beforeEach(() => {
    creditCommissionInvoice.mockResolvedValue({ creditNumber: "NOVAI-CD-2026-002-A", notified: true });
  });

  it("issue nulle · a eu lieu : applyOutcome partner_link au prix accepté, facture demandée", async () => {
    const w = wiring();
    const res = await handleOutcomeClick(ROW, null, "rented");
    expect(res).toBe("applied");
    expect(w.updates[0].patch).toMatchObject({ outcome: "rented", outcome_source: "partner_link", final_amount_eur: 320 });
    expect(w.filters).toContainEqual(["is", "outcome", null]);
    expect(requestCommission).toHaveBeenCalledWith(33);
    // Rien à signaler : la facture part d'elle-même.
    expect(notifyOps).not.toHaveBeenCalled();
  });

  it("issue nulle · a eu lieu mais facturation refusée : l'issue reste posée et les ops reçoivent le code réel", async () => {
    wiring();
    requestCommission.mockResolvedValueOnce({ status: "failed", code: "partner_without_email" });
    const res = await handleOutcomeClick(ROW, null, "rented");
    expect(res).toBe("applied");
    expect(notifyOps).toHaveBeenCalledTimes(1);
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toContain("partner_without_email");
    expect(n.title).toContain("#33");
    expect(n.silent).not.toBe(true);
  });

  it("issue nulle · pas eu lieu : applyOutcome lost, aucun avoir (il n'y a pas de facture)", async () => {
    const w = wiring();
    expect(await handleOutcomeClick(ROW, null, "lost")).toBe("applied");
    expect(w.updates[0].patch).toMatchObject({ outcome: "lost", outcome_source: "partner_link" });
    expect(creditCommissionInvoice).not.toHaveBeenCalled();
  });

  it("course perdue (update à zéro ligne) : lost_race, aucune facturation", async () => {
    wiring({ updatedRows: [] });
    expect(await handleOutcomeClick(ROW, null, "rented")).toBe("lost_race");
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("présumée · a eu lieu : seule la source change, sous verrou source_auto", async () => {
    const w = wiring();
    const res = await handleOutcomeClick({ ...ROW, outcome: "rented", outcome_source: "auto" }, INVOICE, "rented");
    expect(res).toBe("confirmed");
    expect(w.updates[0].patch).toMatchObject({ outcome_source: "partner_link" });
    expect(w.updates[0].patch).not.toHaveProperty("outcome");
    expect(w.filters).toContainEqual(["eq", "outcome_source", "auto"]);
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("présumée · pas eu lieu : avoir automatique de source partner_link, ops non silencieux", async () => {
    wiring();
    const res = await handleOutcomeClick({ ...ROW, outcome: "rented", outcome_source: "auto" }, INVOICE, "lost");
    expect(res).toBe("credited");
    expect(creditCommissionInvoice).toHaveBeenCalledWith(33, expect.stringContaining("Reported by the rental company via the outcome link on"), "partner_link");
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toContain("NOVAI-CD-2026-002-A");
    expect(n.silent).not.toBe(true);
  });

  it("présumée, facture payée · pas eu lieu : aucune écriture, ops pour remboursement manuel", async () => {
    const w = wiring();
    const res = await handleOutcomeClick({ ...ROW, outcome: "rented", outcome_source: "auto" }, { ...INVOICE, paid_at: "2026-09-10T00:00:00.000Z" }, "lost");
    expect(res).toBe("already_paid");
    expect(w.updates).toHaveLength(0);
    expect(creditCommissionInvoice).not.toHaveBeenCalled();
    expect(notifyOps.mock.calls[0][0].action).toMatch(/rembours/i);
  });

  it("présumée SANS facture · pas eu lieu : l'issue bascule en perdue sous verrou source_auto", async () => {
    const w = wiring();
    const res = await handleOutcomeClick({ ...ROW, outcome: "rented", outcome_source: "auto" }, null, "lost");
    expect(res).toBe("applied");
    expect(w.updates[0].patch).toMatchObject({ outcome: "lost", outcome_source: "partner_link", final_amount_eur: null });
    expect(w.filters).toContainEqual(["eq", "outcome_source", "auto"]);
    // Rien à annuler : la bascule du J1 n'avait pas réussi à facturer.
    expect(creditCommissionInvoice).not.toHaveBeenCalled();
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("avoir refusé : aucune issue réécrite, les ops reçoivent le refus et le loueur un accusé", async () => {
    const w = wiring();
    creditCommissionInvoice.mockResolvedValueOnce({ error: "already_credited" });
    const res = await handleOutcomeClick({ ...ROW, outcome: "rented", outcome_source: "auto" }, INVOICE, "lost");
    expect(res).toBe("recorded");
    expect(w.updates).toHaveLength(0);
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toContain("Avoir refusé");
    expect(n.title).toContain("already_credited");
  });

  it("issue admin contredite : aucune écriture, ops « contestation »", async () => {
    const w = wiring();
    const res = await handleOutcomeClick({ ...ROW, outcome: "lost", outcome_source: "admin" }, null, "rented");
    expect(res).toBe("contested");
    expect(w.updates).toHaveLength(0);
    expect(notifyOps.mock.calls[0][0].title).toMatch(/contest/i);
  });

  it("issue déjà confirmée, même choix (double clic) : aucune écriture, aucun bruit", async () => {
    const w = wiring();
    expect(await handleOutcomeClick({ ...ROW, outcome: "lost", outcome_source: "partner_link" }, null, "lost")).toBe("recorded");
    expect(w.updates).toHaveLength(0);
    expect(notifyOps).not.toHaveBeenCalled();
  });

  it("demande annulée : aucune écriture", async () => {
    const w = wiring();
    expect(await handleOutcomeClick({ ...ROW, status: "cancelled" }, null, "rented")).toBe("cancelled");
    expect(w.updates).toHaveLength(0);
  });

  it("Telegram en panne ne fait pas tomber le clic", async () => {
    wiring();
    notifyOps.mockRejectedValueOnce(new Error("telegram down"));
    expect(await handleOutcomeClick({ ...ROW, outcome: "lost", outcome_source: "admin" }, null, "rented")).toBe("contested");
  });
});

describe("requestByOutcomeToken", () => {
  it("cherche par égalité sur outcome_token et rend null sur inconnu", async () => {
    const w = wiring();
    from.mockImplementationOnce((table: string) => {
      const chain = { eq: (col: string, val: unknown) => { w.filters.push(["eq", col, val]); return chain; }, maybeSingle: async () => ({ data: null }) };
      return { select: () => chain };
    });
    expect(await requestByOutcomeToken("inconnu")).toBeNull();
    expect(w.filters).toContainEqual(["eq", "outcome_token", "inconnu"]);
  });
});
