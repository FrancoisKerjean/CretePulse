import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";
import { hashToken } from "./car-quote";

// Jeton du portail loueur (spec section 6) : seul son hash va en base.
type Row = Record<string, unknown>;

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));

import { ensurePortalToken, partnerByPortalToken } from "./car-catalogue-db";

const SECRET = "p".repeat(32);
const derived = (id: number) => createHmac("sha256", SECRET).update(`car-portal-v1:${id}`).digest("base64url");

/** Fausse table car_partners : eq, is, select, update, maybeSingle. */
function fakePartners(rows: Row[], opts: { writeError?: string } = {}) {
  const writes: Row[] = [];
  const lookups: Array<[string, unknown]> = [];
  from.mockImplementation(() => {
    const filters: Array<[string, unknown]> = [];
    let patch: Row | null = null;
    const hit = () => rows.filter((r) => filters.every(([c, v]) => r[c] === v));
    const chain = {
      select: () => chain,
      update: (p: Row) => { patch = p; return chain; },
      eq: (c: string, v: unknown) => { filters.push([c, v]); lookups.push([c, v]); return chain; },
      maybeSingle: async () => ({ data: hit()[0] ? { ...hit()[0] } : null, error: null }),
      then: (res: (x: unknown) => unknown) => {
        if (patch) {
          writes.push(patch);
          if (opts.writeError) return Promise.resolve({ data: null, error: { message: opts.writeError } }).then(res);
          for (const r of hit()) Object.assign(r, patch);
        }
        return Promise.resolve({ data: hit(), error: null }).then(res);
      },
    };
    return chain;
  });
  return { writes, lookups };
}

describe("jeton du portail loueur, stocké haché", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CAR_ADMIN_SECRET", SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("ensurePortalToken écrit le hash du jeton dérivé, jamais le clair, et rend le jeton", async () => {
    const rows: Row[] = [{ id: 7, name: "Lux Trans", portal_token: null }];
    const { writes } = fakePartners(rows);
    const token = await ensurePortalToken(7);

    expect(token).toBe(derived(7));
    expect(writes).toEqual([{ portal_token: hashToken(token) }]);
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("hash déjà en base : rien écrit, même jeton à chaque appel", async () => {
    const rows: Row[] = [{ id: 7, portal_token: hashToken(derived(7)) }];
    const { writes } = fakePartners(rows);
    expect(await ensurePortalToken(7)).toBe(derived(7));
    expect(await ensurePortalToken(7)).toBe(derived(7));
    expect(writes).toHaveLength(0);
  });

  it("le jeton change avec le loueur", async () => {
    fakePartners([{ id: 7, portal_token: null }, { id: 8, portal_token: null }]);
    expect(await ensurePortalToken(7)).not.toBe(await ensurePortalToken(8));
  });

  it("écriture refusée par la base : lève, aucun lien rendu", async () => {
    fakePartners([{ id: 7, portal_token: null }], { writeError: "permission denied" });
    await expect(ensurePortalToken(7)).rejects.toThrow(/permission denied/);
  });

  it("sans secret : lève, aucun lien", async () => {
    vi.stubEnv("CAR_ADMIN_SECRET", "");
    fakePartners([{ id: 7, portal_token: null }]);
    await expect(ensurePortalToken(7)).rejects.toThrow(/CAR_ADMIN_SECRET/);
  });

  it("partnerByPortalToken cherche par le hash, jamais par le clair", async () => {
    const token = derived(7);
    const { lookups } = fakePartners([{ id: 7, name: "Lux Trans", portal_token: hashToken(token) }]);
    expect(await partnerByPortalToken(token)).toMatchObject({ id: 7 });
    expect(lookups).toEqual([["portal_token", hashToken(token)]]);
  });

  it("un jeton faux, ou le hash lui-même, ne trouve rien", async () => {
    const stored = hashToken(derived(7));
    fakePartners([{ id: 7, portal_token: stored }]);
    expect(await partnerByPortalToken(derived(8))).toBeNull();
    // Qui lirait la colonne n'ouvre pas le portail avec : la recherche hache l'entrée.
    expect(await partnerByPortalToken(stored)).toBeNull();
  });
});
