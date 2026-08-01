// Parseur des faits d une page annonce Airbnb. PUR : il recoit du HTML, il ne fait
// aucun appel reseau, il est teste sur une fixture committee.
// Mesure du 01/08/2026 sur une page reelle : starRating, reviewCount, personCapacity,
// listingLat, listingLng et descriptionLanguage sont dans le HTML statique. Les TEXTES
// des avis n y sont PAS, ils viennent d un second appel GraphQL signe : ce parseur ne
// tente pas de les lire.
export interface AirbnbFacts {
  ratingAvg: number | null;
  reviewsCount: number | null;
  maxGuests: number | null;
  lat: number | null;
  lng: number | null;
  descriptionLocale: string | null;
}

function num(html: string, key: string): number | null {
  const m = html.match(new RegExp(`"${key}":\\s*(-?[0-9]+(?:\\.[0-9]+)?)`));
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

function str(html: string, key: string): string | null {
  const m = html.match(new RegExp(`"${key}":\\s*"([^"]{1,16})"`));
  return m ? m[1] : null;
}

/** Une valeur hors bornes est rendue null : mieux vaut rien qu une note fausse. */
const inRange = (v: number | null, lo: number, hi: number): number | null =>
  v != null && v >= lo && v <= hi ? v : null;

export function parseAirbnbFacts(html: string): AirbnbFacts {
  const locale = str(html, "descriptionLanguage");
  return {
    ratingAvg: inRange(num(html, "starRating"), 1, 5),
    reviewsCount: inRange(num(html, "reviewCount"), 0, 100_000),
    maxGuests: inRange(num(html, "personCapacity"), 1, 50),
    lat: inRange(num(html, "listingLat"), -90, 90),
    lng: inRange(num(html, "listingLng"), -180, 180),
    descriptionLocale: locale && /^[a-z]{2}$/.test(locale) ? locale : null,
  };
}
