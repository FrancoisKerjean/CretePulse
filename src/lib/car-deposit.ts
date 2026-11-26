import type Stripe from "stripe";
import { REFUND_WINDOW_HOURS } from "./booking-policy";
import { STRIPE_MIN_CHARGE_EUR } from "./car-commission";
import { siteBase } from "./car-quote";

export type DepositStatus =
  | "pending_payment"
  | "awaiting_partner"
  | "confirmed"
  | "refunded"
  | "cancelled_kept";

export type RefundReason =
  | "partner_declined"
  | "partner_timeout"
  | "client_cancelled"
  | "partner_cancelled"
  | "ops";

export const CONFIRM_OPEN_MINUTES = 240;
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 22;
export const PICKUP_MARGIN_MS = 2 * 3600_000;
export const SUSPEND_AFTER_FAILURES = 3;
export const SUSPEND_WINDOW_DAYS = 30;
/** 31 min et non 30 : 30 min est la borne basse de Stripe, la latence d'appel la ferait refuser. */
export const DEPOSIT_CHECKOUT_LIFETIME_S = 1860;
/**
 * Au-delà de cet âge (35 min), une session de paiement est finie chez Stripe :
 * sa durée de vie plus 4 min de marge. Le rapprochement ne double jamais un
 * webhook plus jeune que ça.
 */
export const DEPOSIT_SWEEP_AGE_MS = (DEPOSIT_CHECKOUT_LIFETIME_S + 240) * 1000;

const TZ = "Europe/Athens";

// Un seul formateur par processus : en construire un coûte cher.
const wallFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const offsetFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  timeZoneName: "longOffset",
});

interface Wall {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
}

function athensWall(ms: number): Wall {
  const p: Record<string, number> = {};
  for (const part of wallFmt.formatToParts(ms)) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  return { y: p.year, mo: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second };
}

/** Décalage d'Athènes en ms à cet instant (+2 h hiver, +3 h été). */
function athensOffsetMs(ms: number): number {
  const name = offsetFmt.formatToParts(ms).find((x) => x.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0)) * 60_000;
}

/** "YYYY-MM-DD" + "HH:mm" heure murale d'Athènes -> instant UTC en ms. */
export function athensWallToUtcMs(date: string, time: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  let utc = wallAsUtc - athensOffsetMs(wallAsUtc);
  // Relecture pour les heures voisines d'un changement d'heure.
  utc = wallAsUtc - athensOffsetMs(utc);
  return utc;
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (y: number, mo: number, d: number) => {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

/**
 * fromMs + `minutes` minutes comptées uniquement entre 08:00 et 22:00 (Athènes).
 * Les heures de fermeture sont sautées d'un bloc jusqu'à 08:00 pile.
 */
function addOpenMinutes(fromMs: number, minutes: number): number {
  let t = fromMs;
  let remaining = minutes * 60_000;
  for (let guard = 0; guard < 20 && remaining > 0; guard++) {
    const w = athensWall(t);
    const day = isoDate(w.y, w.mo, w.d);
    if (w.h < OPEN_HOUR) {
      t = athensWallToUtcMs(day, `${pad(OPEN_HOUR)}:00`);
    } else if (w.h >= CLOSE_HOUR) {
      t = athensWallToUtcMs(isoDate(w.y, w.mo, w.d + 1), `${pad(OPEN_HOUR)}:00`);
    } else {
      const untilClose = athensWallToUtcMs(day, `${pad(CLOSE_HOUR)}:00`) - t;
      const step = Math.min(remaining, untilClose);
      t += step;
      remaining -= step;
    }
  }
  return t;
}

/** Échéance de confirmation du loueur : 240 minutes ouvertes après le paiement. */
export function confirmDeadlineMs(paidAtMs: number): number {
  return addOpenMinutes(paidAtMs, CONFIRM_OPEN_MINUTES);
}

/**
 * Échéance d'un acompte payé : 240 minutes ouvertes depuis `startMs`, la
 * création de la session Stripe (un webhook rejoué des heures plus tard donne
 * la même échéance), plafonnée à la prise moins la marge de 2 h. Heure de
 * prise absente : 00:00, comme isDepositBookable.
 */
export function bookingDeadlineMs(
  startMs: number,
  dateFrom: string | null | undefined,
  timeFrom: string | null | undefined,
): number {
  const deadline = confirmDeadlineMs(startMs);
  if (!dateFrom) return deadline;
  return Math.min(deadline, athensWallToUtcMs(dateFrom, timeFrom || "00:00") - PICKUP_MARGIN_MS);
}

export function isBookableOnline(nowMs: number, pickupMs: number): boolean {
  return confirmDeadlineMs(nowMs) <= pickupMs - PICKUP_MARGIN_MS;
}

/**
 * Réservable en ligne avec acompte, vu de `nowMs` : on juge au pire moment du
 * paiement, la fin de vie de la session Stripe, pas à l'instant du clic. Une
 * heure de prise absente (anciennes demandes) vaut 00:00 : on refuse plutôt
 * que d'accepter trop tard. Une date absente n'est jamais réservable.
 * Seule règle de réservabilité : choix, paiement et pages l'appellent tous.
 */
export function isDepositBookable(
  nowMs: number,
  dateFrom: string | null | undefined,
  timeFrom: string | null | undefined,
): boolean {
  if (!dateFrom) return false;
  return isBookableOnline(
    nowMs + DEPOSIT_CHECKOUT_LIFETIME_S * 1000,
    athensWallToUtcMs(dateFrom, timeFrom || "00:00"),
  );
}

/**
 * Rappel au loueur à mi-délai en temps ouvert (pas en temps mural : un milieu
 * mural tomberait la nuit pour tout paiement entre 18:00 et 08:00).
 */
export function reminderDueMs(paidAtMs: number, deadlineMs: number): number {
  return Math.min(addOpenMinutes(paidAtMs, CONFIRM_OPEN_MINUTES / 2), deadlineMs);
}

export function clientCancelRefundEur(
  status: DepositStatus,
  depositEur: number,
  hoursUntilPickup: number,
): number {
  if (status === "awaiting_partner") return depositEur;
  if (status === "confirmed") return hoursUntilPickup >= REFUND_WINDOW_HOURS ? depositEur : 0;
  return 0;
}

/**
 * Ce que le client récupère s'il annule à `nowMs`, ou null quand il ne peut
 * plus annuler : aucun acompte en jeu (paiement ouvert, déjà remboursé, déjà
 * gardé) ou prise du véhicule passée. Heures comptées depuis l'heure murale de
 * prise à Athènes, 00:00 sans heure ; 48 h pile = remboursé. Seule règle de
 * l'annulation client : la route et les deux pages l'appellent.
 */
export function clientCancelNowEur(
  status: string | null,
  depositEur: number,
  dateFrom: string,
  timeFrom: string | null | undefined,
  nowMs: number,
): number | null {
  if (status !== "awaiting_partner" && status !== "confirmed") return null;
  const hours = (athensWallToUtcMs(dateFrom, timeFrom || "00:00") - nowMs) / 3_600_000;
  if (hours <= 0) return null;
  return clientCancelRefundEur(status, depositEur, hours);
}

export function shouldSuspendPartner(failuresInWindow: number): boolean {
  return failuresInWindow >= SUSPEND_AFTER_FAILURES;
}

/** Ce que voit le loueur sur sa page de confirmation. */
export type PartnerViewState = "awaiting" | "confirmed" | "declined" | "expired" | "cancelled" | "closed";

/**
 * État de la réservation vu du loueur, lu sur la demande : la page et la route
 * de confirmation disent toujours l'état réel, jamais celui que le clic visait.
 */
export function partnerViewState(bookingStatus: string | null, refundReason: string | null): PartnerViewState {
  if (bookingStatus === "awaiting_partner") return "awaiting";
  if (bookingStatus === "confirmed") return "confirmed";
  if (bookingStatus === "refunded") {
    if (refundReason === "partner_declined") return "declined";
    if (refundReason === "partner_timeout") return "expired";
    return "cancelled";
  }
  if (bookingStatus === "cancelled_kept") return "cancelled";
  return "closed";
}

export function buildDepositCheckoutParams(i: {
  requestId: number;
  customerEmail: string;
  depositEur: number;
  partnerName: string;
  carLabel: string;
  dateFrom: string;
  dateTo: string;
  bookingToken: string;
  locale: string;
  nowMs: number;
}): Stripe.Checkout.SessionCreateParams {
  if (!Number.isFinite(i.depositEur) || i.depositEur < STRIPE_MIN_CHARGE_EUR) {
    throw new Error(`Deposit ${i.depositEur} EUR is below the Stripe minimum`);
  }
  const base = siteBase();
  const metadata = {
    payment_type: "car_deposit",
    brand: "crete.direct",
    car_request_id: String(i.requestId),
  };
  return {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Deposit: ${i.carLabel} with ${i.partnerName}, ${i.dateFrom} to ${i.dateTo}`,
          },
          unit_amount: Math.round(i.depositEur * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      metadata,
      statement_descriptor_suffix: "CRETE DIRECT",
    },
    customer_email: i.customerEmail,
    metadata,
    expires_at: Math.floor(i.nowMs / 1000) + DEPOSIT_CHECKOUT_LIFETIME_S,
    success_url: `${base}/${i.locale}/car-booking/${i.bookingToken}?paid=1`,
    cancel_url: `${base}/${i.locale}/car-booking/${i.bookingToken}`,
  };
}
