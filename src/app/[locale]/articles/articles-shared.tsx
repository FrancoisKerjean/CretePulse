import Link from "next/link";
import {
  Clock, ChevronRight, Waves, Mountain, Plane, UtensilsCrossed,
  Home, Newspaper, Users, BookOpen,
} from "lucide-react";
import { getLocalizedGuideField, type Guide } from "@/lib/guides";
import { AbstractFallback } from "@/components/AbstractFallback";
import type { Locale } from "@/lib/types";

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
  beaches: "bg-sea-faint text-sea",
  hikes: "bg-olive/10 text-olive",
  travel: "bg-sand text-text",
  food: "bg-terracotta-faint text-terracotta",
  expat: "bg-surface text-text-muted",
  news: "bg-sea-faint text-sea",
  family: "bg-sand text-text",
};

/**
 * Designed no-image state: 82/119 published guides have no image_url
 * (photo_library bank is empty, generators' stock fetch often yields none).
 * Kalimera: luminous abstraction per category (AbstractFallback) + the
 * category icon so a photo-less card still looks intentional.
 */
const CATEGORY_FALLBACK: Record<string, { kind: "sea" | "land" | "news"; Icon: typeof Waves }> = {
  beaches: { kind: "sea", Icon: Waves },
  hikes: { kind: "land", Icon: Mountain },
  travel: { kind: "land", Icon: Plane },
  food: { kind: "land", Icon: UtensilsCrossed },
  expat: { kind: "land", Icon: Home },
  news: { kind: "news", Icon: Newspaper },
  family: { kind: "land", Icon: Users },
};

export function GuideCardFallback({ category }: { category: string; slug?: string }) {
  const fb = CATEGORY_FALLBACK[category] ?? { kind: "land" as const, Icon: BookOpen };
  const Icon = fb.Icon;
  return (
    <AbstractFallback kind={fb.kind}>
      <Icon
        className="absolute -bottom-4 -right-4 w-28 h-28 text-white/25 group-hover:text-white/40 transition-colors duration-500"
        strokeWidth={1.5}
      />
    </AbstractFallback>
  );
}

export const READ_TIME_LABEL: Record<Locale, string> = {
  en: "min read",
  fr: "min de lecture",
  de: "Min. Lesezeit",
  el: "λεπτά ανάγνωσης",
};

export function GuideCard({ guide, locale }: { guide: Guide; locale: Locale }) {
  const title = getLocalizedGuideField(guide, "titles", locale);
  const categoryLabel = CATEGORY_LABELS[guide.category]?.[locale] || guide.category;
  const categoryColor = CATEGORY_COLORS[guide.category] || "bg-surface text-text-muted";

  return (
    <Link
      href={`/${locale}/articles/${guide.slug}`}
      className="group block card-base overflow-hidden"
    >
      <div className="relative h-48 overflow-hidden">
        {guide.image_url ? (
          <>
            <img
              src={guide.image_url}
              alt={title}
              className="w-full h-full object-cover saturate-[1.08] group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-lagoon/5 via-transparent to-night/40 pointer-events-none" />
          </>
        ) : (
          <GuideCardFallback category={guide.category} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span
          className={`absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${categoryColor}`}
        >
          {categoryLabel}
        </span>
      </div>

      <div className="p-4">
        <h2 className="text-base font-semibold text-text group-hover:text-sea transition-colors leading-snug line-clamp-2">
          {title}
        </h2>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-xs text-text-light">
            <Clock className="w-3 h-3" />
            {guide.read_time ?? "·"} {READ_TIME_LABEL[locale] ?? READ_TIME_LABEL.en}
          </div>
          <span className="flex items-center gap-1 text-xs text-sea font-medium">
            {locale === "fr" ? "Lire" : locale === "de" ? "Lesen" : locale === "el" ? "Διαβάστε" : "Read"}
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
