import type { MetadataRoute } from "next";
import { getAllBeaches } from "@/lib/beaches";
import { getAllVillages } from "@/lib/villages";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const LOCALES = ["en", "fr", "de", "el"] as const;

const STATIC_PAGES = [
  "",
  "/beaches",
  "/villages",
  "/events",
  "/weather",
  "/news",
  "/hikes",
  "/food",
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

  return entries;
}
