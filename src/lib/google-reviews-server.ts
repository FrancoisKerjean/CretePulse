// Avis Google d'un loueur, lus EN DIRECT (Places API New, Place Details).
//
// Conditions Google : les textes d'avis ne sont jamais stockés en base. Le seul
// cache est celui de fetch (24 h, revalidate), et chaque avis s'affiche avec
// son auteur, le lien vers sa fiche et la mention « Avis Google ».
// Droit français (affichage d'avis) : ordre de Google conservé, aucun filtre ni
// tri sur la note, avis de plus de 2 ans écartés, et la page dit que les avis
// ne sont pas vérifiés par crete.direct.
//
// Toute panne (pas de clé, HTTP, JSON illisible, réseau) rend une liste vide :
// le bloc d'avis disparaît, la page ne casse jamais.

export const REVIEW_MAX_AGE_DAYS = 730;
const CACHE_SECONDS = 86_400;

export interface GoogleReview {
  author: string;
  authorUri: string | null;
  authorPhoto: string | null;
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
    rating: r.rating,
    text,
    relativeTime: r.relativePublishTimeDescription ?? null,
    publishTime: r.publishTime as string,
  };
}

/** Avis Google d'un lieu, dans la langue de la page. Jamais d'exception. */
export async function reviewsForPlace(placeId: string | null | undefined, locale: string): Promise<PlaceReviews> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !placeId) return EMPTY;
  const lang = LANGS.has(locale) ? locale : "en";
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${lang}`,
      {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "reviews,googleMapsUri" },
        next: { revalidate: CACHE_SECONDS },
      } as RequestInit,
    );
    if (!res.ok) {
      console.warn("[google-reviews] lecture des avis refusée", { placeId, status: res.status });
      return EMPTY;
    }
    const json = (await res.json()) as { googleMapsUri?: string; reviews?: ApiReview[] };
    const minTime = Date.now() - REVIEW_MAX_AGE_DAYS * 86_400_000;
    return {
      mapsUri: json.googleMapsUri ?? null,
      reviews: (json.reviews ?? []).map((r) => toReview(r, minTime)).filter((r): r is GoogleReview => r !== null),
    };
  } catch (e) {
    console.warn("[google-reviews] avis illisibles", { placeId, error: e instanceof Error ? e.message : String(e) });
    return EMPTY;
  }
}
