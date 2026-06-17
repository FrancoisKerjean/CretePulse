// Qualité de l'eau de baignade (Directive UE 2006/7/CE), saison 2025.
// Source : Agence européenne pour l'environnement (EEA), "European bathing
// water quality in 2025" (publié 16/06/2026), extrait du service ArcGIS
// officiel BathingWater_Dyna_WM_2025. Données figées : src/data/bathing-water-crete-2025.json.
//
// On rattache une zone de baignade EEA à un lieu cretanbeaches par proximité
// géographique (la zone EEA EST une plage). Un lieu sans point de mesure proche
// n'a tout simplement pas de classement officiel : on ne renvoie rien plutôt
// que d'inventer (beaucoup de criques ne sont pas des zones de baignade UE).
//
// Pure, zéro I/O : importable serveur, client et node (check-bathing-water.mjs).
import data from "../data/bathing-water-crete-2025.json" with { type: "json" };

// haversine inline (km) : évite un import runtime croisé non résolu par le
// type-stripping node des tests. Identique à lib/geo.haversineKm.
function haversineKm(a: [number, number], b: [number, number]): number {
  const [lat1, lng1] = a.map((d) => (d * Math.PI) / 180);
  const [lat2, lng2] = b.map((d) => (d * Math.PI) / 180);
  const h =
    Math.sin((lat2 - lat1) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export type BathingStatus = "excellent" | "good" | "sufficient" | "poor";

export interface WaterQuality {
  status: BathingStatus;
  season: number;
  source: string;
  siteName: string;
}

export const BATHING_SEASON: number = data.season;
export const BATHING_SOURCE: string = data.source;

// Match certain : on est sur le même spot que le point de mesure.
const NEAR_KM = 0.7;
// Au-delà, on n'accepte qu'avec un recoupement de nom (même plage, point décalé).
const NAME_KM = 2.5;

// Les 4 classes officielles de la directive. "Not classified" / null => pas de badge.
const STATUS_MAP: Record<string, BathingStatus> = {
  Excellent: "excellent",
  Good: "good",
  Sufficient: "sufficient",
  Poor: "poor",
};

// Mots trop génériques pour fonder un recoupement de nom fiable.
const STOP = new Set([
  "beach", "beaches", "the", "of", "at", "in", "and", "near", "paralia",
  "bay", "cape", "golden", "sandhills", "plage", "crete",
]);

function tokens(name: string | null | undefined): Set<string> {
  return new Set(
    (name || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

interface Site {
  name: string;
  lat: number;
  lon: number;
  status: string;
  _tok: Set<string>;
}

// Index préparé une fois au chargement du module.
const SITES: Site[] = (data.sites as Array<{ name: string; lat: number; lon: number; status: string }>).map(
  (s) => ({ ...s, _tok: tokens(s.name) }),
);

function toQuality(site: Site): WaterQuality | null {
  const status = STATUS_MAP[site.status];
  if (!status) return null; // "Not classified" => pas de badge
  return { status, season: BATHING_SEASON, source: BATHING_SOURCE, siteName: site.name };
}

/**
 * Classement de l'eau de baignade 2025 pour un lieu donné, ou `null` si aucune
 * zone de baignade officielle ne lui correspond (proximité < 0,7 km, ou < 2,5 km
 * avec un nom recoupé). Ne renvoie jamais un classement inventé.
 */
export function getBathingWaterQuality(
  lat: number | null | undefined,
  lon: number | null | undefined,
  name?: string | null,
): WaterQuality | null {
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  // Candidats triés par distance croissante.
  const ranked = SITES
    .map((s) => ({ s, km: haversineKm([lat, lon], [s.lat, s.lon]) }))
    .sort((a, b) => a.km - b.km);
  if (ranked.length === 0) return null;

  // 1) Match certain par distance.
  const nearest = ranked[0];
  if (nearest.km <= NEAR_KM) return toQuality(nearest.s);

  // 2) Récupération par nom : plus proche site dans la bande qui partage un mot.
  const placeTokens = tokens(name);
  if (placeTokens.size > 0) {
    for (const { s, km } of ranked) {
      if (km > NAME_KM) break;
      for (const w of s._tok) {
        if (placeTokens.has(w)) return toQuality(s);
      }
    }
  }
  return null;
}
