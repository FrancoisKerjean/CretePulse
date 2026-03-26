import type { MetadataRoute } from "next";
import { getAllBeaches } from "@/lib/beaches";
import { getAllVillages } from "@/lib/villages";
import { getAllFoodPlaces } from "@/lib/food";
import { getAllHikes } from "@/lib/hikes";
import { getLatestNews } from "@/lib/news";
import { getUpcomingEvents } from "@/lib/events";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const LOCALES = ["en", "fr", "de", "el", "it", "nl", "pl"] as const;

const STATIC_PAGES = [
  "",
  "/beaches",
  "/villages",
  "/events",
  "/weather",
  "/news",
  "/hikes",
  "/food",
  "/articles",
  "/about",
  "/buses",
  "/fire-alerts",
  "/property-management",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages for all locales
  for (const locale of LOCALES) {
    for (const page of STATIC_PAGES) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "daily" : "weekly",
        priority: page === "" ? 1.0 : 0.8,
      });
    }
  }

  // Dynamic beach pages
  try {
    const beaches = await getAllBeaches();
    for (const beach of beaches) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}/beaches/${beach.slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  } catch {
    // Supabase unreachable at build time — skip dynamic beach URLs
  }

  // Dynamic village pages
  try {
    const villages = await getAllVillages();
    for (const village of villages) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}/villages/${village.slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  } catch {
    // Supabase unreachable at build time — skip dynamic village URLs
  }

  // Beaches near village pages
  try {
    const villagesForBeaches = await getAllVillages();
    for (const village of villagesForBeaches) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}/beaches/near/${village.slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }
  } catch {
    // Skip if Supabase unreachable
  }

  // Dynamic food pages
  try {
    const foodPlaces = await getAllFoodPlaces();
    for (const place of foodPlaces) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}/food/${place.slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  } catch {
    // Supabase unreachable at build time — skip dynamic food URLs
  }

  // Dynamic hike pages
  try {
    const hikes = await getAllHikes();
    for (const hike of hikes) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}/hikes/${hike.slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  } catch {
    // Supabase unreachable at build time — skip dynamic hike URLs
  }

  // Dynamic news pages (rewritten only)
  try {
    const newsItems = await getLatestNews(100, "en");
    for (const item of newsItems) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}/news/${item.slug}`,
          lastModified: new Date(item.published_at),
          changeFrequency: "daily",
          priority: 0.5,
        });
      }
    }
  } catch {
    // Supabase unreachable at build time — skip dynamic news URLs
  }

  // Dynamic event pages
  try {
    const events = await getUpcomingEvents();
    for (const event of events) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}/events/${event.slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // Supabase unreachable at build time — skip dynamic event URLs
  }

  // Programmatic weather pages (city x month)
  const { CITIES: weatherCities, MONTHS: weatherMonths } = await import("@/lib/weather-monthly");
  for (const city of weatherCities) {
    for (const month of weatherMonths) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}/weather/${city.slug}/${month}`,
          lastModified: new Date(),
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }
  }

  return entries;
}
