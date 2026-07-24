// /api/swim-near?lat=..&lng=..&locale=.. : les 3 meilleures plages du moment
// autour d'une position (rayon 25 km, repli plus-proches). Réutilise le scoring
// complet de buildSwimToday (météo 10 villes + orientation + abri) et re-trie
// par position via pickSwimNear. Cache CDN 30 min : le client arrondit sa
// position à 0.05° dans l'URL pour rester cacheable (cf NowPanel).
// Spec : docs/superpowers/specs/2026-07-10-swim-near-design.md
import { NextResponse } from "next/server";
import { buildSwimToday } from "@/lib/swim-today";
import { pickSwimNear } from "@/lib/swim-near";
import { getLocalizedField, type Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
};

const BASE_LOCALES = new Set(["en", "fr", "de", "el"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const raw = url.searchParams.get("locale") ?? "en";
  const locale = (BASE_LOCALES.has(raw) ? raw : "en") as Locale;
  // Borné à la Crète élargie, comme nearest-stop : hors bornes = pas de calcul.
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 34 || lat > 36.2 || lng < 23 || lng > 27) {
    return NextResponse.json({ beaches: [] }, { status: 422 });
  }
  const st = await buildSwimToday();
  if (!st) {
    return NextResponse.json({ error: "no_weather" }, { status: 503 });
  }
  const items = st.scored.map((s) => ({
    slug: s.beach.slug,
    name: getLocalizedField(s.beach, "name", locale),
    score: s.score,
    rating: s.rating,
    lat: s.beach.latitude,
    lng: s.beach.longitude,
  }));
  const beaches = pickSwimNear(items, { lat, lon: lng });
  return NextResponse.json({ beaches }, { headers: CACHE_HEADERS });
}
