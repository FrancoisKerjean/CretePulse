import { beforeEach, describe, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));

import { partnerRatings } from "./car-trust-server";

type Call = [string, ...unknown[]];

function fake(result: { data: unknown; error: { message: string } | null } | Error) {
  const calls: Call[] = [];
  from.mockImplementation((table: string) => {
    calls.push(["from", table]);
    const chain = {
      select: (c: string) => { calls.push(["select", c]); return chain; },
      in: (c: string, v: unknown) => { calls.push(["in", c, v]); return done(); },
      eq: (c: string, v: unknown) => { calls.push(["eq", c, v]); return done(); },
    };
    const done = () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result));
    return chain;
  });
  return calls;
}

describe("partnerRatings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("sans liste : tous les loueurs actifs, avec les colonnes de note", async () => {
    const calls = fake({ data: [{ id: 1, name: "A", google_rating: 4.8, google_rating_count: 10 }], error: null });
    const out = await partnerRatings();
    expect(out).toHaveLength(1);
    expect(calls).toContainEqual(["from", "car_partners"]);
    expect(calls).toContainEqual(["eq", "active", true]);
    expect(calls.find((c) => c[0] === "select")?.[1]).toContain("google_rating_count");
  });

  it("avec une liste : ces loueurs-là, actifs ou non", async () => {
    const calls = fake({ data: [], error: null });
    await partnerRatings([3, 7]);
    expect(calls).toContainEqual(["in", "id", [3, 7]]);
    expect(calls.some((c) => c[0] === "eq")).toBe(false);
  });

  it("liste vide : aucune requête", async () => {
    const calls = fake({ data: [], error: null });
    expect(await partnerRatings([])).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("lecture refusée ou exception : [] et une trace, jamais d'exception", async () => {
    fake({ data: null, error: { message: "permission denied" } });
    expect(await partnerRatings()).toEqual([]);
    fake(new Error("réseau"));
    expect(await partnerRatings()).toEqual([]);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
