import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { emailFromUnsubscribeToken } from "@/lib/newsletter-token";

/** Résilie l'adresse portée par le jeton signé. Rend une réponse d'erreur, ou null. */
async function unsubscribe(request: NextRequest): Promise<NextResponse | null> {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  // Jeton signé depuis le 01/10/2026 : avant, c'était l'email en base64, que n'importe
  // qui pouvait fabriquer pour désinscrire une adresse qui n'était pas la sienne.
  const email = emailFromUnsubscribeToken(token);
  if (!email) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email)
    .is("unsubscribed_at", null);

  if (error) {
    console.error("[newsletter/unsubscribe] Supabase error:", error.message);
    return NextResponse.json({ error: "Unsubscribe failed" }, { status: 500 });
  }
  return null;
}

// Désinscription en un clic (RFC 8058) : l'en-tête List-Unsubscribe-Post est annoncé par
// chaque lettre, et Gmail comme Apple Mail envoient alors un POST sur la même URL.
// Sans ce gestionnaire, le bouton « Se désabonner » de la messagerie tombait sur un 405.
export async function POST(request: NextRequest) {
  return (await unsubscribe(request)) ?? NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const failed = await unsubscribe(request);
  if (failed) return failed;

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unsubscribed – Crete Direct</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #FAFAF8; color: #1A1A2E; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border: 1px solid #E8E4DD; border-radius: 12px; padding: 2.5rem; max-width: 400px; text-align: center; }
    h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
    p { color: #6B7280; margin: 0 0 1.5rem; line-height: 1.6; }
    a { color: #1B4965; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>You've been unsubscribed</h1>
    <p>You will no longer receive newsletters from Crete Direct. We're sorry to see you go.</p>
    <a href="https://crete.direct">Return to Crete Direct</a>
  </div>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
