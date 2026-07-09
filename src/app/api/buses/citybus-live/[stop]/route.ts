import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

/**
 * Proxy des prochaines arrivées temps réel pour un arrêt du réseau citybus.gr
 * (Heraklion ou Chania). Source : rest.citybus.gr/api/v1/{lang}/{agency}/stops/live/{stopCode}.
 * Réponse upstream : { vehicles: [{ lineCode, lineName, routeCode, routeName,
 *   latitude, longitude, departureMins, departureSeconds, vehicleCode,
 *   lineColor, lineTextColor, borderColor }] } — 404 si arrêt sans passage.
 *
 * Paramètres :
 *   - [stop]  : code API natif de l'arrêt (ex: "0122", depuis bus_stops.api_code)
 *   - ?city   : "her" (Heraklion, agency 110) | "cha" (Chania, agency 120)
 *   - ?lang   : "en" (défaut) | "el" — langue des noms de ligne/destination
 *
 * Réponse : { arrivals: CityBusArrival[] }
 * Fallback : { arrivals: [] } (jamais de 500)
 */

const API_BASE = "https://rest.citybus.gr/api/v1";
const CITY_CONFIG: Record<string, { agency: string; subdomain: string }> = {
  her: { agency: "110", subdomain: "irakleio" },
  cha: { agency: "120", subdomain: "chania" },
};

const MAX_BYTES = 256 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TOKEN_MS = 60 * 60 * 1000; // 1h
const CACHE_ARRIVALS_MS = 10_000;        // 10s

// Caches en mémoire (par ville)
const tokenCache: Record<string, { token: string; ts: number }> = {};
const arrivalsCache: Record<string, { ts: number; data: unknown }> = {};

async function fetchToken(subdomain: string): Promise<string> {
  const cached = tokenCache[subdomain];
  if (cached && Date.now() - cached.ts < CACHE_TOKEN_MS) return cached.token;

  const url = `https://${subdomain}.citybus.gr/el/stops`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (crete.direct bus-live +https://crete.direct)" },
    });
    if (!r.ok) throw new Error(`token page HTTP ${r.status}`);
    const html = await r.text();
    const m = html.match(/const token\s*=\s*'([^']+)'/);
    if (!m) throw new Error("token JWT introuvable dans le HTML");
    tokenCache[subdomain] = { token: m[1], ts: Date.now() };
    return m[1];
  } finally {
    clearTimeout(to);
  }
}

export interface CityBusArrival {
  lineCode: string;
  lineName: string;
  routeCode: string;
  routeName: string;
  color: string | null;
  textColor: string | null;
  etaMin: number;
  etaSec: number;
  vehicleCode: string | null;
}

async function fetchArrivals(
  agency: string,
  subdomain: string,
  stopCode: string,
  lang: "en" | "el",
): Promise<CityBusArrival[]> {
  const cacheKey = `${agency}:${stopCode}:${lang}`;
  const cached = arrivalsCache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_ARRIVALS_MS) {
    return cached.data as CityBusArrival[];
  }

  const token = await fetchToken(subdomain);
  const url = `${API_BASE}/${lang}/${agency}/stops/live/${stopCode}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Referer: `https://${subdomain}.citybus.gr/`,
        "User-Agent": "Mozilla/5.0 (crete.direct bus-live +https://crete.direct)",
      },
      cache: "no-store",
    });
    // 401 → token expiré → invalider le cache et réessayer une fois
    if (r.status === 401) {
      delete tokenCache[subdomain];
      const freshToken = await fetchToken(subdomain);
      const r2 = await fetch(url, {
        headers: {
          Authorization: `Bearer ${freshToken}`,
          Referer: `https://${subdomain}.citybus.gr/`,
          "User-Agent": "Mozilla/5.0 (crete.direct bus-live +https://crete.direct)",
        },
        cache: "no-store",
      });
      if (!r2.ok) return [];
      const text2 = await r2.text();
      if (text2.length > MAX_BYTES) return [];
      const data2 = parseArrivals(JSON.parse(text2));
      arrivalsCache[cacheKey] = { ts: Date.now(), data: data2 };
      return data2;
    }
    if (!r.ok) return [];
    const text = await r.text();
    if (text.length > MAX_BYTES) return [];
    const data = parseArrivals(JSON.parse(text));
    arrivalsCache[cacheKey] = { ts: Date.now(), data };
    return data;
  } finally {
    clearTimeout(to);
  }
}

function parseArrivals(raw: unknown): CityBusArrival[] {
  // Réponse upstream : { vehicles: [...] }
  const vehicles = (raw as { vehicles?: unknown })?.vehicles;
  if (!Array.isArray(vehicles)) return [];
  const out: CityBusArrival[] = [];
  for (const item of vehicles) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const etaMin = Number(r.departureMins);
    if (!Number.isFinite(etaMin)) continue;
    out.push({
      lineCode: String(r.lineCode ?? ""),
      lineName: String(r.lineName ?? ""),
      routeCode: String(r.routeCode ?? ""),
      routeName: String(r.routeName ?? ""),
      color: r.lineColor ? String(r.lineColor) : null,
      textColor: r.lineTextColor ? String(r.lineTextColor) : null,
      etaMin: Math.max(0, Math.round(etaMin)),
      etaSec: Math.max(0, Math.round(Number(r.departureSeconds) || 0)),
      vehicleCode: r.vehicleCode ? String(r.vehicleCode) : null,
    });
  }
  out.sort((a, b) => a.etaMin - b.etaMin || a.etaSec - b.etaSec);
  return out.slice(0, 20); // borne: 20 passages max
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stop: string }> },
) {
  const { stop } = await params;
  const city = req.nextUrl.searchParams.get("city") ?? "";
  const lang = req.nextUrl.searchParams.get("lang") === "el" ? "el" : "en";
  const cfg = CITY_CONFIG[city];
  if (!cfg || !stop || !/^\d+$/.test(stop)) {
    return NextResponse.json({ arrivals: [] }, { status: 400 });
  }
  try {
    const arrivals = await fetchArrivals(cfg.agency, cfg.subdomain, stop, lang);
    return NextResponse.json(
      { arrivals },
      { headers: { "Cache-Control": "public, max-age=10, s-maxage=10" } },
    );
  } catch {
    return NextResponse.json({ arrivals: [] });
  }
}
