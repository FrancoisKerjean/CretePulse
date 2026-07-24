import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stays/stripe-helpers";
import { sendGuestConfirmed } from "@/lib/stays/emails";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sig = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET_STAYS as string);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const requestId = Number(
    (event.data.object as { metadata?: Record<string, string> })?.metadata?.request_id,
  );

  const { error: insErr } = await supabaseAdmin.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    type: event.type,
    request_id: Number.isFinite(requestId) ? requestId : null,
  });
  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: "ledger error" }, { status: 500 });
  }

  if (event.type === "checkout.session.completed") {
    const obj = event.data.object as { id: string; payment_intent?: string };
    const { data, error } = await supabaseAdmin.rpc("mark_stay_deposit_paid", {
      p_request_id: requestId,
      p_session_id: obj.id,
      p_payment_intent_id: obj.payment_intent ?? null,
    });
    if (error) {
      if ((error as { code?: string }).code === "23P01") {
        return NextResponse.json({ received: true, conflict: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (row) {
      const { data: listing } = await supabaseAdmin
        .from("stay_listings").select("title").eq("id", row.listing_id).maybeSingle();
      await sendGuestConfirmed(row.guest_email, listing?.title ?? "votre séjour");
    }
  }

  return NextResponse.json({ received: true });
}
