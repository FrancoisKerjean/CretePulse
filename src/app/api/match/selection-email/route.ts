import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendSelectionEmail, type SelectionPlace } from "@/lib/email";
import { typeLabel } from "@/lib/cb-type-labels";

// Envoi de la sélection Match Swipe par email (V1.2).
// Anti-abus : honeypot + validation stricte des slugs + cap 60 + les lieux
// doivent exister en base (un slug inventé est simplement ignoré).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9_-]+$/i;
const MAX_SLUGS = 60;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot : les bots remplissent ce champ, pas les humains.
  if (body.website && String(body.website).trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const locale = typeof body.locale === "string" && /^[a-z]{2}$/.test(body.locale) ? body.locale : "en";
  const slugs = Array.isArray(body.slugs)
    ? body.slugs.filter((s): s is string => typeof s === "string" && SLUG_REGEX.test(s)).slice(0, MAX_SLUGS)
    : [];

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 422 });
  }
  if (slugs.length === 0) {
    return NextResponse.json({ error: "Empty selection" }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("cb_places")
    .select("slug, name, place_type, latitude, longitude, photos")
    .in("slug", slugs);
  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "Selection not found" }, { status: 422 });
  }

  // Conserver l'ordre de la sélection du visiteur.
  const bySlug = new Map(data.map((p) => [p.slug, p]));
  const places: SelectionPlace[] = slugs
    .map((slug) => bySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      name: p.name,
      typeLabel: typeLabel(p.place_type, locale),
      exploreUrl: `${BASE_URL}/${locale}/explore?place=${p.slug}`,
      mapsUrl:
        p.latitude != null && p.longitude != null
          ? `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`
          : null,
      photoUrl: Array.isArray(p.photos) && p.photos.length > 0 ? (p.photos[0] as string) : null,
    }));

  try {
    await sendSelectionEmail(email, locale, places);
  } catch {
    return NextResponse.json({ error: "Email delivery failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, count: places.length });
}
