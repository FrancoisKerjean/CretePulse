// src/app/api/reviews/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/reviews/sec";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crete.direct";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.redirect(`${base}/`, 303);
  const token_hash = hashToken(token);

  const { data: row, error } = await supabase
    .from("cb_reviews")
    .select("id, place_slug, status, locale")
    .eq("confirm_token_hash", token_hash)
    .maybeSingle();

  if (error || !row) return NextResponse.redirect(`${base}/`, 303);
  const locale = row.locale ?? "en";

  if (row.status === "pending") {
    await supabase.from("cb_reviews").update({
      status: "published",
      published_at: new Date().toISOString(),
      confirm_token_hash: null,
    }).eq("id", row.id);
    revalidateTag(`place-${row.place_slug}`, "max");
    return NextResponse.redirect(`${base}/${locale}/explore/${row.place_slug}/avis?confirmed=1`, 303);
  }

  if (row.status === "expired") {
    return NextResponse.redirect(`${base}/${locale}/explore/${row.place_slug}/avis?expired=1`, 303);
  }

  // already published / removed / pending_review → benign redirect
  return NextResponse.redirect(`${base}/${locale}/explore/${row.place_slug}/avis`, 303);
}
