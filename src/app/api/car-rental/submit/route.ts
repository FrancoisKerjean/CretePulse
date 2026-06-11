import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { partnerForPickup } from "@/lib/car-partners";
import { CAR_TYPES } from "@/lib/car-types";
import { SLUG_COORDS } from "@/lib/taxi-fare";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const label = (slug: string) => slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (body.website && String(body.website).trim() !== "") return NextResponse.json({ ok: true }); // honeypot

  const pickup = String(body.pickup ?? "");
  const carType = CAR_TYPES.find((c) => c.id === body.carType);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const dateFrom = String(body.dateFrom ?? ""); const dateTo = String(body.dateTo ?? "");
  const partner = partnerForPickup(pickup);

  if (!partner) return NextResponse.json({ error: "No partner in this area yet" }, { status: 400 });
  if (!SLUG_COORDS[pickup] || !carType || !name || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo) || dateTo < dateFrom) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 422 });
  }

  // Dédup : même email + pickup + dateFrom dans les 10 min → silent success
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: dup } = await supabase.from("car_requests").select("id")
    .eq("customer_email", email).eq("pickup_slug", pickup).eq("date_from", dateFrom)
    .gte("created_at", tenMinAgo).limit(1);
  if (dup && dup.length > 0) return NextResponse.json({ ok: true });

  function str(v: unknown): string | null { return typeof v === "string" && v.trim() ? v.trim() : null; }

  const row = {
    locale: typeof body.locale === "string" ? body.locale : "en",
    pickup_slug: pickup, zone_id: partner.zone.id,
    partner_name: partner.name, partner_email: partner.email,
    date_from: dateFrom, time_from: str(body.timeFrom), date_to: dateTo, time_to: str(body.timeTo),
    flight_no: str(body.flightNo), car_type: carType.id,
    pax: Number.isInteger(body.pax) ? (body.pax as number) : null,
    customer_name: name, customer_email: email, customer_phone: str(body.phone),
    note: str(body.note)?.slice(0, 500) ?? null, source: str(body.source), status: "sent",
  };

  const { data: inserted, error } = await supabase.from("car_requests").insert(row).select("id").single();
  if (error) console.error("[car-rental/submit] insert error:", error.message); // on tente quand même l'email

  try {
    const { sendCarLeadEmail } = await import("@/lib/email");
    await sendCarLeadEmail(partner.email, partner.name, {
      pickupLabel: label(pickup), dateFrom, timeFrom: row.time_from ?? undefined,
      dateTo, timeTo: row.time_to ?? undefined, flightNo: row.flight_no ?? undefined,
      carTypeLabel: carType.labels.en, pax: row.pax ?? undefined,
      customerName: name, customerEmail: email, customerPhone: row.customer_phone ?? undefined,
      note: row.note ?? undefined,
    });
  } catch (e) {
    console.error("[car-rental/submit] email error:", e);
    if (inserted) await supabase.from("car_requests").update({ status: "email_failed" }).eq("id", inserted.id);
    // Le front affichera le WhatsApp de l'agence en secours
    return NextResponse.json({ ok: false, fallbackWhatsapp: partner.whatsapp ?? partner.phone });
  }

  return NextResponse.json({ ok: true });
}
