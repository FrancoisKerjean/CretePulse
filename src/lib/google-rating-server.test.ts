import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));

import { refreshPartnerRating, refreshStaleRatings } from "./google-rating-server";

const PARTNER = { id: 105, name: "Beepit Rental Cars", email: "reservations@beepit.gr", google_place_id: null };

function wiring(partner: unknown = PARTNER, rows: unknown[] = []) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation(() => ({
    select: () => ({
      eq: (col: string) =>
        col === "id"
          ? { maybeSingle: async () => ({ data: partner }) }
          : { order: async () => ({ data: rows }) },
    }),
    update: (patch: Record<string, unknown>) => {
      updates.push(patch);
      return { eq: async () => ({ error: null }) };
    },
  }));
  return updates;
}

const place = (over: Record<string, unknown>) => ({
  id: "place_x", displayName: { text: "X" }, rating: 4.5, userRatingCount: 100, ...over,
});

/** Réponse HTTP factice, façon Places API v1. */
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe("refreshPartnerRating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    vi.unstubAllGlobals();
  });

  it("sans cle Google, ne tente aucun appel et le dit", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    wiring();
    const res = await refreshPartnerRating(105);
    expect(res).toEqual({ status: "no_key" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("apparie par le domaine du loueur et ecrit la note relevee", async () => {
    const updates = wiring();
    vi.mocked(fetch).mockResolvedValueOnce(ok({
      places: [
        place({ id: "concurrent", displayName: { text: "Hertz Heraklion" }, rating: 4.9, userRatingCount: 900 }),
        place({ id: "beepit_1", displayName: { text: "BEEPIT" }, websiteUri: "https://www.beepit.gr",
                rating: 4.6, userRatingCount: 312, googleMapsUri: "https://maps.google.com/?cid=1" }),
      ],
    }) as never);

    const res = await refreshPartnerRating(105);

    expect(res).toMatchObject({ status: "updated", rating: 4.6, count: 312, reason: "domain" });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      google_place_id: "beepit_1",
      google_rating: 4.6,
      google_rating_count: 312,
      google_maps_url: "https://maps.google.com/?cid=1",
    });
    expect(updates[0].google_rating_at).toEqual(expect.any(String));
  });

  it("n ecrit AUCUNE note quand rien ne correspond, seulement la date du releve", async () => {
    // L invariant du chantier : mieux vaut une case vide que la note d un
    // concurrent affichee comme celle du loueur.
    const updates = wiring();
    vi.mocked(fetch).mockResolvedValueOnce(ok({
      places: [
        place({ id: "a", displayName: { text: "Hertz Heraklion" }, rating: 4.9, userRatingCount: 900 }),
        place({ id: "b", displayName: { text: "Avis Crete" }, rating: 4.8, userRatingCount: 400 }),
      ],
    }) as never);

    const res = await refreshPartnerRating(105);

    expect(res).toMatchObject({ status: "unmatched" });
    expect(Object.keys(updates[0])).toEqual(["google_rating_at"]);
  });

  it("relit directement la fiche connue, sans repasser par la recherche", async () => {
    const updates = wiring({ ...PARTNER, google_place_id: "beepit_1" });
    vi.mocked(fetch).mockResolvedValueOnce(ok(
      place({ id: "beepit_1", displayName: { text: "Beepit" }, rating: 4.7, userRatingCount: 320 }),
    ) as never);

    const res = await refreshPartnerRating(105);

    expect(res).toMatchObject({ status: "updated", rating: 4.7, count: 320 });
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/v1/places/beepit_1");
    expect(updates[0]).toMatchObject({ google_rating: 4.7 });
  });

  it("repart en recherche quand la fiche connue a disparu", async () => {
    wiring({ ...PARTNER, google_place_id: "vieille_fiche" });
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as never)
      .mockResolvedValueOnce(ok({
        places: [place({ id: "beepit_2", displayName: { text: "Beepit Rental Cars" }, rating: 4.4, userRatingCount: 210 })],
      }) as never);

    const res = await refreshPartnerRating(105);

    expect(res).toMatchObject({ status: "updated", rating: 4.4, reason: "name" });
    expect(vi.mocked(fetch).mock.calls).toHaveLength(2);
  });

  it("sur panne Google, n ecrit rien : la note affichee reste la derniere valide", async () => {
    const updates = wiring();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) } as never);

    const res = await refreshPartnerRating(105);

    expect(res).toMatchObject({ status: "failed", code: "places_search_429" });
    expect(updates).toHaveLength(0);
  });

  it("rend not_found sur un loueur inconnu", async () => {
    wiring(null);
    const res = await refreshPartnerRating(999);
    expect(res).toMatchObject({ status: "not_found" });
  });

  it("ne deguise pas une lecture en erreur en loueur introuvable", async () => {
    // Une clé de service absente rend exactement ce cas : sans distinction,
    // le releve se declare vert en n ayant rien lu du tout.
    from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: "permission denied" } }) }),
      }),
    }));
    const res = await refreshPartnerRating(105);
    expect(res).toMatchObject({ status: "failed", code: "db_read" });
  });
});

describe("refreshStaleRatings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    vi.unstubAllGlobals();
  });

  it("saute les loueurs releves recemment et ne rejoue que les perimes", async () => {
    const now = new Date("2026-07-30T10:00:00Z");
    wiring(PARTNER, [
      { id: 105, google_rating_at: null },                       // jamais relevé
      { id: 111, google_rating_at: "2026-07-29T10:00:00Z" },     // frais
      { id: 134, google_rating_at: "2026-06-01T10:00:00Z" },     // périmé
    ]);
    vi.mocked(fetch).mockResolvedValue(ok({
      places: [place({ id: "p", displayName: { text: "Beepit" }, websiteUri: "https://beepit.gr" })],
    }) as never);

    const res = await refreshStaleRatings({ now });

    expect(res).toMatchObject({ checked: 2, updated: 2, skipped: 1, failed: 0 });
  });

  it("signale une lecture en erreur au lieu de rendre une passe vide et verte", async () => {
    from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ order: async () => ({ data: null, error: { message: "permission denied for table car_partners" } }) }),
      }),
    }));

    const res = await refreshStaleRatings({ now: new Date("2026-07-30T10:00:00Z") });

    expect(res.error).toContain("permission denied");
    expect(res.checked).toBe(0);
  });

  it("sans cle, la passe ne touche a rien et se declare desarmee", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    wiring(PARTNER, [{ id: 105, google_rating_at: null }]);

    const res = await refreshStaleRatings({ now: new Date("2026-07-30T10:00:00Z") });

    expect(res.disabled).toBe(true);
    expect(res.checked).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("respecte le plafond de releves d une passe", async () => {
    const now = new Date("2026-07-30T10:00:00Z");
    wiring(PARTNER, [
      { id: 1, google_rating_at: null },
      { id: 2, google_rating_at: null },
      { id: 3, google_rating_at: null },
    ]);
    vi.mocked(fetch).mockResolvedValue(ok({
      places: [place({ id: "p", displayName: { text: "Beepit" }, websiteUri: "https://beepit.gr" })],
    }) as never);

    const res = await refreshStaleRatings({ now, limit: 2 });

    expect(res).toMatchObject({ checked: 2, skipped: 1 });
  });
});
