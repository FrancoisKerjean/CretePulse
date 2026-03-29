"use client";

import { useState } from "react";
import type { Guide } from "@/lib/guides";
import type { Locale } from "@/lib/types";
import { GuideCard, CATEGORY_LABELS, CATEGORY_COLORS } from "./page";

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

export default function ArticlesPageClient({ guides, locale, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? guides.filter((g) => g.category === activeCategory)
    : guides;

  return (
    <>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === null
                ? "bg-aegean text-white border-aegean"
                : "bg-white text-text-muted border-border hover:border-aegean hover:text-aegean"
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
                onClick={() => setActiveCategory(isActive ? null : cat)}
                className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? `${colorClass} border-transparent`
                    : "bg-white text-text-muted border-border hover:border-aegean hover:text-aegean"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} locale={locale} />
        ))}
      </div>

      {filtered.length === 0 && (
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
