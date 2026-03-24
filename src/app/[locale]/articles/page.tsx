import Link from "next/link";
import { BookOpen, Clock, ChevronRight } from "lucide-react";
import { articles, getLocalizedArticleTitle, type Article } from "@/data/articles";
import type { Locale } from "@/lib/types";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Crete Travel Guides", desc: "Practical guides about Crete: beaches, hiking, food, living, travel tips." },
  fr: { title: "Guides de voyage Crète", desc: "Guides pratiques sur la Crète : plages, randonnées, cuisine, vie locale, conseils voyage." },
  de: { title: "Kreta Reiseführer", desc: "Praktische Reiseführer für Kreta: Strände, Wandern, Essen, Leben, Reisetipps." },
  el: { title: "Οδηγοί ταξιδιού Κρήτη", desc: "Πρακτικοί οδηγοί για την Κρήτη: παραλίες, πεζοπορία, φαγητό, διαμονή, συμβουλές ταξιδιού." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  return { title: m.title, description: m.desc };
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

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  beaches: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες" },
  hikes: { en: "Hiking", fr: "Randonnées", de: "Wandern", el: "Πεζοπορία" },
  travel: { en: "Travel", fr: "Voyage", de: "Reise", el: "Ταξίδι" },
  food: { en: "Food", fr: "Cuisine", de: "Essen", el: "Φαγητό" },
  expat: { en: "Expat life", fr: "Vie d'expatrié", de: "Expat-Leben", el: "Ζωή εκπατρισμένου" },
  news: { en: "News", fr: "Actualités", de: "Nachrichten", el: "Νέα" },
  family: { en: "Family", fr: "Famille", de: "Familie", el: "Οικογένεια" },
};

const CATEGORY_COLORS: Record<string, string> = {
  beaches: "bg-aegean-faint text-aegean",
  hikes: "bg-olive/10 text-olive",
  travel: "bg-sand text-text",
  food: "bg-terra-faint text-terra",
  expat: "bg-stone text-text-muted",
  news: "bg-aegean-faint text-aegean",
  family: "bg-sand text-text",
};

const READ_TIME_LABEL: Record<Locale, string> = {
  en: "min read",
  fr: "min de lecture",
  de: "Min. Lesezeit",
  el: "λεπτά ανάγνωσης",
};

function ArticleCard({ article, locale }: { article: Article; locale: Locale }) {
  const title = getLocalizedArticleTitle(article, locale);
  const categoryLabel = CATEGORY_LABELS[article.category]?.[locale] || article.category;
  const categoryColor = CATEGORY_COLORS[article.category] || "bg-stone text-text-muted";

  return (
    <Link
      href={`/${locale}/articles/${article.slug}`}
      className="group block bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative h-48 bg-stone overflow-hidden">
        <img
          src={article.image}
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
            {article.readTime} {READ_TIME_LABEL[locale]}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} locale={loc} />
          ))}
        </div>
      </div>
    </main>
  );
}
