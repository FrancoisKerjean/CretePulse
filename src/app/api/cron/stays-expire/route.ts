// Expiration des demandes restees sans reponse du proprietaire.
//
// Le statut `expired` existait en base et n'etait jamais pose : une demande
// pouvait rester en attente indefiniment, et le voyageur n'apprenait jamais que
// personne ne lui repondrait.
//
// Le delai vaut 7 jours, exactement ce que l'accuse de reception annonce. Les
// deux doivent bouger ensemble : promettre un delai qu'on ne tient pas est pire
// que ne rien promettre.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendGuestExpired } from "@/lib/stays/emails";

export const EXPIRY_DAYS = 7;

interface Row {
  id: number;
  listing_id: number;
  guest_email: string;
  date_from: string;
  date_to: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - EXPIRY_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("stay_requests")
    .select("id, listing_id, guest_email, date_from, date_to")
    .eq("status", "pending")
    .lt("created_at", cutoff);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let expired = 0;

  for (const row of (data ?? []) as unknown as Row[]) {
    const { error: dbError } = await supabaseAdmin
      .from("stay_requests")
      .update({
        status: "expired",
        // Le lien d'acceptation meurt avec la demande : sans cela le
        // proprietaire pourrait accepter un sejour dont le voyageur vient
        // d'apprendre le contraire.
        approve_token_hash: null,
      })
      .eq("id", row.id);
    if (dbError) {
      console.error("[cron/stays-expire] expiration echouee", { requestId: row.id, error: dbError.message });
      continue;
    }
    expired++;

    try {
      const { data: listing } = await supabaseAdmin
        .from("stay_listings")
        .select("title")
        .eq("id", row.listing_id)
        .maybeSingle();
      await sendGuestExpired(row.guest_email, {
        listingTitle: listing?.title ?? "votre séjour",
        dateFrom: row.date_from,
        dateTo: row.date_to,
      });
    } catch (e) {
      // L'etat en base prime sur la notification : la demande EST expiree, un
      // email refuse ne doit pas empecher les suivantes.
      console.error("[cron/stays-expire] email d expiration echoue", { requestId: row.id, error: e });
    }
  }

  return NextResponse.json({ ok: true, expired });
}
