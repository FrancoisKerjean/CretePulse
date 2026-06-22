// Validation + construction de la demande de location de voiture, PURE (zéro
// I/O) · extraite de api/car-rental/submit/route.ts pour être testable
// (scripts/check-car-lead.mjs). La route ne garde que l'orchestration I/O
// (dédup / insert / email Supabase). Importe uniquement des modules node-safe
// (pas de next/react/@components) pour rester exécutable par les check-*.mjs.
import { partnerForPickup, type CarPartner, type CarZone } from "./car-partners.ts";
import { CAR_TYPES_DATA, type CarTypeData } from "./car-types-data.ts";
import { SLUG_COORDS } from "./taxi-fare.ts";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const carPickupLabel = (slug: string): string =>
  slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export type CarRequestRow = {
  locale: string;
  pickup_slug: string;
  zone_id: string;
  partner_name: string;
  partner_email: string;
  date_from: string;
  time_from: string | null;
  date_to: string;
  time_to: string | null;
  flight_no: string | null;
  car_type: string;
  pax: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  note: string | null;
  source: string | null;
  status: string;
};

export type CarLeadResult =
  | { kind: "honeypot" }
  | { kind: "error"; status: number; error: string }
  | { kind: "ok"; partner: CarPartner & { zone: CarZone }; carType: CarTypeData; row: CarRequestRow };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Valide la requête brute et construit la ligne car_requests. Zéro I/O :
 *  la dédup, l'insert et l'email restent dans la route. */
export function validateCarLead(body: Record<string, unknown>): CarLeadResult {
  // Honeypot : champ caché rempli => bot, succès silencieux (aucun envoi).
  if (body.website && String(body.website).trim() !== "") return { kind: "honeypot" };

  const pickup = String(body.pickup ?? "");
  const carType = CAR_TYPES_DATA.find((c) => c.id === body.carType);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const dateFrom = String(body.dateFrom ?? "");
  const dateTo = String(body.dateTo ?? "");
  const partner = partnerForPickup(pickup);

  if (!partner) return { kind: "error", status: 400, error: "No partner in this area yet" };
  if (!SLUG_COORDS[pickup] || !carType || !name || !EMAIL_REGEX.test(email)) {
    return { kind: "error", status: 422, error: "Invalid request" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo) || dateTo < dateFrom) {
    return { kind: "error", status: 422, error: "Invalid dates" };
  }

  const row: CarRequestRow = {
    locale: typeof body.locale === "string" ? body.locale : "en",
    pickup_slug: pickup,
    zone_id: partner.zone.id,
    partner_name: partner.name,
    partner_email: partner.email,
    date_from: dateFrom,
    time_from: str(body.timeFrom),
    date_to: dateTo,
    time_to: str(body.timeTo),
    flight_no: str(body.flightNo),
    car_type: carType.id,
    pax: Number.isInteger(body.pax) ? (body.pax as number) : null,
    customer_name: name,
    customer_email: email,
    customer_phone: str(body.phone),
    note: str(body.note)?.slice(0, 500) ?? null,
    source: str(body.source),
    status: "sent",
  };

  return { kind: "ok", partner, carType, row };
}
