import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { ChevronLeft, Clock, Calendar, BookOpen } from "lucide-react";
import { buildAlternates } from "@/lib/seo";
import {
  getGuideBySlug,
  getRelatedGuides,
  getPublishedGuides,
  getLocalizedGuideField,
  getLocalizedFaqs,
  extractToc,
  isGuideTranslated,
  type Guide,
} from "@/lib/guides";
import { getAutolinkIndex, autolinkHtml } from "@/lib/autolink";
import type { Locale } from "@/lib/types";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "../articles-shared";
import { breadcrumbSchema } from "@/lib/schema";
import DiscoverCrete from "@/components/DiscoverCrete";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import StickyNewsletterBar from "@/components/StickyNewsletterBar";
import RentalCTA from "@/components/RentalCTA";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { JsonLd } from "@/components/JsonLd";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function generateStaticParams() {
  const guides = await getPublishedGuides(500);
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const guide = await getGuideBySlug(slug);
  if (!guide) return {};
  const title = getLocalizedGuideField(guide, "titles", locale);
  const description = getLocalizedGuideField(guide, "meta_descs", locale);
  const url = `${BASE_URL}/${locale}/articles/${slug}`;
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/articles/${slug}`),
    // noindex EN-fallback locales (e.g. daily guides that exist only in EN) so 22
    // identical-content URLs don't cannibalise each other; keep follow for link equity.
    robots: isGuideTranslated(guide, locale) ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      images: guide.image_url ? [{ url: guide.image_url, width: 1200, height: 630, alt: title }] : [],
      type: "article",
      publishedTime: guide.published_at,
      authors: ["Crete Direct"],
      section: guide.category,
      siteName: "Crete Direct",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: guide.image_url ? [guide.image_url] : [],
      site: "@cretedirect",
    },
  };
}

// ─── Inline components ────────────────────────────────────────────────────────

function TableOfContents({ items }: { items: { id: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <nav className="sticky top-24 hidden lg:block w-64 shrink-0">
      <h3 className="text-xs font-semibold text-text-light uppercase tracking-wider mb-3">Contents</h3>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-text-muted hover:text-aegean transition-colors"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FaqSection({ faqs }: { faqs: { q: string; a: string }[] }) {
  if (faqs.length === 0) return null;
  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <details key={i} className="group border rounded-lg">
            <summary className="flex justify-between items-center cursor-pointer p-4 font-medium">
              {faq.q}
              <span className="ml-2 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-4 pb-4 text-text-muted leading-relaxed">{faq.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

function JsonLdSchemas({
  guide,
  title,
  description,
  faqs,
  url,
}: {
  guide: Guide;
  title: string;
  description: string;
  faqs: { q: string; a: string }[];
  url: string;
}) {
  const articleSchema = {
    "@context": "https://schema.org",
    // News-format entries are timely; long/mid guides are evergreen -> Article.
    "@type": (guide.format as string) === "news" ? "NewsArticle" : "Article",
    headline: title,
    description,
    image: guide.image_url
      ? { "@type": "ImageObject", url: guide.image_url, width: 1200, height: 630 }
      : undefined,
    datePublished: guide.published_at,
    dateModified:
      (guide as { updated_at?: string }).updated_at || guide.published_at,
    articleSection: guide.category,
    author: {
      "@type": "Organization",
      name: "Crete Direct",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Crete Direct",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/icon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.a,
            },
          })),
        }
      : null;

  // VideoObject schema quand une vidéo YouTube est embarquée (SEO : Google peut
  // l'afficher en rich result dans les SERP).
  const videoSchema = guide.youtube_video_id
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: title,
        description,
        thumbnailUrl: `https://i.ytimg.com/vi/${guide.youtube_video_id}/maxresdefault.jpg`,
        uploadDate: guide.published_at,
        contentUrl: `https://www.youtube.com/watch?v=${guide.youtube_video_id}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${guide.youtube_video_id}`,
        publisher: {
          "@type": "Organization",
          name: "Crete Direct",
          logo: { "@type": "ImageObject", url: `${BASE_URL}/icon.svg` },
        },
      }
    : null;

  return (
    <>
      <JsonLd data={articleSchema} />
      {faqSchema && (
        <JsonLd data={faqSchema} />
      )}
      {videoSchema && (
        <JsonLd data={videoSchema} />
      )}
    </>
  );
}

// ─── Labels ───────────────────────────────────────────────────────────────────

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

const KAIROS_CTA: Record<Locale, { intro: string; link: string; href: string }> = {
  en: {
    intro: "Thinking about buying property in Crete? Read our guide on prices and steps.",
    link: "Buy a house in Crete",
    href: "https://kairosguest.com/en/blog/acheter-maison-crete-prix-2026",
  },
  fr: {
    intro: "Vous pensez à acheter en Crète ? Lisez notre guide complet sur les prix et démarches.",
    link: "Acheter une maison en Crète",
    href: "https://kairosguest.com/fr/blog/acheter-maison-crete-prix-2026",
  },
  de: {
    intro: "Denken Sie daran, eine Immobilie in Kreta zu kaufen? Unser Leitfaden zu Preisen und Schritten.",
    link: "Haus in Kreta kaufen",
    href: "https://kairosguest.com/en/blog/acheter-maison-crete-prix-2026",
  },
  el: {
    intro: "Σκέφτεστε να αγοράσετε ακίνητο στην Κρήτη; Διαβάστε τον οδηγό μας για τιμές και διαδικασίες.",
    link: "Αγοράστε σπίτι στην Κρήτη",
    href: "https://kairosguest.com/en/blog/acheter-maison-crete-prix-2026",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  // Article content has 22 routed locales but Locale type only covers en/fr/de/el.
  // Fallback to en on extended locales to avoid `undefined.intro` crashes.
  const kairosCta = KAIROS_CTA[loc] ?? KAIROS_CTA.en;
  const readTimeLabel = READ_TIME_LABEL[loc] ?? READ_TIME_LABEL.en;
  const backLabel = BACK_LABEL[loc] ?? BACK_LABEL.en;
  const moreArticlesLabel = MORE_ARTICLES_LABEL[loc] ?? MORE_ARTICLES_LABEL.en;

  const [guide, related] = await Promise.all([
    getGuideBySlug(slug),
    getRelatedGuides("", slug, 3), // category resolved after guide fetch
  ]);

  if (!guide) notFound();

  // Fetch related guides by the actual category (override the empty-category result)
  const relatedGuides = await getRelatedGuides(guide.category, guide.slug, 3);

  const title = getLocalizedGuideField(guide, "titles", loc);
  const description = getLocalizedGuideField(guide, "meta_descs", loc);
  const content = getLocalizedGuideField(guide, "contents", loc);
  const faqs = getLocalizedFaqs(guide, loc);
  const toc = extractToc(content);
  // Auto-link the first mention of known beaches/villages/hikes to their pages (in-body
  // internal links; the most-clicked + best-for-crawl link type, absent from auto articles).
  const linkedContent = autolinkHtml(content, await getAutolinkIndex(loc), { maxLinks: 6 });

  const categoryLabel = CATEGORY_LABELS[guide.category]?.[loc] || guide.category;
  const categoryColor = CATEGORY_COLORS[guide.category] || "bg-stone text-text-muted";

  const url = `${BASE_URL}/${locale}/articles/${slug}`;

  const breadcrumb = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    {
      name:
        loc === "fr"
          ? "Guides"
          : loc === "de"
          ? "Reiseführer"
          : loc === "el"
          ? "Οδηγοί"
          : "Guides",
      url: `${BASE_URL}/${locale}/articles`,
    },
    { name: title, url },
  ]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(
      loc === "fr" ? "fr-FR" : loc === "de" ? "de-DE" : loc === "el" ? "el-GR" : "en-GB",
      { year: "numeric", month: "long", day: "numeric" }
    );
  };

  return (
    <main className="min-h-screen bg-surface">
      <ReadingProgressBar />
      <StickyNewsletterBar locale={locale} />

      {/* Breadcrumb schema */}
      <JsonLd data={breadcrumb} />
      <Breadcrumbs schema={breadcrumb} />

      {/* Article + FAQ JSON-LD */}
      <JsonLdSchemas
        guide={guide}
        title={title}
        description={description}
        faqs={faqs}
        url={url}
      />

      {/* Hero (PR2: editorial 60vh, category + Baloo H1 + dek) */}
      {guide.image_url ? (
        <header className="relative h-[60vh] min-h-[440px] max-h-[640px] bg-stone overflow-hidden">
          <img
            src={guide.image_url}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0">
            <div className="max-w-[720px] mx-auto px-5 pb-12 md:pb-16">
              <span
                className={`inline-block text-[11px] font-semibold uppercase tracking-[0.18em] px-3 py-1.5 rounded-sm mb-5 ${categoryColor}`}
              >
                {categoryLabel}
              </span>
              <h1
                className="font-heading font-bold text-white leading-[1.08] tracking-[-0.01em] text-[32px] md:text-[52px]"
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.45)" }}
              >
                {title}
              </h1>
              {description && (
                <p className="font-heading italic text-sand-warm mt-5 text-[17px] md:text-[21px] leading-[1.4] max-w-[560px]">
                  {description}
                </p>
              )}
            </div>
          </div>
        </header>
      ) : (
        <div className="max-w-[720px] mx-auto px-5 pt-12">
          <span
            className={`inline-block text-[11px] font-semibold uppercase tracking-[0.18em] px-3 py-1.5 rounded-sm mb-4 ${categoryColor}`}
          >
            {categoryLabel}
          </span>
          <h1 className="font-heading text-[32px] md:text-5xl font-bold text-text leading-[1.1] tracking-[-0.01em]">{title}</h1>
          {description && (
            <p className="font-heading italic text-text-muted mt-4 text-xl leading-[1.4]">{description}</p>
          )}
        </div>
      )}

      {/* Main layout: article + TOC sidebar */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href={`/${locale}/articles`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </Link>

        {/* Author bar (PR2) */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-aegean text-white flex items-center justify-center font-heading font-bold text-sm shrink-0">
            CD
          </div>
          <div>
            <p className="text-sm font-semibold text-text leading-tight">Crete Direct</p>
            <p className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(guide.published_at)}
              </span>
              {guide.read_time && (
                <>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {guide.read_time} {readTimeLabel}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Content + TOC */}
        <div className="flex gap-12 items-start">
          {/* Article */}
          <div className="min-w-0 flex-1">
            {/* YouTube embed quand la vidéo daily a été uploadée par le pipeline auto */}
            {guide.youtube_video_id && (
              <YouTubeEmbed
                videoId={guide.youtube_video_id}
                title={title}
                locale={loc}
                vertical={guide.format === "daily"}
              />
            )}

            <article
              className="article-prose max-w-none"
              dangerouslySetInnerHTML={{ __html: linkedContent }}
            />

            {/* FAQ Accordion */}
            <FaqSection faqs={faqs} />

            {/* Kairos cross-link (multilingue, discret, vers l'article cible SEO) */}
            <div className="mt-12 p-8 bg-sand rounded-lg border border-sand-warm">
              <p className="font-heading italic text-aegean text-xl mb-3">{kairosCta.intro}</p>
              <a
                href={kairosCta.href}
                target="_blank"
                rel="noopener"
                className="inline-block mt-1 px-5 py-2.5 bg-terra text-white text-[13px] font-semibold uppercase tracking-wider rounded-md hover:bg-terra-light transition-colors"
              >
                {kairosCta.link}
              </a>
            </div>

            {/* Related guides */}
            {relatedGuides.length > 0 && (
              <section className="mt-16 pt-8 border-t border-border">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-4 h-4 text-aegean" />
                  <h2 className="text-lg font-semibold text-aegean">
                    {moreArticlesLabel}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedGuides.map((rel) => {
                    const relTitle = getLocalizedGuideField(rel, "titles", loc);
                    const relDesc = getLocalizedGuideField(rel, "meta_descs", loc);
                    return (
                      <Link
                        key={rel.slug}
                        href={`/${locale}/articles/${rel.slug}`}
                        className="group flex flex-col rounded-lg overflow-hidden border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      >
                        {rel.image_url && (
                          <div className="h-32 overflow-hidden">
                            <img
                              src={rel.image_url}
                              alt={relTitle}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="p-3 flex flex-col gap-1.5 flex-1">
                          <p className="text-sm font-semibold text-text group-hover:text-aegean transition-colors line-clamp-2 leading-snug">
                            {relTitle}
                          </p>
                          {relDesc && (
                            <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
                              {relDesc}
                            </p>
                          )}
                          {rel.read_time && (
                            <p className="text-[11px] text-text-light mt-auto pt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {rel.read_time} {readTimeLabel}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Cross-link rental funnel (kairosguest.com), UTM-tracked */}
            <RentalCTA locale={locale} contentSlug={guide.slug} contentType="article" />

            {/* Discover Crete (internal links boost) */}
            <DiscoverCrete category={guide.category} locale={locale} />
          </div>

          {/* TOC sidebar */}
          <TableOfContents items={toc} />
        </div>
      </div>
    </main>
  );
}
