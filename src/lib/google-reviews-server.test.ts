import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { cacheCalls } = vi.hoisted(() => ({ cacheCalls: [] as unknown[][] }));
// Le cache de Next n'existe pas hors de Next : on enregistre sa configuration
// et on appelle la fonction directement.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown, keys: unknown, opts: unknown) => {
    cacheCalls.push([keys, opts]);
    return fn;
  },
}));

import { reviewsForPlace, REVIEW_MAX_AGE_DAYS } from "./google-reviews-server";

const NOW = new Date("2026-11-27T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

// Auteurs et textes factices : aucune vraie personne dans le code.
const review = (author: string, rating: number, publishTime: string, text = `Texte de ${author}`) => ({
  name: `places/P1/reviews/${author}`,
  relativePublishTimeDescription: "il y a 3 semaines",
  rating,
  text: { text, languageCode: "fr" },
  originalText: { text: `Original ${author}`, languageCode: "en" },
  authorAttribution: { displayName: author, uri: `https://maps.example/${author}`, photoUri: `https://photo.example/${author}` },
  publishTime,
});

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("reviewsForPlace", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  it("appelle Places API New avec la langue et les en-têtes, derrière un cache de données de 24 h", async () => {
    const fn = mockFetch(200, { googleMapsUri: "https://maps.example/p1", reviews: [] });
    await reviewsForPlace("ChIJ_abc", "fr");
    expect(fn).toHaveBeenCalledTimes(1);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places/ChIJ_abc?languageCode=fr");
    expect(init.headers).toEqual({ "X-Goog-Api-Key": "test-key", "X-Goog-FieldMask": "reviews,googleMapsUri" });
    // force-dynamic coupe le cache de fetch : le cache vit dans unstable_cache.
    expect(cacheCalls).toContainEqual([["google-reviews-v1"], { revalidate: 86_400 }]);
  });

  it("rend les avis dans la langue demandée, avec auteur, lien, photo, note et dates", async () => {
    mockFetch(200, { googleMapsUri: "https://maps.example/p1", reviews: [review("Alpha", 5, daysAgo(20))] });
    const out = await reviewsForPlace("P1", "fr");
    expect(out.mapsUri).toBe("https://maps.example/p1");
    expect(out.reviews).toEqual([{
      author: "Alpha",
      authorUri: "https://maps.example/Alpha",
      authorPhoto: "https://photo.example/Alpha",
      rating: 5,
      text: "Texte de Alpha",
      relativeTime: "il y a 3 semaines",
      publishTime: daysAgo(20),
    }]);
  });

  it("retombe sur le texte original quand Google ne fournit pas de traduction", async () => {
    const r = { ...review("Beta", 4, daysAgo(10)), text: undefined };
    mockFetch(200, { reviews: [r] });
    const out = await reviewsForPlace("P1", "de");
    expect(out.reviews[0].text).toBe("Original Beta");
  });

  it(`écarte les avis de plus de ${REVIEW_MAX_AGE_DAYS} jours (2 ans) et garde l'ordre de Google`, async () => {
    mockFetch(200, {
      reviews: [
        review("Recent", 5, daysAgo(30)),
        review("Old", 5, daysAgo(800)),
        review("Middle", 4, daysAgo(400)),
      ],
    });
    const out = await reviewsForPlace("P1", "en");
    expect(out.reviews.map((r) => r.author)).toEqual(["Recent", "Middle"]);
  });

  it("garde un avis à 1 étoile : jamais de filtre sur la note", async () => {
    mockFetch(200, { reviews: [review("Happy", 5, daysAgo(5)), review("Angry", 1, daysAgo(6))] });
    const out = await reviewsForPlace("P1", "en");
    expect(out.reviews.map((r) => [r.author, r.rating])).toEqual([["Happy", 5], ["Angry", 1]]);
  });

  it("ignore un avis sans texte ni date lisible", async () => {
    mockFetch(200, {
      reviews: [
        { ...review("NoText", 5, daysAgo(5)), text: undefined, originalText: undefined },
        { ...review("NoDate", 5, daysAgo(5)), publishTime: "pas une date" },
        review("Ok", 4, daysAgo(5)),
      ],
    });
    const out = await reviewsForPlace("P1", "en");
    expect(out.reviews.map((r) => r.author)).toEqual(["Ok"]);
  });

  it("sans clé : aucun appel, aucun avis", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const fn = mockFetch(200, { reviews: [review("X", 5, daysAgo(5))] });
    const out = await reviewsForPlace("P1", "en");
    expect(fn).not.toHaveBeenCalled();
    expect(out).toEqual({ mapsUri: null, reviews: [] });
  });

  it("sans place_id : aucun appel, aucun avis", async () => {
    const fn = mockFetch(200, {});
    expect(await reviewsForPlace(null, "en")).toEqual({ mapsUri: null, reviews: [] });
    expect(fn).not.toHaveBeenCalled();
  });

  it("erreur HTTP : aucun avis, un avertissement sans la clé, pas d'exception", async () => {
    mockFetch(500, "boom");
    const out = await reviewsForPlace("P1", "en");
    expect(out).toEqual({ mapsUri: null, reviews: [] });
    expect(console.warn).toHaveBeenCalled();
    const logged = JSON.stringify((console.warn as unknown as { mock: { calls: unknown[] } }).mock.calls);
    expect(logged).not.toContain("test-key");
  });

  it("réponse illisible ou réseau coupé : aucun avis, pas d'exception", async () => {
    mockFetch(200, "{pas du json");
    expect(await reviewsForPlace("P1", "en")).toEqual({ mapsUri: null, reviews: [] });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNRESET"); }));
    expect(await reviewsForPlace("P1", "en")).toEqual({ mapsUri: null, reviews: [] });
  });
});
