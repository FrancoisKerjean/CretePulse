import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stays/stripe-helpers";
import { sendGuestConfirmed, sendGuestConflict } from "@/lib/stays/emails";
import { notifyTelegram } from "@/lib/stays/telegram";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sig = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET_STAYS as string);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const meta =
    (event.data.object as { metadata?: Record<string, string> })?.metadata ?? {};
  const requestId = Number(meta.request_id);

  // Le compte Stripe est partage (NovAI acct_1TDPicEQ3UQbwGzY) : IEUF, Eleni et le
  // moteur de reservation Kairos ont leurs propres endpoints, et chaque endpoint du
  // compte recoit les checkout.session.completed de TOUTES les marques. On ecarte ce
  // qui n'est pas Stays avant d'ecrire au registre, et on repond 200 : un 4xx ferait
  // retenter Stripe pendant 3 jours et degraderait la sante de l'endpoint.
  if (
    !Number.isInteger(requestId) ||
    requestId <= 0 ||
    (meta.brand && meta.brand !== "crete.direct")
  ) {
    return NextResponse.json({ received: true, ignored: true });
  }

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
        // Les dates ont ete prises entre l'acceptation et le paiement. L'acompte est
        // deja encaisse : on rembourse, on previent, on alerte. Un 200 muet laisserait
        // un voyageur debite sans reservation et sans personne au courant.
        const pi = obj.payment_intent;
        let refunded = false;
        if (pi) {
          try {
            await stripeClient().refunds.create({ payment_intent: pi });
            refunded = true;
          } catch (e) {
            console.error("[stays/webhook] refund failed:", e);
          }
        }

        const { data: req } = await supabaseAdmin
          .from("stay_requests")
          .select("guest_email, listing_id, deposit_amount")
          .eq("id", requestId)
          .maybeSingle();

        if (req?.guest_email) {
          const { data: l } = await supabaseAdmin
            .from("stay_listings")
            .select("title")
            .eq("id", req.listing_id)
            .maybeSingle();
          await sendGuestConflict(req.guest_email, {
            listingTitle: l?.title ?? "votre séjour",
            amountEur: Number(req.deposit_amount) || 0,
          });
        }

        await notifyTelegram(
          `Collision Stays sur la demande ${requestId} : dates prises entre temps, remboursement ${
            refunded ? "OK" : "ECHOUE, a traiter a la main"
          }`,
        );

        return NextResponse.json({ received: true, conflict: true, refunded });
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
