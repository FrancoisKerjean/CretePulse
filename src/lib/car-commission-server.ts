// Declenchement de la demande de commission. Appele par le back-office au
// passage d'une location en « rented » (decision Kami 29/07/2026 : automatique,
// pas de geste manuel).
//
// Ce module ne touche jamais l'argent de la location : il vend la commission au
// loueur, sur le compte plateforme, sans Connect. Voir car-commission.ts.
import { supabaseAdmin } from "./supabase-admin";
import { stripeClient } from "./stays/stripe-helpers";
import { sendPartnerCommissionRequest } from "./email";
import {
  shouldRequestCommission,
  buildCommissionCheckoutParams,
  type CommissionCandidate,
} from "./car-commission";
import { classifyStripeFailure, stripeLogFields } from "./stripe-errors";

export type CommissionOutcome =
  | { status: "requested"; sessionId: string; url: string | null }
  /** Rien a facturer : pas louee, deja reglee, montant sous le minimum Stripe. */
  | { status: "skipped" }
  /** Un autre appel a pris le verrou : la demande est deja partie. */
  | { status: "already_requested" }
  | { status: "failed"; code: string };

type RequestRow = CommissionCandidate & {
  final_amount_eur: number | null;
  date_from: string;
  date_to: string;
};

export async function requestCommission(requestId: number): Promise<CommissionOutcome> {
  const { data: req } = await supabaseAdmin
    .from("car_requests")
    .select(
      "id, outcome, commission_eur, commission_paid_at, commission_session_id, quoted_by_partner_id, final_amount_eur, date_from, date_to",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (!req || !shouldRequestCommission(req as RequestRow)) return { status: "skipped" };
  const row = req as RequestRow;

  // Verrou optimiste AVANT l'appel Stripe : `commission_requested_at` passe de
  // NULL a maintenant, et seul l'appel qui remporte l'update continue. Sans lui,
  // deux clics sur « louée » creeraient deux sessions et le loueur recevrait deux
  // demandes pour la meme location.
  const { data: locked } = await supabaseAdmin
    .from("car_requests")
    .update({ commission_requested_at: new Date().toISOString() })
    .eq("id", requestId)
    .is("commission_requested_at", null)
    .select();
  if (!locked || locked.length === 0) return { status: "already_requested" };

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("id, name, email")
    .eq("id", row.quoted_by_partner_id)
    .maybeSingle();

  const releaseLock = async () => {
    await supabaseAdmin
      .from("car_requests")
      .update({ commission_requested_at: null })
      .eq("id", requestId)
      .select();
  };

  if (!partner?.email) {
    console.error("[car/commission] loueur sans email, facturation impossible", {
      requestId,
      partnerId: row.quoted_by_partner_id,
    });
    await releaseLock();
    return { status: "failed", code: "partner_without_email" };
  }

  const mailBase = {
    requestId: row.id,
    partnerName: partner.name ?? "",
    commissionEur: row.commission_eur as number,
    finalAmountEur: Number(row.final_amount_eur) || 0,
    dateFrom: row.date_from,
    dateTo: row.date_to,
  };

  let session: { id: string; url: string | null };
  try {
    session = await stripeClient().checkout.sessions.create(
      buildCommissionCheckoutParams({ ...mailBase, partnerEmail: partner.email }),
    );
  } catch (err) {
    const failure = classifyStripeFailure(err);
    console.error("[car/commission] session de commission refusee", {
      requestId,
      partnerId: partner.id,
      failure: failure.code,
      ...stripeLogFields(err),
    });
    // Le verrou est relache : sans cela la location resterait facturable a vie
    // sans que personne ne puisse relancer.
    await releaseLock();
    return { status: "failed", code: failure.code };
  }

  await supabaseAdmin
    .from("car_requests")
    .update({ commission_session_id: session.id })
    .eq("id", requestId)
    .select();

  await sendPartnerCommissionRequest(partner.email, {
    ...mailBase,
    payUrl: session.url ?? "",
  });

  return { status: "requested", sessionId: session.id, url: session.url };
}
