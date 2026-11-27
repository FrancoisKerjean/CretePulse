// Contenu i18n de /car-booking : acompte d'une offre choisie, puis suivi de la
// réservation. en/fr/de/el rédigés à la main, les autres locales retombent sur
// l'anglais, même convention que /stays.
//
// Acompte (spec 2026-11-25) : les clés `deposit*`, `pending*`, `awaiting*`,
// `confirmed*`, `refunded*`, `reason*` et `kept*` servent la page par état de
// réservation ; les clés `cancel*` servent l'annulation par le client
// (CancelPanel, sur cette page et sur la page d'offres). Les intitulés
// d'assurance viennent de car-inclusions.ts, jamais d'ici.
//
// ⚠️ Vocabulaire verrouillé : aucun texte de ce module ne parle d'assurance.
// Distribuer de l'assurance est une activité réglementée que crete.direct
// n'exerce pas ; le test de ce module le vérifie.
//
// Contrainte DA (gate CI check:da) : aucun tiret cadratin.

import type { RefundReason } from "@/lib/car-deposit";

export const CAR_BOOKING_LOCALES = ["en", "fr", "de", "el"] as const;
export type CarBookingLocale = (typeof CAR_BOOKING_LOCALES)[number];

export function pickCarBookingLocale(locale: string): CarBookingLocale {
  return (CAR_BOOKING_LOCALES as readonly string[]).includes(locale)
    ? (locale as CarBookingLocale)
    : "en";
}

export type CarBookingStrings = {
  redirecting: string;
  error: string;
  errorPayment: string;
  errorUnavailable: string;
  cancelTitle: string;
  /** Avant le clic, quand l'acompte est rendu. */
  cancelGetBack: string;
  /** Avant le clic, à moins de 48 h d'une réservation confirmée : 0 rendu. */
  cancelGetBackNothing: string;
  cancelSubmit: string;
  cancelling: string;
  /** Second temps de l'annulation (G4) : rien ne part au premier clic. */
  cancelAsk: string;
  cancelConfirm: string;
  cancelKeep: string;
  cancelledRefunded: string;
  cancelledNoRefund: string;
  cancelTooLate: string;
  cancelRetry: string;
  /** Le résultat aurait été pire que l'affiché (R49) : nouveau montant, second clic. */
  cancelChanged: string;
  /** Idem quand le nouveau montant est 0 € : aucun remboursement à annoncer. */
  cancelChangedNothing: string;
  /** Annulation refusée parce que l'acompte est déjà rendu (refus, silence ou ops entre-temps). */
  cancelAlreadyRefunded: string;
  depositTitle: string;
  depositIntro: string;
  totalLabel: string;
  depositLabel: string;
  depositPaidLabel: string;
  restLabel: string;
  depositConfirmRule: string;
  depositCancelRule: string;
  depositPay: string;
  tooClose: string;
  notReady: string;
  linkInvalid: string;
  pendingTitle: string;
  pendingBody: string;
  continuePayment: string;
  pendingNoSession: string;
  awaitingTitle: string;
  awaitingBody: string;
  confirmedTitle: string;
  confirmedBody: string;
  contactHeading: string;
  refundedTitle: string;
  refundedBody: string;
  /** Bandeau de la page d'offres après un remboursement : montant rendu. */
  refundedAmountBody: string;
  reasonPartnerDeclined: string;
  reasonPartnerTimeout: string;
  reasonClientCancelled: string;
  reasonPartnerCancelled: string;
  reasonOps: string;
  otherOffers: string;
  keptTitle: string;
  keptBody: string;
  /** Pages de suivi façon « lagon et chèvre » (nuit du 27/11/2026). */
  kickerPaid: string;
  kickerConfirmed: string;
  awaitingHero: string;
  awaitingLead: string;
  deadlineKicker: string;
  deadlineBody: string;
  contactTitle: string;
  contactLocked: string;
  pickupRow: string;
  returnRow: string;
  paidShort: string;
  counterShort: string;
  totalDays: string;
  orSimilar: string;
  freeCancelTitle: string;
};

/** Phrase qui dit au client pourquoi son acompte lui est rendu (pages et e-mails). */
export const REFUND_REASON_KEY: Record<RefundReason, keyof CarBookingStrings> = {
  partner_declined: "reasonPartnerDeclined",
  partner_timeout: "reasonPartnerTimeout",
  client_cancelled: "reasonClientCancelled",
  partner_cancelled: "reasonPartnerCancelled",
  ops: "reasonOps",
};

/** Remplace chaque `{clé}` d'un gabarit. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);
}

export const L: Record<CarBookingLocale, CarBookingStrings> = {
  en: {
    redirecting: "Redirecting to the payment page",
    error: "Error",
    errorPayment:
      "Payment is temporarily unavailable. Try again in a few minutes; if it persists, write to hello@crete.direct.",
    errorUnavailable: "This booking is no longer payable.",
    cancelTitle: "Cancel this booking",
    cancelGetBack: "If you cancel now, you get {amount} back on your card.",
    cancelGetBackNothing:
      "Pick-up is less than 48 hours away: if you cancel now, you get {amount} back and the deposit is kept.",
    cancelSubmit: "Cancel my booking",
    cancelling: "Cancelling",
    cancelAsk: "Are you sure? A cancelled booking can't be restored.",
    cancelConfirm: "Yes, cancel",
    cancelKeep: "Keep my booking",
    cancelledRefunded: "Booking cancelled. The refund of {amount} is on its way to your card.",
    cancelledNoRefund: "Booking cancelled. The deposit is kept.",
    cancelTooLate: "This booking can no longer be cancelled.",
    cancelRetry:
      "The cancellation could not be completed right now. Try again in a few minutes; if it persists, write to hello@crete.direct.",
    cancelChanged:
      "The amount has changed since this page was shown: if you cancel now, you get {amount} back. Click again to confirm.",
    cancelChangedNothing:
      "Your booking has changed since this page was shown: pick-up is now less than 48 hours away, so the deposit is kept if you cancel. Click again to confirm.",
    cancelAlreadyRefunded: "This booking is already cancelled and your deposit refunded.",
    depositTitle: "Book your car",
    depositIntro:
      "You pay a deposit online now. You pay the rest to the rental agency when you pick up the car.",
    totalLabel: "Total price",
    depositLabel: "Deposit, paid today",
    depositPaidLabel: "Deposit paid",
    restLabel: "To pay at the counter",
    depositConfirmRule:
      "The rental agency confirms within 4 opening hours (8:00 to 22:00, Greek time). Otherwise your deposit is refunded in full.",
    depositCancelRule:
      "Free cancellation up to 48 hours before pick-up: your deposit is refunded in full. Later, or if you do not show up, the deposit is kept.",
    depositPay: "Pay {deposit}",
    tooClose: "Too close to departure to book online.",
    notReady: "This offer cannot be paid online.",
    linkInvalid: "This booking link is no longer valid.",
    pendingTitle: "Payment in progress",
    pendingBody:
      "If you have just paid, your payment is being recorded: refresh this page in a minute.",
    continuePayment: "Continue the payment",
    pendingNoSession:
      "The payment page is no longer open. Try again in a few minutes.",
    awaitingTitle: "Deposit paid, awaiting confirmation",
    awaitingBody:
      "{partner} confirms your car by {deadline} (Athens time) at the latest. Otherwise your deposit is refunded in full. We email you as soon as it is confirmed.",
    confirmedTitle: "Your booking is confirmed",
    confirmedBody: "{partner} expects you at pick-up. You pay the rest at the counter.",
    contactHeading: "Rental agency contact",
    refundedTitle: "Your deposit has been refunded",
    refundedBody: "The full deposit goes back to the card you paid with.",
    refundedAmountBody: "Your deposit of {amount} goes back to the card you paid with.",
    reasonPartnerDeclined: "The rental agency could not confirm this car.",
    reasonPartnerTimeout: "The rental agency did not confirm in time.",
    reasonClientCancelled: "You cancelled this booking.",
    reasonPartnerCancelled: "The rental agency cancelled this booking.",
    reasonOps: "Our team cancelled this booking.",
    otherOffers: "See your other offers",
    kickerPaid: "Deposit received · {deposit}",
    kickerConfirmed: "Booking confirmed",
    awaitingHero: "Over to {partner} to confirm",
    awaitingLead: "We email you as soon as they answer. Without a timely confirmation, you are refunded.",
    deadlineKicker: "Answer at the latest",
    deadlineBody: "If {partner} does not confirm by then, your {deposit} is refunded in full and you can book another of your offers.",
    contactTitle: "Contact details",
    contactLocked: "{partner}'s details appear here once confirmed. The agency receives yours at the same time.",
    pickupRow: "Pick-up",
    returnRow: "Return",
    paidShort: "Paid",
    counterShort: "At the counter",
    totalDays: "Total, {days}",
    orSimilar: "or similar",
    freeCancelTitle: "Free cancellation",
    keptTitle: "Booking cancelled",
    keptBody:
      "This booking was cancelled less than 48 hours before pick-up: the deposit is kept, as stated in the cancellation terms.",
  },
  fr: {
    redirecting: "Redirection vers la page de paiement",
    error: "Erreur",
    errorPayment:
      "Le paiement est momentanément indisponible. Réessayez dans quelques minutes ; si cela persiste, écrivez à hello@crete.direct.",
    errorUnavailable: "Cette réservation n'est plus payable.",
    cancelTitle: "Annuler cette réservation",
    cancelGetBack: "Si vous annulez maintenant, vous récupérez {amount} sur votre carte.",
    cancelGetBackNothing:
      "La prise du véhicule est dans moins de 48 heures : si vous annulez maintenant, vous récupérez {amount} et l'acompte est conservé.",
    cancelSubmit: "Annuler ma réservation",
    cancelling: "Annulation en cours",
    cancelAsk: "Vous confirmez ? Une réservation annulée ne peut pas être rétablie.",
    cancelConfirm: "Oui, annuler",
    cancelKeep: "Garder ma réservation",
    cancelledRefunded: "Réservation annulée. Le remboursement de {amount} est en route vers votre carte.",
    cancelledNoRefund: "Réservation annulée. L'acompte est conservé.",
    cancelTooLate: "Cette réservation ne peut plus être annulée.",
    cancelRetry:
      "L'annulation n'a pas pu aboutir pour le moment. Réessayez dans quelques minutes ; si cela persiste, écrivez à hello@crete.direct.",
    cancelChanged:
      "Le montant a changé depuis l'affichage de cette page : si vous annulez maintenant, vous récupérez {amount}. Cliquez à nouveau pour confirmer.",
    cancelChangedNothing:
      "Votre réservation a changé depuis l'affichage de cette page : la prise du véhicule est désormais à moins de 48 h, l'acompte est donc conservé si vous annulez. Cliquez à nouveau pour confirmer.",
    cancelAlreadyRefunded: "Cette réservation est déjà annulée et votre acompte remboursé.",
    depositTitle: "Réservez votre voiture",
    depositIntro:
      "Vous payez un acompte en ligne maintenant. Vous réglez le reste au loueur à la prise du véhicule.",
    totalLabel: "Prix total",
    depositLabel: "Acompte, payé aujourd'hui",
    depositPaidLabel: "Acompte payé",
    restLabel: "À régler au comptoir",
    depositConfirmRule:
      "Le loueur confirme sous 4 heures d'ouverture (8 h à 22 h, heure grecque). Sinon, votre acompte vous est remboursé intégralement.",
    depositCancelRule:
      "Annulation gratuite jusqu'à 48 heures avant la prise du véhicule : votre acompte vous est remboursé intégralement. Plus tard, ou si vous ne vous présentez pas, l'acompte est conservé.",
    depositPay: "Payer {deposit}",
    tooClose: "Trop proche du départ pour réserver en ligne.",
    notReady: "Cette offre ne peut pas être payée en ligne.",
    linkInvalid: "Ce lien de réservation n'est plus valide.",
    pendingTitle: "Paiement en cours",
    pendingBody:
      "Si vous venez de payer, votre paiement est en cours d'enregistrement : actualisez cette page dans une minute.",
    continuePayment: "Reprendre le paiement",
    pendingNoSession:
      "La page de paiement n'est plus ouverte. Réessayez dans quelques minutes.",
    awaitingTitle: "Acompte payé, en attente de confirmation",
    awaitingBody:
      "{partner} confirme votre voiture au plus tard le {deadline} (heure d'Athènes). Sinon, votre acompte vous est remboursé intégralement. Nous vous écrivons dès la confirmation.",
    confirmedTitle: "Votre réservation est confirmée",
    confirmedBody: "{partner} vous attend à la prise du véhicule. Vous réglez le reste au comptoir.",
    contactHeading: "Coordonnées du loueur",
    refundedTitle: "Votre acompte a été remboursé",
    refundedBody: "L'intégralité de l'acompte revient sur la carte utilisée pour le paiement.",
    refundedAmountBody: "Votre acompte de {amount} revient sur la carte utilisée pour le paiement.",
    reasonPartnerDeclined: "Le loueur n'a pas pu confirmer cette voiture.",
    reasonPartnerTimeout: "Le loueur n'a pas confirmé à temps.",
    reasonClientCancelled: "Vous avez annulé cette réservation.",
    reasonPartnerCancelled: "Le loueur a annulé cette réservation.",
    reasonOps: "Notre équipe a annulé cette réservation.",
    otherOffers: "Voir vos autres offres",
    kickerPaid: "Acompte reçu · {deposit}",
    kickerConfirmed: "Réservation confirmée",
    awaitingHero: "Au tour de {partner} de confirmer",
    awaitingLead: "Nous vous écrivons dès sa réponse. Sans confirmation à temps, vous êtes remboursé.",
    deadlineKicker: "Réponse au plus tard",
    deadlineBody: "Si {partner} ne confirme pas d'ici là, vos {deposit} vous sont remboursés intégralement et vous pouvez réserver une autre de vos offres.",
    contactTitle: "Coordonnées",
    contactLocked: "Celles de {partner} s'affichent ici à la confirmation. Le loueur reçoit les vôtres au même moment.",
    pickupRow: "Prise",
    returnRow: "Restitution",
    paidShort: "Payé",
    counterShort: "Au comptoir",
    totalDays: "Total, {days}",
    orSimilar: "ou similaire",
    freeCancelTitle: "Annulation gratuite",
    keptTitle: "Réservation annulée",
    keptBody:
      "Cette réservation a été annulée moins de 48 heures avant la prise du véhicule : l'acompte est conservé, comme prévu par les conditions d'annulation.",
  },
  de: {
    redirecting: "Weiterleitung zur Zahlungsseite",
    error: "Fehler",
    errorPayment:
      "Die Zahlung ist vorübergehend nicht verfügbar. Bitte in einigen Minuten erneut versuchen; bei anhaltendem Fehler an hello@crete.direct schreiben.",
    errorUnavailable: "Diese Buchung ist nicht mehr zahlbar.",
    cancelTitle: "Diese Buchung stornieren",
    cancelGetBack: "Wenn Sie jetzt stornieren, erhalten Sie {amount} auf Ihre Karte zurück.",
    cancelGetBackNothing:
      "Die Abholung ist in weniger als 48 Stunden: Wenn Sie jetzt stornieren, erhalten Sie {amount} zurück und die Anzahlung wird einbehalten.",
    cancelSubmit: "Buchung stornieren",
    cancelling: "Stornierung läuft",
    cancelAsk: "Sind Sie sicher? Eine stornierte Buchung lässt sich nicht wiederherstellen.",
    cancelConfirm: "Ja, stornieren",
    cancelKeep: "Buchung behalten",
    cancelledRefunded: "Buchung storniert. Die Erstattung von {amount} ist auf dem Weg zu Ihrer Karte.",
    cancelledNoRefund: "Buchung storniert. Die Anzahlung wird einbehalten.",
    cancelTooLate: "Diese Buchung kann nicht mehr storniert werden.",
    cancelRetry:
      "Die Stornierung konnte gerade nicht abgeschlossen werden. Bitte in einigen Minuten erneut versuchen; bei anhaltendem Fehler an hello@crete.direct schreiben.",
    cancelChanged:
      "Der Betrag hat sich seit dem Laden dieser Seite geändert: Wenn Sie jetzt stornieren, erhalten Sie {amount} zurück. Klicken Sie erneut, um zu bestätigen.",
    cancelChangedNothing:
      "Ihre Buchung hat sich seit dem Laden dieser Seite geändert: Die Abholung ist jetzt weniger als 48 Stunden entfernt, die Anzahlung wird bei einer Stornierung daher einbehalten. Klicken Sie erneut, um zu bestätigen.",
    cancelAlreadyRefunded: "Diese Buchung ist bereits storniert und Ihre Anzahlung erstattet.",
    depositTitle: "Ihren Mietwagen buchen",
    depositIntro:
      "Sie zahlen jetzt online eine Anzahlung. Den Rest zahlen Sie bei der Abholung an den Vermieter.",
    totalLabel: "Gesamtpreis",
    depositLabel: "Anzahlung, heute bezahlt",
    depositPaidLabel: "Anzahlung bezahlt",
    restLabel: "Am Schalter zu zahlen",
    depositConfirmRule:
      "Der Vermieter bestätigt innerhalb von 4 Geschäftsstunden (8 bis 22 Uhr griechischer Zeit). Andernfalls wird Ihre Anzahlung vollständig erstattet.",
    depositCancelRule:
      "Kostenlose Stornierung bis 48 Stunden vor Abholung: Ihre Anzahlung wird vollständig erstattet. Danach oder bei Nichterscheinen wird die Anzahlung einbehalten.",
    depositPay: "{deposit} bezahlen",
    tooClose: "Zu kurz vor der Abholung für eine Online-Buchung.",
    notReady: "Dieses Angebot kann nicht online bezahlt werden.",
    linkInvalid: "Dieser Buchungslink ist nicht mehr gültig.",
    pendingTitle: "Zahlung läuft",
    pendingBody:
      "Wenn Sie gerade bezahlt haben, wird Ihre Zahlung erfasst: Laden Sie diese Seite in einer Minute neu.",
    continuePayment: "Zahlung fortsetzen",
    pendingNoSession:
      "Die Zahlungsseite ist nicht mehr geöffnet. Versuchen Sie es in einigen Minuten erneut.",
    awaitingTitle: "Anzahlung bezahlt, Bestätigung ausstehend",
    awaitingBody:
      "{partner} bestätigt Ihren Mietwagen spätestens am {deadline} (Athener Zeit). Andernfalls wird Ihre Anzahlung vollständig erstattet. Wir schreiben Ihnen, sobald die Bestätigung vorliegt.",
    confirmedTitle: "Ihre Buchung ist bestätigt",
    confirmedBody: "{partner} erwartet Sie bei der Abholung. Den Rest zahlen Sie am Schalter.",
    contactHeading: "Kontakt des Vermieters",
    refundedTitle: "Ihre Anzahlung wurde erstattet",
    refundedBody: "Die gesamte Anzahlung geht auf die Karte zurück, mit der Sie bezahlt haben.",
    refundedAmountBody: "Ihre Anzahlung von {amount} geht auf die Karte zurück, mit der Sie bezahlt haben.",
    reasonPartnerDeclined: "Der Vermieter konnte dieses Auto nicht bestätigen.",
    reasonPartnerTimeout: "Der Vermieter hat nicht rechtzeitig bestätigt.",
    reasonClientCancelled: "Sie haben diese Buchung storniert.",
    reasonPartnerCancelled: "Der Vermieter hat diese Buchung storniert.",
    reasonOps: "Unser Team hat diese Buchung storniert.",
    otherOffers: "Ihre anderen Angebote ansehen",
    kickerPaid: "Anzahlung erhalten · {deposit}",
    kickerConfirmed: "Buchung bestätigt",
    awaitingHero: "Wartet auf Bestätigung durch {partner}",
    awaitingLead: "Wir schreiben Ihnen, sobald die Antwort da ist. Ohne rechtzeitige Bestätigung wird erstattet.",
    deadlineKicker: "Antwort spätestens",
    deadlineBody: "Bestätigt {partner} bis dahin nicht, erhalten Sie Ihre {deposit} vollständig zurück und können ein anderes Ihrer Angebote buchen.",
    contactTitle: "Kontaktdaten",
    contactLocked: "Die Daten von {partner} erscheinen hier nach der Bestätigung. Die Vermietung erhält Ihre zur gleichen Zeit.",
    pickupRow: "Abholung",
    returnRow: "Rückgabe",
    paidShort: "Bezahlt",
    counterShort: "Am Schalter",
    totalDays: "Gesamt, {days}",
    orSimilar: "oder ähnlich",
    freeCancelTitle: "Kostenlose Stornierung",
    keptTitle: "Buchung storniert",
    keptBody:
      "Diese Buchung wurde weniger als 48 Stunden vor Abholung storniert: Die Anzahlung wird gemäß den Stornobedingungen einbehalten.",
  },
  el: {
    redirecting: "Ανακατεύθυνση στη σελίδα πληρωμής",
    error: "Σφάλμα",
    errorPayment:
      "Η πληρωμή δεν είναι προσωρινά διαθέσιμη. Δοκιμάστε ξανά σε λίγα λεπτά· αν επιμείνει, γράψτε στο hello@crete.direct.",
    errorUnavailable: "Αυτή η κράτηση δεν είναι πλέον πληρωτέα.",
    cancelTitle: "Ακύρωση αυτής της κράτησης",
    cancelGetBack: "Αν ακυρώσετε τώρα, σας επιστρέφονται {amount} στην κάρτα σας.",
    cancelGetBackNothing:
      "Η παραλαβή είναι σε λιγότερο από 48 ώρες: αν ακυρώσετε τώρα, σας επιστρέφονται {amount} και η προκαταβολή παρακρατείται.",
    cancelSubmit: "Ακύρωση κράτησης",
    cancelling: "Ακύρωση σε εξέλιξη",
    cancelAsk: "Είστε σίγουροι; Μια ακυρωμένη κράτηση δεν μπορεί να επανέλθει.",
    cancelConfirm: "Ναι, ακύρωση",
    cancelKeep: "Διατήρηση της κράτησης",
    cancelledRefunded: "Η κράτηση ακυρώθηκε. Η επιστροφή {amount} είναι καθ' οδόν προς την κάρτα σας.",
    cancelledNoRefund: "Η κράτηση ακυρώθηκε. Η προκαταβολή παρακρατείται.",
    cancelTooLate: "Αυτή η κράτηση δεν μπορεί πλέον να ακυρωθεί.",
    cancelRetry:
      "Η ακύρωση δεν ολοκληρώθηκε αυτή τη στιγμή. Δοκιμάστε ξανά σε λίγα λεπτά· αν επιμείνει, γράψτε στο hello@crete.direct.",
    cancelChanged:
      "Το ποσό άλλαξε από τότε που εμφανίστηκε η σελίδα: αν ακυρώσετε τώρα, σας επιστρέφονται {amount}. Πατήστε ξανά για επιβεβαίωση.",
    cancelChangedNothing:
      "Η κράτησή σας άλλαξε από τότε που εμφανίστηκε η σελίδα: η παραλαβή απέχει πλέον λιγότερο από 48 ώρες, οπότε η προκαταβολή παρακρατείται αν ακυρώσετε. Πατήστε ξανά για επιβεβαίωση.",
    cancelAlreadyRefunded: "Αυτή η κράτηση έχει ήδη ακυρωθεί και η προκαταβολή σας επιστράφηκε.",
    depositTitle: "Κάντε κράτηση για το αυτοκίνητό σας",
    depositIntro:
      "Πληρώνετε τώρα online μια προκαταβολή. Το υπόλοιπο το πληρώνετε στο γραφείο κατά την παραλαβή του αυτοκινήτου.",
    totalLabel: "Συνολική τιμή",
    depositLabel: "Προκαταβολή, σήμερα",
    depositPaidLabel: "Προκαταβολή που πληρώθηκε",
    restLabel: "Πληρωμή στο γκισέ",
    depositConfirmRule:
      "Το γραφείο επιβεβαιώνει μέσα σε 4 ώρες λειτουργίας (8:00 έως 22:00, ώρα Ελλάδας). Αλλιώς η προκαταβολή σας επιστρέφεται ολόκληρη.",
    depositCancelRule:
      "Δωρεάν ακύρωση έως 48 ώρες πριν την παραλαβή: η προκαταβολή σας επιστρέφεται ολόκληρη. Αργότερα, ή αν δεν εμφανιστείτε, η προκαταβολή παρακρατείται.",
    depositPay: "Πληρωμή {deposit}",
    tooClose: "Πολύ κοντά στην αναχώρηση για online κράτηση.",
    notReady: "Αυτή η προσφορά δεν μπορεί να πληρωθεί online.",
    linkInvalid: "Αυτός ο σύνδεσμος κράτησης δεν ισχύει πλέον.",
    pendingTitle: "Πληρωμή σε εξέλιξη",
    pendingBody:
      "Αν μόλις πληρώσατε, η πληρωμή σας καταχωρείται: ανανεώστε τη σελίδα σε ένα λεπτό.",
    continuePayment: "Συνέχεια πληρωμής",
    pendingNoSession:
      "Η σελίδα πληρωμής δεν είναι πλέον ανοιχτή. Δοκιμάστε ξανά σε λίγα λεπτά.",
    awaitingTitle: "Η προκαταβολή πληρώθηκε, αναμονή επιβεβαίωσης",
    awaitingBody:
      "Το {partner} επιβεβαιώνει το αυτοκίνητό σας το αργότερο έως {deadline} (ώρα Αθήνας). Αλλιώς η προκαταβολή σας επιστρέφεται ολόκληρη. Θα σας γράψουμε μόλις επιβεβαιωθεί.",
    confirmedTitle: "Η κράτησή σας επιβεβαιώθηκε",
    confirmedBody: "Το {partner} σας περιμένει στην παραλαβή. Το υπόλοιπο πληρώνεται στο γκισέ.",
    contactHeading: "Στοιχεία επικοινωνίας γραφείου",
    refundedTitle: "Η προκαταβολή σας επιστράφηκε",
    refundedBody: "Ολόκληρη η προκαταβολή επιστρέφει στην κάρτα με την οποία πληρώσατε.",
    refundedAmountBody: "Η προκαταβολή σας, {amount}, επιστρέφει στην κάρτα με την οποία πληρώσατε.",
    reasonPartnerDeclined: "Το γραφείο δεν μπόρεσε να επιβεβαιώσει αυτό το αυτοκίνητο.",
    reasonPartnerTimeout: "Το γραφείο δεν επιβεβαίωσε εγκαίρως.",
    reasonClientCancelled: "Ακυρώσατε αυτήν την κράτηση.",
    reasonPartnerCancelled: "Το γραφείο ακύρωσε αυτήν την κράτηση.",
    reasonOps: "Η ομάδα μας ακύρωσε αυτήν την κράτηση.",
    otherOffers: "Δείτε τις άλλες προσφορές σας",
    kickerPaid: "Η προκαταβολή ελήφθη · {deposit}",
    kickerConfirmed: "Η κράτηση επιβεβαιώθηκε",
    awaitingHero: "Σειρά του {partner} να επιβεβαιώσει",
    awaitingLead: "Σας γράφουμε μόλις απαντήσει. Χωρίς έγκαιρη επιβεβαίωση, σας επιστρέφονται τα χρήματα.",
    deadlineKicker: "Απάντηση το αργότερο",
    deadlineBody: "Αν το {partner} δεν επιβεβαιώσει μέχρι τότε, τα {deposit} σας επιστρέφονται ολόκληρα και μπορείτε να κλείσετε άλλη από τις προσφορές σας.",
    contactTitle: "Στοιχεία επικοινωνίας",
    contactLocked: "Τα στοιχεία του {partner} εμφανίζονται εδώ με την επιβεβαίωση. Το γραφείο λαμβάνει τα δικά σας την ίδια στιγμή.",
    pickupRow: "Παραλαβή",
    returnRow: "Επιστροφή",
    paidShort: "Πληρώθηκε",
    counterShort: "Στο γκισέ",
    totalDays: "Σύνολο, {days}",
    orSimilar: "ή παρόμοιο",
    freeCancelTitle: "Δωρεάν ακύρωση",
    keptTitle: "Η κράτηση ακυρώθηκε",
    keptBody:
      "Η κράτηση ακυρώθηκε λιγότερο από 48 ώρες πριν την παραλαβή: η προκαταβολή παρακρατείται, όπως προβλέπουν οι όροι ακύρωσης.",
  },
};
