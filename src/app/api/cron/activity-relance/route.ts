// src/app/api/cron/activity-relance/route.ts
// Relances par demande, deux côtés (multi-devis) :
//  - prestataire invité qui n'a pas chiffré (>24h, 1× max) ;
//  - client avec ≥1 offre qui n'a pas tranché (>24h, 2× max).
// Un prestataire 'declined' ou une demande 'declined_by_client'/'accepted' n'est plus
// relancé (gardes partnerNeedsRelance/clientNeedsRelance). Idempotent.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { partnerNeedsRelance, clientNeedsRelance } from "@/lib/activity-quotes";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";
import { partnerById } from "@/lib/activity-partners-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const now = Date.now();
  // On ne relance pas une activité déjà commencée (demande morte de fait).
  const startInFuture = (activityDate: string | null | undefined): boolean =>
    activityDate ? new Date(activityDate + "T00:00:00").getTime() > now : true;

  const { sendActivityPartnerRelance, sendActivityCustomerRelance } = await import("@/lib/email");

  // ── Passe prestataire ───────────────────────────────────────────────────────────
  let partnersRelanced = 0;
  const { data: invites } = await supabase.from("activity_quote_invites")
    .select("id, request_id, partner_id, status, relanced_at, created_at, activity_requests(status, activity_date)")
    .eq("status", "invited")
    .is("relanced_at", null);
  for (const inv of invites ?? []) {
    const raw = (inv as { activity_requests?: unknown }).activity_requests;
    const reqRow = (Array.isArray(raw) ? raw[0] : raw) as { status?: string; activity_date?: string } | undefined;
    if (!reqRow?.status) continue;
    if (!startInFuture(reqRow.activity_date)) continue;
    if (!partnerNeedsRelance(
      { status: inv.status, relanced_at: inv.relanced_at },
      reqRow.status, now, new Date(inv.created_at).getTime(),
    )) continue;

    const partner = await partnerById(inv.partner_id);
    if (!partner?.email) continue;
    // Token prestataire rotatif : le clair n'est pas récupérable depuis le hash. On
    // marque relanced_at AVANT l'envoi → jamais de double relance même si l'email
    // échoue (best-effort, 1× garanti).
    const qToken = newToken();
    await supabase.from("activity_quote_invites").update({
      quote_token_hash: hashToken(qToken), relanced_at: new Date().toISOString(),
    }).eq("id", inv.id);
    try {
      await sendActivityPartnerRelance(partner.email, partner.name, `${siteBase()}/en/activity-quote/${qToken}`);
      partnersRelanced++;
    } catch (e) { console.error("[cron/activity-relance] partner relance failed", inv.id, e); }
  }

  // ── Passe client ─────────────────────────────────────────────────────────────
  let clientsRelanced = 0;
  const { data: reqs } = await supabase.from("activity_requests")
    .select("id, status, locale, customer_email, customer_name, activity_date, client_relanced_at, client_relance_count")
    .eq("status", "quoted");
  for (const r of reqs ?? []) {
    if (!startInFuture(r.activity_date)) continue;
    if (!clientNeedsRelance(
      { status: r.status, client_relanced_at: r.client_relanced_at, client_relance_count: r.client_relance_count ?? 0 },
      now,
    )) continue;
    // Ne relance que si ≥1 offre RÉELLEMENT visible sur la page (invite chiffrée).
    // Garde-fou : les demandes chiffrées sous l'ancien first-come portent le devis
    // sur activity_requests.quoted_* mais leurs invites restent 'invited' → page vide,
    // relance trompeuse. On les ignore.
    const { count: pricedCount } = await supabase.from("activity_quote_invites")
      .select("id", { count: "exact", head: true })
      .eq("request_id", r.id).not("quote_price", "is", null);
    if (!pricedCount) continue;

    const locale = r.locale ?? "en";
    const clientToken = newToken();
    await supabase.from("activity_requests").update({
      accept_token_hash: hashToken(clientToken),
      client_relanced_at: new Date().toISOString(),
      client_relance_count: (r.client_relance_count ?? 0) + 1,
    }).eq("id", r.id);
    try {
      await sendActivityCustomerRelance({
        email: r.customer_email, locale, customerName: r.customer_name,
        offersUrl: `${siteBase()}/${locale}/activity-offer/${clientToken}`,
      });
      clientsRelanced++;
    } catch (e) { console.error("[cron/activity-relance] client relance failed", r.id, e); }
  }

  return NextResponse.json({ ok: true, partnersRelanced, clientsRelanced });
}
