import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { normalizeLang } from "@/lib/newsletter";

// Un GET n'écrit JAMAIS. Jusqu'au 24/11/2026 ce lien confirmait l'abonnement au
// premier chargement : les antivirus de messagerie des entreprises, qui ouvrent
// chaque lien reçu, ont « confirmé » en 3 à 30 s des adresses inscrites par des
// robots, qui recevaient ensuite la lettre hebdomadaire sans l'avoir demandée.
// Le GET (liens déjà envoyés) mène désormais à une page avec un bouton ; seul le
// POST de ce bouton confirme.

async function subscriberByToken(token: string) {
  const { data } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, locale, confirmed")
    .eq("confirm_token", token)
    .limit(1);
  return data?.[0] ?? null;
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const row = token ? await subscriberByToken(token) : null;
  const lang = normalizeLang(row?.locale);
  const url = new URL(`/${lang}/newsletter/confirm`, request.url);
  if (token) url.searchParams.set("token", token);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  let token = "";
  try {
    token = String((await request.formData()).get("token") ?? "");
  } catch {
    // corps illisible : traité comme jeton absent
  }
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const subscriber = await subscriberByToken(token);
  if (!subscriber) return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });

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

  const lang = normalizeLang(subscriber.locale);
  return NextResponse.redirect(new URL(`/${lang}/newsletter/confirmed`, request.url), 303);
}
