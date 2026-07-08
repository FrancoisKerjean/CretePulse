// Sièges enfants demandés par le client (retour loueur : préciser le besoin
// pour un devis juste). Stockés en base comme clés canoniques (jsonb array) ;
// libellés traduits à l'affichage. Groupes de poids ECE R44 usuels en location.
export const CAR_CHILD_SEAT_KEYS = ["baby_cot", "baby_seat", "booster"] as const;

export type CarChildSeatKey = (typeof CAR_CHILD_SEAT_KEYS)[number];

export function isChildSeatKey(v: unknown): v is CarChildSeatKey {
  return typeof v === "string" && (CAR_CHILD_SEAT_KEYS as readonly string[]).includes(v);
}

// Libellés client (4 langues : en/fr/de/el), poids inclus dans le libellé.
export const CAR_CHILD_SEAT_LABELS: Record<string, Record<CarChildSeatKey, string>> = {
  en: { baby_cot: "Baby cot (0-9 kg)", baby_seat: "Baby seat (9-18 kg)", booster: "Booster seat (18-36 kg)" },
  fr: { baby_cot: "Nacelle (0-9 kg)", baby_seat: "Siège bébé (9-18 kg)", booster: "Réhausseur (18-36 kg)" },
  de: { baby_cot: "Babywanne (0-9 kg)", baby_seat: "Babyschale (9-18 kg)", booster: "Sitzerhöhung (18-36 kg)" },
  el: { baby_cot: "Πορτ-μπεμπέ (0-9 kg)", baby_seat: "Παιδικό κάθισμα (9-18 kg)", booster: "Κάθισμα booster (18-36 kg)" },
};

// Libellés côté loueur (EN, pattern QuoteForm / leadSummary hardcodés EN).
export const CAR_CHILD_SEAT_LABELS_PARTNER: Record<CarChildSeatKey, string> = {
  baby_cot: "Baby cot (0-9 kg)", baby_seat: "Baby seat (9-18 kg)", booster: "Booster seat (18-36 kg)",
};

export function childSeatLabels(keys: string[] | null | undefined, locale: string): string[] {
  const table = CAR_CHILD_SEAT_LABELS[locale] ?? CAR_CHILD_SEAT_LABELS.en;
  return (keys ?? []).filter(isChildSeatKey).map((k) => table[k]);
}
