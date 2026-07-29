// Second charge : le solde 70 %, demande a J-14 par /api/cron/stays-balance.
// Meme forme que /api/stays/pay, avec un jeton distinct et un statut d'entree
// different (deposit_paid au lieu de approved).
import { NextRequest, NextResponse } from "next/server";
import { getRequestByBalanceHash, getListingById } from "@/lib/stays/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildBalanceCheckoutParams, stripeClient } from "@/lib/stays/stripe-helpers";
import { classifyStripeFailure, stripeLogFields } from "@/lib/stripe-errors";
import { computeQuote, balanceApplicationFeeCents } from "@/lib/stays/pricing";
import { hashToken } from "@/lib/stays/tokens";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const locale = typeof body.locale === "string" ? body.locale : "fr";

  const req = await getRequestByBalanceHash(hashToken(token));
  if (!req) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (req.status !== "deposit_paid") {
    return NextResponse.json({ ok: false, error: "Not payable" }, { status: 409 });
  }

  const listing = await getListingById(req.listing_id);
  if (!listing) return NextResponse.json({ ok: false, error: "Listing gone" }, { status: 404 });

  const { data: owner } = await supabaseAdmin
    .from("stay_owners")
    .select("stripe_connect_account_id, kyc_status")
    .eq("id", listing.owner_id)
    .maybeSingle();
  if (!owner?.stripe_connect_account_id || owner.kyc_status !== "complete") {
    return NextResponse.json({ ok: false, error: "Owner payout not ready" }, { status: 409 });
  }

  const quote = computeQuote({
    basePriceEur: Number(req.quoted_price_eur),
    cleaningFeeEur: Number(listing.cleaning_fee_eur) || 0,
    commissionRate: Number(listing.commission_rate) || 5,
    dateFrom: req.date_from,
    dateTo: req.date_to,
  });

  // La commission totale du sejour vaut commissionEur. L'acompte en a deja preleve
  // sa part (applicationFeeCents), le solde porte exactement le reste. La formule
  // vit dans pricing.ts, ou le gate CI check:stays la verifie.
  const balanceFeeCents = balanceApplicationFeeCents(quote);

  let session: { url: string | null };
  try {
    session = await stripeClient().checkout.sessions.create(
      buildBalanceCheckoutParams({
        listingTitle: listing.title ?? "Séjour",
        dateFrom: req.date_from,
        dateTo: req.date_to,
        balanceEur: quote.balanceEur,
        applicationFeeCents: balanceFeeCents,
        connectAccountId: owner.stripe_connect_account_id,
        guestEmail: req.guest_email,
        requestId: req.id,
        balanceToken: token,
        locale,
      }),
    );
  } catch (err) {
    // La demande reste `deposit_paid`, le jeton de solde reste valide : le
    // voyageur peut relancer le paiement sans repasser par le cron.
    const failure = classifyStripeFailure(err);
    console.error("[stays/pay-balance] session de solde refusee", {
      requestId: req.id,
      failure: failure.code,
      ...stripeLogFields(err),
    });
    return NextResponse.json(
      { ok: false, code: failure.code, error: failure.message },
      { status: failure.status },
    );
  }

  await supabaseAdmin
    .from("stay_requests")
    .update({ balance_amount: quote.balanceEur })
    .eq("id", req.id);

  return NextResponse.json({ ok: true, url: session.url });
}
