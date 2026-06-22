// Zones de pickup location voiture + lookup partenaire. Pur, zéro I/O :
// importable client, serveur et node (check-car-partners.mjs).
// Data en const TS (pas de JSON séparé) : le node type-stripping ne résout pas
// l'alias @/ et n'accepte pas les imports JSON sans attribute · même raison
// que taxi-partners. Décision à l'exécution prévue par le plan (Task 1 Step 4).
// Spec : docs/superpowers/specs/2026-06-12-car-rental-wizard-design.md
//
// SOURCE UNIQUE : ce fichier. Le rapport partenaire VPS (vps/partner_report.py)
// ne peut pas importer du TS → on en génère une projection JSON versionnée via
// `npm run gen:car-partners-json` → src/data/car-partners.json (déployée sur le
// VPS comme taxi-partners.json). NE PAS éditer le JSON à la main ;
// check-car-partners.mjs vérifie qu'il reste en phase avec ce fichier.

export interface CarZone { id: string; label?: string; pickups: string[] }
export interface CarPartner {
  zoneIds: string[]; name: string; email: string; phone: string;
  whatsapp?: string; website?: string; commission: number; since: string;
  /** "relay" (défaut) : lead envoyé à Kami qui transfère manuellement (WhatsApp
   *  prérempli dans l'email). "direct" : email envoyé à l'agence, CC Kami.
   *  Basculer en "direct" une fois l'agence prévenue / canal auto branché. */
  leadRouting?: "relay" | "direct";
}

// Slugs = clés existantes de SLUG_COORDS (taxi-fare.ts), vérifiés par check-car-partners.mjs.
export const CAR_ZONES: CarZone[] = [
  { id: "chania-west", label: "Chania & the west", pickups: ["chania-airport", "chania", "kissamos", "paleochora", "kalyves", "georgioupolis"] },
  { id: "rethymno", label: "Rethymno", pickups: ["rethymno", "plakias", "panormo", "bali"] },
  { id: "heraklion-center", label: "Heraklion & central", pickups: ["heraklion", "hersonissos", "malia", "matala", "agia-galini", "gouves"] },
  { id: "lasithi-east", label: "Lasithi & the east", pickups: ["agios-nikolaos", "elounda", "sitia", "ierapetra", "makry-gyalos", "sisi"] },
];

export const CAR_PARTNERS: CarPartner[] = [
  {
    // Couverture vérifiée 12/06/2026 sur le site officiel (chaniacarrental.gr,
    // pages terms + locations) : pickup/dropoff "all over Crete" dont
    // Rethymno Port, Heraklion Airport et Heraklion Port. L'est (Lasithi :
    // Agios Nikolaos, Sitia, Ierapetra) n'est PAS listé → lasithi-east reste
    // volontairement sans partenaire (slot vendable à une agence locale).
    zoneIds: ["chania-west", "rethymno", "heraklion-center"],
    name: "Auto Smart Car Rental",
    email: "autosmartrental@gmail.com",
    phone: "+306974147291",
    whatsapp: "+306974147291",
    website: "https://chaniacarrental.gr",
    commission: 0.10,
    since: "2026-05-12",
    // Relais manuel tant que Panagoula n'est pas prévenue du flux automatique
    // (à terme : canal WhatsApp automatisé, puis "direct").
    leadRouting: "relay",
  },
];

export function zoneForPickup(pickupSlug: string): CarZone | null {
  return CAR_ZONES.find((z) => z.pickups.includes(pickupSlug)) ?? null;
}

export function partnerForPickup(pickupSlug: string): (CarPartner & { zone: CarZone }) | null {
  const zone = zoneForPickup(pickupSlug);
  if (!zone) return null;
  const p = CAR_PARTNERS.find((p) => p.zoneIds.includes(zone.id));
  return p ? { ...p, zone } : null;
}

/** Tous les pickups, flagués servis ou non · alimente l'étape 1 du wizard. */
export function allPickups(): Array<{ slug: string; zoneId: string; served: boolean }> {
  return CAR_ZONES.flatMap((z) => {
    const served = CAR_PARTNERS.some((p) => p.zoneIds.includes(z.id));
    return z.pickups.map((slug) => ({ slug, zoneId: z.id, served }));
  });
}
