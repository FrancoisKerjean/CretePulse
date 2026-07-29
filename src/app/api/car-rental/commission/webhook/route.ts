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

  if (
    meta.payment_type !== "car_commission" ||
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
