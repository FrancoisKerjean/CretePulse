import { TrendingUp, Home, ArrowRight, type LucideIcon } from "lucide-react";
import { ImpressionTracker } from "@/components/ui/ImpressionTracker";

/**
 * Cross-link premium (photo plein bloc) de crete.direct vers kairosguest.com.
 * Refonte 03/07/2026 : les anciennes "boîtes claires" (InvestmentCTA + PromoBox
 * 'analyse' empilés sur /airbnb) juraient à côté des bandeaux affiliés photo.
 * Un seul langage visuel désormais (image full-bleed + voile + CTA or bronze).
 *
 * Deux encarts DISTINCTS, répartis par intent (décision Kami 03/07) :
 *   variant "biens" → pages /airbnb (données de rendement par zone) → /biens
 *       « Voir les biens à vendre » : catalogue concret de maisons/villas.
 *   variant "study" (défaut) → pages /airport (trafic) → /acheter-en-crete
 *       « Étudier mon projet » : posture bureau d'étude et investissement.
 * Un seul encart par page, jamais empilés.
 * Dofollow (rel="noopener" seul) : backlink maison, on garde le Referer. UTM-tracké.
 */

type Variant = "biens" | "study";

const COPY: Record<Variant, {
  Icon: LucideIcon;
  disclosure: Record<string, string>;
  title: Record<string, string>;
  line: Record<string, string>;
  cta: Record<string, string>;
  path: (loc: "fr" | "en") => string;
  campaign: string;
}> = {
  biens: {
    Icon: Home,
    disclosure: {
      en: "Kairos · properties for sale",
      fr: "Kairos · biens à vendre",
      de: "Kairos · Immobilien zu verkaufen",
      el: "Kairos · ακίνητα προς πώληση",
    },
    title: {
      en: "Thinking of investing in an area like this?",
      fr: "Envie d'investir dans une zone comme celle-ci ?",
      de: "Möchten Sie in eine Gegend wie diese investieren?",
      el: "Σκέφτεστε να επενδύσετε σε μια περιοχή σαν αυτή;",
    },
    line: {
      en: "Houses and villas for sale in eastern Crete, hand-picked and analysed by Kairos.",
      fr: "Maisons et villas à vendre en Crète orientale, sélectionnées et analysées par Kairos.",
      de: "Häuser und Villen zum Verkauf in Ostkreta, ausgewählt und analysiert von Kairos.",
      el: "Σπίτια και βίλες προς πώληση στην Ανατολική Κρήτη, επιλεγμένα και αναλυμένα από την Kairos.",
    },
    cta: {
      en: "See properties for sale",
      fr: "Voir les biens à vendre",
      de: "Immobilien ansehen",
      el: "Δείτε τα ακίνητα",
    },
    path: (loc) => `/${loc}/biens`,
    campaign: "biens",
  },
  study: {
    Icon: TrendingUp,
    disclosure: {
      en: "Kairos · investment study",
      fr: "Kairos · bureau d'étude",
      de: "Kairos · Studienbüro",
      el: "Kairos · γραφείο μελετών",
    },
    title: {
      en: "Investing in short-term rentals in Crete?",
      fr: "Investir dans la location courte durée en Crète ?",
      de: "In Kurzzeitvermietung auf Kreta investieren?",
      el: "Επένδυση σε βραχυχρόνια μίσθωση στην Κρήτη;",
    },
    line: {
      en: "Yield analysis by area, buy-side support, France-Greece taxation. In French, AMF certified.",
      fr: "Analyse de rentabilité par zone, accompagnement à l'achat, fiscalité franco-grecque. En français, certifié AMF.",
      de: "Renditeanalyse nach Gebiet, Kaufbegleitung, Steuern Frankreich-Griechenland. Auf Französisch, AMF-zertifiziert.",
      el: "Ανάλυση απόδοσης ανά περιοχή, υποστήριξη αγοράς, γαλλο-ελληνική φορολογία. Στα γαλλικά, πιστοποίηση AMF.",
    },
    cta: {
      en: "Study my project",
      fr: "Étudier mon projet",
      de: "Mein Projekt prüfen",
      el: "Μελέτη του έργου μου",
    },
    path: (loc) => `/${loc}/acheter-en-crete`,
    campaign: "investment",
  },
};

function targetLocale(locale: string): "fr" | "en" {
  return locale === "fr" ? "fr" : "en";
}

interface InvestmentCTAProps {
  locale: string;
  contentSlug?: string;
  contentType?: string;
  /** "biens" sur /airbnb, "study" (défaut) sur /airport. */
  variant?: Variant;
}

export default function InvestmentCTA({
  locale,
  contentSlug,
  contentType = "page",
  variant = "study",
}: InvestmentCTAProps) {
  const c = COPY[variant];
  const loc = c.title[locale] ? locale : "en";
  const target = targetLocale(locale);
  const utm = new URLSearchParams({
    utm_source: "crete-direct",
    utm_medium: "cta",
    utm_campaign: c.campaign,
    utm_content: contentType + (contentSlug ? `:${contentSlug}` : ""),
  }).toString();
  const href = `https://kairosguest.com${c.path(target)}?${utm}`;
  const Icon = c.Icon;

  return (
    <aside
      className="group/ad relative mt-14 overflow-hidden rounded-[26px] shadow-card"
      data-cta={`investment-${variant}`}
    >
      {/* Capture décisionnelle : impression (CTR réel par placement, pathname
          attaché par Plausible). Même event que les bandeaux affiliés. */}
      <ImpressionTracker event="promo_impression" props={{ block: `investment-${variant}` }} />
      {/* Photo plein bloc, même langage visuel que les bandeaux partenaires. */}
      <img
        src="/images/partners/investment.jpg"
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[4000ms] ease-out group-hover/ad:scale-105"
        aria-hidden
      />
      {/* Voile de lisibilité : dense sous le texte, laisse respirer la photo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#08263a]/85 via-[#08263a]/50 to-[#08263a]/10" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#08263a]/60 to-transparent md:hidden" aria-hidden />

      <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-5 p-6 md:min-h-[200px] md:p-8">
        <div className="min-w-0 max-w-xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            <Icon className="h-3 w-3" aria-hidden />
            {c.disclosure[loc]}
          </p>
          <p className="mt-3 font-heading font-bold text-white text-xl md:text-2xl leading-snug [text-wrap:balance] drop-shadow-[0_1px_3px_rgba(8,38,58,0.6)]">
            {c.title[loc]}
          </p>
          <p className="mt-2 text-sm text-white/90 leading-relaxed drop-shadow-[0_1px_2px_rgba(8,38,58,0.6)]">
            {c.line[loc]}
          </p>
        </div>
        {/* Bouton or bronze (charte Kairos = palette de la page /biens).
            noopener seul (pas noreferrer/nofollow) : backlink dofollow maison. */}
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="group relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[#C8A35F] to-[#A8853F] px-6 py-3 text-sm font-bold text-[#1a1408] shadow-[0_8px_22px_-8px_rgba(168,133,63,0.7)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          {/* léger balayage lumineux périodique sur le bouton */}
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent bg-[length:300%_100%] animate-gradient"
            aria-hidden
          />
          <span className="relative">{c.cta[loc]}</span>
          <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </a>
      </div>
    </aside>
  );
}
