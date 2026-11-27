// /car-rental : page SEO + wizard lead-gen location de voiture.
// Contenu SSR honnête (transparence partenaire, conduite en Crète, FAQ) autour
// de l'île client CarRentalWizard. Aucun paiement en ligne : l'agence locale
// répond directement avec un devis. Funnel discret, zéro branding Kairos.
// Contenu i18n (22 locales) dans ./content. Spec : docs/superpowers/specs/2026-06-12-car-rental-wizard-design.md
import { Suspense } from "react";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { carRentalPageSchema } from "@/lib/schema";
import { CarRentalWizard } from "@/components/car-rental/CarRentalWizard";
import { META, L } from "./content";
import { JsonLd } from "@/components/JsonLd";
import { servedZoneIds } from "@/lib/car-partners-db";
import { TrustBar } from "@/components/car-rental/trust";
import { aggregateRating } from "@/lib/car-trust";
import { partnerRatings } from "@/lib/car-trust-server";
import { showcasesByZone } from "@/lib/car-fleet";
import { CAR_CATEGORIES } from "@/lib/car-catalogue";
import { CAR_LOCATIONS, CAR_LOC_LOCALES, type CarLocLocale } from "@/lib/car-locations";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

// Zones couvertes = celles ayant un loueur actif (registre DB). Fallback = les
// zones historiques d'Auto Smart si la DB est momentanément indisponible.
const STATIC_SERVED = ["chania-west", "rethymno", "heraklion-center"];

// Intro courte, utile au voyageur, et réponse « Dois-je prépayer ? » vraie dans
// les deux parcours (interrupteur CAR_CATALOGUE_ENABLED). Langues routées seulement.
const PAGE_COPY: Record<string, { intro: string; introDeposit: string; prepayDeposit: string }> = {
  en: {
    intro: "Compare prices from local rental agencies for your dates: they reply by email, you choose, and you pay the agency at pick-up.",
    introDeposit: "Compare prices from local rental agencies for your dates, book with a deposit online and pay the rest at pick-up.",
    prepayDeposit: "For offers you can book online, only part of it: a deposit paid online books the car and you pay the rest to the agency at pick-up. If the agency does not confirm within 4 opening hours (8:00 to 22:00, Greek time), the deposit is refunded. Other offers are confirmed directly with the agency, with no online payment.",
  },
  fr: {
    intro: "Comparez les prix des agences de location locales pour vos dates : elles vous répondent par e-mail, vous choisissez, et vous payez l'agence à la prise du véhicule.",
    introDeposit: "Comparez les prix des agences de location locales pour vos dates, réservez avec un acompte en ligne et réglez le reste à la prise du véhicule.",
    prepayDeposit: "Pour les offres réservables en ligne, une partie seulement : un acompte payé en ligne réserve la voiture, et vous réglez le reste à l'agence à la prise du véhicule. Si l'agence ne confirme pas sous 4 h d'ouverture (8 h à 22 h, heure grecque), l'acompte vous est remboursé. Les autres offres se confirment directement avec l'agence, sans paiement en ligne.",
  },
  de: {
    intro: "Vergleichen Sie die Preise lokaler Autovermietungen für Ihre Daten: Sie antworten per E-Mail, Sie wählen und zahlen bei der Abholung.",
    introDeposit: "Vergleichen Sie die Preise lokaler Autovermietungen für Ihre Daten, buchen Sie mit einer Online-Anzahlung und zahlen Sie den Rest bei der Abholung.",
    prepayDeposit: "Bei online buchbaren Angeboten nur einen Teil: Eine online gezahlte Anzahlung sichert das Auto, den Rest zahlen Sie bei der Abholung an die Vermietung. Bestätigt die Vermietung nicht innerhalb von 4 Öffnungsstunden (8 bis 22 Uhr, griechische Zeit), wird die Anzahlung erstattet. Andere Angebote bestätigen Sie direkt mit der Vermietung, ohne Online-Zahlung.",
  },
  el: {
    intro: "Συγκρίνετε τις τιμές τοπικών γραφείων ενοικίασης για τις ημερομηνίες σας: σας απαντούν με email, εσείς επιλέγετε και πληρώνετε το γραφείο κατά την παραλαβή.",
    introDeposit: "Συγκρίνετε τις τιμές τοπικών γραφείων ενοικίασης για τις ημερομηνίες σας, κάντε κράτηση με προκαταβολή online και πληρώστε το υπόλοιπο κατά την παραλαβή.",
    prepayDeposit: "Για τις προσφορές που κρατούνται online, μόνο ένα μέρος: μια προκαταβολή online κλείνει το αυτοκίνητο και το υπόλοιπο το πληρώνετε στο γραφείο κατά την παραλαβή. Αν το γραφείο δεν επιβεβαιώσει εντός 4 ωρών λειτουργίας (8:00 έως 22:00, ώρα Ελλάδας), η προκαταβολή επιστρέφεται. Οι άλλες προσφορές επιβεβαιώνονται απευθείας με το γραφείο, χωρίς πληρωμή online.",
  },
};

const LOCATION_LINKS_COPY: Record<CarLocLocale, { title: string; intro: string; cta: string; airport: string; port: string; city: string }> = {
  en: {
    title: "Popular pick-up points in Crete",
    intro: "Open a dedicated page for the main arrival points and towns in Crete. The quote form starts directly on dates with the right pick-up point selected.",
    cta: "Open",
    airport: "Airport",
    port: "Port",
    city: "Town",
  },
  fr: {
    title: "Points de prise en charge populaires en Crète",
    intro: "Ouvrez une page dédiée aux principales arrivées et villes de Crète. Le formulaire démarre directement sur les dates avec le bon point sélectionné.",
    cta: "Ouvrir",
    airport: "Aéroport",
    port: "Port",
    city: "Ville",
  },
  de: {
    title: "Beliebte Abholpunkte auf Kreta",
    intro: "Öffnen Sie eine eigene Seite für die wichtigsten Ankunftspunkte und Orte auf Kreta. Das Formular startet direkt bei den Daten mit dem passenden Abholpunkt.",
    cta: "Öffnen",
    airport: "Flughafen",
    port: "Hafen",
    city: "Ort",
  },
  el: {
    title: "Δημοφιλή σημεία παραλαβής στην Κρήτη",
    intro: "Ανοίξτε μια ειδική σελίδα για τα κύρια σημεία άφιξης και τις πόλεις της Κρήτης. Η φόρμα προσφοράς ξεκινά απευθείας στις ημερομηνίες με επιλεγμένο το σωστό σημείο παραλαβής.",
    cta: "Άνοιγμα",
    airport: "Αεροδρόμιο",
    port: "Λιμάνι",
    city: "Πόλη",
  },
};

function pickCarLocationLocale(locale: string): CarLocLocale {
  return (CAR_LOC_LOCALES as string[]).includes(locale) ? (locale as CarLocLocale) : "en";
}

export const dynamicParams = true;
export const revalidate = 300; // rafraîchit les zones couvertes toutes les 5 min

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] || META.en;
  const ogImage = `${BASE_URL}/images/partners/car-rental.jpg`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/car-rental"),
    openGraph: {
      title: m.title,
      description: m.desc,
      url: `${BASE_URL}/${locale}/car-rental`,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 600, alt: m.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.desc,
      images: [ogImage],
    },
  };
}

export default async function CarRentalPage(
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Interrupteur lu au rendu serveur ; un changement de variable passe par un redéploiement.
  const depositOn = process.env.CAR_CATALOGUE_ENABLED === "on";
  const pc = PAGE_COPY[locale];
  const base = L[locale] || L.en;
  // La première question de la FAQ est « Dois-je prépayer en ligne ? » (4 langues routées).
  const t = pc && depositOn
    ? { ...base, faq: base.faq.map((f, i) => (i === 0 ? { ...f, a: pc.prepayDeposit } : f)) }
    : base;
  const intro = pc ? (depositOn ? pc.introDeposit : pc.intro) : base.intro;
  const m = META[locale] || META.en;
  const carLocationLocale = pickCarLocationLocale(locale);
  const locationCopy = LOCATION_LINKS_COPY[carLocationLocale];

  const dbZones = await servedZoneIds();
  const servedZones = dbZones.length ? dbZones : STATIC_SERVED;
  // Confiance : note de nos loueurs actifs et leurs vraies voitures, zone par zone.
  const activePartners = await partnerRatings();
  const trust = aggregateRating(activePartners);
  const showcases = showcasesByZone(activePartners, servedZones, CAR_CATEGORIES);

  const schema = carRentalPageSchema({
    locale,
    pageTitle: m.title,
    description: m.desc,
    faqItems: t.faq,
    breadcrumbLabels: { home: t.breadcrumbHome, carRental: t.breadcrumbCarRental },
  });

  return (
    <main className="min-h-screen bg-surface">
      <JsonLd data={schema} />

      <div className="mx-auto max-w-3xl px-4 pt-10 pb-14">
        {/* Contenu statique SSR : la page n'est jamais vide pour Google */}
        <header className="mb-8">
          <h1 className="font-heading font-extrabold text-4xl md:text-[44px] leading-[1.08] tracking-tight text-text mb-3">
            {t.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">
            {intro}
          </p>
          <TrustBar agg={trust} locale={locale} depositOn={depositOn} className="mt-4" />
        </header>

        {/* Île client : useSearchParams() exige un boundary Suspense (Next 16) */}
        <Suspense fallback={null}>
          {/* Interrupteur lu au rendu serveur ; un changement de variable passe par un redéploiement. */}
          <CarRentalWizard locale={locale} servedZones={servedZones} depositOn={depositOn} showcases={showcases} />
        </Suspense>

        <section className="mt-12">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-3">
            {locationCopy.title}
          </h2>
          <p className="m-0 mb-5 text-[15px] leading-relaxed text-text-muted">
            {locationCopy.intro}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CAR_LOCATIONS.map((location) => {
              return (
                <Link
                  key={location.slug}
                  href={`/${locale}/car-rental/${location.slug}`}
                  className="card-base flex items-center justify-between gap-4 p-4 no-underline transition-transform hover:-translate-y-0.5"
                >
                  <span>
                    <span className="block font-heading text-[16px] font-bold text-text">
                      {location.hub[carLocationLocale]}
                    </span>
                    <span className="mt-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                      {locationCopy[location.kind]}
                      {location.code ? ` · ${location.code}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-sun px-3 py-1.5 text-[12px] font-bold text-text">
                    {locationCopy.cta}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Section éditoriale : conduire en Crète, rédigée honnête */}
        <section className="mt-12">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">
            {t.drivingTitle}
          </h2>
          <div className="space-y-6">
            {t.driving.map((d) => (
              <div key={d.h}>
                <h3 className="font-heading font-bold text-lg text-text mb-1.5">{d.h}</h3>
                <p className="text-[15px] text-text-muted leading-relaxed m-0">{d.p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ visible, miroir du JSON-LD FAQPage */}
        <section className="mt-12">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">
            {t.faqTitle}
          </h2>
          <div className="space-y-3">
            {t.faq.map((f) => (
              <details key={f.q} className="card-base p-5">
                <summary className="font-heading font-bold text-text cursor-pointer">{f.q}</summary>
                <p className="mt-2 text-text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
