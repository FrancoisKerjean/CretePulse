// Catalogue des services commerciaux exposes sur la home (rail « Reserver en direct »).
// Module PUR : aucune dependance React, aucun acces reseau. Teste par
// scripts/check-home-services.mjs. Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
export type HomeServiceId = "car" | "van" | "activities" | "stays";

export interface HomeService {
  id: HomeServiceId;
  /** Chemin interne (locale ajoutee par le Link i18n) ou URL absolue. */
  href: string;
  /** Derive de href, jamais saisi a la main. */
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
 * Le bloc villa n'est retourne que si le flag est allume : /stays est en
 * noindex et sans annonce reelle publiee (decision Kami 25/07/2026).
 */
export function getHomeServices(opts: { staysEnabled: boolean }): HomeService[] {
  return CATALOG
    .filter((s) => s.id !== "stays" || opts.staysEnabled)
    .map((s) => ({ ...s, external: /^https?:\/\//.test(s.href) }));
}
