/**
 * Mapping between URL slug (lowercase latin) and the Greek neighbourhood
 * label stored in airbnb_listings.neighbourhood, plus localized display
 * names for the 4 primary languages (en/fr/de/el).
 *
 * Inside Airbnb stores Crete municipalities ("dimoi") in Greek. We expose
 * them on crete.direct under stable English slugs.
 */

export type Loc = "en" | "fr" | "de" | "el";

export interface NeighbourhoodMap {
  slug: string;            // URL slug, lowercase ASCII
  greek: string;           // exact value in airbnb_listings.neighbourhood
  region: "chania" | "rethymno" | "heraklion" | "lasithi";
  label: Record<Loc, string>;
}

export const CRETE_NEIGHBOURHOODS: NeighbourhoodMap[] = [
  // CHANIA region
  { slug: "chania",          greek: "Χανίων",            region: "chania",
    label: { en: "Chania",          fr: "La Canée",         de: "Chania",          el: "Χανίων" } },
  { slug: "apokoronas",      greek: "Αποκορώνου",        region: "chania",
    label: { en: "Apokoronas",      fr: "Apokoronas",       de: "Apokoronas",      el: "Αποκορώνου" } },
  { slug: "kissamos",        greek: "Κισσάμου",          region: "chania",
    label: { en: "Kissamos",        fr: "Kissamos",         de: "Kissamos",        el: "Κισσάμου" } },
  { slug: "platanias",       greek: "Πλατανιά",          region: "chania",
    label: { en: "Platanias",       fr: "Platanias",        de: "Platanias",       el: "Πλατανιά" } },
  { slug: "kantanos-selino", greek: "Καντάνου - Σέλινου", region: "chania",
    label: { en: "Kantanos-Selino", fr: "Kantanos-Selino",  de: "Kantanos-Selino", el: "Καντάνου - Σέλινου" } },
  { slug: "sfakia",          greek: "Σφακίων",           region: "chania",
    label: { en: "Sfakia",          fr: "Sfakia",           de: "Sfakia",          el: "Σφακίων" } },
  { slug: "gavdos",          greek: "Γαύδου",            region: "chania",
    label: { en: "Gavdos",          fr: "Gavdos",           de: "Gavdos",          el: "Γαύδου" } },

  // RETHYMNO region
  { slug: "rethymno",        greek: "Ρεθύμνης",          region: "rethymno",
    label: { en: "Rethymno",        fr: "Réthymnon",        de: "Rethymno",        el: "Ρεθύμνης" } },
  { slug: "agios-vasileios", greek: "Αγίου Βασιλείου",   region: "rethymno",
    label: { en: "Agios Vasileios", fr: "Agios Vassilios",  de: "Agios Vasileios", el: "Αγίου Βασιλείου" } },
  { slug: "amari",           greek: "Αμαρίου",           region: "rethymno",
    label: { en: "Amari",           fr: "Amari",            de: "Amari",           el: "Αμαρίου" } },
  { slug: "anogeia",         greek: "Ανωγείων",          region: "rethymno",
    label: { en: "Anogeia",         fr: "Anogeia",          de: "Anogia",          el: "Ανωγείων" } },
  { slug: "mylopotamos",     greek: "Μυλοποτάμου",       region: "rethymno",
    label: { en: "Mylopotamos",     fr: "Mylopotamos",      de: "Mylopotamos",     el: "Μυλοποτάμου" } },

  // HERAKLION region
  { slug: "heraklion",       greek: "Ηρακλείου",         region: "heraklion",
    label: { en: "Heraklion",       fr: "Héraklion",        de: "Heraklion",       el: "Ηρακλείου" } },
  { slug: "hersonissos",     greek: "Χερσονήσου",        region: "heraklion",
    label: { en: "Hersonissos",     fr: "Hersonissos",      de: "Hersonissos",     el: "Χερσονήσου" } },
  { slug: "malevizi",        greek: "Μαλεβιζίου",        region: "heraklion",
    label: { en: "Malevizi",        fr: "Malevizi",         de: "Malevizi",        el: "Μαλεβιζίου" } },
  { slug: "archanes-asterousia", greek: "Αρχανών - Αστερουσίων", region: "heraklion",
    label: { en: "Archanes-Asterousia", fr: "Archanes-Asterousia", de: "Archanes-Asterousia", el: "Αρχανών - Αστερουσίων" } },
  { slug: "minoa-pediada",   greek: "Μινώα Πεδιάδας",    region: "heraklion",
    label: { en: "Minoa Pediada",   fr: "Minoa Pediada",    de: "Minoa Pediada",   el: "Μινώα Πεδιάδας" } },
  { slug: "viannos",         greek: "Βιάννου",           region: "heraklion",
    label: { en: "Viannos",         fr: "Viannos",          de: "Viannos",         el: "Βιάννου" } },
  { slug: "phaistos",        greek: "Φαιστού",           region: "heraklion",
    label: { en: "Phaistos",        fr: "Phaistos",         de: "Phaistos",        el: "Φαιστού" } },
  { slug: "gortyna",         greek: "Γόρτυνας",          region: "heraklion",
    label: { en: "Gortyna",         fr: "Gortyne",          de: "Gortyna",         el: "Γόρτυνας" } },

  // LASITHI region
  { slug: "agios-nikolaos",  greek: "Αγίου Νικολάου",    region: "lasithi",
    label: { en: "Agios Nikolaos",  fr: "Agios Nikolaos",   de: "Agios Nikolaos",  el: "Αγίου Νικολάου" } },
  { slug: "sitia",           greek: "Σητείας",           region: "lasithi",
    label: { en: "Sitia",           fr: "Sitia",            de: "Sitia",           el: "Σητείας" } },
  { slug: "ierapetra",       greek: "Ιεράπετρας",        region: "lasithi",
    label: { en: "Ierapetra",       fr: "Ierapetra",        de: "Ierapetra",       el: "Ιεράπετρας" } },
  { slug: "lasithi-plateau", greek: "Οροπεδίου Λασιθίου", region: "lasithi",
    label: { en: "Lasithi Plateau", fr: "Plateau du Lassithi", de: "Lasithi-Hochebene", el: "Οροπεδίου Λασιθίου" } },
];

export const REGION_LABEL: Record<NeighbourhoodMap["region"], Record<Loc, string>> = {
  chania:    { en: "Chania",    fr: "La Canée",     de: "Chania",    el: "Χανιά" },
  rethymno:  { en: "Rethymno",  fr: "Réthymnon",    de: "Rethymno",  el: "Ρέθυμνο" },
  heraklion: { en: "Heraklion", fr: "Héraklion",    de: "Heraklion", el: "Ηράκλειο" },
  lasithi:   { en: "Lasithi",   fr: "Lassithi",     de: "Lasithi",   el: "Λασίθι" },
};

export function findNeighbourhood(slug: string): NeighbourhoodMap | undefined {
  return CRETE_NEIGHBOURHOODS.find(n => n.slug === slug);
}
