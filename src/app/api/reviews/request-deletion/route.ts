// src/app/api/reviews/request-deletion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { sendReviewConfirmationEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/reviews/sanitize";
import { hashToken, fakeAwaitEmail } from "@/lib/reviews/sec";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OK = NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const raw = typeof body.email === "string" ? body.email : "";
  if (!EMAIL_REGEX.test(raw)) { await fakeAwaitEmail(); return OK; }
  const email = normalizeEmail(raw);

  const { data: rows } = await supabase
    .from("cb_reviews")
    .select("id, place_slug, locale")
    .eq("email", email)
    .eq("status", "published");

  if (!rows || rows.length === 0) { await fakeAwaitEmail(); return OK; }

  for (const r of rows) {
    const newToken = randomUUID();
    await supabase.from("cb_reviews").update({ delete_token_hash: hashToken(newToken) }).eq("id", r.id);
    try {
      await sendReviewConfirmationEmail({
        email,
        confirmToken: "noop", // not used (we send only delete here)
        deleteToken: newToken,
        locale: r.locale ?? "en",
        placeName: r.place_slug,
      });
    } catch (e) {
      console.error("[request-deletion] mail failed", e);
    }
  }
  return OK;
}
