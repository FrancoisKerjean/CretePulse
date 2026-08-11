// Liste FERMEE des equipements affichables : ceux qui DECIDENT d une location.
// Une cle absente ne s affiche jamais en negatif : "pas de piscine" ne se dit pas.
// L ordre du tableau EST l ordre d affichage sur la fiche, le plus differenciant
// d abord.
//
// Elargie le 11/08/2026 : les sept cles d origine venaient de ce que le scrape
// Airbnb sait remplir, alors que les annonces reelles portaient deja des
// equipements plus rares et plus vendeurs (plage privee, hammam, sauna) qui
// n avaient nulle part ou aller. Seconde passe le meme jour, apres avoir compte
// ce que les trois annonces portent VRAIMENT : 10 libelles sur 18 etaient
// retenus sur l annonce 1.
//
// ⛔ Ce qui reste DEHORS, et pourquoi, sinon la liste se remplira de phrases
// d annonce au lieu de criteres comparables :
//   « Vue sur la baie », « Vue jardin », « Vue montagne » : ecartes par des
//     motifs volontairement etroits, voir LABEL_PATTERNS.
//   « Escalier prive vers la plage » : dit deux fois la meme chose que
//     private_beach.
//   « 200 m2 sur un niveau » : c est la colonne area_sqm, pas un equipement.
//   « Studio professionnel 90 m2 », « Gazebo en pierre », « TV satellite »,
//     « Reception parlee FR / EN / GR » : une seule annonce chacun, rien a
//     comparer d une fiche a l autre.
export const AMENITY_KEYS = [
  "private_beach",
  "pool",
  "sea_view",
  "hammam",
  "sauna",
  "terrace",
  "outdoor_shower",
  "ac",
  "wifi",
  "kitchen",
  "washer",
  "bbq",
  "workspace",
  "parking",
  "baby_gear",
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
  // Attrape aussi « Toit-terrasse » et « Terrasse vue mer ». Cette derniere
  // donne DEUX cles, terrace et sea_view : c est voulu, elle porte les deux.
  ["terrace", /terrasse|\bterrace\b/],
  ["outdoor_shower", /douche exterieure|outdoor shower/],
  ["ac", /climatisation|climatise|air conditioning|\ba\/?c\b/],
  ["wifi", /wi-?fi/],
  ["kitchen", /cuisine (equipee|amenagee)|equipped kitchen|kitchenette/],
  ["washer", /lave-linge|machine a laver|washer|washing machine/],
  ["bbq", /barbecue|\bbbq\b/],
  ["workspace", /espace de travail|bureau dedie|dedicated workspace/],
  ["parking", /parking|place de stationnement/],
  // Un seul des deux objets suffit a dire « on peut venir avec un bebe ».
  ["baby_gear", /lit bebe|chaise haute|baby cot|high ?chair/],
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
