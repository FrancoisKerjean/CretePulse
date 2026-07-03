"use client";

import type { ReactNode } from "react";

type Plausible = (event: string, opts?: { props?: Record<string, string | number> }) => void;

/**
 * Lien affilie instrumente (03/07/2026). Emet `affiliate_click` {partner, placement}
 * au clic, en plus du "Outbound Link: Click" natif de l'extension outbound-links.
 * Objectif : attribuer chaque clic a un EMPLACEMENT (banner vs cta, page bus vs
 * plage...) pour mesurer un CTR reel par placement, pas seulement par partenaire.
 *
 * Client Component obligatoire : un onClick ne peut pas vivre dans un Server
 * Component (AffiliateBanner / AffiliateCTA en sont). Ce wrapper isole la seule
 * partie interactive et laisse le reste des bandeaux en rendu serveur.
 */
export function TrackedAffiliateLink({
  href,
  partner,
  placement,
  className,
  children,
}: {
  href: string;
  partner: string;
  placement: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      onClick={() =>
        (window as unknown as { plausible?: Plausible }).plausible?.("affiliate_click", {
          props: { partner, placement },
        })
      }
      className={className}
    >
      {children}
    </a>
  );
}
