// src/app/api/reviews/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { promises as dns } from "node:dns";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { sendReviewConfirmationEmail } from "@/lib/email";
import { normalizeEmail, sanitizeText, sanitizeAuthorName } from "@/lib/reviews/sanitize";
import { containsBanned, looksLikeSpam } from "@/lib/reviews/banlist";
import { isDisposable } from "@/lib/reviews/disposable-domains";
import { hashIp, hashToken, getClientIp, rateLimit, fakeAwaitEmail, SALT_VERSION } from "@/lib/reviews/sec";
import { consentTextFor } from "@/lib/reviews/consent-text";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OK = NextResponse.json({ ok: true, requires_confirmation: true });
const OK_SILENT = NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: silent success + fake-await (anti latency enumeration)
  if (body.website && String(body.website).trim() !== "") {
    await fakeAwaitEmail();
    return OK_SILENT;
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const placeName = typeof body.place_name === "string" ? body.place_name.trim().slice(0, 120) : slug;
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.slice(0, 1000) : "";
  const authorRaw = typeof body.author_name === "string" ? body.author_name : "";
  const emailRaw = typeof body.email === "string" ? body.email : "";
  const locale = typeof body.locale === "string" ? body.locale : "en";

  if (!slug || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid rating or slug" }, { status: 422 });
  }
  if (!EMAIL_REGEX.test(emailRaw)) {
    return NextResponse.json({ error: "Invalid e-mail" }, { status: 422 });
  }

  const email = normalizeEmail(emailRaw);
  const [, domain] = email.split("@");
  if (!domain || isDisposable(domain)) {
    await fakeAwaitEmail();
    return OK_SILENT;
  }

  // MX lookup
  try {
    const mx = await dns.resolveMx(domain);
    if (!mx || mx.length === 0) { await fakeAwaitEmail(); return OK_SILENT; }
  } catch { await fakeAwaitEmail(); return OK_SILENT; }

  // Sanitize + content filter
  const safeComment = comment ? sanitizeText(comment) : "";
  const safeAuthor = sanitizeAuthorName(authorRaw);
  if (!safeAuthor) return NextResponse.json({ error: "Invalid name" }, { status: 422 });
  if (containsBanned(safeComment) || containsBanned(safeAuthor) || looksLikeSpam(safeComment)) {
    return NextResponse.json({ error: "Review rejected" }, { status: 422 });
  }

  const ip = getClientIp(req);
  const ip_hash = hashIp(ip);

  // Rate-limits
  const ipBurst = await rateLimit({ table: "cb_reviews", filter: { column: "ip_hash", value: ip_hash }, limit: 5, windowSec: 3600 });
  if (ipBurst) { await fakeAwaitEmail(); return OK_SILENT; }
  const emailDay = await rateLimit({ table: "cb_reviews", filter: { column: "email", value: email }, limit: 5, windowSec: 86400 });
  if (emailDay) { await fakeAwaitEmail(); return OK_SILENT; }
  // Domain rate-limit: count today's confirmed rows whose email ends with @domain
  const sinceDay = new Date(Date.now() - 86400 * 1000).toISOString();
  const { count: domainCount } = await supabase
    .from("cb_reviews")
    .select("id", { count: "exact", head: true })
    .like("email", `%@${domain}`)
    .gte("created_at", sinceDay);
  if ((domainCount ?? 0) >= 3) { await fakeAwaitEmail(); return OK_SILENT; }

  // Per-slug burst → pending_review auto
  const sinceHour = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count: slugBurst } = await supabase
    .from("cb_reviews")
    .select("id", { count: "exact", head: true })
    .eq("place_slug", slug)
    .gte("created_at", sinceHour);
  const initialStatus = (slugBurst ?? 0) >= 20 ? "pending_review" : "pending";

  // Banned per-slug?
  const email_hash = hashToken(email);
  const { data: bannedRow } = await supabase
    .from("cb_review_banned_emails")
    .select("email_hash")
    .eq("email_hash", email_hash)
    .eq("place_slug", slug)
    .maybeSingle();
  if (bannedRow) { await fakeAwaitEmail(); return OK_SILENT; }

  // Existing row?
  const { data: existing } = await supabase
    .from("cb_reviews")
    .select("id, status")
    .eq("place_slug", slug)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.status === "published" || existing.status === "removed") {
      await fakeAwaitEmail();
      return OK_SILENT;
    }
    if (existing.status === "pending" || existing.status === "expired") {
      // Mark old as expired (idempotent if already expired), then continue to insert a new pending.
      await supabase.from("cb_reviews").update({ status: "expired" }).eq("id", existing.id);
    }
    // pending_review existant: silent success, Kami devra trancher.
    if (existing.status === "pending_review") { await fakeAwaitEmail(); return OK_SILENT; }
  }

  const confirm_token = randomUUID();
  const delete_token = randomUUID();
  const { text: consent_text, hash: consent_text_hash } = consentTextFor(locale);

  const { error } = await supabase.from("cb_reviews").insert({
    place_slug: slug,
    rating,
    comment: safeComment || null,
    author_name: safeAuthor,
    email,
    status: initialStatus,
    confirm_token_hash: hashToken(confirm_token),
    delete_token_hash: hashToken(delete_token),
    consent_at: new Date().toISOString(),
    consent_text_hash,
    ip_hash,
    salt_version: SALT_VERSION,
    locale: ["en","fr","de","el","it","nl","pl","es","pt","ru","ja","ko","zh","tr","sv","da","no","fi","cs","hu","ro","ar"].includes(locale) ? locale : "en",
  });
  if (error) {
    // Unique violation = race with another submit → silent success
    if ((error as { code?: string }).code === "23505") { await fakeAwaitEmail(); return OK_SILENT; }
    console.error("[reviews/submit] insert failed:", error.message);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  try {
    await sendReviewConfirmationEmail({ email, confirmToken: confirm_token, deleteToken: delete_token, locale, placeName });
  } catch (e) {
    console.error("[reviews/submit] mail failed:", e);
    // Don't fail the submission — user can request resend later.
  }

  void consent_text; // tracked for audit, not returned
  return OK;
}
