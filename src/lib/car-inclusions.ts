// Inclusions optionnelles d'un devis loueur. Stockées en base comme clés
// canoniques (jsonb array) ; libellés traduits à l'affichage.
import { formatEur } from "./car-format.ts";

export const CAR_INCLUSION_KEYS = [
  "basic_insurance", "unlimited_km", "second_driver",
  "free_cancellation", "child_seat", "airport_pickup",
] as const;

export type CarInclusionKey = (typeof CAR_INCLUSION_KEYS)[number];

export function isInclusionKey(v: unknown): v is CarInclusionKey {
  return typeof v === "string" && (CAR_INCLUSION_KEYS as readonly string[]).includes(v);
}

// Libellés client (4 langues : en/fr/de/el).
export const CAR_INCLUSION_LABELS: Record<string, Record<CarInclusionKey, string>> = {
  en: { basic_insurance: "Basic insurance included", unlimited_km: "Unlimited mileage", second_driver: "Second driver included", free_cancellation: "Free cancellation", child_seat: "Child seat available", airport_pickup: "Airport pickup" },
  fr: { basic_insurance: "Assurance de base incluse", unlimited_km: "Kilométrage illimité", second_driver: "2ᵉ conducteur inclus", free_cancellation: "Annulation gratuite", child_seat: "Siège enfant disponible", airport_pickup: "Prise en charge à l'aéroport" },
  de: { basic_insurance: "Grundversicherung inklusive", unlimited_km: "Unbegrenzte Kilometer", second_driver: "Zweiter Fahrer inklusive", free_cancellation: "Kostenlose Stornierung", child_seat: "Kindersitz verfügbar", airport_pickup: "Abholung am Flughafen" },
  el: { basic_insurance: "Βασική ασφάλιση", unlimited_km: "Απεριόριστα χιλιόμετρα", second_driver: "Δεύτερος οδηγός", free_cancellation: "Δωρεάν ακύρωση", child_seat: "Παιδικό κάθισμα", airport_pickup: "Παραλαβή από αεροδρόμιο" },
};

// Libellés côté loueur (EN, pattern QuoteForm hardcodé EN).
export const CAR_INCLUSION_LABELS_PARTNER: Record<CarInclusionKey, string> = {
  basic_insurance: "Basic insurance", unlimited_km: "Unlimited mileage", second_driver: "Second driver",
  free_cancellation: "Free cancellation", child_seat: "Child seat", airport_pickup: "Airport pickup",
};

export function inclusionLabels(keys: string[] | null | undefined, locale: string): string[] {
  const table = CAR_INCLUSION_LABELS[locale] ?? CAR_INCLUSION_LABELS.en;
  return (keys ?? []).filter(isInclusionKey).map((k) => table[k]);
}

// ── Assurance déclarée par le loueur sur son devis ──────────────────────────
// Le site ne promet PAS "zéro franchise partout" : chaque loueur déclare sa
// couverture réelle (tous risques zéro franchise OU rachat avec franchise), le
// montant de la franchise est confirmé au devis (cf page /car-rental), et le
// client compare. all_risk_zero = franchise nulle ; cdw_excess = franchise > 0.
export const CAR_INSURANCE_TYPES = ["all_risk_zero", "cdw_excess"] as const;
export type CarInsuranceType = (typeof CAR_INSURANCE_TYPES)[number];

export function isInsuranceType(v: unknown): v is CarInsuranceType {
  return typeof v === "string" && (CAR_INSURANCE_TYPES as readonly string[]).includes(v);
}

// Libellés du type de couverture, côté client (4 langues).
export const CAR_INSURANCE_LABELS: Record<string, Record<CarInsuranceType, string>> = {
  en: { all_risk_zero: "All-risk, zero excess", cdw_excess: "Collision damage waiver (CDW)" },
  fr: { all_risk_zero: "Tous risques, franchise zéro", cdw_excess: "Rachat de franchise (CDW)" },
  de: { all_risk_zero: "Vollkasko, ohne Selbstbeteiligung", cdw_excess: "Haftungsreduzierung (CDW)" },
  el: { all_risk_zero: "Πλήρης κάλυψη, μηδενική απαλλαγή", cdw_excess: "Μείωση ευθύνης (CDW)" },
};

// Libellés côté loueur (EN, pattern QuoteForm hardcodé EN).
export const CAR_INSURANCE_LABELS_PARTNER: Record<CarInsuranceType, string> = {
  all_risk_zero: "All-risk (zero excess)",
  cdw_excess: "Damage waiver (with excess)",
};

// Titre du bloc couverture, page d'offres et page de réservation (4 langues).
export const CAR_INSURANCE_HEADING: Record<string, string> = { en: "Insurance", fr: "Assurance", de: "Versicherung", el: "Ασφάλιση" };

const INSURANCE_EXCESS_WORD: Record<string, string> = { en: "Excess", fr: "Franchise", de: "Selbstbeteiligung", el: "Απαλλαγή" };
const INSURANCE_ZERO_UPSELL_WORD: Record<string, string> = {
  en: "Zero-excess option", fr: "Option zéro franchise", de: "Option ohne Selbstbeteiligung", el: "Επιλογή μηδενικής απαλλαγής",
};
const INSURANCE_PER_DAY: Record<string, string> = { en: "/day", fr: "/jour", de: "/Tag", el: "/ημέρα" };

export function insuranceLabel(type: string | null | undefined, locale: string): string {
  if (!isInsuranceType(type)) return "";
  return (CAR_INSURANCE_LABELS[locale] ?? CAR_INSURANCE_LABELS.en)[type];
}

// Résumé multi-lignes prêt à afficher (page devis client + email). Vide si aucune
// info d'assurance déclarée (rétro-compat : anciens devis sans assurance).
export function insuranceSummary(
  type: string | null | undefined,
  excessEur: number | null | undefined,
  upsellPerDay: number | null | undefined,
  locale: string,
): string[] {
  const lines: string[] = [];
  const label = insuranceLabel(type, locale);
  if (label) lines.push(label);
  // Montants et unité dans la langue du client ; hors des quatre langues, tout en anglais.
  const lang = locale in INSURANCE_PER_DAY ? locale : "en";
  const colon = lang === "fr" ? " : " : ": ";
  if (type === "cdw_excess" && excessEur != null) {
    lines.push(`${INSURANCE_EXCESS_WORD[lang]}${colon}${formatEur(Number(excessEur), lang)}`);
  }
  if (upsellPerDay != null && upsellPerDay > 0) {
    lines.push(`${INSURANCE_ZERO_UPSELL_WORD[lang]}${colon}+${formatEur(Number(upsellPerDay), lang)}${INSURANCE_PER_DAY[lang]}`);
  }
  return lines;
}
