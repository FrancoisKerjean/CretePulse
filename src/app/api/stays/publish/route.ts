import { NextRequest, NextResponse } from "next/server";
import { getListingBySlug, publishListing } from "@/lib/stays/db";
import { syncListingFromIcal } from "@/lib/stays/ical-apply";
import { hashToken } from "@/lib/stays/tokens";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const icalUrl = typeof body.icalUrl === "string" ? body.icalUrl.trim() : "";
  const token = typeof body.token === "string" ? body.token : "";

  if (!slug || !/^https?:\/\/.+/i.test(icalUrl) || !/\.ics|\/ical\//i.test(icalUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid iCal URL" }, { status: 422 });
  }

  const listing = await getListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (!listing.publish_token_hash || hashToken(token) !== listing.publish_token_hash) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  let text: string;
  try {
    const res = await fetch(icalUrl);
    if (!res.ok) throw new Error("fetch failed");
    text = await res.text();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not read the private iCal" },
      { status: 422 },
    );
  }

  await publishListing(listing.id, icalUrl);

  // Le flux etait lu puis jete : une annonce publiee arrivait avec un calendrier
  // vide, et le proprietaire reste sur Airbnb louait deux fois les memes nuits.
  // On ecrit desormais les nuits OTA des la publication.
  let sync = { blocked: 0, released: 0 };
  try {
    sync = await syncListingFromIcal(listing.id, text);
  } catch (e) {
    // L'annonce est publiee, c'est un fait. Une synchro ratee se rattrape au
    // passage suivant du cron ; la faire echouer ici perdrait la publication.
    console.error("[stays/publish] synchronisation iCal echouee", { listingId: listing.id, error: e });
  }

  return NextResponse.json({ ok: true, status: "published", sync });
}
