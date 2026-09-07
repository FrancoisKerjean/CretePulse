"use client";

// Encart van partagé (van.crete.direct) sur les pages-trajet bus dont la paire
// est couverte par un corridor van actif (src/lib/van-corridors.ts). Même
// pattern PromoBox que CarPromo ; impression via ImpressionTracker, clic tracé
// van_offer_click (mêmes props que le lien VanInterest du planner).
import { Users } from "lucide-react";
import { PromoBox } from "@/components/PromoBox";
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
  corridors,
  source,
}: {
  locale: string;
  /** Corridors couvrant la paire, sens de la page en premier (vanCorridorsForPair). */
  corridors: VanCorridor[];
  source: string;
}) {
  const main = corridors[0];
  if (!main) return null;
  const c = COPY[locale] || COPY.en;

  function fireClick() {
    const plausible = (window as unknown as {
      plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
    }).plausible;
    plausible?.("van_offer_click", { props: { corridor: main.slug, source } });
  }

  return (
    <div onClickCapture={fireClick}>
      <ImpressionTracker event="promo_impression" props={{ block: "van-promo", source }} />
      <PromoBox
        icon={Users}
        title={c.title(main.fromName, main.toName)}
        line={vanPromoLine(locale, main)}
        ctaLabel={c.cta}
        ctaHref={`https://van.crete.direct/${COPY[locale] ? locale : "en"}/${main.slug}?source=${encodeURIComponent(source)}`}
        disclosure={c.disclosure}
      />
    </div>
  );
}
