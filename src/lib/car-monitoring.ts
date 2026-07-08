// Logique PURE du cockpit de monitoring /admin/car-rental (pattern car-admin.ts /
// car-quotes.ts) : classification des invites, état des relances, timeline, KPI,
// perf loueur. Zéro I/O. Node-safe : importable par scripts/check-car-monitoring.mjs.
// Réutilise car-quotes.ts et car-offer-expiry.ts (jamais réécrits).
import { partnerNeedsRelance, clientNeedsRelance } from "./car-quotes.ts";

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
}

const isPriced = (i: MonitorInvite): boolean =>
  i.quote_price != null && (i.status === "quoted" || i.status === "chosen" || i.status === "not_chosen");

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
  // Encore invité sur demande ouverte mais <24h : décompte avant éligibilité.
  const dueAt = createdAtMs + 24 * HOUR;
  if (dueAt > nowMs && (requestStatus === "sent" || requestStatus === "quoted")) {
    return { kind: "dueInMs", ms: dueAt - nowMs };
  }
  return { kind: "never" };
}

/** Rollup relances loueur d'une demande : invités (status 'invited'), relancés, silencieux. */
export function partnerRelanceRollup(invites: MonitorInvite[]): {
  invited: number; relanced: number; silent: number;
} {
  const invitedStatus = invites.filter((i) => i.status === "invited");
  return {
    invited: invitedStatus.length,
    relanced: invites.filter((i) => i.relanced_at != null).length,
    silent: invitedStatus.filter((i) => !i.relanced_at).length,
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
         outcome?: string | null; outcome_at?: string | null },
  invites: MonitorInvite[],
): TimelineEvent[] {
  const ev: TimelineEvent[] = [{ at: req.created_at, label: "Demande créée" }];

  if (invites.length > 0) {
    const firstInvite = invites.reduce((m, i) => (i.created_at < m ? i.created_at : m), invites[0].created_at);
    ev.push({ at: firstInvite, label: `${invites.length} loueur(s) invité(s)` });
  }

  const priced = invites.filter((i) => i.quoted_at != null);
  if (priced.length > 0) {
    const first = priced.reduce((m, i) => (i.quoted_at! < m.quoted_at! ? i : m));
    ev.push({ at: first.quoted_at!, label: `1er devis reçu (${first.partner_name})` });
  }

  for (const i of invites) {
    if (i.relanced_at) ev.push({ at: i.relanced_at, label: `Relance loueur (${i.partner_name})` });
    if (i.declined_at) ev.push({ at: i.declined_at, label: `Désistement (${i.partner_name})` });
  }

  if (req.client_relanced_at) ev.push({ at: req.client_relanced_at, label: "Relance client" });
  if (req.accepted_at) {
    const chosen = invites.find((i) => i.status === "chosen" && i.quote_price != null) ?? null;
    ev.push({ at: req.accepted_at, label: `Client a choisi${chosen ? ` (${chosen.partner_name})` : ""}` });
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
      // Correction 1 : délai 1er devis calculé sur les invites ayant un quoted_at
      const quotedAts = priced.map((i) => i.quoted_at).filter((x): x is string => x != null);
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
