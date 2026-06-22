// L'unique pattern d'encart cross-sell/funnel du site (remplace le bandeau
// noir/jaune Kairos, le style custom AffiliateBanner, l'encart "Stay in...").
// Spec : docs/superpowers/specs/2026-06-11-ui-live-data-redesign-design.md
// 12/06 : variante photo plein bloc (Kami : la boîte claire est "très moche"
// à côté des bandeaux photo affiliés ; même langage visuel que ceux-ci).
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, ExternalLink } from "lucide-react";

export function PromoBox({ icon: Icon, title, line, ctaLabel, ctaHref, disclosure, photo }: {
  icon: LucideIcon;
  title: string;
  line?: string;
  ctaLabel: string;
  ctaHref: string;
  disclosure?: string; // ex "Partner link" · obligatoire pour l'affiliation
  /** Photo plein bloc (chemin public/). Sans photo : boîte claire compacte. */
  photo?: string;
}) {
  // CTA interne (wizard /car-rental…) : même onglet, pas de rel d'affiliation.
  const external = /^https?:\/\//.test(ctaHref);
  const CtaIcon = external ? ExternalLink : ArrowRight;

  if (photo) {
    return (
      <aside className="group/ad relative overflow-hidden rounded-[26px] shadow-lg my-8">
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[4000ms] ease-out group-hover/ad:scale-105"
          aria-hidden
        />
        {/* voile de lisibilité : dense sous le texte, laisse respirer la photo */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08263a]/85 via-[#08263a]/50 to-[#08263a]/10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#08263a]/60 to-transparent md:hidden" aria-hidden />
        <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-5 p-6 md:min-h-[200px] md:p-8">
          <div className="min-w-0 max-w-xl">
            {disclosure && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                <Icon className="h-3 w-3" aria-hidden />
                {disclosure}
              </p>
            )}
            <p className="mt-3 font-heading font-bold text-white text-xl md:text-2xl leading-snug [text-wrap:balance] drop-shadow-[0_1px_3px_rgba(8,38,58,0.6)]">
              {title}
            </p>
            {line && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(8,38,58,0.6)]">
                <BadgeCheck className="h-4 w-4 shrink-0 text-white" aria-hidden />
                {line}
              </p>
            )}
          </div>
          <a
            href={ctaHref}
            {...(external ? { target: "_blank", rel: "nofollow noopener sponsored" } : {})}
            className="group relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-bold text-terracotta shadow-md transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-terracotta/20 to-transparent bg-[length:300%_100%] animate-gradient"
              aria-hidden
            />
            <span className="relative">{ctaLabel}</span>
            <CtaIcon className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-[26px] border border-lagoon/20 bg-sea-faint p-5 my-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="w-5 h-5 text-sea shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-heading font-bold text-text m-0">{title}</p>
            {line && <p className="text-sm text-text-muted m-0">{line}</p>}
          </div>
        </div>
        <a href={ctaHref}
           {...(external ? { target: "_blank", rel: "nofollow noopener sponsored" } : {})}
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
