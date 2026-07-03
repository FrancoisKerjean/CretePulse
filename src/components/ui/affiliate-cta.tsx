import { ExternalLink } from "lucide-react";
import { AFFILIATE_LINKS, type AffiliateKey } from "@/lib/affiliates";
import { ImpressionTracker } from "@/components/ui/ImpressionTracker";
import { TrackedAffiliateLink } from "@/components/ui/TrackedAffiliateLink";

interface AffiliateCTAProps {
  type: AffiliateKey;
  locale: string;
  /** Emplacement logique du CTA pour attribuer impressions et clics dans Plausible. */
  placement?: string;
  className?: string;
}

export function AffiliateCTA({ type, locale, placement = "cta", className = "" }: AffiliateCTAProps) {
  const link = AFFILIATE_LINKS[type];
  const label = link.label[locale as keyof typeof link.label] || link.label.en;

  return (
    <>
      {/* Denominateur "impression" pour un CTR reel par placement (cf ImpressionTracker). */}
      <ImpressionTracker event="promo_impression" props={{ block: type, placement }} />
      <TrackedAffiliateLink
        href={link.url}
        partner={type}
        placement={placement}
        className={`inline-flex items-center gap-1.5 px-4 py-2 bg-terracotta/10 text-terracotta text-sm font-semibold rounded-lg hover:bg-terracotta/20 transition-colors ${className}`}
      >
        {label}
        <ExternalLink className="w-3.5 h-3.5" />
      </TrackedAffiliateLink>
    </>
  );
}
