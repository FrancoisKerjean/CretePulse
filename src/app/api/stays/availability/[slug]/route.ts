// Disponibilite publique d'une annonce. Sert le calendrier de la fiche et permet a
// un proprietaire de verifier ce que voit un voyageur. Aucune donnee personnelle :
// on ne renvoie que des dates.
import { NextResponse } from "next/server";
import { getListingBySlug, bookedRangesForListing } from "@/lib/stays/db";
import { unavailableNights } from "@/lib/stays/availability";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await context.params;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "published") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const booked = await bookedRangesForListing(listing.id);
  return NextResponse.json(
    {
      ok: true,
      unavailable: unavailableNights(booked),
      minNights: Number(listing.min_nights) || 1,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
