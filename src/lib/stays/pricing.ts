import type { StayQuote } from "./types";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Montant en euros tel qu'il s affiche au voyageur.
 *
 * Vit ici et non dans un composant : le detail du devis et la barre de
 * reservation mobile annoncent le MEME total, et deux formatages differents
 * donneraient deux montants a l ecran pour un seul calcul.
 */
export const formatEur = (n: number): string =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export function nightsBetween(dateFrom: string, dateTo: string): number {
  const from = new Date(dateFrom + "T00:00:00Z").getTime();
  const to = new Date(dateTo + "T00:00:00Z").getTime();
  const nights = Math.round((to - from) / 86_400_000);
  if (!Number.isFinite(nights) || nights <= 0) {
    throw new Error("Invalid date range");
  }
  return nights;
}

export const DEPOSIT_PCT = 0.3;

export interface QuoteInput {
  /**
   * Prix net proprietaire A LA NUIT, en euros (colonne DB stay_listings.base_price_eur
   * et stay_requests.quoted_price_eur). Decision Kami 25/07/2026 : le proprietaire
   * saisit et confirme un tarif par nuit, jamais un forfait sejour.
   */
  basePriceEur: number;
  /** Frais de menage, factures UNE fois par sejour, jamais par nuit. */
  cleaningFeeEur: number;
  commissionRate: number;
  dateFrom: string;
  dateTo: string;
}

/**
 * Frais d'application preleves sur le solde 70 %. Invariant d'encaissement :
 * `applicationFeeCents` (acompte) + ce montant = commission totale du sejour, au
 * centime. Seule source de cette formule : /api/stays/pay-balance et
 * scripts/check-stays.mjs l'appellent, personne ne la reecrit.
 */
export function balanceApplicationFeeCents(quote: StayQuote): number {
  return Math.max(
    0,
    Math.round(quote.commissionEur * 100) - quote.applicationFeeCents,
  );
}

/** Ce qu'il faut pour chiffrer un sejour, une fois le nombre de nuits connu. */
export type NightlyTerms = Pick<
  QuoteInput,
  "basePriceEur" | "cleaningFeeEur" | "commissionRate"
>;

/**
 * Devis a partir d un NOMBRE de nuits plutot que de deux dates.
 *
 * Sert a la fiche visiteur, qui doit annoncer le total du sejour le plus court
 * reservable (le minimum de l annonce) avant que le voyageur ait choisi ses
 * dates : sans lui, la page affiche un prix a la nuit et laisse le lecteur
 * multiplier de tete, minimum de nuits et frais compris.
 *
 * ⛔ `computeQuote` delegue ici : une seule formule, sinon la fiche annoncerait
 * un total que la demande ne confirmerait pas.
 */
export function quoteForNights(nights: number, terms: NightlyTerms): StayQuote {
  if (!Number.isInteger(nights) || nights <= 0) {
    throw new Error("Invalid nights");
  }
  const ownerNetEur = round2(terms.basePriceEur * nights + terms.cleaningFeeEur);
  const commissionEur = round2(ownerNetEur * (terms.commissionRate / 100));
  const guestTotalEur = round2(ownerNetEur + commissionEur);
  const depositEur = round2(guestTotalEur * DEPOSIT_PCT);
  const balanceEur = round2(guestTotalEur - depositEur);
  const ownerNetDeposit = round2(ownerNetEur * DEPOSIT_PCT);
  const applicationFeeCents = Math.round(
    ownerNetDeposit * (terms.commissionRate / 100) * 100,
  );
  return {
    nights,
    basePriceEur: round2(terms.basePriceEur),
    cleaningFeeEur: round2(terms.cleaningFeeEur),
    ownerNetEur,
    commissionEur,
    guestTotalEur,
    depositEur,
    balanceEur,
    applicationFeeCents,
  };
}

export function computeQuote(input: QuoteInput): StayQuote {
  return quoteForNights(nightsBetween(input.dateFrom, input.dateTo), input);
}
