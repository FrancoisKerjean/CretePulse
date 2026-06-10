import Link from "next/link";
import {
  Clock, ChevronRight, Waves, Mountain, Plane, UtensilsCrossed,
  Home, Newspaper, Users, BookOpen,
} from "lucide-react";
import { getLocalizedGuideField, type Guide } from "@/lib/guides";
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
  beaches: "bg-aegean-faint text-aegean",
  hikes: "bg-olive/10 text-olive",
  travel: "bg-sand text-text",
  food: "bg-terra-faint text-terra",
  expat: "bg-stone text-text-muted",
  news: "bg-aegean-faint text-aegean",
  family: "bg-sand text-text",
};

/**
 * Designed no-image state: 82/119 published guides have no image_url
 * (photo_library bank is empty, generators' stock fetch often yields none).
 * The previous near-white gradient read as a wall of broken grey cards on
 * /articles. Each category gets a committed gradient + a large icon so a
 * photo-less card still looks intentional; the gradient direction varies
 * deterministically per slug to break repetition.
 */
const CATEGORY_FALLBACK: Record<string, { gradient: string; Icon: typeof Waves }> = {
  beaches: { gradient: "from-aegean via-[#1a5f82] to-[#2D6A8F]", Icon: Waves },
  hikes: { gradient: "from-olive via-[#5a7a4a] to-[#7a9a6a]", Icon: Mountain },
  travel: { gradient: "from-[#5a4a3a] via-[#74604a] to-[#8B7355]", Icon: Plane },
  food: { gradient: "from-terra via-[#b85c38] to-[#c97b54]", Icon: UtensilsCrossed },
  expat: { gradient: "from-[#44617a] via-[#54718a] to-[#6a87a0]", Icon: Home },
  news: { gradient: "from-[#1f4e66] via-[#1a5f82] to-[#27749c]", Icon: Newspaper },
  family: { gradient: "from-[#7a6a4a] via-[#94805a] to-[#ab9670]", Icon: Users },
};

const FALLBACK_DIRECTIONS = ["bg-gradient-to-br", "bg-gradient-to-tr", "bg-gradient-to-b"];

function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

export function GuideCardFallback({ category, slug }: { category: string; slug: string }) {
  const fb = CATEGORY_FALLBACK[category] ?? { gradient: "from-aegean via-[#1a5f82] to-[#2D6A8F]", Icon: BookOpen };
  const direction = FALLBACK_DIRECTIONS[slugHash(slug) % FALLBACK_DIRECTIONS.length];
  const Icon = fb.Icon;
  return (
    <div className={`absolute inset-0 ${direction} ${fb.gradient}`}>
      <Icon
        className="absolute -bottom-4 -right-4 w-28 h-28 text-white/15 group-hover:text-white/25 transition-colors duration-500"
        strokeWidth={1.5}
      />
    </div>
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
  const categoryColor = CATEGORY_COLORS[guide.category] || "bg-stone text-text-muted";

  return (
    <Link
      href={`/${locale}/articles/${guide.slug}`}
      className="group block bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative h-48 overflow-hidden">
        {guide.image_url ? (
          <img
            src={guide.image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <GuideCardFallback category={guide.category} slug={guide.slug} />
        )}
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
            {guide.read_time ?? "—"} {READ_TIME_LABEL[locale] ?? READ_TIME_LABEL.en}
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
