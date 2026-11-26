// Logique PURE du cockpit de monitoring /admin/car-rental (pattern car-admin.ts /
// car-quotes.ts) : classification des invites, état des relances, timeline, KPI,
// perf loueur. Zéro I/O. Node-safe : importable par scripts/check-car-monitoring.mjs.
// Réutilise car-quotes.ts et car-offer-expiry.ts (jamais réécrits).
import { partnerNeedsRelance, clientNeedsRelance, PARTNER_NUDGE_DELAY_MS } from "./car-quotes.ts";
import type { RefundReason } from "./car-deposit.ts";

const HOUR = 3600000;

/** Invite enrichie lue par la page (toutes les colonnes du monitoring). */
export interface MonitorInvite {
  id: number;
  request_id: number;
  partner_id: number;
  partner_name: string;
  status: string; // invited | quoted | declined | chosen | not_chosen
  quote_price: number | null;
  quote_currency: string | null;
  quote_car_model: string | null;
  created_at: string;      // invitation envoyée
  quoted_at: string | null;
  declined_at: string | null;
  relanced_at: string | null;
  closed_notified_at?: string | null;
  /** 'catalogue' = offre de grille, instantanée par construction (jamais une réponse du loueur). */
  source?: "catalogue" | "quote";
}

const isPriced = (i: MonitorInvite): boolean =>
  i.quote_price != null && (i.status === "quoted" || i.status === "chosen" || i.status === "not_chosen");

/**
 * Réconcilie le snapshot gagnant du modèle first-come (`car_requests.quoted_*`) dans les invites.
 * Les demandes d'avant le multi-devis portent le devis gagnant sur la DEMANDE, mais l'invite du
 * loueur reste `invited` sans prix : sans réconciliation, le gagnant apparaît à tort « silencieux »
 * et les KPI comptent 0 devis. On reporte le devis snapshoté sur l'invite du loueur gagnant.
 * Les vraies invites déjà chiffrées (vrai multi-devis) ne sont JAMAIS écrasées. Zéro invention :
 * `quoted_price`/`quoted_at` sont des colonnes réelles. Renvoie la liste inchangée sans snapshot.
 */
export function reconcileWinnerSnapshot(
  invites: MonitorInvite[],
  req: { status: string; quoted_by_partner_id: number | null; quoted_price: number | null; quoted_at: string | null },
): MonitorInvite[] {
  if (req.quoted_by_partner_id == null || req.quoted_price == null) return invites;
  let patched = false;
  const out = invites.map((i) => {
    if (patched || i.partner_id !== req.quoted_by_partner_id || i.quote_price != null) return i;
    patched = true;
    return {
      ...i,
      quote_price: req.quoted_price,
      quoted_at: req.quoted_at ?? i.quoted_at ?? i.created_at,
      status: req.status === "accepted" ? "chosen" : "quoted",
    };
  });
  return patched ? out : invites;
}

/**
 * Classe les invites d'UNE demande : chiffrés (choisi en tête puis prix↑), silencieux, désistés.
 *
 * Note : les statuts `chosen` et `not_chosen` (avec prix) atterrissent dans le bucket `quoted`
 * via le prédicat `isPriced` ; `chosen` est remonté en tête par le tri, avant les prix croissants.
 * Le bucket `silent` contient uniquement les invités (status `invited`) sans aucune relance.
 */
export function classifyInvites(invites: MonitorInvite[]): {
  quoted: MonitorInvite[]; silent: MonitorInvite[]; declined: MonitorInvite[];
} {
  const quoted = invites.filter(isPriced).sort((a, b) => {
    if ((a.status === "chosen") !== (b.status === "chosen")) return a.status === "chosen" ? -1 : 1;
    return (a.quote_price! - b.quote_price!);
  });
  const silent = invites.filter((i) => i.status === "invited");
  const declined = invites.filter((i) => i.status === "declined");
  return { quoted, silent, declined };
}

export type PartnerRelanceState =
  | { kind: "relanced"; at: string }
  | { kind: "due" }
  | { kind: "dueInMs"; ms: number }
  | { kind: "never" };

/** État de relance loueur d'UNE invite (silencieuse). Réutilise partnerNeedsRelance. */
export function partnerRelanceState(
  inv: MonitorInvite, requestStatus: string, createdAtMs: number, nowMs: number,
): PartnerRelanceState {
  if (inv.relanced_at) return { kind: "relanced", at: inv.relanced_at };
  if (inv.status !== "invited") return { kind: "never" };
  if (partnerNeedsRelance({ status: inv.status, relanced_at: inv.relanced_at }, requestStatus, nowMs, createdAtMs)) {
    return { kind: "due" };
  }
  // Encore invité sur demande ouverte mais sous le seuil : décompte avant
  // éligibilité. Le délai vient de PARTNER_NUDGE_DELAY_MS, jamais d'une copie en
  // dur : le 01/08/2026 il est passé de 24 h à 2 h et cette ligne avait sa
  // propre valeur, donc l'écran de suivi annonçait un décompte faux.
  const dueAt = createdAtMs + PARTNER_NUDGE_DELAY_MS;
  if (dueAt > nowMs && (requestStatus === "sent" || requestStatus === "quoted")) {
    return { kind: "dueInMs", ms: dueAt - nowMs };
  }
  return { kind: "never" };
}

/**
 * Rollup loueurs d'une demande. `invited` = TOTAL des loueurs sollicités (pas
 * seulement ceux restés au statut 'invited' : le bug d'affichage 09/07 venait
 * de là — « 3 invités » alors que 6 loueurs avaient été sollicités dont 3 chiffrés).
 * `quoted` = ceux qui ont chiffré, `silent` = invités sans devis ni relance,
 * `relanced` = relancés, `declined` = désistés.
 */
export function partnerRelanceRollup(invites: MonitorInvite[]): {
  invited: number; quoted: number; silent: number; relanced: number; declined: number;
} {
  const invitedStatus = invites.filter((i) => i.status === "invited");
  return {
    invited: invites.length,
    quoted: invites.filter(isPriced).length,
    silent: invitedStatus.filter((i) => !i.relanced_at).length,
    relanced: invites.filter((i) => i.relanced_at != null).length,
    declined: invites.filter((i) => i.status === "declined").length,
  };
}

export type ClientRelanceState =
  | { kind: "eligible" }
  | { kind: "waiting"; nextEligibleMs: number }
  | { kind: "exhausted" }
  | { kind: "na" };

/** État de relance client d'UNE demande. Réutilise clientNeedsRelance. */
export function clientRelanceState(
  req: { status: string; client_relanced_at: string | null; client_relance_count: number },
  nowMs: number,
): ClientRelanceState {
  if (req.status !== "quoted") return { kind: "na" };
  if (req.client_relance_count >= 2) return { kind: "exhausted" };
  if (clientNeedsRelance(req, nowMs)) return { kind: "eligible" };
  // reste : a été relancé <24h → attente
  const last = req.client_relanced_at ? new Date(req.client_relanced_at).getTime() : nowMs;
  return { kind: "waiting", nextEligibleMs: last + 24 * HOUR };
}

const hasPricedInvite = (invites: MonitorInvite[]): boolean => invites.some(isPriced);

/** Demande silencieuse : ouverte (sent), aucun devis chiffré, créée il y a >24h. */
export function isSilentRequest(
  req: { status: string; created_at: string }, invites: MonitorInvite[], nowMs: number,
): boolean {
  if (req.status !== "sent") return false;
  if (hasPricedInvite(invites)) return false;
  return nowMs - new Date(req.created_at).getTime() > 24 * HOUR;
}

/** Demande en attente de choix : 'quoted' avec ≥1 invite chiffrée, non tranchée. */
export function isAwaitingChoice(req: { status: string }, invites: MonitorInvite[]): boolean {
  return req.status === "quoted" && hasPricedInvite(invites);
}

export interface TimelineEvent { at: string; label: string; }

/** Fil chronologique d'une demande : uniquement des événements réels (timestamps non nuls). */
export function buildTimeline(
  req: { created_at: string; accepted_at: string | null; client_relanced_at: string | null;
         outcome?: string | null; outcome_at?: string | null; closure_reason?: string | null },
  invites: MonitorInvite[],
): TimelineEvent[] {
  const ev: TimelineEvent[] = [{ at: req.created_at, label: "Demande créée" }];

  if (invites.length > 0) {
    const firstInvite = invites.reduce((m, i) => (i.created_at < m ? i.created_at : m), invites[0].created_at);
    ev.push({ at: firstInvite, label: `${invites.length} loueur(s) invité(s)` });
  }

  // Un événement PAR devis (le bug 09/07 n'en montrait qu'un, « 1er devis »).
  // Chaque devis notifie le client par email (route quote), sauf statut
  // email_failed géré ailleurs : on matérialise l'action côté client ici.
  const priced = invites
    .filter((i) => i.quoted_at != null)
    .sort((a, b) => (a.quoted_at! < b.quoted_at! ? -1 : a.quoted_at! > b.quoted_at! ? 1 : 0));
  priced.forEach((i, idx) => {
    const price = i.quote_price != null ? ` ${i.quote_price}${i.quote_currency ?? "€"}` : "";
    const rank = idx === 0 ? "1er devis" : `devis n°${idx + 1}`;
    ev.push({ at: i.quoted_at!, label: `${rank} — ${i.partner_name}${price} · client notifié` });
  });

  for (const i of invites) {
    if (i.relanced_at) ev.push({ at: i.relanced_at, label: `Relance loueur (${i.partner_name})` });
    if (i.declined_at) ev.push({ at: i.declined_at, label: `Désistement (${i.partner_name})` });
  }

  if (req.client_relanced_at) ev.push({ at: req.client_relanced_at, label: "Relance client envoyée" });
  if (req.accepted_at) {
    const chosen = invites.find((i) => i.status === "chosen" && i.quote_price != null) ?? null;
    ev.push({ at: req.accepted_at, label: `Client a choisi${chosen ? ` (${chosen.partner_name})` : ""}` });
  }
  if (req.closure_reason && !req.accepted_at) {
    const firstClosure = invites
      .map((i) => i.closed_notified_at)
      .filter((x): x is string => x != null)
      .sort()[0];
    if (firstClosure) ev.push({ at: firstClosure, label: `Clôture : ${req.closure_reason}` });
  }
  for (const i of invites) {
    if (i.closed_notified_at) ev.push({ at: i.closed_notified_at, label: `Email clôture loueur (${i.partner_name})` });
  }
  if (req.outcome && req.outcome_at) ev.push({ at: req.outcome_at, label: `Issue : ${req.outcome}` });

  return ev.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

export interface CockpitKpis {
  count: number;
  quoteRate: number | null;
  avgQuotesPerRequest: number | null;
  medianFirstQuoteHours: number | null;
  choiceRate: number | null;
  partnerDeclineRate: number | null;
  clientDeclineRate: number | null;
  partnerRelanceEfficacy: number | null;
  clientRelanceEfficacy: number | null;
  silentInviteRate: number | null;
}

const ratio = (num: number, den: number): number | null => (den === 0 ? null : num / den);

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * KPI agrégés sur les demandes fournies (le caller filtre par fenêtre created_at).
 *
 * `avgQuotesPerRequest` = moyenne du nombre de devis **parmi les demandes ayant au moins
 * un devis chiffré** (dénominateur `withQuote`, pas `reqs.length`).
 */
export function kpis(
  reqs: { id: number; status: string; created_at: string; accepted_at: string | null;
          client_relanced_at: string | null; client_relance_count: number }[],
  invitesByRequest: Map<number, MonitorInvite[]>,
  _nowMs: number,
): CockpitKpis {
  let withQuote = 0, totalQuotes = 0, totalInvites = 0, declinedInvites = 0, silentInvites = 0;
  let accepted = 0;
  let declinedByClient = 0;
  let relancedInvites = 0, relancedThenQuoted = 0;
  let clientRelanced = 0, clientRelancedThenAccepted = 0;
  const firstQuoteHours: number[] = [];

  for (const r of reqs) {
    const invites = invitesByRequest.get(r.id) ?? [];
    totalInvites += invites.length;
    // Correction 1 : utilise le prédicat isPriced unifié (quote_price != null + statut cohérent)
    const priced = invites.filter(isPriced);
    if (priced.length > 0) {
      withQuote++;
      totalQuotes += priced.length;
      // R25 : une offre de grille naît chiffrée à la création de la demande, son
      // « délai » est nul par construction et écraserait le temps de réponse réel
      // des loueurs. Elles restent comptées partout ailleurs, pas dans ce délai.
      const quotedAts = priced.filter((i) => i.source !== "catalogue").map((i) => i.quoted_at).filter((x): x is string => x != null);
      if (quotedAts.length > 0) {
        const firstAtMs = Math.min(...quotedAts.map((x) => new Date(x).getTime()));
        firstQuoteHours.push((firstAtMs - new Date(r.created_at).getTime()) / 3600000);
      }
      if (r.status === "accepted") accepted++;
      if (r.status === "declined_by_client") declinedByClient++;
    }
    for (const i of invites) {
      if (i.status === "declined") declinedInvites++;
      if (i.status === "invited" && i.quoted_at == null && i.declined_at == null) silentInvites++;
      if (i.relanced_at != null) {
        relancedInvites++;
        // Correction 2 : comparaison numérique getTime() au lieu de comparaison lexicographique
        if (i.quoted_at != null && new Date(i.quoted_at).getTime() > new Date(i.relanced_at).getTime()) {
          relancedThenQuoted++;
        }
      }
    }
    if (r.client_relance_count > 0) {
      clientRelanced++;
      // Correction 2 : comparaison numérique getTime() au lieu de comparaison lexicographique
      if (r.accepted_at != null && r.client_relanced_at != null &&
          new Date(r.accepted_at).getTime() > new Date(r.client_relanced_at).getTime()) {
        clientRelancedThenAccepted++;
      }
    }
  }

  return {
    count: reqs.length,
    quoteRate: ratio(withQuote, reqs.length),
    avgQuotesPerRequest: ratio(totalQuotes, withQuote),
    medianFirstQuoteHours: median(firstQuoteHours),
    // Correction 3 : withQuote remplace quotedWithDevis (supprimé car toujours identique)
    choiceRate: ratio(accepted, withQuote),
    partnerDeclineRate: ratio(declinedInvites, totalInvites),
    clientDeclineRate: ratio(declinedByClient, withQuote),
    partnerRelanceEfficacy: ratio(relancedThenQuoted, relancedInvites),
    clientRelanceEfficacy: ratio(clientRelancedThenAccepted, clientRelanced),
    silentInviteRate: ratio(silentInvites, totalInvites),
  };
}

export interface PartnerPerf {
  invited: number; quoted: number; chosen: number; declined: number;
  avgQuotePriceEur: number | null; responseRate: number | null; avgResponseHours: number | null;
}

/** Perf loueur enrichie (au-delà de partnerStats.won). invitesByPartner = invites du loueur. */
export function partnerPerf(partnerId: number, invitesByPartner: Map<number, MonitorInvite[]>): PartnerPerf {
  const invites = invitesByPartner.get(partnerId) ?? [];
  // Correction 1 : utilise le prédicat isPriced unifié au lieu de quote_price != null seul
  const priced = invites.filter(isPriced);
  // Correction 1 : avgResponseHours calculé sur les invites isPriced ayant un quoted_at
  const respHours = priced
    .filter((i) => i.quoted_at != null)
    .map((i) => (new Date(i.quoted_at!).getTime() - new Date(i.created_at).getTime()) / 3600000);
  const avg = (xs: number[]): number | null => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    invited: invites.length,
    quoted: priced.length,
    chosen: invites.filter((i) => i.status === "chosen").length,
    declined: invites.filter((i) => i.status === "declined").length,
    avgQuotePriceEur: avg(priced.map((i) => i.quote_price!)),
    responseRate: invites.length === 0 ? null : (priced.length + invites.filter((i) => i.status === "declined").length) / invites.length,
    avgResponseHours: avg(respHours),
  };
}

/** Colonnes d'une demande lues pour les indicateurs d'acompte. */
export interface DepositKpiRow {
  booking_status: string | null;
  deposit_eur: number | null;
  booking_paid_at: string | null;
  partner_confirmed_at: string | null;
  refund_reason: string | null;
  /** La demande porte au moins une option de source 'catalogue'. */
  hasCatalogueOption: boolean;
  /** La demande porte au moins une option, de grille ou de devis. */
  hasOption: boolean;
}

export interface DepositKpis {
  catalogueCoverage: number | null;
  offerToDeposit: number | null;
  confirmRate: number | null;
  medianConfirmMinutes: number | null;
  refundsByReason: Record<RefundReason, number>;
  commissionEur: number;
}

const REFUND_REASONS: RefundReason[] = ["partner_declined", "partner_timeout", "client_cancelled", "partner_cancelled", "ops"];

/**
 * Les 6 indicateurs d'acompte, sur les demandes fournies. Un dénominateur nul
 * donne null (affiché n/d, jamais un ratio inventé).
 * - catalogueCoverage : demandes avec une option catalogue / demandes.
 * - offerToDeposit : demandes avec acompte payé (booking_paid_at) / demandes avec
 *   au moins une option, de grille ou de devis (l'acompte vaut pour les deux). Le
 *   numérateur ne compte que des demandes du dénominateur : jamais plus de 100 %.
 * - confirmRate : (confirmed + cancelled_kept) / acomptes payés.
 * - medianConfirmMinutes : booking_paid_at vers partner_confirmed_at, null sans confirmation.
 * - refundsByReason : lignes portant un refund_reason, les 5 clés toujours présentes.
 * - commissionEur : somme des deposit_eur de confirmed + cancelled_kept, au centime.
 */
export function depositKpis(rows: DepositKpiRow[]): DepositKpis {
  const safe = (n: number, d: number): number | null => (d === 0 ? null : n / d);
  const withCatalogue = rows.filter((r) => r.hasCatalogueOption).length;
  const withOption = rows.filter((r) => r.hasOption);
  const paid = rows.filter((r) => r.booking_paid_at != null);
  const kept = rows.filter((r) => r.booking_status === "confirmed" || r.booking_status === "cancelled_kept");
  const mins = rows
    .filter((r) => r.booking_paid_at != null && r.partner_confirmed_at != null)
    .map((r) => (new Date(r.partner_confirmed_at!).getTime() - new Date(r.booking_paid_at!).getTime()) / 60000);
  const refundsByReason = Object.fromEntries(REFUND_REASONS.map((k) => [k, 0])) as Record<RefundReason, number>;
  for (const r of rows) {
    if (r.refund_reason && r.refund_reason in refundsByReason) refundsByReason[r.refund_reason as RefundReason]++;
  }
  const cents = kept.reduce((sum, r) => sum + Math.round((r.deposit_eur ?? 0) * 100), 0);
  return {
    catalogueCoverage: safe(withCatalogue, rows.length),
    offerToDeposit: safe(withOption.filter((r) => r.booking_paid_at != null).length, withOption.length),
    confirmRate: safe(kept.length, paid.length),
    medianConfirmMinutes: median(mins),
    refundsByReason,
    commissionEur: cents / 100,
  };
}
