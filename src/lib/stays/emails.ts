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
    await resendClient().emails.send({
      from: FROM_EMAIL,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
    });
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

export async function sendGuestConflict(
  guestEmail: string,
  o: Parameters<typeof guestConflictBody>[0],
): Promise<void> {
  await send(guestEmail, guestConflictSubject(o.listingTitle), guestConflictBody(o));
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
