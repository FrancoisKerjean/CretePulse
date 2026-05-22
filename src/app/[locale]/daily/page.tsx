import Link from "next/link";
import { CloudSun, Newspaper } from "lucide-react";
import { getDailyPosts, getLocalizedGuideField, type Guide } from "@/lib/guides";
import { buildAlternates } from "@/lib/seo";
import type { Locale } from "@/lib/types";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META = {
  title: "Crete Daily - Weather Bulletins & News Recaps",
  desc: "Daily Crete weather bulletins every morning and a recap of the day's major Crete news every evening.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const url = `${BASE_URL}/${locale}/daily`;
  return {
    title: META.title,
    description: META.desc,
    alternates: buildAlternates(locale, "/daily"),
    openGraph: { title: META.title, description: META.desc, url, type: "website" },
  };
}

function PostList({ posts, locale }: { posts: Guide[]; locale: Locale }) {
  if (posts.length === 0) {
    return <p className="text-sm text-text-muted">No entries yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {posts.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/${locale}/articles/${p.slug}`}
            className="text-aegean hover:underline"
          >
            {getLocalizedGuideField(p, "titles", locale)}
          </Link>
          <span className="ml-2 text-xs text-text-muted">
            {new Date(p.published_at).toLocaleDateString(locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function DailyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  const [weather, news] = await Promise.all([
    getDailyPosts("daily-weather", 30),
    getDailyPosts("daily-news", 30),
  ]);

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-aegean mb-2">Crete Daily</h1>
        <p className="text-sm text-text-muted mb-10">{META.desc}</p>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <CloudSun className="w-5 h-5 text-aegean" />
            <h2 className="text-lg font-semibold text-aegean">Morning weather bulletins</h2>
          </div>
          <PostList posts={weather} locale={loc} />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="w-5 h-5 text-aegean" />
            <h2 className="text-lg font-semibold text-aegean">Daily news recaps</h2>
          </div>
          <PostList posts={news} locale={loc} />
        </section>
      </div>
    </main>
  );
}
