// Les deux gestes du back-office sur une facture de commission deja emise :
// l annuler par un avoir, ou la renvoyer quand l email a ete refuse.
//
// Une facture ne se supprime JAMAIS : elle porte un numero d une serie qui doit
// rester continue. Elle s annule par un avoir, et son numero ne bouge pas.
import { supabaseAdmin } from "./supabase-admin";
import {
  invoiceForRequest,
  creditInvoice,
  markInvoiceSent,
  rotateInvoiceToken,
  assertWritten,
} from "./car-invoice-server";
import { sendCreditNote, sendPartnerCommissionRequest } from "./email";
import { siteBase } from "./car-commission";
import { stripeClient } from "./stays/stripe-helpers";

/**
 * Tue le lien de paiement vivant d une demande : la session Checkout ouverte au
 * dernier clic du loueur vit 24 h, et elle survit a l avoir comme au bouton
 * « Perdu ». Sans expiration, un onglet reste ouvert chez le loueur et encaisse
 * de l argent sur une location qui n aura pas lieu.
 *
 * Un echec Stripe (session deja expiree, deja consommee, API muette) est
 * journalise et ne bloque RIEN : l avoir est un acte comptable, il ne depend
 * pas de la sante de Stripe.
 */
export async function expireCommissionSession(requestId: number): Promise<void> {
  const { data: req } = await supabaseAdmin
    .from("car_requests")
    .select("commission_session_id")
    .eq("id", requestId)
    .maybeSingle();
  const sessionId = (req?.commission_session_id as string | null) ?? null;
  if (!sessionId) return;
  try {
    await stripeClient().checkout.sessions.expire(sessionId);
  } catch (err) {
    console.error("[car/commission] expiration de session refusee par Stripe", {
      requestId,
      sessionId,
      err,
    });
  }
}

/**
 * Avoir la facture d une demande : la location n a finalement pas eu lieu.
 * `notified` dit si le loueur a pu etre prevenu : l avoir est un acte
 * comptable, il existe meme sans email, c est la notification qui manque.
 *
 * Un refus de la base sur l ecriture de l avoir LEVE et rien ne suit : sans
 * cela on rendrait un numero d avoir qui n existe nulle part, la demande
 * repasserait en « perdue » et le loueur recevrait la notification d une piece
 * comptable inexistante.
 */
export async function creditCommissionInvoice(
  requestId: number,
  reason: string,
): Promise<{ creditNumber: string; notified: boolean } | { error: string }> {
  const invoice = await invoiceForRequest(requestId);
  if (!invoice) return { error: "no_invoice" };
  if (invoice.credited_at) return { error: "already_credited" };
  // Un remboursement Stripe se fait a la main : trop rare pour justifier du
  // code, et un avoir sur de l argent encaisse ferait mentir la compta.
  if (invoice.paid_at) return { error: "already_paid" };

  // AVANT d ecrire l avoir : entre les deux, une session encore ouverte
  // encaisserait sur une facture qu on vient d annuler, et la page dirait
  // « Cancelled by credit note » sur de l argent reellement recu.
  await expireCommissionSession(requestId);

  const creditNumber = await creditInvoice(invoice.id, invoice.number, reason);

  // A ce point, l avoir EST deja en base : creditInvoice a leve si la base
  // l avait refuse. Un refus ICI ne peut plus etre repare en rejouant cette
  // fonction : le garde `credited_at` ci-dessus bloque tout second passage sur
  // `already_credited`. Lever ferait donc perdre le seul geste qui reste
  // possible, prevenir le loueur, sans rien reparer en echange. On journalise
  // fort pour une correction manuelle de `car_requests`, et on continue :
  // l ecran restera « louee » avec une commission a tort encaissable jusqu a
  // cette correction, mais ce n est plus invisible.
  try {
    const { error: outcomeError } = await supabaseAdmin
      .from("car_requests")
      .update({
        outcome: "lost",
        outcome_at: new Date().toISOString(),
        // une demande reperdue n a plus de commission encaissable
        commission_paid_at: null,
        // le lien de paiement est mort : on ne le reproposera pas au clic suivant
        commission_session_id: null,
      })
      .eq("id", requestId)
      .select();
    assertWritten("creditCommissionInvoice:outcome", requestId, outcomeError);
  } catch (err) {
    console.error(
      "[car/commission] avoir emis mais etat de la demande non mis a jour : intervention manuelle requise sur car_requests",
      { requestId, invoice: invoice.number, creditNumber, err },
    );
  }

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("name, email")
    .eq("id", invoice.partner_id)
    .maybeSingle();

  if (!partner?.email) {
    console.error("[car/commission] avoir emis mais loueur sans email", {
      requestId,
      creditNumber,
      partnerId: invoice.partner_id,
    });
    return { creditNumber, notified: false };
  }

  const notified = await sendCreditNote(partner.email, {
    creditNumber,
    number: invoice.number,
    partnerName: partner.name ?? "",
    amountEur: Number(invoice.amount_eur),
    reason,
  });
  if (!notified) {
    console.error("[car/commission] avoir emis mais email refuse", { requestId, creditNumber });
  }
  return { creditNumber, notified };
}

/**
 * Renvoie une facture dont l envoi a echoue. Le cron ne repassera jamais
 * dessus : il bascule la demande en « rented » AVANT de facturer, donc son
 * filtre `outcome is null` exclut definitivement la ligne des le lendemain. Ce
 * chemin est le seul rattrapage.
 *
 * Le jeton est stocke hache et n est jamais relisible : le renvoi en fabrique
 * donc un neuf, ce qui invalide au passage un ancien lien egare. Le NUMERO de
 * facture, lui, ne change jamais.
 */
export async function resendCommissionInvoice(
  requestId: number,
): Promise<{ number: string } | { error: string }> {
  const invoice = await invoiceForRequest(requestId);
  if (!invoice) return { error: "no_invoice" };
  if (invoice.credited_at) return { error: "already_credited" };
  if (invoice.paid_at) return { error: "already_paid" };

  const { data: req } = await supabaseAdmin
    .from("car_requests")
    .select("id, date_from, date_to")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { error: "no_request" };

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("name, email")
    .eq("id", invoice.partner_id)
    .maybeSingle();
  if (!partner?.email) return { error: "partner_without_email" };

  // ⛔ AVANT l email, et le refus arrete tout : un jeton non enregistre ne
  // correspond a rien en base, l email partirait avec un lien mort et le loueur
  // ne pourrait ni voir ni payer sa facture.
  let token: string;
  try {
    token = await rotateInvoiceToken(invoice.id);
  } catch (err) {
    console.error("[car/commission] rotation du jeton refusee, aucun renvoi", {
      requestId,
      invoice: invoice.number,
      err,
    });
    return { error: "token_rotation_failed" };
  }

  const ok = await sendPartnerCommissionRequest(partner.email, {
    requestId,
    partnerName: partner.name ?? "",
    commissionEur: Number(invoice.amount_eur),
    finalAmountEur: Number(invoice.base_amount_eur),
    dateFrom: req.date_from,
    dateTo: req.date_to,
    payUrl: `${siteBase()}/en/invoice/${token}`,
    invoiceNumber: invoice.number,
  });

  if (!ok) {
    // sent_at reste NULL : une facture comptee comme envoyee alors qu elle n est
    // jamais arrivee ferait disparaitre le bouton qui permet de la renvoyer.
    console.error("[car/commission] renvoi refuse par Resend", {
      requestId,
      invoice: invoice.number,
    });
    return { error: "mail_refused" };
  }

  try {
    await markInvoiceSent(invoice.id);
  } catch (err) {
    // L email EST parti cette fois : confondre ce cas avec `mail_refused`
    // afficherait « Resend a refuse l envoi » sur un envoi reussi. La facture
    // restera « jamais envoyee » a l ecran, et il faut le dire tel quel.
    console.error("[car/commission] facture renvoyee mais envoi non enregistre", {
      requestId,
      invoice: invoice.number,
      err,
    });
    return { error: "sent_not_recorded" };
  }
  return { number: invoice.number };
}
