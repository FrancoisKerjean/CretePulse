import { ExternalLink } from "lucide-react";
import { AFFILIATE_LINKS, type AffiliateKey } from "@/lib/affiliates";

interface AffiliateCTAProps {
  type: AffiliateKey;
  locale: string;
  className?: string;
}

export function AffiliateCTA({ type, locale, className = "" }: AffiliateCTAProps) {
  const link = AFFILIATE_LINKS[type];
  const label = link.label[locale as keyof typeof link.label] || link.label.en;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className={`inline-flex items-center gap-1.5 px-4 py-2 bg-terracotta/10 text-terracotta text-sm font-semibold rounded-lg hover:bg-terracotta/20 transition-colors ${className}`}
    >
      {label}
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  );
}
