import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/stays/tokens", () => ({ hashToken: (t: string) => `hash(${t})` }));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/owner", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const OWNER = { id: 7 };
const LISTING = { id: 9, owner_id: 7 };

function wiring(opts: { owner?: unknown; listing?: unknown } = {}) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation((table: string) => {
    if (table === "stay_owners") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.owner === undefined ? OWNER : opts.owner }) }) }),
      };
    }
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.listing === undefined ? LISTING : opts.listing }) }) }),
      update: (patch: Record<string, unknown>) => {
        updates.push(patch);
        return { eq: async () => ({ error: null }) };
      },
    };
  });
  return updates;
}

describe("POST /api/stays/owner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("met a jour le prix, le menage et le minimum de nuits", async () => {
    const updates = wiring();
    const res = await POST(
      req({ token: "t", listingId: 9, basePriceEur: 120, cleaningFeeEur: 40, minNights: 3 }) as never,
    );

    expect(res.status).toBe(200);
    expect(updates[0]).toMatchObject({
      base_price_eur: 120,
      cleaning_fee_eur: 40,
      min_nights: 3,
    });
  });

  it("met l annonce hors ligne sans la supprimer", async () => {
    const updates = wiring();
    await POST(req({ token: "t", listingId: 9, published: false }) as never);
    expect(updates[0].status).toBe("unpublished");
  });

  it("remet une annonce en ligne", async () => {
    const updates = wiring();
    await POST(req({ token: "t", listingId: 9, published: true }) as never);
    expect(updates[0].status).toBe("published");
  });

  it("403 sur un jeton inconnu, aucune ecriture", async () => {
    const updates = wiring({ owner: null });
    expect((await POST(req({ token: "x", listingId: 9 }) as never)).status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it("404 si l annonce n appartient pas a ce proprietaire", async () => {
    // Un jeton valide ne doit pas donner acces aux annonces des autres.
    const updates = wiring({ listing: { id: 9, owner_id: 999 } });
    expect((await POST(req({ token: "t", listingId: 9, basePriceEur: 120 }) as never)).status).toBe(404);
    expect(updates).toHaveLength(0);
  });

  it("422 sur un prix absurde, avec un message lisible", async () => {
    const updates = wiring();
    const res = await POST(req({ token: "t", listingId: 9, basePriceEur: 99999 }) as never);
    expect(res.status).toBe(422);
    expect(String((await res.json()).error)).toMatch(/prix/i);
    expect(updates).toHaveLength(0);
  });

  it("422 sur un prix nul", async () => {
    wiring();
    expect((await POST(req({ token: "t", listingId: 9, basePriceEur: 0 }) as never)).status).toBe(422);
  });

  it("n ecrit que les champs envoyes", async () => {
    // Un formulaire partiel ne doit pas remettre les autres valeurs a zero.
    const updates = wiring();
    await POST(req({ token: "t", listingId: 9, minNights: 5 }) as never);
    expect(Object.keys(updates[0])).toEqual(["min_nights"]);
  });
});
