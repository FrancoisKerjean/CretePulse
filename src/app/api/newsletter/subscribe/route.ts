import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { signupDecision } from "@/lib/newsletter-signup";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Toute réponse hors erreur de saisie est ce même succès muet : un robot ne
// doit pas pouvoir distinguer « refusé », « déjà envoyé » et « envoyé ».
const silentOk = () => NextResponse.json({ ok: true });

export async function POST(request: NextRequest) {
  // 1re ligne contre le « subscription bombing » (17-24/11/2026). BotID exige
  // l'OIDC du projet Vercel : s'il manque, l'appel lève, on le dit dans les logs
  // et on retombe sur le plafond et le délai de signupDecision.
  try {
    const verdict = await checkBotId();
    if (verdict.isBot) {
      console.warn("[newsletter/subscribe] robot écarté par BotID");
      return silentOk();
    }
  } catch (e) {
    console.error("[newsletter/subscribe] BotID indisponible, repli sur le plafond :", e);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: bots fill this field, humans don't see it
  if (body.website && String(body.website).trim() !== "") return silentOk();

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const locale = typeof body.locale === "string" ? body.locale : "en";

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 422 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [existingRes, recentRes] = await Promise.all([
    supabase
      .from("newsletter_subscribers")
      .select("id, confirmed, unsubscribed_at, subscribed_at")
      .eq("email", email)
      .limit(1),
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .gte("subscribed_at", since),
  ]);
  if (existingRes.error || recentRes.error) {
    console.error("[newsletter/subscribe] Supabase error:", (existingRes.error ?? recentRes.error)?.message);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }

  const existing = existingRes.data?.[0] ?? null;
  const decision = signupDecision({ existing, sentLast24h: recentRes.count ?? 0 });
  if (decision !== "send") {
    if (decision === "daily_cap") console.warn("[newsletter/subscribe] plafond quotidien atteint, confirmation non envoyée");
    return silentOk();
  }

  // Resubscribe or stale pending: delete old record and reinsert
  if (existing) await supabase.from("newsletter_subscribers").delete().eq("email", email);

  const confirm_token = crypto.randomUUID();

  const { error } = await supabase.from("newsletter_subscribers").insert({
    email,
    locale,
    confirmed: false,
    confirm_token,
    subscribed_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[newsletter/subscribe] Supabase error:", error.message);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }

  // Send confirmation email (non-blocking - don't fail subscription if email fails)
  try {
    const { sendConfirmationEmail } = await import("@/lib/email");
    await sendConfirmationEmail(email, confirm_token, locale);
  } catch (emailError) {
    console.error("[newsletter/subscribe] Email send error:", emailError);
  }

  return silentOk();
}
