/**
 * Catalogue de prix des loueurs partenaires : calcul pur d'un prix à partir
 * d'une grille (table `car_partner_rates`). Aucun I/O, aucun import serveur.
 */
import { rentalDays } from "./car-pricing";
import { CAR_ZONES } from "./car-partners";
import { isInclusionKey } from "./car-inclusions";

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

const MAX_RATE_ROWS = 200;
const MAX_SOURCE = 120;

const round2 = (n: number): number => Math.round(n * 100) / 100;
const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** ms UTC d'une date ISO réelle, null si format faux ou date impossible (2027-02-30). */
export function isoToUtc(s: string): number | null {
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
  if (!Array.isArray(raw)) return { ok: false, errors: ["The price grid must be a list of lines."] };
  if (raw.length > MAX_RATE_ROWS) return { ok: false, errors: [`Too many lines (${MAX_RATE_ROWS} maximum).`] };
  const errors: string[] = [];
  const rows: RateRow[] = [];
  const ranges: { from: number; to: number }[] = [];

  raw.forEach((item, idx) => {
    const n = idx + 1;
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const err = (msg: string) => errors.push(`Line ${n}: ${msg}`);
    const before = errors.length;

    const category = typeof o.category === "string" ? o.category : "";
    if (!isCategory(category)) err("unknown category.");

    const from = typeof o.period_from === "string" ? isoToUtc(o.period_from) : null;
    const to = typeof o.period_to === "string" ? isoToUtc(o.period_to) : null;
    if (from == null || to == null) err("invalid date (format YYYY-MM-DD expected).");
    else if (from > to) err("the period ends before it starts.");

    const minRaw = typeof o.min_days === "string" && o.min_days.trim() !== "" ? Number(o.min_days) : o.min_days;
    if (typeof minRaw !== "number" || !Number.isInteger(minRaw) || minRaw < 1) err("invalid minimum days (whole number, 1 or more).");

    const eurRaw = typeof o.eur_per_day === "string" && o.eur_per_day.trim() !== "" ? Number(o.eur_per_day) : o.eur_per_day;
    if (typeof eurRaw !== "number" || !Number.isFinite(eurRaw) || eurRaw <= 0 || eurRaw > 1000) err("invalid price per day (between 0 and 1000 EUR).");

    if (errors.length > before) return;
    rows.push({
      category: category as CarCategory,
      period_from: o.period_from as string,
      period_to: o.period_to as string,
      min_days: minRaw as number,
      eur_per_day: eurRaw as number,
      source: typeof o.source === "string" && o.source !== "" ? o.source.slice(0, MAX_SOURCE) : null,
    });
    ranges.push({ from: from as number, to: to as number });
  });

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      if (a.category !== b.category) continue;
      if (a.period_from === b.period_from && a.min_days === b.min_days) {
        errors.push(`Duplicate: ${a.category}, start ${a.period_from}, minimum ${a.min_days} days.`);
      } else if (a.min_days === b.min_days && ranges[i].from <= ranges[j].to && ranges[j].from <= ranges[i].to) {
        errors.push(`Overlap: ${a.category}, minimum ${a.min_days} days, periods starting ${a.period_from} and ${b.period_from}.`);
      }
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, rows };
}

/** Version courante des conditions partenaire (le texte vit sur /en/car-partner-terms). */
export const CAR_TERMS_VERSION = "2027-01";

/** Un loueur n'est réservable que s'il a accepté la version COURANTE des conditions. */
export function isPartnerBookable(p: {
  terms_version: string | null;
  terms_accepted_at: string | null;
}): boolean {
  return p.terms_version === CAR_TERMS_VERSION && !!p.terms_accepted_at;
}

const PICKUP_SLUGS: string[] = CAR_ZONES.flatMap((z) => z.pickups);
const MAX_TEXT = 300;
const MAX_MONEY = 10_000;

/** Valide et normalise les conditions communes saisies par le loueur (null accepté : aucune condition). */
export function validateConditionsInput(
  raw: unknown,
): { ok: true; conditions: CatalogueConditions } | { ok: false; errors: string[] } {
  if (raw == null) return { ok: true, conditions: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, errors: ["Invalid conditions."] };
  const o = raw as Record<string, unknown>;
  const errors: string[] = [];
  const out: CatalogueConditions = {};

  const money = (v: unknown, label: string): number | null | undefined => {
    if (v == null || v === "") return null;
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > MAX_MONEY) {
      errors.push(`${label}: invalid amount (between 0 and ${MAX_MONEY} EUR).`);
      return undefined;
    }
    return n;
  };
  const text = (v: unknown, label: string): string | null | undefined => {
    if (v == null) return null;
    if (typeof v !== "string") { errors.push(`${label}: text expected.`); return undefined; }
    const t = v.trim();
    if (t.length > MAX_TEXT) { errors.push(`${label}: ${MAX_TEXT} characters maximum.`); return undefined; }
    return t || null;
  };

  if (o.models != null) {
    if (typeof o.models !== "object" || Array.isArray(o.models)) errors.push("Invalid models.");
    else {
      const models: NonNullable<CatalogueConditions["models"]> = {};
      for (const [cat, v] of Object.entries(o.models as Record<string, unknown>)) {
        if (!isCategory(cat)) { errors.push(`Models: unknown category "${cat}".`); continue; }
        const m = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
        const model = text(m.model, `Model ${cat}`);
        const gb = m.gearbox ?? null;
        if (gb !== null && gb !== "manual" && gb !== "automatic") { errors.push(`Model ${cat}: invalid gearbox.`); continue; }
        if (model) models[cat] = { model, gearbox: gb };
      }
      out.models = models;
    }
  }
  if (o.inclusions != null) {
    if (!Array.isArray(o.inclusions) || !o.inclusions.every(isInclusionKey)) errors.push("Unknown inclusions.");
    else out.inclusions = [...new Set(o.inclusions as string[])];
  }
  if ("deposit_hold_eur" in o) { const v = money(o.deposit_hold_eur, "Deposit"); if (v !== undefined) out.deposit_hold_eur = v; }
  if ("child_seat_eur_day" in o) { const v = money(o.child_seat_eur_day, "Child seat"); if (v !== undefined) out.child_seat_eur_day = v; }
  if (o.delivery_fees != null) {
    if (typeof o.delivery_fees !== "object" || Array.isArray(o.delivery_fees)) errors.push("Invalid delivery fees.");
    else {
      const fees: Record<string, number> = {};
      for (const [slug, v] of Object.entries(o.delivery_fees as Record<string, unknown>)) {
        if (!PICKUP_SLUGS.includes(slug)) { errors.push(`Delivery: unknown pickup point "${slug}".`); continue; }
        if (v == null || v === "") continue;
        const n = money(v, `Delivery ${slug}`);
        if (typeof n === "number") fees[slug] = n;
      }
      out.delivery_fees = fees;
    }
  }
  if ("cancellation_terms" in o) { const v = text(o.cancellation_terms, "Cancellation terms"); if (v !== undefined) out.cancellation_terms = v; }

  return errors.length ? { ok: false, errors } : { ok: true, conditions: out };
}
