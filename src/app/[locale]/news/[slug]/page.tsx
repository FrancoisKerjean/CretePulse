import { notFound } from "next/navigation";
import { getNewsBySlug, getLatestNews } from "@/lib/news";
import { getLocalizedField, type Locale } from "@/lib/types";
import { newsSchema } from "@/lib/schema";
import { ExternalLink, Clock, ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const loc = locale as Locale;
  const item = await getNewsBySlug(slug);
  if (!item) return { title: "News not found" };

  return {
    title: getLocalizedField(item, "title", loc),
    description: getLocalizedField(item, "summary", loc)?.substring(0, 160),
  };
}

const BACK_LABELS: Record<Locale, string> = {
  en: "Back to news",
  fr: "Retour aux actus",
  de: "Zurück zu Nachrichten",
  el: "Πίσω στα νέα",
};

const READ_ORIGINAL_LABELS: Record<Locale, string> = {
  en: "Read original article",
  fr: "Lire l'article original",
  de: "Originalartikel lesen",
  el: "Διαβάστε το πρωτότυπο άρθρο",
};

const SOURCE_LABELS: Record<Locale, string> = {
  en: "Source",
  fr: "Source",
  de: "Quelle",
  el: "Πηγή",
};

const CATEGORY_COLORS: Record<string, string> = {
  politics: "bg-aegean-faint text-aegean",
  tourism: "bg-terra-faint text-terra",
  culture: "bg-sand text-text",
  environment: "bg-olive/10 text-olive",
  economy: "bg-stone text-text-muted",
  sports: "bg-aegean-faint text-aegean",
  weather: "bg-aegean-faint text-aegean",
};

function formatDate(dateStr: string, locale: Locale): string {
  const lang = locale === "el" ? "el-GR" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-GB";
  return new Date(dateStr).toLocaleDateString(lang, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const loc = locale as Locale;

  const item = await getNewsBySlug(slug);
  if (!item) notFound();

  const schema = newsSchema(item, loc);
  const title = getLocalizedField(item, "title", loc);
  const summary = getLocalizedField(item, "summary", loc);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main className="min-h-screen bg-surface">
        <div className="max-w-2xl mx-auto px-4 py-10">
          {/* Back link */}
          <Link
            href={`/${locale}/news`}
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-aegean transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {BACK_LABELS[loc]}
          </Link>

          {/* Category badge */}
          {item.category && (
            <div className="mb-4">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${CATEGORY_COLORS[item.category] || "bg-stone text-text-muted"}`}>
                <Tag className="w-3 h-3" />
                {item.category}
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-text leading-tight">
            {title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-text-muted border-b border-border pb-4">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatDate(item.published_at, loc)}
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              {SOURCE_LABELS[loc]}:&nbsp;
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-aegean hover:underline font-medium"
              >
                {item.source_name}
              </a>
            </span>
          </div>

          {/* Hero image */}
          {item.image_url && (
            <div className="mt-6 rounded-xl overflow-hidden bg-stone">
              <img
                src={item.image_url}
                alt={title}
                className="w-full h-56 object-cover"
              />
            </div>
          )}

          {/* Article body */}
          {summary && (
            <article
              className="mt-8 text-base text-text leading-relaxed space-y-4 [&>p]:mb-4 [&>p:first-child]:text-lg [&>p:first-child]:font-medium [&>p:first-child]:text-text [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-3 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-1"
              dangerouslySetInnerHTML={{ __html: summary }}
            />
          )}

          {/* CTA - read original */}
          <div className="mt-8 pt-6 border-t border-border">
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-aegean text-white rounded-lg font-medium text-sm hover:bg-aegean/90 transition-colors shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              {READ_ORIGINAL_LABELS[loc]}
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
