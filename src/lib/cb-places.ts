import { supabase } from "./supabase";
import type { BentoTiles } from "./bento-tiles";
import { getBathingWaterQuality, type WaterQuality } from "./bathing-water";

// Places scraped from cretanbeaches.com (cb_places table).
// List payload excludes `description` (heavy); the explorer drawer
// fetches the full row on demand via getCbPlaceBySlug.

export interface CbPlaceListItem {
  slug: string;
  name: string;
  place_type: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  prefecture: string | null;
  water_color: string | null;
  sand_type: string | null;
  depth: string | null;
  sea_surface: string | null;
  crowds: string | null;
  facilities: string | null;
  accessibility: string | null;
  photos: string[] | null;
  photo_count: number;
  // Classement EU 2025 de l'eau de baignade (plages avec point de mesure EEA proche), sinon null.
  water_quality: WaterQuality | null;
}

// Rattache le classement EEA aux plages uniquement (les zones de baignade EEA
// sont des plages ; un lieu intérieur n'a pas de mesure).
function withWaterQuality<T extends { place_type: string; latitude: number | null; longitude: number | null; name: string }>(
  p: T,
): T & { water_quality: WaterQuality | null } {
  const water_quality =
    p.place_type === "beach" ? getBathingWaterQuality(p.latitude, p.longitude, p.name) : null;
  return { ...p, water_quality };
}

export interface CbPlace extends CbPlaceListItem {
  meta_description: string | null;
  description: string | null;
  other_info: string | null;
  source_url: string | null;
  bento_tiles: BentoTiles | null;
}

const LIST_FIELDS =
  "slug, name, place_type, category, latitude, longitude, rating, prefecture, water_color, sand_type, depth, sea_surface, crowds, facilities, accessibility, photos, photo_count";

type CbPlaceListRaw = Omit<CbPlaceListItem, "water_quality">;
type CbPlaceRaw = Omit<CbPlace, "water_quality">;

export async function getAllCbPlaces(): Promise<CbPlaceListItem[]> {
  // PostgREST caps responses at 1000 rows by default: page through.
  const all: CbPlaceListItem[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("cb_places")
      .select(LIST_FIELDS)
      .order("slug")
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data as unknown as CbPlaceListRaw[]) || [];
    all.push(...batch.map(withWaterQuality));
    if (batch.length < 1000) break;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Payload slim pour /explore (Lot 3 perf).
//
// La liste de l'explorateur (2294 lieux) est sérialisée dans le flight RSC :
// elle ne doit contenir QUE les champs consommés par la liste, les filtres,
// le tri et les pins carte. Le drawer de détail re-fetch la full row côté
// client via getCbPlaceBySlug (select *) : les champs riches (description,
// depth, sea_surface, facilities, accessibility...) n'ont rien à faire ici.

export interface CbPlaceSlim {
  slug: string;
  name: string;
  place_type: string;
  // Jamais sélectionné en DB (toujours null pour un lieu) : présent car les
  // cartes partenaires synthétiques d'ExploreView renseignent ce champ.
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  // Normalisé côté serveur : "Chania" | "Rethymnon" | "Heraklion" | "Lassithi"
  // (la valeur brute "X Prefecture, West Crete, ..." pèse ~55 B/lieu ; la liste
  // ne fait que detectPrefecture() dessus, qui matche par .includes()).
  prefecture: string | null;
  water_color: string | null;
  sand_type: string | null;
  crowds: string | null;
  photos: string[] | null; // première photo uniquement
  photo_count: number;
  water_quality: WaterQuality | null;
}

const SLIM_FIELDS =
  "slug, name, place_type, latitude, longitude, rating, prefecture, water_color, sand_type, crowds, first_photo:photos->0, photo_count";

interface CbPlaceSlimRaw {
  slug: string;
  name: string;
  place_type: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  prefecture: string | null;
  water_color: string | null;
  sand_type: string | null;
  crowds: string | null;
  first_photo: string | null;
  photo_count: number;
}

export const PREFECTURE_NAMES = ["Chania", "Rethymnon", "Heraklion", "Lassithi"] as const;

// Même sémantique que detectPrefecture() côté ExploreView (match .includes) :
// normaliser ici est donc invariant pour les filtres et l'affichage de la liste.
function normalizePrefecture(raw: string | null): string | null {
  if (!raw) return null;
  for (const p of PREFECTURE_NAMES) if (raw.includes(p)) return p;
  return null;
}

// Slim variant for /explore: named-column SELECT (photos réduit à la première
// entrée via `photos->0`, colonnes drawer-only exclues). The drawer fetches
// the full row via getCbPlaceBySlug (select *) on demand.
export async function getAllCbPlacesSlim(): Promise<CbPlaceSlim[]> {
  // PostgREST caps responses at 1000 rows by default: page through.
  const all: CbPlaceSlim[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("cb_places")
      .select(SLIM_FIELDS)
      .order("slug")
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data as unknown as CbPlaceSlimRaw[]) || [];
    all.push(
      ...batch.map(({ first_photo, ...r }) =>
        withWaterQuality({
          ...r,
          category: null,
          prefecture: normalizePrefecture(r.prefecture),
          photos: first_photo ? [first_photo] : null,
        }),
      ),
    );
    if (batch.length < 1000) break;
  }
  return all;
}

// --- Format "packé" pour le passage serveur → client -----------------------
// Le flight RSC sérialise chaque objet avec ses clés : ~14 clés × 2294 lieux
// ≈ 400 KB de clés répétées. On emballe donc chaque lieu en tuple positionnel
// + tables de dédup (place_type, water_quality), et ExploreView déballe en
// CbPlaceSlim[] dans un useMemo au mount. Les photos hébergées sur
// media.crete.direct/places/<slug>/ sont réduites à leur nom de fichier.

export type CbPlaceTuple = [
  slug: string,
  name: string,
  typeIdx: number, // index dans CbPlacesPacked.types
  latitude: number | null,
  longitude: number | null,
  rating: number | null,
  prefIdx: number, // index dans PREFECTURE_NAMES, -1 = null
  water_color: string | null,
  sand_type: string | null,
  crowds: string | null,
  photo: string | null, // nom de fichier (relatif à PHOTO_BASE/<slug>/) ou URL complète
  photo_count: number,
  wqIdx: number, // index dans CbPlacesPacked.wq, -1 = null
];

export interface CbPlacesPacked {
  types: string[];
  wq: WaterQuality[];
  items: CbPlaceTuple[];
}

export const EMPTY_PACKED_PLACES: CbPlacesPacked = { types: [], wq: [], items: [] };

const PHOTO_BASE = "https://media.crete.direct/places";

export function packCbPlaces(places: CbPlaceSlim[]): CbPlacesPacked {
  const types: string[] = [];
  const typeIdx = new Map<string, number>();
  const wq: WaterQuality[] = [];
  const wqIdx = new Map<string, number>();
  const items = places.map((p): CbPlaceTuple => {
    let ti = typeIdx.get(p.place_type);
    if (ti === undefined) {
      ti = types.length;
      types.push(p.place_type);
      typeIdx.set(p.place_type, ti);
    }
    let wi = -1;
    if (p.water_quality) {
      const key = JSON.stringify(p.water_quality);
      const existing = wqIdx.get(key);
      if (existing === undefined) {
        wi = wq.length;
        wq.push(p.water_quality);
        wqIdx.set(key, wi);
      } else {
        wi = existing;
      }
    }
    const photoUrl = p.photos?.[0] ?? null;
    const prefix = `${PHOTO_BASE}/${p.slug}/`;
    const photo = photoUrl && photoUrl.startsWith(prefix) ? photoUrl.slice(prefix.length) : photoUrl;
    return [
      p.slug,
      p.name,
      ti,
      p.latitude,
      p.longitude,
      p.rating,
      p.prefecture ? PREFECTURE_NAMES.indexOf(p.prefecture as (typeof PREFECTURE_NAMES)[number]) : -1,
      p.water_color,
      p.sand_type,
      p.crowds,
      photo,
      p.photo_count,
      wi,
    ];
  });
  return { types, wq, items };
}

export function unpackCbPlaces(packed: CbPlacesPacked): CbPlaceSlim[] {
  return packed.items.map(
    ([slug, name, ti, latitude, longitude, rating, pi, water_color, sand_type, crowds, photo, photo_count, wi]) => ({
      slug,
      name,
      place_type: packed.types[ti],
      category: null,
      latitude,
      longitude,
      rating,
      prefecture: pi >= 0 ? PREFECTURE_NAMES[pi] : null,
      water_color,
      sand_type,
      crowds,
      photos: photo ? [photo.startsWith("http") ? photo : `${PHOTO_BASE}/${slug}/${photo}`] : null,
      photo_count,
      water_quality: wi >= 0 ? packed.wq[wi] : null,
    }),
  );
}

export async function getCbPlaceBySlug(slug: string): Promise<CbPlace | null> {
  const { data, error } = await supabase
    .from("cb_places")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) return null;
  return withWaterQuality(data as unknown as CbPlaceRaw);
}
