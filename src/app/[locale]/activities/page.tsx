// /activities : page mère SEO + wizard lead-gen activités.
// Contenu SSR honnête (comment ça marche, FAQ) autour du wizard ActivityWizard.
// Aucun paiement en ligne : les prestataires locaux répondent directement.
// Contenu i18n (4 locales source, 18 autres en 12b) dans ./content.
// Choix statique/dynamique : revalidate = 3600 (ISR) pour que servedCombos()
// soit rechargé toutes les heures depuis Supabase sans bloquer le build.
import { Suspense } from "react";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { ActivityWizard } from "@/components/activities/ActivityWizard";
import { ActivityCatalogSection } from "@/components/activities/ActivityCatalogSection";
import { servedCombos } from "@/lib/activity-partners-db";
import { allCatalogRows } from "@/lib/activity-catalog-db";
import { localizeItem, pickHighlights } from "@/lib/activity-catalog";
import { ACTIVITY_CATEGORIES, categoryLabel } from "@/lib/activity-taxonomy";
import { META, STRINGS } from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export const dynamicParams = true;
export const revalidate = 3600;

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] ?? META.en;
  const ogImage = `${BASE_URL}/images/og/activities.jpg`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/activities"),
    openGraph: {
      title: m.title,
      description: m.desc,
      url: `${BASE_URL}/${locale}/activities`,
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

export default async function ActivitiesPage(
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = STRINGS[locale] ?? STRINGS.en;
  const m = META[locale] ?? META.en;

  const combos = await servedCombos();
  const catalogItems = pickHighlights(await allCatalogRows(), 6).map((r) => localizeItem(r, locale));

  const pageUrl = `${BASE_URL}/${locale}/activities`;

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
          { "@type": "ListItem", position: 2, name: t.breadcrumbActivities, item: pageUrl },
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
          <span className="text-text">{t.breadcrumbActivities}</span>
        </nav>

        {/* Header SSR : jamais vide pour Google */}
        <header className="mb-8">
          <h1 className="font-heading font-extrabold text-4xl md:text-[44px] leading-[1.08] tracking-tight text-text mb-3">
            {t.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">
            {t.intro}
          </p>
        </header>

        {/* Wizard : useSearchParams() exige un boundary Suspense (Next 16) */}
        <div id="wizard" className="scroll-mt-6">
          <Suspense fallback={null}>
            <ActivityWizard locale={locale} servedCombos={combos} />
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

        {/* Cartes catégories */}
        <section className="mt-12">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">
            {t.categoriesTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {ACTIVITY_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${locale}/activities/${cat.slug}`}
                className="card-base flex flex-col gap-1.5 p-5 no-underline transition-transform hover:-translate-y-0.5"
              >
                <span className="font-heading text-[16px] font-bold text-text">
                  {categoryLabel(cat.slug, locale)}
                </span>
                <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  {t.onRequestBadge}
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
