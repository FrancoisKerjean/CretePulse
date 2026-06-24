/**
 * Cross-link CTA from crete.direct to kairosguest.com fiscal cluster
 * (/conseil-fiscal-grece). Distinct angle from InvestmentCTA: targets
 * owners who ALREADY hold a property and face the 2024 France-Greece
 * tax convention, not buy-side prospects.
 * Dofollow (rel="noopener" only) · both sites are owned by Kairos.
 * UTM-tracked. kairosguest only has fr/en → others route to /en.
 */
const TITLES: Record<string, string> = {
  en: "French property owner in Crete? Your tax rules changed in 2024",
  fr: "Propriétaire français en Crète ? Vos règles fiscales ont changé en 2024",
  de: "Französischer Eigentümer auf Kreta? Ihre Steuerregeln haben sich 2024 geändert",
  el: "Γάλλος ιδιοκτήτης στην Κρήτη; Οι φορολογικοί κανόνες άλλαξαν το 2024",
};
const BODIES: Record<string, string> = {
  en: "A new France-Greece tax convention applies to your rental income since 2024. Kairos guides you in French: declaration, double taxation, bank account reporting. AMF certified.",
  fr: "Depuis 2024, une nouvelle convention fiscale franco-grecque s'applique à vos loyers. Kairos vous accompagne en français : déclaration, double imposition, compte bancaire. Certifié AMF.",
  de: "Seit 2024 gilt ein neues Steuerabkommen Frankreich-Griechenland für Ihre Mieteinnahmen. Kairos begleitet Sie auf Französisch: Erklärung, Doppelbesteuerung, Kontomeldung. AMF-zertifiziert.",
  el: "Από το 2024, μια νέα γαλλο-ελληνική φορολογική σύμβαση ισχύει για τα ενοίκιά σας. Η Kairos σας καθοδηγεί στα γαλλικά: δήλωση, διπλή φορολόγηση, δήλωση λογαριασμού. Πιστοποίηση AMF.",
};
const CTAS: Record<string, string> = {
  en: "Understand my taxes",
  fr: "Comprendre mes impôts",
  de: "Meine Steuern verstehen",
  el: "Κατανόηση των φόρων μου",
};

function targetLocale(locale: string): "fr" | "en" {
  return locale === "fr" ? "fr" : "en";
}

interface TaxCTAProps {
  locale: string;
  contentSlug?: string;
  contentType?: string;
}

export default function TaxCTA({ locale, contentSlug, contentType = "page" }: TaxCTAProps) {
  const t = (m: Record<string, string>) => m[locale] || m.en;
  const target = targetLocale(locale);
  const utm = new URLSearchParams({
    utm_source: "crete-direct",
    utm_medium: "cta",
    utm_campaign: "taxation",
    utm_content: contentType + (contentSlug ? `:${contentSlug}` : ""),
  }).toString();
  const href = `https://kairosguest.com/${target}/conseil-fiscal-grece?${utm}`;

  return (
    /* noopener seul (pas noreferrer) : backlink dofollow vers site maison, on garde le Referer pour l'attribution */
    <aside className="mt-14 rounded-2xl border border-sea/20 bg-sea-faint px-6 py-8" data-cta="tax-cross-link">
      <div className="w-8 h-1 bg-sea rounded-full mb-4" />
      <h3 className="font-heading text-lg font-bold text-sea mb-2">{t(TITLES)}</h3>
      <p className="text-sm text-text-muted mb-5 max-w-2xl leading-relaxed">{t(BODIES)}</p>
      <a href={href} target="_blank" rel="noopener"
         className="inline-flex items-center px-5 py-2.5 text-sm font-semibold bg-sea text-white rounded-lg hover:bg-sea-light transition-colors">
        {t(CTAS)}
      </a>
    </aside>
  );
}
