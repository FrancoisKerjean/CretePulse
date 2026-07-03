// src/app/api/reviews/aggregate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { computeAggregate } from "@/lib/reviews/aggregate";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!slug) return NextResponse.json({ avg: null, count: 0, distribution: { 1:0,2:0,3:0,4:0,5:0 } });
  const { data, error } = await supabase
    .from("cb_reviews")
    .select("rating")
    .eq("place_slug", slug)
    .eq("status", "published");
  if (error) return NextResponse.json({ avg: null, count: 0, distribution: { 1:0,2:0,3:0,4:0,5:0 } });
  const ratings = (data ?? []).map((r) => r.rating as number);
  // 03/07 optim couts Vercel : cache CDN 1h (avis changent lentement, revalidateTag
  // sur cb_reviews casse le cache au besoin). Evite un fetch Supabase par revalidation.
  return NextResponse.json(computeAggregate(ratings), {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
