import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel, carTypeLabelWithExamples } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";
import { partnerById } from "@/lib/car-partners-db";
import { isInclusionKey } from "@/lib/car-inclusions";

// Un loueur soumet son prix (page /car-quote/{token}). Appel d'offres first-come :
// le PREMIER à soumettre gagne (verrou conditionnel status='sent'→'quoted'), son
// prix part automatiquement au client. Les autres liens deviennent inactifs.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const token = typeof body.token === "string" ? body.token : "";
  const price = typeof body.price === "number" ? body.price : Number(body.price);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0 || price > 100000) {
    return NextResponse.json({ error: "Invalid price" }, { status: 422 });
  }
  const carModel = typeof body.carModel === "string" && body.carModel.trim() ? body.carModel.trim().slice(0, 120) : null;
  const inclusions = Array.isArray(body.inclusions) ? body.inclusions.filter(isInclusionKey) : [];

  // Résout l'invitation (un jeton par loueur invité) → demande + loueur.
  const { data: invite } = await supabase.from("car_quote_invites")
    .select("request_id, partner_id")
    .eq("quote_token_hash", hashToken(token))
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: req } = await supabase.from("car_requests")
    .select("id, status, locale, pickup_slug, date_from, date_to, car_type, customer_name, customer_email")
    .eq("id", invite.request_id).maybeSingle();
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (req.status !== "sent") return NextResponse.json({ ok: true, already: true });

  const partner = await partnerById(invite.partner_id);
  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

  // Verrou first-come : ne gagne que si la demande est encore 'sent' (atomique).
  const acceptToken = newToken();
  const { data: locked } = await supabase.from("car_requests").update({
    quoted_price: price, quoted_currency: "EUR", quoted_at: new Date().toISOString(),
    status: "quoted", accept_token_hash: hashToken(acceptToken),
    partner_name: partner.name, partner_email: partner.email, quoted_by_partner_id: partner.id,
    quoted_car_model: carModel, quoted_inclusions: inclusions,
  }).eq("id", req.id).eq("status", "sent").select("id");
  if (!locked || locked.length === 0) {
    // Un autre loueur a gagné entre-temps.
    return NextResponse.json({ ok: true, already: true });
  }

  const locale = req.locale || "en";
  const ct = CAR_TYPES_DATA.find((c) => c.id === req.car_type);
  const carTypeLabel = carTypeLabelWithExamples(ct, locale, req.car_type);

  try {
    const { sendCustomerQuoteEmail } = await import("@/lib/email");
    await sendCustomerQuoteEmail({
      email: req.customer_email,
      locale,
      customerName: req.customer_name,
      acceptUrl: `${siteBase()}/${locale}/car-offer/${acceptToken}`,
      quote: {
        pickupLabel: carPickupLabel(req.pickup_slug), dateFrom: req.date_from, dateTo: req.date_to,
        carTypeLabel, price, currency: "EUR",
      },
    });
  } catch (e) {
    console.error("[car-rental/quote] customer email error:", e);
    return NextResponse.json({ ok: true, emailFailed: true });
  }

  return NextResponse.json({ ok: true });
}
