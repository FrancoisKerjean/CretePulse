import { NextRequest, NextResponse } from "next/server";
import { getRequestByApproveHash, getListingById } from "@/lib/stays/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createConnectOnboardingLink } from "@/lib/stays/stripe-helpers";
import { classifyStripeFailure, stripeLogFields } from "@/lib/stays/stripe-errors";
import { sendGuestApproved } from "@/lib/stays/emails";
import { computeQuote } from "@/lib/stays/pricing";
import { newToken, hashToken } from "@/lib/stays/tokens";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const action = body.action === "decline" ? "decline" : "accept";

  const req = await getRequestByApproveHash(hashToken(token));
  if (!req) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (req.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Already handled" }, { status: 409 });
  }
  const listing = await getListingById(req.listing_id);
  if (!listing) return NextResponse.json({ ok: false, error: "Listing gone" }, { status: 404 });

  if (action === "decline") {
    await supabaseAdmin.from("stay_requests").update({ status: "declined", approve_token_hash: null }).eq("id", req.id);
    return NextResponse.json({ ok: true, declined: true });
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid price" }, { status: 422 });
  }

  const { data: owner } = await supabaseAdmin
    .from("stay_owners")
    .select("id, email, stripe_connect_account_id")
    .eq("id", listing.owner_id)
    .maybeSingle();

  if (!owner?.stripe_connect_account_id) {
    let link: { accountId: string; url: string };
    try {
      link = await createConnectOnboardingLink(owner?.email ?? "", listing.owner_id, {
        country: typeof body.country === "string" ? body.country : undefined,
        businessType: body.businessType === "company" ? "company" : "individual",
      });
    } catch (err) {
      // La demande reste `pending` : le proprietaire pourra rouvrir le meme lien
      // une fois la plateforme de versement ouverte.
      const failure = classifyStripeFailure(err);
      console.error("[stays/approve] creation du compte Connect refusee", {
        requestId: req.id,
        ownerId: listing.owner_id,
        failure: failure.code,
        ...stripeLogFields(err),
      });
      return NextResponse.json(
        { ok: false, code: failure.code, error: failure.message },
        { status: failure.status },
      );
    }
    await supabaseAdmin.from("stay_owners")
      .update({ stripe_connect_account_id: link.accountId, kyc_status: "pending" })
      .eq("id", listing.owner_id);
    return NextResponse.json({ ok: true, kycUrl: link.url, message: "Complete Stripe KYC then re-open this link." });
  }

  const quote = computeQuote({
    basePriceEur: price,
    cleaningFeeEur: Number(listing.cleaning_fee_eur) || 0,
    commissionRate: Number(listing.commission_rate) || 5,
    dateFrom: req.date_from,
    dateTo: req.date_to,
  });

  const payToken = newToken();
  await supabaseAdmin.from("stay_requests").update({
    status: "approved",
    quoted_price_eur: price,
    quoted_at: new Date().toISOString(),
    approve_token_hash: null,
    pay_token_hash: hashToken(payToken),
    deposit_amount: quote.depositEur,
    balance_amount: quote.balanceEur,
    commission_eur: quote.commissionEur,
  }).eq("id", req.id);

  const payUrl = `https://crete.direct/fr/stays/pay/${payToken}`;
  await sendGuestApproved(req.guest_email, {
    listingTitle: listing.title ?? "votre séjour",
    guestTotalEur: quote.guestTotalEur,
    depositEur: quote.depositEur,
    payUrl,
  });

  return NextResponse.json({ ok: true, approved: true });
}
