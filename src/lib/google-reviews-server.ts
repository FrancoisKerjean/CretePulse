// Avis Google d'un loueur, lus EN DIRECT (Places API New, Place Details).
//
// Conditions Google : les textes d'avis ne sont jamais stockés en base. Le seul
// cache est le cache de données de Next (24 h, unstable_cache) : les pages
// d'offres sont force-dynamic, ce qui désactive le cache de fetch. Seules les
// réponses réussies sont gardées (une panne lève, rien n'est mis en cache).
// Chaque avis s'affiche avec son auteur, le lien vers sa fiche et la mention
// « Avis Google ».
// Droit français (affichage d'avis) : ordre de Google conservé, aucun filtre ni
// tri sur la note, avis de plus de 2 ans écartés, et la page dit que les avis
// ne sont pas vérifiés par crete.direct.
//
// Toute panne (pas de clé, HTTP, JSON illisible, réseau) rend une liste vide :
// le bloc d'avis disparaît, la page ne casse jamais.

import { unstable_cache } from "next/cache";

export const REVIEW_MAX_AGE_DAYS = 730;
export const REVIEWS_CACHE_SECONDS = 86_400;

export interface GoogleReview {
  author: string;
  authorUri: string | null;
  authorPhoto: string | null;
  /** Lien vers l'avis lui-même sur Google Maps (exigé par Google à côté de chaque avis). */
  reviewUri: string | null;
  rating: number;
  text: string;
  /** Formulé par Google dans la langue demandée (« il y a 3 semaines »). */
  relativeTime: string | null;
  publishTime: string;
}

export interface PlaceReviews {
  mapsUri: string | null;
  reviews: GoogleReview[];
}

interface ApiReview {
  rating?: number;
  text?: { text?: string } | null;
  originalText?: { text?: string } | null;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string } | null;
  googleMapsUri?: string;
}

const EMPTY: PlaceReviews = { mapsUri: null, reviews: [] };
const LANGS = new Set(["en", "fr", "de", "el"]);

function toReview(r: ApiReview, minTime: number): GoogleReview | null {
  // Google fournit `text` dans la langue demandée quand il sait traduire,
  // sinon seul l'original est utilisable.
  const text = (r.text?.text || r.originalText?.text || "").trim();
  const published = r.publishTime ? Date.parse(r.publishTime) : NaN;
  const author = r.authorAttribution?.displayName?.trim();
  if (!text || !author || !Number.isFinite(published) || typeof r.rating !== "number") return null;
  if (published < minTime) return null;
  return {
    author,
    authorUri: r.authorAttribution?.uri ?? null,
    authorPhoto: r.authorAttribution?.photoUri ?? null,
    reviewUri: r.googleMapsUri ?? null,
    rating: r.rating,
    text,
    relativeTime: r.relativePublishTimeDescription ?? null,
    publishTime: r.publishTime as string,
  };
}

interface RawPlaceReviews { mapsUri: string | null; reviews: ApiReview[] }

/** Appel brut. Lève sur toute panne, pour que le cache ne garde jamais un échec. */
async function fetchPlaceReviews(placeId: string, lang: string): Promise<RawPlaceReviews> {
  const key = process.env.GOOGLE_PLACES_API_KEY as string;
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${lang}`,
    { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "reviews,googleMapsUri" }, cache: "no-store", signal: AbortSignal.timeout(2500) },
  );
  if (!res.ok) throw new Error(`places_reviews_${res.status}`);
  const json = (await res.json()) as { googleMapsUri?: string; reviews?: ApiReview[] };
  return { mapsUri: json.googleMapsUri ?? null, reviews: json.reviews ?? [] };
}

// La clé du cache comprend placeId et langue (arguments de la fonction).
const cachedPlaceReviews = unstable_cache(fetchPlaceReviews, ["google-reviews-v1"], { revalidate: REVIEWS_CACHE_SECONDS });

/** Avis Google d'un lieu, dans la langue de la page. Jamais d'exception. */
export async function reviewsForPlace(placeId: string | null | undefined, locale: string): Promise<PlaceReviews> {
  if (!process.env.GOOGLE_PLACES_API_KEY || !placeId) return EMPTY;
  const lang = LANGS.has(locale) ? locale : "en";
  try {
    const raw = await cachedPlaceReviews(placeId, lang);
    // Filtre d'âge à la lecture : un avis peut franchir les 2 ans pendant les 24 h de cache.
    const minTime = Date.now() - REVIEW_MAX_AGE_DAYS * 86_400_000;
    return {
      mapsUri: raw.mapsUri,
      reviews: raw.reviews.map((r) => toReview(r, minTime)).filter((r): r is GoogleReview => r !== null),
    };
  } catch (e) {
    console.warn("[google-reviews] avis indisponibles", { placeId, error: e instanceof Error ? e.message : String(e) });
    return EMPTY;
  }
}
