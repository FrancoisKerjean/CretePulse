import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel, carTypeLabelWithExamples, resolveAcceptPhone } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { partnerById } from "@/lib/car-partners-db";
import { isOfferExpired } from "@/lib/car-offer-expiry";
import { requestByClientToken } from "@/lib/car-quotes-db";
import { rentalDays } from "@/lib/car-pricing";
import { findChosenOption, sortOptionsByPrice, quotedModelLabel } from "@/lib/car-quotes";
import { startBookingAfterAccept } from "@/lib/car-booking-server";

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

  // Le numéro de rappel se joue ICI, avant toute écriture : accepter sans lui
  // produit exactement la demande 33 (Zakros Tours, 9 jours de silence, le
  // loueur réduit à un email vers un inconnu qui part en spam).
  const phoneResolu = resolveAcceptPhone(row.customer_phone as string | null, typeof body.phone === "string" ? body.phone : undefined);
  if (!phoneResolu.ok) {
    return NextResponse.json({ ok: false, phoneRequired: true }, { status: 422 });
  }

  const partner = await partnerById(chosen.partner_id);
  const gearboxLabel = chosen.gearbox ? GEARBOX_LABEL[chosen.gearbox] : null;
  const carModelSnapshot = quotedModelLabel(chosen.car_model, gearboxLabel);
  await supabase.from("car_requests").update({
    status: "accepted", accepted_at: new Date().toISOString(), accept_token_hash: null,
    closure_reason: null, customer_phone: phoneResolu.phone,
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

  // Tunnel voyageur arme : on ouvre un paiement au lieu de mettre client et
  // loueur en relation. Les coordonnees ne partent qu'apres encaissement, sinon
  // le client aurait le numero du loueur et aucune raison de payer ici.
  // Desarme (defaut), startBookingAfterAccept rend null et le flux historique
  // continue sans rien changer.
  const booking = await startBookingAfterAccept(row.id as number, locale);
  if (booking) {
    return NextResponse.json({ ok: true, payUrl: booking.payUrl });
  }

  const ct = CAR_TYPES_DATA.find((c) => c.id === row.car_type);
  const carTypeLabel = carTypeLabelWithExamples(ct, "en", row.car_type as string);
  const carTypeLabelClient = carTypeLabelWithExamples(ct, locale, row.car_type as string);
  const days = rentalDays(
    row.date_from as string,
    row.date_to as string,
    row.time_from as string | null,
    row.time_to as string | null,
  );
  const partnerName = partner?.name ?? chosen.partner_name;
  // Les autres options que CE loueur avait envoyées sur cette demande. Luxtrans
  // le demande le 01/08 : il en envoie souvent 3, et l'email ne nommait que celle
  // retenue, ce qui l'obligeait à rouvrir son historique pour la situer.
  const partnerOtherOptions = sortOptionsByPrice(options)
    .filter((o) => o.partner_id === chosen.partner_id && o.id !== chosen.id)
    .map((o) => ({
      price: o.price,
      currency: o.currency ?? "EUR",
      carModel: quotedModelLabel(o.car_model, o.gearbox ? GEARBOX_LABEL[o.gearbox] : null),
    }));

  try {
    const { sendConnectionEmails } = await import("@/lib/email");
    await sendConnectionEmails({
      partner: { name: partnerName, email: partner?.email ?? "", phone: partner?.phone ?? "", whatsapp: partner?.whatsapp ?? undefined },
      // ⛔ phoneResolu.phone, PAS row.customer_phone : `row` est le snapshot lu
      // AVANT l'update, donc il vaut encore null quand le client vient tout
      // juste de saisir son numero. Le loueur recevrait « - » sur exactement
      // les conversions que ce champ etait cense couvrir.
      customer: { name: row.customer_name as string, email: row.customer_email as string, phone: phoneResolu.phone, locale },
      quote: {
        pickupLabel: carPickupLabel(row.pickup_slug as string), dateFrom: row.date_from as string, dateTo: row.date_to as string,
        carTypeLabel, carTypeLabelClient, price: chosen.price, currency: chosen.currency ?? "EUR",
        partnerName, carModel: carModelSnapshot, gearboxLabel,
        inclusions: Array.isArray(chosen.inclusions) ? chosen.inclusions : [],
        insuranceType: chosen.insurance_type, excessEur: chosen.excess_eur, zeroExcessUpsellEurDay: chosen.zero_excess_upsell_eur_day,
        days,
        partnerOtherOptions,
      },
    });
  } catch (e) {
    console.error("[car-rental/accept] email error:", e);
    return NextResponse.json({ ok: true, emailFailed: true });
  }
  return NextResponse.json({ ok: true });
}
