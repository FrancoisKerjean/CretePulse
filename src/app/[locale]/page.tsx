import { fetchAllCitiesWeather } from "@/lib/weather";
import { getLatestNews } from "@/lib/news";
import { getUpcomingEvents } from "@/lib/events";
import { HomeClient } from "@/components/home/HomeClient";
import type { NewsItem, Event } from "@/lib/types";

export const revalidate = 1800; // Revalidate every 30 min - homepage must feel alive

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const [cities, latestNews, upcomingEvents] = await Promise.all([
    fetchAllCitiesWeather(),
    getLatestNews(8).catch((): NewsItem[] => []),
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
