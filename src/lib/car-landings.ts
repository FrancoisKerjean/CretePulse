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
  // Villes et zones touristiques (Lot B car-demand, 10/07/2026). slug === pickup :
  // les CTA CarPromo avec ce pickup routent automatiquement vers la landing.
  { slug: "chania", pickup: "chania", kind: "city" },
  { slug: "heraklion", pickup: "heraklion", kind: "city" },
  { slug: "rethymno", pickup: "rethymno", kind: "city" },
  { slug: "agios-nikolaos", pickup: "agios-nikolaos", kind: "city" },
  { slug: "ierapetra", pickup: "ierapetra", kind: "city" },
  { slug: "hersonissos", pickup: "hersonissos", kind: "city" },
  { slug: "malia", pickup: "malia", kind: "city" },
  { slug: "platanias", pickup: "platanias", kind: "city" },
  { slug: "elounda", pickup: "elounda", kind: "city" },
  { slug: "kissamos", pickup: "kissamos", kind: "city" },
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
