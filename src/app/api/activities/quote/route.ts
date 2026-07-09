import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { categoryLabel, cityLabel } from "@/lib/activity-taxonomy";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";
import { partnerById } from "@/lib/activity-partners-db";
import { isActivityInclusionKey } from "@/lib/activity-inclusions";
import { canPartnerQuote } from "@/lib/activity-quotes";

// Un prestataire soumet son prix (page /activity-quote/{token}). Modèle multi-devis : le
// devis est écrit sur l'invite de CE prestataire (pas de course, pas de gagnant
// unique), puis le client est notifié qu'une nouvelle offre est disponible.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const decline = new URL(request.url).searchParams.get("decline") === "1";

  const { data: invite } = await supabase.from("activity_quote_invites")
    .select("request_id, partner_id")
    .eq("quote_token_hash", hashToken(token))
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: req } = await supabase.from("activity_requests")
    .select("id, status, locale, category_slug, city, activity_date, customer_name, customer_email")
    .eq("id", invite.request_id).maybeSingle();
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canPartnerQuote(req.status)) return NextResponse.json({ ok: true, already: true });

  // Désistement prestataire : « je ne peux pas répondre à cette demande ». Pas de prix
  // requis. L'invite passe 'declined' → plus relancée, absente des offres client.
  if (decline) {
    await supabase.from("activity_quote_invites").update({
      status: "declined", declined_at: new Date().toISOString(),
    }).eq("request_id", req.id).eq("partner_id", invite.partner_id);
    return NextResponse.json({ ok: true, declined: true });
  }

  const price = typeof body.price === "number" ? body.price : Number(body.price);
  if (!Number.isFinite(price) || price <= 0 || price > 100000) {
    return NextResponse.json({ error: "Invalid price" }, { status: 422 });
  }
  const details = typeof body.details === "string" && body.details.trim() ? body.details.trim().slice(0, 120) : null;
  const inclusions = Array.isArray(body.inclusions) ? body.inclusions.filter(isActivityInclusionKey) : [];

  const partner = await partnerById(invite.partner_id);
  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

  // Écrit le devis sur l'invite de CE prestataire.
  const { error: upErr } = await supabase.from("activity_quote_invites").update({
    status: "quoted", quote_price: price, quote_currency: "EUR",
    quote_details: details, quote_inclusions: inclusions,
    quoted_at: new Date().toISOString(),
  }).eq("request_id", req.id).eq("partner_id", invite.partner_id);
  if (upErr) {
    console.error("[activities/quote] save quote error:", upErr.message);
    return NextResponse.json({ error: "Could not save quote" }, { status: 500 });
  }

  // 1er devis reçu -> la demande passe 'quoted' (pour l'admin + les relances).
  if (req.status === "sent") {
    await supabase.from("activity_requests").update({ status: "quoted" }).eq("id", req.id).eq("status", "sent");
  }

  // Notifie le client. Le token client est rotationné (le clair n'est pas
  // récupérable depuis le hash stocké) : nouveau token -> hash en base, clair
  // dans l'email. Seul le dernier email « nouvelle offre » porte le lien valide.
  const clientToken = newToken();
  await supabase.from("activity_requests").update({ accept_token_hash: hashToken(clientToken) }).eq("id", req.id);

  const locale = req.locale || "en";
  try {
    const { sendActivityCustomerNewOffer } = await import("@/lib/email");
    await sendActivityCustomerNewOffer({
      email: req.customer_email, locale, customerName: req.customer_name,
      offersUrl: `${siteBase()}/${locale}/activity-offer/${clientToken}`,
      categoryLabel: categoryLabel(req.category_slug, locale),
      cityLabel: cityLabel(req.city, locale),
    });
  } catch (e) {
    console.error("[activities/quote] customer notify error:", e);
    return NextResponse.json({ ok: true, emailFailed: true });
  }
  return NextResponse.json({ ok: true });
}
