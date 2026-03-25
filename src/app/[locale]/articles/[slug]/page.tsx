import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, Calendar, BookOpen } from "lucide-react";
import {
  articles,
  getArticleBySlug,
  getLocalizedArticleTitle,
  getLocalizedArticleContent,
} from "@/data/articles";
import type { Locale } from "@/lib/types";
import { breadcrumbSchema } from "@/lib/schema";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Article not found" };

  const articleTitle = getLocalizedArticleTitle(article, locale);
  const title = `${articleTitle} - Crete Travel Guide | Crete Direct`;
  // Build a useful description from the category context
  const categoryDesc: Record<string, Record<string, string>> = {
    beaches: { en: "Complete guide to beaches in Crete.", fr: "Guide complet des plages en Crète.", de: "Vollständiger Strandführer für Kreta.", el: "Πλήρης οδηγός παραλιών στην Κρήτη." },
    hikes: { en: "Hiking guide for Crete.", fr: "Guide randonnées en Crète.", de: "Wanderführer für Kreta.", el: "Οδηγός πεζοπορίας στην Κρήτη." },
    travel: { en: "Crete travel tips and advice.", fr: "Conseils voyage pour la Crète.", de: "Reisetipps für Kreta.", el: "Συμβουλές ταξιδιού για την Κρήτη." },
    food: { en: "Food guide to Crete.", fr: "Guide gastronomique de la Crète.", de: "Gastronomieführer für Kreta.", el: "Γαστρονομικός οδηγός για την Κρήτη." },
    expat: { en: "Expat guide to living in Crete.", fr: "Guide expatrié pour vivre en Crète.", de: "Expat-Leitfaden für das Leben auf Kreta.", el: "Οδηγός ζωής στην Κρήτη για εκπατρισμένους." },
  };
  const description = `${articleTitle}. ${categoryDesc[article.category]?.[locale] || "Practical guide from Crete Direct."}`;
  const url = `${BASE_URL}/${locale}/articles/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: article.image, alt: articleTitle }],
    },
  };
}

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

const BACK_LABEL: Record<Locale, string> = {
  en: "All guides",
  fr: "Tous les guides",
  de: "Alle Guides",
  el: "Όλοι οι οδηγοί",
};

const MORE_ARTICLES_LABEL: Record<Locale, string> = {
  en: "More guides",
  fr: "Plus de guides",
  de: "Weitere Guides",
  el: "Περισσότεροι οδηγοί",
};

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = locale as Locale;

  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const title = getLocalizedArticleTitle(article, loc);
  const content = getLocalizedArticleContent(article, loc);
  const categoryLabel = CATEGORY_LABELS[article.category]?.[loc] || article.category;
  const categoryColor = CATEGORY_COLORS[article.category] || "bg-stone text-text-muted";
  const breadcrumb = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    { name: loc === "fr" ? "Guides" : loc === "de" ? "Reiseführer" : loc === "el" ? "Οδηγοί" : "Guides", url: `${BASE_URL}/${locale}/articles` },
    { name: title, url: `${BASE_URL}/${locale}/articles/${article.slug}` },
  ]);

  const related = articles
    .filter((a) => a.slug !== article.slug && a.category === article.category)
    .slice(0, 3);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(loc === "fr" ? "fr-FR" : loc === "de" ? "de-DE" : loc === "el" ? "el-GR" : "en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* Hero */}
      <div className="relative h-64 md:h-80 bg-stone overflow-hidden">
        <img
          src={article.image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-3xl mx-auto">
            <span
              className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full mb-3 ${categoryColor}`}
            >
              {categoryLabel}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {title}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back + meta */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <Link
            href={`/${locale}/articles`}
            className="inline-flex items-center gap-1 text-sm text-aegean hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            {BACK_LABEL[loc]}
          </Link>

          <div className="flex items-center gap-4 text-xs text-text-light">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(article.publishedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {article.readTime} {READ_TIME_LABEL[loc]}
            </span>
          </div>
        </div>

        {/* Article content */}
        <article
          className="prose prose-slate max-w-none
            prose-h2:text-aegean prose-h2:font-bold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
            prose-p:text-text prose-p:leading-relaxed prose-p:mb-4
            prose-ul:text-text prose-ul:leading-relaxed
            prose-li:mb-1
            prose-a:text-aegean prose-a:underline hover:prose-a:text-aegean-light
            prose-strong:text-text"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Related articles */}
        {related.length > 0 && (
          <section className="mt-16 pt-8 border-t border-border">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-4 h-4 text-aegean" />
              <h2 className="text-lg font-semibold text-aegean">{MORE_ARTICLES_LABEL[loc]}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/${locale}/articles/${rel.slug}`}
                  className="group block rounded-lg overflow-hidden border border-border hover:shadow-sm transition-shadow"
                >
                  <div className="h-28 overflow-hidden">
                    <img
                      src={rel.image}
                      alt={getLocalizedArticleTitle(rel, loc)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-text group-hover:text-aegean transition-colors line-clamp-2 leading-snug">
                      {getLocalizedArticleTitle(rel, loc)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
