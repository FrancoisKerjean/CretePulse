"use client";
import { ReviewCard, type ReviewPublic } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";

type Agg = { avg: number | null; count: number; distribution: { 1:number;2:number;3:number;4:number;5:number } };

const T = {
  en: { title:"Reviews", empty:"Be the first to review this place.", leave:"Leave a review" },
  fr: { title:"Avis",     empty:"Sois le premier à laisser un avis.", leave:"Laisser un avis" },
  de: { title:"Bewertungen", empty:"Schreibe die erste Bewertung.", leave:"Bewertung schreiben" },
  el: { title:"Κριτικές", empty:"Γίνε ο πρώτος που γράφει κριτική.", leave:"Άφησε κριτική" },
} as const;
type L = keyof typeof T;

export function ReviewsPage({ slug, placeName, locale, reviews, aggregate }: {
  slug: string; placeName: string; locale: string;
  reviews: ReviewPublic[]; aggregate: Agg;
}) {
  const l = (locale in T ? locale : "en") as L;
  const t = T[l];
  const max = Math.max(1, ...Object.values(aggregate.distribution));
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-heading text-3xl">{t.title} · {placeName}</h1>
      <section className="mt-4 rounded-2xl border border-sand-warm bg-white p-4">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-4xl">{aggregate.avg?.toFixed(1) ?? "·"}</span>
          <span className="opacity-70">({aggregate.count})</span>
        </div>
        <ul className="mt-3 space-y-1">
          {[5,4,3,2,1].map((n) => (
            <li key={n} className="flex items-center gap-2 text-sm">
              <span className="w-4">{n}</span>
              <div className="h-2 flex-1 rounded bg-sand">
                <div className="h-2 rounded bg-sea" style={{ width: `${(aggregate.distribution[n as 1|2|3|4|5] / max) * 100}%` }} />
              </div>
              <span className="w-8 text-right opacity-70">{aggregate.distribution[n as 1|2|3|4|5]}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-6 space-y-3">
        {reviews.length === 0 ? <p>{t.empty}</p> : reviews.map((r) => <ReviewCard key={r.id} review={r} locale={locale} />)}
      </section>
      <section className="mt-8">
        <h2 className="font-heading text-2xl mb-3">{t.leave}</h2>
        <ReviewForm slug={slug} placeName={placeName} locale={locale} />
      </section>
    </main>
  );
}
