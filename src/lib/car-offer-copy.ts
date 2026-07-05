// Shared copy for the car-rental offer — used by BOTH the customer email and the offer page.
// Source of truth: values were verified in src/lib/email.ts QUOTE_COPY.
// DO NOT edit strings here without updating both surfaces.

export interface SharedOfferCopy {
  offerFrom: string;
  localAgency: string;
  included: string;
  perDay: string;
  total: string;
  reassure: string[];
  steps: string[];
}

export const SHARED_OFFER_COPY: Record<string, SharedOfferCopy> = {
  en: {
    offerFrom: "Offer from",
    localAgency: "local rental agency in Crete",
    included: "Included in the price",
    perDay: "per day",
    total: "total",
    reassure: [
      "No online prepayment — no card needed to book",
      "You pay the agency on pickup — cash accepted",
      "A real local agency in Crete, direct contact",
    ],
    steps: [
      "You accept this offer",
      "We share your details with the agency",
      "The agency contacts you to finalise — payment on pickup",
    ],
  },
  fr: {
    offerFrom: "Offre de",
    localAgency: "agence de location locale en Crète",
    included: "Inclus dans le prix",
    perDay: "par jour",
    total: "au total",
    reassure: [
      "Aucun prépaiement en ligne — pas de carte pour réserver",
      "Vous payez l'agence au retrait — espèces acceptées",
      "Une vraie agence locale en Crète, en direct",
    ],
    steps: [
      "Vous acceptez cette offre",
      "On transmet vos coordonnées à l'agence",
      "L'agence vous contacte pour finaliser — paiement au retrait",
    ],
  },
  de: {
    offerFrom: "Angebot von",
    localAgency: "lokale Autovermietung auf Kreta",
    included: "Im Preis enthalten",
    perDay: "pro Tag",
    total: "gesamt",
    reassure: [
      "Keine Online-Vorauszahlung — keine Karte zum Buchen erforderlich",
      "Sie zahlen bei der Abholung — Barzahlung möglich",
      "Eine echte lokale Autovermietung auf Kreta, direkt",
    ],
    steps: [
      "Sie nehmen dieses Angebot an",
      "Wir übermitteln Ihre Daten an die Vermietung",
      "Die Vermietung kontaktiert Sie zur Bestätigung — Zahlung bei Abholung",
    ],
  },
  el: {
    offerFrom: "Προσφορά από",
    localAgency: "τοπικό γραφείο ενοικίασης στην Κρήτη",
    included: "Περιλαμβάνεται στην τιμή",
    perDay: "ανά ημέρα",
    total: "συνολικά",
    reassure: [
      "Χωρίς προπληρωμή στο διαδίκτυο — δεν χρειάζεται κάρτα για κράτηση",
      "Πληρώνετε το γραφείο κατά την παραλαβή — γίνονται δεκτά μετρητά",
      "Αληθινό τοπικό γραφείο ενοικίασης στην Κρήτη, σε απευθείας επαφή",
    ],
    steps: [
      "Αποδέχεστε αυτήν την προσφορά",
      "Μεταβιβάζουμε τα στοιχεία σας στο γραφείο",
      "Το γραφείο επικοινωνεί μαζί σας για να οριστικοποιήσει — πληρωμή κατά την παραλαβή",
    ],
  },
};

export function sharedOfferCopy(locale: string): SharedOfferCopy {
  return SHARED_OFFER_COPY[locale] ?? SHARED_OFFER_COPY.en;
}
