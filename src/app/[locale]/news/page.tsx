import { getLatestNews } from "@/lib/news";
import { getLocalizedField, type Locale } from "@/lib/types";
import { Newspaper, ExternalLink, Clock } from "lucide-react";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Crete News - Latest from the Greek Press | Crete Direct", desc: "Latest news from Crete translated from the Greek press. Politics, tourism, culture, environment and sports - updated every 3 hours in 4 languages." },
  fr: { title: "Actus Crète - Dernières de la Presse Grecque | Crete Direct", desc: "Dernières nouvelles de Crète traduites de la presse grecque. Politique, tourisme, culture, environnement - mises à jour toutes les 3 heures." },
  de: { title: "Kreta Nachrichten - Aus der Griechischen Presse | Crete Direct", desc: "Aktuelle Nachrichten aus Kreta übersetzt aus der griechischen Presse. Politik, Tourismus, Kultur - alle 3 Stunden aktualisiert." },
  el: { title: "Νέα Κρήτης - Τελευταία από τον Ελληνικό Τύπο | Crete Direct", desc: "Τελευταία νέα από την Κρήτη από τον ελληνικό τύπο. Πολιτική, τουρισμός, πολιτισμός - ανανέωση κάθε 3 ώρες." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/news`;
  return {
    title: m.title,
    description: m.desc,
    alternates: { canonical: url },
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  politics: "bg-aegean-faint text-aegean",
  tourism: "bg-terra-faint text-terra",
  culture: "bg-sand text-text",
  environment: "bg-olive/10 text-olive",
  economy: "bg-stone text-text-muted",
  sports: "bg-aegean-faint text-aegean",
  weather: "bg-aegean-faint text-aegean",
};

const TIME_LABELS: Record<Locale, { justNow: string; yesterday: string; mAgo: string; hAgo: string; dAgo: string }> = {
  en: { justNow: "just now", yesterday: "yesterday", mAgo: "m ago", hAgo: "h ago", dAgo: "d ago" },
  fr: { justNow: "à l'instant", yesterday: "hier", mAgo: "min", hAgo: "h", dAgo: "j" },
  de: { justNow: "gerade eben", yesterday: "gestern", mAgo: "Min.", hAgo: "Std.", dAgo: "T." },
  el: { justNow: "μόλις τώρα", yesterday: "χθες", mAgo: "λ.", hAgo: "ω.", dAgo: "μ." },
};

function timeAgo(dateStr: string, locale: Locale): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const L = TIME_LABELS[locale];
  const lang = locale === "el" ? "el-GR" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-GB";

  if (diffMins < 60) return diffMins <= 1 ? L.justNow : `${diffMins}${L.mAgo}`;
  if (diffHours < 24) return `${diffHours}${L.hAgo}`;
  if (diffDays === 1) return L.yesterday;
  if (diffDays < 7) return `${diffDays}${L.dAgo}`;
  return new Date(dateStr).toLocaleDateString(lang, { day: "numeric", month: "short" });
}

const PAGE_TITLES: Record<Locale, string> = {
  en: "Crete News",
  fr: "Actus Crète",
  de: "Kreta Nachrichten",
  el: "Νέα Κρήτης",
};

const PAGE_SUBTITLES: Record<Locale, string> = {
  en: "Greek press, translated in 4 languages every 3 hours",
  fr: "Presse grecque, traduite en 4 langues toutes les 3 heures",
  de: "Griechische Presse, alle 3 Stunden in 4 Sprachen übersetzt",
  el: "Ελληνικός Τύπος, μετάφραση σε 4 γλώσσες κάθε 3 ώρες",
};

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  let news: Awaited<ReturnType<typeof getLatestNews>> = [];
  try {
    news = await getLatestNews(50);
  } catch {
    news = [];
  }

  if (news.length === 0) {
    return <NewsPlaceholder locale={loc} />;
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="w-5 h-5 text-aegean" />
            <h1 className="text-2xl font-bold text-aegean">{PAGE_TITLES[loc]}</h1>
          </div>
          <p className="text-sm text-text-muted">{PAGE_SUBTITLES[loc]}</p>
        </div>

        {/* News list */}
        <div className="divide-y divide-border">
          {news.map((item) => (
            <article key={item.slug} className="py-4 group">
              <Link href={`/${locale}/news/${item.slug}`} className="flex gap-4 items-start hover:opacity-80 transition-opacity">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {item.category && (
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] || "bg-stone text-text-muted"}`}>
                        {item.category}
                      </span>
                    )}
                    <span className="text-xs text-text-light flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(item.published_at, loc)}
                    </span>
                    <span className="text-xs text-text-light">&middot;</span>
                    <span className="text-xs text-text-light">{item.source_name}</span>
                  </div>

                  <h2 className="text-base font-semibold text-text group-hover:text-aegean transition-colors leading-snug">
                    {getLocalizedField(item, "title", loc)}
                  </h2>

                  {item.summary_en && (
                    <p className="text-sm text-text-muted mt-1 line-clamp-2 leading-relaxed">
                      {getLocalizedField(item, "summary", loc)}
                    </p>
                  )}
                </div>

                {item.image_url && (
                  <div className="shrink-0 w-20 h-16 rounded-lg overflow-hidden bg-stone">
                    <img
                      src={item.image_url}
                      alt={getLocalizedField(item, "title", loc) || ""}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </Link>

              <div className="mt-2 flex items-center gap-3">
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-text-light hover:text-aegean transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {item.source_name}
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function NewsPlaceholder({ locale }: { locale: Locale }) {
  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="w-5 h-5 text-aegean" />
          <h1 className="text-2xl font-bold text-aegean">{PAGE_TITLES[locale]}</h1>
        </div>
        <p className="text-sm text-text-muted mb-8">{PAGE_SUBTITLES[locale]}</p>

        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="py-4 animate-pulse flex gap-4">
              <div className="flex-1">
                <div className="flex gap-2 mb-2">
                  <div className="h-4 w-16 bg-stone rounded-full" />
                  <div className="h-4 w-12 bg-stone rounded" />
                </div>
                <div className="h-5 bg-stone rounded w-4/5 mb-2" />
                <div className="h-3 bg-stone rounded w-2/3" />
              </div>
              <div className="w-20 h-16 bg-stone rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
