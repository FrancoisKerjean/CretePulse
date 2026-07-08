// src/app/api/cron/car-relance/route.ts
// Relances par demande, deux côtés (multi-devis) :
//  - loueur invité qui n'a pas chiffré (>24h, 1× max) ;
//  - client avec ≥1 offre qui n'a pas tranché (>24h, 2× max).
// Un loueur 'declined' ou une demande 'declined_by_client'/'accepted' n'est plus
// relancé (gardes partnerNeedsRelance/clientNeedsRelance). Idempotent.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { partnerNeedsRelance, clientNeedsRelance } from "@/lib/car-quotes";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";
import { partnerById } from "@/lib/car-partners-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const now = Date.now();
  // On ne relance pas une location déjà commencée (demande morte de fait).
  const startInFuture = (dateFrom: string | null | undefined): boolean =>
    dateFrom ? new Date(dateFrom + "T00:00:00").getTime() > now : true;

  const { sendPartnerRelance, sendCustomerRelance } = await import("@/lib/email");

  // ── Passe loueur ───────────────────────────────────────────────────────────
  let partnersRelanced = 0;
  const { data: invites } = await supabase.from("car_quote_invites")
    .select("id, request_id, partner_id, status, relanced_at, created_at, car_requests(status, date_from)")
    .eq("status", "invited")
    .is("relanced_at", null);
  for (const inv of invites ?? []) {
    const raw = (inv as { car_requests?: unknown }).car_requests;
    const reqRow = (Array.isArray(raw) ? raw[0] : raw) as { status?: string; date_from?: string } | undefined;
    if (!reqRow?.status) continue;
    if (!startInFuture(reqRow.date_from)) continue;
    if (!partnerNeedsRelance(
      { status: inv.status, relanced_at: inv.relanced_at },
      reqRow.status, now, new Date(inv.created_at).getTime(),
    )) continue;

    const partner = await partnerById(inv.partner_id);
    if (!partner?.email) continue;
    // Token loueur rotatif : le clair n'est pas récupérable depuis le hash. On
    // marque relanced_at AVANT l'envoi → jamais de double relance même si l'email
    // échoue (best-effort, 1× garanti).
    const qToken = newToken();
    await supabase.from("car_quote_invites").update({
      quote_token_hash: hashToken(qToken), relanced_at: new Date().toISOString(),
    }).eq("id", inv.id);
    try {
      await sendPartnerRelance(partner.email, partner.name, `${siteBase()}/en/car-quote/${qToken}`);
      partnersRelanced++;
    } catch (e) { console.error("[cron/car-relance] partner relance failed", inv.id, e); }
  }

  // ── Passe client ─────────────────────────────────────────────────────────────
  let clientsRelanced = 0;
  const { data: reqs } = await supabase.from("car_requests")
    .select("id, status, locale, customer_email, customer_name, date_from, client_relanced_at, client_relance_count")
    .eq("status", "quoted");
  for (const r of reqs ?? []) {
    if (!startInFuture(r.date_from)) continue;
    if (!clientNeedsRelance(
      { status: r.status, client_relanced_at: r.client_relanced_at, client_relance_count: r.client_relance_count ?? 0 },
      now,
    )) continue;

    const locale = r.locale ?? "en";
    const clientToken = newToken();
    await supabase.from("car_requests").update({
      accept_token_hash: hashToken(clientToken),
      client_relanced_at: new Date().toISOString(),
      client_relance_count: (r.client_relance_count ?? 0) + 1,
    }).eq("id", r.id);
    try {
      await sendCustomerRelance({
        email: r.customer_email, locale, customerName: r.customer_name,
        offersUrl: `${siteBase()}/${locale}/car-offer/${clientToken}`,
      });
      clientsRelanced++;
    } catch (e) { console.error("[cron/car-relance] client relance failed", r.id, e); }
  }

  return NextResponse.json({ ok: true, partnersRelanced, clientsRelanced });
}
