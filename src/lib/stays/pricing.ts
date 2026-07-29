import type { StayQuote } from "./types";

const round2 = (n: number): number => Math.round(n * 100) / 100;

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

export function computeQuote(input: QuoteInput): StayQuote {
  const nights = nightsBetween(input.dateFrom, input.dateTo);
  const ownerNetEur = round2(input.basePriceEur * nights + input.cleaningFeeEur);
  const commissionEur = round2(ownerNetEur * (input.commissionRate / 100));
  const guestTotalEur = round2(ownerNetEur + commissionEur);
  const depositEur = round2(guestTotalEur * DEPOSIT_PCT);
  const balanceEur = round2(guestTotalEur - depositEur);
  const ownerNetDeposit = round2(ownerNetEur * DEPOSIT_PCT);
  const applicationFeeCents = Math.round(
    ownerNetDeposit * (input.commissionRate / 100) * 100,
  );
  return {
    nights,
    basePriceEur: round2(input.basePriceEur),
    cleaningFeeEur: round2(input.cleaningFeeEur),
    ownerNetEur,
    commissionEur,
    guestTotalEur,
    depositEur,
    balanceEur,
    applicationFeeCents,
  };
}
