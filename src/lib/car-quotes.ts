// Logique PURE du modèle multi-devis (pattern car-lead.ts / car-admin.ts) :
// tri, sélection du choix, éligibilité des relances, transitions de statut.
// Zéro I/O. Importable par scripts/check-car-quotes.mjs.
import { isInclusionKey, isInsuranceType } from "./car-inclusions.ts";

export type InviteStatus = "invited" | "quoted" | "declined" | "chosen" | "not_chosen";
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
  insurance_type: string | null;            // 'all_risk_zero' | 'cdw_excess' | null
  excess_eur: number | null;                // franchise si cdw_excess
  zero_excess_upsell_eur_day: number | null; // surcoût /jour pour passer à zéro franchise
  created_at: string | null;    // horodatage de l'option (pour l'expiry)
}

/** Option normalisée prête à insérer (colonnes DB). */
export interface NormalizedOption {
  price: number;
  car_model: string | null;
  gearbox: string | null;
  inclusions: string[];
  insurance_type: string | null;
  excess_eur: number | null;
  zero_excess_upsell_eur_day: number | null;
}

/** Valide/normalise une option brute soumise par le loueur. null si le prix est
 *  invalide (hors 1..100000). Les autres champs sont nettoyés silencieusement. */
export function normalizeQuoteOption(raw: {
  price?: unknown; carModel?: unknown; gearbox?: unknown; inclusions?: unknown;
  insuranceType?: unknown; excessEur?: unknown; zeroExcessUpsellEurDay?: unknown;
}): NormalizedOption | null {
  const price = typeof raw.price === "number" ? raw.price : Number(raw.price);
  if (!Number.isFinite(price) || price <= 0 || price > 100000) return null;
  const car_model = typeof raw.carModel === "string" && raw.carModel.trim() ? raw.carModel.trim().slice(0, 120) : null;
  const gearbox = raw.gearbox === "automatic" || raw.gearbox === "manual" ? raw.gearbox : null;
  const inclusions = Array.isArray(raw.inclusions) ? raw.inclusions.filter(isInclusionKey) : [];
  // Assurance : type validé sur l'enum, franchise/upsell = nombres >= 0 (sinon null).
  const insurance_type = isInsuranceType(raw.insuranceType) ? raw.insuranceType : null;
  const excessRaw = typeof raw.excessEur === "number" ? raw.excessEur : Number(raw.excessEur);
  const excess_eur = insurance_type === "cdw_excess" && Number.isFinite(excessRaw) && excessRaw >= 0 && excessRaw <= 100000 ? excessRaw : null;
  const upsellRaw = typeof raw.zeroExcessUpsellEurDay === "number" ? raw.zeroExcessUpsellEurDay : Number(raw.zeroExcessUpsellEurDay);
  const zero_excess_upsell_eur_day = Number.isFinite(upsellRaw) && upsellRaw > 0 && upsellRaw <= 10000 ? upsellRaw : null;
  return { price, car_model, gearbox, inclusions, insurance_type, excess_eur, zero_excess_upsell_eur_day };
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

/**
 * Délai avant de relancer un loueur muet. Ramené de 24 h à 2 h le 01/08/2026.
 *
 * Mesure sur 30 jours (22 demandes) : la première offre arrive en <= 0,5 h sur
 * TOUTES les issues où le client reste dans le jeu, et en 6,7 h sur les 8
 * demandes où il disparaît sans jamais trancher. Un client qui attend une
 * matinée a réservé ailleurs et ne revient pas. Relancer à H+24 arrivait donc
 * longtemps après la bataille.
 *
 * Le plafond d'UNE relance par invite ne bouge pas : c'est le moment qui change,
 * pas le volume de courrier envoyé aux loueurs.
 */
export const PARTNER_NUDGE_DELAY_MS = 2 * HOUR;

/** Heures d'envoi acceptables, à Athènes. Bornes : ouverte incluse, fermée exclue. */
const NUDGE_OPEN_HOUR = 8;
const NUDGE_CLOSE_HOUR = 21;

/**
 * Une relance est-elle envoyable maintenant ? Un loueur ne se relève pas à 3 h
 * du matin, et un courrier nocturne se lit au mieux le lendemain, au pire agace.
 *
 * Ne porte QUE sur l'heure d'envoi, jamais sur le calcul du délai : une demande
 * déposée la nuit garde son ancienneté et part dès l'ouverture.
 * `Intl` porte les règles de fuseau, donc le passage à l'heure d'hiver suit tout
 * seul, sans décalage d'une heure deux fois par an.
 */
export function isPartnerNudgeHour(nowMs: number): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens", hour: "2-digit", hourCycle: "h23",
  }).format(new Date(nowMs)));
  if (!Number.isFinite(hour)) return false;
  return hour >= NUDGE_OPEN_HOUR && hour < NUDGE_CLOSE_HOUR;
}

/**
 * Libellé du véhicule d'un devis. Rend `null` tant qu'il n'y a pas de modèle.
 *
 * ⛔ Une boîte de vitesses n'est PAS un modèle de voiture. Le libellé se
 * construisait en `[car_model, gearbox].filter(Boolean).join(" · ")` : quand le
 * loueur laissait le modèle vide, il ne restait que « Manual », et ce mot partait
 * à la place du modèle **au client** sur sa page d'offres et dans l'email de mise
 * en relation. Constaté en production sur les demandes 25 (Zorbas) et 33 (Zakros
 * Tours) : deux clients sur quatre ont lu « Manual » comme nom de voiture.
 *
 * La boîte reste une information utile, mais elle s'affiche sous son propre
 * intitulé, jamais dans le champ du modèle.
 */
export function quotedModelLabel(
  carModel: string | null | undefined,
  gearboxLabel: string | null | undefined,
): string | null {
  const model = typeof carModel === "string" ? carModel.trim() : "";
  if (!model) return null;
  return gearboxLabel ? `${model} · ${gearboxLabel}` : model;
}

/** Relance loueur : invité, ni chiffré ni désisté, demande ouverte, >2h, jamais relancé. */
export function partnerNeedsRelance(
  invite: { status: string; relanced_at: string | null },
  requestStatus: string,
  nowMs: number,
  createdAtMs: number,
): boolean {
  if (invite.status !== "invited") return false;
  if (invite.relanced_at) return false;
  if (!canPartnerQuote(requestStatus)) return false;
  return nowMs - createdAtMs >= PARTNER_NUDGE_DELAY_MS;
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
