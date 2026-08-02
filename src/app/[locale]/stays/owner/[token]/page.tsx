// /stays/owner/[token] : espace du propriétaire.
//
// Page privée servie par jeton, donc noindex de façon PERMANENTE. Une future
// levée globale du noindex sur /stays (lot B, task 12) ne doit pas l'emporter :
// cette page expose les coordonnées des voyageurs et les revenus.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getOwnerByTokenHash, listingsForOwner, availabilityForListing } from "@/lib/stays/db";
import { hashToken, siteBase } from "@/lib/stays/tokens";
import { ownerEarnings, upcomingArrivals, calendarNights } from "@/lib/stays/owner-view";
import { L, pickStaysLocale } from "../../content";
import OwnerPanel from "./OwnerPanel";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OwnerPage(
  { params }: { params: Promise<{ locale: string; token: string }> },
) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const owner = await getOwnerByTokenHash(hashToken(token));
  if (!owner) notFound();

  const listings = await listingsForOwner(owner.id);
  const ids = listings.map((l) => l.id);

  const { data: requests } = await supabaseAdmin
    .from("stay_requests")
    .select("id, listing_id, guest_name, guest_email, guest_phone, date_from, date_to, status, quoted_price_eur")
    .in("listing_id", ids.length ? ids : [-1])
    .order("date_from", { ascending: true })
    .limit(200);

  const rows = requests ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const nights: Record<number, ReturnType<typeof calendarNights>> = {};
  for (const l of listings) {
    nights[l.id] = calendarNights(await availabilityForListing(l.id));
  }

  return (
    <OwnerPanel
      token={token}
      ownerName={owner.name ?? ""}
      listings={listings.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title ?? l.slug,
        basePriceEur: Number(l.base_price_eur) || 0,
        cleaningFeeEur: Number(l.cleaning_fee_eur) || 0,
        minNights: Number(l.min_nights) || 1,
        published: l.status === "published",
        icalExportUrl: `${siteBase()}/api/stays/ical/${l.slug}`,
      }))}
      arrivals={upcomingArrivals(rows, today)}
      earnings={ownerEarnings(rows, listings)}
      nights={nights}
      t={L[pickStaysLocale(locale)].owner}
    />
  );
}
