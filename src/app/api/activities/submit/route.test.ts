import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

const m = vi.hoisted(() => ({
  partnersForCategoryCity: vi.fn(),
  sendActivityQuoteRequest: vi.fn(),
  sendActivityLeadKamiSummary: vi.fn(),
  sendActivityCustomerRequestReceived: vi.fn(),
  notifyOps: vi.fn(),
  requestUpdates: [] as Array<Record<string, unknown>>,
}));
vi.mock("@/lib/activity-partners-db", () => ({ partnersForCategoryCity: m.partnersForCategoryCity }));
vi.mock("@/lib/ops-notify", () => ({ notifyOps: m.notifyOps, echeance: () => "" }));
vi.mock("@/lib/car-quote", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  siteBase: () => "https://crete.direct",
}));
vi.mock("@/lib/activity-lead", () => ({
  validateActivityLead: () => ({
    kind: "ok",
    row: {
      customer_email: "c@example.com", customer_name: "C", customer_phone: null, category_slug: "boat-trips",
      city: "chania", activity_date: "2027-06-01", timeslot: null, adults: 2, children: 0,
      preferred_language: null, note: null, locale: "en",
    },
  }),
}));
vi.mock("@/lib/email", () => ({
  sendActivityQuoteRequest: m.sendActivityQuoteRequest,
  sendActivityLeadKamiSummary: m.sendActivityLeadKamiSummary,
  sendActivityCustomerRequestReceived: m.sendActivityCustomerRequestReceived,
}));

import { POST } from "./route";

const WA = "+30 699 111 2233";
const PARTNER = (extra: Record<string, unknown> = {}) => ({
  id: 4, name: "Blue Lagoon Cruises", email: "b@example.com", phone: "+30 2821 000000", whatsapp: WA, lead_routing: "direct",
  ...extra,
});

function wiring() {
  from.mockImplementation((table: string) => {
    if (table === "activity_requests") {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ gte: () => ({ limit: async () => ({ data: [] }) }) }) }) }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: 31 }, error: null }) }) }),
        update: (u: Record<string, unknown>) => { m.requestUpdates.push(u); return { eq: async () => ({ error: null }) }; },
      };
    }
    return { insert: async () => ({ error: null }) };
  });
  m.requestUpdates.length = 0;
}

async function call() {
  const req = new Request("https://crete.direct/api/activities/submit", { method: "POST", body: "{}" });
  const res = await POST(req as never);
  return res.json();
}

beforeEach(() => {
  vi.clearAllMocks();
  wiring();
  m.sendActivityCustomerRequestReceived.mockResolvedValue(undefined);
  m.sendActivityLeadKamiSummary.mockResolvedValue(undefined);
});

describe("POST /api/activities/submit : aucune coordonnée de prestataire vers le navigateur", () => {
  it("aucun e-mail parti : ni numéro ni nom de prestataire, demande gardée et ops prévenu", async () => {
    m.partnersForCategoryCity.mockResolvedValue([PARTNER(), PARTNER({ id: 5, name: "Sea Kayak Crete", whatsapp: null })]);
    m.sendActivityQuoteRequest.mockRejectedValue(new Error("resend down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const json = await call();
    spy.mockRestore();

    expect(json).toEqual({ ok: false, noPartner: true });
    const out = JSON.stringify(json);
    for (const leak of ["699", "2821", "Blue Lagoon", "Sea Kayak", "b@example.com", "fallbackWhatsapp"]) expect(out).not.toContain(leak);
    expect(m.requestUpdates).toContainEqual({ status: "email_failed" });
    expect(m.sendActivityCustomerRequestReceived.mock.calls[0][0].noProvider).toBe(true);
    expect(m.notifyOps.mock.calls.some((c) => c[0].title === "Demande activité SANS prestataire joignable")).toBe(true);
  });

  it("au moins un e-mail parti : { ok: true }, rien d'autre", async () => {
    m.partnersForCategoryCity.mockResolvedValue([PARTNER()]);
    m.sendActivityQuoteRequest.mockResolvedValue(undefined);
    expect(await call()).toEqual({ ok: true });
    expect(m.notifyOps).not.toHaveBeenCalled();
  });
});
