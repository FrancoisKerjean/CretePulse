import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, locale, confirmed")
    .eq("confirm_token", token)
    .limit(1);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  const subscriber = data[0];

  const { error: updateError } = await supabase
    .from("newsletter_subscribers")
    .update({
      confirmed: true,
      confirm_token: null,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", subscriber.id);

  if (updateError) {
    console.error("[newsletter/confirm] Supabase error:", updateError.message);
    return NextResponse.json({ error: "Confirmation failed" }, { status: 500 });
  }

  // Send welcome email (non-blocking)
  try {
    const { sendWelcomeEmail } = await import("@/lib/email");
    await sendWelcomeEmail(subscriber.email, subscriber.locale ?? "en");
  } catch (emailError) {
    console.error("[newsletter/confirm] Welcome email error:", emailError);
  }

  const locale = subscriber.locale ?? "en";
  return NextResponse.redirect(new URL(`/${locale}/newsletter/confirmed`, request.url));
}
