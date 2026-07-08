import { setRequestLocale } from "next-intl/server";
import { getAllCbPlaces } from "@/lib/cb-places";
import { getAffiliatePlaces } from "@/lib/affiliate-places";
import { buildAlternates } from "@/lib/seo";
import { ExploreView } from "@/components/explore/ExploreView";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Crete Explorer - Every Beach, Gorge, Cave & Village on the Map",
    desc: "Interactive explorer of Crete: hundreds of beaches, gorges, caves, monasteries, islands and villages with photos, ratings and detailed info. Filter by sand type, water color, crowds and more.",
  },
  fr: {
    title: "Explorateur de Crète - Plages, Gorges, Grottes & Villages sur la Carte",
    desc: "Explorateur interactif de la Crète : des centaines de plages, gorges, grottes, monastères, îles et villages avec photos, notes et infos détaillées. Filtrez par type de sable, couleur de l'eau, affluence.",
  },
  de: {
    title: "Kreta Explorer - Jeder Strand, jede Schlucht & jedes Dorf auf der Karte",
    desc: "Interaktiver Kreta-Explorer: Hunderte Strände, Schluchten, Höhlen, Klöster, Inseln und Dörfer mit Fotos, Bewertungen und Details. Filtern nach Sandtyp, Wasserfarbe, Andrang.",
  },
  el: {
    title: "Εξερευνητής Κρήτης - Κάθε Παραλία, Φαράγγι & Χωριό στον Χάρτη",
    desc: "Διαδραστικός εξερευνητής της Κρήτης: εκατοντάδες παραλίες, φαράγγια, σπήλαια, μοναστήρια, νησιά και χωριά με φωτογραφίες, βαθμολογίες και λεπτομέρειες.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] || META.en;
  const ogImage = `${BASE_URL}/api/og?title=${encodeURIComponent(m.title)}`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/explore"),
    openGraph: {
      type: "website",
      siteName: "Crete Direct",
      title: m.title,
      description: m.desc,
      url: `${BASE_URL}/${locale}/explore`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.desc,
      images: [ogImage],
    },
  };
}

export default async function ExplorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [places, affiliatePlaces] = await Promise.all([
    getAllCbPlaces().catch(() => []),
    getAffiliatePlaces().catch(() => []),
  ]);

  const m = META[locale] || META.en;
  const pageUrl = `${BASE_URL}/${locale}/explore`;
  // Rendered as a real <script> (not Next `other` meta) so Google parses it as
  // structured data. CollectionPage describes the explorer; BreadcrumbList gives
  // Home > Explore for the SERP breadcrumb.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        name: m.title,
        description: m.desc,
        url: pageUrl,
        isPartOf: { "@type": "WebSite", name: "Crete Direct", url: BASE_URL },
        about: { "@type": "Place", name: "Crete, Greece" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Crete Direct", item: `${BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: m.title, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ExploreView places={places} affiliatePlaces={affiliatePlaces} locale={locale} />
    </main>
  );
}
