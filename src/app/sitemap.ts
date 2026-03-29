import type { MetadataRoute } from "next";
import { getAllBeaches } from "@/lib/beaches";
import { getAllVillages } from "@/lib/villages";
import { getAllFoodPlaces } from "@/lib/food";
import { getAllHikes } from "@/lib/hikes";
import { getLatestNews } from "@/lib/news";
import { getUpcomingEvents } from "@/lib/events";
import { MONTHS } from "@/lib/weather-monthly";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const LOCALES = ["en", "fr", "de", "el", "it", "nl", "pl", "es", "pt", "ru", "ja", "ko", "zh", "tr", "sv", "da", "no", "fi", "cs", "hu", "ro", "ar"] as const;

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
  let villages: Awaited<ReturnType<typeof getAllVillages>> | null = null;
  try {
    villages = await getAllVillages();
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

  // Beaches near village pages (reuse villages from above)
  try {
    const villagesForBeaches = villages ?? await getAllVillages();
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

  // Visit Crete in [month] pages
  for (const month of MONTHS) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/visit/${month}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
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

  // Things to do in [city] pages
  for (const city of weatherCities) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/things-to-do/${city.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // Best beaches for [activity] pages
  const BEACH_ACTIVITIES = ["snorkeling", "kids", "swimming", "secluded", "sandy", "pebble"];
  for (const activity of BEACH_ACTIVITIES) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/beaches/best-for/${activity}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // Transport route pages
  const routeSlugs = ["heraklion-to-chania", "heraklion-to-rethymno", "heraklion-to-agios-nikolaos", "heraklion-airport-to-city", "chania-airport-to-city", "athens-to-crete", "crete-to-santorini", "heraklion-to-sitia"];
  for (const slug of routeSlugs) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/getting-around/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // Comparison pages (A vs B)
  const compSlugs = ["chania-vs-heraklion", "chania-vs-rethymno", "heraklion-vs-rethymno", "agios-nikolaos-vs-elounda", "malia-vs-hersonissos", "sitia-vs-ierapetra", "chania-vs-agios-nikolaos", "crete-vs-santorini", "crete-vs-rhodes", "crete-vs-corfu", "crete-vs-mykonos", "crete-vs-cyprus", "elafonisi-vs-balos", "elafonisi-vs-vai", "balos-vs-preveli"];
  for (const slug of compSlugs) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/compare/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // Where to stay pages
  const areaSlugs = ["chania", "heraklion", "rethymno", "agios-nikolaos", "elounda", "plakias", "paleochora", "matala"];
  for (const slug of areaSlugs) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/where-to-stay/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // Itinerary pages
  const itinerarySlugs = ["3-days", "5-days", "7-days", "10-days"];
  for (const slug of itinerarySlugs) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/itineraries/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  // Archaeological sites
  const archSlugs = ["knossos", "phaistos", "spinalonga", "gortyna", "malia-palace", "aptera"];
  for (const slug of archSlugs) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/archaeology/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // Utility pages
  for (const locale of LOCALES) {
    entries.push(
      { url: `${BASE_URL}/${locale}/faq`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
      { url: `${BASE_URL}/${locale}/map`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6 },
      { url: `${BASE_URL}/${locale}/search`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
    );
  }

  return entries;
}
