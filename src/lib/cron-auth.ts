// src/lib/cron-auth.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * Fail-closed cron authentication.
 *
 * Returns a NextResponse (503 or 403) to return immediately when the request is
 * NOT authorised, or `null` when it is authorised.
 *
 * Why this exists: the previous inline check compared the incoming header to the
 * template literal `Bearer ${process.env.CRON_SECRET}`. If CRON_SECRET is absent
 * from the environment, that literal becomes `"Bearer undefined"` and any caller
 * sending `Authorization: Bearer undefined` passes — a fail-OPEN bypass on routes
 * that delete rows and send bulk email. This helper fails CLOSED when the secret
 * is missing and compares in constant time.
 *
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the env var is set,
 * so authorised cron invocations keep working unchanged.
 */
export function assertCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
