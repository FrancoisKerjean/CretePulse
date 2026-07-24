import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Géocodage de lieux pour le calculateur de bus urbain d'Agios Nikolaos.
 * Proxy vers Photon (komoot, basé OpenStreetMap, conçu pour l'autocomplete).
 * Biaisé sur Agios Nikolaos + borné à la Crète orientale (Lasithi) pour éviter les
 * homonymes lointains. Erreur/vide -> { results: [] } (le front reste utilisable).
 *   GET /api/geocode?q=pergola&lang=fr
 */

const PHOTON = "https://photon.komoot.io/api";
const BIAS = { lat: 35.19, lon: 25.72 };            // Agios Nikolaos centre
const BBOX = { latMin: 34.9, latMax: 35.4, lngMin: 25.4, lngMax: 26.3 }; // Crète est (Lasithi)
const CACHE_MS = 60_000;
const TIMEOUT_MS = 6000;

interface Place { label: string; lat: number; lng: number; }

const cache = new Map<string, { ts: number; results: Place[] }>();

function label(p: Record<string, unknown>): string {
  const parts = [p.name, p.street, p.district, p.city].filter(Boolean) as string[];
  // dédup consécutif (name == city parfois)
  const out: string[] = [];
  for (const s of parts) if (out[out.length - 1] !== s) out.push(s);
  return out.slice(0, 3).join(", ");
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const lang = (req.nextUrl.searchParams.get("lang") || "en").slice(0, 2);
  if (q.length < 2) return NextResponse.json({ results: [] });

  const key = `${lang}:${q.toLowerCase()}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < CACHE_MS) {
    return NextResponse.json({ results: hit.results, cached: true });
  }

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `${PHOTON}?q=${encodeURIComponent(q)}&lat=${BIAS.lat}&lon=${BIAS.lon}&limit=8&lang=${encodeURIComponent(["en", "fr", "de"].includes(lang) ? lang : "en")}`;
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "crete.direct bus planner (+https://crete.direct)" },
      cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ results: [] });
    const data = (await r.json()) as { features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> }> };
    const seen = new Set<string>();
    const results: Place[] = [];
    for (const f of data.features ?? []) {
      const c = f.geometry?.coordinates;
      if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
      const lng = c[0], lat = c[1];
      if (lat < BBOX.latMin || lat > BBOX.latMax || lng < BBOX.lngMin || lng > BBOX.lngMax) continue; // hors Crète est
      const lbl = label(f.properties ?? {});
      if (!lbl || seen.has(lbl)) continue;
      seen.add(lbl);
      results.push({ label: lbl, lat, lng });
      if (results.length >= 6) break;
    }
    cache.set(key, { ts: now, results });
    return NextResponse.json({ results }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } });
  } catch {
    return NextResponse.json({ results: [] });
  } finally {
    clearTimeout(to);
  }
}
