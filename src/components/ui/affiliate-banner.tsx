import { ExternalLink, Ticket, Car, Ship, BadgeCheck } from "lucide-react";
import { AFFILIATE_LINKS, type AffiliateKey } from "@/lib/affiliates";

// Conversion-focused partner banner (v2, 11/06/2026).
//
// v1 was a sober one-liner with a generic label; it converted nothing it
// could have. v2 keeps the transparency promise (visible partner name +
// "partner link" disclosure, rel="nofollow sponsored") but sells the click:
// - contextual headline (place name injected by the page)
// - verifiable trust line ONLY (free cancellation and "from €5/day" are the
//   partners' own published promises, nothing invented)
// - solid CTA with the partner brand named, because GetYourGuide and
//   DiscoverCars are reassuring brands tourists already know.
const COPY: Partial<Record<AffiliateKey, {
  partner: string;
  Icon: typeof Ticket;
  headline: Record<string, (place?: string) => string>;
  trust: Record<string, string>;
  cta: Record<string, string>;
}>> = {
  tours: {
    partner: "GetYourGuide",
    Icon: Ticket,
    headline: {
      en: p => p ? `Tours, boat trips & skip-the-line tickets in ${p}` : "Tours, boat trips & skip-the-line tickets in Crete",
      fr: p => p ? `Excursions, bateau et billets coupe-file à ${p}` : "Excursions, bateau et billets coupe-file en Crète",
      de: p => p ? `Touren, Bootsausflüge & Tickets ohne Anstehen in ${p}` : "Touren, Bootsausflüge & Tickets ohne Anstehen auf Kreta",
      el: p => p ? `Εκδρομές, σκάφος και εισιτήρια χωρίς ουρά: ${p}` : "Εκδρομές, σκάφος και εισιτήρια χωρίς ουρά στην Κρήτη",
    },
    trust: {
      en: "Free cancellation up to 24h before · reserve now, pay later",
      fr: "Annulation gratuite jusqu'à 24 h avant · réservez maintenant, payez plus tard",
      de: "Kostenlose Stornierung bis 24 Std. vorher · jetzt reservieren, später zahlen",
      el: "Δωρεάν ακύρωση έως 24 ώρες πριν · κράτηση τώρα, πληρωμή μετά",
    },
    cta: {
      en: "See tours on GetYourGuide",
      fr: "Voir sur GetYourGuide",
      de: "Auf GetYourGuide ansehen",
      el: "Δείτε στο GetYourGuide",
    },
  },
  carRental: {
    partner: "DiscoverCars",
    Icon: Car,
    headline: {
      en: p => p ? `Need a car for ${p}?` : "Renting a car in Crete?",
      fr: p => p ? `Besoin d'une voiture pour ${p} ?` : "Une voiture pour explorer la Crète ?",
      de: p => p ? `Mietwagen für ${p}?` : "Mietwagen für Kreta?",
      el: p => p ? `Αυτοκίνητο για ${p};` : "Αυτοκίνητο για την Κρήτη;",
    },
    trust: {
      en: "Compare all rental companies in Crete · from €5/day · free cancellation",
      fr: "Compare tous les loueurs de Crète · dès 5 €/jour · annulation gratuite",
      de: "Alle Vermieter Kretas vergleichen · ab 5 €/Tag · kostenlose Stornierung",
      el: "Σύγκριση όλων των εταιρειών στην Κρήτη · από 5 €/μέρα · δωρεάν ακύρωση",
    },
    cta: {
      en: "Compare prices on DiscoverCars",
      fr: "Comparer sur DiscoverCars",
      de: "Auf DiscoverCars vergleichen",
      el: "Σύγκριση στο DiscoverCars",
    },
  },
  ferry: {
    partner: "Ferryhopper",
    Icon: Ship,
    headline: {
      en: p => p ? `Ferry tickets from ${p}` : "Ferry tickets from and to Crete",
      fr: p => p ? `Billets de ferry depuis ${p}` : "Billets de ferry depuis et vers la Crète",
      de: p => p ? `Fährtickets ab ${p}` : "Fährtickets von und nach Kreta",
      el: p => p ? `Ακτοπλοϊκά από ${p}` : "Ακτοπλοϊκά από και προς την Κρήτη",
    },
    trust: {
      en: "All Greek ferry companies in one search · no hidden fees",
      fr: "Toutes les compagnies grecques en une recherche · sans frais cachés",
      de: "Alle griechischen Fährgesellschaften in einer Suche · keine versteckten Gebühren",
      el: "Όλες οι ακτοπλοϊκές εταιρείες σε μία αναζήτηση · χωρίς κρυφές χρεώσεις",
    },
    cta: {
      en: "Search on Ferryhopper",
      fr: "Chercher sur Ferryhopper",
      de: "Auf Ferryhopper suchen",
      el: "Αναζήτηση στο Ferryhopper",
    },
  },
};

const DISCLOSURE: Record<string, string> = {
  en: "Partner link",
  fr: "Lien partenaire",
  de: "Partnerlink",
  el: "Σύνδεσμος συνεργάτη",
};

/** Curated product photos (Unsplash license), committed in public/. */
const PHOTO: Partial<Record<AffiliateKey, string>> = {
  tours: "tours.jpg",
  carRental: "car-rental.jpg",
  ferry: "ferry.jpg",
};

export function AffiliateBanner({
  type,
  locale,
  placeName,
  className = "",
}: {
  type: AffiliateKey;
  locale: string;
  /** Optional place to contextualize the headline ("Chania", "Knossos"...). */
  placeName?: string;
  className?: string;
}) {
  const copy = COPY[type];
  if (!copy) return null;
  const loc = copy.headline[locale] ? locale : "en";
  const headline = copy.headline[loc](placeName);
  const trust = copy.trust[loc];
  const cta = copy.cta[loc];
  const disclosure = DISCLOSURE[loc] || DISCLOSURE.en;
  const link = AFFILIATE_LINKS[type];
  const Icon = copy.Icon;

  return (
    <aside
      className={`relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#0e3a52] via-aegean to-[#b85c38] bg-[length:300%_100%] animate-gradient shadow-lg md:flex md:items-stretch ${className}`}
    >
      {/* Product photo: an ad about cars must show a car (Kami's call).
          Curated Unsplash assets committed in public/images/partners/. */}
      <div className="relative h-32 w-full shrink-0 md:h-auto md:w-[38%] md:max-w-72">
        <img
          src={`/images/partners/${PHOTO[type]}`}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
        {/* blend the photo into the panel */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e3a52]/70 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#0e3a52]" aria-hidden />
      </div>

      {/* texture: soft radial glow + floating watermark icon */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.10),transparent_55%)]" aria-hidden />
      <Icon
        className="pointer-events-none absolute -right-2 -bottom-6 h-32 w-32 text-white/10 animate-pulse [animation-duration:4s]"
        strokeWidth={1.25}
        aria-hidden
      />
      <div className="relative flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-4 p-5 md:p-6">
        <div className="min-w-0 max-w-xl">
          <p className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            {disclosure} · {copy.partner}
          </p>
          <p className="mt-2.5 font-bold text-white text-lg md:text-xl leading-snug [text-wrap:balance]">
            {headline}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/85">
            <BadgeCheck className="h-4 w-4 shrink-0 text-white" aria-hidden />
            {trust}
          </p>
        </div>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          className="group relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-bold text-terra shadow-md transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          {/* periodic light sweep across the button */}
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-terra/20 to-transparent bg-[length:300%_100%] animate-gradient"
            aria-hidden
          />
          <span className="relative">{cta}</span>
          <ExternalLink className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </a>
      </div>
    </aside>
  );
}
