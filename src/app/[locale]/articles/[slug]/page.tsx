import { notFound } from "next/navigation";
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
  type Guide,
} from "@/lib/guides";
import type { Locale } from "@/lib/types";
import { breadcrumbSchema } from "@/lib/schema";

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
  const guide = await getGuideBySlug(slug);
  if (!guide) return {};
  const title = getLocalizedGuideField(guide, "titles", locale);
  const description = getLocalizedGuideField(guide, "meta_descs", locale);
  const url = `${BASE_URL}/${locale}/articles/${slug}`;
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/articles/${slug}`),
    openGraph: {
      title,
      description,
      url,
      images: guide.image_url ? [{ url: guide.image_url }] : [],
      type: "article",
    },
  };
}

// ─── Inline components ────────────────────────────────────────────────────────

function TableOfContents({ items }: { items: { id: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <nav className="sticky top-24 hidden lg:block w-64 shrink-0">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Contents</h3>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-gray-600 hover:text-blue-600 transition-colors"
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
            <div className="px-4 pb-4 text-gray-600">{faq.a}</div>
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
    "@type": "Article",
    headline: title,
    description,
    image: guide.image_url || undefined,
    datePublished: guide.published_at,
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </>
  );
}

// ─── Labels ───────────────────────────────────────────────────────────────────

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

const KAIROS_CTA: Record<Locale, { intro: string; link: string; href: string }> = {
  en: {
    intro: "Thinking about buying property in Crete? Read our guide on prices and steps.",
    link: "Buy a house in Crete →",
    href: "https://kairosguest.com/en/blog/acheter-maison-crete-prix-2026",
  },
  fr: {
    intro: "Vous pensez à acheter en Crète ? Lisez notre guide complet sur les prix et démarches.",
    link: "Acheter une maison en Crète →",
    href: "https://kairosguest.com/fr/blog/acheter-maison-crete-prix-2026",
  },
  de: {
    intro: "Denken Sie daran, eine Immobilie in Kreta zu kaufen? Unser Leitfaden zu Preisen und Schritten.",
    link: "Haus in Kreta kaufen →",
    href: "https://kairosguest.com/en/blog/acheter-maison-crete-prix-2026",
  },
  el: {
    intro: "Σκέφτεστε να αγοράσετε ακίνητο στην Κρήτη; Διαβάστε τον οδηγό μας για τιμές και διαδικασίες.",
    link: "Αγοράστε σπίτι στην Κρήτη →",
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
  const loc = locale as Locale;

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
      {/* Breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Article + FAQ JSON-LD */}
      <JsonLdSchemas
        guide={guide}
        title={title}
        description={description}
        faqs={faqs}
        url={url}
      />

      {/* Hero */}
      {guide.image_url && (
        <div className="relative h-64 md:h-80 bg-stone overflow-hidden">
          <img
            src={guide.image_url}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="max-w-5xl mx-auto">
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
      )}

      {/* No image: show title in page body */}
      {!guide.image_url && (
        <div className="max-w-5xl mx-auto px-4 pt-8">
          <span
            className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full mb-3 ${categoryColor}`}
          >
            {categoryLabel}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-text leading-tight">{title}</h1>
        </div>
      )}

      {/* Main layout: article + TOC sidebar */}
      <div className="max-w-5xl mx-auto px-4 py-8">
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
              {formatDate(guide.published_at)}
            </span>
            {guide.read_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {guide.read_time} {READ_TIME_LABEL[loc]}
              </span>
            )}
          </div>
        </div>

        {/* Content + TOC */}
        <div className="flex gap-12 items-start">
          {/* Article */}
          <div className="min-w-0 flex-1">
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

            {/* FAQ Accordion */}
            <FaqSection faqs={faqs} />

            {/* Kairos cross-link (multilingue, discret, vers l'article cible SEO) */}
            <div className="mt-12 p-6 bg-blue-50 rounded-lg text-center">
              <p className="text-gray-600 mb-2">{KAIROS_CTA[loc].intro}</p>
              <a
                href={KAIROS_CTA[loc].href}
                target="_blank"
                rel="noopener"
                className="text-blue-600 hover:underline font-medium"
              >
                {KAIROS_CTA[loc].link}
              </a>
            </div>

            {/* Related guides */}
            {relatedGuides.length > 0 && (
              <section className="mt-16 pt-8 border-t border-border">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-4 h-4 text-aegean" />
                  <h2 className="text-lg font-semibold text-aegean">
                    {MORE_ARTICLES_LABEL[loc]}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedGuides.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/${locale}/articles/${rel.slug}`}
                      className="group block rounded-lg overflow-hidden border border-border hover:shadow-sm transition-shadow"
                    >
                      {rel.image_url && (
                        <div className="h-28 overflow-hidden">
                          <img
                            src={rel.image_url}
                            alt={getLocalizedGuideField(rel, "titles", loc)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium text-text group-hover:text-aegean transition-colors line-clamp-2 leading-snug">
                          {getLocalizedGuideField(rel, "titles", loc)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* TOC sidebar */}
          <TableOfContents items={toc} />
        </div>
      </div>
    </main>
  );
}
