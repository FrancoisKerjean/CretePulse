// src/app/api/reviews/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!slug) return NextResponse.json({ reviews: [] });
  const { data, error } = await supabase
    .from("cb_reviews_with_counts")
    .select("id, rating, comment, author_name, locale, created_at, upvotes, downvotes")
    .eq("place_slug", slug)
    .eq("status", "published")
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[reviews/list]", error.message);
    return NextResponse.json({ reviews: [] });
  }
  return NextResponse.json({ reviews: data ?? [] });
}
