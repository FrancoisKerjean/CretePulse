import { NextRequest, NextResponse } from "next/server";

// Verify cron secret to prevent unauthorized access
function verifyCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow if no secret configured
  return authHeader === `Bearer ${cronSecret}`;
}

// DISABLED 2026-06-08 · this route previously used an LLM (Claude Haiku) to *fabricate*
// upcoming events ("Generate 10 upcoming events in Crete with accurate coordinates") and
// inserted them with verified=true / source_url=null. That put invented festivals with
// invented dates live on /events. 24 fabricated rows were purged.
//
// Real events are now sourced by the VPS scraper (crete-content-bot/scraper, anatolh.com),
// which publishes verified=false for human review. This endpoint is kept as a no-op so the
// existing Vercel cron slot stays wired; it will be repointed to trigger the real scraper.
// DO NOT re-enable LLM event generation here.
export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    disabled: true,
    reason: "LLM event fabrication retired 2026-06-08; real events come from the VPS scraper",
    inserted: 0,
  });
}
