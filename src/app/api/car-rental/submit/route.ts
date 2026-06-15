import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { validateCarLead, carPickupLabel } from "@/lib/car-lead";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Validation pure (honeypot, partenaire, dates, construction de la ligne) :
  // src/lib/car-lead.ts, testée par scripts/check-car-lead.mjs.
  const v = validateCarLead(body);
  if (v.kind === "honeypot") return NextResponse.json({ ok: true });
  if (v.kind === "error") return NextResponse.json({ error: v.error }, { status: v.status });
  const { partner, carType, row } = v;

  // Dédup : même email + pickup + dateFrom dans les 10 min → silent success
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: dup } = await supabase.from("car_requests").select("id")
    .eq("customer_email", row.customer_email).eq("pickup_slug", row.pickup_slug).eq("date_from", row.date_from)
    .gte("created_at", tenMinAgo).limit(1);
  if (dup && dup.length > 0) return NextResponse.json({ ok: true });

  const { data: inserted, error } = await supabase.from("car_requests").insert(row).select("id").single();
  if (error) console.error("[car-rental/submit] insert error:", error.message); // on tente quand même l'email

  try {
    const { sendCarLeadEmail } = await import("@/lib/email");
    await sendCarLeadEmail(partner, {
      pickupLabel: carPickupLabel(row.pickup_slug), dateFrom: row.date_from, timeFrom: row.time_from ?? undefined,
      dateTo: row.date_to, timeTo: row.time_to ?? undefined, flightNo: row.flight_no ?? undefined,
      carTypeLabel: carType.labels.en, pax: row.pax ?? undefined,
      customerName: row.customer_name, customerEmail: row.customer_email, customerPhone: row.customer_phone ?? undefined,
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
