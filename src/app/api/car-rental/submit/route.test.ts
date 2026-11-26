import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

const m = vi.hoisted(() => ({
  ensurePortalToken: vi.fn(),
  sendAgencyQuoteRequest: vi.fn(),
  partnersForZone: vi.fn(),
}));
vi.mock("@/lib/car-catalogue-db", () => ({ ensurePortalToken: m.ensurePortalToken }));
vi.mock("@/lib/car-partners-db", () => ({ partnersForZone: m.partnersForZone }));
vi.mock("@/lib/ops-notify", () => ({ notifyOps: vi.fn(), echeance: () => "" }));
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
  sendCustomerRequestReceived: vi.fn(),
}));

import { POST } from "./route";

function wiring() {
  from.mockImplementation((table: string) => {
    if (table === "car_requests") {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ gte: () => ({ limit: async () => ({ data: [] }) }) }) }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: 9 }, error: null }) }) }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    }
    return { insert: async () => ({ error: null }) };
  });
  m.partnersForZone.mockResolvedValue([
    { id: 7, name: "Lux Trans", email: "l@example.com", phone: "1", whatsapp: null, lead_routing: "direct", min_days: null },
  ]);
  m.sendAgencyQuoteRequest.mockResolvedValue({});
}

const req = () =>
  new Request("http://localhost/api/car-rental/submit", { method: "POST", body: JSON.stringify({}) });

describe("POST /api/car-rental/submit : lien du portail", () => {
  beforeEach(() => { vi.clearAllMocks(); wiring(); });

  it("passe le lien du portail à sendAgencyQuoteRequest", async () => {
    m.ensurePortalToken.mockResolvedValue("tok-7");
    await POST(req() as never);
    expect(m.sendAgencyQuoteRequest).toHaveBeenCalledTimes(1);
    expect(m.sendAgencyQuoteRequest.mock.calls[0][3]).toBe("https://crete.direct/en/car-rates/tok-7");
  });

  it("si ensurePortalToken échoue, la demande part quand même sans le lien", async () => {
    m.ensurePortalToken.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await POST(req() as never);
    expect(m.sendAgencyQuoteRequest).toHaveBeenCalledTimes(1);
    expect(m.sendAgencyQuoteRequest.mock.calls[0][3]).toBeUndefined();
    spy.mockRestore();
  });
});
