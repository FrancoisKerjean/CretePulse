// Croisement plage ↔ réseau bus, pour le bloc "y aller en bus" des pages
// plages. Serveur uniquement (Supabase). Deux niveaux, jamais inventés :
// - l'arrêt physique le plus proche (bus_stops, 1550 arrêts géocodés :
//   citybus Heraklion/Chania, agncitybus Agios Nikolaos, osm, ktel) ;
// - la destination interurbaine desservie la plus proche (bus_destinations),
//   reliée aux pages horaires /buses/[pair] via la whitelist BUS_PLACE_SLUGS.
// Spec : docs/SPEC-BEACHES-DATA.md (lot 1)
import { supabase } from "./supabase";
import { haversineKm } from "./geo";
import { getBusRoutes } from "./buses";
import { eligiblePairs, slugifyPlace, BUS_PLACE_SLUGS } from "./bus-pairs";

/** Rayon max pour proposer un arrêt physique (au-delà, le bus n'est pas un accès réaliste). */
const STOP_RADIUS_KM = 8;
/** Rayon max pour rattacher la plage à une destination interurbaine (référence taxi, cf swim-today). */
const DEST_RADIUS_KM = 15;
/** Un arrêt urbain n'est cité comme "réseau de ville" que si la plage est en zone urbaine. */
const URBAN_RADIUS_KM = 4;

export type UrbanCity = "heraklion" | "chania" | "agios-nikolaos";

export interface BeachBusInfo {
  /** Arrêt physique le plus proche (distance à vol d'oiseau). */
  stop: { name: string; km: number } | null;
  /** Réseau urbain couvrant la plage, si l'arrêt proche en fait partie. */
  urban: { city: UrbanCity; km: number } | null;
  /** Destination interurbaine desservie la plus proche. */
  destination: { name: string; slug: string; km: number; hasDirectBus: boolean } | null;
  /** Pages horaires /buses/[pair] pertinentes (hub ↔ destination proche), max 2. */
  pairs: Array<{ slug: string; fromName: string; toName: string }>;
}

interface StopRow {
  name: string;
  lat: number | null;
  lng: number | null;
  prefecture: string | null;
  coords_source: string | null;
}

interface DestRow {
  slug: string;
  name: string;
  lat: number | null;
  lng: number | null;
  has_direct_bus: boolean;
}

function urbanCityOf(stop: StopRow): UrbanCity | null {
  if (stop.coords_source === "agncitybus") return "agios-nikolaos";
  if (stop.coords_source === "citybus") {
    if (stop.prefecture === "HER") return "heraklion";
    if (stop.prefecture === "CHA") return "chania";
  }
  return null;
}

/** Hubs interurbains, par pertinence décroissante pour un lien "depuis la ville". */
const HUB_SLUGS = ["heraklion", "chania", "rethymno", "agios-nikolaos", "ierapetra", "sitia"];

export async function getBeachBusInfo(lat: number, lng: number): Promise<BeachBusInfo> {
  const empty: BeachBusInfo = { stop: null, urban: null, destination: null, pairs: [] };
  try {
    // Bounding box côté PostgREST : évite de rapatrier les 1550 arrêts (et la
    // limite de 1000 lignes par requête) pour un simple plus-proche-voisin.
    const dStop = STOP_RADIUS_KM / 111;
    const dDest = DEST_RADIUS_KM / 111;
    const [stopsRes, destsRes] = await Promise.all([
      supabase
        .from("bus_stops")
        .select("name, lat, lng, prefecture, coords_source")
        .gte("lat", lat - dStop).lte("lat", lat + dStop)
        .gte("lng", lng - dStop).lte("lng", lng + dStop),
      supabase
        .from("bus_destinations")
        .select("slug, name, lat, lng, has_direct_bus")
        .gte("lat", lat - dDest).lte("lat", lat + dDest)
        .gte("lng", lng - dDest).lte("lng", lng + dDest),
    ]);

    let stop: BeachBusInfo["stop"] = null;
    let urban: BeachBusInfo["urban"] = null;
    let bestStopKm = Infinity;
    for (const s of (stopsRes.data as StopRow[] | null) ?? []) {
      if (s.lat === null || s.lng === null) continue;
      const km = haversineKm([s.lat, s.lng], [lat, lng]);
      if (km <= STOP_RADIUS_KM && km < bestStopKm) {
        bestStopKm = km;
        stop = { name: s.name, km: Math.round(km * 10) / 10 };
        const city = urbanCityOf(s);
        urban = city && km <= URBAN_RADIUS_KM ? { city, km: stop.km } : null;
      }
    }

    let destination: BeachBusInfo["destination"] = null;
    let bestDestKm = Infinity;
    for (const d of (destsRes.data as DestRow[] | null) ?? []) {
      if (d.lat === null || d.lng === null) continue;
      // Seules les destinations de la whitelist ont une page /buses/[pair].
      if (!Object.values(BUS_PLACE_SLUGS).includes(d.slug)) continue;
      const km = haversineKm([d.lat, d.lng], [lat, lng]);
      if (km <= DEST_RADIUS_KM && km < bestDestKm) {
        bestDestKm = km;
        destination = {
          name: d.name,
          slug: d.slug,
          km: Math.round(km * 10) / 10,
          hasDirectBus: d.has_direct_bus,
        };
      }
    }

    // Pages horaires reliant la destination proche à un hub majeur.
    let pairs: BeachBusInfo["pairs"] = [];
    if (destination) {
      const routes = await getBusRoutes();
      const all = eligiblePairs(routes);
      const dest = destination;
      const containing = all.filter((p) => {
        const sa = slugifyPlace(p.placeA);
        const sb = slugifyPlace(p.placeB);
        return sa === dest.slug || sb === dest.slug;
      });
      pairs = HUB_SLUGS
        .filter((h) => h !== dest.slug)
        .map((h) =>
          containing.find((p) => slugifyPlace(p.placeA) === h || slugifyPlace(p.placeB) === h),
        )
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .slice(0, 2)
        .map((p) => ({ slug: p.slug, fromName: p.placeA, toName: p.placeB }));
    }

    return { stop, urban, destination, pairs };
  } catch (e) {
    console.error("[beach-bus] getBeachBusInfo", e instanceof Error ? e.message : e);
    return empty;
  }
}
