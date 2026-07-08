import { createHash, randomBytes } from "node:crypto";

export const AFFILIATE_DEFAULT_COMMISSION_PCT = 15;

export const CATEGORIES = [
  { id: "hotel", label: "Hotel / accommodation" },
  { id: "tour", label: "Tour / excursion" },
  { id: "beach_club", label: "Beach club" },
  { id: "car_rental", label: "Car rental" },
  { id: "restaurant", label: "Restaurant" },
  { id: "activity", label: "Activity / experience" },
  { id: "taxi", label: "Taxi / transfer" },
  { id: "other", label: "Other" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const AREAS = ["heraklion", "chania", "rethymnon", "lassithi", "other"] as const;
export type Area = (typeof AREAS)[number];

const SLUG_MAX = 60;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

const CODE_BASE_MAX = 10;

/** First free slug: base, then base-2, base-3, … `exists` is injected for testability. */
export async function buildUniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name) || "partner";
  if (!(await exists(base))) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
}

/** Uppercase hex random suffix of length n (default 4). */
export function randomSuffix(n = 4): string {
  return randomBytes(n).toString("hex").toUpperCase().slice(0, n);
}

/** Promo code: compacted uppercased slug (max 10 chars, whole words) + "-" + suffix. */
export function genCodePromo(slug: string, suffix: string): string {
  const words = slug.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  let base = "";
  for (const word of words) {
    if ((base + word).length > CODE_BASE_MAX) break;
    base += word;
  }
  if (!base) base = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_BASE_MAX);
  return `${base}-${suffix}`;
}

/** SHA-256 of salt+ip → hex. Never store the raw IP (GDPR). */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Segments an affiliate by category for email copy and commission logic.
 * - "quotable" : tour | activity | taxi → booking-referral model, 15% commission on accepted quotes.
 * - "vitrine"  : everything else (restaurant, cafe, bar, hotel, beach_club, car_rental, other, unknown)
 *                → free visibility on the map, no commission.
 *
 * This is the SINGLE source of truth for the segmentation.
 * NOTE: "transfer" is NOT a valid CATEGORIES id (the taxi/transfer entry uses id="taxi").
 */
export function affiliateClass(category: string): "vitrine" | "quotable" {
  const c = category.toLowerCase().trim();
  if (c === "tour" || c === "activity" || c === "taxi") return "quotable";
  return "vitrine";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ACTIVITY_SUB_CATEGORIES = ["food_tours", "boat_trips", "hiking", "other"] as const;
export type ActivitySubCategory = (typeof ACTIVITY_SUB_CATEGORIES)[number];

export interface RegisterData {
  name: string;
  category: CategoryId;
  category_other: string | null;
  area: Area;
  email: string;
  redirect_url: string;
  sub_category?: string;
}

export type ValidationResult =
  | { ok: true; data: RegisterData }
  | { ok: false; error: string };

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateRegisterPayload(body: Record<string, unknown>): ValidationResult {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const category = String(body.category ?? "");
  const area = String(body.area ?? "");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const redirect_url = typeof body.redirect_url === "string" ? body.redirect_url.trim() : "";
  const category_other =
    typeof body.category_other === "string" && body.category_other.trim()
      ? body.category_other.trim().slice(0, 120)
      : null;

  // sub_category : accepté seulement parmi les valeurs connues — ignoré sinon (ne bloque pas).
  const sub_category_raw =
    typeof body.sub_category === "string" ? body.sub_category.trim() : undefined;
  const sub_category =
    sub_category_raw &&
    (ACTIVITY_SUB_CATEGORIES as readonly string[]).includes(sub_category_raw)
      ? sub_category_raw
      : undefined;

  if (body.accept !== true) return { ok: false, error: "Terms not accepted" };
  if (!name) return { ok: false, error: "Missing name" };
  if (!(CATEGORIES as readonly { id: string }[]).some((c) => c.id === category))
    return { ok: false, error: "Invalid category" };
  if (!(AREAS as readonly string[]).includes(area)) return { ok: false, error: "Invalid area" };
  if (!EMAIL_REGEX.test(email)) return { ok: false, error: "Invalid email" };
  if (!isHttpUrl(redirect_url)) return { ok: false, error: "Invalid booking URL" };

  return {
    ok: true,
    data: { name, category: category as CategoryId, category_other, area: area as Area, email, redirect_url, sub_category },
  };
}
