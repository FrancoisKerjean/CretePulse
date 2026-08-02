// Liste FERMEE des equipements affichables. Sept cles seulement : celles que le
// scrape Airbnb sait remplir et qui decident d une location. Une cle absente ne
// s affiche jamais en negatif : "pas de piscine" ne se dit pas.
// L ordre du tableau EST l ordre d affichage sur la fiche.
export const AMENITY_KEYS = [
  "pool",
  "sea_view",
  "ac",
  "wifi",
  "bbq",
  "parking",
  "pets",
] as const;

export type AmenityKey = (typeof AMENITY_KEYS)[number];

export function isAmenityKey(v: unknown): v is AmenityKey {
  return typeof v === "string" && (AMENITY_KEYS as readonly string[]).includes(v);
}

/**
 * Normalise la colonne jsonb `stay_listings.amenities`, qui est du contenu non
 * verifie par le type : elle peut porter n importe quoi. On garde les cles
 * connues, dedoublonnees, dans l ordre d affichage. Ne leve jamais.
 */
export function normalizeAmenities(raw: unknown): AmenityKey[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<AmenityKey>();
  for (const item of raw) if (isAmenityKey(item)) seen.add(item);
  return AMENITY_KEYS.filter((k) => seen.has(k));
}
