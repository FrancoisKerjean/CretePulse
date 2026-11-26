// Acompte en ligne (interrupteur CAR_CATALOGUE_ENABLED) : accès base du choix
// d'une offre, du paiement, de la confirmation du loueur et du remboursement.
// Le calcul pur vit dans car-deposit.ts et car-catalogue.ts, les textes des
// e-mails dans car-deposit-mail.ts.
//
// Choisir une offre ne met PERSONNE en relation : on fige l'offre et l'acompte
// sur la demande, puis le client paie sur /car-booking/{jeton}. Les coordonnées
// ne s'échangent qu'à la confirmation du loueur.
//
// Chaque transition après paiement est une PRISE DE MAIN : une écriture
// conditionnée à l'état de départ, qui ne touche qu'une ligne. Le perdant d'une
// course (« Confirm » contre le cron, webhook rejoué) écrit 0 ligne, relit, et
// ne refait ni remboursement ni e-mail. Tout ce qui suit une prise de main
// gagnée est au mieux : un échec prévient ops, il ne défait jamais l'état.
import { createHmac } from "crypto";
import type Stripe from "stripe";
import { supabaseAdmin } from "./supabase-admin";
import { newToken, hashToken, siteBase } from "./car-quote";
import { assertWritten, creditInvoice, type InvoiceRow } from "./car-invoice-server";
import { secretOk } from "./car-admin-auth";
import { depositEur, takesDeposits } from "./car-catalogue";
import {
  isDepositBookable, bookingDeadlineMs, shouldSuspendPartner, clientCancelNowEur, SUSPEND_WINDOW_DAYS, DEPOSIT_SWEEP_AGE_MS,
  type RefundReason,
} from "./car-deposit";
import { depositMail, type DepositMailData, type DepositMailKind } from "./car-deposit-mail";
import { quotedModelLabel, type QuoteOption } from "./car-quotes";
import { carPickupLabel, carTypeLabelWithExamples } from "./car-lead";
import { CAR_TYPES_DATA } from "./car-types-data";
import { stripeClient } from "./stays/stripe-helpers";
import { stripeLogFields } from "./stripe-errors";
import { notifyOps } from "./ops-notify";
import { pickCarBookingLocale } from "@/app/[locale]/car-booking/content";
import { formatAthensDeadline } from "./car-format";

const GEARBOX_LABEL: Record<string, string> = { automatic: "Automatic", manual: "Manual" };

/**
 * Colonnes de la réservation précédente. Un client remboursé (refus ou silence
 * du loueur) peut choisir une autre offre et repayer : rien de l'ancienne
 * réservation ne doit survivre sur la nouvelle, ni échéance, ni jeton loueur,
 * ni motif de remboursement. Même remise à zéro pour l'ancien parcours (mise en
 * relation) après un remboursement : sans elle, la demande garde un acompte
 * remboursé, échappe à la relance d'issue et à la commission du loueur.
 */
export const PREVIOUS_BOOKING_RESET = {
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

/** Loueur vu de l'acompte : son taux, son nom, et ce qui le rend réservable. */
export interface DepositPartner {
  id: number;
  name: string | null;
  commission: number | string | null;
  active: boolean;
  lead_routing: string;
  terms_version: string | null;
  terms_accepted_at: string | null;
  rates_status: string | null;
}

const DEPOSIT_PARTNER_COLS = "id, name, commission, active, lead_routing, terms_version, terms_accepted_at, rates_status";

/** Lit le loueur d'une offre. Lève quand la base refuse : jamais d'acompte ni de mise en relation sur une lecture ratée. */
export async function depositPartner(partnerId: number): Promise<DepositPartner | null> {
  const { data, error } = await supabaseAdmin
    .from("car_partners")
    .select(DEPOSIT_PARTNER_COLS)
    .eq("id", partnerId)
    .maybeSingle();
  if (error) throw new Error(`loueur ${partnerId} illisible: ${error.message}`);
  return (data as DepositPartner | null) ?? null;
}

/**
 * Loueurs présents sur une page d'offres : taux d'acompte (« {acompte}
 * aujourd'hui ») et ce qui dit si leur offre se réserve par acompte. Lecture
 * refusée : carte vide, la page montre les offres sans montant et le serveur
 * tranche au choix.
 */
export async function depositPartnersFor(partnerIds: number[]): Promise<Map<number, DepositPartner>> {
  const ids = [...new Set(partnerIds)];
  const out = new Map<number, DepositPartner>();
  if (ids.length === 0) return out;
  const { data, error } = await supabaseAdmin.from("car_partners").select(DEPOSIT_PARTNER_COLS).in("id", ids);
  if (error) {
    console.error("[car-deposit] loueurs de la page d'offres illisibles:", error.message);
    return out;
  }
  for (const p of (data ?? []) as DepositPartner[]) out.set(p.id, p);
  return out;
}

export type StartDepositResult =
  | { payUrl: string }
  | { error: "too_close" | "below_minimum" | "in_progress" | "not_quotable" | "partner_unavailable" | "booked" };

/** Réservation déjà payée : la page d'offres a une vue pour chacun de ces états. */
const BOOKED = new Set(["awaiting_partner", "confirmed", "cancelled_kept"]);

/**
 * Le client choisit une offre : copie figée de l'option, acompte calculé au
 * taux de commission du loueur, jeton de paiement neuf. `status` ne change
 * pas : la demande reste `quoted` jusqu'au paiement (webhook).
 *
 * Démarrage possible depuis `booking_status` vide ou `refunded`. Un paiement
 * ouvert rend `in_progress`. Une réservation déjà payée (attente du loueur,
 * confirmée, acompte gardé) rend `booked` : la page d'offres se recharge et
 * affiche cet état réel. Une demande dont l'acompte a été gardé est close et
 * doit rester facturable. La demande doit être `quoted` (sinon
 * `not_quotable`) : c'est la seule que la route de paiement acceptera.
 *
 * Paiement ouvert : rapproché d'abord avec Stripe (reconcilePendingDeposit),
 * comme la route de paiement. Une session finie sans paiement dont le webhook
 * s'est perdu ne bloque plus la page d'offres ; un paiement dont le webhook
 * s'est perdu est enregistré, et rend `booked`.
 *
 * Le loueur est relu : inactif, sans les conditions 2027, en relais ou
 * suspendu (grille `paused`), l'offre n'est pas réservable (`partner_unavailable`).
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
    .select("id, status, booking_status, booking_session_id, date_from, time_from")
    .eq("id", requestId)
    .maybeSingle();
  if (readError) throw new Error(`startDeposit(${requestId}) lecture refusée par la base: ${readError.message}`);
  if (!row) throw new Error(`startDeposit(${requestId}) demande introuvable`);

  let previous = (row.booking_status as string | null) ?? null;
  if (previous === "pending_payment" && row.booking_session_id) {
    const pending = await reconcilePendingDeposit(requestId, row.booking_session_id as string, nowMs);
    if (pending.state === "released") previous = null;
    // Paiement perdu puis enregistré ici (onDepositPaid) : la demande attend le loueur.
    else if (pending.state === "paid") previous = "awaiting_partner";
  }
  if (previous !== null && BOOKED.has(previous)) return { error: "booked" };
  if (previous !== null && previous !== "refunded") return { error: "in_progress" };
  if (row.status !== "quoted") return { error: "not_quotable" };
  if (!isDepositBookable(nowMs, row.date_from as string, row.time_from as string | null)) {
    return { error: "too_close" };
  }

  // Loueur absent : on lève plutôt que d'inventer un taux, le client verra une
  // erreur et pourra réessayer.
  const partner = await depositPartner(option.partner_id);
  if (!partner) throw new Error(`startDeposit(${requestId}) loueur ${option.partner_id} illisible`);
  if (!takesDeposits(partner) || partner.rates_status === "paused") return { error: "partner_unavailable" };
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
  const update = supabaseAdmin.from("car_requests").update(patch).eq("id", requestId).eq("status", "quoted");
  const guarded = previous === null ? update.is("booking_status", null) : update.eq("booking_status", "refunded");
  const { data: written, error } = await guarded.select("id");
  assertWritten("startDeposit", requestId, error);
  if (!written || written.length === 0) return { error: "in_progress" };

  return { payUrl: `${siteBase()}/${locale}/car-booking/${token}` };
}

/**
 * Session de paiement expirée sans paiement : la demande redevient payable.
 * Appelée par le webhook `checkout.session.expired` et par le rapprochement
 * (reconcilePendingDeposit) quand Stripe dit la session finie. Conditionnée à la session ET à
 * l'état : une autre session, ou un paiement déjà enregistré, ne bouge pas.
 * Rend true quand la demande a été libérée.
 */
export async function onDepositSessionExpired(requestId: number, sessionId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("car_requests")
    .update({ booking_status: null, booking_session_id: null, booking_locked_at: null })
    .eq("id", requestId)
    .eq("booking_status", "pending_payment")
    .eq("booking_session_id", sessionId)
    .select("id");
  assertWritten("onDepositSessionExpired", requestId, error);
  return (data?.length ?? 0) === 1;
}

/**
 * Verrou pending_payment resté SANS session au-delà de 35 min : la route de
 * paiement est morte entre la pose du verrou et l'écriture de la session. Le
 * client n'a jamais reçu d'URL de paiement, aucun argent n'a pu être pris. La
 * demande revient à l'état d'avant le verrou (booking_status vide), comme une
 * session expirée.
 *
 * Prise de main conditionnée (pending_payment, aucune session, verrou daté et
 * assez vieux) : seul l'appel qui écrit la ligne prévient ops, une seule fois.
 * Un verrou sans date (posé avant la migration 20261127) n'est jamais touché.
 * Lève quand la base refuse.
 */
export async function releaseStaleLock(requestId: number, nowMs: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("car_requests")
    .update({ booking_status: null, booking_locked_at: null })
    .eq("id", requestId)
    .eq("booking_status", "pending_payment")
    .is("booking_session_id", null)
    .lt("booking_locked_at", new Date(nowMs - DEPOSIT_SWEEP_AGE_MS).toISOString())
    .select("id");
  assertWritten("releaseStaleLock", requestId, error);
  if ((data?.length ?? 0) !== 1) return false;
  await notifyOps({
    title: "Acompte voiture : verrou de paiement sans session, libéré",
    lines: [
      `demande ${requestId}`,
      "verrou pending_payment sans session Stripe depuis plus de 35 minutes : la route de paiement s'est arrêtée entre les deux",
      "aucun argent pris (aucune URL de paiement donnée) ; la demande est de nouveau payable",
    ],
    action: "rien à faire ; si l'alerte revient, regarder les journaux de la route de paiement",
    url: adminUrl(),
  });
  return true;
}

// ── Après paiement ──────────────────────────────────────────────────────────

/** Colonnes relues par chaque prise de main : état, montants et de quoi écrire les e-mails. */
const BOOKING_COLS =
  "id, locale, booking_status, booking_session_id, booking_payment_intent_id, deposit_option_id, deposit_eur, quoted_price, quoted_car_model, quoted_insurance_type, quoted_excess_eur, quoted_zero_excess_upsell_eur_day, quoted_by_partner_id, partner_name, pickup_slug, car_type, date_from, time_from, date_to, time_to, confirm_deadline_at, partner_confirmed_at, refund_reason, cancelled_at, client_token, customer_name, customer_email, customer_phone";

interface BookingRow {
  id: number;
  locale: string | null;
  booking_status: string | null;
  booking_session_id: string | null;
  booking_payment_intent_id: string | null;
  deposit_option_id: number | null;
  deposit_eur: number | string | null;
  quoted_price: number | string | null;
  quoted_car_model: string | null;
  quoted_insurance_type: string | null;
  quoted_excess_eur: number | null;
  quoted_zero_excess_upsell_eur_day: number | null;
  quoted_by_partner_id: number | null;
  partner_name: string | null;
  pickup_slug: string | null;
  car_type: string | null;
  date_from: string;
  time_from: string | null;
  date_to: string;
  time_to: string | null;
  confirm_deadline_at: string | null;
  partner_confirmed_at: string | null;
  refund_reason: string | null;
  cancelled_at: string | null;
  client_token: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
}

interface PartnerContact {
  name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_line: string | null;
  postal_code: string | null;
  city: string | null;
}

/** Un paiement de cette session déjà traité : un rejeu n'a plus rien à faire. */
const RECORDED = new Set(["awaiting_partner", "confirmed", "refunded", "cancelled_kept"]);
/** Manquements du loueur : consignés sur son invitation, comptés pour la suspension. */
const PARTNER_FAULTS = new Set<RefundReason>(["partner_declined", "partner_timeout", "partner_cancelled"]);

const DAY_MS = 86_400_000;
const adminUrl = () => `${siteBase()}/admin/car-rental`;
const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function partnerContact(partnerId: number | null): Promise<PartnerContact | null> {
  if (partnerId == null) return null;
  const { data, error } = await supabaseAdmin
    .from("car_partners")
    .select("name, email, phone, whatsapp, address_line, postal_code, city")
    .eq("id", partnerId)
    .maybeSingle();
  if (error) {
    console.error("[car-deposit] loueur illisible", { partnerId, error: error.message });
    return null;
  }
  return (data as PartnerContact | null) ?? null;
}

/**
 * Page d'offres du client : il y choisit une autre offre après un
 * remboursement, et y suit ou annule sa réservation en cours (R43). Null sur
 * les anciennes demandes sans jeton client.
 */
const offersUrlOf = (row: BookingRow, locale: string): string | null =>
  row.client_token ? `${siteBase()}/${locale}/car-offer/${row.client_token}` : null;

function mailData(row: BookingRow, locale: string, extra: Partial<DepositMailData> = {}): DepositMailData {
  const ct = CAR_TYPES_DATA.find((c) => c.id === row.car_type);
  return {
    partnerName: row.partner_name ?? "",
    carLabel: row.quoted_car_model || carTypeLabelWithExamples(ct, locale, row.car_type ?? ""),
    pickupLabel: row.pickup_slug ? carPickupLabel(row.pickup_slug) : "",
    dateFrom: row.date_from,
    timeFrom: row.time_from,
    dateTo: row.date_to,
    timeTo: row.time_to,
    totalEur: Number(row.quoted_price),
    depositEur: Number(row.deposit_eur),
    deadlineIso: row.confirm_deadline_at,
    insurance: {
      type: row.quoted_insurance_type,
      excessEur: row.quoted_excess_eur,
      upsellPerDay: row.quoted_zero_excess_upsell_eur_day,
    },
    ...extra,
  };
}

/**
 * Envoie un e-mail de l'acompte. Rend une ligne pour ops en cas d'échec, null
 * sinon. Le module e-mail est chargé à l'envoi : il construit son client Resend
 * à l'import, ce que les lecteurs de ce module (page d'offres, route de
 * paiement) n'ont pas à payer.
 */
async function sendMail(
  kind: DepositMailKind,
  to: string | null | undefined,
  data: DepositMailData,
  locale: string,
  who: string,
): Promise<string | null> {
  if (!to) return `e-mail ${kind} au ${who} non parti : adresse absente`;
  // Appelé après une prise de main gagnée : une panne de rendu ou d'envoi est
  // une ligne pour ops, jamais une exception qui ferait rejouer le webhook.
  try {
    const { sendCarDepositMail } = await import("./email");
    return (await sendCarDepositMail(to, depositMail(kind, data, locale))) ? null : `e-mail ${kind} au ${who} refusé par Resend`;
  } catch (err) {
    return `e-mail ${kind} au ${who} non parti : ${errText(err)}`;
  }
}

/** Invitation de l'option payée (une option appartient à une invitation). */
async function chosenInviteId(optionId: number | null): Promise<number | null> {
  if (optionId == null) return null;
  const { data, error } = await supabaseAdmin
    .from("car_quote_options")
    .select("invite_id")
    .eq("id", optionId)
    .maybeSingle();
  if (error) throw new Error(`option ${optionId} illisible: ${error.message}`);
  return (data?.invite_id as number | undefined) ?? null;
}

/**
 * Jeton du lien « Confirm » du loueur, DÉRIVÉ de la demande et du paiement par
 * HMAC du secret d'admin : ops peut reconstruire le lien à tout moment
 * (e-mail perdu, rappel du cron) sans que le clair soit stocké. La base ne
 * garde que hashToken(jeton). Bumper le label v1 révoque tous les liens.
 */
function partnerConfirmToken(requestId: number, paymentIntentId: string): string {
  const secret = process.env.CAR_ADMIN_SECRET;
  if (!secretOk(secret)) throw new Error("CAR_ADMIN_SECRET absent ou trop court : lien loueur impossible");
  return createHmac("sha256", secret).update(`car-confirm-v1:${requestId}:${paymentIntentId}`).digest("base64url");
}

/** Lien « Confirm » du loueur, reconstructible depuis la demande et son paiement. */
export function partnerConfirmUrl(requestId: number, paymentIntentId: string): string {
  return `${siteBase()}/en/car-confirm/${partnerConfirmToken(requestId, paymentIntentId)}`;
}

async function bookingStatusOf(requestId: number): Promise<{ booking_status: string | null; booking_session_id: string | null } | null> {
  const { data, error } = await supabaseAdmin
    .from("car_requests")
    .select("booking_status, booking_session_id")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(`car_requests(${requestId}) relecture refusée par la base: ${error.message}`);
  return (data as { booking_status: string | null; booking_session_id: string | null } | null) ?? null;
}

/**
 * Paiement de l'acompte reçu (webhook `checkout.session.completed`). Prise de
 * main pending_payment → awaiting_partner sur CETTE session : un rejeu du même
 * paiement rend « recorded » sans renvoyer d'e-mail. Un paiement sur une
 * session qui n'est pas celle de la demande (onglet périmé, second paiement)
 * est remboursé et signalé à ops, sans rien écraser.
 *
 * L'échéance part de `sessionCreatedMs` (création de la session, en ms) et
 * non de l'heure de traitement : un rejeu tardif ne la repousse pas. Elle est
 * plafonnée à la prise moins 2 h (bookingDeadlineMs).
 *
 * Lève quand la base refuse : le webhook supprime alors l'événement du
 * registre et rend 500, et Stripe rejoue.
 */
export async function onDepositPaid(
  requestId: number,
  sessionId: string,
  paymentIntentId: string,
  sessionCreatedMs: number,
  nowMs: number,
): Promise<"recorded" | "session_mismatch"> {
  const paidAt = new Date(nowMs).toISOString();
  // Dérivé AVANT toute écriture : sans secret, rien n'est pris en main et
  // Stripe rejoue, plutôt qu'un paiement enregistré sans lien loueur.
  const token = partnerConfirmToken(requestId, paymentIntentId);
  // Prise du véhicule, pour plafonner l'échéance. Demande introuvable : la
  // prise de main ci-dessous n'écrira rien (session étrangère).
  const { data: pickup, error: pickupError } = await supabaseAdmin
    .from("car_requests")
    .select("date_from, time_from")
    .eq("id", requestId)
    .maybeSingle();
  if (pickupError) throw new Error(`onDepositPaid(${requestId}) lecture refusée par la base: ${pickupError.message}`);
  const deadlineMs = bookingDeadlineMs(
    sessionCreatedMs,
    (pickup as { date_from?: string } | null)?.date_from,
    (pickup as { time_from?: string | null } | null)?.time_from,
  );
  const { data: claimed, error } = await supabaseAdmin
    .from("car_requests")
    .update({
      booking_status: "awaiting_partner",
      booking_locked_at: null,
      booking_paid_at: paidAt,
      booking_payment_intent_id: paymentIntentId,
      confirm_deadline_at: new Date(deadlineMs).toISOString(),
      // Seul le hash va en base ; le clair ne vit que dans le lien de l'e-mail.
      partner_confirm_token: hashToken(token),
      status: "accepted",
      accepted_at: paidAt,
    })
    .eq("id", requestId)
    .eq("booking_session_id", sessionId)
    .eq("booking_status", "pending_payment")
    .select(BOOKING_COLS);
  assertWritten("onDepositPaid", requestId, error);
  const row = (claimed as BookingRow[] | null)?.[0];

  if (!row) {
    const current = await bookingStatusOf(requestId);
    if (current?.booking_session_id === sessionId) {
      if (RECORDED.has(current.booking_status ?? "")) return "recorded";
      // Même session, toujours payable : une autre livraison est en train de
      // l'écrire. On ne tranche rien, Stripe rejouera.
      throw new Error(`onDepositPaid(${requestId}) session ${sessionId} en état ${current.booking_status}, rien tranché`);
    }
    await stripeClient().refunds.create(
      { payment_intent: paymentIntentId },
      { idempotencyKey: `car-deposit-mismatch-${paymentIntentId}` },
    );
    await notifyOps({
      title: "Acompte voiture : paiement sur une session qui n'est plus celle de la demande, remboursé",
      lines: [
        `demande ${requestId}`,
        `session payée ${sessionId}, paiement ${paymentIntentId}`,
        `demande : ${current ? `${current.booking_status ?? "sans réservation"}, session ${current.booking_session_id ?? "aucune"}` : "introuvable"}`,
      ],
      action: "vérifier dans Stripe que le remboursement est parti ; rien d'autre n'a été modifié",
      url: adminUrl(),
    });
    return "session_mismatch";
  }

  const failures: string[] = [];
  try {
    const inviteId = await chosenInviteId(row.deposit_option_id);
    if (inviteId == null) throw new Error(`option ${row.deposit_option_id} introuvable`);
    const chosen = await supabaseAdmin.from("car_quote_invites").update({ status: "chosen" }).eq("id", inviteId).select("id");
    assertWritten("onDepositPaid:chosen", inviteId, chosen.error);
    const others = await supabaseAdmin
      .from("car_quote_invites")
      .update({ status: "not_chosen" })
      .eq("request_id", requestId)
      .eq("status", "quoted")
      .neq("id", inviteId)
      .select("id");
    assertWritten("onDepositPaid:not_chosen", requestId, others.error);
  } catch (err) {
    failures.push(`invitations non mises à jour : ${errText(err)}`);
  }

  const locale = pickCarBookingLocale(row.locale ?? "en");
  const confirmUrl = partnerConfirmUrl(requestId, paymentIntentId);
  const partner = await partnerContact(row.quoted_by_partner_id);
  const clientFail = await sendMail("client_pending", row.customer_email, mailData(row, locale, {
    manageUrl: offersUrlOf(row, locale),
  }), locale, "client");
  if (clientFail) failures.push(clientFail);
  const partnerFail = await sendMail("partner_request", partner?.email, mailData(row, "en", { confirmUrl }), "en", "loueur");
  if (partnerFail) {
    // Ops transmet le lien (reconstructible via partnerConfirmUrl).
    failures.push(partnerFail, `lien de confirmation à transmettre au loueur : ${confirmUrl}`);
  }

  const name = row.partner_name ?? "le loueur";
  await notifyOps({
    title: `Acompte voiture payé : ${name} doit confirmer avant ${formatAthensDeadline(row.confirm_deadline_at ?? paidAt, "fr")}`,
    lines: [
      `demande ${requestId}`,
      `acompte ${Number(row.deposit_eur)} €, total ${Number(row.quoted_price)} €`,
      `prise le ${row.date_from}${row.pickup_slug ? `, ${carPickupLabel(row.pickup_slug)}` : ""}`,
      ...failures,
    ],
    action: "sans confirmation à l'approche de l'échéance, appeler le loueur ; l'admin peut confirmer en son nom",
    url: adminUrl(),
  });
  return "recorded";
}

export type PendingDepositOutcome =
  /** Session encore payable : rien fait, l'URL permet de reprendre le paiement. */
  | { state: "open"; url: string | null }
  /** Paiement dont le webhook s'est perdu : enregistré par onDepositPaid. */
  | { state: "paid" }
  /** Session finie sans paiement : la demande redevient payable. */
  | { state: "released" }
  /** Rien à trancher : webhook encore en route, ou état déjà changé. */
  | { state: "unchanged" }
  /** Stripe illisible ou refuse de fermer la session : rien écrit. */
  | { state: "unreadable" };

/**
 * Rapprochement d'une demande en pending_payment avec sa session Stripe, quand
 * un webhook (completed ou expired) a pu se perdre. Seul chemin commun au cron
 * des échéances, au choix d'une offre et à la route de paiement.
 *
 * - payée (complete + paid) depuis plus de 35 min : onDepositPaid, le même
 *   chemin idempotent que le webhook ; plus jeune, le webhook est en route ;
 * - expirée, ou encore « open » au-delà de expires_at (fermée chez Stripe
 *   d'abord, pour qu'aucun paiement n'y passe après) : onDepositSessionExpired ;
 * - Stripe illisible : rien écrit.
 *
 * Lève quand la base refuse (onDepositPaid, onDepositSessionExpired).
 */
export async function reconcilePendingDeposit(
  requestId: number,
  sessionId: string,
  nowMs: number,
): Promise<PendingDepositOutcome> {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripeClient().checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("[car-deposit] rapprochement : session illisible", { requestId, sessionId, ...stripeLogFields(err) });
    return { state: "unreadable" };
  }

  if (session.status === "complete") {
    if (session.payment_status !== "paid") return { state: "unchanged" };
    if (nowMs - session.created * 1000 < DEPOSIT_SWEEP_AGE_MS) return { state: "unchanged" };
    const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!pi) {
      console.error("[car-deposit] rapprochement : session payée sans payment_intent", { requestId, sessionId });
      return { state: "unreadable" };
    }
    await onDepositPaid(requestId, sessionId, pi, session.created * 1000, nowMs);
    return { state: "paid" };
  }

  const pastExpiry = session.expires_at != null && nowMs >= session.expires_at * 1000;
  if (session.status === "open") {
    if (!pastExpiry) return { state: "open", url: session.url ?? null };
    try {
      await stripeClient().checkout.sessions.expire(sessionId);
    } catch (err) {
      // Refus typique : la session vient d'être payée. Le webhook ou le passage suivant tranchera.
      console.error("[car-deposit] rapprochement : session échue non fermée", { requestId, sessionId, ...stripeLogFields(err) });
      return { state: "unreadable" };
    }
  } else if (session.status !== "expired") {
    return { state: "unchanged" };
  }
  return (await onDepositSessionExpired(requestId, sessionId)) ? { state: "released" } : { state: "unchanged" };
}

/** Âge du verrou au-delà duquel une session illisible n'est plus un incident passager (~4 passages du cron). */
const UNREADABLE_ALERT_AGE_MS = 60 * 60_000;

/**
 * Session de paiement que Stripe refuse de lire de façon durable. Le cron
 * l'appelle à chaque passage où le rapprochement rend « illisible ».
 *
 * Le compteur de passages ratés est l'âge du verrou (booking_locked_at) : une
 * session lisible est tranchée par le rapprochement dès 35 min, une demande
 * encore en attente après 1 h a donc vu environ 4 passages ratés. Prise de
 * main : booking_locked_at remis à null sous condition (même session, verrou
 * de plus d'une heure) ; seul l'appel qui écrit la ligne prévient ops, une
 * seule fois. Rien d'autre ne bouge : le rapprochement continue à chaque
 * passage et tranchera dès que Stripe répond. Un verrou sans date (d'avant la
 * migration 20261127) ne sonne jamais.
 *
 * Lève quand la base refuse.
 */
// SHORTCUT: l'âge du verrou tient lieu de compteur de passages ratés (la migration n'ajoute qu'une colonne), une session lisible puis illisible au-delà d'1 h sonne au 1er échec ; passer à un vrai compteur si une alerte part sur une session qui n'a raté qu'un passage.
export async function alertUnreadableDeposit(requestId: number, sessionId: string, nowMs: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("car_requests")
    .update({ booking_locked_at: null })
    .eq("id", requestId)
    .eq("booking_status", "pending_payment")
    .eq("booking_session_id", sessionId)
    .lt("booking_locked_at", new Date(nowMs - UNREADABLE_ALERT_AGE_MS).toISOString())
    .select("id");
  assertWritten("alertUnreadableDeposit", requestId, error);
  if ((data?.length ?? 0) !== 1) return false;
  await notifyOps({
    title: "Acompte voiture : Stripe ne lit plus la session de paiement depuis plus d'une heure",
    lines: [
      `demande ${requestId}, session ${sessionId}`,
      "la demande reste en pending_payment : ni enregistrée comme payée, ni libérée",
      "le cron retente à chaque passage ; cette alerte ne reviendra pas pour cette session",
    ],
    action: "ouvrir la session dans le tableau de bord Stripe : payée sans réservation, ou expirée, la demande attend Stripe",
    url: adminUrl(),
  });
  return true;
}

/**
 * Le loueur (ou ops depuis l'admin) confirme. Prise de main awaiting_partner →
 * confirmed, acceptée même après l'échéance tant que le cron n'est pas passé :
 * rien n'a encore été dit au client. C'est le SEUL moment où chacun reçoit les
 * coordonnées de l'autre, et seulement pour l'appel qui a gagné.
 */
export async function confirmBooking(
  requestId: number,
  by: "partner" | "admin",
): Promise<"confirmed" | "already_confirmed" | "not_awaiting"> {
  const { data: claimed, error } = await supabaseAdmin
    .from("car_requests")
    .update({ booking_status: "confirmed", partner_confirmed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("booking_status", "awaiting_partner")
    .select(BOOKING_COLS);
  assertWritten("confirmBooking", requestId, error);
  const row = (claimed as BookingRow[] | null)?.[0];
  if (!row) {
    const current = await bookingStatusOf(requestId);
    return current?.booking_status === "confirmed" ? "already_confirmed" : "not_awaiting";
  }

  const failures: string[] = [];
  const locale = pickCarBookingLocale(row.locale ?? "en");
  const partner = await partnerContact(row.quoted_by_partner_id);
  if (!partner) {
    failures.push("loueur illisible : aucune mise en relation envoyée, à faire à la main");
  } else {
    const address = [partner.address_line, [partner.postal_code, partner.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    const { formatPhoneWithCountryCode } = await import("./email");
    const clientFail = await sendMail("client_confirmed", row.customer_email, mailData(row, locale, {
      manageUrl: offersUrlOf(row, locale),
      partnerContact: {
        name: partner.name ?? row.partner_name ?? "",
        phone: partner.phone,
        whatsapp: partner.whatsapp,
        email: partner.email,
        address: address || null,
      },
    }), locale, "client");
    if (clientFail) failures.push(clientFail);
    const partnerFail = await sendMail("partner_confirmed", partner.email, mailData(row, "en", {
      customer: {
        name: row.customer_name ?? "",
        phone: formatPhoneWithCountryCode(row.customer_phone, row.locale ?? "en"),
        email: row.customer_email ?? "",
      },
    }), "en", "loueur");
    if (partnerFail) failures.push(partnerFail);
  }

  await notifyOps({
    title: `Réservation voiture confirmée : ${row.partner_name ?? "loueur"}`,
    lines: [`demande ${requestId}`, by === "admin" ? "confirmée depuis l'admin" : "confirmée par le loueur", ...failures],
    ...(failures.length ? { action: "mettre client et loueur en relation à la main", url: adminUrl() } : {}),
    silent: failures.length === 0,
  });
  return "confirmed";
}

type RefundFrom = "awaiting_partner" | "confirmed";

/**
 * Clé d'idempotence d'un remboursement : une par prise de main. L'instant de la
 * prise (cancelled_at) en fait partie : une prise suivante ne rejoue pas, chez
 * Stripe, l'erreur mise en cache 24 h sur la précédente. La reprise
 * (resumeClaimedRefund) reconstruit la même clé depuis cancelled_at.
 */
const refundKey = (from: RefundFrom, requestId: number, pi: string, claimMs: number) =>
  `${from === "confirmed" ? "car-deposit-refund-confirmed" : "car-deposit-refund"}-${requestId}-${pi}-${claimMs}`;

/** Remboursement déjà fait sur ce paiement (réponse perdue, ou fait à la main), hors échecs. */
async function existingRefundId(pi: string): Promise<string | null> {
  const list = await stripeClient().refunds.list({ payment_intent: pi, limit: 10 });
  return list.data.find((r) => r.status !== "failed" && r.status !== "canceled")?.id ?? null;
}

/**
 * La création a échoué ET la liste est illisible : Stripe ne dit pas si le
 * remboursement est parti (réponse perdue). `cause` est l'erreur de création.
 */
class RefundUnknownError extends Error {
  constructor(readonly cause: unknown, listError: unknown) {
    super(`${errText(cause)} ; remboursements illisibles : ${errText(listError)}`);
  }
}

/**
 * Identifiant du remboursement de `pi`, créé si besoin. Avant de conclure à
 * l'échec, on regarde chez Stripe : un remboursement parti malgré une réponse
 * perdue, ou fait à la main comme l'alerte le demande, existe déjà. L'ignorer
 * remettrait en attente (donc confirmable) une réservation remboursée. Lève
 * quand aucun remboursement n'existe (erreur de création), ou
 * RefundUnknownError quand la liste aussi est illisible.
 */
async function refundOnce(pi: string | null, key: string, listFirst: boolean): Promise<string> {
  if (!pi) throw new Error("aucun payment_intent enregistré sur la demande");
  if (listFirst) {
    const existing = await existingRefundId(pi);
    if (existing) return existing;
  }
  try {
    return (await stripeClient().refunds.create({ payment_intent: pi }, { idempotencyKey: key })).id;
  } catch (err) {
    let existing: string | null;
    try {
      existing = await existingRefundId(pi);
    } catch (listErr) {
      throw new RefundUnknownError(err, listErr);
    }
    if (existing) return existing;
    throw err;
  }
}

/**
 * Rembourse un acompte depuis `from` : prise de main `from` → refunded (motif et
 * cancelled_at) AVANT tout appel Stripe, pour qu'une confirmation concurrente
 * ne puisse plus gagner. Aucun remboursement chez Stripe (liste lue) : retour à
 * `from` et ops prévenu. Stripe muet (création et liste en échec) : la ligne
 * reste refunded sans refund_id, jamais de retour à un état confirmable ;
 * resumeClaimedRefund, qui liste d'abord, la règle au passage suivant du cron.
 * Un crash entre la prise et l'inscription du remboursement laisse aussi
 * refunded sans refund_id, repris de la même façon.
 */
async function claimRefund(
  from: RefundFrom,
  requestId: number,
  reason: RefundReason,
  nowMs: number,
): Promise<"refunded" | "not_claimed" | "refund_failed"> {
  const op = from === "confirmed" ? "refundConfirmed" : "releaseBooking";
  const claimIso = new Date(nowMs).toISOString();
  const { data: claimed, error } = await supabaseAdmin
    .from("car_requests")
    .update({ booking_status: "refunded", refund_reason: reason, cancelled_at: claimIso })
    .eq("id", requestId)
    .eq("booking_status", from)
    .select(BOOKING_COLS);
  assertWritten(op, requestId, error);
  const row = (claimed as BookingRow[] | null)?.[0];
  if (!row) return "not_claimed";

  const pi = row.booking_payment_intent_id;
  let refundId: string;
  try {
    refundId = await refundOnce(pi, refundKey(from, requestId, pi ?? "", Date.parse(claimIso)), false);
  } catch (err) {
    if (err instanceof RefundUnknownError) {
      console.error(`[car-deposit] ${op} : remboursement incertain`, { requestId, reason, ...stripeLogFields(err.cause) });
      await notifyOps({
        title: "Acompte voiture : remboursement peut-être parti, Stripe muet",
        lines: [
          `demande ${requestId}, motif ${reason}, paiement ${pi ?? "absent"}`,
          `Stripe : ${err.message}`,
          "demande laissée en refunded sans refund_id : plus confirmable ; la reprise automatique (cron, sous 15 à 30 minutes) regarde chez Stripe avant tout nouvel essai",
        ],
        action: "rien à écrire à la main ; si l'alerte revient, vérifier le paiement dans Stripe",
        url: adminUrl(),
      });
      return "refund_failed";
    }
    console.error(`[car-deposit] ${op} : remboursement refusé`, { requestId, reason, ...stripeLogFields(err) });
    let revertError: unknown = null;
    try {
      const { error: revErr } = await supabaseAdmin
        .from("car_requests")
        .update({ booking_status: from, refund_reason: null, cancelled_at: null })
        .eq("id", requestId)
        .eq("booking_status", "refunded")
        .is("refund_id", null)
        .select("id");
      assertWritten(`${op}:retour`, requestId, revErr);
    } catch (e) {
      revertError = e;
    }
    await notifyOps({
      title: "Acompte voiture : remboursement refusé par Stripe",
      lines: [
        `demande ${requestId}, motif ${reason}, paiement ${pi ?? "absent"}`,
        `Stripe : ${errText(err)}`,
        revertError
          ? `⚠️ demande restée en refunded SANS remboursement (${errText(revertError)}) : la reprise automatique retentera`
          : `demande remise en ${from}${
            reason === "client_cancelled"
              ? ", le client a reçu « réessayez dans quelques minutes », rien n'est annulé"
              : from === "awaiting_partner" ? ", le cron retentera" : ""
          }`,
      ],
      action: "si l'échec persiste, rembourser à la main dans Stripe : la tentative suivante le verra",
      url: adminUrl(),
    });
    if (revertError) throw revertError;
    return "refund_failed";
  }
  return finishRefund(row, from, reason, refundId, nowMs);
}

/**
 * Reprise d'un remboursement pris en main mais jamais inscrit (crash ou base
 * refusée entre la prise et refund_id) : booking_status refunded ET refund_id
 * nul. Le cron des échéances (tâche 10) balaie ces lignes au-delà de 15 min.
 * Regarde d'abord chez Stripe, puis rembourse avec la clé reconstruite, puis
 * fait les mêmes étapes que le remboursement d'origine. Échec : ops prévenu, la
 * ligne reste telle quelle (aucun retour arrière, l'argent est peut-être parti).
 */
const RESUME_MIN_AGE_MS = 15 * 60_000;

export async function resumeClaimedRefund(
  requestId: number,
  nowMs: number,
): Promise<"refunded" | "refund_failed" | "not_stuck"> {
  const { data, error } = await supabaseAdmin
    .from("car_requests")
    .select(BOOKING_COLS)
    .eq("id", requestId)
    .eq("booking_status", "refunded")
    .is("refund_id", null)
    // Une reprise ne traverse jamais une prise de main encore en vol.
    .lt("cancelled_at", new Date(nowMs - RESUME_MIN_AGE_MS).toISOString())
    .maybeSingle();
  if (error) throw new Error(`resumeClaimedRefund(${requestId}) lecture refusée par la base: ${error.message}`);
  const row = data as BookingRow | null;
  if (!row || !row.cancelled_at || !row.refund_reason) return "not_stuck";

  // Seule une réservation confirmée porte partner_confirmed_at (remis à null
  // par startDeposit au choix suivant) : c'est elle qui dit d'où venait la prise.
  const from: RefundFrom = row.partner_confirmed_at ? "confirmed" : "awaiting_partner";
  const reason = row.refund_reason as RefundReason;
  const pi = row.booking_payment_intent_id;
  let refundId: string;
  try {
    refundId = await refundOnce(pi, refundKey(from, requestId, pi ?? "", Date.parse(row.cancelled_at)), true);
  } catch (err) {
    console.error("[car-deposit] reprise : remboursement toujours pas fait", { requestId, reason, ...stripeLogFields(err) });
    await notifyOps({
      title: "Acompte voiture : remboursement pris en main mais toujours pas fait",
      lines: [
        `demande ${requestId}, motif ${reason}, paiement ${pi ?? "absent"}`,
        `Stripe : ${errText(err)}`,
        "la demande reste en refunded sans refund_id, la reprise retentera",
      ],
      action: "rembourser à la main dans Stripe si l'échec persiste : la reprise suivante le verra",
      url: adminUrl(),
    });
    return "refund_failed";
  }
  return finishRefund(row, from, reason, refundId, nowMs);
}

/**
 * Rappel au loueur à mi-délai. Prise de main d'abord : `confirm_reminded_at`
 * écrit sous condition (en attente, jamais rappelé, échéance pas passée), et
 * seul l'appel qui écrit 1 ligne envoie. Deux passages qui se chevauchent
 * n'envoient donc jamais deux rappels. Un échec d'envoi va à ops avec le lien,
 * sans nouvel essai : le rappel est marqué fait.
 */
export async function remindPartner(
  requestId: number,
  nowMs: number,
): Promise<"reminded" | "not_claimed" | "reminder_failed"> {
  const nowIso = new Date(nowMs).toISOString();
  const { data: claimed, error } = await supabaseAdmin
    .from("car_requests")
    .update({ confirm_reminded_at: nowIso })
    .eq("id", requestId)
    .eq("booking_status", "awaiting_partner")
    .is("confirm_reminded_at", null)
    .gt("confirm_deadline_at", nowIso)
    .select(BOOKING_COLS);
  assertWritten("remindPartner", requestId, error);
  const row = (claimed as BookingRow[] | null)?.[0];
  if (!row) return "not_claimed";

  let failure: string | null;
  let confirmUrl: string | null = null;
  try {
    if (!row.booking_payment_intent_id) throw new Error("aucun payment_intent enregistré sur la demande");
    confirmUrl = partnerConfirmUrl(requestId, row.booking_payment_intent_id);
    const partner = await partnerContact(row.quoted_by_partner_id);
    failure = await sendMail("partner_reminder", partner?.email, mailData(row, "en", { confirmUrl }), "en", "loueur");
  } catch (err) {
    failure = `rappel au loueur non parti : ${errText(err)}`;
  }
  if (!failure) return "reminded";
  await notifyOps({
    title: `Acompte voiture : rappel non parti chez ${row.partner_name ?? "le loueur"}`,
    lines: [
      `demande ${requestId}`,
      failure,
      ...(confirmUrl ? [`lien de confirmation à transmettre au loueur : ${confirmUrl}`] : []),
    ],
    action: "appeler le loueur avant l'échéance ; le rappel n'est pas retenté",
    url: adminUrl(),
  });
  return "reminder_failed";
}

/**
 * Tout ce qui suit un remboursement fait : inscription sur la demande, puis
 * invitations, avoir, e-mail, suspension et ops. L'inscription est conditionnée
 * à refund_id nul : deux reprises concurrentes n'envoient pas deux e-mails.
 * Refusée par la base : alerte et arrêt, la reprise finira (elle retrouvera le
 * remboursement chez Stripe, sans en créer un second).
 */
async function finishRefund(
  row: BookingRow,
  from: RefundFrom,
  reason: RefundReason,
  refundId: string,
  nowMs: number,
): Promise<"refunded"> {
  const op = from === "confirmed" ? "refundConfirmed" : "releaseBooking";
  const requestId = row.id;
  const nowIso = new Date(nowMs).toISOString();
  const { data: recorded, error: recErr } = await supabaseAdmin
    .from("car_requests")
    .update({
      refund_id: refundId,
      refund_amount_eur: Number(row.deposit_eur),
      // La demande redevient une demande à offres : le client peut en choisir
      // une autre et repayer. Le jeton de réservation reste, pour que son
      // lien affiche « remboursé » (startDeposit en pose un neuf au choix suivant).
      status: "quoted",
      accepted_at: null,
    })
    .eq("id", requestId)
    .eq("booking_status", "refunded")
    .is("refund_id", null)
    .select("id");
  if (recErr) {
    console.error(`[car-deposit] ${op} : remboursement fait mais non inscrit`, { requestId, refundId, error: recErr.message });
    await notifyOps({
      title: "Acompte voiture : remboursé chez Stripe mais non inscrit sur la demande",
      lines: [`demande ${requestId}, motif ${reason}`, `remboursement ${refundId}`, `base : ${recErr.message}`],
      action: "ne rien écrire à la main : la reprise automatique (cron, sous 15 minutes) finit tout, invitations, e-mail et avoir, sans second remboursement ; écrire refund_id à la main l'en empêcherait",
      url: adminUrl(),
    });
    return "refunded";
  }
  // 0 ligne : une reprise concurrente a déjà tout inscrit et tout envoyé.
  if (!recorded || recorded.length === 0) return "refunded";

  // L'argent est rendu et inscrit : tout ce qui suit est au mieux, un échec va à ops.
  const notes: string[] = [];
  const failures: string[] = [];
  try {
    const inviteId = await chosenInviteId(row.deposit_option_id);
    if (inviteId != null) {
      // Manquement du loueur : son offre est grisée et le manquement survit à
      // un nouveau choix du client. Sinon (ops, client) l'offre reste choisissable.
      const patch = PARTNER_FAULTS.has(reason)
        ? { status: "declined", deposit_failure_reason: reason, deposit_failed_at: nowIso }
        : { status: "quoted" };
      const { error: e } = await supabaseAdmin.from("car_quote_invites").update(patch).eq("id", inviteId).select("id");
      assertWritten(`${op}:invitation`, inviteId, e);
    }
    const { error: e2 } = await supabaseAdmin
      .from("car_quote_invites")
      .update({ status: "quoted" })
      .eq("request_id", requestId)
      .eq("status", "not_chosen")
      .select("id");
    assertWritten(`${op}:autres_invitations`, requestId, e2);
  } catch (err) {
    failures.push(`invitations non remises en offres : ${errText(err)}`);
  }

  if (from === "confirmed") {
    try {
      await creditAfterRefund(row, reason, notes, failures);
    } catch (err) {
      failures.push(`avoir non émis : ${errText(err)}`);
    }
  }

  // Annulation par le client : il reçoit la confirmation de SON annulation et
  // le loueur apprend que la voiture est libre. Sinon le client apprend le
  // remboursement et son motif. Jamais les deux (R44).
  if (reason === "client_cancelled") {
    failures.push(...(await sendClientCancelMails(row, Number(row.deposit_eur))));
  } else {
    const locale = pickCarBookingLocale(row.locale ?? "en");
    const clientFail = await sendMail("client_refunded", row.customer_email, mailData(row, locale, {
      refundReason: reason,
      offersUrl: offersUrlOf(row, locale),
    }), locale, "client");
    if (clientFail) failures.push(clientFail);
  }

  if (PARTNER_FAULTS.has(reason) && row.quoted_by_partner_id != null) {
    try {
      await suspendIfRepeated(row.quoted_by_partner_id, requestId, reason, nowMs);
    } catch (err) {
      failures.push(`règle de suspension non appliquée : ${errText(err)}`);
    }
  }

  await notifyOps({
    title: `Acompte voiture remboursé : ${row.partner_name ?? "loueur"} (${reason})`,
    lines: [`demande ${requestId}`, `remboursement ${refundId}, ${Number(row.deposit_eur)} €`, ...notes, ...failures],
    ...(failures.length ? { action: "reprendre à la main les points ci-dessus", url: adminUrl() } : {}),
    silent: failures.length === 0,
  });
  return "refunded";
}

/**
 * Avoir de la facture de commission, si elle est déjà émise (premier jour de
 * location). La facture d'un acompte est réglée par compensation, donc déjà
 * « payée » : on passe par creditInvoice directement, creditCommissionInvoice
 * refusant une facture payée. Ce qui s'est passé va dans `notes` (ops le lit),
 * ce qui reste à faire dans `failures`.
 */
async function creditAfterRefund(row: BookingRow, reason: RefundReason, notes: string[], failures: string[]): Promise<void> {
  // Lecture vérifiée (invoiceForRequest confond « aucune facture » et « lecture
  // refusée ») : une facture à avoir ne doit pas passer pour inexistante.
  const { data, error } = await supabaseAdmin
    .from("car_commission_invoices")
    .select("id, number, partner_id, amount_eur, credited_at")
    .eq("request_id", row.id)
    .maybeSingle();
  if (error) {
    failures.push(`facture de commission illisible (${error.message}) : vérifier s'il faut un avoir`);
    return;
  }
  const invoice = data as Pick<InvoiceRow, "id" | "number" | "partner_id" | "amount_eur" | "credited_at"> | null;
  if (!invoice) {
    notes.push("aucune facture de commission émise, rien à avoir");
    return;
  }
  if (invoice.credited_at) {
    notes.push(`facture ${invoice.number} déjà avoirée`);
    return;
  }
  const why = reason === "partner_cancelled"
    ? "booking cancelled by the rental agency, deposit refunded to the customer"
    : "booking cancelled, deposit refunded to the customer";
  const creditNumber = await creditInvoice(invoice.id, invoice.number, why);
  if (!creditNumber) {
    notes.push(`facture ${invoice.number} avoirée par un autre appel`);
    return;
  }
  const partner = await partnerContact(invoice.partner_id);
  if (!partner?.email) {
    failures.push(`avoir ${creditNumber} émis, loueur sans e-mail : le lui envoyer`);
    return;
  }
  const { sendCreditNote } = await import("./email");
  const sent = await sendCreditNote(partner.email, {
    creditNumber,
    number: invoice.number,
    partnerName: partner.name ?? "",
    amountEur: Number(invoice.amount_eur),
    reason: why,
  });
  if (sent) notes.push(`avoir ${creditNumber} émis et envoyé au loueur`);
  else failures.push(`avoir ${creditNumber} émis, e-mail refusé : le renvoyer`);
}

/**
 * Trois manquements en 30 jours (refus, silence, annulation après
 * confirmation), comptés sur les invitations : la grille passe `paused`.
 * Écriture conditionnée à « pas déjà paused » : une seule alerte par suspension.
 */
async function suspendIfRepeated(partnerId: number, requestId: number, reason: RefundReason, nowMs: number): Promise<void> {
  const since = new Date(nowMs - SUSPEND_WINDOW_DAYS * DAY_MS).toISOString();
  const { count, error } = await supabaseAdmin
    .from("car_quote_invites")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partnerId)
    .not("deposit_failure_reason", "is", null)
    .gte("deposit_failed_at", since);
  if (error) throw new Error(`manquements du loueur ${partnerId} illisibles: ${error.message}`);
  if (!shouldSuspendPartner(count ?? 0)) return;

  const { data, error: e } = await supabaseAdmin
    .from("car_partners")
    .update({ rates_status: "paused" })
    .eq("id", partnerId)
    .neq("rates_status", "paused")
    .select("id, name");
  assertWritten("suspendIfRepeated", partnerId, e);
  const paused = (data as Array<{ name: string | null }> | null)?.[0];
  if (!paused) return;
  await notifyOps({
    title: `Loueur suspendu : ${paused.name ?? `loueur ${partnerId}`}`,
    lines: [
      `${count} manquements en ${SUSPEND_WINDOW_DAYS} jours (refus, absence de réponse ou annulation après confirmation)`,
      `dernier : demande ${requestId}, motif ${reason}`,
      "sa grille est en pause : plus aucune offre de grille de sa part",
    ],
    action: "voir avec le loueur ; la suspension se lève depuis l'admin",
    url: adminUrl(),
  });
}

/**
 * Libère un acompte pas encore confirmé : refus du loueur, échéance dépassée
 * (cron), ops ou client. Rembourse intégralement, remet la demande en offres et
 * prévient le client avec le lien de ses autres offres (motif client_cancelled :
 * e-mails d'annulation au client et au loueur, voir finishRefund).
 */
export async function releaseBooking(
  requestId: number,
  reason: RefundReason,
  nowMs: number,
): Promise<"refunded" | "not_releasable" | "refund_failed"> {
  const out = await claimRefund("awaiting_partner", requestId, reason, nowMs);
  return out === "not_claimed" ? "not_releasable" : out;
}

/**
 * E-mails d'une annulation par le client : client_cancelled au client (montant
 * rendu, 0 quand l'acompte est gardé) et partner_client_cancelled au loueur,
 * en anglais et ⛔ sans aucune coordonnée du client (le loueur peut ne pas les
 * avoir encore). Rend les échecs pour ops.
 */
async function sendClientCancelMails(row: BookingRow, refundedEur: number): Promise<string[]> {
  const failures: string[] = [];
  const locale = pickCarBookingLocale(row.locale ?? "en");
  const clientFail = await sendMail("client_cancelled", row.customer_email, mailData(row, locale, {
    refundedEur,
    offersUrl: offersUrlOf(row, locale),
  }), locale, "client");
  if (clientFail) failures.push(clientFail);
  const partner = await partnerContact(row.quoted_by_partner_id);
  const partnerFail = await sendMail("partner_client_cancelled", partner?.email, mailData(row, "en"), "en", "loueur");
  if (partnerFail) failures.push(partnerFail, "prévenir le loueur que la voiture est libre");
  return failures;
}

/**
 * Annulation à moins de 48 h d'une réservation confirmée : prise de main
 * confirmed → cancelled_kept (avec cancelled_at), AUCUN appel Stripe.
 * L'acompte reste la commission : facture du premier jour comme une location
 * faite (tâche 12), invitations inchangées. Rend false quand la prise de main
 * est perdue.
 */
async function keepDeposit(requestId: number, nowMs: number): Promise<boolean> {
  const { data: claimed, error } = await supabaseAdmin
    .from("car_requests")
    .update({ booking_status: "cancelled_kept", cancelled_at: new Date(nowMs).toISOString() })
    .eq("id", requestId)
    .eq("booking_status", "confirmed")
    .select(BOOKING_COLS);
  assertWritten("cancelByClient:gardé", requestId, error);
  const row = (claimed as BookingRow[] | null)?.[0];
  if (!row) return false;

  const failures = await sendClientCancelMails(row, 0);
  await notifyOps({
    title: `Réservation voiture annulée par le client à moins de 48 h, acompte gardé : ${row.partner_name ?? "loueur"}`,
    lines: [
      `demande ${requestId}`,
      `acompte ${Number(row.deposit_eur)} € gardé, prise le ${row.date_from}`,
      "facture de commission au premier jour de location, comme une location faite",
      ...failures,
    ],
    ...(failures.length ? { action: "reprendre à la main les points ci-dessus", url: adminUrl() } : {}),
    silent: failures.length === 0,
  });
  return true;
}

export type CancelByClientResult =
  | { refundedEur: number; status: "refunded" | "cancelled_kept" }
  /** bookingStatus : état courant, pour dire au client « déjà remboursée » plutôt que « trop tard ». */
  | { error: "not_cancellable"; bookingStatus: string | null }
  /** Le résultat serait pire que celui affiché avant le clic : rien n'est fait, refundEur est le montant à jour. */
  | { error: "changed"; refundEur: number }
  | { error: "refund_failed" };

const cents = (eur: number) => Math.round(eur * 100);

/**
 * Le client annule (page de réservation ou page d'offres). En attente du
 * loueur, ou confirmée à 48 h ou plus de la prise : remboursement intégral par
 * la prise de main commune (motif client_cancelled). Confirmée à moins de
 * 48 h : acompte gardé. Prise du véhicule passée, ou aucun acompte en jeu :
 * not_cancellable.
 *
 * Prise de main conditionnée à l'état LU : perdue (le loueur confirme, le cron
 * libère), on relit et on réévalue UNE fois sur l'état frais (R46). Stripe
 * refuse : la prise de main est défaite, refund_failed, aucun e-mail. Stripe
 * muet : refund_failed aussi, mais l'annulation reste prise (claimRefund).
 *
 * `expectedRefundEur` : le montant affiché au client avant son clic. Si l'état
 * a changé depuis et que le résultat serait PIRE (page d'attente périmée, puis
 * confirmée à moins de 48 h), rien n'est fait, à chaque passage, AVANT toute
 * prise de main : `changed` avec le nouveau montant, le client reclique en
 * connaissance de cause (R49). Égal ou meilleur : on poursuit. Absent : pas de
 * contrôle.
 *
 * En attente avec une échéance déjà dépassée (cron pas encore passé) : c'est le
 * silence du loueur qui libère, motif partner_timeout, manquement compté.
 */
export async function cancelByClient(
  requestId: number,
  nowMs: number,
  expectedRefundEur?: number,
): Promise<CancelByClientResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabaseAdmin
      .from("car_requests")
      .select("booking_status, deposit_eur, date_from, time_from, confirm_deadline_at")
      .eq("id", requestId)
      .maybeSingle();
    if (error) throw new Error(`cancelByClient(${requestId}) lecture refusée par la base: ${error.message}`);
    const row = data as Pick<BookingRow, "booking_status" | "deposit_eur" | "date_from" | "time_from" | "confirm_deadline_at"> | null;
    if (!row) return { error: "not_cancellable", bookingStatus: null };
    const status = row.booking_status;
    const refundEur = clientCancelNowEur(status, Number(row.deposit_eur), row.date_from, row.time_from, nowMs);
    if (refundEur === null) return { error: "not_cancellable", bookingStatus: status };
    if (expectedRefundEur !== undefined && cents(refundEur) < cents(expectedRefundEur)) {
      return { error: "changed", refundEur };
    }

    if (refundEur > 0) {
      // Même règle que le cron des échéances (échéance strictement passée).
      const timedOut = status === "awaiting_partner"
        && row.confirm_deadline_at != null && Date.parse(row.confirm_deadline_at) < nowMs;
      const out = timedOut
        ? await releaseBooking(requestId, "partner_timeout", nowMs)
        : await claimRefund(status as RefundFrom, requestId, "client_cancelled", nowMs);
      if (out === "refunded") return { refundedEur: refundEur, status: "refunded" };
      if (out === "refund_failed") return { error: "refund_failed" };
    } else if (status !== "confirmed") {
      // Rien à rendre sans être confirmée : aucun acompte lisible, rien à garder.
      return { error: "not_cancellable", bookingStatus: status };
    } else if (await keepDeposit(requestId, nowMs)) {
      return { refundedEur: 0, status: "cancelled_kept" };
    }
  }
  // Deux prises de main perdues : l'état a encore bougé, on le relit pour le dire.
  const current = await bookingStatusOf(requestId);
  return { error: "not_cancellable", bookingStatus: current?.booking_status ?? null };
}

/**
 * Rembourse une réservation déjà confirmée : le loueur annule, ou n'a pas de
 * voiture au comptoir (ops). Avoir si la facture de commission existe déjà.
 */
export async function refundConfirmed(
  requestId: number,
  reason: "partner_cancelled" | "ops",
): Promise<"refunded" | "not_refundable" | "refund_failed"> {
  const out = await claimRefund("confirmed", requestId, reason, Date.now());
  return out === "not_claimed" ? "not_refundable" : out;
}

/** Colonnes de la page loueur : ⛔ aucune coordonnée du client. */
const CONFIRM_COLS =
  "id, booking_status, refund_reason, partner_name, quoted_car_model, car_type, pickup_slug, date_from, time_from, date_to, time_to, quoted_price, deposit_eur, quoted_insurance_type, quoted_excess_eur, quoted_zero_excess_upsell_eur_day, confirm_deadline_at";

export interface ConfirmBooking {
  id: number;
  booking_status: string | null;
  refund_reason: string | null;
  partner_name: string | null;
  quoted_car_model: string | null;
  car_type: string | null;
  pickup_slug: string | null;
  date_from: string;
  time_from: string | null;
  date_to: string;
  time_to: string | null;
  quoted_price: number | string | null;
  deposit_eur: number | string | null;
  quoted_insurance_type: string | null;
  quoted_excess_eur: number | null;
  quoted_zero_excess_upsell_eur_day: number | null;
  confirm_deadline_at: string | null;
}

/** Réservation désignée par le lien du loueur (jeton haché en base). Lève si la lecture est refusée. */
export async function bookingByConfirmToken(token: string): Promise<ConfirmBooking | null> {
  if (!token) return null;
  const { data, error } = await supabaseAdmin
    .from("car_requests")
    .select(CONFIRM_COLS)
    .eq("partner_confirm_token", hashToken(token))
    .maybeSingle();
  if (error) throw new Error(`bookingByConfirmToken lecture refusée par la base: ${error.message}`);
  return (data as ConfirmBooking | null) ?? null;
}
