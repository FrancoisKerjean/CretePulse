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

/** Colonnes de `car_commission_invoices` dont le back-office a besoin. */
export interface AdminInvoiceRow {
  number: string;
  sent_at: string | null;
  paid_at: string | null;
  credited_at: string | null;
  credit_number: string | null;
}

export interface AdminInvoiceState {
  number: string;
  /** Etat lu d un coup d oeil : ou en est l argent sur cette facture. */
  label: string;
  /**
   * `alert` = envoi jamais parti. C est le SEUL etat qui appelle une action :
   * la facture existe, numerotee, et le cron ne repassera jamais dessus.
   */
  tone: "alert" | "due" | "ok" | "muted";
  canResend: boolean;
  canCredit: boolean;
}

const adminDay = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Athens" });

/**
 * Etat d une facture de commission vu du back-office, et ce qui reste cliquable
 * dessus. Pur, donc teste : un bouton qui s affiche alors que l action le
 * refusera est un mensonge d interface, et un bouton absent alors que l action
 * marcherait est un rattrapage perdu.
 *
 * Les deux gestes ferment sur les MEMES conditions que leurs actions serveur :
 * `resendCommissionInvoice` et `creditCommissionInvoice` refusent toutes deux
 * `already_paid` et `already_credited`.
 */
export function invoiceAdminState(
  invoice: AdminInvoiceRow | null | undefined,
): AdminInvoiceState | null {
  if (!invoice) return null;
  const base = { number: invoice.number, canResend: false, canCredit: false };

  // L etat le plus terminal gagne : une facture avoiree ne se renvoie pas, meme
  // si la base porte aussi un paiement.
  if (invoice.credited_at) {
    return {
      ...base,
      tone: "muted",
      label: `annulée par l'avoir ${invoice.credit_number ?? "(numéro manquant)"}`,
    };
  }
  if (invoice.paid_at) {
    return { ...base, tone: "ok", label: `payée le ${adminDay(invoice.paid_at)}` };
  }
  if (!invoice.sent_at) {
    return { ...base, tone: "alert", label: "jamais envoyée", canResend: true, canCredit: true };
  }
  return {
    ...base,
    tone: "due",
    label: `envoyée le ${adminDay(invoice.sent_at)}`,
    canResend: true,
    canCredit: true,
  };
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
