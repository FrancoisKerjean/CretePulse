// Inclusions optionnelles d'un devis loueur. Stockées en base comme clés
// canoniques (jsonb array) ; libellés traduits à l'affichage.
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
