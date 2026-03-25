import { fetchAllCitiesWeather } from "@/lib/weather";
import { getLatestNews } from "@/lib/news";
import { getUpcomingEvents } from "@/lib/events";
import { HomeClient } from "@/components/home/HomeClient";
import type { NewsItem, Event, Locale } from "@/lib/types";

export const revalidate = 1800; // Revalidate every 30 min - homepage must feel alive

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
  const m = HOME_META[locale] || HOME_META.en;
  const url = `${BASE_URL}/${locale}`;

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Crete Direct",
    url: BASE_URL,
    description: m.desc,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/${locale}/beaches?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return {
    title: m.title,
    description: m.desc,
    alternates: { canonical: url },
    openGraph: {
      title: m.title,
      description: m.desc,
      url,
      type: "website",
    },
    other: {
      "script:ld+json": JSON.stringify(websiteSchema),
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const [cities, latestNews, upcomingEvents] = await Promise.all([
    fetchAllCitiesWeather(),
    getLatestNews(8, locale).catch((): NewsItem[] => []),
    getUpcomingEvents().then(e => e.slice(0, 5)).catch((): Event[] => []),
  ]);

  return (
    <HomeClient
      cities={cities}
      latestNews={latestNews}
      upcomingEvents={upcomingEvents}
      locale={locale}
    />
  );
}
