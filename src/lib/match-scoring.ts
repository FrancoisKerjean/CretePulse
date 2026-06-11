// Logique pure du deck de match (/match) : profil de goûts, scoring,
// pool stratifié côté serveur, échantillonnage côté client.
// Spec : docs/superpowers/specs/2026-06-11-match-swipe-design.md
// Aucune dépendance React ni Supabase : fonctions pures uniquement.

import type { CbPlaceListItem } from "./cb-places";

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
  photos: string[];
}

// Profil de goûts : poids par clé d'attribut ("type:beach", "pref:Lassithi"...).
export type TasteProfile = Record<string, number>;

const LIKE_WEIGHT = 1;
const PASS_WEIGHT = -0.5;
const TYPE_CAP_RATIO = 0.25; // un type ne dépasse jamais ~25 % du pool

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

// Fisher-Yates en place.
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
    photos: (p.photos || []).slice(0, 3),
  };
}

// Côté serveur (ISR 24h) : pool stratifié de `size` lieux éligibles.
// Éligible = au moins une photo, et note >= 3.5 quand elle existe.
// Chaque type est plafonné (sinon 641 monastères écrasent le deck).
export function buildMatchPool(places: CbPlaceListItem[], size = 140): MatchPlace[] {
  const eligible = places.filter(
    (p) =>
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

// Côté client : deck par visiteur, en excluant les lieux déjà vus.
// Si le pool est presque épuisé, on repart de zéro (le visiteur a tout vu).
export function sampleDeck(pool: MatchPlace[], size: number, seen: Set<string>): MatchPlace[] {
  let candidates = pool.filter((p) => !seen.has(p.slug));
  if (candidates.length < Math.min(size, 30)) candidates = [...pool];
  return shuffle([...candidates]).slice(0, size);
}
