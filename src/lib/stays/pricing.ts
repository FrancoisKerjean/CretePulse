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
  basePriceEur: number;
  cleaningFeeEur: number;
  commissionRate: number;
  dateFrom: string;
  dateTo: string;
}

export function computeQuote(input: QuoteInput): StayQuote {
  const nights = nightsBetween(input.dateFrom, input.dateTo);
  const ownerNetEur = round2(input.basePriceEur + input.cleaningFeeEur);
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
