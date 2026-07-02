// Cartes partenaires sponsorisees sur /explore (modele B : le partenaire a SA carte).
// Source de verite = qui paie. Config simple (tableau JSON), aucune migration DB,
// 100% reversible : tableau vide = /explore identique a aujourd'hui.
// NB : l'entree de demonstration (Cabana Mare) sert a juger le rendu sur Preview.
//      A retirer / remplacer par les vrais partenaires signes avant prod.
import data from "@/data/sponsored-places.json";

export type SponsorCard = {
  id: string;
  name: string;
  category: string;
  photo: string;
  url: string;
  // Optionnels : un partenaire en ligne peut n'avoir ni lieu, ni note Google.
  prefecture?: string;
  rating?: number;
  lat?: number;
  lng?: number;
  address?: string;
};

const CARDS = data as SponsorCard[];

export function getSponsorCards(): SponsorCard[] {
  return CARDS;
}

// Un lieu injecte par un partenaire a un slug prefixe "sponsor:".
export function isSponsorSlug(slug: string): boolean {
  return slug.startsWith("sponsor:");
}

// Libelle "Sponsorise" localise (etiquetage honnete obligatoire, charte crete.direct).
const SPONSORED_LABEL: Record<string, string> = {
  en: "Sponsored", fr: "Sponsorisé", de: "Gesponsert", el: "Χορηγία",
};
export function sponsoredLabel(locale: string): string {
  return SPONSORED_LABEL[locale] || SPONSORED_LABEL.en;
}
