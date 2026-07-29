// Encaissement de la commission loueur. Endpoint distinct de celui de Stays :
// secret de signature propre, scope propre au registre.
//
// Rappel du compte partage (NovAI acct_1TDPicEQ3UQbwGzY) : chaque endpoint du
// compte recoit les `checkout.session.completed` de TOUTES les marques, Stays,
// IEUF, Eleni et le moteur Kairos compris. On ecarte donc ce qui n'est pas une
// commission voiture AVANT toute ecriture, et on repond 200 : un 4xx ferait
// retenter Stripe pendant 3 jours et degraderait la sante de l'endpoint.
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stays/stripe-helpers";
import { transferDueAt } from "@/lib/booking-policy";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sig = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_CAR as string,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const meta =
    (event.data.object as { metadata?: Record<string, string> })?.metadata ?? {};
  const requestId = Number(meta.car_request_id);

  // Deux flux passent par cet endpoint : la commission facturee au loueur
  // (modele hors ligne) et le paiement du voyageur (tunnel en ligne). Tout le
  // reste appartient a une autre marque du compte et sort en 200 muet.
  const paymentType = meta.payment_type;
  if (
    (paymentType !== "car_commission" && paymentType !== "car_booking") ||
    meta.brand !== "crete.direct" ||
    !Number.isInteger(requestId) ||
    requestId <= 0
  ) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const { error: insErr } = await supabaseAdmin.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    type: event.type,
    request_id: requestId,
    scope: "car",
  });
  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: "ledger error" }, { status: 500 });
  }

  if (event.type === "checkout.session.completed" && paymentType === "car_booking") {
    const obj = event.data.object as { payment_intent?: string };
    // On relit la date de debut pour poser l'echeance de versement : elle doit
    // etre calculee par booking-policy, jamais recopiee depuis le client.
    const { data: row } = await supabaseAdmin
      .from("car_requests")
      .select("id, date_from")
      .eq("id", requestId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("car_requests")
      .update({
        booking_status: "paid",
        booking_paid_at: new Date().toISOString(),
        booking_payment_intent_id: obj.payment_intent ?? null,
        transfer_due_at: row?.date_from ? transferDueAt(row.date_from) : null,
      })
      .eq("id", requestId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ received: true, booking: true });
  }

  if (event.type === "checkout.session.completed") {
    const obj = event.data.object as { payment_intent?: string };
    const { error } = await supabaseAdmin
      .from("car_requests")
      .update({
        commission_paid_at: new Date().toISOString(),
        commission_payment_intent_id: obj.payment_intent ?? null,
      })
      .eq("id", requestId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
