// L'unique pattern d'encart cross-sell/funnel du site (remplace le bandeau
// noir/jaune Kairos, le style custom AffiliateBanner, l'encart "Stay in...").
// Spec : docs/superpowers/specs/2026-06-11-ui-live-data-redesign-design.md
import type { LucideIcon } from "lucide-react";

export function PromoBox({ icon: Icon, title, line, ctaLabel, ctaHref, disclosure }: {
  icon: LucideIcon;
  title: string;
  line?: string;
  ctaLabel: string;
  ctaHref: string;
  disclosure?: string; // ex "Partner link" · obligatoire pour l'affiliation
}) {
  return (
    <aside className="rounded-[26px] border border-lagoon/20 bg-aegean-faint p-5 my-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="w-5 h-5 text-aegean shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-heading font-bold text-text m-0">{title}</p>
            {line && <p className="text-sm text-text-muted m-0">{line}</p>}
          </div>
        </div>
        <a href={ctaHref} target="_blank" rel="nofollow noopener sponsored"
           className="inline-flex items-center rounded-full bg-sun text-text text-sm font-heading font-bold px-5 py-2.5 hover:brightness-105 transition-all shrink-0">
          {ctaLabel}
        </a>
      </div>
      {disclosure && (
        <p className="text-[11px] uppercase tracking-wide text-text-light mt-2 mb-0">{disclosure}</p>
      )}
    </aside>
  );
}
