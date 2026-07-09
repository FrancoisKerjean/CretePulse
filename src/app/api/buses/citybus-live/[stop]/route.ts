import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

/**
 * Proxy des prochaines arrivées temps réel pour un arrêt du réseau citybus.gr
 * (Heraklion ou Chania). Source : rest.citybus.gr/api/v1/el/{agency}/stops/live/{stopCode}.
 *
 * Paramètres :
 *   - [stop]  : code API natif de l'arrêt (ex: "500", depuis bus_stops.api_code)
 *   - ?city   : "her" (Heraklion, agency 110) | "cha" (Chania, agency 120)
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
): Promise<CityBusArrival[]> {
  const cacheKey = `${agency}:${stopCode}`;
  const cached = arrivalsCache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_ARRIVALS_MS) {
    return cached.data as CityBusArrival[];
  }

  const token = await fetchToken(subdomain);
  const url = `${API_BASE}/el/${agency}/stops/live/${stopCode}`;
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
  if (!Array.isArray(raw)) return [];
  const out: CityBusArrival[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const etaMin = Number(r.departureMins ?? r.etaMin ?? 0);
    const etaSec = Number(r.departureSeconds ?? r.etaSec ?? 0);
    if (!Number.isFinite(etaMin)) continue;
    out.push({
      lineCode: String(r.lineCode ?? r.line_code ?? ""),
      routeCode: String(r.routeCode ?? r.route_code ?? ""),
      routeName: String(r.routeName ?? r.route_name ?? ""),
      color: r.color ? String(r.color) : null,
      textColor: r.textColor ? String(r.textColor) : null,
      etaMin: Math.max(0, Math.round(etaMin)),
      etaSec: Math.max(0, Math.round(etaSec)),
      vehicleCode: r.vehicleCode ? String(r.vehicleCode) : null,
    });
  }
  return out.slice(0, 20); // borne: 20 passages max
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stop: string }> },
) {
  const { stop } = await params;
  const city = req.nextUrl.searchParams.get("city") ?? "";
  const cfg = CITY_CONFIG[city];
  if (!cfg || !stop || !/^\d+$/.test(stop)) {
    return NextResponse.json({ arrivals: [] }, { status: 400 });
  }
  try {
    const arrivals = await fetchArrivals(cfg.agency, cfg.subdomain, stop);
    return NextResponse.json(
      { arrivals },
      { headers: { "Cache-Control": "public, max-age=10, s-maxage=10" } },
    );
  } catch {
    return NextResponse.json({ arrivals: [] });
  }
}
