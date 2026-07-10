// Estimation taxi au compteur (tarif reglemente grec hors agglomeration).
// Pur, zero I/O : importable client (JourneyPlanner), serveur (page paire)
// et node (scripts/check-taxi-fare.mjs).
// Spec : docs/superpowers/specs/2026-06-10-taxi-partners-design.md
//
// Methode : haversine entre coords des slugs x ROAD_FACTOR (routes cretoises
// sinueuses, calibre sur 7 distances routieres connues) x tarif 2 (~1,25 EUR/km
// 2026) + prise en charge. Fourchette volontairement large [x0.80, x1.25] :
// c'est une estimation indicative, jamais un prix annonce.

// Extension .ts explicite : requis par node type-stripping (check-taxi-fare.mjs),
// permis par allowImportingTsExtensions (tsconfig).
import { haversineKm } from "./geo.ts";

export const TAXI_TARIFF = {
  pickup: 1.8,      // prise en charge
  perKm: 1.25,      // tarif 2 (hors agglomeration), EUR/km
  minFare: 10,      // plancher affiche pour un trajet intercite
  roadFactor: 1.45, // route reelle / haversine, calibre (check-taxi-fare)
  low: 0.8,         // bornes de la fourchette autour de l'estimation
  high: 1.25,
} as const;

// Coordonnees par slug de BUS_PLACE_SLUGS (est : PLACE_COORDS du scraper
// prices.py ; ouest : curation OSM 10/06/2026).
export const SLUG_COORDS: Record<string, [number, number]> = {
  // Est (herlas)
  "heraklion": [35.3387, 25.1442],
  "agios-nikolaos": [35.1909, 25.7136],
  "ierapetra": [35.0114, 25.7411],
  "sitia": [35.2078, 26.1029],
  "malia": [35.2853, 25.4624],
  "hersonissos": [35.3186, 25.3928],
  "matala": [34.9959, 24.7492],
  "moires": [35.0511, 24.8728],
  "anogeia": [35.2899, 24.8826],
  "ano-viannos": [35.0461, 25.4067],
  "kokkini-hani": [35.3306, 25.2419],
  "elounda": [35.2576, 25.7204],
  "kritsa": [35.1601, 25.6471],
  "makry-gyalos": [35.0394, 25.9728],
  "myrtos": [35.0042, 25.5879],
  "mochos": [35.2864, 25.4427],
  "stalida": [35.2937, 25.4378],
  "sisi": [35.3092, 25.5237],
  "gouves": [35.3271, 25.3066],
  "tympaki": [35.0719, 24.7681],
  "agia-galini": [35.0967, 24.6906],
  "phaistos": [35.0514, 24.8136],
  "arkalochori": [35.1481, 25.2622],
  "kastelli-pediados": [35.2069, 25.3361],
  "archanes": [35.2381, 25.1611],
  "thrapsano": [35.2167, 25.2833],
  "myrtia": [35.2433, 25.2103],
  "zakros": [35.0989, 26.2186],
  "palekastro": [35.1986, 26.2486],
  "ziros": [35.0931, 26.1306],
  "mochlos": [35.1856, 25.9061],
  "kalo-chorio": [35.1497, 25.7956],
  "ferma": [35.0119, 25.8003],
  "mesochorio": [35.0394, 25.355],
  "demati": [35.0617, 25.3083],
  "krousonas": [35.2306, 24.9617],
  "kamares": [35.1392, 24.8294],
  "cretaquarium": [35.3325, 25.2792],
  "plaka": [35.2828, 25.7367],
  "kroustas": [35.1392, 25.6442],
  "avgeniki": [35.2106, 25.0806],
  // Ouest (ektel)
  "chania": [35.5138, 24.018],
  "platanias": [35.5167, 23.9089],
  "rethymno": [35.3644, 24.4821],
  "chania-airport": [35.5317, 24.1497],
  "kissamos": [35.4944, 23.6558],
  "elafonissi": [35.2706, 23.54],
  "paleochora": [35.2261, 23.6786],
  "sougia": [35.2486, 23.8089],
  "chora-sfakion": [35.2008, 24.1364],
  "georgioupolis": [35.3617, 24.2581],
  "kavros": [35.3681, 24.2767],
  "bali": [35.4106, 24.7831],
  "plakias": [35.1894, 24.3992],
  "almyrida": [35.4569, 24.1614],
  "kalyves": [35.4628, 24.1283],
  "stavros": [35.5919, 24.0958],
  "panormo": [35.4144, 24.6906],
  "margarites": [35.3247, 24.6594],
  "theriso": [35.3486, 23.9931],
  "meskla": [35.3672, 23.9347],
  "vamos": [35.4072, 24.2003],
  "spili": [35.2128, 24.5364],
  "perama": [35.3681, 24.7],
  "anogeia-west": [35.2899, 24.8826],
  "voukolies": [35.4642, 23.7853],
  "sternes": [35.4789, 24.0731],
  "maleme": [35.5219, 23.8289],
  "arkadi": [35.31, 24.6289],
  "ano-meros": [35.2517, 24.6592],
};

export interface TaxiFareRange {
  low: number;  // EUR, arrondi aux 5
  high: number; // EUR, arrondi aux 5
  km: number;   // distance route estimee, arrondie
}

const round5 = (n: number) => Math.round(n / 5) * 5;

export function taxiFareRange(slugA: string, slugB: string): TaxiFareRange | null {
  const ca = SLUG_COORDS[slugA];
  const cb = SLUG_COORDS[slugB];
  if (!ca || !cb || slugA === slugB) return null;
  const km = haversineKm(ca, cb) * TAXI_TARIFF.roadFactor;
  const meter = km * TAXI_TARIFF.perKm + TAXI_TARIFF.pickup;
  const low = Math.max(TAXI_TARIFF.minFare, round5(meter * TAXI_TARIFF.low));
  const high = Math.max(low + 5, round5(meter * TAXI_TARIFF.high));
  return { low, high, km: Math.round(km) };
}
