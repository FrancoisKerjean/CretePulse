// Partenaires sponsorises sur /explore.
// Source de verite = qui paie. Config volontairement simple (JSON slug -> partenaire),
// aucune migration DB, 100% reversible : config vide = /explore identique a aujourd'hui.
// NB : l'entree de demonstration (Cabana Mare) sert a juger le rendu sur Preview.
//      A retirer / remplacer par les vrais partenaires signes avant prod.
import data from "@/data/sponsored-places.json";

export type Sponsor = { sponsor: string; url?: string; label?: string };

const MAP = data as Record<string, Sponsor>;

export function getSponsor(slug: string): Sponsor | undefined {
  return MAP[slug];
}

export function isSponsored(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(MAP, slug);
}

// Libelle "Sponsorise" localise (etiquetage honnete obligatoire, charte crete.direct).
const SPONSORED_LABEL: Record<string, string> = {
  en: "Sponsored", fr: "Sponsorisé", de: "Gesponsert", el: "Χορηγία",
};
export function sponsoredLabel(locale: string): string {
  return SPONSORED_LABEL[locale] || SPONSORED_LABEL.en;
}
