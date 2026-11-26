// E-mails de l'acompte (spec 2026-11-25, sections 7, 8 et 11). Module pur : il
// rend le sujet et le corps HTML, `sendCarDepositMail` (email.ts) l'habille aux
// couleurs du site et l'envoie.
//
// Loueur : toujours en anglais. Client : dans la langue de sa demande, avec les
// textes de la page de réservation (car-booking/content.ts) pour que l'e-mail
// et la page disent la même chose, dans les mêmes mots.
//
// ⛔ Coordonnées : aucune du client dans un e-mail loueur avant la confirmation
// (partner_request, partner_reminder, partner_client_cancelled), aucune du
// loueur dans un e-mail client avant client_confirmed. Chaque gabarit ne lit
// que les champs auxquels il a droit.
//
// Textes relus par François avant tout envoi réel. Aucun tiret cadratin.
import {
  L, pickCarBookingLocale, fill, formatEur, formatAthensDeadline,
  type CarBookingLocale, type CarBookingStrings,
} from "@/app/[locale]/car-booking/content";
import { CAR_INSURANCE_HEADING, insuranceSummary } from "./car-inclusions";
import type { RefundReason } from "./car-deposit";

export const DEPOSIT_MAIL_KINDS = [
  "client_pending",
  "partner_request",
  "partner_reminder",
  "client_confirmed",
  "partner_confirmed",
  "client_refunded",
  "partner_client_cancelled",
  "client_cancelled",
] as const;
export type DepositMailKind = (typeof DEPOSIT_MAIL_KINDS)[number];

export interface DepositMailData {
  partnerName: string;
  /** Modèle figé de l'offre, ou à défaut la catégorie demandée. */
  carLabel: string;
  pickupLabel: string;
  dateFrom: string;
  timeFrom: string | null;
  dateTo: string;
  timeTo: string | null;
  totalEur: number;
  depositEur: number;
  /** Échéance de confirmation du loueur (ISO). */
  deadlineIso?: string | null;
  /** Lien « Confirm / Not available » du loueur (partner_request, partner_reminder). */
  confirmUrl?: string;
  /** Lien des autres offres du client (client_refunded, client_cancelled remboursé). Absent sur les anciennes demandes. */
  offersUrl?: string | null;
  /**
   * Même page d'offres, où le client suit et annule sa réservation (client_pending,
   * client_confirmed) : seul le hash du jeton de réservation est stocké, un
   * e-mail ne peut pas renvoyer vers /car-booking. Absent sur les anciennes demandes.
   */
  manageUrl?: string | null;
  refundReason?: RefundReason | null;
  /** client_cancelled : montant rendu, 0 quand l'acompte est gardé. */
  refundedEur?: number;
  insurance?: { type: string | null; excessEur: number | null; upsellPerDay: number | null };
  /** Lu par client_confirmed seulement. */
  partnerContact?: { name: string; phone: string | null; whatsapp: string | null; email: string | null; address: string | null };
  /** Lu par partner_confirmed seulement. */
  customer?: { name: string; phone: string | null; email: string };
}

export interface DepositMail {
  subject: string;
  html: string;
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const P = (s: string) => `<p style="margin:0 0 14px; color:#0B3954; font-size:14px; line-height:1.6;">${s}</p>`;
const MUTED = (s: string) => `<p style="margin:0 0 14px; color:#5C7886; font-size:13px; line-height:1.6;">${s}</p>`;
const BOX = (heading: string, lines: string[]) =>
  `<div style="background:#F6FBFC; border:1px solid #DCE9EE; border-radius:14px; padding:14px 16px; margin:0 0 18px;">` +
  `<p style="margin:0 0 6px; color:#94A3B8; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em;">${heading}</p>` +
  `<p style="margin:0; color:#0B3954; font-size:14px; line-height:1.7;">${lines.join("<br>")}</p></div>`;
const BUTTON = (href: string, label: string) =>
  `<p style="margin:0 0 18px;"><a href="${esc(href)}" style="display:inline-block; background:#008C9E; color:#ffffff; padding:13px 30px; border-radius:999px; text-decoration:none; font-weight:700; font-size:14px;">${esc(label)}</a></p>`;

/** Heure murale « HH:MM » (Postgres rend parfois « HH:MM:SS »). */
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");
const at = (date: string, time: string | null, word: string) => (time ? `${date} ${word} ${hhmm(time)}` : date);
const rest = (d: DepositMailData) => Math.round((d.totalEur - d.depositEur) * 100) / 100;

// ── Côté client (en, fr, de, el) ────────────────────────────────────────────

const CLIENT: Record<CarBookingLocale, {
  booking: string; pickup: string; dropoff: string; at: string; colon: string; amountRefunded: string; manage: string;
}> = {
  en: { booking: "Your booking", pickup: "Pick-up", dropoff: "Return", at: "at", colon: ": ", amountRefunded: "Amount refunded: {amount}", manage: "Manage my booking" },
  fr: { booking: "Votre réservation", pickup: "Prise du véhicule", dropoff: "Retour", at: "à", colon: " : ", amountRefunded: "Montant remboursé : {amount}", manage: "Gérer ma réservation" },
  de: { booking: "Ihre Buchung", pickup: "Abholung", dropoff: "Rückgabe", at: "um", colon: ": ", amountRefunded: "Erstatteter Betrag: {amount}", manage: "Buchung verwalten" },
  el: { booking: "Η κράτησή σας", pickup: "Παραλαβή", dropoff: "Επιστροφή", at: "στις", colon: ": ", amountRefunded: "Ποσό επιστροφής: {amount}", manage: "Διαχείριση κράτησης" },
};

const REASON: Record<RefundReason, keyof CarBookingStrings> = {
  partner_declined: "reasonPartnerDeclined",
  partner_timeout: "reasonPartnerTimeout",
  client_cancelled: "reasonClientCancelled",
  partner_cancelled: "reasonPartnerCancelled",
  ops: "reasonOps",
};

function clientBooking(d: DepositMailData, lang: CarBookingLocale, withAmounts: boolean): string {
  const t = L[lang];
  const c = CLIENT[lang];
  const lines = [
    `<strong>${esc(d.carLabel)}</strong>`,
    esc(d.partnerName),
    `${c.pickup}${c.colon}${esc(d.pickupLabel)}, ${esc(at(d.dateFrom, d.timeFrom, c.at))}`,
    `${c.dropoff}${c.colon}${esc(at(d.dateTo, d.timeTo, c.at))}`,
  ];
  if (withAmounts) {
    lines.push(
      "",
      `${t.totalLabel}${c.colon}<strong>${formatEur(d.totalEur, lang)}</strong>`,
      `${t.depositPaidLabel}${c.colon}<strong>${formatEur(d.depositEur, lang)}</strong>`,
      `${t.restLabel}${c.colon}<strong>${formatEur(rest(d), lang)}</strong>`,
    );
  }
  return BOX(c.booking, lines);
}

function clientInsurance(d: DepositMailData, lang: CarBookingLocale): string {
  if (!d.insurance) return "";
  const lines = insuranceSummary(d.insurance.type, d.insurance.excessEur, d.insurance.upsellPerDay, lang);
  return lines.length ? BOX(CAR_INSURANCE_HEADING[lang] ?? CAR_INSURANCE_HEADING.en, lines.map(esc)) : "";
}

function clientMail(kind: DepositMailKind, d: DepositMailData, lang: CarBookingLocale): DepositMail {
  const t = L[lang];
  const c = CLIENT[lang];
  const partner = esc(d.partnerName);
  switch (kind) {
    case "client_pending":
      return {
        subject: t.awaitingTitle,
        html:
          P(d.deadlineIso
            ? fill(t.awaitingBody, { partner, deadline: formatAthensDeadline(d.deadlineIso, lang) })
            : t.depositConfirmRule) +
          clientBooking(d, lang, true) +
          clientInsurance(d, lang) +
          MUTED(t.depositCancelRule) +
          (d.manageUrl ? BUTTON(d.manageUrl, c.manage) : ""),
      };
    case "client_confirmed": {
      const p = d.partnerContact;
      const contact = p
        ? [
            `<strong>${esc(p.name)}</strong>`,
            ...(p.phone ? [`<a href="tel:${esc(p.phone.replace(/[^\d+]/g, ""))}" style="color:#0B3954;">${esc(p.phone)}</a>`] : []),
            ...(p.whatsapp && p.whatsapp !== p.phone ? [`WhatsApp ${esc(p.whatsapp)}`] : []),
            ...(p.email ? [`<a href="mailto:${esc(p.email)}" style="color:#0B3954;">${esc(p.email)}</a>`] : []),
            ...(p.address ? [esc(p.address)] : []),
          ]
        : [];
      return {
        subject: t.confirmedTitle,
        html:
          P(fill(t.confirmedBody, { partner: p ? esc(p.name) : partner })) +
          (contact.length ? BOX(t.contactHeading, contact) : "") +
          clientBooking(d, lang, true) +
          clientInsurance(d, lang) +
          MUTED(t.depositCancelRule) +
          (d.manageUrl ? BUTTON(d.manageUrl, c.manage) : ""),
      };
    }
    case "client_refunded": {
      const reasonKey = d.refundReason ? REASON[d.refundReason] : null;
      return {
        subject: t.refundedTitle,
        html:
          (reasonKey ? P(t[reasonKey]) : "") +
          P(t.refundedBody) +
          P(fill(c.amountRefunded, { amount: formatEur(d.depositEur, lang) })) +
          clientBooking(d, lang, false) +
          (d.offersUrl ? BUTTON(d.offersUrl, t.otherOffers) : ""),
      };
    }
    case "client_cancelled": {
      const refunded = d.refundedEur ?? 0;
      return {
        subject: t.keptTitle,
        html:
          (refunded > 0
            ? P(t.refundedBody) + P(fill(c.amountRefunded, { amount: formatEur(refunded, lang) }))
            : P(t.keptBody)) +
          clientBooking(d, lang, false) +
          // Remboursé, la demande redevient une demande à offres ; gardé, elle reste close.
          (refunded > 0 && d.offersUrl ? BUTTON(d.offersUrl, t.otherOffers) : ""),
      };
    }
    default:
      throw new Error(`depositMail: ${kind} n'est pas un e-mail client`);
  }
}

// ── Côté loueur (anglais) ───────────────────────────────────────────────────

const SIGN = MUTED("Kami · crete.direct");

function partnerBooking(d: DepositMailData, withMoney: boolean): string {
  const lines = [
    `Pick-up: ${esc(d.pickupLabel)}, ${esc(at(d.dateFrom, d.timeFrom, "at"))}`,
    `Return: ${esc(at(d.dateTo, d.timeTo, "at"))}`,
    `Car: ${esc(d.carLabel)}`,
  ];
  const ins = d.insurance ? insuranceSummary(d.insurance.type, d.insurance.excessEur, d.insurance.upsellPerDay, "en") : [];
  if (ins.length) lines.push(`Insurance: ${esc(ins.join(" · "))}`);
  if (withMoney) {
    lines.push(
      "",
      `Total price: <strong>${formatEur(d.totalEur, "en")}</strong>`,
      `Deposit paid online, kept by crete.direct as its commission: <strong>${formatEur(d.depositEur, "en")}</strong>`,
      `To collect at the counter: <strong>${formatEur(rest(d), "en")}</strong>`,
    );
  }
  return BOX("Booking", lines);
}

const deadlineEn = (d: DepositMailData) => (d.deadlineIso ? formatAthensDeadline(d.deadlineIso, "en") : "");
/** Pour les sujets : texte brut, jamais échappé (un sujet n'est pas du HTML). */
const when = (d: DepositMailData) => `${d.pickupLabel} ${d.dateFrom} to ${d.dateTo}`;

function partnerMail(kind: DepositMailKind, d: DepositMailData): DepositMail {
  const hi = P(`Hi ${esc(d.partnerName)},`);
  switch (kind) {
    case "partner_request":
      return {
        subject: `New booking to confirm · ${when(d)}`,
        html:
          hi +
          P("A customer booked your offer on crete.direct and paid the deposit online. Please confirm that the car is available.") +
          partnerBooking(d, true) +
          P(`<strong>Please answer before ${deadlineEn(d)} (Greek time).</strong> Without an answer by then, the booking is released and the customer is refunded.`) +
          (d.confirmUrl ? BUTTON(d.confirmUrl, "Confirm or decline") : "") +
          MUTED("You receive the customer's name and phone number as soon as you confirm.") +
          SIGN,
      };
    case "partner_reminder":
      return {
        subject: `Reminder: booking waiting for your answer · ${when(d)}`,
        html:
          hi +
          P(`This booking is still waiting for your answer. <strong>Please confirm or decline before ${deadlineEn(d)} (Greek time)</strong>, otherwise it is released and the customer is refunded.`) +
          partnerBooking(d, true) +
          (d.confirmUrl ? BUTTON(d.confirmUrl, "Confirm or decline") : "") +
          SIGN,
      };
    case "partner_confirmed": {
      const cu = d.customer;
      const customer = cu
        ? [
            `<strong>${esc(cu.name)}</strong>`,
            `Phone / WhatsApp: ${esc(cu.phone ?? "-")}`,
            `Email: <a href="mailto:${esc(cu.email)}" style="color:#0B3954;">${esc(cu.email)}</a>`,
          ]
        : [];
      return {
        subject: `Booking confirmed · ${when(d)}`,
        html:
          hi +
          P("Thank you for confirming. Here are the customer's details, so you can agree on the meeting point and any practical detail.") +
          (customer.length ? BOX("Customer", customer) : "") +
          partnerBooking(d, true) +
          SIGN,
      };
    }
    case "partner_client_cancelled":
      return {
        subject: `Booking cancelled by the customer · ${when(d)}`,
        html:
          hi +
          P("The customer cancelled this booking. The car is free again, there is nothing to do on your side.") +
          partnerBooking(d, false) +
          SIGN,
      };
    default:
      throw new Error(`depositMail: ${kind} n'est pas un e-mail loueur`);
  }
}

/**
 * Sujet et corps d'un e-mail de l'acompte. `locale` est celle de la demande :
 * elle ne sert qu'aux e-mails client, les e-mails loueur sont en anglais.
 */
export function depositMail(kind: DepositMailKind, data: DepositMailData, locale: string): DepositMail {
  return kind.startsWith("partner_") ? partnerMail(kind, data) : clientMail(kind, data, pickCarBookingLocale(locale));
}
