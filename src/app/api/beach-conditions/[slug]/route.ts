// Conditions de baignade du moment pour UNE plage, consommées par le bloc
// client des pages /beaches/[slug] (elles restent en ISR 48 h : le live passe
// par ici). Réutilise le moteur de /beaches/today (scoreBeach + météo des 10
// villes, cache Supabase weather_cache rafraîchi par cron VPS). Réponse
// dynamique cachée au CDN (s-maxage 30 min) : zéro ISR write Vercel.
// Spec : docs/SPEC-BEACHES-DATA.md (lot 1)
import { NextResponse } from "next/server";
import { getBeachBySlug } from "@/lib/beaches";
import { fetchAllCitiesWeather } from "@/lib/weather";
import { getCbBeachNear } from "@/lib/cb-beach-match";
import { scoreBeach } from "@/lib/swim-today";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const beach = await getBeachBySlug(slug);
  if (!beach) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [cities, cb] = await Promise.all([
    fetchAllCitiesWeather(),
    getCbBeachNear(beach.latitude, beach.longitude),
  ]);
  const scored = cities.length ? scoreBeach(beach, cities, [], cb) : null;
  if (!scored) {
    // Météo indisponible (Open-Meteo down + cache vide) : le bloc client se retire.
    return NextResponse.json({ error: "no_weather" }, { status: 503 });
  }

  return NextResponse.json(
    {
      slug: beach.slug,
      score: scored.score,
      rating: scored.rating,
      shoreWind: scored.shoreWind,
      windSpeed: scored.windSpeed,
      windCardinal: scored.windCardinal,
      waveHeight: scored.waveHeight,
      seaTemp: scored.seaTemp,
      airTemp: scored.city.temp,
      weatherCode: scored.city.weatherCode,
      cityName: scored.city.name,
      cityKm: scored.cityKm,
    },
    { headers: CACHE_HEADERS },
  );
}
