// Logique PURE du back-office /admin/car-rental, zéro I/O (pattern
// car-lead.ts) : commissions au taux du partenaire, agrégats des bandeaux,
// stats par loueur, validation des écritures, message WhatsApp relais
// (partagé avec email.ts, source unique du format). Node-safe : importable
// par scripts/check-car-admin.mjs. Les lectures/écritures Supabase vivent
// dans la page et les server actions.
import { CAR_ZONES } from "./car-partners.ts";

export interface AdminRequest {
  id: number;
  created_at: string;
  status: string; // sent | quoted | accepted | email_failed (cycle auto)
  locale: string;
  pickup_slug: string;
  zone_id: string;
  date_from: string;
  time_from: string | null;
  date_to: string;
  time_to: string | null;
  flight_no: string | null;
  car_type: string;
  pax: number | null;
  insurance: string | null;
  payment_method: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  note: string | null;
  quoted_price: number | null;
  quoted_at: string | null;
  accepted_at: string | null;
  quoted_by_partner_id: number | null;
  quoted_insurance_type?: string | null;
  closure_reason?: string | null;
  // Colonnes admin (migration 20260705_car_admin.sql) : optionnelles pour
  // tolérer une prod pas encore migrée (select * sans crash).
  outcome?: string | null; // 'rented' | 'lost' | null
  outcome_at?: string | null;
  final_amount_eur?: number | null;
  commission_eur?: number | null;
  commission_paid_at?: string | null;
  /** Facture partie chez le loueur, pas encore reglee (migration 20260729). */
  commission_requested_at?: string | null;
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
  zone_ids: string[];
  commission: number;
  lead_routing: "direct" | "relay";
  active: boolean;
  created_at: string;
  // Colonne recrutement ajoutée en SQL direct sur le VPS (non versionnée) :
  // affichée si présente, ignorée sinon.
  outreach_status?: string | null;
  // Compte de versement Stripe Connect (migration 20260730_car_booking).
  // Sans lui, le cron de versement garde les fonds du client et le signale.
  stripe_connect_account_id?: string | null;
  kyc_status?: string | null;
  // Note Google (migration 20260730_partner_google_rating), relevée par
  // Places API. `google_rating_at` sans note = fiche cherchée, non trouvée.
  google_place_id?: string | null;
  google_rating?: number | null;
  google_rating_count?: number | null;
  google_maps_url?: string | null;
  google_rating_at?: string | null;
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
  invites: number;       // invitations reçues (car_quote_invites)
  won: number;           // devis gagnés (quoted_by_partner_id)
  rented: number;        // locations effectuées
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

// NB : l'issue est saisissable sur TOUTE demande non classée (y compris
// `sent` morte sans devis et `email_failed`) : constat a posteriori, l'UI
// teste simplement `outcome == null`. L'ancien gate canSetOutcome
// (quoted|accepted) rendait les vieilles demandes relais inclassables à vie
// (audit UI 05/07).

export const ZONE_IDS: string[] = CAR_ZONES.map((z) => z.id);

/** null = OK, sinon message d'erreur (la server action redirige avec ?error=, la page l'affiche en bandeau). */
export function validatePartnerUpdate(u: { zone_ids: string[]; commission: number }): string | null {
  if (!Array.isArray(u.zone_ids) || u.zone_ids.length === 0) return "At least one zone required";
  if (u.zone_ids.some((z) => !ZONE_IDS.includes(z))) return "Unknown zone";
  if (typeof u.commission !== "number" || Number.isNaN(u.commission) || u.commission < 0 || u.commission > 0.5) {
    return "Commission out of range (0-0.5)";
  }
  return null;
}

export interface WaLeadFields {
  partnerFirstName: string;
  pickupLabel: string;
  dateFrom: string;
  timeFrom?: string | null;
  flightNo?: string | null;
  dateTo: string;
  timeTo?: string | null;
  carTypeLabel: string;
  pax?: number | null;
  customerName: string;
  customerContact: string; // téléphone sinon email
}

/** Message WhatsApp relais (champs convenus avec l'agence) : source UNIQUE
 *  du format, consommée par email.ts (mode relay) et la page admin. */
export function buildCarWaMessage(f: WaLeadFields): string {
  return [
    `Hi ${f.partnerFirstName}, new rental request:`,
    `${f.pickupLabel}, ${f.dateFrom}${f.timeFrom ? ` ${f.timeFrom}` : ""}${f.flightNo ? ` (flight ${f.flightNo})` : ""} to ${f.dateTo}${f.timeTo ? ` ${f.timeTo}` : ""}`,
    `${f.carTypeLabel}, ${f.pax ?? "?"} people`,
    `Guest: ${f.customerName}, ${f.customerContact}`,
  ].join("\n");
}

export const waHref = (phoneOrWhatsapp: string, message: string): string =>
  `https://wa.me/${phoneOrWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
