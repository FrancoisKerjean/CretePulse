// src/app/api/cron/reviews-cleanup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const now = Date.now();
  const d7  = new Date(now - 7  * 86400_000).toISOString();
  const d30 = new Date(now - 30 * 86400_000).toISOString();
  const d90 = new Date(now - 90 * 86400_000).toISOString();
  const a = await supabase.from("cb_reviews").delete().eq("status", "pending").lt("created_at", d7);
  const b = await supabase.from("cb_reviews").delete().eq("status", "expired").lt("created_at", d30);
  const c = await supabase.from("cb_review_votes").delete().lt("created_at", d90);
  const d = await supabase.from("cb_review_reports").delete().lt("created_at", d90);
  return NextResponse.json({ a: a.error?.message ?? "ok", b: b.error?.message ?? "ok", c: c.error?.message ?? "ok", d: d.error?.message ?? "ok" });
}
