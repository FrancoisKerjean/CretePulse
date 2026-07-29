// Resynchronisation quotidienne des flux iCal des proprietaires.
//
// La publication ecrit les nuits OTA une fois ; ce cron les tient a jour. Sans
// lui, un proprietaire qui recoit une reservation sur Airbnb apres sa
// publication resterait disponible sur crete.direct pour les memes nuits.
//
// Une annonce en echec n'arrete jamais la passe : un flux injoignable est frequent
// (URL revoquee, OTA en panne) et ne doit pas priver les autres de leur synchro.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncListingFromIcal } from "@/lib/stays/ical-apply";

interface Row {
  id: number;
  slug: string;
  ical_private_url: string | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("stay_listings")
    .select("id, slug, ical_private_url")
    .eq("status", "published")
    .not("ical_private_url", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let synced = 0;
  let failed = 0;

  for (const row of (data ?? []) as unknown as Row[]) {
    if (!row.ical_private_url) continue;
    try {
      const res = await fetch(row.ical_private_url);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const text = await res.text();
      const result = await syncListingFromIcal(row.id, text);
      await supabaseAdmin
        .from("stay_listings")
        .update({
          // Trace de la derniere synchro reussie : un flux mort se repere a une
          // date qui n'avance plus.
          ical_sync_meta: { ...result, at: new Date().toISOString() },
        })
        .eq("id", row.id);
      synced++;
    } catch (e) {
      console.error("[cron/stays-ical] synchronisation echouee", {
        listingId: row.id,
        slug: row.slug,
        error: e instanceof Error ? e.message : String(e),
      });
      failed++;
    }
  }

  return NextResponse.json({ ok: true, synced, failed });
}
