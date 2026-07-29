// Destinations des zones cliquables du hero de la home.
// Module PUR : aucune dépendance React, aucun accès réseau. Testé par
// scripts/check-hero-links.mjs. Spec : docs/superpowers/specs/2026-07-29-hero-clickable-design.md
//
// Règle : pas de cible prouvée, pas de lien. Le baromètre n'affiche pas de ligne
// quand sa source est muette ; il ne fabrique pas davantage d'URL vers une page
// qui n'existe pas.

/**
 * Ports que /api/island-now sait nommer, et la page de village correspondante.
 * Souda est le port de La Canée, il pointe donc vers Chania.
 * Sitia est volontairement absent : /villages/sitia est un 404 (vérifié en prod
 * le 29/07/2026). Le jour où la page existe, une ligne ici suffit.
 */
const CRUISE_PORT_VILLAGE: Record<string, string> = {
  heraklion: "heraklion",
  chania: "chania",
  souda: "chania",
  agios_nikolaos: "agios-nikolaos",
};

/** Chemin interne (la locale est ajoutée par le Link i18n), ou null si aucune page. */
export function cruisePortHref(port: string): string | null {
  const slug = CRUISE_PORT_VILLAGE[port];
  return slug ? `/villages/${slug}` : null;
}

/** Fiche de la plage citée dans le hero, ou null si le slug est vide. */
export function swimHref(slug: string): string | null {
  const s = slug.trim();
  return s ? `/beaches/${s}` : null;
}
