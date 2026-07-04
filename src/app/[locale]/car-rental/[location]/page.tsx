// /car-rental/[location] : pages-lieu SEO longue traîne (aéroports + ports).
// Même recette que /buses/[pair] : une URL par point d'entrée à forte intention
// transactionnelle ("car rental chania airport"), là où la page mère générique
// ne peut pas battre les agrégateurs (DiscoverCars & co). Contenu GÉO-spécifique
// + wizard préfilé sur le pickup du lieu (initialPickup) ; le générique reste sur
// la page mère, atteinte par le lien retour. Locales rédigées main : en/fr/de,
// les autres en ISR fallback EN (pattern buses/[pair]).
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { CarRentalWizard } from "@/components/car-rental/CarRentalWizard";
import { JsonLd } from "@/components/JsonLd";
import {
  getCarLocation,
  CAR_LOCATIONS,
  CAR_LOC_LOCALES,
  type CarLocLocale,
} from "@/lib/car-locations";

export const revalidate = 86400;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

function pickLoc(l: string): CarLocLocale {
  return (CAR_LOC_LOCALES as string[]).includes(l) ? (l as CarLocLocale) : "en";
}

// Fil d'Ariane + lien retour, traduits pour les locales rédigées main (fallback EN).
const UI: Record<CarLocLocale, { home: string; carRental: string; back: string; wizardLead: string }> = {
  en: {
    home: "Home",
    carRental: "Car rental",
    back: "All car rental in Crete",
    wizardLead: "Request your car for this pick-up point — the local agency replies with a quote.",
  },
  fr: {
    home: "Accueil",
    carRental: "Location de voiture",
    back: "Toute la location de voiture en Crète",
    wizardLead: "Demandez votre voiture pour ce point de prise en charge — l'agence locale répond avec un devis.",
  },
  de: {
    home: "Start",
    carRental: "Mietwagen",
    back: "Mietwagen auf Kreta insgesamt",
    wizardLead: "Fordern Sie Ihren Wagen für diesen Abholpunkt an — die lokale Agentur antwortet mit einem Angebot.",
  },
};

interface Params { locale: string; location: string }

export function generateStaticParams(): Params[] {
  const out: Params[] = [];
  for (const locale of CAR_LOC_LOCALES) {
    for (const l of CAR_LOCATIONS) out.push({ locale, location: l.slug });
  }
  return out;
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { locale, location } = await params;
  setRequestLocale(locale);
  const loc = getCarLocation(location);
  if (!loc) return {};
  const ui = pickLoc(locale);
  const m = loc.meta[ui];
  const ogImage = `${BASE_URL}/images/partners/car-rental.jpg`;
  const url = `${BASE_URL}/${locale}/car-rental/${location}`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, `/car-rental/${location}`),
    openGraph: {
      title: m.title,
      description: m.desc,
      url,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 600, alt: m.title }],
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.desc, images: [ogImage] },
  };
}

export default async function CarLocationPage(
  { params }: { params: Promise<Params> },
) {
  const { locale, location } = await params;
  setRequestLocale(locale);
  const loc = getCarLocation(location);
  if (!loc) notFound();

  const ui = pickLoc(locale);
  const t = loc.content[ui];
  const m = loc.meta[ui];
  const u = UI[ui];
  const pageUrl = `${BASE_URL}/${locale}/car-rental/${location}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: m.title,
        description: m.desc,
        inLanguage: locale,
        isPartOf: { "@type": "WebSite", name: "Crete Direct", url: BASE_URL },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
        mainEntity: { "@id": `${pageUrl}#faq` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: u.home, item: `${BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: u.carRental, item: `${BASE_URL}/${locale}/car-rental` },
          { "@type": "ListItem", position: 3, name: t.h1, item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        inLanguage: locale,
        mainEntity: t.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name: m.title,
        description: m.desc,
        serviceType: "Car rental",
        inLanguage: locale,
        provider: { "@type": "Organization", name: "Crete Direct", url: BASE_URL },
        areaServed: { "@type": "Place", name: "Crete, Greece" },
        url: pageUrl,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-surface">
      <JsonLd data={schema} />

      <div className="mx-auto max-w-3xl px-4 pt-10 pb-14">
        {/* Fil d'Ariane vers la page mère (maillage + crawl) */}
        <Link
          href={`/${locale}/car-rental`}
          className="inline-flex items-center text-[12.5px] text-lagoon-deep font-bold bg-white/70 rounded-full px-3.5 py-1.5 no-underline mb-4 hover:bg-white transition-colors"
        >
          ← {u.back}
        </Link>

        <header className="mb-8">
          <h1 className="font-heading font-extrabold text-4xl md:text-[44px] leading-[1.08] tracking-tight text-text mb-3">
            {t.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">{t.intro}</p>
        </header>

        {/* Lead-in puis wizard préfilé sur le pickup du lieu (canonical propre,
            aucune query string : la prop initialPickup ouvre à l'étape 2) */}
        <p className="text-[15px] text-text font-heading font-semibold mb-3">{u.wizardLead}</p>
        <Suspense fallback={null}>
          <CarRentalWizard locale={locale} initialPickup={loc.pickup} />
        </Suspense>

        {/* Section géo-spécifique : récupération sur place */}
        <section className="mt-12">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">{t.deliveryTitle}</h2>
          <p className="text-[15px] text-text-muted leading-relaxed m-0">{t.delivery}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {t.tips.map((tip) => (
              <div key={tip.h} className="card-base p-5">
                <h3 className="font-heading font-bold text-lg text-text mb-1.5">{tip.h}</h3>
                <p className="text-[14.5px] text-text-muted leading-relaxed m-0">{tip.p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ géo, miroir du JSON-LD FAQPage */}
        <section className="mt-12">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">{t.faqTitle}</h2>
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
