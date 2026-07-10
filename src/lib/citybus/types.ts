// Types partagés des réseaux urbains sur la plateforme citybus.gr (Heraklion, Chania, …).
// Consommés par le moteur générique (engine.ts) et le planner générique (CitybusPlanner.tsx).
// Les data files src/data/<city>-bus.ts (générés par scripts/citybus_ingest.mjs) exportent
// un CITYBUS_DATA de ce type.

export interface CitybusStop {
  slug: string;
  apiCode?: string;   // code natif citybus.gr (ex: "500"), présent depuis re-ingest 09/07
  name: string;
  nameEl: string;
  lat: number;
  lng: number;
}

export interface CitybusLine {
  code: string;      // "HKL-01" / "CHA-11"
  apiCode: string;   // "01" / "11"
  name: string;
  nameEl: string;
  hex: string | null;
  textHex: string | null;
  totalMinutes: number;
  lengthKm: number;
}

export interface CitybusRouteStop {
  slug: string;
  seq: number;
  cumKm: number;
  cumMin: number;
}

export interface CitybusRoute {
  code: string;
  lineCode: string;
  name: string;
  direction: number | null;
  stops: CitybusRouteStop[];
}

export interface CitybusInfo {
  operator: string;
  sourceUrl: string;
  city: string;   // "Heraklion" / "Chania"
}

export interface CitybusData {
  info: CitybusInfo;
  stops: Record<string, CitybusStop>;
  lines: CitybusLine[];
  routes: CitybusRoute[];
}
