import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

const db = vi.hoisted(() => ({
  partnerByPortalToken: vi.fn(),
  ratesForPartner: vi.fn(),
  replaceRates: vi.fn(),
}));
vi.mock("@/lib/car-catalogue-db", () => db);

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/car-rental/partner-portal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const FULL_IDENTITY = {
  legal_name: "Lux Trans IKE", legal_form: "IKE", address_line: "Knossou 12",
  postal_code: "71306", city: "Heraklion", country: "Greece", vat_id: "EL801122501",
  vat_verified_at: null,
};
const PARTNER = {
  id: 7, name: "Lux Trans", ...FULL_IDENTITY,
  terms_version: null, terms_accepted_at: null,
  rates_status: "none", rates_paused_until: null, catalogue_conditions: null,
};
const ROW = { category: "compact", period_from: "2027-06-01", period_to: "2027-06-30", min_days: 3, eur_per_day: 45 };

let patches: Array<Record<string, unknown>>;

function wiring(partner: unknown = PARTNER, rates: unknown[] = []) {
  patches = [];
  db.partnerByPortalToken.mockResolvedValue(partner);
  db.ratesForPartner.mockResolvedValue(rates);
  db.replaceRates.mockResolvedValue(undefined);
  from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: partner, error: null }) }) }),
    update: (patch: Record<string, unknown>) => {
      patches.push(patch);
      return { eq: () => ({ select: async () => ({ data: [{ id: 7 }], error: null }) }) };
    },
  }));
}

describe("POST /api/car-rental/partner-portal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("jeton inconnu : 404", async () => {
    wiring(null);
    const res = await POST(req({ token: "nope", action: "resume" }) as never);
    expect(res.status).toBe(404);
    expect(patches).toHaveLength(0);
  });

  it("corps invalide ou action inconnue : 400", async () => {
    wiring();
    expect((await POST(req({ nothing: 1 }) as never)).status).toBe(400);
    expect((await POST(req({ token: "t", action: "explode" }) as never)).status).toBe(400);
  });

  it("accept_terms sans identité complète : 422 avec missing, aucune écriture", async () => {
    wiring({ ...PARTNER, legal_name: null, vat_id: null });
    const res = await POST(req({ token: "t", action: "accept_terms", publish: false }) as never);
    expect(res.status).toBe(422);
    expect((await res.json()).missing.length).toBeGreaterThan(0);
    expect(patches).toHaveLength(0);
  });

  it("accept_terms avec identité, sans publish : écrit la version, ne touche pas rates_status", async () => {
    wiring();
    const res = await POST(req({ token: "t", action: "accept_terms", publish: false }) as never);
    expect(res.status).toBe(200);
    expect(patches).toHaveLength(1);
    expect(patches[0].terms_version).toBe("2027-01");
    expect(typeof patches[0].terms_accepted_at).toBe("string");
    expect(patches[0]).not.toHaveProperty("rates_status");
  });

  it("accept_terms avec publish mais sans ligne de grille : 422", async () => {
    wiring(PARTNER, []);
    const res = await POST(req({ token: "t", action: "accept_terms", publish: true }) as never);
    expect(res.status).toBe(422);
    expect(patches).toHaveLength(0);
  });

  it("accept_terms avec publish et une grille : passe live", async () => {
    wiring(PARTNER, [ROW]);
    const res = await POST(req({ token: "t", action: "accept_terms", publish: true }) as never);
    expect(res.status).toBe(200);
    expect(patches[0].rates_status).toBe("live");
    expect(typeof patches[0].rates_published_at).toBe("string");
  });

  it("save_rates invalide (chevauchement) : 400 avec errors, rien d'écrit", async () => {
    wiring();
    const rows = [ROW, { ...ROW, period_from: "2027-06-15", period_to: "2027-07-15" }];
    const res = await POST(req({ token: "t", action: "save_rates", rows, conditions: {} }) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).errors.length).toBeGreaterThan(0);
    expect(db.replaceRates).not.toHaveBeenCalled();
    expect(patches).toHaveLength(0);
  });

  it("save_rates avec conditions invalides : 400, rien d'écrit", async () => {
    wiring();
    const res = await POST(req({ token: "t", action: "save_rates", rows: [ROW], conditions: { inclusions: ["wifi"] } }) as never);
    expect(res.status).toBe(400);
    expect(db.replaceRates).not.toHaveBeenCalled();
    expect(patches).toHaveLength(0);
  });

  it("save_rates valide : remplace la grille et passe none à draft", async () => {
    wiring();
    const res = await POST(req({ token: "t", action: "save_rates", rows: [ROW], conditions: { deposit_hold_eur: 300 } }) as never);
    expect(res.status).toBe(200);
    expect(db.replaceRates).toHaveBeenCalledWith(7, [expect.objectContaining({ category: "compact", eur_per_day: 45 })]);
    expect(patches[0].rates_status).toBe("draft");
    expect(patches[0].catalogue_conditions).toEqual({ deposit_hold_eur: 300 });
  });

  it("save_rates sur une grille déjà live : ne rétrograde pas le statut", async () => {
    wiring({ ...PARTNER, rates_status: "live" });
    await POST(req({ token: "t", action: "save_rates", rows: [ROW], conditions: {} }) as never);
    expect(patches[0]).not.toHaveProperty("rates_status");
  });

  it("save_identity : le loueur ne crée jamais d'attestation VIES", async () => {
    wiring();
    const res = await POST(req({ token: "t", action: "save_identity", values: { ...FULL_IDENTITY, vat_id: "EL999" } }) as never);
    expect(res.status).toBe(200);
    expect(patches[0].vat_verified_at).toBeNull();
  });

  it("save_identity : numéro de TVA changé, l'attestation existante tombe ; inchangé, elle reste", async () => {
    wiring({ ...PARTNER, vat_verified_at: "2026-11-01" });
    await POST(req({ token: "t", action: "save_identity", values: { ...FULL_IDENTITY, vat_id: "EL999999999" } }) as never);
    expect(patches[0].vat_verified_at).toBeNull();
    wiring({ ...PARTNER, vat_verified_at: "2026-11-01" });
    await POST(req({ token: "t", action: "save_identity", values: { ...FULL_IDENTITY, city: "Chania" } }) as never);
    expect(patches[0].vat_verified_at).toBe("2026-11-01");
  });

  it("pause : date passée refusée, date valide écrit paused", async () => {
    wiring();
    expect((await POST(req({ token: "t", action: "pause", until: "2020-01-01" }) as never)).status).toBe(400);
    expect((await POST(req({ token: "t", action: "pause", until: "pas-une-date" }) as never)).status).toBe(400);
    expect(patches).toHaveLength(0);
    const ok = await POST(req({ token: "t", action: "pause", until: "2099-01-01" }) as never);
    expect(ok.status).toBe(200);
    expect(patches[0]).toMatchObject({ rates_status: "paused", rates_paused_until: "2099-01-01" });
  });

  it("resume : live si conditions acceptées et grille, sinon draft", async () => {
    wiring({ ...PARTNER, terms_version: "2027-01", terms_accepted_at: "2026-12-01T00:00:00Z", rates_status: "paused" }, [ROW]);
    await POST(req({ token: "t", action: "resume" }) as never);
    expect(patches[0]).toMatchObject({ rates_status: "live", rates_paused_until: null });
    wiring({ ...PARTNER, rates_status: "paused" }, [ROW]);
    await POST(req({ token: "t", action: "resume" }) as never);
    expect(patches[0]).toMatchObject({ rates_status: "draft", rates_paused_until: null });
  });
});
