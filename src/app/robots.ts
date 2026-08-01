import type { MetadataRoute } from "next";
import { ROBOTS_TXT_AGENTS } from "@/lib/crawler-policy";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      // Crawlers commerciaux : outils SEO en abonnement et aspirateurs de
      // données. Le refus est aussi appliqué en dur par src/middleware.ts, qui
      // répond 403 à ceux qui passent outre. Voir src/lib/crawler-policy.ts
      // pour la mesure de coût et la liste de ce qui reste autorisé.
      {
        userAgent: [...ROBOTS_TXT_AGENTS],
        disallow: "/",
      },
      {
        userAgent: "GPTBot",
        allow: "/",
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
      },
    ],
    sitemap: [
      `${BASE_URL}/sitemap.xml`,
      `${BASE_URL}/sitemap-news.xml`,
    ],
  };
}
