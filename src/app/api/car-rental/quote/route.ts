import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";
import { partnerById } from "@/lib/car-partners-db";
import { isInclusionKey } from "@/lib/car-inclusions";
import { canPartnerQuote } from "@/lib/car-quotes";

// Un loueur soumet son prix (page /car-quote/{token}). Modèle multi-devis : le
// devis est écrit sur l'invite de CE loueur (pas de course, pas de gagnant
// unique), puis le client est notifié qu'une nouvelle offre est disponible.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const token = typeof body.token === "string" ? body.token : "";
  const price = typeof body.price === "number" ? body.price : Number(body.price);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0 || price > 100000) {
    return NextResponse.json({ error: "Invalid price" }, { status: 422 });
  }
  const carModel = typeof body.carModel === "string" && body.carModel.trim() ? body.carModel.trim().slice(0, 120) : null;
  const inclusions = Array.isArray(body.inclusions) ? body.inclusions.filter(isInclusionKey) : [];

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

  const partner = await partnerById(invite.partner_id);
  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

  // Écrit le devis sur l'invite de CE loueur.
  const { error: upErr } = await supabase.from("car_quote_invites").update({
    status: "quoted", quote_price: price, quote_currency: "EUR",
    quote_car_model: carModel, quote_inclusions: inclusions,
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
