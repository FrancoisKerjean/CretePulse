// Confiance : note Google moyenne des loueurs (relevée chaque semaine par le
// cron google-ratings dans car_partners.google_rating*). Pur, zéro I/O.

export interface RatedPartner {
  google_rating: number | string | null;
  google_rating_count: number | string | null;
}

export interface AggregateRating {
  /** Moyenne pondérée par le nombre d'avis, arrondie au dixième. */
  rating: number;
  /** Total des avis Google des loueurs notés. */
  count: number;
  /** Nombre de loueurs entrés dans la moyenne. */
  partners: number;
}

const num = (v: number | string | null): number | null => {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Note moyenne de nos loueurs. null si aucun n'est noté : jamais de chiffre inventé. */
export function aggregateRating(partners: RatedPartner[]): AggregateRating | null {
  let weighted = 0;
  let count = 0;
  let rated = 0;
  for (const p of partners) {
    const r = num(p.google_rating);
    const c = num(p.google_rating_count);
    if (r === null || c === null || c <= 0) continue;
    weighted += r * c;
    count += c;
    rated++;
  }
  if (count === 0) return null;
  return { rating: Math.round((weighted / count) * 10) / 10, count, partners: rated };
}

type Locale = "en" | "fr" | "de" | "el";

/** « 4,9 » (fr, de, el) ou « 4.9 » (en), toujours une décimale. */
export function formatRating(rating: number, locale: string): string {
  const s = rating.toFixed(1);
  return locale === "en" ? s : s.replace(".", ",");
}

const ARIA: Record<Locale, (r: string) => string> = {
  en: (r) => `Rated ${r} out of 5`,
  fr: (r) => `Note ${r} sur 5`,
  de: (r) => `Bewertung ${r} von 5`,
  el: (r) => `Βαθμολογία ${r} στα 5`,
};

/** Libellé des étoiles pour un lecteur d'écran (« Note 4,6 sur 5 »). */
export function ratingAriaLabel(rating: number, locale: string): string {
  const l = (locale in ARIA ? locale : "en") as Locale;
  return ARIA[l](formatRating(rating, l));
}

const TRUST_BAR: Record<string, { rating: string; confirm: string; cancel: string }> = {
  en: { rating: "{rating}/5 from {count} Google reviews of our rental partners", confirm: "Confirmed within 4 hours, otherwise refunded", cancel: "Free cancellation up to 48 hours before pick-up" },
  fr: { rating: "{rating}/5 sur {count} avis Google de nos loueurs", confirm: "Confirmée sous 4 h, sinon remboursée", cancel: "Annulation gratuite jusqu'à 48 h avant" },
  de: { rating: "{rating}/5 aus {count} Google-Bewertungen unserer Vermieter", confirm: "Bestätigung innerhalb von 4 Stunden, sonst Erstattung", cancel: "Kostenlose Stornierung bis 48 Stunden vor Abholung" },
  el: { rating: "{rating}/5 από {count} κριτικές Google των συνεργατών μας", confirm: "Επιβεβαίωση εντός 4 ωρών, αλλιώς επιστροφή χρημάτων", cancel: "Δωρεάν ακύρωση έως 48 ώρες πριν την παραλαβή" },
};

/** Bandeau de confiance de la location : note de nos loueurs (null sans note), puis les deux garanties de l'acompte. */
export function trustBarCopy(agg: AggregateRating | null, locale: string): { rating: string | null; confirm: string; cancel: string } {
  const c = TRUST_BAR[locale] ?? TRUST_BAR.en;
  const nf = locale === "en" ? "en-GB" : locale;
  return {
    ...c,
    rating: agg ? c.rating.replace("{rating}", formatRating(agg.rating, locale)).replace("{count}", agg.count.toLocaleString(nf)) : null,
  };
}
