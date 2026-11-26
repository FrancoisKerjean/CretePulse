/**
 * Catalogue de prix des loueurs partenaires : calcul pur d'un prix à partir
 * d'une grille (table `car_partner_rates`). Aucun I/O, aucun import serveur.
 */
import { rentalDays } from "./car-pricing";

export const CAR_CATEGORIES = ["city", "compact", "sedan", "automatic", "suv"] as const;
export type CarCategory = (typeof CAR_CATEGORIES)[number];

export interface RateRow {
  category: CarCategory;
  period_from: string;
  period_to: string;
  min_days: number;
  eur_per_day: number;
  source?: string | null;
}

export interface CatalogueConditions {
  models?: Partial<Record<CarCategory, { model: string; gearbox: "manual" | "automatic" | null }>>;
  inclusions?: string[];
  deposit_hold_eur?: number | null;
  child_seat_eur_day?: number | null;
  delivery_fees?: Record<string, number>;
  cancellation_terms?: string | null;
}

export interface CatalogueRequest {
  category: string;
  pickupSlug: string;
  dateFrom: string;
  dateTo: string;
  timeFrom?: string | null;
  timeTo?: string | null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** ms UTC d'une date ISO réelle, null si format faux ou date impossible (2027-02-30). */
function isoToUtc(s: string): number | null {
  if (!ISO_DATE.test(s)) return null;
  const ms = Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return new Date(ms).toISOString().slice(0, 10) === s ? ms : null;
}

const isCategory = (c: string): c is CarCategory => (CAR_CATEGORIES as readonly string[]).includes(c);

/**
 * Pour chaque jour de la location, la ligne retenue : parmi les lignes de la
 * catégorie dont la période contient ce jour et dont min_days <= durée totale,
 * celle au min_days le plus grand. null dès qu'un jour n'a aucune ligne.
 */
function linesForStay(
  rates: RateRow[],
  category: string,
  dateFrom: string,
  days: number,
): RateRow[] | null {
  const start = isoToUtc(dateFrom);
  if (start == null) return null;
  const pool = rates.filter((r) => r.category === category && r.min_days <= days);
  const lines: RateRow[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
    let best: RateRow | null = null;
    for (const r of pool) {
      if (r.period_from <= day && day <= r.period_to && (!best || r.min_days > best.min_days)) best = r;
    }
    if (!best) return null;
    lines.push(best);
  }
  return lines;
}

export function catalogueQuote(
  rates: RateRow[],
  conditions: CatalogueConditions | null,
  req: CatalogueRequest,
): { total: number; days: number } | null {
  const days = rentalDays(req.dateFrom, req.dateTo, req.timeFrom, req.timeTo);
  const lines = linesForStay(rates, req.category, req.dateFrom, days);
  if (!lines) return null;
  const sum = lines.reduce((acc, l) => acc + l.eur_per_day, 0);
  const delivery = conditions?.delivery_fees?.[req.pickupSlug] ?? 0;
  return { total: round2(sum + delivery), days };
}

/** Prix par jour le plus bas parmi les lignes utilisées pour ces dates, livraison exclue. */
export function fromPricePerDay(
  rates: RateRow[],
  req: Omit<CatalogueRequest, "category" | "pickupSlug">,
  category: CarCategory,
): number | null {
  const days = rentalDays(req.dateFrom, req.dateTo, req.timeFrom, req.timeTo);
  const lines = linesForStay(rates, category, req.dateFrom, days);
  return lines ? Math.min(...lines.map((l) => l.eur_per_day)) : null;
}

/** Acompte = round2(total x taux). null sous 0,50 EUR (minimum Stripe) ou taux hors ]0, 1[. */
export function depositEur(total: number, rate: number): number | null {
  if (!Number.isFinite(total) || !Number.isFinite(rate) || rate <= 0 || rate >= 1) return null;
  const d = round2(total * rate);
  return d < 0.5 ? null : d;
}

/** Valide et normalise les lignes d'un formulaire JSON (nombres et dates peuvent arriver en chaînes). */
export function validateRatesInput(
  raw: unknown,
): { ok: true; rows: RateRow[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(raw)) return { ok: false, errors: ["La grille doit être une liste de lignes."] };
  const errors: string[] = [];
  const rows: RateRow[] = [];
  const ranges: { from: number; to: number }[] = [];

  raw.forEach((item, idx) => {
    const n = idx + 1;
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const err = (msg: string) => errors.push(`Ligne ${n} : ${msg}`);
    const before = errors.length;

    const category = typeof o.category === "string" ? o.category : "";
    if (!isCategory(category)) err("catégorie inconnue.");

    const from = typeof o.period_from === "string" ? isoToUtc(o.period_from) : null;
    const to = typeof o.period_to === "string" ? isoToUtc(o.period_to) : null;
    if (from == null || to == null) err("date invalide (format AAAA-MM-JJ attendu).");
    else if (from > to) err("période à l'envers.");

    const minRaw = typeof o.min_days === "string" && o.min_days.trim() !== "" ? Number(o.min_days) : o.min_days;
    if (typeof minRaw !== "number" || !Number.isInteger(minRaw) || minRaw < 1) err("palier minimum invalide (entier ≥ 1).");

    const eurRaw = typeof o.eur_per_day === "string" && o.eur_per_day.trim() !== "" ? Number(o.eur_per_day) : o.eur_per_day;
    if (typeof eurRaw !== "number" || !Number.isFinite(eurRaw) || eurRaw <= 0 || eurRaw > 1000) err("prix par jour invalide (entre 0 et 1000 €).");

    if (errors.length > before) return;
    rows.push({
      category: category as CarCategory,
      period_from: o.period_from as string,
      period_to: o.period_to as string,
      min_days: minRaw as number,
      eur_per_day: eurRaw as number,
      source: typeof o.source === "string" && o.source !== "" ? o.source : null,
    });
    ranges.push({ from: from as number, to: to as number });
  });

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      if (a.category !== b.category) continue;
      if (a.period_from === b.period_from && a.min_days === b.min_days) {
        errors.push(`Doublon : ${a.category}, début ${a.period_from}, palier ${a.min_days} jours.`);
      } else if (a.min_days === b.min_days && ranges[i].from <= ranges[j].to && ranges[j].from <= ranges[i].to) {
        errors.push(`Chevauchement : ${a.category}, palier ${a.min_days} jours, ${a.period_from} et ${b.period_from}.`);
      }
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, rows };
}
