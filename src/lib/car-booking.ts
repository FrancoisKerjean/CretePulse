// Tunnel voyageur car-rental : le client paie sur crete.direct, les fonds sont
// retenus, la commission est prelevee au passage et le solde part chez le loueur
// a la fermeture du droit au remboursement.
//
// CHARGES SEPAREES, pas charge de destination : aucun `transfer_data` ici. Le
// versement est un `transfers.create` distinct, declenche par le cron. C'est ce
// qui permet de rembourser sans jamais reprendre d'argent au loueur.
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
  /** Ce qui partira au loueur au versement differe. */
  partnerPayoutCents: number;
  commissionCents: number;
  /** Prix de l'option, acquis a crete.direct : il paie le risque d'annulation. */
  optionCents: number;
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
}

const siteBase = (): string =>
  process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export function buildBookingCheckoutParams(
  input: BookingCheckoutInput,
): Stripe.Checkout.SessionCreateParams {
  const base = siteBase();
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
