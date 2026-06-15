// src/app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseSubscription, normaliseTopics, normaliseLocale } from "@/lib/push-subscription";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const o = body as Record<string, unknown>;
  const sub = parseSubscription(o?.subscription);
  if (!sub) return NextResponse.json({ error: "invalid subscription" }, { status: 400 });

  const row = {
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    locale: normaliseLocale(o?.locale),
    topics: normaliseTopics(o?.topics),
  };

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" });
  if (error) {
    console.error("[push/subscribe]", error.message);
    return NextResponse.json({ error: "store failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
