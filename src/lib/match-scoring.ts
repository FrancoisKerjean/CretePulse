// Logique pure du deck de match (/match) : profil de goûts, scoring,
// pool stratifié côté serveur, échantillonnage côté client.
// Spec : docs/superpowers/specs/2026-06-11-match-swipe-design.md
// Aucune dépendance React ni Supabase : fonctions pures uniquement.

import type { CbPlaceListItem } from "./cb-places";
import { haversineKm, type GeoPos } from "./geo.ts";

// Carte légère envoyée au client : ni description (copyright), ni champs lourds.
export interface MatchPlace {
  slug: string;
  name: string;
  place_type: string;
  prefecture: string | null;
  rating: number | null;
  water_color: string | null;
  sand_type: string | null;
  crowds: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
}

// Profil de goûts : poids par clé d'attribut ("type:beach", "pref:Lassithi"...).
export type TasteProfile = Record<string, number>;

const LIKE_WEIGHT = 1;
const PASS_WEIGHT = -0.5;
const TYPE_CAP_RATIO = 0.25; // un type ne dépasse jamais ~25 % du pool

export const NEAR_RATIO = 0.65; // part du deck ancrée localement
const NEAR_RADII_KM = [40, 70, 100]; // rayon adaptatif
const NEAR_MIN_PLACES = 25; // en dessous, on élargit le rayon

// Slugs du pool dans le premier rayon contenant au moins `min` lieux.
// Set vide = pool trop clairsemé autour de pos, pas de pondération.
export function nearSlugs(
  pool: MatchPlace[],
  pos: GeoPos,
  radii: number[] = NEAR_RADII_KM,
  min = NEAR_MIN_PLACES,
): Set<string> {
  const withKm: { slug: string; km: number }[] = [];
  for (const p of pool) {
    if (p.latitude == null || p.longitude == null) continue;
    withKm.push({ slug: p.slug, km: haversineKm([p.latitude, p.longitude], [pos.lat, pos.lon]) });
  }
  for (const r of radii) {
    const inRadius = withKm.filter((x) => x.km <= r);
    if (inRadius.length >= min) return new Set(inRadius.map((x) => x.slug));
  }
  return new Set();
}

export function emptyProfile(): TasteProfile {
  return {};
}

export function attrKeys(p: MatchPlace): string[] {
  const keys = [`type:${p.place_type}`];
  if (p.prefecture) keys.push(`pref:${p.prefecture}`);
  if (p.water_color) keys.push(`water:${p.water_color}`);
  if (p.sand_type) keys.push(`sand:${p.sand_type}`);
  if (p.crowds) keys.push(`crowds:${p.crowds}`);
  return keys;
}

export function updateProfile(profile: TasteProfile, place: MatchPlace, liked: boolean): TasteProfile {
  const w = liked ? LIKE_WEIGHT : PASS_WEIGHT;
  const next = { ...profile };
  for (const k of attrKeys(place)) next[k] = (next[k] || 0) + w;
  return next;
}

// Score moyen par attribut (évite de favoriser les lieux riches en attributs),
// la note départage les ex aequo.
export function scorePlace(profile: TasteProfile, place: MatchPlace): number {
  const keys = attrKeys(place);
  let sum = 0;
  for (const k of keys) sum += profile[k] || 0;
  return sum / keys.length + (place.rating || 0) / 20;
}

export function pickMatch(profile: TasteProfile, candidates: MatchPlace[]): MatchPlace | null {
  let best: MatchPlace | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = scorePlace(profile, c);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

// Fisher-Yates : MUTE et retourne arr. Passer une copie ([...arr]) si
// l'original doit être préservé (cf. sampleDeck).
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toMatchPlace(p: CbPlaceListItem): MatchPlace {
  return {
    slug: p.slug,
    name: p.name,
    place_type: p.place_type,
    prefecture: p.prefecture,
    rating: p.rating,
    water_color: p.water_color,
    sand_type: p.sand_type,
    crowds: p.crowds,
    latitude: p.latitude,
    longitude: p.longitude,
    photos: (p.photos || []).slice(0, 3),
  };
}

// Centres d'intérêt (onboarding V1.1) : groupes de types cochables.
// Les labels localisés vivent dans MatchDeck (UI) ; ici la logique pure.
// Les types absents de tout groupe (activity...) restent en « découverte ».
export const INTEREST_GROUPS: { key: string; types: string[] }[] = [
  { key: "beaches", types: ["beach"] },
  { key: "nature", types: ["gorge", "waterfall", "river", "lake", "natural-park", "forest", "plateau", "mountain", "nature", "flora", "fauna"] },
  { key: "monasteries", types: ["monastery", "church"] },
  { key: "history", types: ["historical-site", "archaeological-site", "fort", "mythology", "tradition"] },
  { key: "caves", types: ["cave", "geological"] },
  { key: "towns", types: ["town"] },
  { key: "museums", types: ["museum"] },
  { key: "islands", types: ["island", "lighthouse"] },
];

// Types couverts par une sélection de groupes.
export function interestTypes(groups: string[]): Set<string> {
  const out = new Set<string>();
  for (const g of INTEREST_GROUPS) {
    if (groups.includes(g.key)) for (const t of g.types) out.add(t);
  }
  return out;
}

// Seed du profil de goûts : +1 sur chaque type des groupes cochés.
export function seedProfile(groups: string[], base: TasteProfile): TasteProfile {
  const next = { ...base };
  for (const t of interestTypes(groups)) next[`type:${t}`] = (next[`type:${t}`] || 0) + 1;
  return next;
}

// Côté serveur (ISR 24h) : pool stratifié de `size` lieux éligibles.
// Éligible = au moins une photo, et note >= 3.5 quand elle existe.
// Chaque type est plafonné (sinon 641 monastères écrasent le deck).
export function buildMatchPool(places: CbPlaceListItem[], size = 140): MatchPlace[] {
  const eligible = places.filter(
    (p) =>
      // Garde anti-artefacts de scraping : cb_places contient des slugs
      // poubelles type "'+location.href+'" qui casseraient le deep-link.
      /^[a-z0-9_-]+$/i.test(p.slug) &&
      p.photo_count > 0 &&
      Array.isArray(p.photos) &&
      p.photos.length > 0 &&
      (p.rating == null || p.rating >= 3.5),
  );
  const byType = new Map<string, CbPlaceListItem[]>();
  for (const p of eligible) {
    const arr = byType.get(p.place_type) || [];
    arr.push(p);
    byType.set(p.place_type, arr);
  }
  const cap = Math.ceil(size * TYPE_CAP_RATIO);
  const picked: CbPlaceListItem[] = [];
  for (const arr of byType.values()) {
    arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    picked.push(...arr.slice(0, cap));
  }
  shuffle(picked);
  return picked.slice(0, size).map(toMatchPlace);
}

// Pondération intérêts (75/25) sur un ensemble de candidats. Logique
// historique de sampleDeck, extraite pour être appliquée par moitié near/far.
function pickWeighted(candidates: MatchPlace[], size: number, preferred?: Set<string>): MatchPlace[] {
  if (!preferred || preferred.size === 0) return shuffle([...candidates]).slice(0, size);
  const wanted = shuffle(candidates.filter((p) => preferred.has(p.place_type)));
  const discovery = shuffle(candidates.filter((p) => !preferred.has(p.place_type)));
  const wantedCount = Math.min(wanted.length, Math.round(size * 0.75));
  const picked = [
    ...wanted.slice(0, wantedCount),
    ...discovery.slice(0, size - wantedCount),
  ];
  // Si la découverte ne suffit pas à remplir, on complète avec le reste des préférés.
  if (picked.length < size) picked.push(...wanted.slice(wantedCount, wantedCount + size - picked.length));
  return picked;
}

// Côté client : deck par visiteur, en excluant les lieux déjà vus.
// S'il reste moins de 30 cartes non vues, on repart de zéro pour
// garantir un deck complet.
// `preferred` (types des centres d'intérêt) : ~75 % du deck vient de ces
// types, le reste est de la découverte. Vide ou absent = pas de pondération.
// `near` (slugs proches de la position) : ~65 % du deck vient de ce set,
// le reste = découverte toute l'île ; la pondération intérêts s'applique
// dans chaque moitié. Vide ou absent = pas de pondération géo.
export function sampleDeck(
  pool: MatchPlace[],
  size: number,
  seen: Set<string>,
  preferred?: Set<string>,
  near?: Set<string>,
): MatchPlace[] {
  let candidates = pool.filter((p) => !seen.has(p.slug));
  if (candidates.length < Math.min(size, 30)) candidates = [...pool];
  if (!near || near.size === 0) return shuffle(pickWeighted(candidates, size, preferred));

  const nearC = candidates.filter((p) => near.has(p.slug));
  const farC = candidates.filter((p) => !near.has(p.slug));
  const nearCount = Math.min(nearC.length, Math.round(size * NEAR_RATIO));
  const picked = [
    ...pickWeighted(nearC, nearCount, preferred),
    ...pickWeighted(farC, size - nearCount, preferred),
  ];
  // Complétion croisée : si une moitié n'a pas pu remplir sa part.
  if (picked.length < size) {
    const pickedSlugs = new Set(picked.map((p) => p.slug));
    const rest = shuffle(candidates.filter((p) => !pickedSlugs.has(p.slug)));
    picked.push(...rest.slice(0, size - picked.length));
  }
  return shuffle(picked);
}
