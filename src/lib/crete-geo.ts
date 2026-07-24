// Projection lat/lng -> coords % sur une mini-carte de Crète (origine en haut-gauche,
// y inversé pour que le nord soit en haut). BBOX = enveloppe approx. de la Crète.

export const CRETE_BBOX = { west: 23.45, east: 26.35, south: 34.80, north: 35.70 };

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function projectCreteLatLng(lat: number, lng: number): { x: number; y: number } {
  const { west, east, south, north } = CRETE_BBOX;
  const x = ((lng - west) / (east - west)) * 100;
  const y = ((north - lat) / (north - south)) * 100;
  return { x: clamp(x), y: clamp(y) };
}

export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  const table: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"],
    [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"],
    [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let rest = Math.floor(n);
  for (const [val, sym] of table) {
    while (rest >= val) { out += sym; rest -= val; }
  }
  return out;
}
