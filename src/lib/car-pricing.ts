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
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Minutes ecoulees depuis minuit, null si l'heure n'a pas le format de la base. */
function minutesOfDay(time: string | null | undefined): number | null {
  if (typeof time !== "string" || !HH_MM.test(time)) return null;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/**
 * Nombre de jours de location (min 1) entre deux dates ISO locales.
 *
 * Les heures sont facultatives mais decisives : une journee de location court
 * d'heure a heure, donc toute journee entamee est due. Rendre a 08:00 une
 * voiture prise a 01:30 cinq jours plus tot fait six jours de location, pas
 * cinq. Sans elles on ne peut que compter les dates, ce que font les demandes
 * anterieures a la saisie obligatoire de l'heure.
 *
 * La journee entamee se deduit de la comparaison de deux heures murales, jamais
 * d'un ecart en millisecondes : un passage a l'heure d'hiver ajoute une heure a
 * l'ecart brut et ferait facturer un jour de plus.
 */
export function rentalDays(
  dateFrom: string,
  dateTo: string,
  timeFrom?: string | null,
  timeTo?: string | null,
): number {
  if (!ISO_DATE.test(dateFrom) || !ISO_DATE.test(dateTo)) return 1;
  const from = new Date(`${dateFrom}T00:00:00`).getTime();
  const to = new Date(`${dateTo}T00:00:00`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 1;
  const calendarDays = Math.round((to - from) / 86_400_000);
  const startMin = minutesOfDay(timeFrom);
  const endMin = minutesOfDay(timeTo);
  const startedDay = startMin != null && endMin != null && endMin > startMin ? 1 : 0;
  return Math.max(1, calendarDays + startedDay);
}

/**
 * Ce loueur accepte-t-il une location de cette duree ?
 *
 * ⛔ `null` N'EXCLUT PAS. La colonne `car_partners.min_days` existe depuis le
 * 11/08/2026 et valait NULL sur les 11 loueurs le lendemain : un NULL traite
 * comme 0 minimum viderait chaque appel d'offres. Inconnu veut dire « pas de
 * contrainte connue », jamais « aucune location acceptee ».
 *
 * ⛔ Une valeur aberrante n'exclut pas non plus. La saisie admin borne a 1..30,
 * mais la colonne est un integer nu : une ecriture directe en base ne doit pas
 * pouvoir fermer le tunnel en silence. Seul un entier >= 1 filtre.
 */
export function meetsMinDays(minDays: number | null | undefined, days: number): boolean {
  if (minDays == null || !Number.isInteger(minDays) || minDays < 1) return true;
  return days >= minDays;
}

/**
 * Prix par jour d'un total saisi, arrondi au dixieme. Sert a renvoyer au loueur
 * ce qu'il est en train de vendre pendant qu'il tape son prix : il saisit un
 * TOTAL et raisonne en journalier, ecart d'ou naissent les erreurs de duree.
 * Retourne null sur une saisie inexploitable (l'appelant n'affiche rien plutot
 * que d'afficher un repere faux).
 */
export function perDayAmount(totalPrice: number, days: number): number | null {
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) return null;
  if (!Number.isInteger(days) || days < 1) return null;
  return Math.round((totalPrice / days) * 10) / 10;
}

/**
 * Estimation indicative pour une categorie + une periode. Retourne null si la
 * categorie est inconnue ou la date de debut invalide (l'appelant n'affiche rien).
 */
export function estimateCarPrice(
  carType: string,
  dateFrom: string,
  dateTo: string,
  timeFrom?: string | null,
  timeTo?: string | null,
): CarPriceEstimate | null {
  const grid = CAR_PRICE_GRID[carType];
  if (!grid || !ISO_DATE.test(dateFrom)) return null;
  const month = Number(dateFrom.slice(5, 7));
  const season = seasonForMonth(month);
  const [lo, hi] = grid[season];
  const days = rentalDays(dateFrom, dateTo, timeFrom, timeTo);
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
