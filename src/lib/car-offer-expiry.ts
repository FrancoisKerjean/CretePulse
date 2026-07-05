// L'offre expire au plus tôt entre 72h après le devis et le début de location.
export function offerExpiresAt(quotedAt: string | null, dateFrom: string | null): number | null {
  if (!quotedAt) return null;
  const q72 = new Date(quotedAt).getTime() + 72 * 60 * 60 * 1000;
  const start = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : Infinity;
  return Math.min(q72, start);
}
export function isOfferExpired(quotedAt: string | null, dateFrom: string | null, now: number): boolean {
  const exp = offerExpiresAt(quotedAt, dateFrom);
  return exp != null && now > exp;
}
