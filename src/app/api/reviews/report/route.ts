// src/app/api/reviews/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashIp, getClientIp, rateLimit, SALT_VERSION } from "@/lib/reviews/sec";

const REASONS = new Set(["spam","abuse","offtopic"]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }
  const review_id = Number(body.review_id);
  const reason = typeof body.reason === "string" && REASONS.has(body.reason) ? body.reason : "spam";
  if (!Number.isInteger(review_id)) return NextResponse.json({ ok: true });
  const ip_hash = hashIp(getClientIp(req));
  const burst = await rateLimit({ table: "cb_review_reports", filter: { column: "ip_hash", value: ip_hash }, limit: 10, windowSec: 3600 });
  if (burst) return NextResponse.json({ ok: true });
  await supabase.from("cb_review_reports").upsert({ review_id, ip_hash, reason, salt_version: SALT_VERSION });

  // Auto-flag at 5 distinct ip_hash
  const { count } = await supabase.from("cb_review_reports").select("ip_hash", { count: "exact", head: true }).eq("review_id", review_id);
  if ((count ?? 0) >= 5) {
    await supabase.from("cb_reviews").update({ status: "pending_review" }).eq("id", review_id);
    await supabase.from("cb_review_admin_log").insert({ review_id, action: "review_pending", reason: "auto: 5+ reports" });
  }
  return NextResponse.json({ ok: true });
}
