import Link from "next/link";
import { BookOpen, Clock, ChevronRight } from "lucide-react";
import { getPublishedGuides, getLocalizedGuideField, type Guide } from "@/lib/guides";
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

export const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  beaches: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες" },
  hikes: { en: "Hiking", fr: "Randonnées", de: "Wandern", el: "Πεζοπορία" },
  travel: { en: "Travel", fr: "Voyage", de: "Reise", el: "Ταξίδι" },
  food: { en: "Food", fr: "Cuisine", de: "Essen", el: "Φαγητό" },
  expat: { en: "Expat life", fr: "Vie d'expatrié", de: "Expat-Leben", el: "Ζωή εκπατρισμένου" },
  news: { en: "News", fr: "Actualités", de: "Nachrichten", el: "Νέα" },
  family: { en: "Family", fr: "Famille", de: "Familie", el: "Οικογένεια" },
};

export const CATEGORY_COLORS: Record<string, string> = {
  beaches: "bg-aegean-faint text-aegean",
  hikes: "bg-olive/10 text-olive",
  travel: "bg-sand text-text",
  food: "bg-terra-faint text-terra",
  expat: "bg-stone text-text-muted",
  news: "bg-aegean-faint text-aegean",
  family: "bg-sand text-text",
};

export const READ_TIME_LABEL: Record<Locale, string> = {
  en: "min read",
  fr: "min de lecture",
  de: "Min. Lesezeit",
  el: "λεπτά ανάγνωσης",
};

export function GuideCard({ guide, locale }: { guide: Guide; locale: Locale }) {
  const title = getLocalizedGuideField(guide, "titles", locale);
  const categoryLabel = CATEGORY_LABELS[guide.category]?.[locale] || guide.category;
  const categoryColor = CATEGORY_COLORS[guide.category] || "bg-stone text-text-muted";

  return (
    <Link
      href={`/${locale}/articles/${guide.slug}`}
      className="group block bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative h-48 bg-stone overflow-hidden">
        <img
          src={guide.image_url || "/images/crete-default.jpg"}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span
          className={`absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${categoryColor}`}
        >
          {categoryLabel}
        </span>
      </div>

      <div className="p-4">
        <h2 className="text-base font-semibold text-text group-hover:text-aegean transition-colors leading-snug line-clamp-2">
          {title}
        </h2>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-xs text-text-light">
            <Clock className="w-3 h-3" />
            {guide.read_time ?? "—"} {READ_TIME_LABEL[locale]}
          </div>
          <span className="flex items-center gap-1 text-xs text-aegean font-medium">
            {locale === "fr" ? "Lire" : locale === "de" ? "Lesen" : locale === "el" ? "Διαβάστε" : "Read"}
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

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
