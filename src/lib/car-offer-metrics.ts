// src/lib/car-offer-metrics.ts : calcul PUR des props de la page d'offres voiture.
//
// Pourquoi ce module existe. Sur 31 demandes de juillet-aout 2026, 28 ont recu
// entre 3 et 9 devis en moins d'une heure, et 22 se sont fermees quand meme :
// 14 clients devenus muets, 7 dates de depart depassees, UN seul refus explicite.
// La page /car-offer/<token> est le seul endroit ou se joue cet ecart, et elle
// n'emettait AUCUN evenement : on ignorait meme si le client l'ouvrait.
//
// RGPD : aucune donnee personnelle, aucun prix brut, aucun identifiant de demande.
// Uniquement des categories plafonnees, comme dans src/lib/retention.ts.

export type OfferState = "offers" | "none_yet" | "already_accepted";

export type OfferViewProps = {
  state: OfferState;
  /** Nombre d'offres visibles, plafonne a "10+" pour borner la cardinalite Plausible. */
  offers: string;
  /** Dispersion des prix : teste l'hypothese « trop d'offres heterogenes a depouiller ». */
  spread: "n/a" | "single" | "tight" | "mid" | "wide";
  /** Distance au depart. `past` dit qu'on regarde une offre deja perimee. */
  days_to_pickup: "past" | "today" | "1" | "2_3" | "4_7" | "8_30" | "30_plus" | "unknown";
  locale: string;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Seuils de dispersion, en ecart relatif au prix le moins cher.
 * Choisis a la main faute de donnees : c'est justement ce que cette mesure va
 * produire. SHORTCUT: seuils arbitraires, declencheur d'upgrade = 30 vues
 * mesurees, de quoi les recalibrer sur la distribution reelle.
 */
const SPREAD_MID = 0.15;
const SPREAD_WIDE = 0.4;

export function spreadBucket(prices: readonly number[]): OfferViewProps["spread"] {
  const valid = prices.filter((p) => Number.isFinite(p) && p > 0);
  if (valid.length === 0) return "n/a";
  if (valid.length === 1) return "single";
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const ratio = (max - min) / min;
  if (ratio >= SPREAD_WIDE) return "wide";
  if (ratio >= SPREAD_MID) return "mid";
  return "tight";
}

export function daysToPickupBucket(
  dateFrom: string | null | undefined,
  now: number,
): OfferViewProps["days_to_pickup"] {
  if (!dateFrom) return "unknown";
  const t = Date.parse(`${dateFrom}T00:00:00Z`);
  if (!Number.isFinite(t)) return "unknown";
  // Jours calendaires UTC, meme convention que retention.ts : ouvrir a 23h59 puis
  // a 00h01 doit compter comme deux jours differents.
  const d = Math.floor(t / DAY) - Math.floor(now / DAY);
  if (d < 0) return "past";
  if (d === 0) return "today";
  if (d === 1) return "1";
  if (d <= 3) return "2_3";
  if (d <= 7) return "4_7";
  if (d <= 30) return "8_30";
  return "30_plus";
}

export function offerCountBucket(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  return n >= 10 ? "10+" : String(Math.floor(n));
}

export function offerViewProps(input: {
  state: OfferState;
  prices: readonly number[];
  dateFrom: string | null | undefined;
  locale: string;
  now: number;
}): OfferViewProps {
  return {
    state: input.state,
    offers: offerCountBucket(input.prices.length),
    spread: spreadBucket(input.prices),
    days_to_pickup: daysToPickupBucket(input.dateFrom, input.now),
    locale: input.locale,
  };
}
