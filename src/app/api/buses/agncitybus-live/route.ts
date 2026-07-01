import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import type { LiveGpsBus } from "@/lib/bus-live/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy des positions GPS temps réel des bus urbains d'Agios Nikolaos.
 * Source : agncitybus.gr (télématique municipale, API publique non authentifiée).
 *   GET /map/get_location_route.php?route=1|2|3  ->  [{latitude,longitude,speed,direction,imei,route,number,pinakida}]
 *
 * On agrège les 3 lignes, on normalise, on borne (bbox Agios Nikolaos) et on met en
 * cache court côté serveur (les positions ne bougent que toutes les ~2-3 s côté source).
 * Erreur / hors-service -> { buses: [] } : le front bascule alors sur l'estimé horaire.
 *   GET /api/buses/agncitybus-live
 */

const SRC = "https://www.agncitybus.gr/map/get_location_route.php?route=";
const ROUTES = [1, 2, 3] as const;
const LINE = {
  1: { code: "AGN-1", color: "#F2C21E" },
  2: { code: "AGN-2", color: "#E0342B" },
  3: { code: "AGN-3", color: "#2FA24C" },
} as const;
// bbox large autour d'Agios Nikolaos (rejette les fix GPS aberrants)
const BBOX = { latMin: 35.14, latMax: 35.28, lngMin: 25.6, lngMax: 25.82 };
const CACHE_MS = 4000;
const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 512 * 1024; // borne anti-DoS sur la réponse upstream (tiers non maîtrisé)
const MAX_ROWS = 200;         // plafond de bus traités par ligne
const CACHE_HEADER = "public, max-age=4, s-maxage=4";

// clé stable SANS divulguer l'IMEI (matériel) : minimisation RGPD
const hashId = (raw: string) => "v" + createHash("sha1").update(raw).digest("hex").slice(0, 12);
// n'expose que des chaînes courtes assainies (plaque / n° véhicule = données d'un bus public)
const cleanStr = (s: unknown): string | null => {
  if (s == null) return null;
  const t = String(s).replace(/[^\p{L}\p{N}\s.\-]/gu, "").trim().slice(0, 20);
  return t || null;
};
const clampBearing = (d: unknown) => (((Number(d) || 0) % 360) + 360) % 360;

let cache: { ts: number; buses: LiveGpsBus[] } | null = null;

async function fetchRoute(n: number): Promise<LiveGpsBus[]> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(`${SRC}${n}`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "crete.direct bus-live (+https://crete.direct)" },
      cache: "no-store",
      redirect: "error", // ne pas suivre une redirection amont vers un hôte arbitraire
    });
    if (!r.ok) return [];
    const len = Number(r.headers.get("content-length"));
    if (Number.isFinite(len) && len > MAX_BYTES) return []; // réponse anormalement grosse -> ignore
    const text = await r.text();
    if (text.length > MAX_BYTES) return [];
    const rows = JSON.parse(text) as unknown;
    if (!Array.isArray(rows)) return [];
    const meta = LINE[n as 1 | 2 | 3];
    const out: LiveGpsBus[] = [];
    for (const row of rows.slice(0, MAX_ROWS)) {
      if (!row || typeof row !== "object") continue; // 1 row pourri ne tue pas les autres
      const r0 = row as Record<string, unknown>;
      const lat = Number(r0.latitude);
      const lng = Number(r0.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (lat < BBOX.latMin || lat > BBOX.latMax || lng < BBOX.lngMin || lng > BBOX.lngMax) continue;
      out.push({
        id: hashId(String(r0.imei || r0.number || `${n}-${lat},${lng}`)),
        lineCode: meta.code,
        routeNum: n,
        color: meta.color,
        lat,
        lng,
        bearing: clampBearing(r0.direction),
        speed: Number(r0.speed) || 0,
        plate: cleanStr(r0.pinakida),
        vehicle: cleanStr(r0.number),
      });
    }
    return out;
  } catch {
    return []; // timeout / réseau / JSON invalide -> silencieux, fallback estimé côté front
  } finally {
    clearTimeout(to);
  }
}

let inflight: Promise<LiveGpsBus[]> | null = null; // single-flight : dédup des refresh concurrents

async function refresh(): Promise<LiveGpsBus[]> {
  if (inflight) return inflight;
  inflight = Promise.all(ROUTES.map((n) => fetchRoute(n)))
    .then((per) => per.flat())
    .finally(() => { inflight = null; });
  return inflight;
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_MS) {
      return NextResponse.json(
        { ts: cache.ts, buses: cache.buses, cached: true },
        { headers: { "Cache-Control": CACHE_HEADER } },
      );
    }
    const buses = await refresh();
    cache = { ts: now, buses };
    return NextResponse.json({ ts: now, buses, cached: false }, { headers: { "Cache-Control": CACHE_HEADER } });
  } catch {
    // contrat explicite : jamais de 500 au client -> fallback estimé côté front
    return NextResponse.json({ ts: Date.now(), buses: [], cached: false });
  }
}
