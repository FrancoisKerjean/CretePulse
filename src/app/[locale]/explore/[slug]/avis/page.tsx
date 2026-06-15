// src/app/[locale]/explore/[slug]/avis/page.tsx
import type { Metadata } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { ReviewsPage } from "@/components/reviews/ReviewsPage";

export const revalidate = 60;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return {
    title: `Avis · ${slug} · crete.direct`,
    robots: { index: false, follow: true },
    alternates: { canonical: `/${locale}/explore/${slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const [{ data: place }, { data: rows }, { data: agg }] = await Promise.all([
    supabase.from("cb_places").select("slug, name").eq("slug", slug).maybeSingle(),
    supabase.from("cb_reviews_with_counts")
      .select("id, rating, comment, author_name, locale, created_at, upvotes, downvotes")
      .eq("place_slug", slug).eq("status", "published")
      .order("upvotes", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    supabase.from("cb_reviews").select("rating").eq("place_slug", slug).eq("status", "published"),
  ]);
  const placeName = place?.name ?? slug;
  const ratings = (agg ?? []).map((r) => r.rating as number);
  const distribution = { 1:0, 2:0, 3:0, 4:0, 5:0 };
  for (const r of ratings) if (r>=1 && r<=5) distribution[r as 1|2|3|4|5]++;
  const aggregate = ratings.length === 0
    ? { avg: null, count: 0, distribution }
    : { avg: Math.round((ratings.reduce((a,b)=>a+b,0) / ratings.length) * 100) / 100, count: ratings.length, distribution };
  return <ReviewsPage slug={slug} placeName={placeName} locale={locale} reviews={(rows ?? []) as never} aggregate={aggregate} />;
}
