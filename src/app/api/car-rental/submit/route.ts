import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { validateCarLead, carPickupLabel, carTypeLabelWithExamples } from "@/lib/car-lead";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";
import { partnersForZone } from "@/lib/car-partners-db";
import type { CarLead } from "@/lib/email";

// Anti-abus : plafonds de demandes par IP. Un fan-out = N emails à de vrais
// loueurs ; changer d'email bypasse la dédup mais pas l'IP. Silencieux quand
// atteint (on ne révèle pas la limite, on ne déclenche aucun envoi).
const RL_MAX_PER_HOUR = 4;
const RL_MAX_PER_DAY = 12;

/** SHA256(IP + sel) — l'IP en clair n'est jamais stockée (RGPD). */
function clientIpHash(request: NextRequest): string | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) return null;
  const salt = process.env.CAR_RL_SALT || "crete-direct-car-rl";
  return createHash("sha256").update(ip + salt).digest("hex");
}

/** true si l'IP a dépassé un plafond (heure ou jour). */
async function ipRateLimited(ipHash: string): Promise<boolean> {
  const countSince = async (ms: number): Promise<number> => {
    const since = new Date(Date.now() - ms).toISOString();
    const { count } = await supabase.from("car_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", since);
    return count ?? 0;
  };
  if (await countSince(60 * 60 * 1000) >= RL_MAX_PER_HOUR) return true;
  if (await countSince(24 * 60 * 60 * 1000) >= RL_MAX_PER_DAY) return true;
  return false;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Validation pure (honeypot, zone, dates, ligne) : src/lib/car-lead.ts.
  const v = validateCarLead(body);
  if (v.kind === "honeypot") return NextResponse.json({ ok: true });
  if (v.kind === "error") return NextResponse.json({ error: v.error }, { status: v.status });
  const { zone, carType, row } = v;

  // Rate-limit par IP AVANT tout travail coûteux (lookup loueurs, fan-out).
  // Silencieux : succès renvoyé sans déclencher d'envoi.
  const ipHash = clientIpHash(request);
  if (ipHash && await ipRateLimited(ipHash)) {
    return NextResponse.json({ ok: true });
  }

  // Appel d'offres : tous les loueurs actifs de la zone. Aucun → pas couvert.
  const partners = await partnersForZone(zone.id);
  if (partners.length === 0) {
    try {
      const { sendCustomerRequestReceived } = await import("@/lib/email");
      await sendCustomerRequestReceived({
        email: row.customer_email, locale: row.locale ?? "en", customerName: row.customer_name,
        request: { pickupLabel: carPickupLabel(row.pickup_slug), dateFrom: row.date_from, dateTo: row.date_to, carTypeLabel: carTypeLabelWithExamples(carType, row.locale ?? "en") },
        noAgency: true,
      });
    } catch (e) { console.error("[car-rental/submit] no-agency ack failed:", e); }
    return NextResponse.json({ error: "No partner in this area yet" }, { status: 400 });
  }

  // Dédup : même email + pickup + dateFrom dans les 10 min → silent success.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: dup } = await supabase.from("car_requests").select("id")
    .eq("customer_email", row.customer_email).eq("pickup_slug", row.pickup_slug).eq("date_from", row.date_from)
    .gte("created_at", tenMinAgo).limit(1);
  if (dup && dup.length > 0) return NextResponse.json({ ok: true });

  const clientToken = newToken();
  const { data: inserted, error } = await supabase.from("car_requests")
    .insert({ ...row, ip_hash: ipHash, accept_token_hash: hashToken(clientToken) })
    .select("id").single();
  if (error || !inserted) {
    console.error("[car-rental/submit] insert error:", error?.message);
    return NextResponse.json({ error: "Could not save request" }, { status: 500 });
  }
  const requestId = inserted.id as number;

  const lead: CarLead = {
    pickupLabel: carPickupLabel(row.pickup_slug), dateFrom: row.date_from, timeFrom: row.time_from ?? undefined,
    dateTo: row.date_to, timeTo: row.time_to ?? undefined, flightNo: row.flight_no ?? undefined,
    carTypeLabel: carTypeLabelWithExamples(carType, "en"), pax: row.pax ?? undefined,
    insurance: row.insurance ?? undefined, payment: row.payment_method ?? undefined,
    customerName: row.customer_name, customerEmail: row.customer_email, customerPhone: row.customer_phone ?? undefined,
    note: row.note ?? undefined,
  };

  // Fan-out : chaque loueur direct reçoit son propre lien de devis (invite) ;
  // un loueur en relais reçoit l'email WhatsApp legacy chez Kami.
  const { sendAgencyQuoteRequest, sendCarLeadEmail, sendLeadKamiSummary, sendCustomerRequestReceived } = await import("@/lib/email");
  const sentNames: string[] = [];
  for (const p of partners) {
    try {
      if (p.lead_routing === "relay") {
        await sendCarLeadEmail({ email: p.email, name: p.name, phone: p.phone ?? "", whatsapp: p.whatsapp ?? undefined, leadRouting: "relay" }, lead);
      } else {
        const token = newToken();
        await supabase.from("car_quote_invites").insert({ request_id: requestId, partner_id: p.id, quote_token_hash: hashToken(token) });
        await sendAgencyQuoteRequest({ name: p.name, email: p.email }, lead, `${siteBase()}/en/car-quote/${token}`);
      }
      sentNames.push(p.name);
    } catch (e) {
      console.error(`[car-rental/submit] email partner ${p.id} failed:`, e);
    }
  }

  if (sentNames.length === 0) {
    await supabase.from("car_requests").update({ status: "email_failed" }).eq("id", requestId);
    const fb = partners[0];
    try {
      await sendCustomerRequestReceived({
        email: row.customer_email, locale: row.locale,
        customerName: row.customer_name,
        request: { pickupLabel: lead.pickupLabel, dateFrom: lead.dateFrom, dateTo: lead.dateTo, carTypeLabel: lead.carTypeLabel },
        noAgency: true,
      });
    } catch (e) { console.error("[car-rental/submit] ack email (no agency) failed:", e); }
    return NextResponse.json({ ok: false, fallbackWhatsapp: fb.whatsapp ?? fb.phone });
  }

  await sendLeadKamiSummary(lead, sentNames);
  try {
    await sendCustomerRequestReceived({
      email: row.customer_email, locale: row.locale,
      customerName: row.customer_name,
      request: { pickupLabel: lead.pickupLabel, dateFrom: lead.dateFrom, dateTo: lead.dateTo, carTypeLabel: lead.carTypeLabel },
      noAgency: false,
    });
  } catch (e) { console.error("[car-rental/submit] ack email failed:", e); }
  return NextResponse.json({ ok: true });
}
