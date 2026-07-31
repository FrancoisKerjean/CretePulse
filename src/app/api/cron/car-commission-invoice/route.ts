// Facturation automatique de la commission au premier jour de location.
// Remplace le clic « louée » du back-office comme declencheur : celui-ci reste
// disponible et emprunte exactement le meme chemin.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { assertCron } from "@/lib/cron-auth";
import { isInvoiceable, invoiceAmounts, type InvoiceCandidate } from "@/lib/car-invoice";
import { requestCommission } from "@/lib/car-commission-server";

export const dynamic = "force-dynamic";

/**
 * Borne de mise en service. SANS ELLE le premier tir rattrape tout
 * l historique et refacture des locations deja facturees a la main.
 * Ne jamais la reculer.
 */
const START = process.env.COMMISSION_INVOICING_START || "2026-08-05";

/**
 * Garde d armement, testee ICI et pas seulement dans requestCommission.
 * Un interrupteur qui protege deux appelants doit etre verifie par chacun, et
 * un systeme desarme n ecrit RIEN, pas meme un champ d etat.
 */
function enabled(): boolean {
  return process.env.CAR_COMMISSION_ENABLED === "on";
}

export async function GET(request: NextRequest) {
  const denied = assertCron(request);
  if (denied) return denied;
  if (!enabled()) return NextResponse.json({ disabled: true });

  // 05:00 UTC = 08:00 a Athenes : meme jour civil des deux cotes. Deplacer ce
  // cron en soiree UTC facturerait un jour trop tot cote grec.
  const today = new Date().toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("car_requests")
    .select(
      "id, accepted_at, outcome, date_from, booking_paid_at, quoted_by_partner_id, quoted_price",
    )
    .not("accepted_at", "is", null)
    .is("outcome", null)
    .is("booking_paid_at", null)
    .lte("date_from", today)
    .gte("date_from", START);

  let invoiced = 0;
  // Un identifiant nu ne dit pas POURQUOI la ligne est sortie du lot, et trois
  // causes tres differentes s y melangeaient. Chaque rejet porte donc son motif,
  // stable et lisible sans relire la base.
  const skipped: Array<{ id: number; reason: string }> = [];

  for (const row of (rows ?? []) as InvoiceCandidate[]) {
    if (!isInvoiceable(row, today, START)) continue;

    // Deja facturee ET envoyee : on passe. Le NOT EXISTS ne s exprime pas cote
    // PostgREST, il se fait ici. C est le vrai filtre d idempotence, car
    // `commission_requested_at` ne peut pas l etre : releaseLock() le remet a NULL.
    const { data: already } = await supabase
      .from("car_commission_invoices")
      .select("id, sent_at")
      .eq("request_id", row.id)
      .maybeSingle();
    if (already?.sent_at) continue;

    const { data: partner } = await supabase
      .from("car_partners")
      .select("commission")
      .eq("id", row.quoted_by_partner_id as number)
      .maybeSingle();
    if (!partner) { skipped.push({ id: row.id, reason: "partner_not_found" }); continue; }

    // Un taux absent devient 0 en passant par Number(), et une commission de 0
    // tombe sous le minimum Stripe : le loueur sans taux configure partait donc
    // en « below_minimum » et se lisait comme une toute petite location. Les deux
    // causes n appellent pas la meme main, elles ne partagent plus le meme motif.
    const rate = Number(partner.commission);
    if (!Number.isFinite(rate) || rate <= 0) {
      skipped.push({ id: row.id, reason: "no_commission_rate" });
      continue;
    }

    const amounts = invoiceAmounts(row.quoted_price as number, rate);
    if (!amounts) { skipped.push({ id: row.id, reason: "below_minimum" }); continue; }

    // Bascule AVANT l appel : shouldRequestCommission exige outcome === "rented".
    await supabase
      .from("car_requests")
      .update({
        outcome: "rented",
        outcome_at: new Date().toISOString(),
        final_amount_eur: amounts.base,
        commission_eur: amounts.amount,
      })
      .eq("id", row.id)
      .select();

    const res = await requestCommission(row.id);
    if (res.status === "requested") invoiced += 1;
    else {
      // Le code d echec REEL, pas un « ca n a pas marche » : c est lui qui
      // separe un email refuse par Resend d un loueur sans adresse.
      const detail = res.status === "failed" ? res.code : res.status;
      skipped.push({ id: row.id, reason: `commission_failed:${detail}` });
    }
  }

  return NextResponse.json({ invoiced, skipped, today, start: START });
}
