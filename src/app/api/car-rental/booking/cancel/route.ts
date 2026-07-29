// Annulation d'une location payee en ligne.
//
// L'argent est sur le compte du loueur depuis le paiement, mais bloque : son
// compte est en versement `manual` et le payout n'a pas encore ete declenche.
// Le remboursement reprend donc le transfert ET la commission, sans creer le
// moindre decouvert chez lui. Une fois le payout parti (`transferred`),
// l'annulation est refusee : la fenetre de remboursement est fermee par
// construction, les deux seuils etant egaux.
//
// Stripe reverse proportionnellement au montant rembourse, sans reglage fin.
// On rembourse donc la TOTALITE, option comprise : c'est la seule regle qui
// tombe juste au centime des deux cotes.
//
// Plan : docs/superpowers/plans/2026-07-29-car-rental-tunnel-voyageur.md
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stays/stripe-helpers";
import { hashToken } from "@/lib/car-quote";
import { refundDueEur } from "@/lib/booking-policy";
import { classifyStripeFailure, stripeLogFields } from "@/lib/stripe-errors";

const enabled = (): boolean => process.env.CAR_BOOKING_ENABLED === "on";

/** Heures restantes avant la prise du vehicule. Negatif si elle est passee. */
function hoursUntil(dateFrom: string): number {
  return (new Date(`${dateFrom}T00:00:00.000Z`).getTime() - Date.now()) / 3_600_000;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!enabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";

  const { data: row } = await supabaseAdmin
    .from("car_requests")
    .select(
      "id, booking_status, booking_amount_eur, cancellation_option, booking_payment_intent_id, date_from, transfer_id",
    )
    .eq("booking_token_hash", hashToken(token))
    .maybeSingle();

  if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (row.booking_status !== "paid" || row.transfer_id) {
    return NextResponse.json({ ok: false, error: "Not cancellable" }, { status: 409 });
  }

  const paidEur = Number(row.booking_amount_eur) || 0;

  const refundEur = refundDueEur({
    hasOption: row.cancellation_option === true,
    hoursUntilStart: hoursUntil(row.date_from),
    amountPaidEur: paidEur,
  });

  if (refundEur > 0) {
    try {
      const refund = await stripeClient().refunds.create({
        payment_intent: row.booking_payment_intent_id,
        amount: Math.round(refundEur * 100),
        // Reprend au loueur ce qui lui avait ete credite, et rend la commission.
        // Les fonds etant encore bloques sur son solde, la reprise est indolore.
        reverse_transfer: true,
        refund_application_fee: true,
      });
      await supabaseAdmin
        .from("car_requests")
        .update({
          booking_status: "refunded",
          cancelled_at: new Date().toISOString(),
          refund_id: refund.id,
          refund_amount_eur: refundEur,
        })
        .eq("id", row.id);
    } catch (err) {
      const failure = classifyStripeFailure(err);
      console.error("[car/booking/cancel] remboursement refuse", {
        requestId: row.id,
        failure: failure.code,
        ...stripeLogFields(err),
      });
      // Rien n'est ecrit : la reservation reste payee et l'annulation rejouable.
      // Marquer l'annulation sans avoir rembourse laisserait un client sans
      // location ET sans argent.
      return NextResponse.json(
        { ok: false, code: failure.code, error: failure.message },
        { status: failure.status },
      );
    }
    return NextResponse.json({ ok: true, refundedEur: refundEur });
  }

  await supabaseAdmin
    .from("car_requests")
    .update({ booking_status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", row.id);
  return NextResponse.json({ ok: true, refundedEur: 0 });
}
