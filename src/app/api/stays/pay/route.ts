import { NextRequest, NextResponse } from "next/server";
import { getRequestByPayHash, getListingById } from "@/lib/stays/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildCheckoutParams, stripeClient } from "@/lib/stays/stripe-helpers";
import { computeQuote } from "@/lib/stays/pricing";
import { hashToken } from "@/lib/stays/tokens";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const locale = typeof body.locale === "string" ? body.locale : "fr";

  const req = await getRequestByPayHash(hashToken(token));
  if (!req) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (req.status !== "approved") {
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

  const params = buildCheckoutParams({
    listingTitle: listing.title ?? "Séjour",
    dateFrom: req.date_from,
    dateTo: req.date_to,
    depositEur: quote.depositEur,
    applicationFeeCents: quote.applicationFeeCents,
    connectAccountId: owner.stripe_connect_account_id,
    guestEmail: req.guest_email,
    requestId: req.id,
    payToken: token,
    locale,
  });

  const session = await stripeClient().checkout.sessions.create(params);
  await supabaseAdmin.from("stay_requests").update({ stripe_session_id: session.id }).eq("id", req.id);

  return NextResponse.json({ ok: true, url: session.url });
}
