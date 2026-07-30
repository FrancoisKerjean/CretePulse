import { Resend } from "resend";

const FROM_EMAIL = "Crete Direct <hello@crete.direct>";
// Convention du repo (cf src/lib/email.ts) : toute surface crete.direct repond sur
// hello@crete.direct. Jamais une adresse d'une autre marque.
const REPLY_TO = "hello@crete.direct";

function resendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

// ── Quatre langues ──────────────────────────────────────────────────────────
// Les pages /stays servent en/fr/de/el. Les emails partaient en francais seul :
// un voyageur allemand recevait du francais, sur une campagne multilingue c'est
// la conversion qui tombe. Chaque email est donc un dictionnaire par locale avec
// repli anglais, sur le patron pose par l'accueil du proprietaire.
//
// La locale du voyageur vient de `stay_requests.locale`, posee a la demande.
// Celle du proprietaire vient de `stay_owners.locale`, posee au depot de
// l'annonce. Faute de locale connue, on ecrit en anglais : c'est la seule langue
// qu'un lecteur des quatre a une chance de comprendre.

export const EMAIL_LOCALES = ["en", "fr", "de", "el"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];

export function pickEmailLocale(locale: string | null | undefined): EmailLocale {
  const l = (locale ?? "").trim().toLowerCase();
  return (EMAIL_LOCALES as readonly string[]).includes(l) ? (l as EmailLocale) : "en";
}

// ── Habillage ───────────────────────────────────────────────────────────────
// Styles inline uniquement : Gmail et Outlook jettent les feuilles de style.
// Palette crete.direct (tokens Kalimera), jamais celle d'une autre marque.
const INK = "#0B3954";
const LAGOON_DEEP = "#008C9E";
const SUN = "#FFC83D";

const wrap = (inner: string): string =>
  `<div style="font-family:Inter,Arial,sans-serif;color:${INK};line-height:1.55">${inner}</div>`;

const p = (text: string): string => `<p style="margin:0 0 12px">${text}</p>`;

const button = (href: string, label: string): string =>
  `<p style="margin:0 0 12px"><a href="${href}" style="display:inline-block;background:${SUN};color:${INK};padding:13px 28px;border-radius:999px;text-decoration:none;font-weight:700">${label}</a></p>`;

/** Un montant lisible dans les quatre langues, sans piege de separateur decimal. */
const money = (n: number): string => `${n.toFixed(2)} EUR`;

const b = (s: string | number): string => `<strong>${s}</strong>`;

// ── Copie ───────────────────────────────────────────────────────────────────
// Le type impose la parite des cles : une langue incomplete ne compile pas.

interface StaysEmailCopy {
  ownerRequest: {
    subject: (dateFrom: string, dateTo: string) => string;
    intro: (guestName: string, dateFrom: string, dateTo: string, pax: number | null) => string;
    cta: string;
    terms: string;
  };
  guestReceived: {
    subject: (listingTitle: string) => string;
    intro: (listingTitle: string, dateFrom: string, dateTo: string) => string;
    next: string;
    expiry: (days: number) => string;
  };
  guestApproved: {
    subject: (listingTitle: string) => string;
    intro: (listingTitle: string) => string;
    amounts: (total: string, deposit: string) => string;
    cta: string;
  };
  guestConfirmed: {
    subject: (listingTitle: string) => string;
    intro: (listingTitle: string) => string;
    balance: string;
  };
  guestConflict: {
    subject: (listingTitle: string) => string;
    intro: (listingTitle: string) => string;
    refund: (amount: string) => string;
    closing: string;
  };
  guestBalanceDue: {
    subject: (listingTitle: string) => string;
    intro: (listingTitle: string, dateFrom: string) => string;
    amount: (amount: string) => string;
    cta: string;
  };
  guestBalancePaid: {
    subject: (listingTitle: string) => string;
    intro: (listingTitle: string) => string;
    next: string;
  };
  guestExpired: {
    subject: (listingTitle: string) => string;
    intro: (listingTitle: string, dateFrom: string, dateTo: string) => string;
    closed: string;
    closing: string;
  };
  ownerBooked: {
    subject: (dateFrom: string, dateTo: string) => string;
    intro: (guestName: string, listingTitle: string, dateFrom: string, dateTo: string) => string;
    blockElsewhere: string;
    contact: (email: string, phone: string | null) => string;
    net: (net: string, deposit: string) => string;
  };
}

const COPY: Record<EmailLocale, StaysEmailCopy> = {
  en: {
    ownerRequest: {
      subject: (f, t) => `New stay request: ${f} to ${t}`,
      intro: (g, f, t, pax) =>
        `${g} would like to book from ${b(f)} to ${b(t)}${pax ? ` (${pax} guests)` : ""}.`,
      cta: "Accept and set my price",
      terms:
        "You confirm your dates and your price. crete.direct collects the payment and pays you through Stripe. Commission 5%.",
    },
    guestReceived: {
      subject: (t) => `Request sent: ${t}`,
      intro: (t, f, to) =>
        `Your request for ${b(t)}, from ${b(f)} to ${b(to)}, has reached the owner.`,
      next: `They confirm their dates and their price, then you receive a payment link. ${b("Nothing is charged before you agree.")}`,
      expiry: (d) =>
        `If they do not answer within ${d} days, your request closes on its own and we let you know. ${b("You will not be charged.")}`,
    },
    guestApproved: {
      subject: (t) => `Stay accepted: ${t}, pay to confirm`,
      intro: (t) => `Good news: your stay at ${b(t)} is accepted.`,
      amounts: (total, deposit) => `Total ${total}, deposit ${deposit} to confirm.`,
      cta: "Pay the deposit",
    },
    guestConfirmed: {
      subject: (t) => `Booking confirmed: ${t}`,
      intro: (t) => `Your deposit for ${b(t)} is in, your stay is confirmed.`,
      balance: "You will receive the balance request 14 days before arrival.",
    },
    guestConflict: {
      subject: (t) => `${t} is no longer available, you are refunded`,
      intro: (t) =>
        `The dates you have just paid for at ${b(t)} were booked moments before your payment.`,
      refund: (a) =>
        `Your deposit of ${a} is ${b("refunded in full")}. Depending on your bank it lands within 5 to 10 working days.`,
      closing: "Other dates are still open on crete.direct. Our apologies.",
    },
    guestBalanceDue: {
      subject: (t) => `Balance due: ${t}`,
      intro: (t, f) => `Your arrival at ${b(t)} is coming up: ${f}.`,
      amount: (a) => `The balance of ${b(a)} is still to be paid.`,
      cta: "Pay the balance",
    },
    guestBalancePaid: {
      subject: (t) => `Stay paid in full: ${t}`,
      intro: (t) => `The balance is settled, your stay at ${b(t)} is paid in full.`,
      next: "The owner will contact you about arrival details.",
    },
    guestExpired: {
      subject: (t) => `No answer on your request: ${t}`,
      intro: (t, f, to) =>
        `The owner of ${b(t)} did not answer your request from ${b(f)} to ${b(to)}.`,
      closed: `It is now closed, and ${b("you have not been charged")}.`,
      closing: "Other places are still open on crete.direct. Our apologies for the silence.",
    },
    ownerBooked: {
      subject: (f, t) => `Booking confirmed: ${f} to ${t}`,
      intro: (g, t, f, to) =>
        `${b(g)} has paid the deposit for ${b(t)}, from ${b(f)} to ${b(to)}.`,
      blockElsewhere:
        "Your dates are blocked on crete.direct. Block them on your other channels too if your calendar is not synchronised.",
      contact: (email, phone) => `Guest contact: ${email}${phone ? `, ${phone}` : ""}`,
      net: (net, deposit) =>
        `Your net on this stay: ${b(net)}. Deposit already paid to your Stripe account: ${deposit}. The balance follows 14 days before arrival.`,
    },
  },

  fr: {
    ownerRequest: {
      subject: (f, t) => `Nouvelle demande de séjour : ${f} au ${t}`,
      intro: (g, f, t, pax) =>
        `${g} souhaite réserver du ${b(f)} au ${b(t)}${pax ? ` (${pax} pers.)` : ""}.`,
      cta: "Accepter et fixer mon prix",
      terms:
        "Vous confirmez vos dates et votre prix. crete.direct encaisse et vous reverse via Stripe. Commission 5%.",
    },
    guestReceived: {
      subject: (t) => `Demande envoyée : ${t}`,
      intro: (t, f, to) =>
        `Votre demande pour ${b(t)}, du ${b(f)} au ${b(to)}, est partie chez le propriétaire.`,
      next: `Il confirme ses dates et son prix, puis vous recevez un lien de paiement. ${b("Rien n'est prélevé avant votre accord.")}`,
      expiry: (d) =>
        `Sans réponse de sa part sous ${d} jours, votre demande se ferme d'elle-même et nous vous prévenons. ${b("Rien ne vous sera prélevé.")}`,
    },
    guestApproved: {
      subject: (t) => `Séjour accepté : ${t}, payez pour confirmer`,
      intro: (t) => `Bonne nouvelle : votre séjour à ${b(t)} est accepté.`,
      amounts: (total, deposit) => `Total ${total}, acompte ${deposit} pour confirmer.`,
      cta: "Payer l'acompte",
    },
    guestConfirmed: {
      subject: (t) => `Réservation confirmée : ${t}`,
      intro: (t) => `Votre acompte pour ${b(t)} est reçu, votre séjour est confirmé.`,
      balance: "Vous recevrez la demande de solde 14 jours avant l'arrivée.",
    },
    guestConflict: {
      subject: (t) => `Séjour indisponible : ${t}, vous êtes remboursé`,
      intro: (t) =>
        `Les dates que vous venez de régler pour ${b(t)} ont été réservées quelques instants avant votre paiement.`,
      refund: (a) =>
        `Votre acompte de ${a} est ${b("intégralement remboursé")}. Selon votre banque, il apparaît sur votre compte sous 5 à 10 jours ouvrés.`,
      closing: "D'autres dates restent ouvertes sur crete.direct. Toutes nos excuses.",
    },
    guestBalanceDue: {
      subject: (t) => `Solde à régler : ${t}`,
      intro: (t, f) => `Votre arrivée à ${b(t)} approche : ${f}.`,
      amount: (a) => `Il reste le solde de ${b(a)} à régler.`,
      cta: "Payer le solde",
    },
    guestBalancePaid: {
      subject: (t) => `Séjour réglé : ${t}`,
      intro: (t) => `Le solde est réglé, votre séjour à ${b(t)} est intégralement payé.`,
      next: "Le propriétaire vous contacte pour les modalités d'arrivée.",
    },
    guestExpired: {
      subject: (t) => `Demande sans réponse : ${t}`,
      intro: (t, f, to) =>
        `Le propriétaire de ${b(t)} n'a pas répondu à votre demande du ${b(f)} au ${b(to)}.`,
      closed: `Elle est close, et ${b("rien ne vous a été prélevé")}.`,
      closing:
        "D'autres logements restent ouverts sur crete.direct. Toutes nos excuses pour ce silence.",
    },
    ownerBooked: {
      subject: (f, t) => `Réservation confirmée : ${f} au ${t}`,
      intro: (g, t, f, to) =>
        `${b(g)} a réglé son acompte pour ${b(t)}, du ${b(f)} au ${b(to)}.`,
      blockElsewhere:
        "Vos dates sont bloquées sur crete.direct. Bloquez les aussi sur vos autres canaux si votre calendrier n'est pas synchronisé.",
      contact: (email, phone) => `Contact voyageur : ${email}${phone ? `, ${phone}` : ""}`,
      net: (net, deposit) =>
        `Votre net sur ce séjour : ${b(net)}. Acompte déjà versé sur votre compte Stripe : ${deposit}. Le solde suit 14 jours avant l'arrivée.`,
    },
  },

  de: {
    ownerRequest: {
      subject: (f, t) => `Neue Anfrage: ${f} bis ${t}`,
      intro: (g, f, t, pax) =>
        `${g} möchte vom ${b(f)} bis ${b(t)} buchen${pax ? ` (${pax} Personen)` : ""}.`,
      cta: "Annehmen und Preis festlegen",
      terms:
        "Sie bestätigen Ihre Daten und Ihren Preis. crete.direct zieht den Betrag ein und zahlt Sie über Stripe aus. Provision 5%.",
    },
    guestReceived: {
      subject: (t) => `Anfrage gesendet: ${t}`,
      intro: (t, f, to) =>
        `Ihre Anfrage für ${b(t)}, vom ${b(f)} bis ${b(to)}, ist beim Gastgeber angekommen.`,
      next: `Er bestätigt seine Daten und seinen Preis, dann erhalten Sie einen Zahlungslink. ${b("Vor Ihrer Zustimmung wird nichts abgebucht.")}`,
      expiry: (d) =>
        `Ohne Antwort innerhalb von ${d} Tagen schließt sich Ihre Anfrage von selbst und wir sagen es Ihnen. ${b("Es wird nichts abgebucht.")}`,
    },
    guestApproved: {
      subject: (t) => `Aufenthalt bestätigt: ${t}, jetzt bezahlen`,
      intro: (t) => `Gute Nachricht: Ihr Aufenthalt in ${b(t)} ist angenommen.`,
      amounts: (total, deposit) =>
        `Gesamt ${total}, Anzahlung ${deposit} zur Bestätigung.`,
      cta: "Anzahlung bezahlen",
    },
    guestConfirmed: {
      subject: (t) => `Buchung bestätigt: ${t}`,
      intro: (t) => `Ihre Anzahlung für ${b(t)} ist eingegangen, Ihr Aufenthalt ist bestätigt.`,
      balance: "Die Restzahlung fordern wir 14 Tage vor der Anreise an.",
    },
    guestConflict: {
      subject: (t) => `${t} ist nicht mehr frei, Sie werden erstattet`,
      intro: (t) =>
        `Die Daten, die Sie gerade für ${b(t)} bezahlt haben, wurden kurz vor Ihrer Zahlung gebucht.`,
      refund: (a) =>
        `Ihre Anzahlung von ${a} wird ${b("vollständig erstattet")}. Je nach Bank ist sie in 5 bis 10 Werktagen auf Ihrem Konto.`,
      closing: "Andere Daten sind auf crete.direct weiterhin frei. Wir bitten um Entschuldigung.",
    },
    guestBalanceDue: {
      subject: (t) => `Restzahlung offen: ${t}`,
      intro: (t, f) => `Ihre Anreise in ${b(t)} steht bevor: ${f}.`,
      amount: (a) => `Offen ist noch die Restzahlung von ${b(a)}.`,
      cta: "Restbetrag bezahlen",
    },
    guestBalancePaid: {
      subject: (t) => `Vollständig bezahlt: ${t}`,
      intro: (t) => `Der Restbetrag ist beglichen, Ihr Aufenthalt in ${b(t)} ist voll bezahlt.`,
      next: "Der Gastgeber meldet sich bei Ihnen zur Anreise.",
    },
    guestExpired: {
      subject: (t) => `Keine Antwort auf Ihre Anfrage: ${t}`,
      intro: (t, f, to) =>
        `Der Gastgeber von ${b(t)} hat auf Ihre Anfrage vom ${b(f)} bis ${b(to)} nicht geantwortet.`,
      closed: `Sie ist geschlossen, und ${b("es wurde nichts abgebucht")}.`,
      closing:
        "Andere Unterkünfte sind auf crete.direct weiterhin frei. Entschuldigen Sie das Schweigen.",
    },
    ownerBooked: {
      subject: (f, t) => `Buchung bestätigt: ${f} bis ${t}`,
      intro: (g, t, f, to) =>
        `${b(g)} hat die Anzahlung für ${b(t)} geleistet, vom ${b(f)} bis ${b(to)}.`,
      blockElsewhere:
        "Ihre Daten sind auf crete.direct gesperrt. Sperren Sie sie auch auf Ihren anderen Kanälen, wenn Ihr Kalender nicht synchronisiert ist.",
      contact: (email, phone) => `Kontakt des Gastes: ${email}${phone ? `, ${phone}` : ""}`,
      net: (net, deposit) =>
        `Ihr Netto für diesen Aufenthalt: ${b(net)}. Bereits auf Ihr Stripe-Konto ausgezahlte Anzahlung: ${deposit}. Der Rest folgt 14 Tage vor der Anreise.`,
    },
  },

  el: {
    ownerRequest: {
      subject: (f, t) => `Νέο αίτημα διαμονής: ${f} έως ${t}`,
      intro: (g, f, t, pax) =>
        `Ο/Η ${g} θέλει να κλείσει από ${b(f)} έως ${b(t)}${pax ? ` (${pax} άτομα)` : ""}.`,
      cta: "Αποδοχή και ορισμός τιμής",
      terms:
        "Επιβεβαιώνετε τις ημερομηνίες και την τιμή σας. Το crete.direct εισπράττει και σας αποδίδει μέσω Stripe. Προμήθεια 5%.",
    },
    guestReceived: {
      subject: (t) => `Το αίτημα στάλθηκε: ${t}`,
      intro: (t, f, to) =>
        `Το αίτημά σας για ${b(t)}, από ${b(f)} έως ${b(to)}, έφτασε στον ιδιοκτήτη.`,
      next: `Επιβεβαιώνει τις ημερομηνίες και την τιμή του, και μετά λαμβάνετε σύνδεσμο πληρωμής. ${b("Δεν χρεώνεται τίποτα πριν συμφωνήσετε.")}`,
      expiry: (d) =>
        `Χωρίς απάντηση μέσα σε ${d} ημέρες, το αίτημά σας κλείνει μόνο του και σας ενημερώνουμε. ${b("Δεν θα χρεωθείτε τίποτα.")}`,
    },
    guestApproved: {
      subject: (t) => `Η διαμονή εγκρίθηκε: ${t}, πληρώστε για επιβεβαίωση`,
      intro: (t) => `Καλά νέα: η διαμονή σας στο ${b(t)} εγκρίθηκε.`,
      amounts: (total, deposit) =>
        `Σύνολο ${total}, προκαταβολή ${deposit} για την επιβεβαίωση.`,
      cta: "Πληρωμή προκαταβολής",
    },
    guestConfirmed: {
      subject: (t) => `Η κράτηση επιβεβαιώθηκε: ${t}`,
      intro: (t) => `Η προκαταβολή σας για ${b(t)} ελήφθη, η διαμονή σας επιβεβαιώθηκε.`,
      balance: "Θα λάβετε το αίτημα εξόφλησης 14 ημέρες πριν την άφιξη.",
    },
    guestConflict: {
      subject: (t) => `Το ${t} δεν είναι πλέον διαθέσιμο, επιστρέφονται τα χρήματα`,
      intro: (t) =>
        `Οι ημερομηνίες που μόλις πληρώσατε για ${b(t)} κλείστηκαν λίγο πριν την πληρωμή σας.`,
      refund: (a) =>
        `Η προκαταβολή σας ${a} επιστρέφεται ${b("εξ ολοκλήρου")}. Ανάλογα με την τράπεζά σας, εμφανίζεται σε 5 έως 10 εργάσιμες ημέρες.`,
      closing: "Άλλες ημερομηνίες παραμένουν ανοιχτές στο crete.direct. Ζητούμε συγγνώμη.",
    },
    guestBalanceDue: {
      subject: (t) => `Υπόλοιπο προς πληρωμή: ${t}`,
      intro: (t, f) => `Η άφιξή σας στο ${b(t)} πλησιάζει: ${f}.`,
      amount: (a) => `Απομένει το υπόλοιπο ${b(a)}.`,
      cta: "Πληρωμή υπολοίπου",
    },
    guestBalancePaid: {
      subject: (t) => `Εξοφλήθηκε: ${t}`,
      intro: (t) => `Το υπόλοιπο εξοφλήθηκε, η διαμονή σας στο ${b(t)} είναι πληρωμένη.`,
      next: "Ο ιδιοκτήτης θα επικοινωνήσει μαζί σας για την άφιξη.",
    },
    guestExpired: {
      subject: (t) => `Καμία απάντηση στο αίτημά σας: ${t}`,
      intro: (t, f, to) =>
        `Ο ιδιοκτήτης του ${b(t)} δεν απάντησε στο αίτημά σας από ${b(f)} έως ${b(to)}.`,
      closed: `Το αίτημα έκλεισε, και ${b("δεν χρεωθήκατε τίποτα")}.`,
      closing:
        "Άλλα καταλύματα παραμένουν ανοιχτά στο crete.direct. Ζητούμε συγγνώμη για τη σιωπή.",
    },
    ownerBooked: {
      subject: (f, t) => `Κράτηση επιβεβαιωμένη: ${f} έως ${t}`,
      intro: (g, t, f, to) =>
        `Ο/Η ${b(g)} πλήρωσε την προκαταβολή για ${b(t)}, από ${b(f)} έως ${b(to)}.`,
      blockElsewhere:
        "Οι ημερομηνίες σας είναι δεσμευμένες στο crete.direct. Δεσμεύστε τις και στα άλλα κανάλια σας αν το ημερολόγιό σας δεν είναι συγχρονισμένο.",
      contact: (email, phone) => `Επικοινωνία επισκέπτη: ${email}${phone ? `, ${phone}` : ""}`,
      net: (net, deposit) =>
        `Τα καθαρά σας για τη διαμονή: ${b(net)}. Προκαταβολή που έχει ήδη πιστωθεί στον λογαριασμό Stripe: ${deposit}. Το υπόλοιπο ακολουθεί 14 ημέρες πριν την άφιξη.`,
    },
  },
};

const copy = (locale: string | null | undefined): StaysEmailCopy =>
  COPY[pickEmailLocale(locale)];

/** Nom de repli quand l'annonce n'a pas de titre. Traduit lui aussi : un repli
 *  francais dans un email allemand est le defaut meme qu'on corrige ici. */
const FALLBACK_TITLE: Record<EmailLocale, string> = {
  en: "your stay",
  fr: "votre séjour",
  de: "Ihr Aufenthalt",
  el: "η διαμονή σας",
};

export function fallbackListingTitle(locale: string | null | undefined): string {
  return FALLBACK_TITLE[pickEmailLocale(locale)];
}

// ── Demande recue par le proprietaire ───────────────────────────────────────

export function ownerRequestSubject(
  dateFrom: string,
  dateTo: string,
  locale: string,
): string {
  return copy(locale).ownerRequest.subject(dateFrom, dateTo);
}

export function ownerRequestBody(
  o: {
    guestName: string;
    dateFrom: string;
    dateTo: string;
    pax: number | null;
    approveUrl: string;
  },
  locale: string,
): string {
  const t = copy(locale).ownerRequest;
  return wrap(
    p(t.intro(o.guestName, o.dateFrom, o.dateTo, o.pax)) +
      button(o.approveUrl, t.cta) +
      p(t.terms),
  );
}

// ── Accuse de reception au voyageur ─────────────────────────────────────────
// Le delai annonce ici est TENU par /api/cron/stays-expire. Les deux doivent
// bouger ensemble, dans les quatre langues : un test importe EXPIRY_DAYS et
// verifie que chaque traduction annonce le meme nombre.

/** Delai annonce au voyageur, en jours. Doit valoir EXPIRY_DAYS du cron. */
const EXPIRY_DAYS_ANNOUNCED = 7;

export function guestReceivedSubject(listingTitle: string, locale: string): string {
  return copy(locale).guestReceived.subject(listingTitle);
}

export function guestReceivedBody(
  o: { listingTitle: string; dateFrom: string; dateTo: string },
  locale: string,
): string {
  const t = copy(locale).guestReceived;
  return wrap(
    p(t.intro(o.listingTitle, o.dateFrom, o.dateTo)) +
      p(t.next) +
      p(t.expiry(EXPIRY_DAYS_ANNOUNCED)),
  );
}

// ── Sejour accepte, acompte a payer ─────────────────────────────────────────

export function guestApprovedSubject(listingTitle: string, locale: string): string {
  return copy(locale).guestApproved.subject(listingTitle);
}

export function guestApprovedBody(
  o: {
    listingTitle: string;
    guestTotalEur: number;
    depositEur: number;
    payUrl: string;
  },
  locale: string,
): string {
  const t = copy(locale).guestApproved;
  return wrap(
    p(t.intro(o.listingTitle)) +
      p(t.amounts(money(o.guestTotalEur), money(o.depositEur))) +
      button(o.payUrl, t.cta),
  );
}

// ── Acompte recu ────────────────────────────────────────────────────────────

export function guestConfirmedSubject(listingTitle: string, locale: string): string {
  return copy(locale).guestConfirmed.subject(listingTitle);
}

export function guestConfirmedBody(listingTitle: string, locale: string): string {
  const t = copy(locale).guestConfirmed;
  return wrap(p(t.intro(listingTitle)) + p(t.balance));
}

// ── Collision de dates, remboursement ───────────────────────────────────────

export function guestConflictSubject(listingTitle: string, locale: string): string {
  return copy(locale).guestConflict.subject(listingTitle);
}

export function guestConflictBody(
  o: { listingTitle: string; amountEur: number },
  locale: string,
): string {
  const t = copy(locale).guestConflict;
  return wrap(
    p(t.intro(o.listingTitle)) + p(t.refund(money(o.amountEur))) + p(t.closing),
  );
}

// ── Solde ───────────────────────────────────────────────────────────────────

export function guestBalanceDueSubject(listingTitle: string, locale: string): string {
  return copy(locale).guestBalanceDue.subject(listingTitle);
}

export function guestBalanceDueBody(
  o: { listingTitle: string; dateFrom: string; amountEur: number; payUrl: string },
  locale: string,
): string {
  const t = copy(locale).guestBalanceDue;
  return wrap(
    p(t.intro(o.listingTitle, o.dateFrom)) +
      p(t.amount(money(o.amountEur))) +
      button(o.payUrl, t.cta),
  );
}

export function guestBalancePaidSubject(listingTitle: string, locale: string): string {
  return copy(locale).guestBalancePaid.subject(listingTitle);
}

export function guestBalancePaidBody(listingTitle: string, locale: string): string {
  const t = copy(locale).guestBalancePaid;
  return wrap(p(t.intro(listingTitle)) + p(t.next));
}

// ── Demande expiree ─────────────────────────────────────────────────────────

export function guestExpiredSubject(listingTitle: string, locale: string): string {
  return copy(locale).guestExpired.subject(listingTitle);
}

export function guestExpiredBody(
  o: { listingTitle: string; dateFrom: string; dateTo: string },
  locale: string,
): string {
  const t = copy(locale).guestExpired;
  return wrap(
    p(t.intro(o.listingTitle, o.dateFrom, o.dateTo)) + p(t.closed) + p(t.closing),
  );
}

// ── Reservation vue du proprietaire ─────────────────────────────────────────

export function ownerBookedSubject(
  dateFrom: string,
  dateTo: string,
  locale: string,
): string {
  return copy(locale).ownerBooked.subject(dateFrom, dateTo);
}

export function ownerBookedBody(
  o: {
    listingTitle: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string | null;
    dateFrom: string;
    dateTo: string;
    ownerNetEur: number;
    depositEur: number;
  },
  locale: string,
): string {
  const t = copy(locale).ownerBooked;
  return wrap(
    p(t.intro(o.guestName, o.listingTitle, o.dateFrom, o.dateTo)) +
      p(t.blockElsewhere) +
      p(t.contact(o.guestEmail, o.guestPhone)) +
      p(t.net(money(o.ownerNetEur), money(o.depositEur))),
  );
}

// ── Envoi ───────────────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    // Le SDK Resend ne leve PAS sur une erreur d'API : il renvoie { data, error }.
    // Sans cette lecture explicite, un domaine non verifie, un quota atteint ou une
    // adresse refusee passait en silence, et le proprietaire ne recevait jamais sa
    // demande sans que rien ne le signale.
    const { error } = await resendClient().emails.send({
      from: FROM_EMAIL,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
    });
    if (error) {
      console.error("[stays/emails] send rejected:", subject, error);
    }
  } catch (e) {
    console.error("[stays/emails] send failed:", e);
  }
}

export async function sendOwnerRequest(
  ownerEmail: string,
  o: Parameters<typeof ownerRequestBody>[0],
  locale: string,
): Promise<void> {
  await send(
    ownerEmail,
    ownerRequestSubject(o.dateFrom, o.dateTo, locale),
    ownerRequestBody(o, locale),
  );
}

export async function sendGuestReceived(
  guestEmail: string,
  o: Parameters<typeof guestReceivedBody>[0],
  locale: string,
): Promise<void> {
  await send(
    guestEmail,
    guestReceivedSubject(o.listingTitle, locale),
    guestReceivedBody(o, locale),
  );
}

export async function sendGuestApproved(
  guestEmail: string,
  o: Parameters<typeof guestApprovedBody>[0],
  locale: string,
): Promise<void> {
  await send(
    guestEmail,
    guestApprovedSubject(o.listingTitle, locale),
    guestApprovedBody(o, locale),
  );
}

export async function sendGuestConfirmed(
  guestEmail: string,
  listingTitle: string,
  locale: string,
): Promise<void> {
  await send(
    guestEmail,
    guestConfirmedSubject(listingTitle, locale),
    guestConfirmedBody(listingTitle, locale),
  );
}

export async function sendGuestConflict(
  guestEmail: string,
  o: Parameters<typeof guestConflictBody>[0],
  locale: string,
): Promise<void> {
  await send(
    guestEmail,
    guestConflictSubject(o.listingTitle, locale),
    guestConflictBody(o, locale),
  );
}

export async function sendGuestBalanceDue(
  guestEmail: string,
  o: Parameters<typeof guestBalanceDueBody>[0],
  locale: string,
): Promise<void> {
  await send(
    guestEmail,
    guestBalanceDueSubject(o.listingTitle, locale),
    guestBalanceDueBody(o, locale),
  );
}

export async function sendGuestBalancePaid(
  guestEmail: string,
  listingTitle: string,
  locale: string,
): Promise<void> {
  await send(
    guestEmail,
    guestBalancePaidSubject(listingTitle, locale),
    guestBalancePaidBody(listingTitle, locale),
  );
}

export async function sendOwnerBooked(
  ownerEmail: string,
  o: Parameters<typeof ownerBookedBody>[0],
  locale: string,
): Promise<void> {
  await send(
    ownerEmail,
    ownerBookedSubject(o.dateFrom, o.dateTo, locale),
    ownerBookedBody(o, locale),
  );
}

/** Expiration d'une demande restee sans reponse du proprietaire. */
export async function sendGuestExpired(
  guestEmail: string,
  o: Parameters<typeof guestExpiredBody>[0],
  locale: string,
): Promise<void> {
  await send(
    guestEmail,
    guestExpiredSubject(o.listingTitle, locale),
    guestExpiredBody(o, locale),
  );
}

// ── Email d'accueil du propriétaire ──────────────────────────────────────────
// Premier contact après la publication. Il porte le lien de l'espace, qui EST
// l'accès : pas de compte, pas de mot de passe, on le dit explicitement.
// Quatre langues, comme le reste de /stays.

export interface OwnerWelcome {
  ownerName: string;
  listingTitle: string;
  spaceUrl: string;
  icalExportUrl: string;
}

const WELCOME: Record<EmailLocale, (o: OwnerWelcome) => string[]> = {
  en: (o) => [
    `Hi ${o.ownerName || "there"},`,
    ``,
    `${o.listingTitle} is online on crete.direct.`,
    ``,
    `Here is your space. Keep this link, it is your access: there is no account and no password.`,
    o.spaceUrl,
    ``,
    `You will find your arrivals, your calendar, your price and what you earn on each stay.`,
    ``,
    `One thing to do now: paste this calendar link into Airbnb or Booking, so they block the nights sold here.`,
    o.icalExportUrl,
    ``,
    `Any question, just reply to this email.`,
  ],
  fr: (o) => [
    `Bonjour ${o.ownerName || ""},`.trim(),
    ``,
    `${o.listingTitle} est en ligne sur crete.direct.`,
    ``,
    `Voici votre espace. Conservez ce lien, c'est votre accès : il n'y a ni compte ni mot de passe.`,
    o.spaceUrl,
    ``,
    `Vous y trouverez vos arrivées, votre calendrier, votre prix et ce que vous touchez sur chaque séjour.`,
    ``,
    `Une chose à faire maintenant : collez ce lien de calendrier dans Airbnb ou Booking, pour qu'ils bloquent les nuits vendues ici.`,
    o.icalExportUrl,
    ``,
    `Une question, répondez simplement à ce message.`,
  ],
  de: (o) => [
    `Hallo ${o.ownerName || ""},`.trim(),
    ``,
    `${o.listingTitle} ist auf crete.direct online.`,
    ``,
    `Hier ist Ihr Bereich. Bewahren Sie diesen Link auf, er ist Ihr Zugang: es gibt kein Konto und kein Passwort.`,
    o.spaceUrl,
    ``,
    `Dort finden Sie Ihre Anreisen, Ihren Kalender, Ihren Preis und Ihre Einnahmen pro Aufenthalt.`,
    ``,
    `Eine Sache jetzt: fügen Sie diesen Kalenderlink in Airbnb oder Booking ein, damit die hier verkauften Nächte gesperrt werden.`,
    o.icalExportUrl,
    ``,
    `Bei Fragen antworten Sie einfach auf diese E-Mail.`,
  ],
  el: (o) => [
    `Γεια σας ${o.ownerName || ""},`.trim(),
    ``,
    `Το ${o.listingTitle} είναι online στο crete.direct.`,
    ``,
    `Αυτός είναι ο χώρος σας. Κρατήστε αυτόν τον σύνδεσμο, είναι η πρόσβασή σας: δεν υπάρχει λογαριασμός ούτε κωδικός.`,
    o.spaceUrl,
    ``,
    `Θα βρείτε τις αφίξεις σας, το ημερολόγιο, την τιμή σας και τα έσοδα κάθε διαμονής.`,
    ``,
    `Ένα πράγμα τώρα: επικολλήστε αυτόν τον σύνδεσμο ημερολογίου στο Airbnb ή στο Booking, ώστε να δεσμεύονται οι νύχτες που πωλούνται εδώ.`,
    o.icalExportUrl,
    ``,
    `Για οποιαδήποτε απορία, απαντήστε σε αυτό το μήνυμα.`,
  ],
};

const WELCOME_SUBJECT: Record<EmailLocale, (t: string) => string> = {
  en: (t) => `${t} is online, here is your space`,
  fr: (t) => `${t} est en ligne, voici votre espace`,
  de: (t) => `${t} ist online, hier ist Ihr Bereich`,
  el: (t) => `Το ${t} είναι online, ο χώρος σας`,
};

export function ownerWelcomeSubject(listingTitle: string, locale: string): string {
  return WELCOME_SUBJECT[pickEmailLocale(locale)](listingTitle);
}

export function ownerWelcomeBody(o: OwnerWelcome, locale: string): string {
  return WELCOME[pickEmailLocale(locale)](o).join("\n");
}

/** Le corps est ecrit en lignes : `send()` envoie du HTML, sans conversion tout
 *  arriverait en un seul bloc illisible. Les URL deviennent des liens cliquables,
 *  c'est le geste attendu sur les deux liens du message. */
export function ownerWelcomeHtml(o: OwnerWelcome, locale: string): string {
  const lines = ownerWelcomeBody(o, locale).split("\n");
  const body = lines
    .map((line) => {
      if (line === "") return "";
      if (/^https?:\/\//.test(line)) {
        return `<p style="margin:0 0 12px"><a href="${line}" style="color:${LAGOON_DEEP};word-break:break-all">${line}</a></p>`;
      }
      return `<p style="margin:0 0 12px">${line}</p>`;
    })
    .join("");
  return `<div style="font-family:Inter,Arial,sans-serif;color:${INK};line-height:1.55">${body}</div>`;
}

/** Envoi de l'accueil. `send()` avale les erreurs et les journalise : une
 *  publication reussie ne doit pas echouer parce qu'un email est refuse. */
export async function sendOwnerWelcome(
  ownerEmail: string,
  o: OwnerWelcome,
  locale: string,
): Promise<void> {
  await send(ownerEmail, ownerWelcomeSubject(o.listingTitle, locale), ownerWelcomeHtml(o, locale));
}
