import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";

// Le loueur soumet son prix (page /car-quote/{token}). On enregistre le prix,
// on consomme le jeton de devis, on génère un jeton d'acceptation et on envoie
// automatiquement le prix au client avec un bouton d'acceptation.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const token = typeof body.token === "string" ? body.token : "";
  const price = typeof body.price === "number" ? body.price : Number(body.price);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0 || price > 100000) {
    return NextResponse.json({ error: "Invalid price" }, { status: 422 });
  }

  const { data: row } = await supabase.from("car_requests")
    .select("id, status, locale, pickup_slug, date_from, date_to, car_type, customer_name, customer_email")
    .eq("quote_token_hash", hashToken(token))
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Not found or already submitted" }, { status: 404 });
  if (row.status === "quoted" || row.status === "accepted") {
    return NextResponse.json({ ok: true, already: true });
  }

  const acceptToken = newToken();
  const { error: upErr } = await supabase.from("car_requests").update({
    quoted_price: price,
    quoted_currency: "EUR",
    quoted_at: new Date().toISOString(),
    status: "quoted",
    accept_token_hash: hashToken(acceptToken),
    quote_token_hash: null, // consommé : le loueur ne peut pas re-soumettre
  }).eq("id", row.id);
  if (upErr) {
    console.error("[car-rental/quote] update error:", upErr.message);
    return NextResponse.json({ error: "Could not save price" }, { status: 500 });
  }

  const locale = row.locale || "en";
  const ct = CAR_TYPES_DATA.find((c) => c.id === row.car_type);
  const carTypeLabel = ct?.labels[locale] ?? ct?.labels.en ?? row.car_type;

  try {
    const { sendCustomerQuoteEmail } = await import("@/lib/email");
    await sendCustomerQuoteEmail({
      email: row.customer_email,
      locale,
      customerName: row.customer_name,
      acceptUrl: `${siteBase()}/${locale}/car-offer/${acceptToken}`,
      quote: {
        pickupLabel: carPickupLabel(row.pickup_slug), dateFrom: row.date_from, dateTo: row.date_to,
        carTypeLabel, price, currency: "EUR",
      },
    });
  } catch (e) {
    console.error("[car-rental/quote] customer email error:", e);
    // Le prix est enregistré ; on n'annule pas. Kami reçoit le fallback via ses
    // propres notifications si besoin.
    return NextResponse.json({ ok: true, emailFailed: true });
  }

  return NextResponse.json({ ok: true });
}
