import { getListingBySlug, bookedRangesForListing } from "@/lib/stays/db";
import { buildIcalExport } from "@/lib/stays/ical";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const listing = await getListingBySlug(token);
  if (!listing) return new Response("Not found", { status: 404 });

  const ranges = await bookedRangesForListing(listing.id);
  const ics = buildIcalExport(listing.slug, ranges);
  return new Response(ics, {
    status: 200,
    headers: { "content-type": "text/calendar; charset=utf-8" },
  });
}
