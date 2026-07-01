// Types de la couche moteur "bus live" (position estimée). Aucun runtime ici.
// Spec : docs/superpowers/specs/2026-06-15-bus-live-engine-design.md
import type { BusRoute } from "../buses";

/** Arrêt d'une ligne, dans l'ordre seq 0..N, avec profil cumulatif depuis seq 0. */
export interface LiveStop {
  seq: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  cumKm: number;   // distance cumulée (km) depuis seq 0
  cumMin: number;  // minutes cumulées depuis seq 0
}

/** Ligne du réseau : tracé OSRM + profil de temps. */
export interface LiveLine {
  id: number;
  code: string;
  codeOfficial: string | null;
  source: "osm" | "ktel" | "agncitybus";
  color: string | null;         // couleur de la ligne (hex), utilisée pour le tracé (bus urbains)
  totalMinutes: number;
  lengthKm: number;
  partialGeo: boolean;
  geometry: [number, number][]; // [lng, lat] (ordre GeoJSON)
  stops: LiveStop[];            // triés par seq croissant, length >= 2
}

/** Réseau chargé, prêt pour le moteur. */
export interface LiveNetwork {
  lines: Map<number, LiveLine>;
  routes: BusRoute[]; // uniquement les routes avec line_id non-NULL
}

/** Un bus positionné à l'instant t (contrat consommé par la carte). */
export interface LiveBus {
  id: string;                // clé de course stable: `${lineId}|${direction}|${H}`
  lineId: number;
  code: string;
  codeOfficial: string | null;
  lat: number;
  lng: number;
  bearing: number;           // cap 0..360, sens de marche réel
  progress: number;          // 0..1, fraction de la course (temps)
  nextStop: string | null;
  etaMinNext: number | null;
  headsign: string;
  direction: "fwd" | "rev";
  degraded: boolean;
}

/** Bus à position GPS RÉELLE (télématique agncitybus.gr). Couche live d'Agios Nikolaos.
 *  Contrat de /api/buses/agncitybus-live consommé par la carte. */
export interface LiveGpsBus {
  id: string;        // imei (stable par véhicule)
  lineCode: string;  // AGN-1 | AGN-2 | AGN-3
  routeNum: number;
  color: string;     // hex de la ligne
  lat: number;
  lng: number;
  bearing: number;   // cap 0..360
  speed: number;     // km/h source
  plate: string | null;
  vehicle: string | null;
}
