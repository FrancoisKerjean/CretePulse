// Ce que voit le proprietaire dans son espace. Pur, teste, sans acces base.
//
// Trois lectures, dans l'ordre ou il les regarde : qui arrive, quelles nuits
// sont prises, combien il a gagne. Le detail par reservation est un choix
// assume (Kami 30/07/2026) : la commission est visible ligne a ligne, c'est le
// prix de la transparence annoncee.
import { computeQuote } from "./pricing";

export interface OwnerListing {
  id: number;
  title?: string | null;
  cleaning_fee_eur?: number | null;
  commission_rate?: number | null;
}

export interface OwnerRequest {
  id: number;
  listing_id: number;
  guest_name: string;
  guest_phone?: string | null;
  guest_email?: string | null;
  date_from: string;
  date_to: string;
  status: string;
  quoted_price_eur?: number | null;
}

/** Statuts pour lesquels de l'argent a ete engage par le voyageur. */
const PAID_STATUSES = new Set(["deposit_paid", "confirmed"]);

export interface EarningLine {
  requestId: number;
  listingId: number;
  guestName: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  guestTotalEur: number;
  commissionEur: number;
  ownerNetEur: number;
}

export interface OwnerEarnings {
  lines: EarningLine[];
  /** Sejours integralement regles. */
  receivedEur: number;
  /** Sejours dont l'acompte est paye, solde a venir. */
  expectedEur: number;
}

export function ownerEarnings(
  requests: OwnerRequest[],
  listings: OwnerListing[],
): OwnerEarnings {
  const byId = new Map(listings.map((l) => [l.id, l]));
  const lines: EarningLine[] = [];
  let receivedEur = 0;
  let expectedEur = 0;

  for (const r of requests) {
    if (!PAID_STATUSES.has(r.status)) continue;
    const listing = byId.get(r.listing_id);
    // Annonce supprimee entre-temps : on n'invente pas de chiffre.
    if (!listing) continue;

    const quote = computeQuote({
      basePriceEur: Number(r.quoted_price_eur) || 0,
      cleaningFeeEur: Number(listing.cleaning_fee_eur) || 0,
      commissionRate: Number(listing.commission_rate) || 5,
      dateFrom: r.date_from,
      dateTo: r.date_to,
    });

    lines.push({
      requestId: r.id,
      listingId: r.listing_id,
      guestName: r.guest_name,
      dateFrom: r.date_from,
      dateTo: r.date_to,
      status: r.status,
      guestTotalEur: quote.guestTotalEur,
      commissionEur: quote.commissionEur,
      ownerNetEur: quote.ownerNetEur,
    });

    if (r.status === "confirmed") receivedEur += quote.ownerNetEur;
    else expectedEur += quote.ownerNetEur;
  }

  return {
    lines,
    receivedEur: Math.round(receivedEur * 100) / 100,
    expectedEur: Math.round(expectedEur * 100) / 100,
  };
}

/** Sejours payes dont l'arrivee n'est pas passee, les plus proches d'abord. */
export function upcomingArrivals(requests: OwnerRequest[], today: string): OwnerRequest[] {
  return requests
    .filter((r) => PAID_STATUSES.has(r.status) && r.date_from >= today)
    .sort((a, b) => a.date_from.localeCompare(b.date_from));
}

export interface CalendarNight {
  date: string;
  /** D'ou vient le blocage : vendu ici, bloque par l'OTA, pose par le proprietaire. */
  origin: "sold" | "ota" | "owner" | "other";
  /** Le proprietaire peut-il liberer cette nuit lui-meme ? */
  releasable: boolean;
}

const ORIGIN: Record<string, CalendarNight["origin"]> = {
  booked: "sold",
  blocked_ota: "ota",
  hold: "owner",
};

export function calendarNights(
  nights: Array<{ date: string; status: string }>,
): CalendarNight[] {
  return nights
    .map((n) => {
      const origin = ORIGIN[n.status] ?? "other";
      return { date: n.date, origin, releasable: origin === "owner" };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
