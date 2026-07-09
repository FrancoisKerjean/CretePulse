// Logique PURE du modèle multi-devis (pattern activity-lead.ts / activity-admin.ts) :
// tri, sélection du choix, éligibilité des relances, transitions de statut.
// Zéro I/O. Importable par scripts/check-activity-quotes.mjs.

export type InviteStatus = "invited" | "quoted" | "declined" | "chosen" | "not_chosen";

export interface QuoteInvite {
  id: number;
  partner_id: number;
  partner_name: string;
  status: InviteStatus;
  quote_price: number | null;
  quote_currency?: string | null;
  quote_details?: string | null;
  quote_inclusions?: string[] | null;
  quoted_at: string | null;
  relanced_at?: string | null;
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
