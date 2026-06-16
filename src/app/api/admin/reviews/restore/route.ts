// src/app/api/admin/reviews/restore/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { getClientIp } from "@/lib/reviews/sec";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  if (secret !== process.env.REVIEWS_ADMIN_SECRET) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 422 });

  const { data: row } = await supabase.from("cb_reviews").select("id, place_slug").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await supabase.from("cb_reviews").update({ status: "published", removed_at: null, removed_reason: null }).eq("id", id);
  await supabase.from("cb_review_admin_log").insert({ review_id: id, action: "restore", admin_ip: getClientIp(req) });
  revalidateTag(`place-${row.place_slug}`, "max");
  return NextResponse.json({ ok: true });
}
