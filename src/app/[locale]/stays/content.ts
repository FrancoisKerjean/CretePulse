// Contenu i18n de /stays (crete.direct Stays). Donnees pures, importees par les pages.
// Perimetre 25/07/2026 : en/fr/de/el rediges a la main. Les 18 autres locales routees
// retombent sur l'anglais via pickStaysLocale(). Structure identique a
// src/app/[locale]/car-rental/content.ts pour permettre l'extension aux 22 locales
// le jour ou une annonce reelle est publiee (script gen-*-content.mjs).
//
// Positionnement verrouille (decision Kami 25/07/2026) : angle "frais reels", factuel,
// pas de comparatif agressif. Le prix affiche est le net proprietaire, les 5 % sont
// annonces comme frais de paiement.
//
// Contrainte DA (gate CI check:da) : aucun tiret cadratin. Separateurs autorises :
// point median, virgule, point, deux-points.

export const STAYS_LOCALES = ["en", "fr", "de", "el"] as const;
export type StaysLocale = (typeof STAYS_LOCALES)[number];

export function pickStaysLocale(locale: string): StaysLocale {
  return (STAYS_LOCALES as readonly string[]).includes(locale)
    ? (locale as StaysLocale)
    : "en";
}

export type StaysMetaKey =
  | "index"
  | "listing"
  | "new"
  | "approve"
  | "pay"
  | "balance"
  | "terms";

export type StaysStrings = {
  index: {
    h1: string;
    intro: string;
    ownerCta: string;
    empty: string;
    emptyOwner: string;
    feeSuffix: string;
    perNight: string;
  };
  listing: {
    priceLabel: string;
    priceNote: string;
    feeNote: string;
    requestTitle: string;
    requestIntro: string;
    termsLink: string;
    unavailableTitle: string;
    unavailableEmpty: string;
  };
  form: {
    name: string;
    email: string;
    dateFrom: string;
    dateTo: string;
    pax: string;
    message: string;
    messagePlaceholder: string;
    submit: string;
    sending: string;
    success: string;
    error: string;
    errorUnavailable: string;
    errorMinNights: string;
  };
  wizard: {
    h1: string;
    intro: string;
    steps: [string, string];
    urlLabel: string;
    urlPlaceholder: string;
    emailLabel: string;
    priceLabel: string;
    priceHelp: string;
    submit: string;
    importing: string;
    draftCreated: string;
    invalidLink: string;
    icalTitle: string;
    icalHelp: string;
    icalPlaceholder: string;
    publish: string;
    publishing: string;
    published: string;
    exportTitle: string;
    exportHelp: string;
    error: string;
  };
  approve: {
    h1: string;
    intro: string;
    priceLabel: string;
    priceHelp: string;
    payoutTitle: string;
    payoutHelp: string;
    countryLabel: string;
    businessTypeLabel: string;
    businessIndividual: string;
    businessCompany: string;
    accept: string;
    decline: string;
    working: string;
    accepted: string;
    declined: string;
    error: string;
    /** Panne cote paiement, cle = `code` renvoye par l'API. Repli : message serveur. */
    errorPayouts: string;
    errorPayment: string;
  };
  pay: {
    h1: string;
    intro: string;
    depositNote: string;
    submit: string;
    redirecting: string;
    error: string;
    errorPayouts: string;
    errorPayment: string;
  };
  balance: {
    h1: string;
    intro: string;
    balanceNote: string;
    submit: string;
    redirecting: string;
    error: string;
    errorPayouts: string;
    errorPayment: string;
  };
  terms: {
    h1: string;
    paragraphs: Array<{ strong: string; text: string }>;
  };
};

export const META: Record<StaysLocale, Record<StaysMetaKey, { title: string; desc: string }>> = {
  en: {
    index: {
      title: "Book directly with the owner · crete.direct Stays",
      desc: "Holiday rentals in Crete booked directly with the owner. The price shown is what the owner receives, plus 5 % payment fees, stated upfront.",
    },
    listing: {
      title: "Holiday rental in Crete · crete.direct Stays",
      desc: "Request these dates directly from the owner. The owner confirms the price, you pay the amount shown plus 5 % payment fees.",
    },
    new: {
      title: "List your property · crete.direct Stays",
      desc: "Paste your Airbnb link, keep your own calendar, set your net price. Commission is 5 %, added to what the traveller pays.",
    },
    approve: {
      title: "A booking request · crete.direct Stays",
      desc: "Confirm or adjust your price for this stay request.",
    },
    pay: {
      title: "Confirm your stay · crete.direct Stays",
      desc: "Pay the 30 % deposit to lock your dates.",
    },
    balance: {
      title: "Pay the balance · crete.direct Stays",
      desc: "Settle the remaining 70 % before you arrive.",
    },
    terms: {
      title: "Terms · crete.direct Stays",
      desc: "crete.direct acts as a technical intermediary between owner and traveller. Commission, cancellation policy and responsibilities.",
    },
  },
  fr: {
    index: {
      title: "Réservez en direct avec le propriétaire · crete.direct Stays",
      desc: "Locations saisonnières en Crète réservées en direct avec le propriétaire. Le prix affiché est celui que touche le propriétaire, plus 5 % de frais de paiement annoncés.",
    },
    listing: {
      title: "Location saisonnière en Crète · crete.direct Stays",
      desc: "Demandez ces dates directement au propriétaire. Il confirme le prix, vous réglez le montant affiché plus 5 % de frais de paiement.",
    },
    new: {
      title: "Publiez votre logement · crete.direct Stays",
      desc: "Collez votre lien Airbnb, gardez votre calendrier, fixez votre prix net. La commission est de 5 %, ajoutée au montant réglé par le voyageur.",
    },
    approve: {
      title: "Une demande de séjour · crete.direct Stays",
      desc: "Confirmez ou ajustez votre prix pour cette demande de séjour.",
    },
    pay: {
      title: "Confirmez votre séjour · crete.direct Stays",
      desc: "Réglez l'acompte de 30 % pour bloquer vos dates.",
    },
    balance: {
      title: "Réglez le solde · crete.direct Stays",
      desc: "Réglez les 70 % restants avant votre arrivée.",
    },
    terms: {
      title: "Conditions · crete.direct Stays",
      desc: "crete.direct agit comme intermédiaire technique entre propriétaire et voyageur. Commission, annulation et responsabilités.",
    },
  },
  de: {
    index: {
      title: "Direkt beim Eigentümer buchen · crete.direct Stays",
      desc: "Ferienunterkünfte auf Kreta, direkt beim Eigentümer gebucht. Der angezeigte Preis ist der Betrag, den der Eigentümer erhält, zuzüglich 5 % Zahlungsgebühren, offen ausgewiesen.",
    },
    listing: {
      title: "Ferienunterkunft auf Kreta · crete.direct Stays",
      desc: "Fragen Sie diese Daten direkt beim Eigentümer an. Er bestätigt den Preis, Sie zahlen den angezeigten Betrag zuzüglich 5 % Zahlungsgebühren.",
    },
    new: {
      title: "Ihre Unterkunft eintragen · crete.direct Stays",
      desc: "Airbnb-Link einfügen, eigenen Kalender behalten, Nettopreis festlegen. Die Provision beträgt 5 % und wird dem Betrag des Reisenden hinzugefügt.",
    },
    approve: {
      title: "Eine Buchungsanfrage · crete.direct Stays",
      desc: "Bestätigen oder passen Sie Ihren Preis für diese Anfrage an.",
    },
    pay: {
      title: "Aufenthalt bestätigen · crete.direct Stays",
      desc: "Zahlen Sie die Anzahlung von 30 %, um Ihre Daten zu sichern.",
    },
    balance: {
      title: "Restbetrag zahlen · crete.direct Stays",
      desc: "Begleichen Sie die restlichen 70 % vor Ihrer Anreise.",
    },
    terms: {
      title: "Bedingungen · crete.direct Stays",
      desc: "crete.direct handelt als technischer Vermittler zwischen Eigentümer und Reisendem. Provision, Stornierung und Verantwortlichkeiten.",
    },
  },
  el: {
    index: {
      title: "Κρατήστε απευθείας με τον ιδιοκτήτη · crete.direct Stays",
      desc: "Καταλύματα διακοπών στην Κρήτη με απευθείας κράτηση από τον ιδιοκτήτη. Η τιμή που βλέπετε είναι αυτή που λαμβάνει ο ιδιοκτήτης, συν 5 % έξοδα πληρωμής, δηλωμένα εκ των προτέρων.",
    },
    listing: {
      title: "Κατάλυμα διακοπών στην Κρήτη · crete.direct Stays",
      desc: "Ζητήστε αυτές τις ημερομηνίες απευθείας από τον ιδιοκτήτη. Εκείνος επιβεβαιώνει την τιμή, εσείς πληρώνετε το ποσό που εμφανίζεται συν 5 % έξοδα πληρωμής.",
    },
    new: {
      title: "Καταχωρίστε το κατάλυμά σας · crete.direct Stays",
      desc: "Επικολλήστε τον σύνδεσμο Airbnb, κρατήστε το ημερολόγιό σας, ορίστε την καθαρή σας τιμή. Η προμήθεια είναι 5 %, προστίθεται στο ποσό του ταξιδιώτη.",
    },
    approve: {
      title: "Ένα αίτημα κράτησης · crete.direct Stays",
      desc: "Επιβεβαιώστε ή προσαρμόστε την τιμή σας για αυτό το αίτημα.",
    },
    pay: {
      title: "Επιβεβαιώστε τη διαμονή σας · crete.direct Stays",
      desc: "Πληρώστε την προκαταβολή 30 % για να κλειδώσετε τις ημερομηνίες σας.",
    },
    balance: {
      title: "Πληρωμή υπολοίπου · crete.direct Stays",
      desc: "Εξοφλήστε το υπόλοιπο 70 % πριν την άφιξή σας.",
    },
    terms: {
      title: "Όροι · crete.direct Stays",
      desc: "Το crete.direct λειτουργεί ως τεχνικός διαμεσολαβητής μεταξύ ιδιοκτήτη και ταξιδιώτη. Προμήθεια, ακύρωση και ευθύνες.",
    },
  },
};

export const L: Record<StaysLocale, StaysStrings> = {
  en: {
    index: {
      h1: "Book directly with the owner",
      intro:
        "5 % payment fees, stated upfront. The price you see is what the owner receives.",
      ownerCta: "You own a place in Crete? List it here",
      empty: "No listing published yet.",
      emptyOwner: "The first listings are being onboarded.",
      feeSuffix: "plus 5 % payment fees",
      perNight: "per night",
    },
    listing: {
      priceLabel: "Indicative price per night",
      priceNote: "The owner confirms the final price when accepting your dates.",
      feeNote: "You pay the price shown plus 5 % payment fees.",
      requestTitle: "Request these dates",
      requestIntro:
        "The owner receives your request by email and replies with a confirmed price. Nothing is charged at this stage.",
      termsLink: "Read the terms",
      unavailableTitle: "Already booked",
      unavailableEmpty: "Every night is open for now.",
    },
    form: {
      name: "Full name",
      email: "Email",
      dateFrom: "Arrival",
      dateTo: "Departure",
      pax: "Travellers",
      message: "Message to the owner",
      messagePlaceholder: "Optional. Anything useful about your stay.",
      submit: "Send the request",
      sending: "Sending",
      success: "Request sent. The owner will reply shortly.",
      error: "Something went wrong. Please try again.",
      errorUnavailable: "Those nights are already booked. Pick another range.",
      errorMinNights: "This place is booked from {n} nights.",
    },
    wizard: {
      h1: "List your property",
      intro:
        "Paste your Airbnb link, keep your own calendar. Commission is 5 %, added to what the traveller pays, so your net price stays your net price.",
      steps: ["Import your listing", "Prove it is yours, then publish"],
      urlLabel: "Airbnb link",
      urlPlaceholder: "https://www.airbnb.com/rooms/...",
      emailLabel: "Your email",
      priceLabel: "Your net price per night",
      priceHelp: "In euros, per night. This is the amount you receive, before the traveller fee.",
      submit: "Create my listing",
      importing: "Importing",
      draftCreated: "Draft created. Add your private Airbnb iCal to publish.",
      invalidLink: "That link could not be read. Check it and try again.",
      icalTitle: "Prove the listing is yours",
      icalHelp:
        "Paste your private Airbnb iCal URL, found under Calendar, Availability, Sync calendars. It stays private and is only used to read your booked dates.",
      icalPlaceholder: "https://www.airbnb.com/calendar/ical/....ics",
      publish: "Publish my listing",
      publishing: "Publishing",
      published: "Listing published.",
      exportTitle: "Last step, in Airbnb",
      exportHelp:
        "Add this export link in Airbnb so your dates booked here also block your Airbnb calendar.",
      error: "Error",
    },
    approve: {
      h1: "A stay request",
      intro:
        "Confirm or adjust your price. crete.direct collects the payment on your behalf and pays you out through Stripe, with a 5 % commission.",
      priceLabel: "Your net price per night",
      priceHelp: "In euros, per night. The traveller pays the nights booked plus 5 % payment fees.",
      payoutTitle: "Your payout account",
      payoutHelp:
        "Asked once only, when you accept your first stay. It opens your Stripe account, where crete.direct pays you out.",
      countryLabel: "Country of your bank account",
      businessTypeLabel: "You are",
      businessIndividual: "An individual",
      businessCompany: "A company",
      accept: "Accept and send the payment link",
      decline: "Decline",
      working: "Working",
      accepted: "Accepted. The traveller receives the payment link.",
      declined: "Declined.",
      errorPayouts:
        "Payouts are not open yet. Your request is safe: we come back to you as soon as your payout account can be created.",
      errorPayment:
        "Payment is temporarily unavailable. Try again in a few minutes; if it persists, write to contact@crete.direct.",
      error: "Error",
    },
    pay: {
      h1: "Confirm your stay",
      intro: "Pay the 30 % deposit to lock your dates.",
      depositNote:
        "The remaining balance is requested 14 days before arrival. Free cancellation more than 14 days before arrival.",
      submit: "Pay the 30 % deposit",
      redirecting: "Redirecting to the payment page",
      error: "Error",
      errorPayouts:
        "Payouts are not open yet, so this stay cannot be paid for right now. Your dates are held and the owner has been told: we come back to you shortly.",
      errorPayment:
        "Payment is temporarily unavailable. Try again in a few minutes; if it persists, write to contact@crete.direct.",
    },
    balance: {
      h1: "Pay the balance of your stay",
      intro:
        "Your dates are locked. Settle the remaining 70 % before you arrive.",
      balanceNote:
        "The deposit is already paid. This is the balance, the last step before your stay.",
      submit: "Pay the balance",
      redirecting: "Redirecting to the payment page",
      error: "Error",
      errorPayouts:
        "Payouts are not open yet. Your request is safe: we come back to you as soon as your payout account can be created.",
      errorPayment:
        "Payment is temporarily unavailable. Try again in a few minutes; if it persists, write to contact@crete.direct.",
    },
    terms: {
      h1: "Terms · crete.direct Stays",
      paragraphs: [
        {
          strong: "Technical intermediary.",
          text: "crete.direct connects an owner and a traveller and collects the payment on the owner's behalf.",
        },
        {
          strong: "Neither host nor insurer.",
          text: "crete.direct is not a party to the rental contract, stays out of any dispute between the parties and handles no security deposit.",
        },
        {
          strong: "Owner responsibility.",
          text: "The owner alone remains responsible for their AMA licence, their Greek tax filing and the compliance of their property. crete.direct does not guarantee that compliance.",
        },
        {
          strong: "Commission.",
          text: "5 % added to the amount paid by the traveller, shown as payment fees.",
        },
        {
          strong: "Cancellation.",
          text: "More than 14 days before arrival: full refund. Between 2 and 14 days: 50 %. Less than 48 hours: no refund.",
        },
      ],
    },
  },
  fr: {
    index: {
      h1: "Réservez en direct avec le propriétaire",
      intro:
        "5 % de frais de paiement, affichés. Le prix que vous voyez est celui que touche le propriétaire.",
      ownerCta: "Vous avez un logement en Crète ? Publiez-le ici",
      empty: "Aucune annonce publiée pour le moment.",
      emptyOwner: "Les premiers logements sont en cours d'intégration.",
      feeSuffix: "plus 5 % de frais de paiement",
      perNight: "par nuit",
    },
    listing: {
      priceLabel: "Prix indicatif par nuit",
      priceNote: "Le propriétaire confirme le prix définitif en acceptant vos dates.",
      feeNote: "Vous payez le prix affiché plus 5 % de frais de paiement.",
      requestTitle: "Demander ces dates",
      requestIntro:
        "Le propriétaire reçoit votre demande par email et répond avec un prix confirmé. Rien n'est débité à ce stade.",
      termsLink: "Lire les conditions",
      unavailableTitle: "Nuits deja reservees",
      unavailableEmpty: "Toutes les nuits sont libres pour l instant.",
    },
    form: {
      name: "Nom complet",
      email: "Email",
      dateFrom: "Arrivée",
      dateTo: "Départ",
      pax: "Voyageurs",
      message: "Message au propriétaire",
      messagePlaceholder: "Facultatif. Tout ce qui est utile sur votre séjour.",
      submit: "Envoyer la demande",
      sending: "Envoi en cours",
      success: "Demande envoyée. Le propriétaire vous répond sous peu.",
      error: "Une erreur est survenue. Réessayez.",
      errorUnavailable: "Ces nuits sont déjà réservées. Choisissez d autres dates.",
      errorMinNights: "Ce logement se réserve à partir de {n} nuits.",
    },
    wizard: {
      h1: "Publiez votre logement",
      intro:
        "Collez votre lien Airbnb, gardez votre calendrier. La commission est de 5 %, ajoutée au montant réglé par le voyageur : votre prix net reste votre prix net.",
      steps: ["Importez votre annonce", "Prouvez qu'elle est à vous, puis publiez"],
      urlLabel: "Lien Airbnb",
      urlPlaceholder: "https://www.airbnb.com/rooms/...",
      emailLabel: "Votre email",
      priceLabel: "Votre prix net par nuit",
      priceHelp: "En euros, par nuit. C'est le montant que vous percevez, avant frais voyageur.",
      submit: "Créer mon annonce",
      importing: "Import en cours",
      draftCreated: "Brouillon créé. Ajoutez votre iCal privé Airbnb pour publier.",
      invalidLink: "Ce lien n'a pas pu être lu. Vérifiez-le et réessayez.",
      icalTitle: "Prouvez que l'annonce est la vôtre",
      icalHelp:
        "Collez l'URL de votre iCal privé Airbnb, dans Calendrier, Disponibilité, Synchroniser les calendriers. Elle reste privée et sert uniquement à lire vos dates réservées.",
      icalPlaceholder: "https://www.airbnb.com/calendar/ical/....ics",
      publish: "Publier mon annonce",
      publishing: "Publication en cours",
      published: "Annonce publiée.",
      exportTitle: "Dernière étape, dans Airbnb",
      exportHelp:
        "Ajoutez ce lien d'export dans Airbnb pour que les dates réservées ici bloquent aussi votre calendrier Airbnb.",
      error: "Erreur",
    },
    approve: {
      h1: "Une demande de séjour",
      intro:
        "Confirmez ou ajustez votre prix. crete.direct encaisse pour votre compte et vous reverse via Stripe, avec une commission de 5 %.",
      priceLabel: "Votre prix net par nuit",
      priceHelp: "En euros, par nuit. Le voyageur règle les nuits réservées plus 5 % de frais de paiement.",
      payoutTitle: "Votre compte de versement",
      payoutHelp:
        "Demandé une seule fois, à votre première acceptation. Cela ouvre votre compte Stripe, sur lequel crete.direct vous reverse.",
      countryLabel: "Pays de votre compte bancaire",
      businessTypeLabel: "Vous êtes",
      businessIndividual: "Un particulier",
      businessCompany: "Une société",
      accept: "Accepter et envoyer le lien de paiement",
      decline: "Refuser",
      working: "Traitement en cours",
      accepted: "Accepté. Le voyageur reçoit le lien de paiement.",
      declined: "Refusé.",
      errorPayouts:
        "Les versements ne sont pas encore ouverts. Votre demande est conservée : nous revenons vers vous dès que votre compte de versement peut être créé.",
      errorPayment:
        "Le paiement est momentanément indisponible. Réessayez dans quelques minutes ; si cela persiste, écrivez à contact@crete.direct.",
      error: "Erreur",
    },
    pay: {
      h1: "Confirmez votre séjour",
      intro: "Réglez l'acompte de 30 % pour bloquer vos dates.",
      depositNote:
        "Le solde est demandé 14 jours avant l'arrivée. Annulation gratuite jusqu'à 14 jours avant l'arrivée.",
      submit: "Payer l'acompte de 30 %",
      redirecting: "Redirection vers la page de paiement",
      error: "Erreur",
      errorPayouts:
        "Les versements ne sont pas encore ouverts, ce séjour ne peut donc pas être réglé pour l'instant. Vos dates sont retenues et le propriétaire est prévenu : nous revenons vers vous rapidement.",
      errorPayment:
        "Le paiement est momentanément indisponible. Réessayez dans quelques minutes ; si cela persiste, écrivez à contact@crete.direct.",
    },
    balance: {
      h1: "Réglez le solde de votre séjour",
      intro:
        "Vos dates sont bloquées. Il reste les 70 % à régler avant votre arrivée.",
      balanceNote:
        "L'acompte est déjà réglé. Voici le solde, dernière étape avant votre séjour.",
      submit: "Payer le solde",
      redirecting: "Redirection vers la page de paiement",
      error: "Erreur",
      errorPayouts:
        "Les versements ne sont pas encore ouverts. Votre demande est conservée : nous revenons vers vous dès que votre compte de versement peut être créé.",
      errorPayment:
        "Le paiement est momentanément indisponible. Réessayez dans quelques minutes ; si cela persiste, écrivez à contact@crete.direct.",
    },
    terms: {
      h1: "Conditions · crete.direct Stays",
      paragraphs: [
        {
          strong: "Intermédiaire technique.",
          text: "crete.direct met en relation un propriétaire et un voyageur et encaisse le paiement pour le compte du propriétaire.",
        },
        {
          strong: "Ni hébergeur, ni assureur.",
          text: "crete.direct n'est pas partie au contrat de location, reste hors de tout litige entre les parties et ne gère aucune caution.",
        },
        {
          strong: "Responsabilité du propriétaire.",
          text: "Le propriétaire reste seul responsable de sa licence AMA, de sa déclaration fiscale grecque et de la conformité de son logement. crete.direct n'est pas garant de cette conformité.",
        },
        {
          strong: "Commission.",
          text: "5 % ajoutés au montant réglé par le voyageur, affichés comme frais de paiement.",
        },
        {
          strong: "Annulation.",
          text: "Plus de 14 jours avant l'arrivée : remboursement intégral. Entre 2 et 14 jours : 50 %. Moins de 48 heures : aucun remboursement.",
        },
      ],
    },
  },
  de: {
    index: {
      h1: "Direkt beim Eigentümer buchen",
      intro:
        "5 % Zahlungsgebühren, offen ausgewiesen. Der angezeigte Preis ist der Betrag, den der Eigentümer erhält.",
      ownerCta: "Sie haben eine Unterkunft auf Kreta? Tragen Sie sie hier ein",
      empty: "Noch keine Unterkunft veröffentlicht.",
      emptyOwner: "Die ersten Unterkünfte werden gerade aufgenommen.",
      feeSuffix: "zuzüglich 5 % Zahlungsgebühren",
      perNight: "pro Nacht",
    },
    listing: {
      priceLabel: "Richtpreis pro Nacht",
      priceNote: "Der Eigentümer bestätigt den Endpreis, wenn er Ihre Daten annimmt.",
      feeNote: "Sie zahlen den angezeigten Preis zuzüglich 5 % Zahlungsgebühren.",
      requestTitle: "Diese Daten anfragen",
      requestIntro:
        "Der Eigentümer erhält Ihre Anfrage per E-Mail und antwortet mit einem bestätigten Preis. Zu diesem Zeitpunkt wird nichts abgebucht.",
      termsLink: "Bedingungen lesen",
      unavailableTitle: "Bereits gebuchte Nachte",
      unavailableEmpty: "Aktuell sind alle Nachte frei.",
    },
    form: {
      name: "Vollständiger Name",
      email: "E-Mail",
      dateFrom: "Anreise",
      dateTo: "Abreise",
      pax: "Reisende",
      message: "Nachricht an den Eigentümer",
      messagePlaceholder: "Optional. Alles, was zu Ihrem Aufenthalt nützlich ist.",
      submit: "Anfrage senden",
      sending: "Wird gesendet",
      success: "Anfrage gesendet. Der Eigentümer antwortet in Kürze.",
      error: "Es ist ein Fehler aufgetreten. Bitte erneut versuchen.",
      errorUnavailable: "Diese Nächte sind bereits gebucht. Bitte andere Daten wählen.",
      errorMinNights: "Diese Unterkunft wird ab {n} Nächten gebucht.",
    },
    wizard: {
      h1: "Ihre Unterkunft eintragen",
      intro:
        "Airbnb-Link einfügen, eigenen Kalender behalten. Die Provision beträgt 5 % und wird dem Betrag des Reisenden hinzugefügt: Ihr Nettopreis bleibt Ihr Nettopreis.",
      steps: ["Ihr Inserat importieren", "Eigentum nachweisen, dann veröffentlichen"],
      urlLabel: "Airbnb-Link",
      urlPlaceholder: "https://www.airbnb.com/rooms/...",
      emailLabel: "Ihre E-Mail",
      priceLabel: "Ihr Nettopreis pro Nacht",
      priceHelp: "In Euro, pro Nacht. Das ist der Betrag, den Sie erhalten, vor der Reisendengebühr.",
      submit: "Inserat erstellen",
      importing: "Wird importiert",
      draftCreated:
        "Entwurf erstellt. Fügen Sie Ihren privaten Airbnb-iCal hinzu, um zu veröffentlichen.",
      invalidLink: "Dieser Link konnte nicht gelesen werden. Bitte prüfen und erneut versuchen.",
      icalTitle: "Weisen Sie nach, dass das Inserat Ihnen gehört",
      icalHelp:
        "Fügen Sie Ihre private Airbnb-iCal-URL ein, zu finden unter Kalender, Verfügbarkeit, Kalender synchronisieren. Sie bleibt privat und dient nur dazu, Ihre belegten Daten zu lesen.",
      icalPlaceholder: "https://www.airbnb.com/calendar/ical/....ics",
      publish: "Inserat veröffentlichen",
      publishing: "Wird veröffentlicht",
      published: "Inserat veröffentlicht.",
      exportTitle: "Letzter Schritt, in Airbnb",
      exportHelp:
        "Fügen Sie diesen Export-Link in Airbnb hinzu, damit hier gebuchte Daten auch Ihren Airbnb-Kalender blockieren.",
      error: "Fehler",
    },
    approve: {
      h1: "Eine Aufenthaltsanfrage",
      intro:
        "Bestätigen oder passen Sie Ihren Preis an. crete.direct zieht den Betrag für Sie ein und zahlt ihn über Stripe aus, mit 5 % Provision.",
      priceLabel: "Ihr Nettopreis pro Nacht",
      priceHelp:
        "In Euro. Der Reisende zahlt diesen Betrag zuzüglich 5 % Zahlungsgebühren.",
      payoutTitle: "Ihr Auszahlungskonto",
      payoutHelp:
        "Wird nur einmal abgefragt, bei Ihrer ersten Annahme. Damit wird Ihr Stripe Konto eröffnet, über das crete.direct auszahlt.",
      countryLabel: "Land Ihres Bankkontos",
      businessTypeLabel: "Sie sind",
      businessIndividual: "Eine Privatperson",
      businessCompany: "Ein Unternehmen",
      accept: "Annehmen und Zahlungslink senden",
      decline: "Ablehnen",
      working: "Wird verarbeitet",
      accepted: "Angenommen. Der Reisende erhält den Zahlungslink.",
      declined: "Abgelehnt.",
      errorPayouts:
        "Auszahlungen sind noch nicht freigeschaltet. Ihre Anfrage bleibt erhalten: Wir melden uns, sobald Ihr Auszahlungskonto angelegt werden kann.",
      errorPayment:
        "Die Zahlung ist vorübergehend nicht verfügbar. Bitte in einigen Minuten erneut versuchen; bei anhaltendem Fehler an contact@crete.direct schreiben.",
      error: "Fehler",
    },
    pay: {
      h1: "Aufenthalt bestätigen",
      intro: "Zahlen Sie die Anzahlung von 30 %, um Ihre Daten zu sichern.",
      depositNote:
        "Der Restbetrag wird 14 Tage vor Anreise angefordert. Kostenlose Stornierung bis 14 Tage vor Anreise.",
      submit: "Anzahlung von 30 % zahlen",
      redirecting: "Weiterleitung zur Zahlungsseite",
      error: "Fehler",
      errorPayouts:
        "Auszahlungen sind noch nicht freigeschaltet, dieser Aufenthalt kann daher derzeit nicht bezahlt werden. Ihre Daten bleiben reserviert und der Eigentümer ist informiert: Wir melden uns in Kürze.",
      errorPayment:
        "Die Zahlung ist vorübergehend nicht verfügbar. Bitte in einigen Minuten erneut versuchen; bei anhaltendem Fehler an contact@crete.direct schreiben.",
    },
    balance: {
      h1: "Restbetrag Ihres Aufenthalts zahlen",
      intro:
        "Ihre Daten sind gesichert. Es verbleiben 70 % vor Ihrer Anreise.",
      balanceNote:
        "Die Anzahlung ist bereits beglichen. Dies ist der Restbetrag, der letzte Schritt vor Ihrem Aufenthalt.",
      submit: "Restbetrag zahlen",
      redirecting: "Weiterleitung zur Zahlungsseite",
      error: "Fehler",
      errorPayouts:
        "Auszahlungen sind noch nicht freigeschaltet. Ihre Anfrage bleibt erhalten: Wir melden uns, sobald Ihr Auszahlungskonto angelegt werden kann.",
      errorPayment:
        "Die Zahlung ist vorübergehend nicht verfügbar. Bitte in einigen Minuten erneut versuchen; bei anhaltendem Fehler an contact@crete.direct schreiben.",
    },
    terms: {
      h1: "Bedingungen · crete.direct Stays",
      paragraphs: [
        {
          strong: "Technischer Vermittler.",
          text: "crete.direct bringt Eigentümer und Reisende zusammen und zieht die Zahlung für den Eigentümer ein.",
        },
        {
          strong: "Weder Gastgeber noch Versicherer.",
          text: "crete.direct ist nicht Vertragspartei des Mietvertrags, hält sich aus Streitigkeiten zwischen den Parteien heraus und verwaltet keine Kaution.",
        },
        {
          strong: "Verantwortung des Eigentümers.",
          text: "Der Eigentümer bleibt allein verantwortlich für seine AMA-Lizenz, seine griechische Steuererklärung und die Konformität seiner Unterkunft. crete.direct übernimmt dafür keine Gewähr.",
        },
        {
          strong: "Provision.",
          text: "5 %, dem vom Reisenden gezahlten Betrag hinzugefügt und als Zahlungsgebühren ausgewiesen.",
        },
        {
          strong: "Stornierung.",
          text: "Mehr als 14 Tage vor Anreise: volle Erstattung. Zwischen 2 und 14 Tagen: 50 %. Weniger als 48 Stunden: keine Erstattung.",
        },
      ],
    },
  },
  el: {
    index: {
      h1: "Κρατήστε απευθείας με τον ιδιοκτήτη",
      intro:
        "5 % έξοδα πληρωμής, δηλωμένα. Η τιμή που βλέπετε είναι αυτή που λαμβάνει ο ιδιοκτήτης.",
      ownerCta: "Έχετε κατάλυμα στην Κρήτη; Καταχωρίστε το εδώ",
      empty: "Δεν έχει δημοσιευτεί ακόμη κατάλυμα.",
      emptyOwner: "Τα πρώτα καταλύματα εντάσσονται αυτή τη στιγμή.",
      feeSuffix: "συν 5 % έξοδα πληρωμής",
      perNight: "ανά διανυκτέρευση",
    },
    listing: {
      priceLabel: "Ενδεικτική τιμή ανά διανυκτέρευση",
      priceNote: "Ο ιδιοκτήτης επιβεβαιώνει την τελική τιμή όταν δεχτεί τις ημερομηνίες σας.",
      feeNote: "Πληρώνετε την τιμή που εμφανίζεται συν 5 % έξοδα πληρωμής.",
      requestTitle: "Αίτημα για αυτές τις ημερομηνίες",
      requestIntro:
        "Ο ιδιοκτήτης λαμβάνει το αίτημά σας με email και απαντά με επιβεβαιωμένη τιμή. Τίποτα δεν χρεώνεται σε αυτό το στάδιο.",
      termsLink: "Διαβάστε τους όρους",
      unavailableTitle: "Ήδη κλεισμένες νύχτες",
      unavailableEmpty: "Όλες οι νύχτες είναι ελεύθερες προς το παρόν.",
    },
    form: {
      name: "Ονοματεπώνυμο",
      email: "Email",
      dateFrom: "Άφιξη",
      dateTo: "Αναχώρηση",
      pax: "Ταξιδιώτες",
      message: "Μήνυμα προς τον ιδιοκτήτη",
      messagePlaceholder: "Προαιρετικό. Ό,τι είναι χρήσιμο για τη διαμονή σας.",
      submit: "Αποστολή αιτήματος",
      sending: "Γίνεται αποστολή",
      success: "Το αίτημα στάλθηκε. Ο ιδιοκτήτης θα απαντήσει σύντομα.",
      error: "Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά.",
      errorUnavailable: "Αυτές οι νύχτες είναι ήδη κλεισμένες. Επιλέξτε άλλες ημερομηνίες.",
      errorMinNights: "Το κατάλυμα κλείνει από {n} νύχτες.",
    },
    wizard: {
      h1: "Καταχωρίστε το κατάλυμά σας",
      intro:
        "Επικολλήστε τον σύνδεσμο Airbnb, κρατήστε το ημερολόγιό σας. Η προμήθεια είναι 5 %, προστίθεται στο ποσό που πληρώνει ο ταξιδιώτης: η καθαρή σας τιμή παραμένει καθαρή.",
      steps: ["Εισαγωγή της αγγελίας σας", "Αποδείξτε ότι σας ανήκει, μετά δημοσιεύστε"],
      urlLabel: "Σύνδεσμος Airbnb",
      urlPlaceholder: "https://www.airbnb.com/rooms/...",
      emailLabel: "Το email σας",
      priceLabel: "Η καθαρή σας τιμή ανά διανυκτέρευση",
      priceHelp: "Σε ευρώ, ανά διανυκτέρευση. Είναι το ποσό που λαμβάνετε, πριν από τα έξοδα του ταξιδιώτη.",
      submit: "Δημιουργία αγγελίας",
      importing: "Γίνεται εισαγωγή",
      draftCreated:
        "Το προσχέδιο δημιουργήθηκε. Προσθέστε το ιδιωτικό σας iCal Airbnb για δημοσίευση.",
      invalidLink: "Ο σύνδεσμος δεν διαβάστηκε. Ελέγξτε τον και δοκιμάστε ξανά.",
      icalTitle: "Αποδείξτε ότι η αγγελία σας ανήκει",
      icalHelp:
        "Επικολλήστε το ιδιωτικό URL iCal του Airbnb, από Ημερολόγιο, Διαθεσιμότητα, Συγχρονισμός ημερολογίων. Παραμένει ιδιωτικό και χρησιμεύει μόνο για την ανάγνωση των κρατημένων ημερομηνιών σας.",
      icalPlaceholder: "https://www.airbnb.com/calendar/ical/....ics",
      publish: "Δημοσίευση αγγελίας",
      publishing: "Γίνεται δημοσίευση",
      published: "Η αγγελία δημοσιεύτηκε.",
      exportTitle: "Τελευταίο βήμα, μέσα στο Airbnb",
      exportHelp:
        "Προσθέστε αυτόν τον σύνδεσμο εξαγωγής στο Airbnb ώστε οι ημερομηνίες που κρατούνται εδώ να δεσμεύουν και το ημερολόγιο Airbnb σας.",
      error: "Σφάλμα",
    },
    approve: {
      h1: "Ένα αίτημα διαμονής",
      intro:
        "Επιβεβαιώστε ή προσαρμόστε την τιμή σας. Το crete.direct εισπράττει για λογαριασμό σας και σας αποδίδει μέσω Stripe, με προμήθεια 5 %.",
      priceLabel: "Η καθαρή σας τιμή ανά διανυκτέρευση",
      priceHelp: "Σε ευρώ. Ο ταξιδιώτης πληρώνει αυτό το ποσό συν 5 % έξοδα πληρωμής.",
      payoutTitle: "Ο λογαριασμός πληρωμής σας",
      payoutHelp:
        "Ζητείται μία μόνο φορά, στην πρώτη σας αποδοχή. Ανοίγει τον λογαριασμό σας Stripe, μέσω του οποίου σας πληρώνει το crete.direct.",
      countryLabel: "Χώρα του τραπεζικού σας λογαριασμού",
      businessTypeLabel: "Είστε",
      businessIndividual: "Ιδιώτης",
      businessCompany: "Εταιρεία",
      accept: "Αποδοχή και αποστολή συνδέσμου πληρωμής",
      decline: "Απόρριψη",
      working: "Γίνεται επεξεργασία",
      accepted: "Έγινε αποδοχή. Ο ταξιδιώτης λαμβάνει τον σύνδεσμο πληρωμής.",
      declined: "Απορρίφθηκε.",
      errorPayouts:
        "Οι πληρωμές προς τους ιδιοκτήτες δεν έχουν ενεργοποιηθεί ακόμη. Το αίτημά σας διατηρείται: επικοινωνούμε μαζί σας μόλις δημιουργηθεί ο λογαριασμός πληρωμών.",
      errorPayment:
        "Η πληρωμή δεν είναι προσωρινά διαθέσιμη. Δοκιμάστε ξανά σε λίγα λεπτά· αν επιμείνει, γράψτε στο contact@crete.direct.",
      error: "Σφάλμα",
    },
    pay: {
      h1: "Επιβεβαιώστε τη διαμονή σας",
      intro: "Πληρώστε την προκαταβολή 30 % για να κλειδώσετε τις ημερομηνίες σας.",
      depositNote:
        "Το υπόλοιπο ζητείται 14 ημέρες πριν από την άφιξη. Δωρεάν ακύρωση έως 14 ημέρες πριν από την άφιξη.",
      submit: "Πληρωμή προκαταβολής 30 %",
      redirecting: "Ανακατεύθυνση στη σελίδα πληρωμής",
      error: "Σφάλμα",
      errorPayouts:
        "Οι πληρωμές προς τους ιδιοκτήτες δεν έχουν ενεργοποιηθεί ακόμη, οπότε η διαμονή δεν μπορεί να εξοφληθεί αυτή τη στιγμή. Οι ημερομηνίες σας κρατούνται και ο ιδιοκτήτης έχει ενημερωθεί: επικοινωνούμε σύντομα μαζί σας.",
      errorPayment:
        "Η πληρωμή δεν είναι προσωρινά διαθέσιμη. Δοκιμάστε ξανά σε λίγα λεπτά· αν επιμείνει, γράψτε στο contact@crete.direct.",
    },
    balance: {
      h1: "Πληρώστε το υπόλοιπο της διαμονής σας",
      intro:
        "Οι ημερομηνίες σας είναι κλειδωμένες. Απομένει το 70 % πριν την άφιξή σας.",
      balanceNote:
        "Η προκαταβολή έχει ήδη πληρωθεί. Αυτό είναι το υπόλοιπο, το τελευταίο βήμα πριν τη διαμονή σας.",
      submit: "Πληρωμή υπολοίπου",
      redirecting: "Ανακατεύθυνση στη σελίδα πληρωμής",
      error: "Σφάλμα",
      errorPayouts:
        "Οι πληρωμές προς τους ιδιοκτήτες δεν έχουν ενεργοποιηθεί ακόμη. Το αίτημά σας διατηρείται: επικοινωνούμε μαζί σας μόλις δημιουργηθεί ο λογαριασμός πληρωμών.",
      errorPayment:
        "Η πληρωμή δεν είναι προσωρινά διαθέσιμη. Δοκιμάστε ξανά σε λίγα λεπτά· αν επιμείνει, γράψτε στο contact@crete.direct.",
    },
    terms: {
      h1: "Όροι · crete.direct Stays",
      paragraphs: [
        {
          strong: "Τεχνικός διαμεσολαβητής.",
          text: "Το crete.direct φέρνει σε επαφή έναν ιδιοκτήτη και έναν ταξιδιώτη και εισπράττει την πληρωμή για λογαριασμό του ιδιοκτήτη.",
        },
        {
          strong: "Ούτε οικοδεσπότης ούτε ασφαλιστής.",
          text: "Το crete.direct δεν είναι συμβαλλόμενο μέρος στη σύμβαση μίσθωσης, παραμένει εκτός κάθε διαφοράς μεταξύ των μερών και δεν διαχειρίζεται καμία εγγύηση.",
        },
        {
          strong: "Ευθύνη του ιδιοκτήτη.",
          text: "Ο ιδιοκτήτης παραμένει αποκλειστικά υπεύθυνος για την άδεια ΑΜΑ, τη φορολογική του δήλωση στην Ελλάδα και τη συμμόρφωση του καταλύματός του. Το crete.direct δεν εγγυάται αυτή τη συμμόρφωση.",
        },
        {
          strong: "Προμήθεια.",
          text: "5 % που προστίθενται στο ποσό που καταβάλλει ο ταξιδιώτης, εμφανιζόμενα ως έξοδα πληρωμής.",
        },
        {
          strong: "Ακύρωση.",
          text: "Πάνω από 14 ημέρες πριν από την άφιξη: πλήρης επιστροφή. Μεταξύ 2 και 14 ημερών: 50 %. Λιγότερο από 48 ώρες: καμία επιστροφή.",
        },
      ],
    },
  },
};
