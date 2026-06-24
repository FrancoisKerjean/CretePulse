import { ExternalLink, Car, BadgeCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AFFILIATE_LINKS } from "@/lib/affiliates";
import { ImpressionTracker } from "@/components/ui/ImpressionTracker";

/**
 * CTA "Transfert aéroport" (monétisation affiliation GetYourGuide, 24/06/2026).
 *
 * Cible l'intention "arriver à l'aéroport et rejoindre l'est de la Crète"
 * (HER -> Ierapetra / Makrigialos / Sitia / Agios Nikolaos), où le bus ou la
 * navette n'existe pas et où un transfert privé GetYourGuide est pertinent.
 *
 * Réutilise EXACTEMENT le tracking GYG existant : AFFILIATE_LINKS.airportTransfer
 * pointe vers la catégorie "Airport transfers" Crète avec le même
 * partner_id=UIHUPYW que le bloc `tours` (compte "Crete.direct"). Aucune
 * invention d'ID : les commissions tombent sur le même compte.
 *
 * i18n : tout le texte passe par next-intl (namespace `airportTransfer`,
 * présent dans les 22 locales -> check:i18n vert). DA Kalimera : tokens
 * uniquement (night/terracotta/white), pas de hex brut, séparateurs en point
 * médian. Tracking : impression Plausible `promo_impression` (block
 * airportTransfer) + clic capté par le module outbound-links de Plausible.
 */
export async function AirportTransferCTA({
  locale,
  placeName,
  className = "",
}: {
  locale: string;
  /** Destination contextuelle ("Ierapetra", "Sitia"...) injectée par la page. */
  placeName?: string;
  className?: string;
}) {
  const t = await getTranslations({ locale, namespace: "airportTransfer" });
  const link = AFFILIATE_LINKS.airportTransfer;
  const headline = placeName ? t("headlinePlace", { place: placeName }) : t("headline");

  return (
    <aside
      className={`group/ad relative overflow-hidden rounded-[26px] bg-night shadow-card ${className}`}
    >
      {/* Capture décisionnelle : impression du bandeau (CTR réel par placement,
          le pathname est attaché par Plausible). */}
      <ImpressionTracker event="promo_impression" props={{ block: "airportTransfer" }} />

      <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-5 p-6 md:p-8">
        <div className="min-w-0 max-w-xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            <Car className="h-3 w-3" aria-hidden />
            {t("disclosure")} · GetYourGuide
          </p>
          <p className="mt-3 font-bold text-white text-xl md:text-2xl leading-snug [text-wrap:balance]">
            {headline}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-white/90">
            <BadgeCheck className="h-4 w-4 shrink-0 text-white" aria-hidden />
            {t("trust")}
          </p>
        </div>
        <a
          href={link.url}
          target="_blank"
          rel="sponsored noopener noreferrer nofollow"
          className="group relative inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-terracotta shadow-soft transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <span className="relative">{t("cta")}</span>
          <ExternalLink className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </a>
      </div>
    </aside>
  );
}
