import { Resend } from "resend";

const FROM_EMAIL = "Crete Direct <hello@crete.direct>";
// Convention du repo (cf src/lib/email.ts) : toute surface crete.direct repond sur
// hello@crete.direct. Jamais une adresse d'une autre marque.
const REPLY_TO = "hello@crete.direct";

function resendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

export function ownerRequestSubject(dateFrom: string, dateTo: string): string {
  return `Nouvelle demande de séjour · ${dateFrom} → ${dateTo}`;
}

export function ownerRequestBody(o: {
  guestName: string;
  dateFrom: string;
  dateTo: string;
  pax: number | null;
  approveUrl: string;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p>${o.guestName} souhaite réserver du <strong>${o.dateFrom}</strong> au <strong>${o.dateTo}</strong>${o.pax ? ` (${o.pax} pers.)` : ""}.</p>
    <p><a href="${o.approveUrl}" style="background:#C8A35F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Accepter et fixer mon prix</a></p>
    <p>Vous confirmez ou ajustez votre prix. crete.direct encaisse et vous reverse via Stripe. Commission 5%.</p>
  </div>`;
}

export function guestApprovedSubject(listingTitle: string): string {
  return `Séjour accepté : ${listingTitle}, payez pour confirmer`;
}

export function guestApprovedBody(o: {
  listingTitle: string;
  guestTotalEur: number;
  depositEur: number;
  payUrl: string;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p>Bonne nouvelle : votre séjour à <strong>${o.listingTitle}</strong> est accepté.</p>
    <p>Total ${o.guestTotalEur.toFixed(2)} € · acompte ${o.depositEur.toFixed(2)} € pour confirmer.</p>
    <p><a href="${o.payUrl}" style="background:#C8A35F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Payer l'acompte</a></p>
  </div>`;
}

export function ownerBookedSubject(dateFrom: string, dateTo: string): string {
  return `Réservation confirmée : ${dateFrom} au ${dateTo}`;
}

export function ownerBookedBody(o: {
  listingTitle: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  dateFrom: string;
  dateTo: string;
  ownerNetEur: number;
  depositEur: number;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p><strong>${o.guestName}</strong> a réglé son acompte pour <strong>${o.listingTitle}</strong>, du <strong>${o.dateFrom}</strong> au <strong>${o.dateTo}</strong>.</p>
    <p>Vos dates sont bloquées sur crete.direct. Bloquez les aussi sur vos autres canaux si votre calendrier n'est pas synchronisé.</p>
    <p>Contact voyageur : ${o.guestEmail}${o.guestPhone ? ` · ${o.guestPhone}` : ""}</p>
    <p>Votre net sur ce séjour : <strong>${o.ownerNetEur.toFixed(2)} EUR</strong>. Acompte déjà versé sur votre compte Stripe : ${o.depositEur.toFixed(2)} EUR. Le solde suit 14 jours avant l'arrivée.</p>
  </div>`;
}

export async function sendOwnerBooked(
  ownerEmail: string,
  o: Parameters<typeof ownerBookedBody>[0],
): Promise<void> {
  await send(ownerEmail, ownerBookedSubject(o.dateFrom, o.dateTo), ownerBookedBody(o));
}

export function guestReceivedSubject(listingTitle: string): string {
  return `Demande envoyée : ${listingTitle}`;
}

export function guestReceivedBody(o: {
  listingTitle: string;
  dateFrom: string;
  dateTo: string;
}): string {
  // Volontairement AUCUNE promesse d'expiration automatique : le cron d'expiration
  // est hors perimetre (lot B, tache 10, decalee le 29/07). Ne pas ajouter de delai
  // ici tant que ce cron n'existe pas.
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p>Votre demande pour <strong>${o.listingTitle}</strong>, du <strong>${o.dateFrom}</strong> au <strong>${o.dateTo}</strong>, est partie chez le propriétaire.</p>
    <p>Il confirme ses dates et son prix, puis vous recevez un lien de paiement. <strong>Rien n'est prélevé avant votre accord.</strong></p>
    <p>Sans réponse de sa part sous quelques jours, écrivez nous en répondant à ce message.</p>
  </div>`;
}

export function guestConflictSubject(listingTitle: string): string {
  return `Séjour indisponible : ${listingTitle}, vous êtes remboursé`;
}

export function guestConflictBody(o: {
  listingTitle: string;
  amountEur: number;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p>Les dates que vous venez de régler pour <strong>${o.listingTitle}</strong> ont été réservées quelques instants avant votre paiement.</p>
    <p>Votre acompte de ${o.amountEur.toFixed(2)} EUR est <strong>intégralement remboursé</strong>. Selon votre banque, il apparaît sur votre compte sous 5 à 10 jours ouvrés.</p>
    <p>D'autres dates restent ouvertes sur crete.direct. Toutes nos excuses.</p>
  </div>`;
}

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
): Promise<void> {
  await send(ownerEmail, ownerRequestSubject(o.dateFrom, o.dateTo), ownerRequestBody(o));
}

export async function sendGuestApproved(
  guestEmail: string,
  o: Parameters<typeof guestApprovedBody>[0],
): Promise<void> {
  await send(guestEmail, guestApprovedSubject(o.listingTitle), guestApprovedBody(o));
}

export async function sendGuestReceived(
  guestEmail: string,
  o: Parameters<typeof guestReceivedBody>[0],
): Promise<void> {
  await send(guestEmail, guestReceivedSubject(o.listingTitle), guestReceivedBody(o));
}

export async function sendGuestConflict(
  guestEmail: string,
  o: Parameters<typeof guestConflictBody>[0],
): Promise<void> {
  await send(guestEmail, guestConflictSubject(o.listingTitle), guestConflictBody(o));
}

export function guestBalanceDueBody(o: {
  listingTitle: string;
  dateFrom: string;
  amountEur: number;
  payUrl: string;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p>Votre arrivée à <strong>${o.listingTitle}</strong> approche : ${o.dateFrom}.</p>
    <p>Il reste le solde de <strong>${o.amountEur.toFixed(2)} EUR</strong> à régler.</p>
    <p><a href="${o.payUrl}" style="background:#C8A35F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Payer le solde</a></p>
  </div>`;
}

export async function sendGuestBalanceDue(
  guestEmail: string,
  o: Parameters<typeof guestBalanceDueBody>[0],
): Promise<void> {
  await send(guestEmail, `Solde à régler : ${o.listingTitle}`, guestBalanceDueBody(o));
}

export async function sendGuestBalancePaid(
  guestEmail: string,
  listingTitle: string,
): Promise<void> {
  await send(
    guestEmail,
    `Séjour réglé : ${listingTitle}`,
    `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">Le solde est réglé, votre séjour est intégralement payé. Le propriétaire vous contacte pour les modalités d'arrivée.</div>`,
  );
}

export async function sendGuestConfirmed(
  guestEmail: string,
  listingTitle: string,
): Promise<void> {
  await send(
    guestEmail,
    `Réservation confirmée : ${listingTitle}`,
    `<div style="font-family:Inter,Arial,sans-serif">Votre acompte est reçu, votre séjour est confirmé. Vous recevrez la demande de solde 14 jours avant l'arrivée.</div>`,
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

type WelcomeLocale = "en" | "fr" | "de" | "el";
const pickWelcome = (l: string): WelcomeLocale =>
  (["en", "fr", "de", "el"] as const).includes(l as WelcomeLocale) ? (l as WelcomeLocale) : "en";

const WELCOME: Record<WelcomeLocale, (o: OwnerWelcome) => string[]> = {
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

const WELCOME_SUBJECT: Record<WelcomeLocale, (t: string) => string> = {
  en: (t) => `${t} is online, here is your space`,
  fr: (t) => `${t} est en ligne, voici votre espace`,
  de: (t) => `${t} ist online, hier ist Ihr Bereich`,
  el: (t) => `Το ${t} είναι online, ο χώρος σας`,
};

export function ownerWelcomeSubject(listingTitle: string, locale: string): string {
  return WELCOME_SUBJECT[pickWelcome(locale)](listingTitle);
}

export function ownerWelcomeBody(o: OwnerWelcome, locale: string): string {
  return WELCOME[pickWelcome(locale)](o).join("\n");
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
        return `<p style="margin:0 0 12px"><a href="${line}" style="color:#008C9E;word-break:break-all">${line}</a></p>`;
      }
      return `<p style="margin:0 0 12px">${line}</p>`;
    })
    .join("");
  return `<div style="font-family:Inter,Arial,sans-serif;color:#0B3954;line-height:1.55">${body}</div>`;
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
