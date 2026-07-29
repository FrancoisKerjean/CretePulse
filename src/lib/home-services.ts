// Catalogue des services commerciaux exposés sur la home (rail « Réserver en direct »).
// Module PUR : aucune dépendance React, aucun accès réseau. Testé par
// scripts/check-home-services.mjs. Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
export type HomeServiceId = "car" | "van" | "activities" | "stays";

export interface HomeService {
  id: HomeServiceId;
  /** Chemin interne (locale ajoutée par le Link i18n) ou URL absolue. */
  href: string;
  /** Dérivé de href, jamais saisi à la main. */
  external: boolean;
  /** Chemin sous public/. */
  photo: string;
  layout: "band" | "card";
}

const CATALOG: Omit<HomeService, "external">[] = [
  { id: "car", href: "/car-rental", photo: "/images/partners/car-rental.jpg", layout: "band" },
  { id: "van", href: "https://van.crete.direct", photo: "/images/partners/ferry.jpg", layout: "card" },
  { id: "activities", href: "/activities", photo: "/images/partners/tours.jpg", layout: "card" },
  { id: "stays", href: "/stays", photo: "/images/partners/villa.jpg", layout: "card" },
];

/**
 * Le bloc villa n'est retourné que si le flag est allumé : /stays est en
 * noindex et sans annonce réelle publiée (décision Kami 25/07/2026).
 */
export function getHomeServices(opts: { staysEnabled: boolean }): HomeService[] {
  return CATALOG
    .filter((s) => s.id !== "stays" || opts.staysEnabled)
    .map((s) => ({ ...s, external: /^https?:\/\//.test(s.href) }));
}
