// Encaissement de la commission loueur par Stripe.
//
// Le loueur encaisse son client en direct : crete.direct ne touche jamais
// l'argent de la location. Ce qui est facture ici, c'est la commission, vendue
// par crete.direct au loueur. Le paiement va donc droit sur le compte
// plateforme, sans `transfer_data` ni compte connecte. Consequence voulue :
// **ce flux fonctionne Stripe Connect ferme**, contrairement au tunnel Stays.
import type Stripe from "stripe";

/** Minimum encaissable par Stripe en EUR. En dessous, la session est refusee. */
export const STRIPE_MIN_CHARGE_EUR = 0.5;

export interface CommissionCandidate {
  id: number;
  outcome: string | null;
  commission_eur: number | null;
  commission_paid_at: string | null;
  commission_session_id: string | null;
  quoted_by_partner_id: number | null;
}

/**
 * Garde d'idempotence et de bon sens, appliquee avant tout appel a Stripe.
 * `commission_session_id` non nul veut dire qu'une demande est deja partie :
 * rejouer setOutcome ne doit pas facturer deux fois le meme loueur.
 */
export function shouldRequestCommission(req: CommissionCandidate): boolean {
  if (req.outcome !== "rented") return false;
  if (req.commission_paid_at) return false;
  if (req.commission_session_id) return false;
  if (req.quoted_by_partner_id == null) return false;
  const eur = req.commission_eur;
  return typeof eur === "number" && eur >= STRIPE_MIN_CHARGE_EUR;
}

export interface CommissionMail {
  requestId: number;
  partnerName: string;
  commissionEur: number;
  finalAmountEur: number;
  dateFrom: string;
  dateTo: string;
  payUrl: string;
}

// Les loueurs cretois recoivent deja leurs leads en anglais (sendCarLeadEmail).
// Un seul canal, une seule langue : on ne bascule pas en francais pour la
// facturation.
export function commissionRequestSubject(m: CommissionMail): string {
  return `crete.direct commission due: ${m.commissionEur.toFixed(2)} EUR (rental ${m.requestId})`;
}

export function commissionRequestBody(m: CommissionMail): string {
  return [
    `Hi ${m.partnerName},`,
    ``,
    `Your rental ${m.dateFrom} to ${m.dateTo} is marked as rented on crete.direct.`,
    ``,
    `Rental reference: ${m.requestId}`,
    `Rental amount you collected: ${m.finalAmountEur.toFixed(2)} EUR`,
    `crete.direct commission: ${m.commissionEur.toFixed(2)} EUR`,
    ``,
    `Pay the commission here:`,
    m.payUrl,
    ``,
    `The payment goes to crete.direct only. Your rental money stays with you, we never touch it.`,
    `Any question on this line, just reply to this email.`,
  ].join("\n");
}

export interface CommissionCheckoutInput {
  requestId: number;
  partnerName: string;
  partnerEmail: string;
  commissionEur: number;
  finalAmountEur: number;
  dateFrom: string;
  dateTo: string;
}

const siteBase = (): string =>
  process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export function buildCommissionCheckoutParams(
  input: CommissionCheckoutInput,
): Stripe.Checkout.SessionCreateParams {
  const base = siteBase();
  return {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Commission crete.direct · location ${input.requestId}`,
            description: `${input.partnerName} · ${input.dateFrom} → ${input.dateTo} · location ${input.finalAmountEur.toFixed(2)} EUR`,
          },
          unit_amount: Math.round(input.commissionEur * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      // Compte plateforme partage (NovAI, descripteur par defaut "NOVAI") : sans
      // ce suffixe, le loueur ne rapproche pas la ligne de son releve.
      statement_descriptor_suffix: "CRETE DIRECT",
    },
    customer_email: input.partnerEmail,
    metadata: {
      car_request_id: String(input.requestId),
      payment_type: "car_commission",
      // Discriminant lu par le webhook : le compte porte plusieurs marques et
      // chaque endpoint recoit les evenements de toutes.
      brand: "crete.direct",
    },
    success_url: `${base}/fr/partners?commission=paid`,
    cancel_url: `${base}/fr/partners?commission=cancelled`,
  };
}
