import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { validateActivityLead } from "@/lib/activity-lead";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";
import { partnersForCategoryCity } from "@/lib/activity-partners-db";
import { categoryLabel, cityLabel } from "@/lib/activity-taxonomy";
import type { ActivityLead } from "@/lib/email";

// Anti-abus : plafonds de demandes par IP. Un fan-out = N emails à de vrais
// prestataires ; changer d'email bypasse la dédup mais pas l'IP. Silencieux quand
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
    const { count } = await supabase.from("activity_requests")
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

  // Validation pure (honeypot, catégorie, date, participants) : src/lib/activity-lead.ts.
  const v = validateActivityLead(body);
  if (v.kind === "honeypot") return NextResponse.json({ ok: true });
  if (v.kind === "error") return NextResponse.json({ error: v.error }, { status: v.status });
  const { row } = v;

  // Rate-limit par IP AVANT tout travail coûteux (lookup prestataires, fan-out).
  // Silencieux : succès renvoyé sans déclencher d'envoi.
  const ipHash = clientIpHash(request);
  if (ipHash && await ipRateLimited(ipHash)) {
    return NextResponse.json({ ok: true });
  }

  // Appel d'offres : tous les prestataires actifs de la catégorie/ville. Aucun → pas couvert.
  const partners = await partnersForCategoryCity(row.category_slug, row.city);
  if (partners.length === 0) {
    try {
      const { sendActivityCustomerRequestReceived } = await import("@/lib/email");
      await sendActivityCustomerRequestReceived({
        email: row.customer_email, locale: row.locale, customerName: row.customer_name,
        request: { categoryLabel: categoryLabel(row.category_slug, row.locale), cityLabel: cityLabel(row.city, row.locale), date: row.activity_date },
        noProvider: true,
      });
    } catch (e) { console.error("[activities/submit] no-provider ack failed:", e); }
    return NextResponse.json({ error: "No provider for this activity here yet" }, { status: 400 });
  }

  // Dédup : même email + catégorie + ville + date dans les 10 min → silent success.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: dup } = await supabase.from("activity_requests").select("id")
    .eq("customer_email", row.customer_email).eq("category_slug", row.category_slug).eq("city", row.city).eq("activity_date", row.activity_date)
    .gte("created_at", tenMinAgo).limit(1);
  if (dup && dup.length > 0) return NextResponse.json({ ok: true });

  const clientToken = newToken();
  const { data: inserted, error } = await supabase.from("activity_requests")
    .insert({ ...row, ip_hash: ipHash, accept_token_hash: hashToken(clientToken) })
    .select("id").single();
  if (error || !inserted) {
    console.error("[activities/submit] insert error:", error?.message);
    return NextResponse.json({ error: "Could not save request" }, { status: 500 });
  }
  const requestId = inserted.id as number;

  const lead: ActivityLead = {
    categoryLabel: categoryLabel(row.category_slug, "en"),
    cityLabel: cityLabel(row.city, "en"),
    date: row.activity_date,
    timeslot: row.timeslot ?? undefined,
    adults: row.adults,
    children: row.children,
    preferredLanguage: row.preferred_language ?? undefined,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone ?? undefined,
    note: row.note ?? undefined,
  };

  // Fan-out : chaque prestataire direct reçoit son propre lien de devis (invite) ;
  // un prestataire en relais reçoit le résumé Kami (qui contient les coordonnées client).
  const { sendActivityQuoteRequest, sendActivityLeadKamiSummary, sendActivityCustomerRequestReceived } = await import("@/lib/email");
  const sentNames: string[] = [];
  for (const p of partners) {
    try {
      if (p.lead_routing === "relay") {
        await sendActivityLeadKamiSummary(lead, [p.name]);
      } else {
        const token = newToken();
        await supabase.from("activity_quote_invites").insert({ request_id: requestId, partner_id: p.id, quote_token_hash: hashToken(token) });
        await sendActivityQuoteRequest({ name: p.name, email: p.email }, lead, `${siteBase()}/en/activity-quote/${token}`);
      }
      sentNames.push(p.name);
    } catch (e) {
      console.error(`[activities/submit] email partner ${p.id} failed:`, e);
    }
  }

  if (sentNames.length === 0) {
    await supabase.from("activity_requests").update({ status: "email_failed" }).eq("id", requestId);
    const fb = partners[0];
    try {
      await sendActivityCustomerRequestReceived({
        email: row.customer_email, locale: row.locale,
        customerName: row.customer_name,
        request: { categoryLabel: categoryLabel(row.category_slug, row.locale), cityLabel: cityLabel(row.city, row.locale), date: row.activity_date },
        noProvider: true,
      });
    } catch (e) { console.error("[activities/submit] ack email (no provider) failed:", e); }
    return NextResponse.json({ ok: false, fallbackWhatsapp: fb.whatsapp ?? fb.phone });
  }

  await sendActivityLeadKamiSummary(lead, sentNames);
  try {
    await sendActivityCustomerRequestReceived({
      email: row.customer_email, locale: row.locale,
      customerName: row.customer_name,
      request: { categoryLabel: categoryLabel(row.category_slug, row.locale), cityLabel: cityLabel(row.city, row.locale), date: row.activity_date },
      noProvider: false,
    });
  } catch (e) { console.error("[activities/submit] ack email failed:", e); }
  return NextResponse.json({ ok: true });
}
