// Validation + construction de la demande de location de voiture, PURE (zéro
// I/O) · extraite de api/car-rental/submit/route.ts pour être testable
// (scripts/check-car-lead.mjs). La route ne garde que l'orchestration I/O
// (dédup / insert / email Supabase). Importe uniquement des modules node-safe
// (pas de next/react/@components) pour rester exécutable par les check-*.mjs.
import { zoneForPickup, type CarZone } from "./car-partners.ts";
import { CAR_TYPES_DATA, type CarTypeData } from "./car-types-data.ts";
import { SLUG_COORDS } from "./taxi-fare.ts";
import { isChildSeatKey } from "./car-child-seats.ts";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Un numéro sur lequel le loueur peut réellement rappeler.
 *
 *  Le loueur reçoit les coordonnées APRÈS acceptation : sans téléphone, sa seule
 *  voie est un email vers un inconnu, qui part en spam. Zakros Tours l'a signalé
 *  le 07/08/2026 après 9 jours de silence de son client sur la demande 33.
 *
 *  Seuil bas (6 chiffres) : recale « - », « n/a » ou « 00 » sans jamais refuser
 *  un vrai numéro, les plans de numérotation nationaux les plus courts font 7.
 *
 *  ⛔ Le wizard DOIT appeler cette fonction, pas réimplémenter la règle : deux
 *  implémentations divergent, et le client se prend un 422 sans savoir pourquoi. */
export function isCallablePhone(phone: string | null | undefined): boolean {
  return (phone ?? "").replace(/\D/g, "").length >= 6;
}

/** Le numéro à retenir quand le client accepte une offre, ou un refus.
 *
 *  Exigé ICI et nulle part avant : le loueur en appel d'offres reçoit une
 *  demande aveugle, le numéro ne lui sert qu'après acceptation. À ce moment le
 *  client a choisi un prix, il est engagé, et un champ de plus ne lui fait pas
 *  abandonner ce qu'il vient de décider. Le volume de demandes n'est pas touché.
 *
 *  Un numéro déjà stocké ET rappelable prime : on ne redemande rien aux 62 %
 *  qui l'ont déjà donné. Un numéro stocké inutilisable (« - » d'une demande
 *  ancienne, où le champ était libre) se fait remplacer plutôt que propager. */
export function resolveAcceptPhone(
  existing: string | null | undefined,
  submitted: string | null | undefined,
): { ok: true; phone: string } | { ok: false } {
  const stocke = (existing ?? "").trim();
  if (isCallablePhone(stocke)) return { ok: true, phone: stocke };
  const saisi = (submitted ?? "").trim();
  if (isCallablePhone(saisi)) return { ok: true, phone: saisi };
  return { ok: false };
}

export const carPickupLabel = (slug: string): string =>
  slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

/** Libellé du type de véhicule enrichi de quelques modèles concrets, pour que
 *  le loueur/le client visualisent la catégorie (ex. « Compact (VW Polo,
 *  Peugeot 208) »). Modèles = universels, pas de « e.g. » (multilingue). */
export function carTypeLabelWithExamples(ct: CarTypeData | undefined, locale: string, fallback = ""): string {
  if (!ct) return fallback;
  const label = ct.labels[locale] ?? ct.labels.en;
  return ct.examples.length ? `${label} (${ct.examples.slice(0, 3).join(", ")})` : label;
}

export type CarRequestRow = {
  locale: string;
  pickup_slug: string;
  zone_id: string;
  partner_name: string | null;  // rempli au moment où un loueur gagne l'appel d'offres
  partner_email: string | null;
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
  insurance: string | null;      // 'full' | 'basic' | null (peu importe)
  payment_method: string | null; // 'cash' | 'card' | null (peu importe)
  gearbox: string | null;        // 'automatic' | 'manual' | null (peu importe)
  child_seats: string[];         // clés de car-child-seats (jsonb array, [] si aucun)
  source: string | null;
  status: string;
};

export type CarLeadResult =
  | { kind: "honeypot" }
  | { kind: "error"; status: number; error: string }
  | { kind: "ok"; zone: CarZone; carType: CarTypeData; row: CarRequestRow };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const isTime = (v: string | null): v is string => !!v && /^\d{2}:\d{2}$/.test(v);

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
  const zone = zoneForPickup(pickup);

  // La couverture réelle (un loueur actif existe dans la zone) est vérifiée par
  // la route sur le registre DB (car_partners) : ici on ne valide que la forme.
  if (!zone || !SLUG_COORDS[pickup] || !carType || !name || !EMAIL_REGEX.test(email)) {
    return { kind: "error", status: 422, error: "Invalid request" };
  }
  // ⛔ Le téléphone n'est PAS exigé ICI, volontairement. Le loueur en appel
  // d'offres reçoit une demande AVEUGLE (leadSummary includeContact=false) :
  // le numéro ne lui sert a rien avant que le client n'accepte un devis, et
  // l'exiger a l'entree ferait payer 38 % des demandes pour une donnee qui
  // dort en base. Il est exige a l'acceptation : voir resolveAcceptPhone.
  const phone = str(body.phone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo) || dateTo < dateFrom) {
    return { kind: "error", status: 422, error: "Invalid dates" };
  }
  const timeFrom = str(body.timeFrom);
  const timeTo = str(body.timeTo);
  if (!isTime(timeFrom) || !isTime(timeTo)) {
    return { kind: "error", status: 422, error: "Invalid times" };
  }
  if (dateTo === dateFrom && timeTo <= timeFrom) {
    return { kind: "error", status: 422, error: "Invalid times" };
  }

  const row: CarRequestRow = {
    locale: typeof body.locale === "string" ? body.locale : "en",
    pickup_slug: pickup,
    zone_id: zone.id,
    partner_name: null,  // inconnu tant qu'un loueur n'a pas gagné l'appel d'offres
    partner_email: null,
    date_from: dateFrom,
    time_from: timeFrom,
    date_to: dateTo,
    time_to: timeTo,
    flight_no: str(body.flightNo),
    car_type: carType.id,
    pax: Number.isInteger(body.pax) ? (body.pax as number) : null,
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    note: str(body.note)?.slice(0, 500) ?? null,
    insurance: body.insurance === "full" || body.insurance === "basic" ? body.insurance : null,
    payment_method: body.payment === "cash" || body.payment === "card" ? body.payment : null,
    gearbox: body.gearbox === "automatic" || body.gearbox === "manual" ? body.gearbox : null,
    child_seats: Array.isArray(body.childSeats) ? body.childSeats.filter(isChildSeatKey) : [],
    source: str(body.source),
    status: "sent",
  };

  return { kind: "ok", zone, carType, row };
}
