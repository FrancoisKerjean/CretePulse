// src/app/api/reviews/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/reviews/sec";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crete.direct";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.redirect(`${base}/`, 303);
  const token_hash = hashToken(token);

  const { data: row } = await supabase
    .from("cb_reviews")
    .select("id, place_slug, locale")
    .eq("delete_token_hash", token_hash)
    .maybeSingle();
  if (!row) return NextResponse.redirect(`${base}/`, 303);

  await supabase.from("cb_reviews").update({
    status: "removed",
    removed_at: new Date().toISOString(),
    removed_reason: "user_request",
    email: "",
    delete_token_hash: null,
  }).eq("id", row.id);

  revalidateTag(`place-${row.place_slug}`, "max");
  return NextResponse.redirect(`${base}/${row.locale ?? "en"}/explore/${row.place_slug}?deleted=1`, 303);
}
