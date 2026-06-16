// src/app/api/reviews/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/reviews/sec";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const { data: row } = await supabase
    .from("cb_reviews")
    .select("id, place_slug, rating, comment, author_name, locale, created_at, published_at, consent_at")
    .eq("delete_token_hash", hashToken(token))
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ review: row });
}
