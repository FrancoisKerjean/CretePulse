// Validation + construction de la demande d'activité, PURE (zéro I/O),
// pattern car-lead.ts. La route ne garde que l'orchestration I/O.
import { isCategorySlug, isCitySlug, isTimeslot, isGuideLanguage } from "./activity-taxonomy.ts";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ActivityRequestRow = {
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
  source: string | null;
  status: string;
};

export type ActivityLeadResult =
  | { kind: "honeypot" }
  | { kind: "error"; status: number; error: string }
  | { kind: "ok"; row: ActivityRequestRow };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** todayIso injectable pour les tests (défaut : date du jour UTC). */
export function validateActivityLead(
  body: Record<string, unknown>,
  todayIso: string = new Date().toISOString().slice(0, 10),
): ActivityLeadResult {
  if (body.website && String(body.website).trim() !== "") return { kind: "honeypot" };

  const category = String(body.category ?? "");
  const city = String(body.city ?? "");
  const date = String(body.date ?? "");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const adults = Number(body.adults);
  const children = body.children == null || body.children === "" ? 0 : Number(body.children);

  if (!isCategorySlug(category) || !isCitySlug(city) || !name || !EMAIL_REGEX.test(email)) {
    return { kind: "error", status: 422, error: "Invalid request" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayIso) {
    return { kind: "error", status: 422, error: "Invalid date" };
  }
  if (!Number.isInteger(adults) || adults < 1 || adults > 20) {
    return { kind: "error", status: 422, error: "Invalid participants" };
  }
  if (!Number.isInteger(children) || children < 0 || children > 20) {
    return { kind: "error", status: 422, error: "Invalid participants" };
  }

  const row: ActivityRequestRow = {
    locale: typeof body.locale === "string" ? body.locale : "en",
    category_slug: category,
    city,
    activity_date: date,
    timeslot: isTimeslot(body.timeslot) ? body.timeslot : null,
    adults,
    children,
    preferred_language: isGuideLanguage(body.language) ? body.language : null,
    customer_name: name,
    customer_email: email,
    customer_phone: str(body.phone),
    note: str(body.note)?.slice(0, 500) ?? null,
    source: str(body.source),
    status: "sent",
  };
  return { kind: "ok", row };
}
