// Logique PURE du back-office /admin/activities, zéro I/O (pattern
// activity-lead.ts) : commissions au taux du partenaire, agrégats des bandeaux,
// stats par prestataire, validation des écritures. Node-safe : importable
// par scripts/check-activity-admin.mjs. Les lectures/écritures Supabase vivent
// dans la page et les server actions.
import { ACTIVITY_CATEGORIES, ACTIVITY_CITIES, categoryLabel, cityLabel } from "./activity-taxonomy.ts";

export interface AdminRequest {
  id: number;
  created_at: string;
  status: string; // sent | quoted | accepted | email_failed (cycle auto)
  locale: string;
  category_slug: string;
  city: string;
  activity_date: string;
  timeslot: string | null;
  adults: number;
  children: number;
  preferred_language: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  note: string | null;
  quoted_price: number | null;
  quoted_at: string | null;
  accepted_at: string | null;
  quoted_by_partner_id: number | null;
  // Colonnes admin (migration cff5d48) : optionnelles pour
  // tolérer une prod pas encore migrée (select * sans crash).
  outcome?: string | null; // 'rented' | 'lost' | null
  outcome_at?: string | null;
  final_amount_eur?: number | null;
  commission_eur?: number | null;
  commission_paid_at?: string | null;
  admin_note?: string | null;
  client_relanced_at?: string | null;
  client_relance_count?: number;
}

export interface AdminPartner {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  category_slug: string;
  cities: string[];
  languages: string[];
  commission: number;
  lead_routing: "direct" | "relay";
  active: boolean;
  created_at: string;
  outreach_status?: string | null;
}

export const OUTCOMES = ["rented", "lost"] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Commission en euros, arrondie au centime (EPSILON contre le demi-centime
 *  flottant qui arrondirait vers le bas). */
export const commissionEur = (amountEur: number, rate: number): number =>
  Math.round((amountEur * rate + Number.EPSILON) * 100) / 100;

/** Commission d'une demande : priorité au snapshot `commission_eur` figé à la
 *  saisie de l'issue (l'édition ultérieure du taux partenaire ne réécrit pas
 *  l'historique). Fallback calcul live au taux DU partenaire (preview avant
 *  enregistrement de l'issue). Sinon null. */
export function requestCommission(
  req: AdminRequest,
  partnersById: Map<number, AdminPartner>,
): number | null {
  if (req.outcome !== "rented") return null;
  if (req.commission_eur != null) return req.commission_eur;
  if (req.final_amount_eur == null || req.quoted_by_partner_id == null) return null;
  const p = partnersById.get(req.quoted_by_partner_id);
  return p ? commissionEur(req.final_amount_eur, p.commission) : null;
}

export interface RequestsSummary {
  byStatus: Record<string, number>;
  rented: number;
  lost: number;
  commissionDueEur: number;   // rented, commission_paid_at NULL
  commissionPaidEur: number;  // rented, commission_paid_at NOT NULL
}

export function requestsSummary(
  reqs: AdminRequest[],
  partnersById: Map<number, AdminPartner>,
): RequestsSummary {
  const s: RequestsSummary = { byStatus: {}, rented: 0, lost: 0, commissionDueEur: 0, commissionPaidEur: 0 };
  for (const r of reqs) {
    s.byStatus[r.status] = (s.byStatus[r.status] ?? 0) + 1;
    if (r.outcome === "rented") s.rented++;
    else if (r.outcome === "lost") s.lost++;
    const c = requestCommission(r, partnersById);
    if (c == null) continue;
    if (r.commission_paid_at) s.commissionPaidEur += c;
    else s.commissionDueEur += c;
  }
  s.commissionDueEur = Math.round(s.commissionDueEur * 100) / 100;
  s.commissionPaidEur = Math.round(s.commissionPaidEur * 100) / 100;
  return s;
}

export interface PartnerStats {
  invites: number;       // invitations reçues (activity_quote_invites)
  won: number;           // devis gagnés (quoted_by_partner_id)
  rented: number;        // activités effectuées
  commissionEur: number; // commission totale générée (due + encaissée)
}

export function partnerStats(
  partnerId: number,
  reqs: AdminRequest[],
  invitesByPartner: Map<number, number>,
  partnersById: Map<number, AdminPartner>,
): PartnerStats {
  const st: PartnerStats = { invites: invitesByPartner.get(partnerId) ?? 0, won: 0, rented: 0, commissionEur: 0 };
  for (const r of reqs) {
    if (r.quoted_by_partner_id !== partnerId) continue;
    st.won++;
    if (r.outcome === "rented") st.rented++;
    const c = requestCommission(r, partnersById);
    if (c != null) st.commissionEur += c;
  }
  st.commissionEur = Math.round(st.commissionEur * 100) / 100;
  return st;
}

export const CATEGORY_SLUGS: string[] = ACTIVITY_CATEGORIES.map((c) => c.slug);
export const CITY_SLUGS: string[] = ACTIVITY_CITIES.map((c) => c.slug);

/** null = OK, sinon message d'erreur. */
export function validatePartnerUpdate(u: { category_slug: string; cities: string[]; commission: number }): string | null {
  if (!CATEGORY_SLUGS.includes(u.category_slug)) return "Unknown category";
  if (!Array.isArray(u.cities) || u.cities.length === 0) return "At least one city required";
  if (u.cities.some((c) => !CITY_SLUGS.includes(c))) return "Unknown city";
  if (typeof u.commission !== "number" || Number.isNaN(u.commission) || u.commission < 0 || u.commission > 0.5) {
    return "Commission out of range (0-0.5)";
  }
  return null;
}

export { categoryLabel, cityLabel };
