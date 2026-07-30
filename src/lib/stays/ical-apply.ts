// Application du diff iCal a la base. Separe de `ical-sync.ts`, qui reste pur :
// ici on lit et on ecrit, la regle vit la-bas.
//
// Appele a la publication d'une annonce et par le cron de resynchronisation.
import { supabaseAdmin } from "../supabase-admin";
import { parseICalText } from "./ical";
import { diffOtaNights, type NightState } from "./ical-sync";

export interface SyncResult {
  blocked: number;
  released: number;
}

/**
 * Aligne les nuits `blocked_ota` d'une annonce sur son flux iCal.
 * Ne touche jamais une nuit `booked` ni `hold` : la regle est dans diffOtaNights.
 */
export async function syncListingFromIcal(
  listingId: number,
  icalText: string,
): Promise<SyncResult> {
  const feed = parseICalText(icalText);

  const { data } = await supabaseAdmin
    .from("stay_availability")
    .select("date, status")
    .eq("listing_id", listingId);

  const current = (data ?? []) as NightState[];
  const { toBlock, toRelease } = diffOtaNights(feed, current);

  if (toBlock.length > 0) {
    await supabaseAdmin.from("stay_availability").upsert(
      toBlock.map((date) => ({
        listing_id: listingId,
        date,
        status: "blocked_ota",
        source: "ical",
      })),
      { onConflict: "listing_id,date" },
    );
  }

  if (toRelease.length > 0) {
    // Suppression restreinte au statut `blocked_ota` : double garde, en plus de
    // celle du diff. Une nuit vendue ne peut pas disparaitre par accident.
    await supabaseAdmin
      .from("stay_availability")
      .delete()
      .eq("listing_id", listingId)
      .eq("status", "blocked_ota")
      .in("date", toRelease);
  }

  return { blocked: toBlock.length, released: toRelease.length };
}
