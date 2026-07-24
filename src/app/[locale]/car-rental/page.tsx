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
import { CAR_LOCATIONS, CAR_LOC_LOCALES, type CarLocLocale } from "@/lib/car-locations";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

// Zones couvertes = celles ayant un loueur actif (registre DB). Fallback = les
// zones historiques d'Auto Smart si la DB est momentanément indisponible.
const STATIC_SERVED = ["chania-west", "rethymno", "heraklion-center"];

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
  const t = L[locale] || L.en;
  const m = META[locale] || META.en;
  const carLocationLocale = pickCarLocationLocale(locale);
  const locationCopy = LOCATION_LINKS_COPY[carLocationLocale];

  const dbZones = await servedZoneIds();
  const servedZones = dbZones.length ? dbZones : STATIC_SERVED;

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
            {t.intro}
          </p>
        </header>

        {/* Île client : useSearchParams() exige un boundary Suspense (Next 16) */}
        <Suspense fallback={null}>
          <CarRentalWizard locale={locale} servedZones={servedZones} />
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
                      {location.kind === "airport" ? locationCopy.airport : locationCopy.port}
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
