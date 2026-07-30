// Paiement en ligne d'une location acceptee. Le client paie sur crete.direct,
// les fonds restent sur le compte plateforme jusqu'au versement au loueur.
//
// On encaisse MEME si le loueur n'a pas encore ouvert son compte Stripe : son
// argent l'attend, et c'est le levier qui le decide a s'inscrire (decision Kami
// 29/07/2026).
//
// Desarme par defaut : tant que CAR_BOOKING_ENABLED ne vaut pas exactement "on",
// la route se comporte comme si elle n'existait pas (404). Le code part en
// production bien avant que le premier euro reel ne doive transiter.
//
// Plan : docs/superpowers/plans/2026-07-29-car-rental-tunnel-voyageur.md
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stays/stripe-helpers";
import { hashToken } from "@/lib/car-quote";
import { bookingTotalEur, buildBookingCheckoutParams } from "@/lib/car-booking";
import { classifyStripeFailure, stripeLogFields } from "@/lib/stripe-errors";

const enabled = (): boolean => process.env.CAR_BOOKING_ENABLED === "on";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!enabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const hasOption = body.hasOption === true;
  const locale = typeof body.locale === "string" ? body.locale : "en";

  const { data: row } = await supabaseAdmin
    .from("car_requests")
    .select(
      "id, status, booking_status, booking_session_id, quoted_price, quoted_by_partner_id, quoted_car_model, customer_email, date_from, date_to",
    )
    .eq("booking_token_hash", hashToken(token))
    .maybeSingle();

  if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  // Seule une offre acceptee est payable : le prix vient du devis choisi.
  if (row.status !== "accepted") {
    return NextResponse.json({ ok: false, error: "Not payable" }, { status: 409 });
  }
  // Deja paye, deja verse ou annule : on ne represente pas de session.
  if (row.booking_status && row.booking_status !== "pending_payment") {
    return NextResponse.json({ ok: false, error: "Already settled" }, { status: 409 });
  }

  // Verrou optimiste AVANT l'appel Stripe. Deux clics sur « payer » ne creent pas
  // deux sessions, donc pas deux prelevements possibles sur la meme location.
  const { data: locked } = await supabaseAdmin
    .from("car_requests")
    .update({ booking_status: "pending_payment" })
    .eq("id", row.id)
    .is("booking_status", null)
    .select();
  if (!locked || locked.length === 0) {
    return NextResponse.json({ ok: false, error: "Payment already started" }, { status: 409 });
  }

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("id, name, commission, stripe_connect_account_id, kyc_status")
    .eq("id", row.quoted_by_partner_id)
    .maybeSingle();

  const releaseLock = async () => {
    await supabaseAdmin
      .from("car_requests")
      .update({ booking_status: null })
      .eq("id", row.id)
      .select();
  };

  // Charges separees : on encaisse MEME si le loueur n'a pas encore de compte de
  // versement. Son argent l'attendra, et c'est ce qui le decidera a s'inscrire.
  // Le cron garde les fonds et le signale tant qu'il n'est pas pret.
  if (!partner?.stripe_connect_account_id) {
    console.info("[car/booking] loueur pas encore onboarde, fonds conserves", {
      requestId: row.id,
      partnerId: row.quoted_by_partner_id,
    });
  }

  const quotedPriceEur = Number(row.quoted_price) || 0;
  let session: { id: string; url: string | null };
  try {
    session = await stripeClient().checkout.sessions.create(
      buildBookingCheckoutParams({
        requestId: row.id,
        customerEmail: row.customer_email,
        quotedPriceEur,
        hasOption,
        partnerName: partner?.name ?? "",
        carLabel: row.quoted_car_model ?? "Car rental",
        dateFrom: row.date_from,
        dateTo: row.date_to,
        bookingToken: token,
        locale,
        partnerRate: Number(partner?.commission) || 0.1,
      }),
    );
  } catch (err) {
    const failure = classifyStripeFailure(err);
    console.error("[car/booking] session de paiement refusee", {
      requestId: row.id,
      partnerId: row.quoted_by_partner_id,
      failure: failure.code,
      ...stripeLogFields(err),
    });
    // Le client doit pouvoir reessayer : sans cela sa location resterait
    // bloquee en pending_payment sans session.
    await releaseLock();
    return NextResponse.json(
      { ok: false, code: failure.code, error: failure.message },
      { status: failure.status },
    );
  }

  await supabaseAdmin
    .from("car_requests")
    .update({
      booking_session_id: session.id,
      booking_amount_eur: bookingTotalEur(quotedPriceEur, hasOption),
      cancellation_option: hasOption,
    })
    .eq("id", row.id)
    .select();

  return NextResponse.json({ ok: true, url: session.url });
}
