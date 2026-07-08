/**
 * Estimation de prix location de voiture — grille INDICATIVE marche Crete.
 *
 * Sources (03/07/2026) : rental-center-crete.com (moyennes par categorie/mois),
 * KAYAK (dec ~12€/j -> aout ~42€/j), market comparators. Ce NE SONT PAS les
 * tarifs Auto Smart : le partenaire ne publie aucune grille (devis au cas par
 * cas). A afficher donc comme "estimation indicative, prix final confirme par
 * l'agence", et a remplacer par la grille reelle du partenaire des qu'elle est
 * disponible. Categories = groupes Auto Smart A-E (city/compact/sedan/automatic/suv).
 */

export type CarSeason = "low" | "shoulder" | "high" | "peak";

/** €/jour [min, max] par categorie x saison. */
export const CAR_PRICE_GRID: Record<string, Record<CarSeason, [number, number]>> = {
  city: { low: [15, 20], shoulder: [22, 28], high: [30, 38], peak: [38, 50] },
  compact: { low: [18, 24], shoulder: [26, 33], high: [35, 45], peak: [45, 60] },
  sedan: { low: [24, 30], shoulder: [32, 40], high: [42, 52], peak: [52, 68] },
  automatic: { low: [28, 35], shoulder: [38, 48], high: [50, 62], peak: [62, 80] },
  suv: { low: [30, 38], shoulder: [42, 52], high: [55, 70], peak: [70, 90] },
};

/** Mois (1-12) -> saison. Meme decoupage saisonnier que le modele ADR Kairos. */
export function seasonForMonth(month: number): CarSeason {
  if (month === 7 || month === 8) return "peak";
  if (month === 6 || month === 9) return "high";
  if (month === 5 || month === 10) return "shoulder";
  return "low"; // nov-avr
}

export interface CarPriceEstimate {
  season: CarSeason;
  days: number;
  perDayLow: number;
  perDayHigh: number;
  totalLow: number;
  totalHigh: number;
}

/** Degressif duree observe sur le marche (longues locations moins cheres/jour). */
function durationFactor(days: number): number {
  if (days >= 14) return 0.8;
  if (days >= 7) return 0.9;
  return 1;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Nombre de jours de location (min 1) entre deux dates ISO locales. */
export function rentalDays(dateFrom: string, dateTo: string): number {
  if (!ISO_DATE.test(dateFrom) || !ISO_DATE.test(dateTo)) return 1;
  const from = new Date(`${dateFrom}T00:00:00`).getTime();
  const to = new Date(`${dateTo}T00:00:00`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 1;
  const diff = Math.round((to - from) / 86_400_000);
  return Math.max(1, diff);
}

/**
 * Estimation indicative pour une categorie + une periode. Retourne null si la
 * categorie est inconnue ou la date de debut invalide (l'appelant n'affiche rien).
 */
export function estimateCarPrice(
  carType: string,
  dateFrom: string,
  dateTo: string,
): CarPriceEstimate | null {
  const grid = CAR_PRICE_GRID[carType];
  if (!grid || !ISO_DATE.test(dateFrom)) return null;
  const month = Number(dateFrom.slice(5, 7));
  const season = seasonForMonth(month);
  const [lo, hi] = grid[season];
  const days = rentalDays(dateFrom, dateTo);
  const f = durationFactor(days);
  const perDayLow = Math.round(lo * f);
  const perDayHigh = Math.round(hi * f);
  return {
    season,
    days,
    perDayLow,
    perDayHigh,
    totalLow: perDayLow * days,
    totalHigh: perDayHigh * days,
  };
}
