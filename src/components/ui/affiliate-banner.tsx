import { AffiliateCTA } from "./affiliate-cta";
import type { AffiliateKey } from "@/lib/affiliates";

// Compact partner banner: one-line pitch + the affiliate button.
// Visible disclosure ("Partner link") keeps the site's transparency promise;
// the link itself already carries rel="nofollow sponsored".
const TITLES: Partial<Record<AffiliateKey, Record<string, string>>> = {
  tours: {
    en: "Skip-the-line tickets, boat trips and guided tours",
    fr: "Billets coupe-file, sorties en bateau et visites guidées",
    de: "Tickets ohne Anstehen, Bootstouren und Führungen",
    el: "Εισιτήρια χωρίς ουρά, εκδρομές με σκάφος και ξεναγήσεις",
  },
  carRental: {
    en: "Compare car rental prices across Crete",
    fr: "Comparer les prix de location de voiture en Crète",
    de: "Mietwagenpreise auf Kreta vergleichen",
    el: "Συγκρίνετε τιμές ενοικίασης αυτοκινήτου στην Κρήτη",
  },
  ferry: {
    en: "Ferry tickets from and to Crete",
    fr: "Billets de ferry depuis et vers la Crète",
    de: "Fährtickets von und nach Kreta",
    el: "Ακτοπλοϊκά εισιτήρια από και προς την Κρήτη",
  },
};

const DISCLOSURE: Record<string, string> = {
  en: "Partner link",
  fr: "Lien partenaire",
  de: "Partnerlink",
  el: "Σύνδεσμος συνεργάτη",
};

export function AffiliateBanner({
  type,
  locale,
  className = "",
}: {
  type: AffiliateKey;
  locale: string;
  className?: string;
}) {
  const titles = TITLES[type];
  if (!titles) return null;
  const title = titles[locale] || titles.en;
  const disclosure = DISCLOSURE[locale] || DISCLOSURE.en;

  return (
    <aside
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-aegean/15 bg-aegean-faint p-4 ${className}`}
    >
      <div className="min-w-0">
        <p className="font-medium text-text">{title}</p>
        <p className="text-[11px] text-text-light uppercase tracking-wide mt-0.5">{disclosure}</p>
      </div>
      <AffiliateCTA type={type} locale={locale} className="shrink-0" />
    </aside>
  );
}
