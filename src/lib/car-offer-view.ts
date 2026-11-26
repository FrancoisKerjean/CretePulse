// Page d'offres voiture, direction « une recommandation » (nuit du 27/11/2026) :
// logique d'affichage pure (choix mis en avant, écarts, libellés 4 langues).
// Pur, zéro I/O, testé.

export type OfferLang = "en" | "fr" | "de" | "el";
export const offerLang = (l: string): OfferLang => (l === "fr" || l === "de" || l === "el" ? l : "en");

const GEARBOX: Record<OfferLang, Record<"automatic" | "manual", string>> = {
  en: { automatic: "Automatic", manual: "Manual" },
  fr: { automatic: "Automatique", manual: "Manuelle" },
  de: { automatic: "Automatik", manual: "Schaltgetriebe" },
  el: { automatic: "Αυτόματο", manual: "Χειροκίνητο" },
};

/** Boîte traduite à l'affichage (M1). */
export function gearboxLabel(gearbox: string | null | undefined, locale: string): string | null {
  if (gearbox !== "automatic" && gearbox !== "manual") return null;
  return GEARBOX[offerLang(locale)][gearbox];
}

/**
 * Le modèle figé en base au paiement est en anglais (« VW Polo auto · Automatic »).
 * On traduit la boîte au rendu, la base ne change pas (M1).
 */
export function localizeQuotedModel(snapshot: string | null | undefined, locale: string): string | null {
  const s = typeof snapshot === "string" ? snapshot.trim() : "";
  if (!s) return null;
  const m = /^(.*?)(?:\s*·\s*)?\b(Automatic|Manual)$/.exec(s);
  if (!m) return s;
  const label = GEARBOX[offerLang(locale)][m[2] === "Automatic" ? "automatic" : "manual"];
  return m[1] ? `${m[1]} · ${label}` : label;
}

/**
 * L'offre mise en avant : le total le plus bas ; à égalité (au centime), la
 * mieux notée sur Google ; puis l'ordre reçu. Deux faits vérifiables, pas un
 * jugement : la page dit exactement pourquoi.
 */
export function recommendOffer<T extends { price: number }>(offers: T[], ratingOf: (o: T) => number | null): T | null {
  let best: T | null = null;
  for (const o of offers) {
    if (!best) { best = o; continue; }
    const d = Math.round((o.price - best.price) * 100);
    if (d < 0) { best = o; continue; }
    if (d === 0 && (ratingOf(o) ?? -1) > (ratingOf(best) ?? -1)) best = o;
  }
  return best;
}

/** Écart en euros avec l'offre mise en avant, au centime, jamais négatif. */
export function priceDelta(price: number, pickPrice: number): number {
  return Math.max(0, Math.round((price - pickPrice) * 100) / 100);
}

/** Extrait d'un avis coupé sur un mot, pour « Lire la suite ». */
export function reviewExcerpt(text: string, max = 220): { short: string; truncated: boolean } {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return { short: t, truncated: false };
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return { short: `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, "")}…`, truncated: true };
}

export interface OfferViewCopy {
  ourPick: string;        // {n}
  yourOffer: string;
  reasonRated: string;    // {n} {rating}
  reasonPlain: string;    // {n}
  onlyOffer: string;
  otherOffers: string;    // {n}
  otherOffer: string;
  totalFor: string;       // {days}
  forDays: string;        // {days}
  orSimilar: string;
  googleReviews: string;  // {n}
  reviewsTitle: string;
  readMore: string;
  allReviews: string;
  googleReview: string;
  disclaimer: string;
  readReviews: string;
  everyOffer: string;
  pendingPayment: string;
  tryAgain: string;
  photoAlt: string;       // {model} {partner}
  dayOne: string;
  dayMany: string;
}

export const OFFER_VIEW: Record<OfferLang, OfferViewCopy> = {
  en: {
    ourPick: "Our pick from {n} offers",
    yourOffer: "Your offer",
    reasonRated: "The lowest price of the {n} offers, from an agency rated {rating} out of 5 on Google.",
    reasonPlain: "The lowest price of the {n} offers.",
    onlyOffer: "The only offer for your dates so far.",
    otherOffers: "The {n} other offers",
    otherOffer: "The other offer",
    totalFor: "Total price for {days}",
    forDays: "for {days}",
    orSimilar: "or similar",
    googleReviews: "{n} Google reviews",
    reviewsTitle: "What its customers say",
    readMore: "Read more",
    allReviews: "All reviews on Google",
    googleReview: "Google review",
    disclaimer: "Reviews published on Google, not verified by crete.direct.",
    readReviews: "Read reviews",
    everyOffer: "On every offer: part paid online today, the rest at the counter. Confirmed within 4 hours, otherwise refunded.",
    pendingPayment: "A payment is already open for this request. If you left the payment page, it closes within 30 minutes and you can choose again.",
    tryAgain: "Something went wrong. Please try again.",
    photoAlt: "{model}, {partner}",
    dayOne: "1 day",
    dayMany: "{n} days",
  },
  fr: {
    ourPick: "Notre choix parmi {n} offres",
    yourOffer: "Votre offre",
    reasonRated: "Le prix le plus bas des {n} offres, chez une agence notée {rating} sur 5 sur Google.",
    reasonPlain: "Le prix le plus bas des {n} offres.",
    onlyOffer: "La seule offre reçue pour vos dates à ce jour.",
    otherOffers: "Les {n} autres offres",
    otherOffer: "L'autre offre",
    totalFor: "Prix total pour {days}",
    forDays: "pour {days}",
    orSimilar: "ou similaire",
    googleReviews: "{n} avis Google",
    reviewsTitle: "Ce qu'en disent ses clients",
    readMore: "Lire la suite",
    allReviews: "Tous les avis sur Google",
    googleReview: "Avis Google",
    disclaimer: "Avis publiés sur Google, non vérifiés par crete.direct.",
    readReviews: "Lire les avis",
    everyOffer: "Sur chaque offre : une part payée en ligne aujourd'hui, le reste au comptoir. Confirmée sous 4 h, sinon remboursée.",
    pendingPayment: "Un paiement est déjà ouvert pour cette demande. Si vous avez quitté la page de paiement, elle se ferme d'ici 30 minutes et vous pourrez choisir à nouveau.",
    tryAgain: "Un problème est survenu. Réessayez.",
    photoAlt: "{model}, {partner}",
    dayOne: "1 jour",
    dayMany: "{n} jours",
  },
  de: {
    ourPick: "Unsere Wahl unter {n} Angeboten",
    yourOffer: "Ihr Angebot",
    reasonRated: "Der niedrigste Preis der {n} Angebote, von einer Vermietung mit {rating} von 5 auf Google.",
    reasonPlain: "Der niedrigste Preis der {n} Angebote.",
    onlyOffer: "Bisher das einzige Angebot für Ihre Daten.",
    otherOffers: "Die {n} weiteren Angebote",
    otherOffer: "Das andere Angebot",
    totalFor: "Gesamtpreis für {days}",
    forDays: "für {days}",
    orSimilar: "oder ähnlich",
    googleReviews: "{n} Google-Bewertungen",
    reviewsTitle: "Was die Kunden sagen",
    readMore: "Weiterlesen",
    allReviews: "Alle Bewertungen auf Google",
    googleReview: "Google-Bewertung",
    disclaimer: "Auf Google veröffentlichte Bewertungen, nicht von crete.direct geprüft.",
    readReviews: "Bewertungen lesen",
    everyOffer: "Bei jedem Angebot: ein Teil heute online, der Rest am Schalter. Bestätigung innerhalb von 4 Stunden, sonst Erstattung.",
    pendingPayment: "Für diese Anfrage ist bereits eine Zahlung offen. Wenn Sie die Zahlungsseite verlassen haben, schließt sie sich innerhalb von 30 Minuten und Sie können neu wählen.",
    tryAgain: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    photoAlt: "{model}, {partner}",
    dayOne: "1 Tag",
    dayMany: "{n} Tage",
  },
  el: {
    ourPick: "Η επιλογή μας ανάμεσα σε {n} προσφορές",
    yourOffer: "Η προσφορά σας",
    reasonRated: "Η χαμηλότερη τιμή από τις {n} προσφορές, από γραφείο με βαθμολογία {rating} στα 5 στο Google.",
    reasonPlain: "Η χαμηλότερη τιμή από τις {n} προσφορές.",
    onlyOffer: "Η μόνη προσφορά για τις ημερομηνίες σας μέχρι στιγμής.",
    otherOffers: "Οι άλλες {n} προσφορές",
    otherOffer: "Η άλλη προσφορά",
    totalFor: "Συνολική τιμή για {days}",
    forDays: "για {days}",
    orSimilar: "ή παρόμοιο",
    googleReviews: "{n} κριτικές Google",
    reviewsTitle: "Τι λένε οι πελάτες του",
    readMore: "Περισσότερα",
    allReviews: "Όλες οι κριτικές στο Google",
    googleReview: "Κριτική Google",
    disclaimer: "Κριτικές δημοσιευμένες στο Google, μη επαληθευμένες από το crete.direct.",
    readReviews: "Διαβάστε τις κριτικές",
    everyOffer: "Σε κάθε προσφορά: ένα μέρος online σήμερα, το υπόλοιπο στο γκισέ. Επιβεβαίωση εντός 4 ωρών, αλλιώς επιστροφή χρημάτων.",
    pendingPayment: "Υπάρχει ήδη ανοιχτή πληρωμή για αυτό το αίτημα. Αν φύγατε από τη σελίδα πληρωμής, κλείνει μέσα σε 30 λεπτά και μπορείτε να επιλέξετε ξανά.",
    tryAgain: "Κάτι πήγε στραβά. Δοκιμάστε ξανά.",
    photoAlt: "{model}, {partner}",
    dayOne: "1 ημέρα",
    dayMany: "{n} ημέρες",
  },
};

export function daysLabel(n: number, locale: string): string {
  const c = OFFER_VIEW[offerLang(locale)];
  return n === 1 ? c.dayOne : c.dayMany.replace("{n}", String(n));
}
