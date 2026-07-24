// Villes/bourgs de référence pour la tuile "distance ville". Liste curée (les
// principales agglomérations de Crète) : on veut "12 km d'Ierapetra", pas la
// distance à un hameau anonyme. Coords WGS84.
import { haversineKm } from "./geo";

export const CRETE_TOWNS: Array<{ name: string; lat: number; lon: number }> = [
  { name: "Heraklion", lat: 35.3387, lon: 25.1442 },
  { name: "Chania", lat: 35.5138, lon: 24.018 },
  { name: "Rethymno", lat: 35.3662, lon: 24.4777 },
  { name: "Agios Nikolaos", lat: 35.1894, lon: 25.7156 },
  { name: "Ierapetra", lat: 35.0107, lon: 25.7355 },
  { name: "Sitia", lat: 35.208, lon: 26.1027 },
  { name: "Hersonissos", lat: 35.3217, lon: 25.3853 },
  { name: "Malia", lat: 35.287, lon: 25.459 },
  { name: "Elounda", lat: 35.2603, lon: 25.7228 },
  { name: "Paleochora", lat: 35.228, lon: 23.684 },
  { name: "Kissamos", lat: 35.4942, lon: 23.6558 },
  { name: "Tympaki", lat: 35.07, lon: 24.766 },
  { name: "Mires", lat: 35.053, lon: 24.9 },
  { name: "Ano Viannos", lat: 35.057, lon: 25.412 },
  { name: "Arvi", lat: 34.992, lon: 25.456 },
  { name: "Spili", lat: 35.214, lon: 24.533 },
  { name: "Anogeia", lat: 35.288, lon: 24.884 },
  { name: "Zaros", lat: 35.13, lon: 24.905 },
];

export function nearestKnownTown(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { name: string; km: number } | null {
  if (lat == null || lng == null) return null;
  let best: { name: string; km: number } | null = null;
  for (const t of CRETE_TOWNS) {
    const km = haversineKm([t.lat, t.lon], [lat, lng]);
    if (!best || km < best.km) best = { name: t.name, km };
  }
  return best;
}
