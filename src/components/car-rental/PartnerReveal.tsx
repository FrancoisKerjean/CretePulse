// Révélation du loueur : la note Google complète (chiffre, nombre d'avis) et ses
// 3 avis, avec attribution et lien vers la fiche Maps. Composant serveur, à ne
// monter QU'APRÈS l'acompte payé ou l'offre acceptée (partnerRevealed, car-trust.ts) :
// avant, rien de tout ça ne doit partir vers le navigateur.
import { GoogleReviewsBlock, RatingLine } from "@/components/car-rental/trust";
import { OFFER_VIEW, offerLang } from "@/lib/car-offer-view";
import { partnerRatings } from "@/lib/car-trust-server";
import { reviewsForPlace } from "@/lib/google-reviews-server";

export async function PartnerReveal({
  partnerId, locale, name = null, withRating = true, stacked = false, className = "",
}: {
  partnerId: number | null; locale: string;
  /** Nom du loueur, quand le panneau qui accueille le bloc ne le porte pas déjà. */
  name?: string | null;
  /** false quand la carte voisine porte déjà la note complète. */
  withRating?: boolean;
  /** Page d'état étroite : avis en une colonne. */
  stacked?: boolean;
  className?: string;
}) {
  if (partnerId == null) return null;
  const v = OFFER_VIEW[offerLang(locale)];
  const [row] = await partnerRatings([partnerId]);
  if (!row) return null;
  const rating = row.google_rating == null ? NaN : Number(row.google_rating);
  const count = row.google_rating_count == null ? 0 : Number(row.google_rating_count);
  const rated = Number.isFinite(rating) && count > 0;
  // Une panne de l'API Places vide la liste : le bloc d'avis disparaît, jamais la page.
  const rv = await reviewsForPlace(row.google_place_id, locale);
  if (!name && !(withRating && rated) && rv.reviews.length === 0) return null;
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {name || (withRating && rated) ? (
        <div className="flex flex-col gap-1">
          {name ? <p className="m-0 font-heading text-[20px] font-extrabold text-ink">{name}</p> : null}
          {withRating && rated ? <RatingLine rating={rating} count={count} locale={locale} countLabel={v.googleReviews} /> : null}
        </div>
      ) : null}
      <GoogleReviewsBlock
        stacked={stacked} reviews={rv.reviews} mapsUri={rv.mapsUri ?? row.google_maps_url ?? null} locale={locale}
        title={v.reviewsTitle} allReviews={v.allReviews} readMore={v.readMore} readLess={v.readLess} googleReview={v.googleReview} disclaimer={v.disclaimer}
      />
    </div>
  );
}
