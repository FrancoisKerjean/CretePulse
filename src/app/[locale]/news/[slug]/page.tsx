import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { setRequestLocale } from "next-intl/server";
import { getNewsBySlug, getLatestNews, isNewsTranslated } from "@/lib/news";
import { getLocalizedField, type Locale } from "@/lib/types";
import { newsSchema, breadcrumbSchema } from "@/lib/schema";
import { ExternalLink, Clock, ArrowLeft, Calendar, Globe } from "lucide-react";
import { buildAlternates } from "@/lib/seo";
import Link from "next/link";
import DiscoverCrete from "@/components/DiscoverCrete";
import { BusInCreteBox } from "@/components/BusInCreteBox";
import NewsletterCTA from "@/components/NewsletterCTA";
import { JsonLd } from "@/components/JsonLd";

export const revalidate = 172800; // 03/07 optim couts Vercel (48h, ISR Writes)

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const item = await getNewsBySlug(slug);
  if (!item) return { title: "News not found" };

  const headline = getLocalizedField(item, "title", loc) || "";
  const summary = getLocalizedField(item, "summary", loc);
  const title = `${headline} | Crete Direct`;
  const description = summary?.replace(/<[^>]*>/g, "").substring(0, 160) || `${headline} - Crete news.`;
  const url = `${BASE_URL}/${locale}/news/${slug}`;

  return {
    title,
    description,
    alternates: buildAlternates(locale, `/news/${slug}`),
    // noindex locales that only have the EN fallback (news is translated to en/fr/de/el
    // only) so duplicate-content variants don't cannibalise the real article.
    robots: isNewsTranslated(item, locale) ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: item.image_url ? [{ url: item.image_url, width: 1200, height: 630, alt: headline }] : [],
      publishedTime: item.published_at,
      authors: ["Crete Direct"],
      section: item.category || undefined,
      siteName: "Crete Direct",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: item.image_url ? [item.image_url] : [],
      site: "@cretedirect",
    },
  };
}

// ── i18n labels ───────────────────────────────────────────────────────────

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

const READ_MIN_LABELS: Record<Locale, string> = {
  en: "min read",
  fr: "min de lecture",
  de: "Min. Lesezeit",
  el: "λεπτά ανάγνωσης",
};

const RELATED_LABELS: Record<Locale, string> = {
  en: "Related news",
  fr: "Autres actualités",
  de: "Weitere Nachrichten",
  el: "Σχετικά νέα",
};

// ── Category styles ────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  politics:    "bg-sea-faint text-sea border border-sea/20",
  tourism:     "bg-terracotta-faint text-terracotta border border-terracotta/20",
  culture:     "bg-sand text-text border border-border",
  environment: "bg-olive/10 text-olive border border-olive/20",
  economy:     "bg-surface text-text-muted border border-border",
  sports:      "bg-sea-faint text-sea border border-sea/20",
  weather:     "bg-sea-faint text-sea border border-sea/20",
};

const CATEGORY_DOT: Record<string, string> = {
  politics:    "bg-sea",
  tourism:     "bg-terracotta",
  culture:     "bg-text-muted",
  environment: "bg-olive",
  economy:     "bg-text-muted",
  sports:      "bg-sea",
  weather:     "bg-sea",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function langCode(locale: Locale): string {
  return locale === "el" ? "el-GR"
    : locale === "fr" ? "fr-FR"
    : locale === "de" ? "de-DE"
    : "en-GB";
}

function formatDate(dateStr: string, locale: Locale): string {
  return new Date(dateStr).toLocaleDateString(langCode(locale), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string, locale: Locale): string {
  return new Date(dateStr).toLocaleDateString(langCode(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calcReadingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function NewsDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  // Fallback to en on extended locales to avoid `undefined.x` crashes.
  const backLabel = BACK_LABELS[loc] ?? BACK_LABELS.en;
  const readOriginalLabel = READ_ORIGINAL_LABELS[loc] ?? READ_ORIGINAL_LABELS.en;
  const sourceLabel = SOURCE_LABELS[loc] ?? SOURCE_LABELS.en;
  const readMinLabel = READ_MIN_LABELS[loc] ?? READ_MIN_LABELS.en;
  const relatedLabel = RELATED_LABELS[loc] ?? RELATED_LABELS.en;

  const [item, allNews] = await Promise.all([
    getNewsBySlug(slug),
    getLatestNews(20, locale),
  ]);

  if (!item) notFound();

  const schema = newsSchema(item, loc);
  const title = getLocalizedField(item, "title", loc);
  const summary = getLocalizedField(item, "summary", loc);
  const readingTime = summary ? calcReadingTime(summary) : 1;

  const breadcrumb = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    {
      name: loc === "fr" ? "Actus" : loc === "de" ? "Nachrichten" : loc === "el" ? "Νέα" : "News",
      url: `${BASE_URL}/${locale}/news`,
    },
    { name: title || "", url: `${BASE_URL}/${locale}/news/${item.slug}` },
  ]);

  // 3 related: prefer same category, exclude current
  const related = allNews
    .filter((n) => n.slug !== slug)
    .sort((a, b) => {
      const aMatch = a.category === item.category ? 0 : 1;
      const bMatch = b.category === item.category ? 0 : 1;
      return aMatch - bMatch;
    })
    .slice(0, 3);

  const catColor = CATEGORY_COLORS[item.category || ""] || "bg-surface text-text-muted border border-border";
  const catDot   = CATEGORY_DOT[item.category || ""]   || "bg-text-muted";

  return (
    <>
      <JsonLd data={schema} />
      <JsonLd data={breadcrumb} />
      <Breadcrumbs schema={breadcrumb} />

      <main className="min-h-screen bg-surface">

        {/* Top accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-sea via-terracotta to-olive" />

        <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-10">

          {/* Back link */}
          <Link
            href={`/${locale}/news`}
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-sea transition-colors mb-10 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            {backLabel}
          </Link>

          {/* ── HEADER ─────────────────────────────── */}

          {/* Category badge */}
          {item.category && (
            <div className="mb-5">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${catColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${catDot}`} />
                {item.category}
              </span>
            </div>
          )}

          {/* Headline */}
          <h1
            className="text-3xl sm:text-4xl font-bold text-text leading-tight tracking-tight mb-5"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-muted mb-6">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-light flex-shrink-0" />
              {formatDate(item.published_at, loc)}
            </span>
            <span className="text-border select-none">/</span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-text-light flex-shrink-0" />
              {sourceLabel}:&nbsp;
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sea hover:underline font-medium"
              >
                {item.source_name}
              </a>
            </span>
            <span className="text-border select-none">/</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-text-light flex-shrink-0" />
              {readingTime}&nbsp;{readMinLabel}
            </span>
          </div>

          {/* Thin separator */}
          <div className="border-t border-border mb-8" />

          {/* ── HERO IMAGE ─────────────────────────── */}
          {item.image_url && (
            <div className="mb-8 rounded-xl overflow-hidden bg-surface shadow-soft">
              <img
                src={item.image_url}
                alt={title}
                className="w-full h-64 sm:h-80 object-cover"
              />
            </div>
          )}

          {/* ── ARTICLE BODY ───────────────────────── */}
          {summary && (
            <article
              className={[
                "text-text",
                /* first paragraph drop-cap feel: larger, medium weight */
                "[&>p:first-child]:text-lg [&>p:first-child]:leading-8 [&>p:first-child]:font-medium [&>p:first-child]:text-text [&>p:first-child]:mb-5",
                /* subsequent paragraphs */
                "[&>p]:text-base [&>p]:leading-7 [&>p]:mb-5",
                /* headings */
                "[&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:text-text",
                "[&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-3 [&>h3]:text-text",
                /* lists */
                "[&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-1.5 [&>ul]:mb-5",
                "[&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:space-y-1.5 [&>ol]:mb-5",
                /* blockquote */
                "[&>blockquote]:border-l-4 [&>blockquote]:border-terracotta [&>blockquote]:pl-5 [&>blockquote]:italic [&>blockquote]:text-text-muted [&>blockquote]:my-6",
                /* inline */
                "[&_strong]:font-semibold [&_strong]:text-text",
                "[&_a]:text-sea [&_a]:underline [&_a:hover]:text-sea-light",
              ].join(" ")}
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              dangerouslySetInnerHTML={{ __html: summary }}
            />
          )}

          {/* ── READ ORIGINAL (subtle link) ────────── */}
          <div className="mt-10 pt-6 border-t border-border">
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-sea transition-colors underline underline-offset-2"
            >
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              {readOriginalLabel} &rarr; {item.source_name}
            </a>
          </div>

          {/* ── RELATED NEWS ───────────────────────── */}
          {related.length > 0 && (
            <section className="mt-14">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted whitespace-nowrap">
                  {relatedLabel}
                </h2>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="divide-y divide-border">
                {related.map((n) => {
                  const relTitle  = getLocalizedField(n, "title", loc);
                  const relColor  = CATEGORY_COLORS[n.category || ""] || "bg-surface text-text-muted border border-border";
                  const relDot    = CATEGORY_DOT[n.category || ""]    || "bg-text-muted";

                  return (
                    <Link
                      key={n.slug}
                      href={`/${locale}/news/${n.slug}`}
                      className="flex items-start gap-4 py-4 group"
                    >
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-surface">
                        {n.image_url ? (
                          <img
                            src={n.image_url}
                            alt={relTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className={`w-2 h-2 rounded-full ${relDot}`} />
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        {n.category && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${relColor}`}>
                            <span className={`w-1 h-1 rounded-full flex-shrink-0 ${relDot}`} />
                            {n.category}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-text leading-snug group-hover:text-sea transition-colors line-clamp-2">
                          {relTitle}
                        </p>
                        <p className="text-xs text-text-light mt-1">
                          {formatDateShort(n.published_at, loc)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── DISCOVER CRETE (internal links boost) ── */}
          <DiscoverCrete category={item.category} locale={locale} />

          {/* ── BUS INTERNAL LINKS (crawl-budget vers pages-trajet prioritaires) ── */}
          <BusInCreteBox locale={locale} />

          {/* ── NEWSLETTER CTA ─────────────────────── */}
          <NewsletterCTA locale={locale} />

        </div>
      </main>
    </>
  );
}
