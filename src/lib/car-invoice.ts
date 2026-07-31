// Logique pure de la facturation de commission : aucune I/O, aucun acces base.
// Tout ce qui decide « faut-il facturer cette ligne » vit ici pour etre teste
// sans Supabase ni Stripe.
import { STRIPE_MIN_CHARGE_EUR } from "./car-commission";

export interface InvoiceCandidate {
  id: number;
  accepted_at: string | null;
  outcome: string | null;
  date_from: string;
  booking_paid_at: string | null;
  quoted_by_partner_id: number | null;
  quoted_price: number | null;
}

/**
 * `today` et `start` sont des dates ISO `YYYY-MM-DD`. La comparaison est
 * lexicographique, exacte sur ce format, et sans fuseau : la date de depart est
 * une date civile, pas un instant.
 */
export function isInvoiceable(r: InvoiceCandidate, today: string, start: string): boolean {
  if (!r.accepted_at) return false;
  // Une demande deja tranchee ne se refacture pas, et surtout ne se ressuscite pas.
  if (r.outcome !== null) return false;
  if (r.booking_paid_at) return false;
  if (r.quoted_by_partner_id == null) return false;
  if (r.quoted_price == null || r.quoted_price <= 0) return false;
  if (r.date_from < start) return false;
  // `<=` et non `=` : le cron est son propre rattrapage.
  return r.date_from <= today;
}

export interface InvoiceAmounts {
  base: number;
  rate: number;
  amount: number;
}

/** Rend null quand la commission tombe sous le minimum encaissable par Stripe. */
export function invoiceAmounts(base: number, rate: number): InvoiceAmounts | null {
  const amount = Math.round(base * rate * 100) / 100;
  if (amount < STRIPE_MIN_CHARGE_EUR) return null;
  return { base, rate, amount };
}

/**
 * L avoir porte le numero de sa facture suffixe `-A`. Il ne consomme donc pas
 * la serie : le rapprochement facture/avoir se lit a l oeil, et un trou dans la
 * numerotation des factures ne peut pas apparaitre a cause d un avoir.
 */
export function creditNumberFor(invoiceNumber: string): string {
  return `${invoiceNumber}-A`;
}

export interface CreditMail {
  creditNumber: string;
  number: string;
  partnerName: string;
  amountEur: number;
  reason: string;
}

export function creditMailBody(m: CreditMail): string {
  return [
    `Hi ${m.partnerName},`,
    ``,
    `Credit note ${m.creditNumber} cancels invoice ${m.number} in full (${m.amountEur.toFixed(2)} EUR).`,
    `Reason: ${m.reason}.`,
    ``,
    `There is nothing to pay for this rental.`,
  ].join("\n");
}
