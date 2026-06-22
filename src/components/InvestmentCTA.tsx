/**
 * Cross-link CTA from crete.direct investor-intent pages to kairosguest.com
 * (bureau d'étude et investissement). Placed ONLY where investment intent
 * exists: /airbnb (price/yield/occupancy data) and /airport (traffic data).
 * Dofollow (rel="noopener" only) — both sites are owned by Kairos.
 * UTM-tracked. kairosguest only has fr/en → others route to /en.
 */
const TITLES: Record<string, string> = {
  en: "Investing in short-term rentals in Crete?",
  fr: "Investir dans la location courte durée en Crète ?",
  de: "In Kurzzeitvermietung auf Kreta investieren?",
  el: "Επένδυση σε βραχυχρόνια μίσθωση στην Κρήτη;",
};
const BODIES: Record<string, string> = {
  en: "Kairos, investment study & advisory: yield analysis by area, buy-side support, France-Greece taxation. In French, AMF certified.",
  fr: "Kairos, bureau d'étude et investissement : analyse de rentabilité par zone, accompagnement à l'achat, fiscalité franco-grecque. En français, certifié AMF.",
  de: "Kairos, Studien- und Investmentbüro: Renditeanalyse nach Gebiet, Kaufbegleitung, Steuern Frankreich-Griechenland. Auf Französisch, AMF-zertifiziert.",
  el: "Kairos, γραφείο μελετών & επενδύσεων: ανάλυση απόδοσης ανά περιοχή, υποστήριξη αγοράς, γαλλο-ελληνική φορολογία. Στα γαλλικά, πιστοποίηση AMF.",
};
const CTAS: Record<string, string> = {
  en: "Study my project",
  fr: "Étudier mon projet",
  de: "Mein Projekt prüfen",
  el: "Μελέτη του έργου μου",
};

function targetLocale(locale: string): "fr" | "en" {
  return locale === "fr" ? "fr" : "en";
}

interface InvestmentCTAProps {
  locale: string;
  contentSlug?: string;
  contentType?: string;
}

export default function InvestmentCTA({ locale, contentSlug, contentType = "page" }: InvestmentCTAProps) {
  const t = (m: Record<string, string>) => m[locale] || m.en;
  const target = targetLocale(locale);
  const utm = new URLSearchParams({
    utm_source: "crete-direct",
    utm_medium: "cta",
    utm_campaign: "investment",
    utm_content: contentType + (contentSlug ? `:${contentSlug}` : ""),
  }).toString();
  const href = `https://kairosguest.com/${target}/acheter-en-crete?${utm}`;

  return (
    /* noopener seul (pas noreferrer) : backlink dofollow vers site maison, on garde le Referer pour l'attribution */
    <aside className="mt-14 rounded-2xl border border-sea/20 bg-sea-faint px-6 py-8" data-cta="investment-cross-link">
      <div className="w-8 h-1 bg-terracotta rounded-full mb-4" />
      <h3 className="font-heading text-lg font-bold text-sea mb-2">{t(TITLES)}</h3>
      <p className="text-sm text-text-muted mb-5 max-w-2xl leading-relaxed">{t(BODIES)}</p>
      <a href={href} target="_blank" rel="noopener"
         className="inline-flex items-center px-5 py-2.5 text-sm font-semibold bg-sea text-white rounded-lg hover:bg-sea-light transition-colors">
        {t(CTAS)}
      </a>
    </aside>
  );
}
