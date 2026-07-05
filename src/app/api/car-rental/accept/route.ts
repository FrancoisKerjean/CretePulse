import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { partnerById } from "@/lib/car-partners-db";
import { hashToken } from "@/lib/car-quote";
import { isOfferExpired } from "@/lib/car-offer-expiry";

// Le client accepte le devis (page /car-offer/{token}). On consomme le jeton
// d'acceptation et on met client et loueur en relation (coordonnées échangées).
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: row } = await supabase.from("car_requests")
    .select("id, status, locale, pickup_slug, date_from, date_to, car_type, quoted_price, quoted_currency, quoted_car_model, quoted_inclusions, quoted_at, partner_name, partner_email, quoted_by_partner_id, customer_name, customer_email, customer_phone")
    .eq("accept_token_hash", hashToken(token))
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status === "accepted") return NextResponse.json({ ok: true, already: true });
  if (row.quoted_price == null) return NextResponse.json({ error: "No quote yet" }, { status: 409 });

  if (isOfferExpired(row.quoted_at, row.date_from, Date.now())) {
    return NextResponse.json({ ok: false, expired: true }, { status: 410 });
  }

  const { error: upErr } = await supabase.from("car_requests").update({
    status: "accepted",
    accepted_at: new Date().toISOString(),
    accept_token_hash: null, // consommé
  }).eq("id", row.id);
  if (upErr) {
    console.error("[car-rental/accept] update error:", upErr.message);
    return NextResponse.json({ error: "Could not accept" }, { status: 500 });
  }

  const locale = row.locale || "en";
  const ct = CAR_TYPES_DATA.find((c) => c.id === row.car_type);
  const carTypeLabel = ct?.labels[locale] ?? ct?.labels.en ?? row.car_type;
  // Coordonnées du loueur gagnant depuis le registre (téléphone/WhatsApp non
  // stockés sur la demande).
  const partner = row.quoted_by_partner_id ? await partnerById(row.quoted_by_partner_id) : null;
  const partnerName: string = row.partner_name ?? partner?.name ?? "the agency";
  const days = Math.max(1, Math.round((new Date(row.date_to).getTime() - new Date(row.date_from).getTime()) / 86400000));

  try {
    const { sendConnectionEmails } = await import("@/lib/email");
    await sendConnectionEmails({
      partner: {
        name: partnerName,
        email: row.partner_email ?? partner?.email ?? "",
        phone: partner?.phone ?? "",
        whatsapp: partner?.whatsapp ?? undefined,
      },
      customer: {
        name: row.customer_name, email: row.customer_email,
        phone: row.customer_phone ?? undefined, locale,
      },
      quote: {
        pickupLabel: carPickupLabel(row.pickup_slug), dateFrom: row.date_from, dateTo: row.date_to,
        carTypeLabel, price: row.quoted_price, currency: row.quoted_currency || "EUR",
        partnerName, carModel: row.quoted_car_model ?? null,
        inclusions: Array.isArray(row.quoted_inclusions) ? row.quoted_inclusions : [],
        days,
      },
    });
  } catch (e) {
    console.error("[car-rental/accept] connection email error:", e);
    return NextResponse.json({ ok: true, emailFailed: true });
  }

  return NextResponse.json({ ok: true });
}
