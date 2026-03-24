import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: bots fill this field, humans don't see it
  if (body.website && String(body.website).trim() !== "") {
    // Silent rejection — looks like success to the bot
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const locale = typeof body.locale === "string" ? body.locale : "en";

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 422 });
  }

  // Rate limit: same email cannot subscribe again within 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("newsletter_subscribers")
    .select("id, created_at")
    .eq("email", email)
    .gte("created_at", fiveMinutesAgo)
    .limit(1);

  if (recent && recent.length > 0) {
    // Silent success — don't reveal rate limiting to scrapers
    return NextResponse.json({ ok: true });
  }

  // Check if already confirmed subscriber
  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("id, confirmed, unsubscribed_at")
    .eq("email", email)
    .limit(1);

  if (existing && existing.length > 0) {
    const sub = existing[0];
    if (sub.confirmed && !sub.unsubscribed_at) {
      // Already subscribed — silent success
      return NextResponse.json({ ok: true });
    }
    // Resubscribe or re-confirm: delete old record and reinsert
    await supabase.from("newsletter_subscribers").delete().eq("email", email);
  }

  const confirm_token = crypto.randomUUID();

  const { error } = await supabase.from("newsletter_subscribers").insert({
    email,
    locale,
    confirmed: false,
    confirm_token,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[newsletter/subscribe] Supabase error:", error.message);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }

  // TODO: send confirmation email via Resend once configured
  // The confirm_token goes in: /api/newsletter/confirm?token=<confirm_token>

  return NextResponse.json({ ok: true });
}
