import type { ReactNode } from "react";
import { buildAlternates } from "@/lib/seo";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Search Crete Direct - Find Beaches, Villages, Food & More",
    desc: "Search across all Crete Direct pages: beaches, villages, food, hikes, weather, events and practical guides for Crete.",
  },
  fr: {
    title: "Rechercher sur Crete Direct - Plages, Villages, Cuisine et Plus",
    desc: "Recherchez dans toutes les pages Crete Direct : plages, villages, cuisine, randonnées, météo, événements et guides pratiques.",
  },
  de: {
    title: "Crete Direct Durchsuchen - Strände, Dörfer, Essen & Mehr",
    desc: "Durchsuchen Sie alle Seiten von Crete Direct: Strände, Dörfer, Essen, Wanderungen, Wetter, Events und praktische Guides.",
  },
  el: {
    title: "Αναζήτηση Crete Direct - Παραλίες, Χωριά, Φαγητό & Περισσότερα",
    desc: "Αναζητήστε σε όλες τις σελίδες: παραλίες, χωριά, φαγητό, πεζοπορία, καιρός, εκδηλώσεις και πρακτικοί οδηγοί.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/search`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/search"),
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

export default function SearchLayout({ children }: { children: ReactNode }) {
  return children;
}
