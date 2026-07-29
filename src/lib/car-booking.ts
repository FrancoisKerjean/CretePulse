// Tunnel voyageur car-rental : le client paie sur crete.direct, les fonds sont
// retenus, la commission est prelevee au passage et le solde part chez le loueur
// a la fermeture du droit au remboursement.
//
// CHARGE DE DESTINATION : le paiement va DIRECTEMENT sur le compte Stripe du
// loueur, commission et option prelevees au passage via `application_fee_amount`.
// crete.direct ne detient jamais les fonds du loueur.
//
// Deux consequences voulues (decision Kami 29/07/2026, apres un premier jet en
// charges separees) :
//  - on peut dire au loueur « c'est votre argent, on n'y touche jamais », et
//    c'est vrai ;
//  - crete.direct n'encaisse pas pour le compte d'un tiers, ce qui evite la
//    qualification de service de paiement.
// Les fonds restent bloques chez Stripe parce que le compte connecte est en
// versement `manual` : le cron declenche le payout 48 h avant la prise, et une
// annulation avant cette echeance reprend les fonds sans creer de decouvert.
//
// Plan : docs/superpowers/plans/2026-07-29-car-rental-tunnel-voyageur.md
import type Stripe from "stripe";
import { CANCELLATION_OPTION_EUR } from "./booking-policy.ts";
import { commissionEur } from "./car-admin.ts";

const round2 = (n: number): number => Math.round(n * 100) / 100;
const cents = (eur: number): number => Math.round(eur * 100);

/** Ce que paie le client : le prix de l'offre acceptee, plus l'option si prise. */
export function bookingTotalEur(quotedPriceEur: number, hasOption: boolean): number {
  return round2(quotedPriceEur + (hasOption ? CANCELLATION_OPTION_EUR : 0));
}

export interface BreakdownInput {
  quotedPriceEur: number;
  hasOption: boolean;
  /** Taux de commission du loueur, en fraction (0.1 = 10 %). */
  partnerRate: number;
}

export interface BookingBreakdown {
  totalCents: number;
  /** Ce qui reste au loueur sur son compte, en attente de versement. */
  partnerPayoutCents: number;
  commissionCents: number;
  /** Prix de l'option, acquis a crete.direct : il paie le risque d'annulation. */
  optionCents: number;
  /** Ce que preleve crete.direct sur la charge : commission + option. */
  applicationFeeCents: number;
}

/**
 * Repartition du paiement. Invariant tenu par construction et verifie par le
 * gate CI : payout + commission + option = total, au centime. Le payout est
 * calcule par soustraction, jamais par un second arrondi, pour qu'aucun centime
 * ne se perde entre les trois parts.
 */
export function bookingBreakdownCents(input: BreakdownInput): BookingBreakdown {
  const priceCents = cents(input.quotedPriceEur);
  // Meme fonction que le back-office et les commissions : la formule du taux
  // n'existe qu'a un seul endroit.
  const commissionCents = cents(commissionEur(input.quotedPriceEur, input.partnerRate));
  const optionCents = input.hasOption ? cents(CANCELLATION_OPTION_EUR) : 0;
  return {
    totalCents: priceCents + optionCents,
    partnerPayoutCents: priceCents - commissionCents,
    commissionCents,
    optionCents,
    applicationFeeCents: commissionCents + optionCents,
  };
}

export interface BookingCheckoutInput {
  requestId: number;
  customerEmail: string;
  quotedPriceEur: number;
  hasOption: boolean;
  partnerName: string;
  carLabel: string;
  dateFrom: string;
  dateTo: string;
  bookingToken: string;
  locale: string;
  /** Compte Stripe Express du loueur. Sans lui, pas de paiement possible. */
  connectAccountId: string;
  /** Taux de commission du loueur, en fraction. */
  partnerRate?: number;
}

const siteBase = (): string =>
  process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export function buildBookingCheckoutParams(
  input: BookingCheckoutInput,
): Stripe.Checkout.SessionCreateParams {
  const base = siteBase();
  const breakdown = bookingBreakdownCents({
    quotedPriceEur: input.quotedPriceEur,
    hasOption: input.hasOption,
    partnerRate: input.partnerRate ?? 0.1,
  });
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: "eur",
        product_data: {
          name: `${input.carLabel} · ${input.partnerName}`,
          description: `${input.dateFrom} → ${input.dateTo}`,
        },
        unit_amount: cents(input.quotedPriceEur),
      },
      quantity: 1,
    },
  ];
  if (input.hasOption) {
    lineItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          // Libelle verrouille : jamais « assurance », ce serait une activite
          // reglementee d'intermediation que crete.direct n'exerce pas.
          name: "Option annulation · cancellation option",
          description: "Remboursement intégral jusqu'à 48 h avant la prise du véhicule",
        },
        unit_amount: cents(CANCELLATION_OPTION_EUR),
      },
      quantity: 1,
    });
  }

  return {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    payment_intent_data: {
      // L'argent atterrit sur le compte du loueur ; crete.direct ne preleve que
      // sa commission et le prix de l'option.
      transfer_data: { destination: input.connectAccountId },
      application_fee_amount: breakdown.applicationFeeCents,
      // Compte plateforme partage (NovAI, descripteur par defaut "NOVAI").
      statement_descriptor_suffix: "CRETE DIRECT",
    },
    customer_email: input.customerEmail,
    metadata: {
      car_request_id: String(input.requestId),
      payment_type: "car_booking",
      brand: "crete.direct",
      cancellation_option: String(input.hasOption),
    },
    success_url: `${base}/${input.locale}/car-booking/${input.bookingToken}?paid=1`,
    cancel_url: `${base}/${input.locale}/car-booking/${input.bookingToken}`,
  };
}

export interface BookingPaidInfo {
  requestId: number;
  partnerName: string;
  partnerPhone?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  carLabel: string;
  pickupLabel: string;
  dateFrom: string;
  dateTo: string;
  amountPaidEur: number;
  hasOption: boolean;
  cancelUrl: string;
}

/**
 * Au loueur. Deux choses qu'il doit lire sans ambiguite : le client a DEJA paye,
 * il ne faut rien lui redemander a la prise du vehicule ; et son versement part
 * 48 h avant la prise, pas apres la location.
 */
export function bookingPaidPartnerBody(i: BookingPaidInfo): string {
  return [
    `Hi ${i.partnerName.split(" ")[0]},`,
    ``,
    `A booking has been paid online on crete.direct. Reference ${i.requestId}.`,
    ``,
    `Pick-up: ${i.pickupLabel}`,
    `Dates: ${i.dateFrom} to ${i.dateTo}`,
    `Car: ${i.carLabel}`,
    ``,
    `Customer: ${i.customerName}`,
    `Email: ${i.customerEmail}`,
    `Phone: ${i.customerPhone ?? "-"}`,
    ``,
    `The customer has already paid the rental in full. Do not ask for the rental amount at pick-up.`,
    `Your payout, rental minus commission, is sent 48 hours before pick-up.`,
    ``,
    `Any question on this booking, just reply to this email.`,
  ].join("\n");
}

/**
 * Au client. Il ne voit jamais la commission : ce qu'il a paye est le prix
 * annonce, la repartition ne le regarde pas. Le lien d'annulation n'existe que
 * s'il a pris l'option, sinon lui en donner un serait mentir.
 */
export function bookingPaidCustomerBody(i: BookingPaidInfo): string {
  return [
    `Hi ${i.customerName.split(" ")[0]},`,
    ``,
    `Your car is booked with ${i.partnerName}.`,
    ``,
    `Pick-up: ${i.pickupLabel}`,
    `Dates: ${i.dateFrom} to ${i.dateTo}`,
    `Car: ${i.carLabel}`,
    `Paid: ${i.amountPaidEur.toFixed(2)} EUR`,
    ...(i.partnerPhone ? [`Rental company phone: ${i.partnerPhone}`] : []),
    ``,
    ...(i.hasOption
      ? [
          `You took the cancellation option: full refund if you cancel more than 48 hours before pick-up.`,
          i.cancelUrl,
        ]
      : [`You did not take the cancellation option: no refund applies if you cancel.`]),
    ``,
    `The rental company will confirm the pick-up arrangements.`,
  ].join("\n");
}
