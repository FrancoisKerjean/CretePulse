// Suivi d'issue après la fin de location. PUR, zéro I/O, node-safe (importé
// par scripts/check-car-admin.mjs) : calendrier des trois emails et de
// l'escalade, décision au clic du loueur, état de la page, textes d'email,
// libellés du back-office. Les lectures et écritures vivent dans
// car-outcome-followup-server.ts et car-outcome-server.ts.
//
// ⛔ N'importer ici NI car-invoice NI car-commission : leurs imports sans
// extension cassent `node --experimental-strip-types` (check:car-admin).
import type { OutcomeSource } from "./car-admin.ts";

export const DAY_MS = 86_400_000;
/** Délai avant l'email 2 (après l'email 1) et avant l'email 3 (après l'email 2) : J+1, J+4, J+8. */
export const FOLLOWUP_DELAYS_MS: Record<1 | 2, number> = { 1: 3 * DAY_MS, 2: 4 * DAY_MS };
export const FOLLOWUP_MAX = 3;
/** Jours après date_to au bout desquels l'issue inconnue remonte aux ops. */
export const ESCALATION_DAYS = 10;

/** `iso` au format YYYY-MM-DD, décalé de `days` jours civils, sans fuseau. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** JJ/MM depuis YYYY-MM-DD, le format des emails loueur et des lignes ops. */
export const ddmm = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** « Marie Dupont » devient « Marie D. » : le loueur reconnaît le voyageur, l'email n'expose pas son nom complet. */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// ── Calendrier ──────────────────────────────────────────────────────────────

export interface FollowupRow {
  date_to: string;
  outcome_followup_count?: number | null;
  outcome_followup_sent_at?: string | null;
  outcome_followup_escalated_at?: string | null;
}

export type FollowupStep = "none" | "send" | "escalate" | "remind";

/**
 * Étape du jour pour une ligne dont l'issue est inconnue ou seulement
 * présumée. `today` est la date civile d'Athènes (YYYY-MM-DD), `nowMs`
 * l'instant courant : les délais entre emails se comptent à la seconde
 * depuis l'envoi précédent, l'escalade se compte en jours civils depuis
 * date_to. `date_to < today` strictement : le jour de la restitution, on
 * n'écrit pas encore.
 */
export function outcomeFollowupStep(row: FollowupRow, today: string, nowMs: number): FollowupStep {
  if (!(row.date_to < today)) return "none";
  if (row.outcome_followup_escalated_at) return "remind";
  const count = row.outcome_followup_count ?? 0;
  if (count === 0) return "send";
  if (count === 1 || count === 2) {
    const sentMs = row.outcome_followup_sent_at ? new Date(row.outcome_followup_sent_at).getTime() : 0;
    return sentMs + FOLLOWUP_DELAYS_MS[count] <= nowMs ? "send" : "none";
  }
  return addDays(row.date_to, ESCALATION_DAYS) <= today ? "escalate" : "none";
}

// ── Décision au clic ────────────────────────────────────────────────────────

export type OutcomeChoice = "rented" | "lost";
export const OUTCOME_CHOICES: readonly OutcomeChoice[] = ["rented", "lost"];

export interface ClickRow {
  status: string;
  outcome: string | null;
  outcome_source: string | null;
  hasInvoice: boolean;
  invoicePaid: boolean;
  invoiceCredited: boolean;
}

export type ClickDecision =
  /** Demande sortie du flux par l'admin : aucune écriture. */
  | { kind: "cancelled" }
  /** Issue à poser, sous verrou optimiste. */
  | { kind: "apply"; outcome: OutcomeChoice; expect: "outcome_null" | "source_auto" }
  /** Présomption du cron confirmée : seule la source change. */
  | { kind: "confirm" }
  /** Présomption facturée, contredite : avoir automatique. */
  | { kind: "credit" }
  /** Facture déjà réglée : aucun avoir, remboursement manuel. */
  | { kind: "already_paid" }
  /** Issue déjà posée par une source non auto : le lien n'a plus de pouvoir. */
  | { kind: "recorded"; contested: boolean };

/** Tableau 3.4 de la spec, case par case. */
export function outcomeClickDecision(row: ClickRow, choice: OutcomeChoice): ClickDecision {
  if (row.status === "cancelled") return { kind: "cancelled" };
  if (row.outcome == null) return { kind: "apply", outcome: choice, expect: "outcome_null" };
  if (row.outcome === "rented" && row.outcome_source === "auto") {
    if (choice === "rented") return { kind: "confirm" };
    if (row.hasInvoice && row.invoicePaid) return { kind: "already_paid" };
    if (row.hasInvoice && !row.invoiceCredited) return { kind: "credit" };
    // Bascule au J1 mais facturation refusée (fiche incomplète, Resend) : pas
    // de facture à annuler, l'issue devient simplement « perdue ».
    return { kind: "apply", outcome: "lost", expect: "source_auto" };
  }
  return { kind: "recorded", contested: row.outcome !== choice };
}

// ── État de la page ─────────────────────────────────────────────────────────

export type OutcomePageState =
  | { kind: "form" }
  | { kind: "cancelled" }
  | { kind: "done"; choice: OutcomeChoice }
  | { kind: "already_paid" }
  | { kind: "recorded"; outcome: string; at: string | null; contested: boolean };

/**
 * Ce que la page montre. `result` est le `?result=` posé par la redirection
 * 303 de l'endpoint (null à la première visite). La page relit la base, donc
 * après un POST l'issue affichée est celle réellement écrite.
 */
export function outcomePageState(row: ClickRow & { outcome_at: string | null }, result: string | null): OutcomePageState {
  if (row.status === "cancelled") return { kind: "cancelled" };
  if (result === "already_paid") return { kind: "already_paid" };
  if (result === "applied" || result === "confirmed" || result === "credited") {
    return { kind: "done", choice: row.outcome === "lost" ? "lost" : "rented" };
  }
  const presumed = row.outcome === "rented" && row.outcome_source === "auto";
  if (row.outcome == null || presumed) return { kind: "form" };
  return { kind: "recorded", outcome: row.outcome, at: row.outcome_at, contested: result === "contested" };
}

// ── Email de question au loueur ─────────────────────────────────────────────

export interface OutcomeQuestionMail {
  requestId: number;
  partnerName: string;
  dateFrom: string;
  dateTo: string;
  pickupLabel: string;
  carModel: string | null;
  customerName: string;
  priceEur: number;
  /** URL de la page, SANS `?choice=` : le corps ajoute les deux variantes. */
  outcomeUrl: string;
  attempt: 1 | 2 | 3;
  /** Population B : facture déjà émise au J1. */
  invoice: { number: string; amountEur: number } | null;
  /** Population A : ce qui sera facturé si la location a eu lieu. null si taux inconnu. */
  expected: { ratePercent: string; amountEur: number } | null;
}

export function outcomeQuestionSubject(m: OutcomeQuestionMail): string {
  const base = `crete.direct · did rental ${m.requestId} take place? One click`;
  if (m.attempt === 2) return `Reminder: ${base}`;
  if (m.attempt === 3) return `Last reminder: ${base}`;
  return base;
}

export function outcomeQuestionBody(m: OutcomeQuestionMail): string {
  const first = m.partnerName.split(" ")[0] || m.partnerName;
  const lines = [
    `Hi ${first},`,
    ``,
    `Rental ${m.requestId} · ${ddmm(m.dateFrom)} to ${ddmm(m.dateTo)} · ${m.pickupLabel}${m.carModel ? ` · ${m.carModel}` : ""}`,
    `Traveller: ${shortName(m.customerName)} · Price accepted: ${m.priceEur.toFixed(2)} EUR`,
    ``,
    `Did this rental take place?`,
    ``,
    `  Yes, it took place:      ${m.outcomeUrl}?choice=rented`,
    `  No, it did not happen:   ${m.outcomeUrl}?choice=lost`,
    ``,
  ];
  if (m.invoice) {
    lines.push(
      `Invoice ${m.invoice.number} (${m.invoice.amountEur.toFixed(2)} EUR) was issued on the first day of the rental.`,
      `If it did not take place, the second link cancels it by credit note, nothing to pay.`,
      ``,
    );
  } else if (m.expected) {
    lines.push(
      `If it took place, the ${m.expected.ratePercent}% commission invoice (${m.expected.amountEur.toFixed(2)} EUR) follows automatically.`,
      ``,
    );
  }
  if (m.attempt === 3) {
    lines.push(`Without an answer by ${ddmm(addDays(m.dateTo, ESCALATION_DAYS))} we will call you.`, ``);
  }
  lines.push(`Kami`, `crete.direct`);
  return lines.join("\n");
}

// ── Libellés du back-office ─────────────────────────────────────────────────

const SOURCE_LABEL: Record<OutcomeSource, { rented: string; lost: string }> = {
  auto: { rented: "présumée J1", lost: "auto" },
  partner_link: { rented: "confirmée loueur", lost: "loueur" },
  admin: { rented: "admin", lost: "admin" },
};

/** Badge d'issue : une présomption et un fait confirmé ne se lisent plus pareil. */
export function outcomeBadgeLabel(outcome: string | null | undefined, source: string | null | undefined): string | null {
  if (!outcome) return null;
  if (outcome !== "rented" && outcome !== "lost") return outcome;
  const head = outcome === "rented" ? "louée" : "perdue";
  const suffix = source && source in SOURCE_LABEL ? SOURCE_LABEL[source as OutcomeSource][outcome] : null;
  return suffix ? `${head} · ${suffix}` : head;
}

const adminDay = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Athens" });

/** Ligne d'état de la relance sous le badge, null tant que rien n'est parti. */
export function followupStatusLine(row: FollowupRow): string | null {
  if (row.outcome_followup_escalated_at) {
    return `question d'issue : escaladée le ${adminDay(row.outcome_followup_escalated_at)}`;
  }
  const count = row.outcome_followup_count ?? 0;
  if (count === 0) return null;
  const last = row.outcome_followup_sent_at ? `, dernière le ${adminDay(row.outcome_followup_sent_at)}` : "";
  return `question d'issue : ${count}/${FOLLOWUP_MAX} envoyée${count > 1 ? "s" : ""}${last}`;
}
