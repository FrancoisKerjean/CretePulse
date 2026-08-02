import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/stays/tokens", () => ({ hashToken: (t: string) => `hash(${t})` }));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/owner/block", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const OWNER = { id: 7 };
const LISTING = { id: 9, owner_id: 7 };

function wiring(existing: Array<{ date: string; status: string }> = []) {
  const upserts: unknown[][] = [];
  const deleted: string[][] = [];
  from.mockImplementation((table: string) => {
    if (table === "stay_owners") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: OWNER }) }) }) };
    }
    if (table === "stay_listings") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: LISTING }) }) }) };
    }
    return {
      select: () => ({ eq: () => ({ in: async () => ({ data: existing, error: null }) }) }),
      upsert: async (rows: unknown[]) => {
        upserts.push(rows);
        return { error: null };
      },
      delete: () => ({
        eq: () => ({ eq: () => ({ in: async (_c: string, d: string[]) => { deleted.push(d); return { error: null }; } }) }),
      }),
    };
  });
  return { upserts, deleted };
}

describe("POST /api/stays/owner/block", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloque une plage de nuits pour le proprietaire", async () => {
    const { upserts } = wiring();
    const res = await POST(
      req({ token: "t", listingId: 9, action: "block", dateFrom: "2026-08-10", dateTo: "2026-08-13" }) as never,
    );

    expect(res.status).toBe(200);
    expect((await res.json()).blocked).toBe(3);
    expect(upserts[0]).toHaveLength(3);
    expect(upserts[0][0]).toMatchObject({ listing_id: 9, date: "2026-08-10", status: "hold" });
  });

  it("REFUSE de bloquer une plage qui contient une nuit vendue", async () => {
    // Bloquer par-dessus une nuit vendue laisserait croire au proprietaire que
    // la date est a lui, alors qu un voyageur a paye.
    const { upserts } = wiring([{ date: "2026-08-11", status: "booked" }]);
    const res = await POST(
      req({ token: "t", listingId: 9, action: "block", dateFrom: "2026-08-10", dateTo: "2026-08-13" }) as never,
    );

    expect(res.status).toBe(409);
    expect(String((await res.json()).error)).toMatch(/2026-08-11/);
    expect(upserts).toHaveLength(0);
  });

  it("libere uniquement les nuits qu il a lui-meme posees", async () => {
    const { deleted } = wiring([
      { date: "2026-08-10", status: "hold" },
      { date: "2026-08-11", status: "blocked_ota" },
      { date: "2026-08-12", status: "booked" },
    ]);
    const res = await POST(
      req({ token: "t", listingId: 9, action: "release", dateFrom: "2026-08-10", dateTo: "2026-08-13" }) as never,
    );

    expect(res.status).toBe(200);
    expect((await res.json()).released).toBe(1);
    expect(deleted[0]).toEqual(["2026-08-10"]);
  });

  it("422 sur une plage inversee", async () => {
    const { upserts } = wiring();
    const res = await POST(
      req({ token: "t", listingId: 9, action: "block", dateFrom: "2026-08-13", dateTo: "2026-08-10" }) as never,
    );
    expect(res.status).toBe(422);
    expect(upserts).toHaveLength(0);
  });

  it("422 sur une plage deraisonnable, garde-fou contre la faute de frappe", async () => {
    const { upserts } = wiring();
    const res = await POST(
      req({ token: "t", listingId: 9, action: "block", dateFrom: "2026-01-01", dateTo: "2027-06-01" }) as never,
    );
    expect(res.status).toBe(422);
    expect(upserts).toHaveLength(0);
  });

  it("403 sur un jeton inconnu", async () => {
    from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }));
    expect(
      (await POST(req({ token: "x", listingId: 9, action: "block", dateFrom: "2026-08-10", dateTo: "2026-08-11" }) as never)).status,
    ).toBe(403);
  });
});
