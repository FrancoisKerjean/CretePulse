import { describe, it, expect, vi, beforeEach } from "vitest";

const syncListingFromIcal = vi.fn(async () => ({ blocked: 2, released: 1 }));
vi.mock("@/lib/stays/ical-apply", () => ({
  syncListingFromIcal: (...a: unknown[]) => syncListingFromIcal(...a),
}));
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

import { GET } from "./route";

function req(secret = "s3cret"): Request {
  return new Request("http://localhost/api/cron/stays-ical", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

const LISTING = { id: 9, slug: "villa", ical_private_url: "https://airbnb.com/x.ics" };

function wiring(rows: unknown[] = [LISTING]) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ not: async () => ({ data: rows, error: null }) }) }),
    update: (patch: Record<string, unknown>) => {
      updates.push(patch);
      return { eq: async () => ({ error: null }) };
    },
  }));
  return updates;
}

describe("GET /api/cron/stays-ical", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "s3cret";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => "BEGIN:VCALENDAR" })));
  });

  it("401 sans le secret du cron", async () => {
    wiring();
    expect((await GET(req("mauvais") as never)).status).toBe(401);
    expect(syncListingFromIcal).not.toHaveBeenCalled();
  });

  it("resynchronise chaque annonce publiee qui a un flux", async () => {
    const updates = wiring();
    const res = await GET(req() as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, synced: 1, failed: 0 });
    expect(syncListingFromIcal).toHaveBeenCalledWith(9, "BEGIN:VCALENDAR");
    // Horodatage de la derniere synchro reussie, pour reperer un flux mort.
    expect(updates[0].ical_sync_meta).toMatchObject({ blocked: 2, released: 1 });
  });

  it("un flux injoignable n arrete pas la passe", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, text: async () => "" })));
    wiring([LISTING, { ...LISTING, id: 10 }]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const json = await (await GET(req() as never)).json();

    expect(json.synced).toBe(0);
    expect(json.failed).toBe(2);
    expect(syncListingFromIcal).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("une annonce en echec ne bloque pas les suivantes", async () => {
    syncListingFromIcal.mockRejectedValueOnce(new Error("boom") as never);
    wiring([LISTING, { ...LISTING, id: 10 }]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const json = await (await GET(req() as never)).json();

    expect(json.synced).toBe(1);
    expect(json.failed).toBe(1);
    errSpy.mockRestore();
  });

  it("ne fait rien quand aucune annonce n a de flux", async () => {
    wiring([]);
    const json = await (await GET(req() as never)).json();
    expect(json).toMatchObject({ synced: 0, failed: 0 });
    expect(syncListingFromIcal).not.toHaveBeenCalled();
  });
});
