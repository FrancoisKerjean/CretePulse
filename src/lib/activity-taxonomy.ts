// Référentiel statique de la verticale activités : catégories (miroir des
// rows activity_categories), villes, créneaux, langues de guide. Node-safe
// (importable par les check-*.mjs), zéro I/O. Les labels 4 langues servent
// wizard + emails ; les 18 autres locales vivent dans les content.ts de pages.
export const ACTIVITY_CATEGORIES = [
  { slug: "food-tours", labels: { en: "Food & wine tours", fr: "Tours gastronomiques", de: "Kulinarische Touren", el: "Γαστρονομικές περιηγήσεις" } },
  { slug: "boat-trips", labels: { en: "Boat trips", fr: "Sorties en bateau", de: "Bootsausflüge", el: "Εκδρομές με σκάφος" } },
  { slug: "hiking", labels: { en: "Hiking & nature", fr: "Randonnée & nature", de: "Wandern & Natur", el: "Πεζοπορία & φύση" } },
] as const;
export type ActivityCategorySlug = (typeof ACTIVITY_CATEGORIES)[number]["slug"];

export const ACTIVITY_CITIES = [
  { slug: "chania", labels: { en: "Chania", fr: "La Canée", de: "Chania", el: "Χανιά" } },
  { slug: "rethymno", labels: { en: "Rethymno", fr: "Réthymnon", de: "Rethymno", el: "Ρέθυμνο" } },
  { slug: "heraklion", labels: { en: "Heraklion", fr: "Héraklion", de: "Heraklion", el: "Ηράκλειο" } },
  { slug: "agios-nikolaos", labels: { en: "Agios Nikolaos", fr: "Agios Nikolaos", de: "Agios Nikolaos", el: "Άγιος Νικόλαος" } },
  { slug: "ierapetra", labels: { en: "Ierapetra", fr: "Iérapétra", de: "Ierapetra", el: "Ιεράπετρα" } },
] as const;
export type ActivityCitySlug = (typeof ACTIVITY_CITIES)[number]["slug"];

export const ACTIVITY_TIMESLOTS = ["morning", "afternoon", "evening", "flexible"] as const;
export type ActivityTimeslot = (typeof ACTIVITY_TIMESLOTS)[number];

export const GUIDE_LANGUAGES = ["en", "fr", "de", "el", "it"] as const;
export type GuideLanguage = (typeof GUIDE_LANGUAGES)[number];

export const isCategorySlug = (v: unknown): v is ActivityCategorySlug =>
  typeof v === "string" && ACTIVITY_CATEGORIES.some((c) => c.slug === v);
export const isCitySlug = (v: unknown): v is ActivityCitySlug =>
  typeof v === "string" && ACTIVITY_CITIES.some((c) => c.slug === v);
export const isTimeslot = (v: unknown): v is ActivityTimeslot =>
  typeof v === "string" && (ACTIVITY_TIMESLOTS as readonly string[]).includes(v);
export const isGuideLanguage = (v: unknown): v is GuideLanguage =>
  typeof v === "string" && (GUIDE_LANGUAGES as readonly string[]).includes(v);

export function categoryLabel(slug: string, locale: string): string {
  const c = ACTIVITY_CATEGORIES.find((x) => x.slug === slug);
  if (!c) return slug;
  return (c.labels as Record<string, string>)[locale] ?? c.labels.en;
}
export function cityLabel(slug: string, locale: string): string {
  const c = ACTIVITY_CITIES.find((x) => x.slug === slug);
  if (!c) return slug;
  return (c.labels as Record<string, string>)[locale] ?? c.labels.en;
}
