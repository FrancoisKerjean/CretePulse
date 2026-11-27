// Révélation du loueur : la note Google complète (chiffre, nombre d'avis) et ses
// 3 avis, avec attribution et lien vers la fiche Maps. Composant serveur, à ne
// monter QU'APRÈS l'acompte payé ou l'offre acceptée (partnerRevealed, car-trust.ts) :
// avant, rien de tout ça ne doit partir vers le navigateur.
import { GoogleReviewsBlock, RatingLine } from "@/components/car-rental/trust";
import { OFFER_VIEW, offerLang } from "@/lib/car-offer-view";
import { validRating } from "@/lib/car-trust";
import { partnerRatings, type PartnerRating } from "@/lib/car-trust-server";
import { reviewsForPlace } from "@/lib/google-reviews-server";

export async function PartnerReveal({
  partnerId, locale, name = null, withRating = true, stacked = false, rated, className = "",
}: {
  partnerId: number | null; locale: string;
  /** Nom du loueur, quand le panneau qui accueille le bloc ne le porte pas déjà. */
  name?: string | null;
  /** false quand la carte voisine porte déjà la note complète. */
  withRating?: boolean;
  /** Page d'état étroite : avis en une colonne. */
  stacked?: boolean;
  /** Ligne car_partners déjà lue par la page : évite une seconde lecture. */
  rated?: PartnerRating;
  className?: string;
}) {
  if (partnerId == null) return null;
  const v = OFFER_VIEW[offerLang(locale)];
  const row = rated ?? (await partnerRatings([partnerId]))[0];
  if (!row) return null;
  const rating = validRating(row);
  // Une panne de l'API Places vide la liste : le bloc d'avis disparaît, jamais la page.
  const rv = await reviewsForPlace(row.google_place_id, locale);
  const mapsUri = rv.mapsUri ?? row.google_maps_url ?? null;
  const showRating = withRating && rating !== null;
  if (!name && !showRating && rv.reviews.length === 0 && !mapsUri) return null;
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {name || showRating ? (
        <div className="flex flex-col gap-1">
          {name ? <p className="m-0 font-heading text-[20px] font-extrabold text-ink">{name}</p> : null}
          {showRating ? <RatingLine rating={rating.rating} count={rating.count} locale={locale} countLabel={v.googleReviews} /> : null}
        </div>
      ) : null}
      {rv.reviews.length > 0 ? (
        <GoogleReviewsBlock
          stacked={stacked} reviews={rv.reviews} mapsUri={mapsUri} locale={locale}
          title={v.reviewsTitle} allReviews={v.allReviews} readMore={v.readMore} readLess={v.readLess} googleReview={v.googleReview} disclaimer={v.disclaimer}
        />
      ) : mapsUri ? (
        // Aucun avis lisible (panne Places, fiche récente) : le lien vers la fiche reste.
        <a href={mapsUri} target="_blank" rel="noopener noreferrer nofollow" className="text-[14px] font-bold text-lagoon-deep hover:underline">
          {v.allReviews} ↗
        </a>
      ) : null}
    </div>
  );
}
