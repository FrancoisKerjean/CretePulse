import { Link } from "@/i18n/navigation";

const T = {
  en: { cta: "Leave a review for", read: "Read reviews", first: "Be the first to review this place" },
  fr: { cta: "Laisser un avis sur", read: "Lire les avis", first: "Sois le premier à laisser un avis" },
  de: { cta: "Bewertung abgeben für", read: "Bewertungen lesen", first: "Schreibe die erste Bewertung" },
  el: { cta: "Άφησε κριτική για", read: "Δες κριτικές", first: "Γίνε ο πρώτος που γράφει κριτική" },
} as const;
type L = keyof typeof T;

export function ReviewCTA({
  slug,
  placeName,
  locale,
  communityCount,
}: {
  slug: string;
  placeName: string;
  locale: string;
  communityCount: number;
}) {
  const l = (locale in T ? locale : "en") as L;
  const t = T[l];
  return (
    <section className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-sand-warm bg-white p-6 text-center">
      {communityCount === 0 && <p className="text-sm text-text-muted">{t.first}</p>}
      <Link
        href={`/explore/${slug}/avis`}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-sea px-6 py-3 font-heading text-white transition hover:bg-sea/90"
      >
        <span aria-hidden>★</span>
        <span>
          {t.cta} {placeName}
        </span>
      </Link>
      {communityCount > 0 && (
        <Link href={`/explore/${slug}/avis`} className="text-sm text-sea hover:underline">
          {t.read} ({communityCount})
        </Link>
      )}
    </section>
  );
}
