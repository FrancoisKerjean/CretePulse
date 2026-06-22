import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { CloudSun, Newspaper } from "lucide-react";
import { getDailyPosts, getLocalizedGuideField, type Guide } from "@/lib/guides";
import { buildAlternates } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { CarPromo } from "@/components/car-rental/CarPromo";
import { AffiliateBanner } from "@/components/ui/affiliate-banner";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

// EN-only MVP: hub labels + META are hardcoded English. When the daily content is
// translated (phase 2), make META a per-locale record like articles/page.tsx and
// localize the section labels.
const META = {
  title: "Crete Daily - Weather Bulletins & News Recaps",
  desc: "Daily Crete weather bulletins every morning and a recap of the day's major Crete news every evening.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const url = `${BASE_URL}/${locale}/daily`;
  return {
    title: META.title,
    description: META.desc,
    alternates: buildAlternates(locale, "/daily"),
    openGraph: { title: META.title, description: META.desc, url, type: "website" },
  };
}

type DailyType = "weather" | "news";

// EN-only MVP badge labels, same as META above.
const BADGE: Record<DailyType, { label: string; classes: string }> = {
  weather: { label: "Weather", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  news: { label: "News recap", classes: "bg-blue-50 text-blue-700 border-blue-200" },
};

function formatPostDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return new Date(iso).toLocaleDateString("en");
  }
}

function PostList({ posts, locale, type }: { posts: Guide[]; locale: Locale; type: DailyType }) {
  if (posts.length === 0) {
    return <p className="text-sm text-text-muted">No entries yet.</p>;
  }
  const badge = BADGE[type];
  const Icon = type === "weather" ? CloudSun : Newspaper;
  return (
    <ul className="space-y-3">
      {posts.map((p) => {
        const excerpt = getLocalizedGuideField(p, "meta_descs", locale);
        return (
          <li key={p.slug}>
            <Link
              href={`/${locale}/articles/${p.slug}`}
              className="block bg-white border border-border rounded-xl p-4 hover:border-sea hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${badge.classes}`}>
                  <Icon className="w-3 h-3" />
                  {badge.label}
                </span>
                <time dateTime={p.published_at} className="text-xs text-text-muted">
                  {formatPostDate(p.published_at, locale)}
                </time>
              </div>
              <h3 className="font-semibold text-text leading-snug">
                {getLocalizedGuideField(p, "titles", locale)}
              </h3>
              {excerpt && (
                <p className="text-sm text-text-muted leading-relaxed mt-1 line-clamp-2">
                  {excerpt}
                </p>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function DailyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;

  const [weather, news] = await Promise.all([
    getDailyPosts("daily-weather", 30),
    getDailyPosts("daily-news", 30),
  ]);

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-sea mb-2">Crete Daily</h1>
        <p className="text-sm text-text-muted mb-10 max-w-2xl">{META.desc}</p>

        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <CloudSun className="w-5 h-5 text-sea" />
            <h2 className="text-lg font-semibold text-sea">Morning weather bulletins</h2>
          </div>
          <PostList posts={weather} locale={loc} type="weather" />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-5 h-5 text-sea" />
            <h2 className="text-lg font-semibold text-sea">Daily news recaps</h2>
          </div>
          <PostList posts={news} locale={loc} type="news" />
        </section>

        {/* Monétisation (audit 13/06/2026, A2+A3) : hub planification quotidienne
            → CarPromo (Auto Smart primaire) + tours GetYourGuide. */}
        <section className="mt-12 space-y-4">
          <CarPromo locale={loc} source="daily" />
          <AffiliateBanner type="tours" locale={loc} />
        </section>
      </div>
    </main>
  );
}
