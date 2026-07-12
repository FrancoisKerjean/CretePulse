import { NextRequest, NextResponse } from "next/server";
import { assertCron } from "@/lib/cron-auth";

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
  const denied = assertCron(request);
  if (denied) return denied;
  return NextResponse.json({
    ok: true,
    disabled: true,
    reason: "LLM event fabrication retired 2026-06-08; real events come from the VPS scraper",
    inserted: 0,
  });
}
