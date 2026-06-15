// src/app/api/push/unsubscribe/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const endpoint = (body as Record<string, unknown>)?.endpoint;
  // Format attendu d'un endpoint push (https, borne) avant tout DELETE.
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 2048) {
    return NextResponse.json({ error: "no endpoint" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) {
    console.error("[push/unsubscribe]", error.message);
    return NextResponse.json({ error: "delete failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
