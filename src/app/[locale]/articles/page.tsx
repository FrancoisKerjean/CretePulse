import { BookOpen } from "lucide-react";
import { getPublishedGuides } from "@/lib/guides";
import type { Locale } from "@/lib/types";
import ArticlesPageClient from "./ArticlesPageClient";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Crete Travel Guide - Beaches, Hiking, Food & Expat Life | Crete Direct", desc: "Practical, fact-checked travel guides to Crete. Best beaches, hiking trails, local food, expat life tips and family travel. Written from the island." },
  fr: { title: "Guide de Voyage Crète - Plages, Randonnées, Gastronomie | Crete Direct", desc: "Guides pratiques et vérifiés sur la Crète. Meilleures plages, randonnées, cuisine locale, vie d'expatrié. Écrits depuis l'île." },
  de: { title: "Kreta Reiseführer - Strände, Wandern, Essen & Expat-Leben | Crete Direct", desc: "Praktische, faktengeprüfte Reiseführer für Kreta. Beste Strände, Wanderwege, lokales Essen, Expat-Leben. Von der Insel geschrieben." },
  el: { title: "Οδηγός Ταξιδιού Κρήτη - Παραλίες, Πεζοπορία, Φαγητό | Crete Direct", desc: "Πρακτικοί οδηγοί για την Κρήτη. Καλύτερες παραλίες, μονοπάτια πεζοπορίας, τοπικό φαγητό, ζωή στην Κρήτη." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/articles`;
  return {
    title: m.title,
    description: m.desc,
    alternates: { canonical: url },
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

const PAGE_TITLES: Record<Locale, string> = {
  en: "Crete Travel Guides",
  fr: "Guides de voyage Crète",
  de: "Kreta Reiseführer",
  el: "Οδηγοί ταξιδιού",
};

const PAGE_SUBTITLES: Record<Locale, string> = {
  en: "Practical, fact-checked guides to beaches, hikes, food, and life in Crete.",
  fr: "Guides pratiques et vérifiés sur les plages, randonnées, cuisine et vie en Crète.",
  de: "Praktische, faktengeprüfte Guides zu Stränden, Wandern, Essen und dem Leben auf Kreta.",
  el: "Πρακτικοί οδηγοί για παραλίες, πεζοπορία, φαγητό και ζωή στην Κρήτη.",
};

export default async function ArticlesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  const guides = await getPublishedGuides(200);

  const categories = Array.from(new Set(guides.map((g) => g.category))).filter(Boolean);

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-aegean" />
            <h1 className="text-2xl font-bold text-aegean">{PAGE_TITLES[loc]}</h1>
          </div>
          <p className="text-sm text-text-muted">{PAGE_SUBTITLES[loc]}</p>
        </div>

        <ArticlesPageClient guides={guides} locale={loc} categories={categories} />
      </div>
    </main>
  );
}
