import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

const m = vi.hoisted(() => ({
  ensurePortalToken: vi.fn(),
  sendAgencyQuoteRequest: vi.fn(),
  partnersForZoneWithTerms: vi.fn(),
  liveCataloguesForPartners: vi.fn(),
  sendCustomerNewOffer: vi.fn(),
  sendCustomerRequestReceived: vi.fn(),
  notifyOps: vi.fn(),
  inserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
  requestUpdates: [] as Array<Record<string, unknown>>,
  updateError: null as { message: string } | null,
}));
vi.mock("@/lib/car-catalogue-db", () => ({
  ensurePortalToken: m.ensurePortalToken,
  partnersForZoneWithTerms: m.partnersForZoneWithTerms,
  liveCataloguesForPartners: m.liveCataloguesForPartners,
}));
vi.mock("@/lib/ops-notify", () => ({ notifyOps: m.notifyOps, echeance: () => "" }));
vi.mock("@/lib/car-quote", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  siteBase: () => "https://crete.direct",
}));
vi.mock("@/lib/car-lead", () => ({
  validateCarLead: () => ({
    kind: "ok",
    zone: { id: "heraklion-center" },
    carType: { id: "compact" },
    row: {
      customer_email: "c@example.com", customer_name: "C", pickup_slug: "heraklion", date_from: "2027-06-01",
      date_to: "2027-06-08", time_from: null, time_to: null, locale: "en", child_seats: [],
    },
  }),
  carPickupLabel: () => "Heraklion",
  carTypeLabelWithExamples: () => "Compact",
}));
vi.mock("@/lib/email", () => ({
  sendAgencyQuoteRequest: m.sendAgencyQuoteRequest,
  sendCarLeadEmail: vi.fn(),
  sendLeadKamiSummary: vi.fn(),
  sendCustomerRequestReceived: m.sendCustomerRequestReceived,
  sendCustomerNewOffer: m.sendCustomerNewOffer,
}));

import { POST } from "./route";

const PARTNER = (extra: Record<string, unknown> = {}) => ({
  id: 7, name: "Lux Trans", email: "l@example.com", phone: "1", whatsapp: null, lead_routing: "direct", min_days: null,
  terms_version: "2027-01", terms_accepted_at: "2026-12-01T00:00:00Z",
  default_insurance_type: "cdw_excess", default_excess_eur: 500, default_zero_excess_upsell_eur_day: 8,
  ...extra,
});
// 7 jours de juin 2027, catégorie compact : 7 x 40 EUR
const GRID = new Map([[7, {
  rates: [{ category: "compact", period_from: "2027-06-01", period_to: "2027-06-30", min_days: 3, eur_per_day: 40 }],
  conditions: { models: { compact: { model: "Fiat Panda", gearbox: "manual" } }, inclusions: ["cdw"], cancellation_terms: "Free until 48h" },
}]]);

function wiring() {
  from.mockImplementation((table: string) => {
    if (table === "car_requests") {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ gte: () => ({ limit: async () => ({ data: [] }) }) }) }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: 9 }, error: null }) }) }),
        update: (u: Record<string, unknown>) => { m.requestUpdates.push(u); return { eq: async () => ({ error: m.updateError }) }; },
      };
    }
    return {
      insert: (row: Record<string, unknown>) => {
        m.inserts.push({ table, row });
        const res = { error: null, data: { id: 55 } };
        return Object.assign(Promise.resolve(res), { select: () => ({ single: async () => res }) });
      },
    };
  });
  m.inserts.length = 0;
  m.requestUpdates.length = 0;
  m.updateError = null;
  delete process.env.CAR_CATALOGUE_ENABLED;
  m.liveCataloguesForPartners.mockResolvedValue(new Map());
  m.partnersForZoneWithTerms.mockResolvedValue([PARTNER()]);
  m.sendAgencyQuoteRequest.mockResolvedValue({});
}

const req = () =>
  new Request("http://localhost/api/car-rental/submit", { method: "POST", body: JSON.stringify({}) });

describe("POST /api/car-rental/submit : lien du portail", () => {
  beforeEach(() => { vi.clearAllMocks(); wiring(); });

  it("interrupteur coupé : pas de lien du portail, ensurePortalToken n'est pas appelé", async () => {
    m.ensurePortalToken.mockResolvedValue("tok-7");
    await POST(req() as never);
    expect(m.sendAgencyQuoteRequest).toHaveBeenCalledTimes(1);
    expect(m.sendAgencyQuoteRequest.mock.calls[0][3]).toBeUndefined();
    expect(m.ensurePortalToken).not.toHaveBeenCalled();
  });

  it("interrupteur allumé : passe le lien du portail à sendAgencyQuoteRequest", async () => {
    process.env.CAR_CATALOGUE_ENABLED = "on";
    m.ensurePortalToken.mockResolvedValue("tok-7");
    await POST(req() as never);
    expect(m.sendAgencyQuoteRequest).toHaveBeenCalledTimes(1);
    expect(m.sendAgencyQuoteRequest.mock.calls[0][3]).toBe("https://crete.direct/en/car-rates/tok-7");
  });

  it("si ensurePortalToken échoue, la demande part quand même sans le lien", async () => {
    process.env.CAR_CATALOGUE_ENABLED = "on";
    m.ensurePortalToken.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await POST(req() as never);
    expect(m.sendAgencyQuoteRequest).toHaveBeenCalledTimes(1);
    expect(m.sendAgencyQuoteRequest.mock.calls[0][3]).toBeUndefined();
    spy.mockRestore();
  });
});

describe("POST /api/car-rental/submit : offres de grille", () => {
  beforeEach(() => { vi.clearAllMocks(); wiring(); m.ensurePortalToken.mockResolvedValue("tok-7"); });
  const call = async () => (await POST(req() as never)).json();

  it("interrupteur éteint : aucune ligne de grille, pas d'offerUrl", async () => {
    const json = await call();
    expect(json).toEqual({ ok: true });
    expect(m.inserts.some((i) => i.table === "car_quote_options")).toBe(false);
    expect(m.liveCataloguesForPartners).not.toHaveBeenCalled();
    expect(m.sendAgencyQuoteRequest).toHaveBeenCalledTimes(1);
    expect(m.sendCustomerNewOffer).not.toHaveBeenCalled();
  });

  it("allumé + grille couvrante : offre instantanée, aucun devis demandé au loueur", async () => {
    process.env.CAR_CATALOGUE_ENABLED = "on";
    m.liveCataloguesForPartners.mockResolvedValue(GRID);
    const json = await call();
    expect(json.ok).toBe(true);
    expect(json.offerUrl).toMatch(/^https:\/\/crete\.direct\/en\/car-offer\/.+/);
    const invite = m.inserts.find((i) => i.table === "car_quote_invites")!.row;
    expect(invite.status).toBe("quoted");
    expect(invite.quote_price).toBe(280);
    const opt = m.inserts.find((i) => i.table === "car_quote_options")!.row;
    expect(opt).toMatchObject({ source: "catalogue", price: 280, car_model: "Fiat Panda", gearbox: "manual", note: "Free until 48h", currency: "EUR" });
    expect(m.requestUpdates).toContainEqual({ status: "quoted" });
    expect(m.sendAgencyQuoteRequest).not.toHaveBeenCalled();
    expect(m.sendCustomerNewOffer).toHaveBeenCalledTimes(1);
    expect(m.sendCustomerRequestReceived).not.toHaveBeenCalled();
  });

  it("allumé + loueur sans conditions 2027 : branche aucun loueur joignable", async () => {
    process.env.CAR_CATALOGUE_ENABLED = "on";
    m.partnersForZoneWithTerms.mockResolvedValue([PARTNER({ terms_version: null, terms_accepted_at: null })]);
    m.liveCataloguesForPartners.mockResolvedValue(GRID);
    const json = await call();
    expect(json.ok).toBe(false);
    expect(m.sendAgencyQuoteRequest).not.toHaveBeenCalled();
    expect(m.inserts.some((i) => i.table === "car_quote_options")).toBe(false);
    expect(m.requestUpdates).toContainEqual({ status: "email_failed" });
    const msg = JSON.stringify(m.notifyOps.mock.calls[0][0]);
    expect(msg).toContain("conditions 2027 non acceptées");
  });

  it("statut quoted refusé par la base : offerUrl rendu quand même, ops alertée", async () => {
    process.env.CAR_CATALOGUE_ENABLED = "on";
    m.liveCataloguesForPartners.mockResolvedValue(GRID);
    m.updateError = { message: "boom" };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const json = await call();
    spy.mockRestore();
    expect(json.offerUrl).toMatch(/car-offer\//);
    expect(m.notifyOps.mock.calls.some((c) => c[0].title === "Statut 'quoted' non écrit")).toBe(true);
  });
});

describe("POST /api/car-rental/submit : aucun numéro de loueur avant réservation", () => {
  beforeEach(() => { vi.clearAllMocks(); wiring(); m.ensurePortalToken.mockResolvedValue("tok-7"); });
  const call = async () => (await POST(req() as never)).json();
  const WA = "+30 699 000 0000";

  it("allumé, aucun loueur réservable : ni fallbackWhatsapp ni numéro, vue « pas de partenaire »", async () => {
    process.env.CAR_CATALOGUE_ENABLED = "on";
    m.partnersForZoneWithTerms.mockResolvedValue([PARTNER({ whatsapp: WA, terms_version: null, terms_accepted_at: null })]);
    const json = await call();
    expect(json).toEqual({ ok: false, noPartner: true });
    expect(JSON.stringify(json)).not.toContain("699");
  });

  it("allumé, durée trop courte pour tous les loueurs : ni fallbackWhatsapp ni numéro", async () => {
    process.env.CAR_CATALOGUE_ENABLED = "on";
    m.partnersForZoneWithTerms.mockResolvedValue([PARTNER({ whatsapp: WA, min_days: 10 })]);
    const json = await call();
    expect(json).toEqual({ ok: false, noPartner: true });
  });

  it("éteint, aucun e-mail parti : fallbackWhatsapp inchangé", async () => {
    m.partnersForZoneWithTerms.mockResolvedValue([PARTNER({ whatsapp: WA })]);
    m.sendAgencyQuoteRequest.mockRejectedValue(new Error("resend down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const json = await call();
    spy.mockRestore();
    expect(json).toEqual({ ok: false, fallbackWhatsapp: WA });
  });

  it("éteint, durée trop courte : fallbackWhatsapp inchangé", async () => {
    m.partnersForZoneWithTerms.mockResolvedValue([PARTNER({ whatsapp: WA, min_days: 10 })]);
    const json = await call();
    expect(json).toEqual({ ok: false, fallbackWhatsapp: WA });
  });
});
