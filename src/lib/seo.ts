import { routing } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

/**
 * Build alternates metadata for hreflang tags.
 * @param path - The path after locale, e.g. "/beaches/balos" or "" for home
 */
export function buildAlternates(locale: string, path: string = "") {
  const canonical = `${BASE_URL}/${locale}${path}`;
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${BASE_URL}/${loc}${path}`;
  }
  languages["x-default"] = `${BASE_URL}/en${path}`;
  return { canonical, languages };
}

// ----- Localized SEO title templates -----------------------------------
// Used when meta titles must be authored per locale (food, villages, etc.).
// Keep brand suffix consistent: "| Crete Direct" stays in latin script even
// for non-latin locales — Google uses it as a recognizable brand anchor.

type TitleVars = {
  name: string;
  region?: string | null;
  type?: string | null;
  cuisine?: string | null;
};

const FOOD_TITLE_TEMPLATES: Record<string, (v: TitleVars) => string> = {
  en: (v) =>
    `${v.name}${v.cuisine ? ` — ${v.cuisine}` : v.type ? ` — ${v.type}` : ""}${v.region ? ` in ${v.region} Crete` : " in Crete"} | Crete Direct`,
  fr: (v) =>
    `${v.name}${v.cuisine ? ` — ${v.cuisine}` : v.type ? ` — ${v.type}` : ""}${v.region ? ` à ${v.region}, Crète` : " en Crète"} | Crete Direct`,
  de: (v) =>
    `${v.name}${v.cuisine ? ` — ${v.cuisine}` : v.type ? ` — ${v.type}` : ""}${v.region ? ` in ${v.region}, Kreta` : " auf Kreta"} | Crete Direct`,
  el: (v) =>
    `${v.name}${v.cuisine ? ` — ${v.cuisine}` : ""}${v.region ? ` στην ${v.region}, Κρήτη` : " στην Κρήτη"} | Crete Direct`,
  it: (v) => `${v.name}${v.cuisine ? ` — ${v.cuisine}` : ""}${v.region ? ` a ${v.region}, Creta` : " a Creta"} | Crete Direct`,
  es: (v) => `${v.name}${v.cuisine ? ` — ${v.cuisine}` : ""}${v.region ? ` en ${v.region}, Creta` : " en Creta"} | Crete Direct`,
  pt: (v) => `${v.name}${v.cuisine ? ` — ${v.cuisine}` : ""}${v.region ? ` em ${v.region}, Creta` : " em Creta"} | Crete Direct`,
  nl: (v) => `${v.name}${v.cuisine ? ` — ${v.cuisine}` : ""}${v.region ? ` in ${v.region}, Kreta` : " op Kreta"} | Crete Direct`,
};

export function buildFoodTitle(locale: string, vars: TitleVars): string {
  const tpl = FOOD_TITLE_TEMPLATES[locale] || FOOD_TITLE_TEMPLATES.en;
  return tpl(vars);
}

const VILLAGE_TITLE_TEMPLATES: Record<string, (name: string, region?: string | null) => string> = {
  en: (n, r) => `${n}${r ? `, ${r}` : ""}, Crete — Village Guide | Crete Direct`,
  fr: (n, r) => `${n}${r ? `, ${r}` : ""}, Crète — Guide du village | Crete Direct`,
  de: (n, r) => `${n}${r ? `, ${r}` : ""}, Kreta — Dorfführer | Crete Direct`,
  el: (n, r) => `${n}${r ? `, ${r}` : ""}, Κρήτη — Οδηγός χωριού | Crete Direct`,
  it: (n, r) => `${n}${r ? `, ${r}` : ""}, Creta — Guida del villaggio | Crete Direct`,
  es: (n, r) => `${n}${r ? `, ${r}` : ""}, Creta — Guía del pueblo | Crete Direct`,
  pt: (n, r) => `${n}${r ? `, ${r}` : ""}, Creta — Guia da aldeia | Crete Direct`,
  nl: (n, r) => `${n}${r ? `, ${r}` : ""}, Kreta — Dorpsgids | Crete Direct`,
};

export function buildVillageTitle(locale: string, name: string, region?: string | null): string {
  const tpl = VILLAGE_TITLE_TEMPLATES[locale] || VILLAGE_TITLE_TEMPLATES.en;
  return tpl(name, region);
}

const VILLAGE_DESC_TEMPLATES: Record<string, (name: string, region?: string | null) => string> = {
  en: (n, r) => `${n}${r ? `, ${r}` : ""} village in Crete: history, what to see, how to get there and nearby beaches.`,
  fr: (n, r) => `Village de ${n}${r ? `, ${r}` : ""} en Crète : histoire, à voir, comment s'y rendre et plages à proximité.`,
  de: (n, r) => `Dorf ${n}${r ? `, ${r}` : ""} auf Kreta: Geschichte, Sehenswürdigkeiten, Anreise und Strände in der Nähe.`,
  el: (n, r) => `Το χωριό ${n}${r ? `, ${r}` : ""} στην Κρήτη: ιστορία, αξιοθέατα, πρόσβαση και κοντινές παραλίες.`,
  it: (n, r) => `${n}${r ? `, ${r}` : ""}, villaggio di Creta: storia, cosa vedere, come arrivare e spiagge vicine.`,
  es: (n, r) => `Pueblo de ${n}${r ? `, ${r}` : ""} en Creta: historia, qué ver, cómo llegar y playas cercanas.`,
};

export function buildVillageDescription(locale: string, name: string, region?: string | null): string {
  const tpl = VILLAGE_DESC_TEMPLATES[locale] || VILLAGE_DESC_TEMPLATES.en;
  return tpl(name, region);
}
