import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { validateCarLead, carPickupLabel, carTypeLabelWithExamples } from "@/lib/car-lead";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";
import { ensurePortalToken, liveCataloguesForPartners, partnersForZoneWithTerms } from "@/lib/car-catalogue-db";
import { planFanOut, type CatalogueConditions, type RateRow } from "@/lib/car-catalogue";
import { assertWritten } from "@/lib/car-invoice-server";
import { meetsMinDays, rentalDays } from "@/lib/car-pricing";
import { notifyOps, echeance } from "@/lib/ops-notify";
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
  const partners = await partnersForZoneWithTerms(zone.id);
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
    .insert({ ...row, ip_hash: ipHash, accept_token_hash: hashToken(clientToken), client_token: clientToken })
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
    gearbox: row.gearbox ?? undefined, childSeats: row.child_seats,
    customerName: row.customer_name, customerEmail: row.customer_email, customerPhone: row.customer_phone ?? undefined,
    note: row.note ?? undefined,
  };

  // Fan-out : chaque loueur direct reçoit son propre lien de devis (invite) ;
  // un loueur en relais reçoit l'email WhatsApp legacy chez Kami.
  //
  // ⛔ Le filtre par durée minimale vit ICI, après l'insert, jamais dans le
  // contrôle de couverture de zone en tête de route : celui-ci rend un 400
  // AVANT d'écrire la demande. Filtrer là-haut ferait disparaître de la base
  // toute demande trop courte, donc invisible à l'admin et irrattrapable à la
  // main. Une demande que personne ne peut servir reste une demande reçue.
  const days = rentalDays(row.date_from, row.date_to, row.time_from, row.time_to);
  const eligibles = partners.filter((p) => meetsMinDays(p.min_days, days));
  const { sendAgencyQuoteRequest, sendCarLeadEmail, sendLeadKamiSummary, sendCustomerRequestReceived, sendCustomerNewOffer } = await import("@/lib/email");
  const sentNames: string[] = [];

  if (eligibles.length === 0) {
    // Mesure du 12/08/2026 : la demande 53 (Rethymno, 1 jour) est partie à 8
    // loueurs et n'a produit 0 offre. Luxtrans avait répondu par écrit « 3 day
    // minimum », et le brouillon de réponse promettait de filtrer les demandes
    // suivantes, un filtre qui n'existait pas. Il existe maintenant, et le cas
    // « personne n'est éligible » sonne au lieu de laisser le voyageur attendre.
    await supabase.from("car_requests").update({ status: "below_min_days" }).eq("id", requestId);
    void notifyOps({
      title: "Demande voiture trop courte pour la zone",
      lines: [
        `${lead.pickupLabel} · ${lead.dateFrom} au ${lead.dateTo} · ${days} jour(s)`,
        `${row.customer_name || "client"} · ${row.customer_email}`,
        `${partners.length} loueur(s) dans la zone, aucun n'accepte cette durée`,
      ],
      action: "proposer une durée plus longue ou un loueur hors zone",
      due: echeance(0),
      url: `${siteBase()}/admin/car-rental`,
    });
    try {
      await sendCustomerRequestReceived({
        email: row.customer_email, locale: row.locale,
        customerName: row.customer_name,
        request: { pickupLabel: lead.pickupLabel, dateFrom: lead.dateFrom, dateTo: lead.dateTo, carTypeLabel: lead.carTypeLabel },
        noAgency: true,
      });
    } catch (e) { console.error("[car-rental/submit] ack email (below min days) failed:", e); }
    const fb = partners[0];
    return NextResponse.json({ ok: false, fallbackWhatsapp: fb.whatsapp ?? fb.phone });
  }

  // Interrupteur lu ici (pas au chargement du module) : offres instantanées
  // depuis les grilles publiées. Éteint, tout le fan-out reste un appel de devis.
  const catalogueOn = process.env.CAR_CATALOGUE_ENABLED === "on";
  let catalogues = new Map<number, { rates: RateRow[]; conditions: CatalogueConditions | null }>();
  if (catalogueOn) {
    try {
      catalogues = await liveCataloguesForPartners(eligibles.map((p) => p.id));
    } catch (e) {
      // Sans grilles lisibles, tout le monde reçoit une demande de devis.
      console.error("[car-rental/submit] catalogues unreadable:", e);
    }
  }
  const plan = planFanOut({
    enabled: catalogueOn, partners: eligibles, catalogues,
    req: {
      category: carType.id, pickupSlug: row.pickup_slug, dateFrom: row.date_from, dateTo: row.date_to,
      timeFrom: row.time_from, timeTo: row.time_to,
    },
  });
  const byId = new Map(eligibles.map((p) => [p.id, p]));

  // Offres de grille : l'invite naît déjà « quoted », son jeton n'est jamais
  // envoyé, aucun email ne part au loueur. Un échec isole ce loueur seulement.
  const catalogueNames: string[] = [];
  for (const o of plan.catalogue) {
    try {
      const nowIso = new Date().toISOString();
      const ins = await supabase.from("car_quote_invites").insert({
        request_id: requestId, partner_id: o.partnerId, quote_token_hash: hashToken(newToken()),
        status: "quoted", quoted_at: nowIso, quote_price: o.total, quote_currency: "EUR",
        quote_car_model: o.carModel, quote_inclusions: o.inclusions,
        quote_insurance_type: o.insuranceType, quote_excess_eur: o.excessEur,
        quote_zero_excess_upsell_eur_day: o.zeroExcessUpsellEurDay,
      }).select("id").single();
      assertWritten("car_quote_invites.insert", o.partnerId, ins.error);
      const opt = await supabase.from("car_quote_options").insert({
        invite_id: ins.data!.id, request_id: requestId, partner_id: o.partnerId,
        price: o.total, currency: "EUR", car_model: o.carModel, gearbox: o.gearbox, inclusions: o.inclusions,
        insurance_type: o.insuranceType, excess_eur: o.excessEur, zero_excess_upsell_eur_day: o.zeroExcessUpsellEurDay,
        note: o.note, source: "catalogue",
      });
      assertWritten("car_quote_options.insert", o.partnerId, opt.error);
      catalogueNames.push(byId.get(o.partnerId)?.name ?? String(o.partnerId));
    } catch (e) {
      console.error(`[car-rental/submit] catalogue offer partner ${o.partnerId} failed:`, e);
    }
  }

  for (const p of plan.quote.map((id) => byId.get(id)!)) {
    try {
      if (p.lead_routing === "relay") {
        await sendCarLeadEmail({ email: p.email, name: p.name, phone: p.phone ?? "", whatsapp: p.whatsapp ?? undefined, leadRouting: "relay" }, lead);
      } else {
        const token = newToken();
        await supabase.from("car_quote_invites").insert({ request_id: requestId, partner_id: p.id, quote_token_hash: hashToken(token) });
        // Lien du portail 2027 : jamais bloquant, une demande de devis part même sans lui.
        let portalUrl: string | undefined;
        try {
          portalUrl = `${siteBase()}/en/car-rates/${await ensurePortalToken(p.id)}`;
        } catch (e) {
          console.error(`[car-rental/submit] portal token partner ${p.id} failed:`, e);
        }
        await sendAgencyQuoteRequest({ name: p.name, email: p.email }, lead, `${siteBase()}/en/car-quote/${token}`, portalUrl);
      }
      sentNames.push(p.name);
    } catch (e) {
      console.error(`[car-rental/submit] email partner ${p.id} failed:`, e);
    }
  }

  if (sentNames.length === 0 && catalogueNames.length === 0) {
    await supabase.from("car_requests").update({ status: "email_failed" }).eq("id", requestId);

    // Cas le plus couteux du tunnel et le seul qui n'alertait PERSONNE : un
    // voyageur a demande une voiture, aucun loueur n'a pu etre joint, il recoit
    // un « no agency » et l'affaire est perdue si personne ne reprend la main.
    void notifyOps({
      title: "Demande voiture SANS loueur joignable",
      lines: [
        `${lead.pickupLabel} · ${lead.dateFrom} au ${lead.dateTo}`,
        `${row.customer_name || "client"} · ${row.customer_email}`,
        catalogueOn && plan.catalogue.length === 0 && plan.quote.length === 0
          ? `${eligibles.length} loueur(s) éligible(s) sur ${partners.length} dans la zone, aucun loueur réservable : conditions 2027 non acceptées (ou relais)`
          : `${eligibles.length} loueur(s) éligible(s) sur ${partners.length} dans la zone, aucun email parti`,
      ],
      action: "contacter un loueur à la main, le voyageur a reçu un refus",
      due: echeance(0),
      url: `${siteBase()}/admin/car-rental`,
    });

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

  // Au moins une offre de grille : la demande est déjà devis reçu, le voyageur
  // part directement sur sa page d'offres.
  const locale = row.locale ?? "en";
  let offerUrl: string | undefined;
  if (catalogueNames.length > 0) {
    // Les offres existent : un statut non écrit ne doit jamais coûter un 500 au
    // voyageur, mais il doit sonner (sinon cron/car-no-quote lui écrit « pas de devis »).
    try {
      const { error: stErr } = await supabase.from("car_requests").update({ status: "quoted" }).eq("id", requestId);
      assertWritten("car_requests.update quoted", requestId, stErr);
    } catch (e) {
      console.error("[car-rental/submit] status quoted not written:", e);
      void notifyOps({
        title: "Statut 'quoted' non écrit",
        lines: [`demande ${requestId} · ${row.customer_email}`, "des offres de grille existent mais la demande est restée 'sent'"],
        action: "passer la demande en quoted à la main",
        due: echeance(0),
        url: `${siteBase()}/admin/car-rental`,
      });
    }
    offerUrl = `${siteBase()}/${locale}/car-offer/${clientToken}`;
  }

  // L'email recap a Kami existait deja, mais un email se noie : une demande
  // entrante est exactement ce que le canal ACTION doit porter.
  void notifyOps({
    title: "Demande voiture entrante",
    lines: [
      `${lead.pickupLabel} · ${lead.dateFrom} au ${lead.dateTo} · ${lead.carTypeLabel}`,
      `${row.customer_name || "client"} · ${row.customer_email}`,
      `${catalogueNames.length} offre(s) de grille, ${sentNames.length} demande(s) de devis`,
      ...(sentNames.length > 0 ? [`${sentNames.length} loueur(s) sollicité(s) : ${sentNames.slice(0, 4).join(", ")}`] : []),
      ...(catalogueNames.length > 0 ? [`offres de grille : ${catalogueNames.slice(0, 4).join(", ")}`] : []),
    ],
    action: sentNames.length > 0
      ? "rien pour l'instant, les devis arrivent. Relancer si silence à J+2"
      : "rien, le voyageur a reçu ses offres de grille",
    due: echeance(sentNames.length > 0 ? 2 : 1),
    url: `${siteBase()}/admin/car-rental`,
  });

  if (sentNames.length > 0) await sendLeadKamiSummary(lead, sentNames);
  if (catalogueNames.length > 0) {
    try {
      await sendCustomerNewOffer({
        email: row.customer_email, locale, customerName: row.customer_name,
        offersUrl: offerUrl!, pickupLabel: lead.pickupLabel,
      });
    } catch (e) { console.error("[car-rental/submit] new offer email failed:", e); }
  }
  if (sentNames.length > 0) {
    try {
      await sendCustomerRequestReceived({
        email: row.customer_email, locale: row.locale,
        customerName: row.customer_name,
        request: { pickupLabel: lead.pickupLabel, dateFrom: lead.dateFrom, dateTo: lead.dateTo, carTypeLabel: lead.carTypeLabel },
        noAgency: false,
      });
    } catch (e) { console.error("[car-rental/submit] ack email failed:", e); }
  }
  return NextResponse.json(offerUrl ? { ok: true, offerUrl } : { ok: true });
}
