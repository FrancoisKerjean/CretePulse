import { NextRequest, NextResponse } from "next/server";
import { getListingBySlug, publishListing } from "@/lib/stays/db";
import { syncListingFromIcal } from "@/lib/stays/ical-apply";
import { ensureOwnerToken, ownerSpaceUrl } from "@/lib/stays/owner-tokens";
import { sendOwnerWelcome } from "@/lib/stays/emails";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { siteBase } from "@/lib/stays/tokens";
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

  // Accueil du proprietaire : son espace n'existe que s'il en recoit le lien.
  // Le jeton est cree une seule fois ; une republication ne le regenere pas et
  // ne renvoie donc pas d'email, ce qui evite de perimer un lien deja garde.
  const locale = typeof body.locale === "string" ? body.locale : "en";
  let spaceUrl: string | null = null;
  try {
    const ownerToken = await ensureOwnerToken(listing.owner_id);
    if (ownerToken) {
      spaceUrl = ownerSpaceUrl(ownerToken, locale);
      const { data: owner } = await supabaseAdmin
        .from("stay_owners")
        .select("name, email")
        .eq("id", listing.owner_id)
        .maybeSingle();
      if (owner?.email) {
        await sendOwnerWelcome(
          owner.email,
          {
            ownerName: owner.name ?? "",
            listingTitle: listing.title ?? slug,
            spaceUrl,
            icalExportUrl: `${siteBase()}/api/stays/ical/${slug}`,
          },
          locale,
        );
      }
    }
  } catch (e) {
    // L'annonce est publiee : un accueil rate ne doit pas la faire echouer.
    console.error("[stays/publish] accueil proprietaire echoue", { listingId: listing.id, error: e });
  }

  return NextResponse.json({ ok: true, status: "published", sync, spaceUrl });
}
