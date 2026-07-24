import { Link } from "@/i18n/navigation";
import { Tile } from "./Tile";

const T = {
  en: { rating: "Rating", reviews: "Reviews" },
  fr: { rating: "Note",   reviews: "Avis" },
  de: { rating: "Bewertung", reviews: "Bewertungen" },
  el: { rating: "Βαθμός", reviews: "Κριτικές" },
} as const;
type L = keyof typeof T;

export function RatingTile({
  slug, scrapedRating, communityAvg, communityCount, locale,
}: {
  slug: string;
  scrapedRating: number | null;
  communityAvg: number | null;
  communityCount: number;
  locale: string;
}) {
  const l = (locale in T ? locale : "en") as L;
  const t = T[l];

  if (communityCount === 0 && (!scrapedRating || scrapedRating === 0)) return null;

  if (communityCount === 0) {
    return (
      <Tile icon="★" big={scrapedRating!.toFixed(1)} label={t.rating} variant="sand" className="col-span-2 md:col-span-1" />
    );
  }

  return (
    <Link href={`/explore/${slug}/avis`} className="col-span-2 md:col-span-1 block">
      <Tile icon="★" big={(communityAvg ?? 0).toFixed(1)} label={`${t.reviews} (${communityCount})`} variant="community" />
    </Link>
  );
}
