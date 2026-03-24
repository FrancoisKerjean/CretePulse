import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Token is base64-encoded email
  let email: string;
  try {
    email = Buffer.from(token, "base64").toString("utf-8").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
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
