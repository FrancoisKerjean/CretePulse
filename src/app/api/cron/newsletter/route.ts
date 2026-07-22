// src/app/api/cron/newsletter/route.ts
// Weekly "Crete briefing" — Monday morning digest to confirmed subscribers.
// Builds the live swim/weather + events data once, renders the digest per
// language, and sends to each recipient. Idempotent: a subscriber sent within
// the last 3 days is skipped (guards against at-least-once cron retries).
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { buildSwimToday } from "@/lib/swim-today";
import { getUpcomingEvents } from "@/lib/events";
import {
  buildNewsletterDigest,
  digestHasContent,
  normalizeLang,
  NEWSLETTER_LANGS,
  type NewsletterDigest,
  type NewsletterLang,
} from "@/lib/newsletter";
import { sendNewsletterDigest } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const RESEND_DAYS = 3;

interface SubscriberRow {
  id: number;
  email: string;
  locale: string | null;
  last_digest_sent_at: string | null;
}

export async function GET(req: NextRequest) {
  // Fail-closed: reject when the secret is unset or the header does not match.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Athens calendar day drives the 7-day event window.
  const athensToday = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Athens" }),
  )
    .toISOString()
    .split("T")[0];

  // Test hook: `?to=addr[&lang=fr]` sends one live digest to a single address
  // without touching real subscribers or the idempotency stamp. For pre-send
  // verification. Still gated by the cron secret above.
  const testTo = req.nextUrl.searchParams.get("to");
  if (testTo) {
    const lang = normalizeLang(req.nextUrl.searchParams.get("lang"));
    const [swim, events] = await Promise.all([buildSwimToday(), getUpcomingEvents(50)]);
    const digest = buildNewsletterDigest(swim, events, lang, athensToday);
    await sendNewsletterDigest(testTo, digest, lang);
    return NextResponse.json({ ok: true, test: true, to: testTo, lang, hasContent: digestHasContent(digest) });
  }

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, locale, last_digest_sent_at")
    .eq("confirmed", true)
    .is("unsubscribed_at", null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cutoff = Date.now() - RESEND_DAYS * 86_400_000;
  const recipients = ((data as SubscriberRow[]) ?? []).filter(
    (s) => !s.last_digest_sent_at || new Date(s.last_digest_sent_at).getTime() < cutoff,
  );
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "no recipients due" });
  }

  // One live fetch, then one digest per language (recipients share the data).
  const [swim, events] = await Promise.all([buildSwimToday(), getUpcomingEvents(50)]);
  const digestByLang = Object.fromEntries(
    NEWSLETTER_LANGS.map((l) => [l, buildNewsletterDigest(swim, events, l, athensToday)]),
  ) as Record<NewsletterLang, NewsletterDigest>;

  // Don't send an empty briefing (e.g. weather engine down and no events).
  if (!digestHasContent(digestByLang.en)) {
    return NextResponse.json({ ok: true, sent: 0, note: "no content this week" });
  }

  let sent = 0;
  let failed = 0;
  for (const s of recipients) {
    const lang = normalizeLang(s.locale);
    try {
      await sendNewsletterDigest(s.email, digestByLang[lang], lang);
      await supabase
        .from("newsletter_subscribers")
        .update({ last_digest_sent_at: new Date().toISOString() })
        .eq("id", s.id);
      sent += 1;
    } catch (e) {
      failed += 1;
      console.error(`[newsletter] send failed for subscriber ${s.id}:`, (e as Error).message);
    }
  }

  return NextResponse.json({ ok: true, recipients: recipients.length, sent, failed });
}
