// Classement de baignade du moment, condensé par région, pour le bloc vivant
// du hub /beaches (qui reste en ISR 24 h : le live passe par ici). Réutilise
// buildSwimToday (météo 10 villes + orientation + abri cb_places). Réponse
// dynamique cachée au CDN 30 min par locale : zéro ISR write Vercel.
// Spec : docs/SPEC-BEACHES-DATA.md (lot 3)
import { NextResponse } from "next/server";
import { buildSwimToday } from "@/lib/swim-today";
import { getLocalizedField, type Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
};

export async function GET(req: Request) {
  const locale = (new URL(req.url).searchParams.get("locale") ?? "en") as Locale;
  const st = await buildSwimToday();
  if (!st) {
    return NextResponse.json({ error: "no_weather" }, { status: 503 });
  }

  const regions = Object.entries(st.byRegion)
    .map(([region, beaches]) => ({
      region,
      beaches: beaches.slice(0, 3).map((s) => ({
        slug: s.beach.slug,
        name: getLocalizedField(s.beach, "name", locale),
        score: s.score,
        rating: s.rating,
        windSpeed: s.windSpeed,
        windCardinal: s.windCardinal,
        // Coords exposées pour le tri par distance côté client (NowPanel /explore,
        // lot 2 app compagnon) : les slugs beaches ≠ slugs cb_places, pas de jointure possible.
        lat: s.beach.latitude,
        lng: s.beach.longitude,
      })),
    }))
    .filter((r) => r.beaches.length > 0);

  return NextResponse.json(
    { wind: st.wind, regions },
    { headers: CACHE_HEADERS },
  );
}
