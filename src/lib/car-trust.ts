// Confiance : notes Google par loueur (relevées chaque semaine par le cron
// google-ratings dans car_partners.google_rating*), jamais agrégées. Pur, zéro I/O.

export interface RatedPartner {
  google_rating: number | string | null;
  google_rating_count: number | string | null;
}

const num = (v: number | string | null): number | null => {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

// Décision du 27/11/2026 : le client ne connaît le loueur qu'après avoir payé
// l'acompte, ou accepté l'offre quand l'acompte est éteint (mise en relation).
const PAID_BOOKING = new Set(["awaiting_partner", "confirmed", "cancelled_kept", "refunded"]);

/**
 * Le nom du loueur peut-il s'afficher au client ? Pur, source unique des deux pages.
 * `refunded` suppose un acompte encaissé : il n'est posé que depuis awaiting_partner
 * ou confirmed (claimRefund, car-deposit-server.ts), donc le client a déjà vu ce loueur.
 * `pending_payment` (session Stripe ouverte, rien d'encaissé) ne révèle rien.
 */
export function partnerRevealed(s: { bookingStatus?: string | null; requestStatus?: string | null }): boolean {
  const b = s.bookingStatus ?? null;
  if (b !== null) return PAID_BOOKING.has(b);
  return s.requestStatus === "accepted";
}

/** Note valide d'un loueur (nombre d'avis > 0), sinon null : source unique des pages. */
export function validRating(p: RatedPartner | null | undefined): { rating: number; count: number } | null {
  if (!p) return null;
  const rating = num(p.google_rating);
  const count = num(p.google_rating_count);
  return rating !== null && count !== null && count > 0 ? { rating, count } : null;
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

/**
 * Les deux garanties de l'acompte, source unique (bandeau, page d'offres, pages lieu).
 * Règle réelle : 240 minutes OUVERTES, de 8 h à 22 h heure d'Athènes (CONFIRM_OPEN_MINUTES,
 * car-deposit.ts) : « sous 4 h » tout court serait faux pour un paiement à 21:30.
 */
export const CONFIRM_LINE: Record<string, string> = {
  en: "Confirmed within 4 opening hours (8:00 to 22:00, Greek time), otherwise refunded",
  fr: "Confirmée sous 4 h d'ouverture (8 h à 22 h, heure grecque), sinon remboursée",
  de: "Bestätigung innerhalb von 4 Öffnungsstunden (8 bis 22 Uhr, griechische Zeit), sonst Erstattung",
  el: "Επιβεβαίωση εντός 4 ωρών λειτουργίας (8:00 έως 22:00, ώρα Ελλάδας), αλλιώς επιστροφή χρημάτων",
};
export const CANCEL_LINE: Record<string, string> = {
  en: "Free cancellation up to 48 hours before pick-up",
  fr: "Annulation gratuite jusqu'à 48 h avant la prise du véhicule",
  de: "Kostenlose Stornierung bis 48 Stunden vor Abholung",
  el: "Δωρεάν ακύρωση έως 48 ώρες πριν την παραλαβή",
};

const AGENCIES: Record<string, string> = {
  en: "{n} verified local agencies",
  fr: "{n} agences locales vérifiées",
  de: "{n} geprüfte lokale Agenturen",
  el: "{n} επαληθευμένα τοπικά γραφεία",
};

/**
 * Bandeau de confiance de la location : le nombre de nos agences actives (donnée à nous),
 * puis les deux garanties de l'acompte. ⛔ Aucune note Google agrégée : la politique des
 * Places API interdit le contenu dérivé (moyenne). La note n'existe que par agence, sur les offres.
 */
export function trustBarCopy(agencyCount: number, locale: string): { agencies: string | null; confirm: string; cancel: string } {
  return {
    confirm: CONFIRM_LINE[locale] ?? CONFIRM_LINE.en,
    cancel: CANCEL_LINE[locale] ?? CANCEL_LINE.en,
    agencies: agencyCount >= 2 ? (AGENCIES[locale] ?? AGENCIES.en).replace("{n}", String(agencyCount)) : null,
  };
}
