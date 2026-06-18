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
