// src/app/api/admin/reviews/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { isAdminSecret } from "@/lib/admin-secret";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  if (!isAdminSecret(secret, process.env.REVIEWS_ADMIN_SECRET)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Quarantined first, then heavily-reported published.
  const { data: pending } = await supabase
    .from("cb_reviews")
    .select("id, place_slug, rating, comment, author_name, status, created_at")
    .in("status", ["pending_review"])
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: reported } = await supabase
    .from("cb_review_reports")
    .select("review_id, ip_hash")
    .limit(2000);
  const counts: Record<string, number> = {};
  for (const r of reported ?? []) counts[r.review_id] = (counts[r.review_id] ?? 0) + 1;
  return NextResponse.json({ pending: pending ?? [], report_counts: counts });
}
