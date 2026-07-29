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
