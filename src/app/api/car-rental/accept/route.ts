import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { partnerById } from "@/lib/car-partners-db";
import { isOfferExpired } from "@/lib/car-offer-expiry";
import { requestByClientToken } from "@/lib/car-quotes-db";
import { findChosenOption, sortOptionsByPrice } from "@/lib/car-quotes";

const GEARBOX_LABEL: Record<string, string> = { automatic: "Automatic", manual: "Manual" };

// Le client choisit une OFFRE précise (option) parmi toutes les variantes de
// tous les loueurs (page /car-offer/{token}). On snapshot cette option sur
// car_requests (retro-compat admin/commissions) et on met client + loueur choisi
// en relation. Les invites des autres loueurs passent 'not_chosen'.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const decline = new URL(request.url).searchParams.get("decline") === "1";

  const found = await requestByClientToken(token);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { request: row, options } = found;
  if (row.status === "accepted") return NextResponse.json({ ok: true, already: true });
  if (row.status === "declined_by_client") return NextResponse.json({ ok: true, declined: true });

  // Désistement client : « aucune de ces offres ne me convient ». La demande se
  // ferme et les relances client s'arrêtent. Pas d'email aux loueurs non retenus
  // (décision 11/07/2026 : notifications actionnables uniquement).
  if (decline) {
    await supabase.from("car_requests").update({
      status: "declined_by_client", accept_token_hash: null, closure_reason: "client_declined_all",
    }).eq("id", row.id);
    await supabase.from("car_quote_invites").update({ status: "not_chosen" })
      .eq("request_id", row.id).eq("status", "quoted");
    return NextResponse.json({ ok: true, declined: true });
  }

  // Nouveau flux : le client désigne une OPTION (option_id). Rétro-compat : un
  // ancien lien mono-offre poste invite_id → on prend la meilleure option de
  // cette invite.
  const optionId = typeof body.option_id === "number" ? body.option_id : Number(body.option_id);
  const inviteId = typeof body.invite_id === "number" ? body.invite_id : Number(body.invite_id);
  let chosen = Number.isFinite(optionId) ? findChosenOption(options, optionId) : null;
  if (!chosen && Number.isFinite(inviteId)) {
    chosen = sortOptionsByPrice(options.filter((o) => o.invite_id === inviteId))[0] ?? null;
  }
  if (!chosen) return NextResponse.json({ error: "No quote for this option" }, { status: 409 });
  if (isOfferExpired(chosen.created_at, row.date_from as string, Date.now())) {
    return NextResponse.json({ ok: false, expired: true }, { status: 410 });
  }

  const partner = await partnerById(chosen.partner_id);
  const gearboxLabel = chosen.gearbox ? GEARBOX_LABEL[chosen.gearbox] : null;
  const carModelSnapshot = [chosen.car_model, gearboxLabel].filter(Boolean).join(" · ") || null;
  await supabase.from("car_requests").update({
    status: "accepted", accepted_at: new Date().toISOString(), accept_token_hash: null,
    closure_reason: null,
    quoted_price: chosen.price, quoted_currency: chosen.currency ?? "EUR",
    quoted_car_model: carModelSnapshot, quoted_inclusions: chosen.inclusions ?? [],
    quoted_insurance_type: chosen.insurance_type, quoted_excess_eur: chosen.excess_eur,
    quoted_zero_excess_upsell_eur_day: chosen.zero_excess_upsell_eur_day,
    quoted_at: chosen.created_at, quoted_by_partner_id: chosen.partner_id,
    partner_name: partner?.name ?? chosen.partner_name, partner_email: partner?.email ?? null,
  }).eq("id", row.id);
  await supabase.from("car_quote_invites").update({ status: "chosen" }).eq("id", chosen.invite_id);
  await supabase.from("car_quote_invites").update({ status: "not_chosen" })
    .eq("request_id", row.id).eq("status", "quoted").neq("id", chosen.invite_id);

  const locale = (row.locale as string) || "en";
  const ct = CAR_TYPES_DATA.find((c) => c.id === row.car_type);
  const carTypeLabel = ct?.labels[locale] ?? ct?.labels.en ?? (row.car_type as string);
  const days = Math.max(1, Math.round((new Date(row.date_to as string).getTime() - new Date(row.date_from as string).getTime()) / 86400000));
  const partnerName = partner?.name ?? chosen.partner_name;

  try {
    const { sendConnectionEmails } = await import("@/lib/email");
    await sendConnectionEmails({
      partner: { name: partnerName, email: partner?.email ?? "", phone: partner?.phone ?? "", whatsapp: partner?.whatsapp ?? undefined },
      customer: { name: row.customer_name as string, email: row.customer_email as string, phone: (row.customer_phone as string | null) ?? undefined, locale },
      quote: {
        pickupLabel: carPickupLabel(row.pickup_slug as string), dateFrom: row.date_from as string, dateTo: row.date_to as string,
        carTypeLabel, price: chosen.price, currency: chosen.currency ?? "EUR",
        partnerName, carModel: carModelSnapshot,
        inclusions: Array.isArray(chosen.inclusions) ? chosen.inclusions : [],
        insuranceType: chosen.insurance_type, excessEur: chosen.excess_eur, zeroExcessUpsellEurDay: chosen.zero_excess_upsell_eur_day,
        days,
      },
    });
  } catch (e) {
    console.error("[car-rental/accept] email error:", e);
    return NextResponse.json({ ok: true, emailFailed: true });
  }
  return NextResponse.json({ ok: true });
}
