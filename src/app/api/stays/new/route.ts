import { NextRequest, NextResponse } from "next/server";
import { scrapeAirbnbUrl } from "@/lib/stays/airbnb-scrape";
import { upsertOwnerByEmail, createDraftListing, slugify } from "@/lib/stays/db";
import { randomUUID } from "node:crypto";
import { newToken, hashToken } from "@/lib/stays/tokens";
import { pickEmailLocale } from "@/lib/stays/emails";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));

  if (body.website && String(body.website).trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const airbnbUrl = typeof body.airbnbUrl === "string" ? body.airbnbUrl.trim() : "";
  const ownerEmail =
    typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  if (!/^https?:\/\/.+airbnb\./i.test(airbnbUrl) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 422 });
  }

  const scrape = await scrapeAirbnbUrl(airbnbUrl);
  // La langue de la page ou il depose son annonce est celle de tous ses emails,
  // a commencer par l'accueil envoye a la publication.
  const owner = await upsertOwnerByEmail(
    ownerEmail,
    typeof body.ownerName === "string" ? body.ownerName : null,
    typeof body.ownerPhone === "string" ? body.ownerPhone : null,
    pickEmailLocale(typeof body.locale === "string" ? body.locale : null),
  );

  const title = scrape.data.title ?? (typeof body.title === "string" ? body.title : "Logement");
  const slug = slugify(title, randomUUID().slice(0, 6));

  const publishToken = newToken();

  const listing = await createDraftListing({
    owner_id: owner.id,
    slug,
    airbnb_id: scrape.data.airbnbId,
    airbnb_url: airbnbUrl,
    title,
    description: scrape.data.description ?? null,
    photos: scrape.data.photos ?? [],
    base_price_eur: Number(body.basePriceEur) > 0 ? Number(body.basePriceEur) : 0,
    cleaning_fee_eur: Number(body.cleaningFeeEur) > 0 ? Number(body.cleaningFeeEur) : 0,
    min_nights: Number(body.minNights) > 0 ? Number(body.minNights) : 1,
    publish_token_hash: hashToken(publishToken),
  });

  return NextResponse.json({ ok: true, slug: listing.slug, scraped: scrape.ok, publishToken });
}
