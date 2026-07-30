// Contenu i18n de /car-booking (paiement en ligne d'une location acceptee).
// en/fr/de/el rediges a la main, les autres locales retombent sur l'anglais,
// meme convention que /stays.
//
// ⚠️ Vocabulaire verrouille : l'option d'annulation n'est JAMAIS presentee comme
// une assurance. Distribuer de l'assurance est une activite reglementee que
// crete.direct n'exerce pas. Le gate check:car-booking le verifie cote Stripe,
// et le test de ce module le verifie cote page.
//
// Contrainte DA (gate CI check:da) : aucun tiret cadratin.

export const CAR_BOOKING_LOCALES = ["en", "fr", "de", "el"] as const;
export type CarBookingLocale = (typeof CAR_BOOKING_LOCALES)[number];

export function pickCarBookingLocale(locale: string): CarBookingLocale {
  return (CAR_BOOKING_LOCALES as readonly string[]).includes(locale)
    ? (locale as CarBookingLocale)
    : "en";
}

export type CarBookingStrings = {
  h1: string;
  intro: string;
  optionLabel: string;
  optionHelp: string;
  optionPrice: string;
  submit: string;
  redirecting: string;
  error: string;
  errorPayment: string;
  errorUnavailable: string;
  paidTitle: string;
  paidBody: string;
  cancelTitle: string;
  cancelBody: string;
  cancelSubmit: string;
  cancelling: string;
  cancelledRefunded: string;
  cancelledNoRefund: string;
  cancelTooLate: string;
};

export const L: Record<CarBookingLocale, CarBookingStrings> = {
  en: {
    h1: "Confirm and pay your car rental",
    intro:
      "You pay crete.direct. The rental company is paid 48 hours before pick-up, once your booking is final.",
    optionLabel: "Add the cancellation option",
    optionHelp:
      "Full refund if you cancel more than 48 hours before pick-up. Without it, a cancellation is not refunded.",
    optionPrice: "5 EUR",
    submit: "Pay and confirm",
    redirecting: "Redirecting to the payment page",
    error: "Error",
    errorPayment:
      "Payment is temporarily unavailable. Try again in a few minutes; if it persists, write to hello@crete.direct.",
    errorUnavailable: "This booking is no longer payable.",
    paidTitle: "Your car is booked",
    paidBody:
      "The rental company has your details and will confirm the pick-up arrangements.",
    cancelTitle: "Cancel this booking",
    cancelBody: "Check your refund conditions before confirming.",
    cancelSubmit: "Cancel my booking",
    cancelling: "Cancelling",
    cancelledRefunded: "Booking cancelled. Your refund is on its way.",
    cancelledNoRefund: "Booking cancelled. No refund applies.",
    cancelTooLate: "This booking can no longer be cancelled.",
  },
  fr: {
    h1: "Confirmez et réglez votre location",
    intro:
      "Vous payez crete.direct. Le loueur est payé 48 heures avant la prise du véhicule, une fois votre réservation définitive.",
    optionLabel: "Ajouter l'option annulation",
    optionHelp:
      "Remboursement intégral si vous annulez plus de 48 heures avant la prise du véhicule. Sans elle, une annulation n'est pas remboursée.",
    optionPrice: "5 EUR",
    submit: "Payer et confirmer",
    redirecting: "Redirection vers la page de paiement",
    error: "Erreur",
    errorPayment:
      "Le paiement est momentanément indisponible. Réessayez dans quelques minutes ; si cela persiste, écrivez à hello@crete.direct.",
    errorUnavailable: "Cette réservation n'est plus payable.",
    paidTitle: "Votre voiture est réservée",
    paidBody:
      "Le loueur a vos coordonnées et vous confirme les modalités de prise en charge.",
    cancelTitle: "Annuler cette réservation",
    cancelBody: "Vérifiez vos conditions de remboursement avant de confirmer.",
    cancelSubmit: "Annuler ma réservation",
    cancelling: "Annulation en cours",
    cancelledRefunded: "Réservation annulée. Votre remboursement est en route.",
    cancelledNoRefund: "Réservation annulée. Aucun remboursement ne s'applique.",
    cancelTooLate: "Cette réservation ne peut plus être annulée.",
  },
  de: {
    h1: "Mietwagen bestätigen und bezahlen",
    intro:
      "Sie zahlen an crete.direct. Der Vermieter wird 48 Stunden vor Abholung bezahlt, sobald Ihre Buchung endgültig ist.",
    optionLabel: "Stornooption hinzufügen",
    optionHelp:
      "Volle Erstattung bei Stornierung mehr als 48 Stunden vor Abholung. Ohne sie wird eine Stornierung nicht erstattet.",
    optionPrice: "5 EUR",
    submit: "Bezahlen und bestätigen",
    redirecting: "Weiterleitung zur Zahlungsseite",
    error: "Fehler",
    errorPayment:
      "Die Zahlung ist vorübergehend nicht verfügbar. Bitte in einigen Minuten erneut versuchen; bei anhaltendem Fehler an hello@crete.direct schreiben.",
    errorUnavailable: "Diese Buchung ist nicht mehr zahlbar.",
    paidTitle: "Ihr Mietwagen ist gebucht",
    paidBody:
      "Der Vermieter hat Ihre Daten und bestätigt die Abholung.",
    cancelTitle: "Diese Buchung stornieren",
    cancelBody: "Prüfen Sie Ihre Erstattungsbedingungen, bevor Sie bestätigen.",
    cancelSubmit: "Buchung stornieren",
    cancelling: "Stornierung läuft",
    cancelledRefunded: "Buchung storniert. Ihre Erstattung ist unterwegs.",
    cancelledNoRefund: "Buchung storniert. Es erfolgt keine Erstattung.",
    cancelTooLate: "Diese Buchung kann nicht mehr storniert werden.",
  },
  el: {
    h1: "Επιβεβαιώστε και πληρώστε την ενοικίαση",
    intro:
      "Πληρώνετε το crete.direct. Ο εκμισθωτής πληρώνεται 48 ώρες πριν την παραλαβή, μόλις η κράτησή σας οριστικοποιηθεί.",
    optionLabel: "Προσθήκη επιλογής ακύρωσης",
    optionHelp:
      "Πλήρης επιστροφή χρημάτων αν ακυρώσετε πάνω από 48 ώρες πριν την παραλαβή. Χωρίς αυτήν, η ακύρωση δεν επιστρέφεται.",
    optionPrice: "5 EUR",
    submit: "Πληρωμή και επιβεβαίωση",
    redirecting: "Ανακατεύθυνση στη σελίδα πληρωμής",
    error: "Σφάλμα",
    errorPayment:
      "Η πληρωμή δεν είναι προσωρινά διαθέσιμη. Δοκιμάστε ξανά σε λίγα λεπτά· αν επιμείνει, γράψτε στο hello@crete.direct.",
    errorUnavailable: "Αυτή η κράτηση δεν είναι πλέον πληρωτέα.",
    paidTitle: "Το αυτοκίνητό σας κρατήθηκε",
    paidBody:
      "Ο εκμισθωτής έχει τα στοιχεία σας και θα επιβεβαιώσει την παραλαβή.",
    cancelTitle: "Ακύρωση αυτής της κράτησης",
    cancelBody: "Ελέγξτε τους όρους επιστροφής πριν επιβεβαιώσετε.",
    cancelSubmit: "Ακύρωση κράτησης",
    cancelling: "Ακύρωση σε εξέλιξη",
    cancelledRefunded: "Η κράτηση ακυρώθηκε. Η επιστροφή χρημάτων είναι καθ' οδόν.",
    cancelledNoRefund: "Η κράτηση ακυρώθηκε. Δεν προβλέπεται επιστροφή.",
    cancelTooLate: "Αυτή η κράτηση δεν μπορεί πλέον να ακυρωθεί.",
  },
};
