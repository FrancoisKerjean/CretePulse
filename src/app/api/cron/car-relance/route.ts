// src/app/api/cron/car-relance/route.ts
// Relances par demande, deux côtés (multi-devis) :
//  - loueur invité qui n'a pas chiffré (>24h, 1× max) ;
//  - client avec ≥1 offre qui n'a pas tranché (>24h, 2× max).
//  - clôture auto si client silencieux après 2 relances +24h ou date de début atteinte.
// Un loueur 'declined' ou une demande 'declined_by_client'/'accepted' n'est plus
// relancé (gardes partnerNeedsRelance/clientNeedsRelance). Idempotent.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { clientNeedsRelance, clientAutoCloseReason } from "@/lib/car-quotes";
import { hashToken, siteBase, resolveClientToken } from "@/lib/car-quote";
import { runPartnerNudgePass } from "@/lib/car-partner-nudge-server";
import { assertCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertCron(request);
  if (denied) return denied;
  const now = Date.now();
  // On ne relance pas une location déjà commencée (demande morte de fait).
  const startInFuture = (dateFrom: string | null | undefined): boolean =>
    dateFrom ? new Date(dateFrom + "T00:00:00").getTime() > now : true;

  const { sendCustomerRelance } = await import("@/lib/email");

  // ── Passe loueur ───────────────────────────────────────────────────────────
  // Déléguée à `car-partner-nudge-server`, que `cron/car-partner-nudge` appelle
  // toutes les heures depuis le passage du seuil à H+2. Cette exécution de 9h
  // reste un FILET : si la passe horaire tombe, elle rattrape les invites restées
  // sans relance. Le plafond d'une relance par invite rend le doublon impossible.
  const { partnersRelanced } = await runPartnerNudgePass(now);

  // ── Passe client ─────────────────────────────────────────────────────────────
  let clientsRelanced = 0;
  let clientsAutoClosed = 0;
  let closedByRentalStart = 0;
  let closedByClientSilence = 0;
  const { data: reqs } = await supabase.from("car_requests")
    .select("id, status, locale, customer_email, customer_name, date_from, client_relanced_at, client_relance_count, client_token")
    .eq("status", "quoted");
  for (const r of reqs ?? []) {
    // Si la location commence aujourd'hui/est passée, ou si le client a ignoré
    // les 2 relances pendant 24h, on clôture en silence (aucun email loueur ni
    // client : décision 11/07/2026, notifications actionnables uniquement).
    const autoCloseReason = clientAutoCloseReason(
      { status: r.status, date_from: r.date_from, client_relanced_at: r.client_relanced_at, client_relance_count: r.client_relance_count ?? 0 },
      now,
    );
    if (autoCloseReason) {
      const { count: pricedCount } = await supabase.from("car_quote_invites")
        .select("id", { count: "exact", head: true })
        .eq("request_id", r.id).not("quote_price", "is", null);
      if (pricedCount) {
        await supabase.from("car_requests").update({
          status: "declined_by_client",
          accept_token_hash: null,
          closure_reason: autoCloseReason,
        }).eq("id", r.id);
        await supabase.from("car_quote_invites").update({ status: "not_chosen" })
          .eq("request_id", r.id).eq("status", "quoted");
        clientsAutoClosed++;
        if (autoCloseReason === "rental_started") closedByRentalStart++;
        if (autoCloseReason === "client_silent") closedByClientSilence++;
      }
      continue;
    }

    if (!startInFuture(r.date_from)) continue;
    if (!clientNeedsRelance(
      { status: r.status, client_relanced_at: r.client_relanced_at, client_relance_count: r.client_relance_count ?? 0 },
      now,
    )) continue;
    // Ne relance que si ≥1 offre RÉELLEMENT visible sur la page (invite chiffrée).
    // Garde-fou : les demandes chiffrées sous l'ancien first-come portent le devis
    // sur car_requests.quoted_* mais leurs invites restent 'invited' → page vide,
    // relance trompeuse. On les ignore.
    const { count: pricedCount } = await supabase.from("car_quote_invites")
      .select("id", { count: "exact", head: true })
      .eq("request_id", r.id).not("quote_price", "is", null);
    if (!pricedCount) continue;

    const locale = r.locale ?? "en";
    // Lien d'offres STABLE : on réutilise le token client persisté (submit) au
    // lieu de le rotationner. Rétro-compat : demande legacy sans client_token →
    // token neuf persisté (clair + hash) pour stabiliser les emails suivants.
    const { token: clientToken, isNew } = resolveClientToken(r.client_token);
    await supabase.from("car_requests").update({
      ...(isNew ? { accept_token_hash: hashToken(clientToken), client_token: clientToken } : {}),
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

  return NextResponse.json({
    ok: true,
    partnersRelanced,
    clientsRelanced,
    clientsAutoClosed,
    closedByRentalStart,
    closedByClientSilence,
  });
}
