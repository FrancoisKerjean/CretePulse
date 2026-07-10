// Logique PURE du modèle multi-devis (pattern car-lead.ts / car-admin.ts) :
// tri, sélection du choix, éligibilité des relances, transitions de statut.
// Zéro I/O. Importable par scripts/check-car-quotes.mjs.
import { isInclusionKey } from "./car-inclusions.ts";

export type InviteStatus = "invited" | "quoted" | "declined" | "chosen" | "not_chosen";
export type ClosedRequestStatus = "accepted" | "declined_by_client";
export type AutoCloseReason = "client_silent" | "rental_started";

export interface QuoteInvite {
  id: number;
  partner_id: number;
  partner_name: string;
  status: InviteStatus;
  quote_price: number | null;
  quote_currency?: string | null;
  quote_car_model?: string | null;
  quote_inclusions?: string[] | null;
  quoted_at: string | null;
  relanced_at?: string | null;
  closed_notified_at?: string | null;
}

const HOUR = 3600000;

/** Devis chiffrés (prix non nul), triés par prix croissant (meilleur prix en tête). */
export function sortQuotesByPrice(quotes: QuoteInvite[]): QuoteInvite[] {
  return quotes
    .filter((q) => q.quote_price != null && (q.status === "quoted" || q.status === "chosen" || q.status === "not_chosen"))
    .sort((a, b) => (a.quote_price! - b.quote_price!));
}

/** Un loueur peut chiffrer tant que la demande est ouverte. */
export function canPartnerQuote(requestStatus: string): boolean {
  return requestStatus === "sent" || requestStatus === "quoted";
}

/** Statuts terminaux d'une demande : plus aucune action (relance, devis, choix).
 *  'cancelled' = sortie manuelle du flow par l'admin (demande erronée/spam). */
const TERMINAL_STATUSES = new Set(["accepted", "declined_by_client", "cancelled"]);

/** Une demande peut être sortie du flow (annulée) tant qu'elle n'est pas déjà
 *  terminale. Annuler passe le statut à 'cancelled' → les deux passes du cron
 *  car-relance l'ignorent (canPartnerQuote=false, passe client filtre 'quoted')
 *  et tout devis loueur tardif est refusé (canPartnerQuote=false). */
export function canCancelRequest(requestStatus: string): boolean {
  return !TERMINAL_STATUSES.has(requestStatus);
}

/** L'invite choisie par le client : doit exister et porter un devis. Sinon null. */
export function findChosenInvite(quotes: QuoteInvite[], inviteId: number): QuoteInvite | null {
  const inv = quotes.find((q) => q.id === inviteId);
  return inv && inv.quote_price != null ? inv : null;
}

// ── Multi-offres : un loueur propose N variantes (options) pour une demande ──
// Chaque option est une ligne car_quote_options rattachée à l'invite du loueur.
// Le client compare TOUTES les options de TOUS les loueurs et en choisit une.

export interface QuoteOption {
  id: number;
  invite_id: number;
  partner_id: number;
  partner_name: string;
  price: number;
  currency: string;
  car_model: string | null;
  gearbox: string | null;       // 'automatic' | 'manual' | null
  inclusions: string[] | null;
  created_at: string | null;    // horodatage de l'option (pour l'expiry)
}

/** Option normalisée prête à insérer (colonnes DB). */
export interface NormalizedOption {
  price: number;
  car_model: string | null;
  gearbox: string | null;
  inclusions: string[];
}

/** Valide/normalise une option brute soumise par le loueur. null si le prix est
 *  invalide (hors 1..100000). Les autres champs sont nettoyés silencieusement. */
export function normalizeQuoteOption(raw: {
  price?: unknown; carModel?: unknown; gearbox?: unknown; inclusions?: unknown;
}): NormalizedOption | null {
  const price = typeof raw.price === "number" ? raw.price : Number(raw.price);
  if (!Number.isFinite(price) || price <= 0 || price > 100000) return null;
  const car_model = typeof raw.carModel === "string" && raw.carModel.trim() ? raw.carModel.trim().slice(0, 120) : null;
  const gearbox = raw.gearbox === "automatic" || raw.gearbox === "manual" ? raw.gearbox : null;
  const inclusions = Array.isArray(raw.inclusions) ? raw.inclusions.filter(isInclusionKey) : [];
  return { price, car_model, gearbox, inclusions };
}

/** Normalise une liste d'options ; ignore les invalides. Max 6 options gardées. */
export function normalizeQuoteOptions(rawList: unknown): NormalizedOption[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((r) => normalizeQuoteOption(r ?? {})).filter((o): o is NormalizedOption => o !== null).slice(0, 6);
}

/** La meilleure option (moins chère) d'une liste normalisée, pour le snapshot
 *  d'invite qui garde cockpit / commissions / relances inchangés. null si vide. */
export function bestOption(options: NormalizedOption[]): NormalizedOption | null {
  if (!options.length) return null;
  return options.reduce((best, o) => (o.price < best.price ? o : best));
}

/** Options chiffrées triées par prix croissant (meilleur prix en tête). */
export function sortOptionsByPrice(options: QuoteOption[]): QuoteOption[] {
  return [...options].filter((o) => o.price != null).sort((a, b) => a.price - b.price);
}

/** L'option choisie par le client : doit exister dans la liste. Sinon null. */
export function findChosenOption(options: QuoteOption[], optionId: number): QuoteOption | null {
  return options.find((o) => o.id === optionId) ?? null;
}

/** Relance loueur : invité, ni chiffré ni désisté, demande ouverte, >24h, jamais relancé. */
export function partnerNeedsRelance(
  invite: { status: string; relanced_at: string | null },
  requestStatus: string,
  nowMs: number,
  createdAtMs: number,
): boolean {
  if (invite.status !== "invited") return false;
  if (invite.relanced_at) return false;
  if (!canPartnerQuote(requestStatus)) return false;
  return nowMs - createdAtMs >= 24 * HOUR;
}

/** Relance client : a ≥1 offre (status quoted), non tranché, <2 relances, dernière >24h. */
export function clientNeedsRelance(
  req: { status: string; client_relanced_at: string | null; client_relance_count: number },
  nowMs: number,
): boolean {
  if (req.status !== "quoted") return false;
  if (req.client_relance_count >= 2) return false;
  if (req.client_relanced_at && nowMs - new Date(req.client_relanced_at).getTime() < 24 * HOUR) return false;
  return true;
}

/** Clôture auto : client relancé 2× puis silencieux >24h, ou date de début atteinte. */
export function clientAutoCloseReason(
  req: { status: string; date_from: string | null; client_relanced_at: string | null; client_relance_count: number },
  nowMs: number,
): AutoCloseReason | null {
  if (req.status !== "quoted") return null;
  if (req.date_from && new Date(`${req.date_from}T00:00:00`).getTime() <= nowMs) return "rental_started";
  if (req.client_relance_count < 2) return null;
  if (!req.client_relanced_at) return null;
  if (nowMs - new Date(req.client_relanced_at).getTime() < 24 * HOUR) return null;
  return "client_silent";
}

/** Notification de clôture loueur : uniquement les loueurs qui ont répondu et n'ont pas été choisis. */
export function closedResponderNeedsNotification(
  invite: { status: string; quote_price: number | null; closed_notified_at?: string | null },
  requestStatus: string,
): requestStatus is ClosedRequestStatus {
  if (requestStatus !== "accepted" && requestStatus !== "declined_by_client") return false;
  if (invite.status !== "not_chosen") return false;
  if (invite.quote_price == null) return false;
  if (invite.closed_notified_at) return false;
  return true;
}
