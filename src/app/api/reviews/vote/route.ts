// src/app/api/reviews/vote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashIp, getClientIp, rateLimit, SALT_VERSION } from "@/lib/reviews/sec";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const review_id = Number(body.review_id);
  const value = Number(body.value);
  if (!Number.isInteger(review_id) || ![-1,0,1].includes(value)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  const ip_hash = hashIp(getClientIp(req));
  const burst = await rateLimit({ table: "cb_review_votes", filter: { column: "ip_hash", value: ip_hash }, limit: 60, windowSec: 3600 });
  if (burst) return NextResponse.json({ ok: true });
  if (value === 0) {
    await supabase.from("cb_review_votes").delete().eq("review_id", review_id).eq("ip_hash", ip_hash);
  } else {
    await supabase.from("cb_review_votes").upsert({ review_id, ip_hash, value, salt_version: SALT_VERSION });
  }
  return NextResponse.json({ ok: true });
}
