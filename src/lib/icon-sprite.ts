/**
 * Sprite SVG pour les icones repetees dans les listes.
 *
 * Mesure du 01/08/2026 sur https://crete.direct/en/beaches en production :
 * la page pese 874 894 octets, dont 234 569 de balises <svg> inline, soit 53 %
 * du HTML rendu. Il n'y a pourtant que 17 icones distinctes pour 504 balises :
 * 226 441 octets, un quart de la page, sont la meme poignee de dessins recopies
 * a chaque carte. Le pin de localisation y figure 182 fois, une par plage.
 *
 * Un <symbol> declare le dessin une seule fois, chaque usage n'est plus qu'un
 * <use href="#..."> de quelques dizaines d'octets. L'apparence est identique au
 * pixel pres : ce sont les memes chemins, extraits du HTML rendu en production
 * plutot que reecrits, donc aucune derive possible avec ce que voit le visiteur.
 *
 * Pourquoi figer les chemins ici plutot que d'importer lucide-react : un
 * <symbol> a besoin du contenu brut, pas d'un composant React. Les chemins d'une
 * icone ne bougent pas, et les figer garantit que le sprite et les usages
 * restants de lucide-react dessinent exactement la meme chose.
 *
 * Ce module ne contient AUCUN JSX : il reste testable en environnement node,
 * comme le reste de src/lib. Le rendu vit dans src/components/IconSprite.tsx.
 *
 * Perimetre volontairement etroit : seulement les icones rendues en boucle par
 * les cartes de plage, et seulement la ou le sprite est rendu dans la meme page.
 * La goutte de WaterQualityBadge reste sur lucide-react bien qu'elle apparaisse
 * 97 fois : ce composant sert aussi dans ExploreView, et un <use> qui ne trouve
 * pas son symbole ne dessine RIEN, sans erreur ni avertissement. Elargir le
 * sprite demande d'abord de le rendre dans le layout, pas de l'esperer present.
 *
 * Toutes les icones d'ici sont tracees au stroke. Ajouter une icone pleine
 * (fill="currentColor", comme la goutte) demandera d'etendre SpriteIcon : rendue
 * telle quelle aujourd'hui, elle sortirait vide.
 */

export type SpriteIcon = {
  /** viewBox du dessin d'origine. Lucide dessine tout dans une grille 24x24. */
  viewBox: string;
  /** Contenu du <symbol> : chemins bruts, sans <svg> englobant ni class. */
  body: string;
};

/**
 * Prefixe des ancres. Sans lui, un id de sprite pourrait entrer en collision
 * avec un id pose par une page, et le <use> irait chercher le mauvais noeud.
 */
export const SPRITE_ID_PREFIX = "i-";

export const SPRITE_ICONS = {
  "map-pin": {
    viewBox: "0 0 24 24",
    body: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  },
  waves: {
    viewBox: "0 0 24 24",
    body: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  },
  car: {
    viewBox: "0 0 24 24",
    body: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  },
  fish: {
    viewBox: "0 0 24 24",
    body: '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4"/><path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98"/>',
  },
} as const satisfies Record<string, SpriteIcon>;

export type SpriteIconName = keyof typeof SPRITE_ICONS;

/** Ancre du <symbol> a passer au href d'un <use>. */
export function spriteHref(name: SpriteIconName): string {
  return `#${SPRITE_ID_PREFIX}${name}`;
}
