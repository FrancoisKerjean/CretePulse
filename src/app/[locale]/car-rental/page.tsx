// /car-rental : page SEO + wizard lead-gen location de voiture.
// Contenu SSR honnête (transparence partenaire, conduite en Crète, FAQ) autour
// de l'île client CarRentalWizard. Aucun paiement en ligne : l'agence locale
// répond directement avec un devis. Funnel discret, zéro branding Kairos.
// Contenu i18n (22 locales) dans ./content. Spec : docs/superpowers/specs/2026-06-12-car-rental-wizard-design.md
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { carRentalPageSchema } from "@/lib/schema";
import { CarRentalWizard } from "@/components/car-rental/CarRentalWizard";
import { AffiliateCTA } from "@/components/ui/affiliate-cta";
import { META, L, ONLINE_FALLBACK } from "./content";
import { JsonLd } from "@/components/JsonLd";
import { servedZoneIds } from "@/lib/car-partners-db";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

// Zones couvertes = celles ayant un loueur actif (registre DB). Fallback = les
// zones historiques d'Auto Smart si la DB est momentanément indisponible.
const STATIC_SERVED = ["chania-west", "rethymno", "heraklion-center"];

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

        {/* Repli online secondaire : DiscoverCars (affilié réel). Volontairement
            discret pour ne pas concurrencer le wizard Auto Smart primaire. */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white/60 px-5 py-4">
          <p className="m-0 max-w-md text-sm text-text-muted">
            {ONLINE_FALLBACK[locale] || ONLINE_FALLBACK.en}
          </p>
          <AffiliateCTA type="carRental" locale={locale} />
        </div>

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
