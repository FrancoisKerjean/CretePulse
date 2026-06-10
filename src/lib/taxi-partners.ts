// Zones taxi exclusives + lookup partenaire. Pur : les fonctions prennent les
// donnees en parametre (le JSON n'est importe qu'aux points d'usage Next ;
// les scripts check-*.mjs le lisent via fs — node type-stripping n'accepte
// pas les imports JSON sans attribute).
// Spec : docs/superpowers/specs/2026-06-10-taxi-partners-design.md

export const PARTNER_PRICE_EUR = 49; // hypothese 10/06/2026, a trancher par Kami

export interface TaxiZone {
  id: string;
  label: string;
  placeSlugs: string[];
}

export interface TaxiPartner {
  zoneId: string;
  name: string;
  phone: string;       // affiche + href tel:
  website?: string;
  reportEmail: string; // destinataire du rapport Plausible mensuel
  since: string;       // ISO date de debut
}

export interface TaxiPartnersData {
  zones: TaxiZone[];
  partners: TaxiPartner[];
}

export function zoneOfSlug(data: TaxiPartnersData, slug: string): TaxiZone | null {
  return data.zones.find((z) => z.placeSlugs.includes(slug)) ?? null;
}

/** Partenaire du slot pour une paire : zone de A prioritaire, sinon zone de B. */
export function partnerForPair(
  data: TaxiPartnersData,
  slugA: string,
  slugB: string,
): (TaxiPartner & { zone: TaxiZone }) | null {
  for (const slug of [slugA, slugB]) {
    const zone = zoneOfSlug(data, slug);
    if (!zone) continue;
    const partner = data.partners.find((p) => p.zoneId === zone.id);
    if (partner) return { ...partner, zone };
  }
  return null;
}

export function activePartners(data: TaxiPartnersData): TaxiPartner[] {
  return data.partners;
}
