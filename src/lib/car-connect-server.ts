// Onboarding Stripe Connect Express des loueurs.
//
// Chaque loueur ouvre son propre compte connecte : c'est lui qui fournit ses
// documents et son IBAN, crete.direct ne les voit jamais. Sans ce compte, le
// cron de versement garde les fonds et le signale.
//
// ⛔ Exige que la plateforme Connect soit activee sur le compte NovAI. Tant
// qu'elle ne l'est pas, `accounts.create` repond 400 et cette fonction rend un
// refus lisible plutot qu'une erreur brute.
//
// Plan : docs/superpowers/plans/2026-07-29-car-rental-tunnel-voyageur.md
import { supabaseAdmin } from "./supabase-admin";
import { stripeClient } from "./stays/stripe-helpers";
import { siteBase } from "./car-quote";
import { classifyStripeFailure, stripeLogFields } from "./stripe-errors";

export type OnboardingResult =
  | { status: "ready"; url: string; accountId: string }
  /** Loueur introuvable, ou sans email : rien a onboarder. */
  | { status: "not_found" }
  | { status: "failed"; code: string };

export async function startPartnerOnboarding(partnerId: number): Promise<OnboardingResult> {
  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("id, name, email, stripe_connect_account_id")
    .eq("id", partnerId)
    .maybeSingle();

  if (!partner?.email) return { status: "not_found" };

  let accountId = partner.stripe_connect_account_id as string | null;

  if (!accountId) {
    try {
      const account = await stripeClient().accounts.create({
        type: "express",
        // Les loueurs du parc sont des agences cretoises. Le pays du compte
        // bancaire est modifiable par le loueur pendant son onboarding.
        country: "GR",
        email: partner.email,
        business_type: "company",
        capabilities: {
          // `transfers` est indispensable : sans elle le versement echoue au
          // moment ou l'argent doit partir, apres encaissement du client.
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
    } catch (err) {
      const failure = classifyStripeFailure(err);
      console.error("[car/connect] creation du compte loueur refusee", {
        partnerId,
        failure: failure.code,
        ...stripeLogFields(err),
      });
      // Aucun compte fantome ecrit : le loueur reste onboardable a la reouverture.
      return { status: "failed", code: failure.code };
    }

    await supabaseAdmin
      .from("car_partners")
      .update({ stripe_connect_account_id: accountId, kyc_status: "pending" })
      .eq("id", partnerId);
  }

  try {
    const base = siteBase();
    const link = await stripeClient().accountLinks.create({
      account: accountId,
      refresh_url: `${base}/admin/car-rental?tab=partners&connect=refresh&partner=${partnerId}`,
      return_url: `${base}/admin/car-rental?tab=partners&connect=done&partner=${partnerId}`,
      type: "account_onboarding",
    });
    return { status: "ready", url: link.url, accountId };
  } catch (err) {
    const failure = classifyStripeFailure(err);
    console.error("[car/connect] lien d onboarding refuse", {
      partnerId,
      failure: failure.code,
      ...stripeLogFields(err),
    });
    return { status: "failed", code: failure.code };
  }
}

/**
 * Relit l'etat du compte chez Stripe. `payouts_enabled` est le SEUL signal qui
 * compte ici : un compte peut encaisser sans pouvoir etre paye, et c'est le
 * versement qui nous interesse.
 */
export async function refreshPartnerKyc(partnerId: number): Promise<string> {
  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("id, stripe_connect_account_id")
    .eq("id", partnerId)
    .maybeSingle();

  const accountId = partner?.stripe_connect_account_id as string | null | undefined;
  if (!accountId) return "none";

  let status = "pending";
  try {
    const account = await stripeClient().accounts.retrieve(accountId);
    status = account.payouts_enabled ? "complete" : "pending";
  } catch (err) {
    console.error("[car/connect] lecture du compte loueur refusee", {
      partnerId,
      ...stripeLogFields(err),
    });
    return "pending";
  }

  await supabaseAdmin
    .from("car_partners")
    .update({ kyc_status: status })
    .eq("id", partnerId);
  return status;
}
