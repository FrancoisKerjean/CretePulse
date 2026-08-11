// Liste FERMEE des equipements affichables : ceux qui DECIDENT d une location.
// Une cle absente ne s affiche jamais en negatif : "pas de piscine" ne se dit pas.
// L ordre du tableau EST l ordre d affichage sur la fiche, le plus differenciant
// d abord.
//
// Elargie le 11/08/2026 : les sept cles d origine venaient de ce que le scrape
// Airbnb sait remplir, alors que les annonces reelles portaient deja des
// equipements plus rares et plus vendeurs (plage privee, hammam, sauna) qui
// n avaient nulle part ou aller.
export const AMENITY_KEYS = [
  "private_beach",
  "pool",
  "sea_view",
  "hammam",
  "sauna",
  "ac",
  "wifi",
  "kitchen",
  "washer",
  "bbq",
  "parking",
  "pets",
] as const;

export type AmenityKey = (typeof AMENITY_KEYS)[number];

export function isAmenityKey(v: unknown): v is AmenityKey {
  return typeof v === "string" && (AMENITY_KEYS as readonly string[]).includes(v);
}

/**
 * Reduit un libelle a sa forme comparable : minuscules, SANS accents, espaces
 * normalises.
 *
 * ⛔ Les diacritiques ne sont pas un detail : la meme annonce ecrit "Cuisine
 * equipee" quand une autre ecrit "Cuisine équipée". Comparer avant de les gommer
 * fait rater la moitie des libelles, en silence.
 */
function comparable(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Motifs de reconnaissance des libelles libres, en forme comparable.
 *
 * Ils existent parce que les annonces publiees ne portent PAS les cles du
 * scrape mais du texte saisi a la main, en francais, avec des variantes : la
 * fiche affichait donc zero equipement sur dix-huit presents en base.
 *
 * ⛔ Motifs volontairement ETROITS. Un motif large sur "vue" transformerait
 * "Vue jardin" en vue mer : une fiche qui promet la mer sans la mer coute plus
 * cher qu une fiche sans equipements.
 */
const LABEL_PATTERNS: ReadonlyArray<[AmenityKey, RegExp]> = [
  ["private_beach", /plage privee|private beach/],
  ["pool", /piscine|swimming pool|\bpool\b/],
  ["sea_view", /vue (sur la )?mer|sea view|vue ocean/],
  ["hammam", /hammam|steam room/],
  ["sauna", /sauna/],
  ["ac", /climatisation|climatise|air conditioning|\ba\/?c\b/],
  ["wifi", /wi-?fi/],
  ["kitchen", /cuisine (equipee|amenagee)|equipped kitchen|kitchenette/],
  ["washer", /lave-linge|machine a laver|washer|washing machine/],
  ["bbq", /barbecue|\bbbq\b/],
  ["parking", /parking|place de stationnement/],
  ["pets", /animaux acceptes|pets allowed|pet friendly/],
];

/**
 * Normalise la colonne jsonb `stay_listings.amenities`, qui est du contenu non
 * verifie par le type : elle peut porter n importe quoi. On garde les cles
 * connues et les libelles reconnus, dedoublonnes, dans l ordre d affichage.
 * Ne leve jamais.
 */
export function normalizeAmenities(raw: unknown): AmenityKey[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<AmenityKey>();
  for (const item of raw) {
    if (isAmenityKey(item)) {
      seen.add(item);
      continue;
    }
    if (typeof item !== "string") continue;
    const label = comparable(item);
    for (const [key, pattern] of LABEL_PATTERNS) {
      if (pattern.test(label)) seen.add(key);
    }
  }
  return AMENITY_KEYS.filter((k) => seen.has(k));
}
