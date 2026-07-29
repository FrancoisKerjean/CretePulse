// Demande du solde 70 % a J-14 de l'arrivee. Une demande par sejour, jamais deux :
// c'est `balance_requested_at` qui fait office de verrou.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendGuestBalanceDue, pickEmailLocale, fallbackListingTitle } from "@/lib/stays/emails";
import { newToken, hashToken, siteBase } from "@/lib/stays/tokens";
import { assertCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/** Fenetre de demande du solde, en jours avant l'arrivee. */
const BALANCE_LEAD_DAYS = 14;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = assertCron(request);
  if (denied) return denied;

  const cutoff = new Date(Date.now() + BALANCE_LEAD_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const { data } = await supabaseAdmin
    .from("stay_requests")
    .select("id, guest_email, listing_id, date_from, balance_amount, locale")
    .eq("status", "deposit_paid")
    .is("balance_requested_at", null)
    .lte("date_from", cutoff);

  const rows = data ?? [];
  let sent = 0;

  for (const r of rows) {
    const token = newToken();
    const { data: listing } = await supabaseAdmin
      .from("stay_listings")
      .select("title")
      .eq("id", r.listing_id)
      .maybeSingle();

    // Le verrou est pose AVANT l'envoi : si l'email echoue, on prefere un solde non
    // demande, rattrapable a la main, a une relance quotidienne en boucle.
    await supabaseAdmin
      .from("stay_requests")
      .update({
        balance_token_hash: hashToken(token),
        balance_requested_at: new Date().toISOString(),
      })
      .eq("id", r.id);

    // La langue du voyageur porte l'email ET la page de paiement du solde : le
    // dernier geste du tunnel est aussi celui ou l'argent arrive.
    const locale = pickEmailLocale(r.locale ?? null);
    await sendGuestBalanceDue(
      r.guest_email,
      {
        listingTitle: listing?.title ?? fallbackListingTitle(locale),
        dateFrom: r.date_from,
        amountEur: Number(r.balance_amount) || 0,
        payUrl: `${siteBase()}/${locale}/stays/balance/${token}`,
      },
      locale,
    );
    sent++;
  }

  return NextResponse.json({ ok: true, candidates: rows.length, sent });
}
