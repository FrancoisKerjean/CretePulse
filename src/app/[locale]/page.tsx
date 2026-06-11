import { fetchAllCitiesWeather } from "@/lib/weather";
import { setRequestLocale } from "next-intl/server";
import { getLatestNews } from "@/lib/news";
import { getUpcomingEvents } from "@/lib/events";
import { getEditorialGuides, type Guide } from "@/lib/guides";
import { buildSwimToday } from "@/lib/swim-today";
import { getBusRoutes, type BusRoute } from "@/lib/buses";
import { pairSlug } from "@/lib/bus-pairs";
import { HomeClient, type SwimPickLite, type SwimSideLite } from "@/components/home/HomeClient";
import type { NewsItem, Event, Locale } from "@/lib/types";
import { getLocalizedField } from "@/lib/types";
import { buildAlternates } from "@/lib/seo";

export const revalidate = 7200; // 2h - reduce Supabase egress

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const HOME_META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Crete Direct - What's happening in Crete | Weather, Events, News",
    desc: "Live weather, upcoming events, 500+ beaches and local news from Crete. Updated every hour. Free, in English, French, German and Greek.",
  },
  fr: {
    title: "Crete Direct - Ce qui se passe en Crète | Météo, Événements, Actus",
    desc: "Météo en direct, événements à venir, 500+ plages et actus locales de Crète. Mis à jour chaque heure. Gratuit, en 4 langues.",
  },
  de: {
    title: "Crete Direct - Was auf Kreta los ist | Wetter, Events, Nachrichten",
    desc: "Live-Wetter, bevorstehende Events, 500+ Strände und lokale Nachrichten aus Kreta. Stündlich aktualisiert. Kostenlos, in 4 Sprachen.",
  },
  el: {
    title: "Crete Direct - Τι συμβαίνει στην Κρήτη | Καιρός, Εκδηλώσεις, Νέα",
    desc: "Live καιρός, επερχόμενες εκδηλώσεις, 500+ παραλίες και τοπικά νέα από την Κρήτη. Ανανέωση κάθε ώρα. Δωρεάν, σε 4 γλώσσες.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = HOME_META[locale] || HOME_META.en;
  const url = `${BASE_URL}/${locale}`;

  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale),
    openGraph: {
      title: m.title,
      description: m.desc,
      url,
      type: "website",
    },
    // WebSite + SearchAction JSON-LD is rendered as a real <script> in HomePage below
    // (Next renders `other` as <meta>, which Google does not read as structured data).
  };
}

function buildWebsiteSchema(locale: string, desc: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Crete Direct",
    url: BASE_URL,
    description: desc,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/${locale}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = HOME_META[locale] || HOME_META.en;
  const websiteSchema = buildWebsiteSchema(locale, m.desc);

  const [cities, latestNews, upcomingEvents, latestGuides, swim, busRoutes] = await Promise.all([
    fetchAllCitiesWeather(),
    getLatestNews(8, locale).catch((): NewsItem[] => []),
    getUpcomingEvents(5).catch((): Event[] => []),
    getEditorialGuides(12).catch((): Guide[] => []),
    buildSwimToday().catch(() => null),
    getBusRoutes().catch((): BusRoute[] => []),
  ]);

  // Routes des liaisons principales pour le board nuit (DepBoard trie/dedup).
  const boardPairs = new Set(
    [
      ["Heraklion", "Chania"],
      ["Heraklion", "Ierapetra"],
      ["Chania", "Paleochora"],
      ["Heraklion", "Agios Nikolaos"],
      ["Heraklion", "Siteia"],
      ["Ierapetra", "Makry Gyalos"],
    ]
      .map(([a, b]) => pairSlug(a, b))
      .filter((s): s is string => s !== null),
  );
  const boardRoutes = busRoutes.filter((r) => {
    const p = pairSlug(r.from_place, r.to_place);
    return p !== null && boardPairs.has(p);
  });

  // Extrait serialisable de la preco baignade du jour (le SwimToday complet
  // est lourd : cities + scored ~500 plages, inutile cote client).
  const uiLoc = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as Locale;
  const swimPick: SwimPickLite | null = swim
    ? {
        name: getLocalizedField(swim.pick.beach, "name", uiLoc),
        slug: swim.pick.beach.slug,
        imageUrl: swim.pick.imageUrl,
        rating: swim.pick.rating,
        windSpeed: swim.pick.windSpeed,
        windCardinal: swim.pick.windCardinal,
        windDir: swim.pick.city.windDir,
        seaTemp: swim.pick.seaTemp,
        region: swim.pick.beach.region ?? null,
        cityName: swim.pick.city.name,
      }
    : null;

  // 2 alternatives pour les cartes laterales du bloc baignade.
  const swimSides: SwimSideLite[] = swim
    ? swim.scored
        .filter((s) => s.beach.slug !== swim.pick.beach.slug)
        .slice(0, 2)
        .map((s) => ({
          name: getLocalizedField(s.beach, "name", uiLoc),
          slug: s.beach.slug,
          imageUrl: s.imageUrl,
          rating: s.rating,
        }))
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <HomeClient
        cities={cities}
        latestNews={latestNews}
        upcomingEvents={upcomingEvents}
        latestGuides={latestGuides}
        swimPick={swimPick}
        swimSides={swimSides}
        boardRoutes={boardRoutes}
        locale={locale}
      />
    </>
  );
}
