// Références légères des landing pages /car-rental/[location].
// Module séparé de car-locations.ts (qui porte les textes, lourds) : les CTA
// client-side (CarPromo) importent d'ici sans embarquer le contenu des landing
// dans les bundles. car-locations.ts dérive CAR_LOCATIONS de cette liste, le
// typage Record<CarLandingSlug, ...> garantit qu'aucune ref ne reste sans texte.

export interface CarLandingRef {
  /** Segment d'URL /car-rental/<slug>. */
  slug: string;
  /** Slug pickup CAR_ZONES pré-rempli dans le wizard embarqué. */
  pickup: string;
  kind: "airport" | "port" | "city";
  code?: string;
}

export const CAR_LANDINGS = [
  { slug: "chania-airport", pickup: "chania-airport", kind: "airport", code: "CHQ" },
  { slug: "heraklion-airport", pickup: "heraklion", kind: "airport", code: "HER" },
  { slug: "souda-port", pickup: "chania", kind: "port" },
  { slug: "heraklion-port", pickup: "heraklion", kind: "port" },
] as const satisfies readonly CarLandingRef[];

export type CarLandingSlug = (typeof CAR_LANDINGS)[number]["slug"];

export function getCarLanding(slug: string): CarLandingRef | null {
  return CAR_LANDINGS.find((l) => l.slug === slug) ?? null;
}

// Landing auto pour un pickup : correspondance EXACTE slug === pickup uniquement.
// Un pickup peut être partagé par plusieurs landings (heraklion = airport + port) :
// dans ce cas on ne devine pas, le call site qui connaît son contexte passe
// landing= explicitement (ex : page aéroport HER → heraklion-airport).
export function landingForPickup(pickup: string): CarLandingRef | null {
  return CAR_LANDINGS.find((l) => l.slug === pickup && l.pickup === pickup) ?? null;
}
