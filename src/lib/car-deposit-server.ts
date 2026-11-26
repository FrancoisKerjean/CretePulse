// Acompte en ligne (interrupteur CAR_CATALOGUE_ENABLED) : accès base du choix
// d'une offre. Le calcul pur vit dans car-deposit.ts et car-catalogue.ts.
//
// Choisir une offre ne met PERSONNE en relation : on fige l'offre et l'acompte
// sur la demande, puis le client paie sur /car-booking/{jeton}. Les coordonnées
// ne s'échangent qu'à la confirmation du loueur.
import { supabaseAdmin } from "./supabase-admin";
import { newToken, hashToken, siteBase } from "./car-quote";
import { assertWritten } from "./car-invoice-server";
import { partnerById } from "./car-partners-db";
import { depositEur } from "./car-catalogue";
import { isDepositBookable } from "./car-deposit";
import { quotedModelLabel, type QuoteOption } from "./car-quotes";

const GEARBOX_LABEL: Record<string, string> = { automatic: "Automatic", manual: "Manual" };

/**
 * Colonnes de la réservation précédente. Un client remboursé (refus ou silence
 * du loueur) peut choisir une autre offre et repayer : rien de l'ancienne
 * réservation ne doit survivre sur la nouvelle, ni échéance, ni jeton loueur,
 * ni motif de remboursement.
 */
const PREVIOUS_BOOKING_RESET = {
  booking_payment_intent_id: null,
  booking_paid_at: null,
  confirm_deadline_at: null,
  confirm_reminded_at: null,
  partner_confirm_token: null,
  partner_confirmed_at: null,
  refund_reason: null,
  refund_id: null,
  refund_amount_eur: null,
  cancelled_at: null,
} as const;

/**
 * Taux d'acompte (commission) des loueurs présents sur une page d'offres, pour
 * afficher « {acompte} aujourd'hui ». Lecture refusée : carte vide, la page
 * montre les offres sans montant et le serveur recalcule au choix.
 */
export async function depositRatesFor(partnerIds: number[]): Promise<Map<number, number>> {
  const ids = [...new Set(partnerIds)];
  const rates = new Map<number, number>();
  if (ids.length === 0) return rates;
  const { data, error } = await supabaseAdmin.from("car_partners").select("id, commission").in("id", ids);
  if (error) {
    console.error("[car-deposit] taux des loueurs illisibles:", error.message);
    return rates;
  }
  for (const p of (data ?? []) as Array<{ id: number; commission: number | string | null }>) {
    if (p.commission != null) rates.set(p.id, Number(p.commission));
  }
  return rates;
}

export type StartDepositResult =
  | { payUrl: string }
  | { error: "too_close" | "below_minimum" | "in_progress" };

/**
 * Le client choisit une offre : copie figée de l'option, acompte calculé au
 * taux de commission du loueur, jeton de paiement neuf. `status` ne change
 * pas : la demande reste `quoted` jusqu'au paiement (webhook).
 *
 * Démarrage possible depuis `booking_status` vide ou `refunded`. Tout autre
 * état (paiement ouvert, attente du loueur, confirmée, acompte gardé) rend
 * `in_progress` : une demande dont l'acompte a été gardé est close et doit
 * rester facturable.
 *
 * `customerPhone` : numéro résolu par l'acceptation, écrit dans la même
 * écriture. Le loueur en a besoin à la confirmation.
 */
export async function startDeposit(
  requestId: number,
  option: QuoteOption,
  locale: string,
  nowMs: number,
  customerPhone?: string,
): Promise<StartDepositResult> {
  const { data: row, error: readError } = await supabaseAdmin
    .from("car_requests")
    .select("id, booking_status, date_from, time_from")
    .eq("id", requestId)
    .maybeSingle();
  if (readError) throw new Error(`startDeposit(${requestId}) lecture refusée par la base: ${readError.message}`);
  if (!row) throw new Error(`startDeposit(${requestId}) demande introuvable`);

  const previous = (row.booking_status as string | null) ?? null;
  if (previous !== null && previous !== "refunded") return { error: "in_progress" };
  if (!isDepositBookable(nowMs, row.date_from as string, row.time_from as string | null)) {
    return { error: "too_close" };
  }

  // partnerById rend null sur une erreur de lecture : on lève plutôt que
  // d'inventer un taux, le client verra une erreur et pourra réessayer.
  const partner = await partnerById(option.partner_id);
  if (!partner) throw new Error(`startDeposit(${requestId}) loueur ${option.partner_id} illisible`);
  const rate = Number(partner.commission);
  const deposit = depositEur(option.price, rate);
  if (deposit == null) return { error: "below_minimum" };

  const token = newToken();
  const patch = {
    ...(previous === "refunded" ? PREVIOUS_BOOKING_RESET : {}),
    quoted_price: option.price,
    quoted_currency: option.currency ?? "EUR",
    quoted_car_model: quotedModelLabel(option.car_model, option.gearbox ? GEARBOX_LABEL[option.gearbox] : null),
    quoted_inclusions: option.inclusions ?? [],
    quoted_insurance_type: option.insurance_type,
    quoted_excess_eur: option.excess_eur,
    quoted_zero_excess_upsell_eur_day: option.zero_excess_upsell_eur_day,
    quoted_by_partner_id: option.partner_id,
    partner_name: partner.name ?? option.partner_name,
    quoted_at: option.created_at,
    deposit_option_id: option.id,
    deposit_rate: rate,
    deposit_eur: deposit,
    booking_token_hash: hashToken(token),
    booking_status: null,
    // Aucune session ne peut être ouverte ici (pending_payment refusé plus
    // haut) : une ancienne référence ne doit pas répondre pour la nouvelle.
    booking_session_id: null,
    ...(customerPhone ? { customer_phone: customerPhone } : {}),
  };

  // Écriture conditionnée à l'état lu : si un paiement a démarré entre la
  // lecture et ici, 0 ligne, et on n'écrase rien.
  const update = supabaseAdmin.from("car_requests").update(patch).eq("id", requestId);
  const guarded = previous === null ? update.is("booking_status", null) : update.eq("booking_status", "refunded");
  const { data: written, error } = await guarded.select("id");
  assertWritten("startDeposit", requestId, error);
  if (!written || written.length === 0) return { error: "in_progress" };

  return { payUrl: `${siteBase()}/${locale}/car-booking/${token}` };
}
