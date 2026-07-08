import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";
import { partnerById } from "@/lib/car-partners-db";
import { canPartnerQuote, normalizeQuoteOptions, normalizeQuoteOption, bestOption } from "@/lib/car-quotes";

// Un loueur soumet son prix (page /car-quote/{token}). Modèle multi-devis : le
// devis est écrit sur l'invite de CE loueur (pas de course, pas de gagnant
// unique), puis le client est notifié qu'une nouvelle offre est disponible.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const decline = new URL(request.url).searchParams.get("decline") === "1";

  const { data: invite } = await supabase.from("car_quote_invites")
    .select("request_id, partner_id")
    .eq("quote_token_hash", hashToken(token))
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: req } = await supabase.from("car_requests")
    .select("id, status, locale, pickup_slug, date_from, date_to, car_type, customer_name, customer_email")
    .eq("id", invite.request_id).maybeSingle();
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canPartnerQuote(req.status)) return NextResponse.json({ ok: true, already: true });

  // Désistement loueur : « je ne peux pas répondre à cette demande ». Pas de prix
  // requis. L'invite passe 'declined' → plus relancée, absente des offres client.
  if (decline) {
    await supabase.from("car_quote_invites").update({
      status: "declined", declined_at: new Date().toISOString(),
    }).eq("request_id", req.id).eq("partner_id", invite.partner_id);
    return NextResponse.json({ ok: true, declined: true });
  }

  // Multi-offres : le loueur peut envoyer plusieurs variantes (options). Rétro-
  // compat : un ancien client mono-offre ({price, carModel, inclusions}) → 1 option.
  let options = normalizeQuoteOptions(body.options);
  if (options.length === 0) {
    const single = normalizeQuoteOption(body);
    if (single) options = [single];
  }
  if (options.length === 0) {
    return NextResponse.json({ error: "Invalid price" }, { status: 422 });
  }

  const partner = await partnerById(invite.partner_id);
  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

  // Charge l'ID de l'invite (le loueur peut renvoyer : on remplace ses options).
  const { data: inviteRow } = await supabase.from("car_quote_invites")
    .select("id").eq("request_id", req.id).eq("partner_id", invite.partner_id).maybeSingle();
  if (!inviteRow) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  // Re-soumission : on efface les anciennes options de CE loueur puis on insère
  // les nouvelles (source des offres présentées au client).
  await supabase.from("car_quote_options").delete().eq("invite_id", inviteRow.id);
  const { error: optErr } = await supabase.from("car_quote_options").insert(
    options.map((o) => ({
      invite_id: inviteRow.id, request_id: req.id, partner_id: invite.partner_id,
      price: o.price, currency: "EUR", car_model: o.car_model, gearbox: o.gearbox, inclusions: o.inclusions,
    })),
  );
  if (optErr) {
    console.error("[car-rental/quote] save options error:", optErr.message);
    return NextResponse.json({ error: "Could not save quote" }, { status: 500 });
  }

  // Snapshot de la MEILLEURE option sur l'invite → cockpit / commissions /
  // relances / expiry existants (qui lisent quote_price) tournent sans réécriture.
  const best = bestOption(options)!;
  const { error: upErr } = await supabase.from("car_quote_invites").update({
    status: "quoted", quote_price: best.price, quote_currency: "EUR",
    quote_car_model: best.car_model, quote_inclusions: best.inclusions,
    quoted_at: new Date().toISOString(),
  }).eq("request_id", req.id).eq("partner_id", invite.partner_id);
  if (upErr) {
    console.error("[car-rental/quote] save quote error:", upErr.message);
    return NextResponse.json({ error: "Could not save quote" }, { status: 500 });
  }

  // 1er devis reçu -> la demande passe 'quoted' (pour l'admin + les relances).
  if (req.status === "sent") {
    await supabase.from("car_requests").update({ status: "quoted" }).eq("id", req.id).eq("status", "sent");
  }

  // Notifie le client. Le token client est rotationné (le clair n'est pas
  // récupérable depuis le hash stocké) : nouveau token -> hash en base, clair
  // dans l'email. Seul le dernier email « nouvelle offre » porte le lien valide.
  const clientToken = newToken();
  await supabase.from("car_requests").update({ accept_token_hash: hashToken(clientToken) }).eq("id", req.id);

  const locale = req.locale || "en";
  try {
    const { sendCustomerNewOffer } = await import("@/lib/email");
    await sendCustomerNewOffer({
      email: req.customer_email, locale, customerName: req.customer_name,
      offersUrl: `${siteBase()}/${locale}/car-offer/${clientToken}`,
      pickupLabel: carPickupLabel(req.pickup_slug),
    });
  } catch (e) {
    console.error("[car-rental/quote] customer notify error:", e);
    return NextResponse.json({ ok: true, emailFailed: true });
  }
  return NextResponse.json({ ok: true });
}
