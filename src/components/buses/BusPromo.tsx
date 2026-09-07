"use client";

// Encart bus des articles : PromoBox compacte (sans photo, aucun asset nouveau), le
// plus léger des trois encarts, à la mesure de son poids commercial. Impression via
// ImpressionTracker (block bus-promo), clic tracé bus_promo_click. Cible : le
// planificateur /buses, prérempli par ?from=&to= (BusesClient lit les NOMS de lieux
// DB après hydratation ; from seul : le board de départs suit).
// Spec : docs/superpowers/specs/2026-09-07-article-service-promos-design.md §3.4
import { Bus } from "lucide-react";
import { PromoBox, type PromoCopy } from "@/components/PromoBox";
import { ImpressionTracker } from "@/components/ui/ImpressionTracker";

export function BusPromo({
  locale,
  copy,
  source,
  slug,
  variant,
  from,
  to,
}: {
  locale: string;
  copy: PromoCopy;
  source: string;
  /** Slug de la page hôte. */
  slug: string;
  variant: number;
  /** Noms de lieux DB (clés de BUS_PLACE_SLUGS), jamais des slugs. */
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const href = `/${locale}/buses${qs ? `?${qs}` : ""}`;

  function fireClick() {
    const plausible = (window as unknown as {
      plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
    }).plausible;
    plausible?.("bus_promo_click", { props: { slug, from: from ?? "", to: to ?? "", source } });
  }

  return (
    <div onClickCapture={fireClick}>
      <ImpressionTracker event="promo_impression" props={{ block: "bus-promo", source, slug, variant }} />
      <PromoBox
        icon={Bus}
        title={copy.title}
        line={copy.line}
        ctaLabel={copy.cta}
        ctaHref={href}
        disclosure={copy.disclosure}
      />
    </div>
  );
}
