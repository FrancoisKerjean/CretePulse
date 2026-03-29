import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
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
      <div className="relative h-48 bg-stone overflow-hidden">
        <img
          src={guide.image_url || "/images/crete-default.jpg"}
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
            {guide.read_time ?? "—"} {READ_TIME_LABEL[locale]}
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
