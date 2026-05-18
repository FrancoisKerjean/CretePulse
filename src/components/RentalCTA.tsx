/**
 * Cross-link CTA from crete.direct articles/pages to kairosguest.com rental funnel.
 * Discrete branding (no "Kairos" name visible) per CretePulse CLAUDE.md rule.
 * UTM-tracked so we can measure the click-through rate in GA4 on kairosguest.
 *
 * Insertion targets (decided 15/05/2026 based on GSC intent analysis):
 *   - /articles/[slug]       — CTR 3.49%, top evergreen performer
 *   - /where-to-stay/[area]  — direct lodging intent, CTR 2.79%
 *   - /things-to-do/[city]   — leisure intent
 *   - /beaches/[slug]        — vacation intent (555 pages volume)
 *   - /compare/[slug]        — destination decision intent
 *
 * Skipped : /food (noindex), /visit (noindex), /getting-around (noindex),
 *           /villages (cultural, weak intent), /hikes (outdoor, weak intent),
 *           /news (ephemeral, mixed intent).
 */

const TITLES: Record<string, string> = {
  en: "Stay in eastern Crete",
  fr: "Séjourner en Crète orientale",
  de: "Übernachten in Ostkreta",
  el: "Διαμονή στην Ανατολική Κρήτη",
};

const BODIES: Record<string, string> = {
  en: "Hand-picked villas and apartments with on-site French-speaking management. Direct booking, 30% deposit, no middleman fees.",
  fr: "Villas et appartements sélectionnés avec gestion locale francophone sur place. Réservation directe, acompte 30%, sans commission d'intermédiaire.",
  de: "Ausgewählte Villen und Apartments mit französischsprachiger Betreuung vor Ort. Direktbuchung, 30% Anzahlung, ohne Vermittlungsgebühren.",
  el: "Επιλεγμένες βίλες και διαμερίσματα με τοπική υπηρεσία στα γαλλικά. Άμεση κράτηση, προκαταβολή 30%, χωρίς προμήθειες.",
};

const CTAS: Record<string, string> = {
  en: "View rentals →",
  fr: "Voir les locations →",
  de: "Ferienunterkünfte ansehen →",
  el: "Δείτε τα καταλύματα →",
};

// kairosguest.com only has fr/en locales. Route others to /en.
function targetLocale(locale: string): "fr" | "en" {
  return locale === "fr" ? "fr" : "en";
}

interface RentalCTAProps {
  /** Page locale (en, fr, de, el, …) — used for the CTA text only */
  locale: string;
  /** Page slug for UTM tracking (e.g. "samaria-gorge-hiking-guide-2026") */
  contentSlug?: string;
  /** Source category for UTM (e.g. "articles", "compare", "beaches") */
  contentType?: string;
}

export default function RentalCTA({ locale, contentSlug, contentType = "page" }: RentalCTAProps) {
  const t = (m: Record<string, string>) => m[locale] || m.en;
  const target = targetLocale(locale);
  const utm = new URLSearchParams({
    utm_source: "crete-direct",
    utm_medium: "cta",
    utm_campaign: "rental",
    utm_content: contentType + (contentSlug ? `:${contentSlug}` : ""),
  }).toString();
  const href = `https://kairosguest.com/${target}/voyager-en-crete?${utm}`;

  return (
    <aside
      className="mt-14 rounded-2xl border border-aegean/20 bg-aegean-faint px-6 py-8"
      data-cta="rental-cross-link"
    >
      <div className="w-8 h-1 bg-terra rounded-full mb-4" />
      <h3
        className="text-lg font-bold text-aegean mb-2"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {t(TITLES)}
      </h3>
      <p className="text-sm text-text-muted mb-5 max-w-2xl leading-relaxed">
        {t(BODIES)}
      </p>
      <a
        href={href}
        rel="noopener"
        className="inline-flex items-center px-5 py-2.5 text-sm font-semibold bg-aegean text-white rounded-lg hover:bg-aegean-light transition-colors"
      >
        {t(CTAS)}
      </a>
    </aside>
  );
}
