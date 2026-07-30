// Releve de la note Google des loueurs (Places API v1) et ecriture en base.
//
// Deux chemins : un loueur dont le `google_place_id` est connu est relu
// directement (Place Details, une requete) ; un loueur inconnu passe par une
// recherche texte, puis par l appariement strict de google-rating.ts.
//
// Regles d ecriture, dans cet ordre d importance :
//  1. Une note n est ecrite QUE si le lieu a ete apparie au loueur. Pas
//     d appariement, pas de note : un blanc vaut mieux qu un chiffre faux.
//  2. Un appel Google reussi mais sans appariement horodate quand meme
//     `google_rating_at`, sinon le cron rejoue le meme loueur introuvable a
//     chaque passe et brule le quota.
//  3. Une panne (reseau, quota, cle refusee) n ecrit RIEN : la passe suivante
//     reprend, et la note affichee reste celle du dernier relevé valide.
import { supabaseAdmin } from "./supabase-admin";
import {
  matchPlace, searchQueryFor, ratingIsPlausible, isStaleRating,
  RATING_MAX_AGE_DAYS, type PlaceCandidate,
} from "./google-rating";

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const SEARCH_FIELDS =
  "places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.formattedAddress";
const DETAILS_FIELDS =
  "id,displayName,rating,userRatingCount,googleMapsUri,websiteUri,formattedAddress";

export type RatingRefresh =
  | { status: "updated"; partnerId: number; rating: number; count: number; reason: string }
  /** Google a repondu, aucun lieu ne correspond a ce loueur avec certitude. */
  | { status: "unmatched"; partnerId: number }
  | { status: "not_found"; partnerId: number }
  /** Pas de GOOGLE_PLACES_API_KEY : aucun appel n est tente. */
  | { status: "no_key" }
  | { status: "failed"; partnerId: number; code: string };

interface PartnerRow {
  id: number;
  name: string;
  email: string | null;
  google_place_id: string | null;
}

// L API v1 rend displayName comme un objet localisable.
interface ApiPlace {
  id: string;
  displayName?: { text?: string } | null;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsUri?: string | null;
  websiteUri?: string | null;
  formattedAddress?: string | null;
}

const toCandidate = (p: ApiPlace): PlaceCandidate => ({
  id: p.id,
  displayName: p.displayName?.text ?? null,
  rating: p.rating ?? null,
  userRatingCount: p.userRatingCount ?? null,
  googleMapsUri: p.googleMapsUri ?? null,
  websiteUri: p.websiteUri ?? null,
  formattedAddress: p.formattedAddress ?? null,
});

const apiKey = (): string | null => process.env.GOOGLE_PLACES_API_KEY || null;

async function searchPlaces(query: string, key: string): Promise<PlaceCandidate[]> {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": SEARCH_FIELDS,
    },
    // regionCode ancre la recherche en Grece : sans lui, "Beepit" rend des
    // homonymes a l autre bout du monde.
    body: JSON.stringify({ textQuery: query, regionCode: "GR", languageCode: "en", maxResultCount: 10 }),
  });
  if (!res.ok) throw new Error(`places_search_${res.status}`);
  const json = (await res.json()) as { places?: ApiPlace[] };
  return (json.places ?? []).map(toCandidate);
}

async function placeDetails(placeId: string, key: string): Promise<PlaceCandidate | null> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": DETAILS_FIELDS },
  });
  // 404 : la fiche a disparu ou fusionne. On repart en recherche.
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`places_details_${res.status}`);
  return toCandidate((await res.json()) as ApiPlace);
}

/** Releve la note d un loueur et l ecrit en base. Voir les regles en tete. */
export async function refreshPartnerRating(partnerId: number): Promise<RatingRefresh> {
  const key = apiKey();
  if (!key) return { status: "no_key" };

  const { data, error } = await supabaseAdmin
    .from("car_partners")
    .select("id, name, email, google_place_id")
    .eq("id", partnerId)
    .maybeSingle();
  // Une lecture refusee (cle de service absente, droits) n est PAS un loueur
  // introuvable : la confondre ferait passer une panne pour un etat normal.
  if (error) {
    console.error("[google-rating] lecture du loueur impossible", { partnerId, error: error.message });
    return { status: "failed", partnerId, code: "db_read" };
  }
  const partner = data as PartnerRow | null;
  if (!partner) return { status: "not_found", partnerId };

  let found: PlaceCandidate | null = null;
  let reason = "place_id";
  try {
    if (partner.google_place_id) found = await placeDetails(partner.google_place_id, key);
    if (!found) {
      const candidates = await searchPlaces(searchQueryFor(partner), key);
      const match = matchPlace({ name: partner.name, email: partner.email }, candidates);
      found = match?.place ?? null;
      reason = match?.reason ?? "none";
    }
  } catch (err) {
    const code = err instanceof Error ? err.message : "places_unknown";
    console.error("[google-rating] releve impossible", { partnerId, code });
    return { status: "failed", partnerId, code };
  }

  const checkedAt = new Date().toISOString();
  if (!found || !ratingIsPlausible(found.rating, found.userRatingCount)) {
    // Horodate sans noter : le loueur ne sera pas rejoue avant la fenetre.
    await supabaseAdmin.from("car_partners")
      .update({ google_rating_at: checkedAt }).eq("id", partnerId);
    return { status: "unmatched", partnerId };
  }

  await supabaseAdmin.from("car_partners").update({
    google_place_id: found.id,
    google_rating: found.rating,
    google_rating_count: found.userRatingCount,
    google_maps_url: found.googleMapsUri ?? null,
    google_rating_at: checkedAt,
  }).eq("id", partnerId);

  return {
    status: "updated", partnerId,
    rating: found.rating as number, count: found.userRatingCount as number, reason,
  };
}

export interface SweepResult {
  checked: number;
  updated: number;
  unmatched: number;
  failed: number;
  skipped: number;
  disabled?: true;
  /** Lecture du registre impossible : la passe n a rien vu, elle ne vaut rien. */
  error?: string;
}

/**
 * Passe de rafraichissement : loueurs ACTIFS dont la note a passe la fenetre.
 * Les prospects non actifs ne sont pas releves automatiquement (ils sont des
 * dizaines et ne recoivent aucune demande) ; le bouton du back-office permet
 * de relever n importe lequel a la main.
 */
export async function refreshStaleRatings(
  { limit = 50, maxAgeDays = RATING_MAX_AGE_DAYS, now = new Date() } = {},
): Promise<SweepResult> {
  const out: SweepResult = { checked: 0, updated: 0, unmatched: 0, failed: 0, skipped: 0 };
  if (!apiKey()) return { ...out, disabled: true };

  const { data, error } = await supabaseAdmin
    .from("car_partners")
    .select("id, google_rating_at")
    .eq("active", true)
    .order("id", { ascending: true });

  // Sans ce garde, une lecture refusee rendait « 0 loueur verifie, tout va
  // bien » : indiscernable d un roster deja a jour.
  if (error) {
    console.error("[google-rating] lecture du registre impossible", { error: error.message });
    return { ...out, error: error.message };
  }

  const rows = (data ?? []) as Array<{ id: number; google_rating_at: string | null }>;
  for (const row of rows) {
    if (!isStaleRating(row.google_rating_at, now, maxAgeDays)) { out.skipped++; continue; }
    if (out.checked >= limit) { out.skipped++; continue; }
    out.checked++;
    const res = await refreshPartnerRating(row.id);
    if (res.status === "updated") out.updated++;
    else if (res.status === "unmatched") out.unmatched++;
    else out.failed++;
  }
  return out;
}
