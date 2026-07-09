// /activities/[category]/[city] : hub catégorie × ville.
// generateStaticParams : 3 catégories × 5 villes × 22 locales = 330 pages.
// notFound() si slug category ou city invalide.
// Title/intro depuis CITY_TITLE_TPL / CITY_INTRO_TPL remplis avec les labels traduits.
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { ActivityWizard } from "@/components/activities/ActivityWizard";
import { servedCombos } from "@/lib/activity-partners-db";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CITIES,
  isCategorySlug,
  isCitySlug,
  categoryLabel,
  cityLabel,
} from "@/lib/activity-taxonomy";
import { STRINGS, CITY_TITLE_TPL, CITY_INTRO_TPL } from "../../content";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export const dynamicParams = false;
export const revalidate = 3600;

type Params = { locale: string; category: string; city: string };

/** Remplace {category} et {city} dans un template. */
function fillTpl(tpl: string, catLabel: string, ctyLabel: string): string {
  return tpl.replace("{category}", catLabel).replace("{city}", ctyLabel);
}

export function generateStaticParams(): Params[] {
  return routing.locales.flatMap((locale) =>
    ACTIVITY_CATEGORIES.flatMap((cat) =>
      ACTIVITY_CITIES.map((city) => ({ locale, category: cat.slug, city: city.slug })),
    ),
  );
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { locale, category, city } = await params;
  setRequestLocale(locale);
  if (!isCategorySlug(category) || !isCitySlug(city)) return {};

  const catLabel = categoryLabel(category, locale);
  const ctyLabel = cityLabel(city, locale);
  const tplLocale = CITY_TITLE_TPL[locale] ? locale : "en";
  const title = fillTpl(CITY_TITLE_TPL[tplLocale], catLabel, ctyLabel);
  const intro = fillTpl(CITY_INTRO_TPL[tplLocale] ?? CITY_INTRO_TPL.en, catLabel, ctyLabel);
  const ogImage = `${BASE_URL}/images/og/activities.jpg`;

  return {
    title,
    description: intro,
    alternates: buildAlternates(locale, `/activities/${category}/${city}`),
    openGraph: {
      title,
      description: intro,
      url: `${BASE_URL}/${locale}/activities/${category}/${city}`,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 600, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: intro,
      images: [ogImage],
    },
  };
}

export default async function ActivityCityPage(
  { params }: { params: Promise<Params> },
) {
  const { locale, category, city } = await params;
  setRequestLocale(locale);

  if (!isCategorySlug(category) || !isCitySlug(city)) notFound();

  const t = STRINGS[locale] ?? STRINGS.en;
  const catLabel = categoryLabel(category, locale);
  const ctyLabel = cityLabel(city, locale);

  const tplLocale = CITY_TITLE_TPL[locale] ? locale : "en";
  const h1 = fillTpl(CITY_TITLE_TPL[tplLocale], catLabel, ctyLabel);
  const intro = fillTpl(CITY_INTRO_TPL[tplLocale] ?? CITY_INTRO_TPL.en, catLabel, ctyLabel);

  const combos = await servedCombos();

  const pageUrl = `${BASE_URL}/${locale}/activities/${category}/${city}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: h1,
        description: intro,
        inLanguage: locale,
        isPartOf: { "@type": "WebSite", name: "Crete Direct", url: BASE_URL },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
        mainEntity: { "@id": `${pageUrl}#faq` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: `${BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: t.breadcrumbActivities, item: `${BASE_URL}/${locale}/activities` },
          { "@type": "ListItem", position: 3, name: catLabel, item: `${BASE_URL}/${locale}/activities/${category}` },
          { "@type": "ListItem", position: 4, name: ctyLabel, item: pageUrl },
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
    ],
  };

  return (
    <main className="min-h-screen bg-surface">
      <JsonLd data={schema} />

      <div className="mx-auto max-w-3xl px-4 pt-10 pb-14">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-6 text-[12.5px] text-text-muted">
          <Link href={`/${locale}`} className="hover:text-text transition-colors no-underline">
            {t.breadcrumbHome}
          </Link>
          <span className="mx-1.5">›</span>
          <Link href={`/${locale}/activities`} className="hover:text-text transition-colors no-underline">
            {t.breadcrumbActivities}
          </Link>
          <span className="mx-1.5">›</span>
          <Link href={`/${locale}/activities/${category}`} className="hover:text-text transition-colors no-underline">
            {catLabel}
          </Link>
          <span className="mx-1.5">›</span>
          <span className="text-text">{ctyLabel}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="font-heading font-extrabold text-4xl md:text-[44px] leading-[1.08] tracking-tight text-text mb-3">
            {h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">
            {intro}
          </p>
        </header>

        {/* Wizard pré-rempli catégorie + ville */}
        <Suspense fallback={null}>
          <ActivityWizard
            locale={locale}
            initialCategory={category}
            initialCity={city}
            servedCombos={combos}
          />
        </Suspense>

        {/* Comment ça marche */}
        <section className="mt-12">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">
            {t.howTitle}
          </h2>
          <div className="space-y-6">
            {t.how.map((step, i) => (
              <div key={step.h} className="flex gap-4">
                <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-sun text-[13px] font-heading font-bold text-text">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-heading font-bold text-lg text-text mb-1.5">{step.h}</h3>
                  <p className="text-[15px] text-text-muted leading-relaxed m-0">{step.p}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ commune + JSON-LD FAQPage */}
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
