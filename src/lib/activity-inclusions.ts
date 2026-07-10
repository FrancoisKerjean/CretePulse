// Inclusions optionnelles d'un devis prestataire activité. Stockées en base comme clés
// canoniques (jsonb array) ; libellés traduits à l'affichage.
export const ACTIVITY_INCLUSION_KEYS = [
  "meals", "drinks", "transport", "guide", "gear",
] as const;

export type ActivityInclusionKey = (typeof ACTIVITY_INCLUSION_KEYS)[number];

export function isActivityInclusionKey(v: unknown): v is ActivityInclusionKey {
  return typeof v === "string" && (ACTIVITY_INCLUSION_KEYS as readonly string[]).includes(v);
}

// Libellés client (4 langues : en/fr/de/el).
export const ACTIVITY_INCLUSION_LABELS: Record<string, Record<ActivityInclusionKey, string>> = {
  en: { meals: "Meals included", drinks: "Drinks included", transport: "Hotel pick-up / transport", guide: "Licensed guide", gear: "Equipment provided" },
  fr: { meals: "Repas inclus", drinks: "Boissons incluses", transport: "Transfert hôtel / transport", guide: "Guide diplômé", gear: "Matériel fourni" },
  de: { meals: "Mahlzeiten inklusive", drinks: "Getränke inklusive", transport: "Hotelabholung / Transport", guide: "Lizenzierter Guide", gear: "Ausrüstung gestellt" },
  el: { meals: "Γεύματα", drinks: "Ποτά", transport: "Μεταφορά από ξενοδοχείο", guide: "Πιστοποιημένος ξεναγός", gear: "Εξοπλισμός" },
};

// Libellés côté partenaire (EN, pattern QuoteForm hardcodé EN).
export const ACTIVITY_INCLUSION_LABELS_PARTNER: Record<ActivityInclusionKey, string> = {
  meals: "Meals", drinks: "Drinks", transport: "Hotel pick-up / transport",
  guide: "Licensed guide", gear: "Equipment",
};

export function activityInclusionLabels(keys: string[] | null | undefined, locale: string): string[] {
  const table = ACTIVITY_INCLUSION_LABELS[locale] ?? ACTIVITY_INCLUSION_LABELS.en;
  return (keys ?? []).filter(isActivityInclusionKey).map((k) => table[k]);
}
