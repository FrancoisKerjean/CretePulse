import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("../supabase-admin", () => ({ supabaseAdmin: { from } }));

import { syncListingFromIcal } from "./ical-apply";

const ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260810",
  "DTEND;VALUE=DATE:20260813",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

function wiring(current: Array<{ date: string; status: string }> = []) {
  const upserts: unknown[][] = [];
  const deletes: string[][] = [];
  from.mockImplementation(() => ({
    select: () => ({ eq: async () => ({ data: current, error: null }) }),
    upsert: async (rows: unknown[]) => {
      upserts.push(rows);
      return { error: null };
    },
    delete: () => ({
      eq: () => ({
        eq: () => ({
          in: async (_col: string, dates: string[]) => {
            deletes.push(dates);
            return { error: null };
          },
        }),
      }),
    }),
  }));
  return { upserts, deletes };
}

describe("syncListingFromIcal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ecrit en base les nuits bloquees par l OTA", async () => {
    const { upserts } = wiring();
    const res = await syncListingFromIcal(9, ICS);

    expect(res).toMatchObject({ blocked: 3, released: 0 });
    expect(upserts[0]).toHaveLength(3);
    expect(upserts[0][0]).toMatchObject({
      listing_id: 9,
      date: "2026-08-10",
      status: "blocked_ota",
      source: "ical",
    });
  });

  it("libere les nuits disparues du flux", async () => {
    const { deletes } = wiring([
      { date: "2026-08-10", status: "blocked_ota" },
      { date: "2026-09-01", status: "blocked_ota" },
    ]);
    const res = await syncListingFromIcal(9, ICS);

    // 2026-08-10 est encore dans le flux, 2026-09-01 non.
    expect(deletes[0]).toEqual(["2026-09-01"]);
    expect(res.released).toBe(1);
  });

  it("ne supprime jamais une nuit vendue, meme absente du flux", async () => {
    const { deletes } = wiring([{ date: "2026-12-24", status: "booked" }]);
    const res = await syncListingFromIcal(9, ICS);

    expect(deletes).toHaveLength(0);
    expect(res.released).toBe(0);
  });

  it("n ecrit rien quand le flux ne change rien", async () => {
    const { upserts, deletes } = wiring([
      { date: "2026-08-10", status: "blocked_ota" },
      { date: "2026-08-11", status: "blocked_ota" },
      { date: "2026-08-12", status: "blocked_ota" },
    ]);
    const res = await syncListingFromIcal(9, ICS);

    expect(upserts).toHaveLength(0);
    expect(deletes).toHaveLength(0);
    expect(res).toMatchObject({ blocked: 0, released: 0 });
  });

  it("traite un flux vide comme une liberation complete", async () => {
    const { deletes } = wiring([{ date: "2026-08-10", status: "blocked_ota" }]);
    const res = await syncListingFromIcal(9, "BEGIN:VCALENDAR\r\nEND:VCALENDAR");
    expect(deletes[0]).toEqual(["2026-08-10"]);
    expect(res.released).toBe(1);
  });
});
