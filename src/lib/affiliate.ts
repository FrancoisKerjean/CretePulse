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
