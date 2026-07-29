// Bascule du flux : quand le tunnel voyageur est arme, accepter une offre ne met
// plus client et loueur en relation, cela ouvre un paiement.
//
// Les coordonnees ne sont echangees qu'APRES encaissement (webhook), sinon le
// client aurait le numero du loueur et aucune raison de payer sur crete.direct.
import { supabaseAdmin } from "./supabase-admin";
import { newToken, hashToken, siteBase } from "./car-quote";

const enabled = (): boolean => process.env.CAR_BOOKING_ENABLED === "on";

/**
 * Ouvre le paiement d'une demande fraichement acceptee.
 * Renvoie `null` quand le tunnel est desarme : l'appelant poursuit alors son
 * comportement historique, mise en relation par email.
 */
export async function startBookingAfterAccept(
  requestId: number,
  locale: string,
): Promise<{ payUrl: string } | null> {
  if (!enabled()) return null;

  const token = newToken();
  await supabaseAdmin
    .from("car_requests")
    .update({
      booking_token_hash: hashToken(token),
      // Etat de reservation remis a zero : le client vient d'accepter, un
      // ancien essai de paiement ne doit pas bloquer son nouveau lien.
      booking_status: null,
      booking_session_id: null,
    })
    .eq("id", requestId);

  return { payUrl: `${siteBase()}/${locale}/car-booking/${token}` };
}

/**
 * Mise en relation, APRES encaissement seulement. Appelee par le webhook.
 * Ne leve jamais : un email refuse ne doit pas faire echouer un webhook Stripe,
 * qui serait alors retente pendant trois jours. L'echec est journalise.
 */
export async function notifyBookingPaid(requestId: number): Promise<void> {
  const { data: row } = await supabaseAdmin
    .from("car_requests")
    .select(
      "id, customer_name, customer_email, customer_phone, pickup_slug, quoted_car_model, date_from, date_to, booking_amount_eur, cancellation_option, booking_token_hash, locale, quoted_by_partner_id",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (!row) return;

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("name, email, phone")
    .eq("id", row.quoted_by_partner_id)
    .maybeSingle();
  if (!partner?.email) {
    console.error("[car/booking] loueur sans email, mise en relation impossible", {
      requestId,
      partnerId: row.quoted_by_partner_id,
    });
    return;
  }

  // Nouveau jeton a l'encaissement : celui du paiement a fait son office, et le
  // clair n'existe plus cote serveur. Sans cela, l'email de confirmation
  // porterait un lien d'annulation qui ne mene nulle part.
  const cancelToken = newToken();
  await supabaseAdmin
    .from("car_requests")
    .update({ booking_token_hash: hashToken(cancelToken) })
    .eq("id", requestId);

  const { carPickupLabel } = await import("./car-lead");
  const { sendCarBookingPaidEmails } = await import("./email");
  await sendCarBookingPaidEmails(partner.email, {
    requestId: row.id,
    partnerName: partner.name ?? "",
    partnerPhone: partner.phone,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    carLabel: row.quoted_car_model ?? "Car rental",
    pickupLabel: carPickupLabel(row.pickup_slug),
    dateFrom: row.date_from,
    dateTo: row.date_to,
    amountPaidEur: Number(row.booking_amount_eur) || 0,
    hasOption: row.cancellation_option === true,
    cancelUrl: `${siteBase()}/${row.locale || "en"}/car-booking/${cancelToken}`,
  });
}
