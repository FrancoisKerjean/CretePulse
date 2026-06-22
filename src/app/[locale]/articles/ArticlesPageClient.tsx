"use client";

// Hub articles : 1 a la une + filtres categorie + grille + load more (24).
// Spec : docs/superpowers/specs/2026-06-11-ui-live-data-redesign-design.md
import { useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { getLocalizedGuideField, type Guide } from "@/lib/guides";
import type { Locale } from "@/lib/types";
import { GuideCard, GuideCardFallback, CATEGORY_LABELS, CATEGORY_COLORS, READ_TIME_LABEL } from "./articles-shared";

interface Props {
  guides: Guide[];
  locale: Locale;
  categories: string[];
}

const ALL_LABEL: Record<string, string> = {
  en: "All",
  fr: "Tous",
  de: "Alle",
  el: "Όλα",
};

const MORE_LABEL: Record<string, string> = {
  en: "Show more",
  fr: "Voir plus",
  de: "Mehr anzeigen",
  el: "Περισσότερα",
};

const PAGE = 24;

function FeaturedCard({ guide, locale }: { guide: Guide; locale: Locale }) {
  const title = getLocalizedGuideField(guide, "titles", locale);
  const categoryLabel = CATEGORY_LABELS[guide.category]?.[locale] || guide.category;
  const categoryColor = CATEGORY_COLORS[guide.category] || "bg-stone text-text-muted";

  return (
    <Link
      href={`/${locale}/articles/${guide.slug}`}
      className="group card-base overflow-hidden grid md:grid-cols-2 mb-10 no-underline"
    >
      <div className="relative h-56 md:h-auto md:min-h-[260px] overflow-hidden">
        {guide.image_url ? (
          <>
            <img
              src={guide.image_url}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover saturate-[.88] group-hover:scale-[1.03] transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-sea/10 mix-blend-multiply pointer-events-none" />
          </>
        ) : (
          <GuideCardFallback category={guide.category} slug={guide.slug} />
        )}
      </div>
      <div className="p-7 flex flex-col justify-center">
        <span className={`self-start text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full mb-3 ${categoryColor}`}>
          {categoryLabel}
        </span>
        <h2 className="font-heading text-2xl font-bold text-text group-hover:text-sea transition-colors leading-snug m-0">
          {title}
        </h2>
        <p className="font-data text-xs text-text-light mt-4 mb-0 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {guide.read_time ?? "·"} {READ_TIME_LABEL[locale] ?? READ_TIME_LABEL.en}
        </p>
      </div>
    </Link>
  );
}

export default function ArticlesPageClient({ guides, locale, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const featured = activeCategory === null ? guides.find((g) => g.image_url) ?? null : null;
  const pool = activeCategory
    ? guides.filter((g) => g.category === activeCategory)
    : guides.filter((g) => g.slug !== featured?.slug);
  const shown = pool.slice(0, limit);

  return (
    <>
      {featured && <FeaturedCard guide={featured} locale={locale} />}

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => { setActiveCategory(null); setLimit(PAGE); }}
            className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === null
                ? "bg-sea text-white border-sea"
                : "bg-white text-text-muted border-border hover:border-sea hover:text-sea"
            }`}
          >
            {ALL_LABEL[locale] || ALL_LABEL.en}
          </button>

          {categories.map((cat) => {
            const label = CATEGORY_LABELS[cat]?.[locale] || cat;
            const isActive = activeCategory === cat;
            const colorClass = CATEGORY_COLORS[cat] || "bg-stone text-text-muted";

            return (
              <button
                key={cat}
                onClick={() => { setActiveCategory(isActive ? null : cat); setLimit(PAGE); }}
                className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? `${colorClass} border-transparent`
                    : "bg-white text-text-muted border-border hover:border-sea hover:text-sea"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {shown.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} locale={locale} />
        ))}
      </div>

      {pool.length > limit && (
        <div className="text-center mt-10">
          <button
            onClick={() => setLimit(limit + PAGE)}
            className="px-5 py-2.5 rounded-lg border border-sea text-sea text-sm font-semibold hover:bg-sea-faint transition-colors"
          >
            {MORE_LABEL[locale] || MORE_LABEL.en} ({pool.length - limit})
          </button>
        </div>
      )}

      {shown.length === 0 && (
        <p className="text-sm text-text-muted text-center py-12">
          {locale === "fr"
            ? "Aucun guide dans cette catégorie."
            : locale === "de"
            ? "Keine Guides in dieser Kategorie."
            : locale === "el"
            ? "Δεν υπάρχουν οδηγοί σε αυτή την κατηγορία."
            : "No guides in this category."}
        </p>
      )}
    </>
  );
}
