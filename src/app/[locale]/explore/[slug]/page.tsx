// Fiche detaillee d'un lieu cb_places. La page /explore garde son drawer
// compact ; pour avoir une vue complete (hero bento, description repliee, CTAs,
// URL partageable, SEO), on ouvre cette page via "Voir la fiche".

import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCbPlaceBySlug } from "@/lib/cb-places";
import { typeLabel } from "@/lib/cb-type-labels";
import { cleanCbDescription } from "@/lib/cb-place-helpers";
import { CbPlaceActions } from "@/components/explore/CbPlaceActions";
import { buildAlternates } from "@/lib/seo";
import { ExploreBento } from "@/components/explore/bento/ExploreBento";
import { ReadMoreAccordion } from "@/components/explore/bento/shared/ReadMoreAccordion";
import { ReviewCTA } from "@/components/reviews/ReviewCTA";

export const revalidate = 86400;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const T: Record<string, Record<string, string>> = {
  en: { backToMap: "Back to map", moreSource: "More info on source" },
  fr: { backToMap: "Retour à la carte", moreSource: "Plus d'infos sur la source" },
  de: { backToMap: "Zurück zur Karte", moreSource: "Mehr Infos auf der Quelle" },
  el: { backToMap: "Πίσω στον χάρτη", moreSource: "Περισσότερα στην πηγή" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const place = await getCbPlaceBySlug(slug);
  if (!place) return { title: "Place not found" };
  const type = typeLabel(place.place_type, locale);
  const title = `${place.name} · ${type} · Crete Direct`;
  const description =
    place.meta_description ||
    (place.description ? place.description.slice(0, 160) : `${place.name}, ${type}, Crete.`);
  const url = `${BASE_URL}/${locale}/explore/${place.slug}`;
  const ogImage = place.photos?.[0];
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/explore/${slug}`),
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ogImage ? [{ url: ogImage, alt: place.name }] : [],
    },
  };
}

export async function generateStaticParams() {
  // Pas de pre-rendu massif (24K pages) : on laisse l'ISR generer a la demande.
  return [];
}

export default async function CbPlaceFichePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = T[locale] ?? T.en;

  const place = await getCbPlaceBySlug(slug);
  if (!place) notFound();

  const { paragraphs } = cleanCbDescription(place.description);

  // Agrégat communautaire (avis publiés), revalidé via tag `place-<slug>`.
  const aggregate = await fetch(
    `${BASE_URL}/api/reviews/aggregate?slug=${encodeURIComponent(slug)}`,
    { next: { tags: [`place-${slug}`] } },
  )
    .then((r) => r.json())
    .catch(() => ({ avg: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }));
  const communityAvg: number | null = aggregate.avg;
  const communityCount: number = aggregate.count;

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href={`/${locale}/explore?place=${place.slug}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-sea hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> {t.backToMap}
        </Link>

        <ExploreBento
          place={place}
          locale={locale}
          communityAvg={communityAvg}
          communityCount={communityCount}
        />

        <CbPlaceActions
          slug={place.slug}
          name={place.name}
          latitude={place.latitude}
          longitude={place.longitude}
          locale={locale}
          showSheetLink={false}
        />

        <ReadMoreAccordion paragraphs={paragraphs} locale={locale} />

        <ReviewCTA
          slug={place.slug}
          placeName={place.name}
          locale={locale}
          communityCount={communityCount}
        />

        {place.source_url && (
          <p className="mt-8 text-xs text-text-muted">
            <a href={place.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t.moreSource}
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
