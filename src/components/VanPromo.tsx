"use client";

// Encart van partagé (van.crete.direct) sur les pages-trajet bus dont la paire
// est couverte par un corridor van actif (src/lib/van-corridors.ts). Même
// pattern PromoBox que CarPromo ; impression via ImpressionTracker, clic tracé
// van_offer_click (mêmes props que le lien VanInterest du planner).
// Depuis le 09/2026 : monté aussi dans les articles (ArticlePromoSlot) avec des textes
// i18n imposés par `copy`, et un cas `generic` sans corridor (racine van.crete.direct).
import { Users } from "lucide-react";
import { PromoBox, type PromoCopy } from "@/components/PromoBox";
import { ImpressionTracker } from "@/components/ui/ImpressionTracker";
import type { VanCorridor } from "@/lib/van-corridors";
import { vanPromoLine } from "@/lib/van-guarantee-copy";

const COPY: Record<string, { title: (from: string, to: string) => string; cta: string; disclosure: string }> = {
  en: {
    title: (from, to) => `Shared minivan ${from} → ${to}`,
    cta: "Join a group",
    disclosure: "van.crete.direct",
  },
  fr: {
    title: (from, to) => `Van partagé ${from} → ${to}`,
    cta: "Rejoindre un groupe",
    disclosure: "van.crete.direct",
  },
  de: {
    title: (from, to) => `Geteilter Van ${from} → ${to}`,
    cta: "Gruppe beitreten",
    disclosure: "van.crete.direct",
  },
  el: {
    title: (from, to) => `Κοινόχρηστο βαν ${from} → ${to}`,
    cta: "Συμμετοχή σε ομάδα",
    disclosure: "van.crete.direct",
  },
};

export function VanPromo({
  locale,
  corridors = [],
  source,
  copy,
  slug,
  variant,
  generic,
}: {
  locale: string;
  /** Corridors couvrant la paire, sens de la page en premier (vanCorridorsForPair). */
  corridors?: VanCorridor[];
  source: string;
  /** Textes imposés par l'appelant (articles : namespace i18n articlePromo). Défaut : COPY interne. */
  copy?: PromoCopy;
  /** Slug de la page hôte, ajouté aux props de promo_impression et de van_offer_click. */
  slug?: string;
  /** Variante de copie (1..2), ajoutée aux props de promo_impression. */
  variant?: number;
  /** Van sans corridor nommé : lien vers la racine localisée de van.crete.direct. Exige `copy`. */
  generic?: true;
}) {
  const main = corridors[0];
  if (!main && !generic) return null;
  const c = COPY[locale] || COPY.en;
  const title = copy?.title ?? (main ? c.title(main.fromName, main.toName) : null);
  if (!title) {
    console.error("VanPromo: generic sans copy, encart non rendu", { locale, source, slug });
    return null;
  }
  const line = copy?.line ?? (main ? vanPromoLine(locale, main) : undefined);
  // Une seule règle de langue pour les deux cas : le site van ne parle que les 4 langues de COPY,
  // et sa racine sans locale redirige vers /en (mesuré 07/09 : 307 vers /en même en Accept-Language fr).
  const vanLocale = COPY[locale] ? locale : "en";
  const href = main
    ? `https://van.crete.direct/${vanLocale}/${main.slug}?source=${encodeURIComponent(source)}`
    : `https://van.crete.direct/${vanLocale}?source=${encodeURIComponent(source)}`;

  function fireClick() {
    const plausible = (window as unknown as {
      plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
    }).plausible;
    const props: Record<string, string | number> = { corridor: main?.slug ?? "generic", source };
    if (slug) props.slug = slug;
    plausible?.("van_offer_click", { props });
  }

  const impression: Record<string, string | number> = { block: "van-promo", source };
  if (slug) impression.slug = slug;
  if (variant) impression.variant = variant;

  return (
    <div onClickCapture={fireClick}>
      <ImpressionTracker event="promo_impression" props={impression} />
      <PromoBox
        icon={Users}
        title={title}
        line={line}
        ctaLabel={copy?.cta ?? c.cta}
        ctaHref={href}
        disclosure={copy?.disclosure ?? c.disclosure}
      />
    </div>
  );
}
