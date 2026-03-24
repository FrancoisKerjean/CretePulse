import { fetchAllCitiesWeather } from "@/lib/weather";
import { getLatestNews } from "@/lib/news";
import { HomeClient } from "@/components/home/HomeClient";
import type { NewsItem } from "@/lib/types";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const [cities, latestNews] = await Promise.all([
    fetchAllCitiesWeather(),
    getLatestNews(5).catch((): NewsItem[] => []),
  ]);

  return <HomeClient cities={cities} latestNews={latestNews} locale={locale} />;
}
