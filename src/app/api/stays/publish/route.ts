import { NextRequest, NextResponse } from "next/server";
import { getListingBySlug, publishListing } from "@/lib/stays/db";
import { parseICalText } from "@/lib/stays/ical";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const icalUrl = typeof body.icalUrl === "string" ? body.icalUrl.trim() : "";

  if (!slug || !/^https?:\/\/.+/i.test(icalUrl) || !/\.ics|\/ical\//i.test(icalUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid iCal URL" }, { status: 422 });
  }

  const listing = await getListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  try {
    const res = await fetch(icalUrl);
    if (!res.ok) throw new Error("fetch failed");
    const text = await res.text();
    const events = parseICalText(text);
    void events;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not read the private iCal" },
      { status: 422 },
    );
  }

  await publishListing(listing.id, icalUrl);
  return NextResponse.json({ ok: true, status: "published" });
}
