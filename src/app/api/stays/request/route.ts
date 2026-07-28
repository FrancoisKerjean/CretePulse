import { NextRequest, NextResponse } from "next/server";
import { validateStayRequest, ipHash } from "@/lib/stays/validation";
import {
  getListingBySlug,
  recentDuplicateExists,
  ipRateLimited,
  createStayRequest,
  bookedRangesForListing,
} from "@/lib/stays/db";
import { isRangeFree } from "@/lib/stays/availability";
import { nightsBetween } from "@/lib/stays/pricing";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendOwnerRequest } from "@/lib/stays/emails";
import { notifyTelegram } from "@/lib/stays/telegram";
import { newToken, hashToken, siteBase } from "@/lib/stays/tokens";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const v = validateStayRequest(body);
  if (v.kind === "honeypot") return NextResponse.json({ ok: true });
  if (v.kind === "error") return NextResponse.json({ ok: false, error: v.error }, { status: v.status });

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "published") {
    return NextResponse.json({ ok: false, error: "Not bookable" }, { status: 404 });
  }

  // Ces deux refus sont des erreurs honnetes rendues au voyageur, donc places AVANT
  // le rate-limit et la dedup, qui eux renvoient volontairement un 200 silencieux
  // pour ne rien reveler a un robot.
  const minNights = Number(listing.min_nights) || 1;
  if (nightsBetween(v.row.dateFrom, v.row.dateTo) < minNights) {
    return NextResponse.json(
      { ok: false, error: "Minimum stay", minNights },
      { status: 422 },
    );
  }

  const booked = await bookedRangesForListing(listing.id);
  if (!isRangeFree(booked, v.row.dateFrom, v.row.dateTo)) {
    return NextResponse.json({ ok: false, error: "Dates unavailable" }, { status: 409 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ipHashVal = ipHash(ip);
  if (ipHashVal && (await ipRateLimited(ipHashVal))) {
    return NextResponse.json({ ok: true });
  }
  if (await recentDuplicateExists(v.row.guestEmail, listing.id, v.row.dateFrom)) {
    return NextResponse.json({ ok: true });
  }

  const approveToken = newToken();
  await createStayRequest({
    listing_id: listing.id,
    guest_name: v.row.guestName,
    guest_email: v.row.guestEmail,
    guest_phone: v.row.guestPhone,
    date_from: v.row.dateFrom,
    date_to: v.row.dateTo,
    pax: v.row.pax,
    message: v.row.message,
    status: "pending",
    approve_token_hash: hashToken(approveToken),
    ip_hash: ipHashVal,
  });

  const { data: owner } = await supabaseAdmin
    .from("stay_owners")
    .select("email")
    .eq("id", listing.owner_id)
    .maybeSingle();

  const approveUrl = `${siteBase()}/fr/stays/approve/${approveToken}`;
  if (owner?.email) {
    await sendOwnerRequest(owner.email, {
      guestName: v.row.guestName,
      dateFrom: v.row.dateFrom,
      dateTo: v.row.dateTo,
      pax: v.row.pax,
      approveUrl,
    });
  }
  await notifyTelegram(`🏠 Nouvelle demande Stays · ${listing.title ?? slug} · ${v.row.dateFrom}→${v.row.dateTo}`);

  return NextResponse.json({ ok: true });
}
