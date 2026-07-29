// Mesures du cockpit /admin/stays.
//
// Tout est pur et teste ici, la page ne fait que lire la base et afficher. Deux
// regles de lecture, non negociables parce que le cockpit sert a decider :
//   1. Un denominateur nul rend `null`, jamais 0. Un taux de 0 % se lit comme un
//      echec commercial, l'absence de mesure doit se lire "n/d".
//   2. La commission encaissee suit les deux prelevements Stripe reels (30 % sur
//      l'acompte, le reste sur le solde), pas la commission theorique du sejour.
import { DEPOSIT_PCT } from "./pricing.ts";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface AdminStayRequest {
  id: number;
  listing_id: number;
  status: string;
  created_at: string;
  quoted_price_eur: number | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  balance_amount: number | null;
  balance_paid_at: string | null;
  commission_eur: number | null;
}

export interface AdminStayListing {
  id: number;
  slug: string;
  owner_id: number;
  title: string | null;
  status: string;
  base_price_eur: number | null;
  min_nights: number | null;
  photos: unknown[] | null;
  ical_private_url: string | null;
  ical_synced_at: string | null;
  ical_last_error: string | null;
}

export interface AdminStayOwner {
  id: number;
  email: string;
  name: string | null;
  kyc_status: string | null;
  stripe_connect_account_id: string | null;
  locale: string | null;
  owner_token_hash: string | null;
}

/** Statuts qui valent "le proprietaire a dit oui". */
const ACCEPTED = new Set(["approved", "deposit_paid", "confirmed", "cancelled"]);
/** Statuts qui valent "le voyageur n'aura pas ce sejour", refus ou silence. */
const REFUSED = new Set(["declined", "expired"]);

export interface StaysKpis {
  /** Demandes creees dans la fenetre. */
  requests: number;
  /** Acceptees sur tranchees. `null` si rien n'a encore ete tranche. */
  acceptRate: number | null;
  /** Acomptes payes sur acceptees. `null` sans acceptation. */
  depositRate: number | null;
  /** Commission reellement prelevee, sur tout l'historique fourni. */
  commissionCollectedEur: number;
}

export function staysKpis(
  requests: AdminStayRequest[],
  windowDays: number,
  nowMs: number,
): StaysKpis {
  const from = nowMs - windowDays * 86_400_000;
  const inWindow = requests.filter((r) => new Date(r.created_at).getTime() >= from);

  const accepted = inWindow.filter((r) => ACCEPTED.has(r.status));
  const decided = accepted.length + inWindow.filter((r) => REFUSED.has(r.status)).length;
  const depositPaid = accepted.filter((r) => r.deposit_paid_at).length;

  // La tresorerie ne se fenetre pas : un encaissement du mois dernier reste en
  // caisse. Le calcul porte donc sur l'ensemble des demandes fournies.
  const commissionCollectedEur = round2(
    requests.reduce((sum, r) => {
      const commission = Number(r.commission_eur) || 0;
      if (!commission) return sum;
      if (r.balance_paid_at) return sum + commission;
      if (r.deposit_paid_at) return sum + round2(commission * DEPOSIT_PCT);
      return sum;
    }, 0),
  );

  return {
    requests: inWindow.length,
    acceptRate: decided ? accepted.length / decided : null,
    depositRate: accepted.length ? depositPaid / accepted.length : null,
    commissionCollectedEur,
  };
}

/** Fraicheur attendue d'un flux OTA. Le cron passe toutes les 6 heures. */
const STALE_AFTER_MS = 24 * 3_600_000;

export type ListingSignal = "ok" | "no_ical" | "stale_ical" | "ical_error" | "unpublished";

/**
 * Etat de sante d'une annonce du point de vue du surbooking. Une annonce
 * reservable dont le calendrier de l'OTA n'arrive pas vendra deux fois les
 * memes nuits : c'est le seul signal du cockpit qui coute de l'argent reel.
 */
export function listingSignal(listing: AdminStayListing, nowMs: number): ListingSignal {
  if (listing.status !== "published") return "unpublished";
  if (listing.ical_last_error) return "ical_error";
  if (!listing.ical_private_url) return "no_ical";
  const synced = listing.ical_synced_at ? new Date(listing.ical_synced_at).getTime() : 0;
  if (!synced || nowMs - synced > STALE_AFTER_MS) return "stale_ical";
  return "ok";
}

/**
 * Un proprietaire dont le KYC n'est pas complet alors qu'une de ses annonces est
 * publiee : l'annonce prend des demandes qu'elle ne pourra pas encaisser.
 */
export function ownerIsBlocking(
  kycStatus: string | null,
  listings: AdminStayListing[],
): boolean {
  const hasPublished = listings.some((l) => l.status === "published");
  return hasPublished && kycStatus !== "complete";
}
