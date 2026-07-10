// Logique PURE du modèle multi-devis (pattern car-lead.ts / car-admin.ts) :
// tri, sélection du choix, éligibilité des relances, transitions de statut.
// Zéro I/O. Importable par scripts/check-car-quotes.mjs.

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

/** L'invite choisie par le client : doit exister et porter un devis. Sinon null. */
export function findChosenInvite(quotes: QuoteInvite[], inviteId: number): QuoteInvite | null {
  const inv = quotes.find((q) => q.id === inviteId);
  return inv && inv.quote_price != null ? inv : null;
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
