import Stripe from "stripe";
import { siteBase } from "@/lib/stays/tokens";

export interface CheckoutParamsInput {
  listingTitle: string;
  dateFrom: string;
  dateTo: string;
  depositEur: number;
  applicationFeeCents: number;
  connectAccountId: string;
  guestEmail: string;
  requestId: number;
  payToken: string;
  locale: string;
}

export function buildCheckoutParams(
  input: CheckoutParamsInput,
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
            name: `${input.listingTitle} · acompte 30%`,
            description: `${input.dateFrom} → ${input.dateTo}`,
          },
          unit_amount: Math.round(input.depositEur * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: input.applicationFeeCents,
      transfer_data: { destination: input.connectAccountId },
      // Compte plateforme partage (NovAI, descripteur par defaut "NOVAI"). Le
      // suffixe est la seule surface ou le voyageur lit une marque sur son releve.
      statement_descriptor_suffix: "CRETE DIRECT",
    },
    customer_email: input.guestEmail,
    metadata: {
      request_id: String(input.requestId),
      payment_type: "deposit",
      // Discriminant lu par le webhook : les 3 autres endpoints du compte recoivent
      // aussi cet evenement.
      brand: "crete.direct",
    },
    success_url: `${base}/${input.locale}/stays/pay/${input.payToken}?paid=1`,
    cancel_url: `${base}/${input.locale}/stays/pay/${input.payToken}`,
  };
}

export function stripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY as string);
}

export async function createConnectOnboardingLink(
  ownerEmail: string,
  ownerId: number,
): Promise<{ accountId: string; url: string }> {
  const stripe = stripeClient();
  const account = await stripe.accounts.create({
    type: "express",
    country: "GR",
    email: ownerEmail,
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  const base = siteBase();
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${base}/api/stays/connect/onboard?refresh=true&owner=${ownerId}`,
    return_url: `${base}/api/stays/connect/onboard?success=true&account=${account.id}&owner=${ownerId}`,
    type: "account_onboarding",
  });
  return { accountId: account.id, url: link.url };
}
