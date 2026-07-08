import { NextRequest, NextResponse, after } from "next/server";
import {
  validateRegisterPayload,
  buildUniqueSlug,
  genCodePromo,
  randomSuffix,
  AFFILIATE_DEFAULT_COMMISSION_PCT,
} from "@/lib/affiliate";
import { slugExists, codeExists, emailExists, insertAffiliate } from "@/lib/affiliate-store";
import { notifyNewAffiliate } from "@/lib/affiliate-notify";
import { sendAffiliateWelcome } from "@/lib/email";
import { carPartnerEmailExists, insertCarRentalPartner, sendCarRentalDirectWelcome } from "@/lib/car-rental-signup";
import { enrichAffiliate } from "@/lib/affiliate-enrich";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: bots fill hidden "website" field.
  if (body.website && String(body.website).trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const v = validateRegisterPayload(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });

  // Les loueurs de voiture ne passent pas par l'affiliation /go/ : ils rejoignent
  // Car Rental Direct (leads + devis first-come). L'inscription vaut accord (inbound).
  if (v.data.category === "car_rental") {
    if (await carPartnerEmailExists(v.data.email)) {
      return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
    }
    const partner = await insertCarRentalPartner(v.data);
    if (!partner) return NextResponse.json({ error: "Could not register, try again" }, { status: 500 });
    await notifyNewAffiliate({
      name: v.data.name, category: v.data.category, area: v.data.area,
      email: v.data.email, link: `${SITE_URL}/car-rental`,
    });
    try {
      await sendCarRentalDirectWelcome(v.data.name, v.data.email);
    } catch (e) {
      console.error("[affiliate-register] car-rental welcome failed:", e);
    }
    return NextResponse.json({ ok: true, carRentalDirect: true });
  }

  if (await emailExists(v.data.email)) {
    return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
  }

  const slug = await buildUniqueSlug(v.data.name, slugExists);

  let code = genCodePromo(slug, randomSuffix(4));
  for (let i = 0; i < 5 && (await codeExists(code)); i++) code = genCodePromo(slug, randomSuffix(4));

  const inserted = await insertAffiliate({
    ...v.data,
    slug,
    code_promo: code,
    commission_pct: AFFILIATE_DEFAULT_COMMISSION_PCT,
  });
  if (!inserted) return NextResponse.json({ error: "Could not register, try again" }, { status: 500 });

  const link = `${SITE_URL}/go/${slug}`;
  await notifyNewAffiliate({
    name: v.data.name,
    category: v.data.category,
    area: v.data.area,
    email: v.data.email,
    link,
  });

  // Self-serve close: the affiliate gets their link + terms by email immediately,
  // so no human reply is needed. Best-effort: never fail the signup on a mail error.
  try {
    await sendAffiliateWelcome({
      email: v.data.email,
      name: v.data.name,
      category: v.data.category,
      link,
      code,
      commissionPct: AFFILIATE_DEFAULT_COMMISSION_PCT,
    });
  } catch (e) {
    console.error("[affiliate-register] welcome email failed:", e);
  }

  // Auto-enrich: fetch photo + generate description after the response is sent.
  // Runs via next/server `after()` so the HTTP response is NOT delayed.
  // Best-effort: any error is swallowed — signup must always succeed.
  // NOTE: description uses Anthropic HTTP API if ANTHROPIC_API_KEY is set in
  // Vercel env vars, otherwise falls back to per-category template (4 languages).
  // TODO [owner: Kami, butoir: 2026-07-31] — add ANTHROPIC_API_KEY to Vercel:
  //   https://vercel.com/kerjeanfrancois29/crete-direct/settings/environment-variables
  after(async () => {
    try {
      const { photo_url, description } = await enrichAffiliate({
        redirectUrl: v.data.redirect_url,
        name: v.data.name,
        category: v.data.category,
      });
      const { error: enrichErr } = await supabaseAdmin
        .from("affiliates")
        .update({ photo_url, description })
        .eq("slug", slug);
      if (enrichErr) {
        console.error("[affiliate-register] enrich update failed:", enrichErr.message);
      } else {
        console.log(
          `[affiliate-register] enriched ${slug}: photo=${photo_url ?? "null"} desc_en="${description.en.slice(0, 60)}…"`,
        );
      }
    } catch (e) {
      console.error("[affiliate-register] enrich after() failed:", e);
    }
  });

  return NextResponse.json({
    ok: true,
    slug,
    link,
    code,
    commission_pct: AFFILIATE_DEFAULT_COMMISSION_PCT,
  });
}
