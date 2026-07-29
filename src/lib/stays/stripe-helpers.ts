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

export interface BalanceCheckoutInput {
  listingTitle: string;
  dateFrom: string;
  dateTo: string;
  balanceEur: number;
  applicationFeeCents: number;
  connectAccountId: string;
  guestEmail: string;
  requestId: number;
  balanceToken: string;
  locale: string;
}

/** Second charge : le solde 70 %, demande a J-14 par le cron stays-balance. */
export function buildBalanceCheckoutParams(
  input: BalanceCheckoutInput,
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
            name: `${input.listingTitle} · solde 70%`,
            description: `${input.dateFrom} → ${input.dateTo}`,
          },
          unit_amount: Math.round(input.balanceEur * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: input.applicationFeeCents,
      transfer_data: { destination: input.connectAccountId },
      statement_descriptor_suffix: "CRETE DIRECT",
    },
    customer_email: input.guestEmail,
    metadata: {
      request_id: String(input.requestId),
      payment_type: "balance",
      brand: "crete.direct",
    },
    success_url: `${base}/${input.locale}/stays/balance/${input.balanceToken}?paid=1`,
    cancel_url: `${base}/${input.locale}/stays/balance/${input.balanceToken}`,
  };
}

export function stripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY as string);
}

export interface ConnectProfile {
  /** Code pays ISO 3166-1 alpha-2 du compte bancaire du proprietaire. */
  country?: string;
  businessType?: "individual" | "company";
}

export function buildConnectAccountParams(
  ownerEmail: string,
  profile: ConnectProfile,
): Stripe.AccountCreateParams {
  const country =
    typeof profile.country === "string" && /^[A-Za-z]{2}$/.test(profile.country)
      ? profile.country.toUpperCase()
      : "GR";
  return {
    type: "express",
    country,
    email: ownerEmail,
    business_type: profile.businessType === "company" ? "company" : "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  };
}

export async function createConnectOnboardingLink(
  ownerEmail: string,
  ownerId: number,
  profile: ConnectProfile = {},
): Promise<{ accountId: string; url: string }> {
  const stripe = stripeClient();
  const account = await stripe.accounts.create(
    buildConnectAccountParams(ownerEmail, profile),
  );
  const base = siteBase();
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${base}/api/stays/connect/onboard?refresh=true&owner=${ownerId}`,
    return_url: `${base}/api/stays/connect/onboard?success=true&account=${account.id}&owner=${ownerId}`,
    type: "account_onboarding",
  });
  return { accountId: account.id, url: link.url };
}
