import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { partnerById } from "@/lib/car-partners-db";
import { isOfferExpired } from "@/lib/car-offer-expiry";
import { requestByClientToken } from "@/lib/car-quotes-db";
import { findChosenInvite } from "@/lib/car-quotes";

// Le client choisit une offre (page /car-offer/{token}). Il désigne l'invite
// (invite_id) qu'il retient ; on snapshot son devis sur car_requests
// (retro-compat admin/commissions) et on met client + loueur choisi en relation.
// Les autres devis passent 'not_chosen'.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const decline = new URL(request.url).searchParams.get("decline") === "1";

  const found = await requestByClientToken(token);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { request: row, quotes } = found;
  if (row.status === "accepted") return NextResponse.json({ ok: true, already: true });
  if (row.status === "declined_by_client") return NextResponse.json({ ok: true, declined: true });

  // Désistement client : « aucune de ces offres ne me convient ». La demande se
  // ferme, les relances client s'arrêtent, les devis passent 'not_chosen' — mais
  // PAS d'email « pas retenu » aux loueurs (on n'ennuie pas sur un décline global).
  if (decline) {
    await supabase.from("car_requests").update({
      status: "declined_by_client", accept_token_hash: null,
    }).eq("id", row.id);
    await supabase.from("car_quote_invites").update({ status: "not_chosen" })
      .eq("request_id", row.id).eq("status", "quoted");
    return NextResponse.json({ ok: true, declined: true });
  }

  const inviteId = typeof body.invite_id === "number" ? body.invite_id : Number(body.invite_id);
  if (!Number.isFinite(inviteId)) return NextResponse.json({ error: "Missing invite" }, { status: 400 });

  const chosen = findChosenInvite(quotes, inviteId);
  if (!chosen) return NextResponse.json({ error: "No quote for this invite" }, { status: 409 });
  if (isOfferExpired(chosen.quoted_at, row.date_from as string, Date.now())) {
    return NextResponse.json({ ok: false, expired: true }, { status: 410 });
  }

  const partner = await partnerById(chosen.partner_id);
  await supabase.from("car_requests").update({
    status: "accepted", accepted_at: new Date().toISOString(), accept_token_hash: null,
    quoted_price: chosen.quote_price, quoted_currency: chosen.quote_currency ?? "EUR",
    quoted_car_model: chosen.quote_car_model ?? null, quoted_inclusions: chosen.quote_inclusions ?? [],
    quoted_at: chosen.quoted_at, quoted_by_partner_id: chosen.partner_id,
    partner_name: partner?.name ?? chosen.partner_name, partner_email: partner?.email ?? null,
  }).eq("id", row.id);
  await supabase.from("car_quote_invites").update({ status: "chosen" }).eq("id", inviteId);
  await supabase.from("car_quote_invites").update({ status: "not_chosen" })
    .eq("request_id", row.id).eq("status", "quoted").neq("id", inviteId);

  const locale = (row.locale as string) || "en";
  const ct = CAR_TYPES_DATA.find((c) => c.id === row.car_type);
  const carTypeLabel = ct?.labels[locale] ?? ct?.labels.en ?? (row.car_type as string);
  const days = Math.max(1, Math.round((new Date(row.date_to as string).getTime() - new Date(row.date_from as string).getTime()) / 86400000));
  const partnerName = partner?.name ?? chosen.partner_name;

  try {
    const { sendConnectionEmails, sendPartnerNotChosen } = await import("@/lib/email");
    await sendConnectionEmails({
      partner: { name: partnerName, email: partner?.email ?? "", phone: partner?.phone ?? "", whatsapp: partner?.whatsapp ?? undefined },
      customer: { name: row.customer_name as string, email: row.customer_email as string, phone: (row.customer_phone as string | null) ?? undefined, locale },
      quote: {
        pickupLabel: carPickupLabel(row.pickup_slug as string), dateFrom: row.date_from as string, dateTo: row.date_to as string,
        carTypeLabel, price: chosen.quote_price as number, currency: chosen.quote_currency ?? "EUR",
        partnerName, carModel: chosen.quote_car_model ?? null,
        inclusions: Array.isArray(chosen.quote_inclusions) ? chosen.quote_inclusions : [], days,
      },
    });
    const losers = quotes.filter((qq) => qq.id !== inviteId && qq.quote_price != null);
    for (const l of losers) {
      const p = await partnerById(l.partner_id);
      if (p?.email) await sendPartnerNotChosen(p.email, p.name);
    }
  } catch (e) {
    console.error("[car-rental/accept] email error:", e);
    return NextResponse.json({ ok: true, emailFailed: true });
  }
  return NextResponse.json({ ok: true });
}
