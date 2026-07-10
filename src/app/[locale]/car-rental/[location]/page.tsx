import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { buildAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { CarRentalWizard } from "@/components/car-rental/CarRentalWizard";
import { servedZoneIds } from "@/lib/car-partners-db";
import {
  CAR_LOCATIONS,
  CAR_LOC_LOCALES,
  getCarLocation,
  type CarLocLocale,
} from "@/lib/car-locations";

export const revalidate = 86400;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const STATIC_SERVED = ["chania-west", "rethymno", "heraklion-center"];

type Params = { locale: string; location: string };

const UI: Record<CarLocLocale, { home: string; carRental: string; back: string; wizardLead: string }> = {
  en: {
    home: "Home",
    carRental: "Car rental",
    back: "All car rental in Crete",
    wizardLead: "Request this pick-up point. A local rental agency replies with a quote.",
  },
  fr: {
    home: "Accueil",
    carRental: "Location de voiture",
    back: "Toute la location de voiture en Crète",
    wizardLead: "Demandez ce point de prise en charge. Une agence locale répond avec un devis.",
  },
  de: {
    home: "Start",
    carRental: "Mietwagen",
    back: "Mietwagen auf Kreta",
    wizardLead: "Fragen Sie diesen Abholpunkt an. Eine lokale Agentur antwortet mit einem Angebot.",
  },
  el: {
    home: "Αρχική",
    carRental: "Ενοικίαση αυτοκινήτου",
    back: "Όλη η ενοικίαση αυτοκινήτου στην Κρήτη",
    wizardLead: "Ζητήστε αυτό το σημείο παραλαβής. Ένα τοπικό γραφείο ενοικίασης απαντά με προσφορά.",
  },
};

function pickLocale(locale: string): CarLocLocale {
  return (CAR_LOC_LOCALES as string[]).includes(locale) ? (locale as CarLocLocale) : "en";
}

export function generateStaticParams(): Params[] {
  return CAR_LOC_LOCALES.flatMap((locale) =>
    CAR_LOCATIONS.map((location) => ({ locale, location: location.slug })),
  );
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { locale, location } = await params;
  setRequestLocale(locale);
  const loc = getCarLocation(location);
  if (!loc) return {};

  const copyLocale = pickLocale(locale);
  const m = loc.meta[copyLocale];
  const ogImage = `${BASE_URL}/images/partners/car-rental.jpg`;

  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, `/car-rental/${location}`),
    openGraph: {
      title: m.title,
      description: m.desc,
      url: `${BASE_URL}/${locale}/car-rental/${location}`,
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

export default async function CarLocationPage(
  { params }: { params: Promise<Params> },
) {
  const { locale, location } = await params;
  setRequestLocale(locale);
  const loc = getCarLocation(location);
  if (!loc) notFound();

  const copyLocale = pickLocale(locale);
  const t = loc.content[copyLocale];
  const m = loc.meta[copyLocale];
  const ui = UI[copyLocale];
  const pageUrl = `${BASE_URL}/${locale}/car-rental/${location}`;

  const dbZones = await servedZoneIds();
  const servedZones = dbZones.length ? dbZones : STATIC_SERVED;

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
          { "@type": "ListItem", position: 1, name: ui.home, item: `${BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: ui.carRental, item: `${BASE_URL}/${locale}/car-rental` },
          { "@type": "ListItem", position: 3, name: t.h1, item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        inLanguage: locale,
        mainEntity: t.faq.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
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
        <Link
          href={`/${locale}/car-rental`}
          className="mb-4 inline-flex items-center rounded-full bg-white/70 px-3.5 py-1.5 text-[12.5px] font-bold text-lagoon-deep no-underline transition-colors hover:bg-white"
        >
          {ui.back}
        </Link>

        <header className="mb-8">
          <h1 className="mb-3 font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-text md:text-[44px]">
            {t.h1}
          </h1>
          <p className="m-0 text-[15.5px] leading-relaxed text-text-muted">{t.intro}</p>
        </header>

        <p className="mb-3 text-[15px] font-semibold text-text">{ui.wizardLead}</p>
        <Suspense fallback={null}>
          {/* initialSource : une visite organique de la landing est attribuée à la
              landing elle-même ; un clic CTA interne arrive avec ?source= qui prime. */}
          <CarRentalWizard
            locale={locale}
            servedZones={servedZones}
            initialPickup={loc.pickup}
            initialSource={`landing-${loc.slug}`}
          />
        </Suspense>

        <section className="mt-12">
          <h2 className="mb-5 font-heading text-[26px] font-extrabold text-text">{t.deliveryTitle}</h2>
          <p className="m-0 text-[15px] leading-relaxed text-text-muted">{t.delivery}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {t.tips.map((tip) => (
              <div key={tip.h} className="card-base p-5">
                <h3 className="mb-1.5 font-heading text-lg font-bold text-text">{tip.h}</h3>
                <p className="m-0 text-[14.5px] leading-relaxed text-text-muted">{tip.p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-5 font-heading text-[26px] font-extrabold text-text">{t.faqTitle}</h2>
          <div className="space-y-3">
            {t.faq.map((faq) => (
              <details key={faq.q} className="card-base p-5">
                <summary className="cursor-pointer font-heading font-bold text-text">{faq.q}</summary>
                <p className="mt-2 text-text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
