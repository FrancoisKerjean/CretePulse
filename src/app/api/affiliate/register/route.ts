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
import { activityPartnerEmailExists, insertActivityPartner, sendActivitiesDirectWelcome } from "@/lib/activity-signup";
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

  // Activities Direct : les catégories affiliate 'activity' et 'tour' basculent
  // dans le circuit devis (pattern car_rental). 'other'/absent => circuit /go/ classique.
  if ((v.data.category === "activity" || v.data.category === "tour")
      && v.data.sub_category && v.data.sub_category !== "other") {
    const slug = ({ food_tours: "food-tours", boat_trips: "boat-trips", hiking: "hiking" } as Record<string, string>)[v.data.sub_category];
    if (slug) {
      if (await activityPartnerEmailExists(v.data.email)) {
        return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
      }
      const partner = await insertActivityPartner(v.data, slug);
      if (!partner) return NextResponse.json({ error: "Could not register" }, { status: 500 });
      await notifyNewAffiliate({
        name: v.data.name, category: v.data.category, area: v.data.area,
        email: v.data.email, link: `${SITE_URL}/activities`,
      });
      try {
        await sendActivitiesDirectWelcome(v.data.name, v.data.email);
      } catch (e) {
        console.error("[affiliate-register] activities welcome failed:", e);
      }
      return NextResponse.json({ ok: true, activitiesDirect: true });
    }
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

  // Auto-enrich: fetch photo_url after the response is sent.
  // Description is intentionally left NULL — the VPS Haiku worker fills it
  // by selecting rows where description IS NULL (backfill-affiliate-content.mjs).
  // Runs via next/server `after()` so the HTTP response is NOT delayed.
  // Best-effort: any error is swallowed — signup must always succeed.
  after(async () => {
    try {
      const { photo_url } = await enrichAffiliate({
        redirectUrl: v.data.redirect_url,
        name: v.data.name,
        category: v.data.category,
      });
      const { error: enrichErr } = await supabaseAdmin
        .from("affiliates")
        .update({ photo_url })
        .eq("slug", slug);
      if (enrichErr) {
        console.error("[affiliate-register] enrich update failed:", enrichErr.message);
      } else {
        console.log(
          `[affiliate-register] enriched ${slug}: photo=${photo_url ?? "null"} (desc=null, pending VPS worker)`,
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
