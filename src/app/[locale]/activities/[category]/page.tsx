// /activities/[category] : hub par catégorie (food-tours, boat-trips, hiking).
// generateStaticParams : 3 slugs × 22 locales.
// notFound() sur slug invalide. Meta depuis CATEGORY_META (fallback en).
// Wizard pré-rempli avec initialCategory.
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { ActivityWizard } from "@/components/activities/ActivityWizard";
import { ActivityCatalogSection } from "@/components/activities/ActivityCatalogSection";
import { servedCombos } from "@/lib/activity-partners-db";
import { catalogRowsForCategory } from "@/lib/activity-catalog-db";
import { localizeItem, mixByCity } from "@/lib/activity-catalog";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CITIES,
  isCategorySlug,
  categoryLabel,
  cityLabel,
} from "@/lib/activity-taxonomy";
import { STRINGS, CATEGORY_META, CATEGORY_STRINGS } from "../content";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export const dynamicParams = false;
export const revalidate = 3600;

type Params = { locale: string; category: string };

export function generateStaticParams(): Params[] {
  return routing.locales.flatMap((locale) =>
    ACTIVITY_CATEGORIES.map((cat) => ({ locale, category: cat.slug })),
  );
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { locale, category } = await params;
  setRequestLocale(locale);
  if (!isCategorySlug(category)) return {};

  const catMeta = CATEGORY_META[category];
  const m = catMeta?.[locale] ?? catMeta?.en ?? { title: categoryLabel(category, locale), desc: "" };
  const ogImage = `${BASE_URL}/images/og/activities.jpg`;

  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, `/activities/${category}`),
    openGraph: {
      title: m.title,
      description: m.desc,
      url: `${BASE_URL}/${locale}/activities/${category}`,
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

export default async function ActivityCategoryPage(
  { params }: { params: Promise<Params> },
) {
  const { locale, category } = await params;
  setRequestLocale(locale);

  if (!isCategorySlug(category)) notFound();

  const t = STRINGS[locale] ?? STRINGS.en;
  const catMeta = CATEGORY_META[category];
  const m = catMeta?.[locale] ?? catMeta?.en ?? { title: categoryLabel(category, locale), desc: "" };
  const catStrings = CATEGORY_STRINGS[category];
  const cs = catStrings?.[locale] ?? catStrings?.en ?? { h1: categoryLabel(category, locale), intro: "" };

  const combos = await servedCombos();
  const catalogItems = mixByCity(await catalogRowsForCategory(category), 2).map((r) => localizeItem(r, locale));

  const pageUrl = `${BASE_URL}/${locale}/activities/${category}`;

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
          { "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: `${BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: t.breadcrumbActivities, item: `${BASE_URL}/${locale}/activities` },
          { "@type": "ListItem", position: 3, name: cs.h1, item: pageUrl },
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
          <span className="text-text">{cs.h1}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="font-heading font-extrabold text-4xl md:text-[44px] leading-[1.08] tracking-tight text-text mb-3">
            {cs.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">
            {cs.intro}
          </p>
        </header>

        {/* Wizard pré-rempli avec la catégorie */}
        <div id="wizard" className="scroll-mt-6">
          <Suspense fallback={null}>
            <ActivityWizard locale={locale} initialCategory={category} servedCombos={combos} />
          </Suspense>
        </div>

        <ActivityCatalogSection
          locale={locale}
          items={catalogItems}
          title={t.catalogTitle}
          note={t.catalogNote}
          fromTpl={t.catalogFrom}
          cta={t.catalogCta}
          showCity
        />

        {/* Liens vers les 5 hubs villes */}
        <section className="mt-12">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">
            {t.categoriesTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACTIVITY_CITIES.map((city) => (
              <Link
                key={city.slug}
                href={`/${locale}/activities/${category}/${city.slug}`}
                className="card-base flex items-center justify-between gap-4 p-4 no-underline transition-transform hover:-translate-y-0.5"
              >
                <span className="font-heading text-[15px] font-bold text-text">
                  {cityLabel(city.slug, locale)}
                </span>
                <span className="shrink-0 rounded-full bg-sun px-3 py-1.5 text-[12px] font-bold text-text">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

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

        {/* FAQ commune */}
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
