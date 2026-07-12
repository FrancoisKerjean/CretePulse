// Cockpit flux touristiques : lecture seule des tables/vues flux_* (VPS).
// Server component pur, zéro JS client. Auth = même secret/cookie que
// /admin/car-rental (isCarAdmin), entrée directe via /admin/flux/auth?key=.
// Données : capteurs du plan docs/superpowers/plans/2026-07-10-flux-*.md.
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { isCarAdmin } from "@/lib/car-admin-auth";
import { FluxMap, type FluxMapData } from "./FluxMap";

export const dynamic = "force-dynamic";

type FlightDay = { service_date: string; flights: number; landed: number };
type BusDay = { source: string; day: string; positions: number; vehicles: number };
type CruiseDay = { call_date: string; ships: number; pax: number; ships_label: string | null };
type IntentRow = { event_name: string; prop_key: string; prop_value: string; total: number };
type WikiRow = { entity: string; avg_views_7d: number };
type ZoneRow = {
  zone: string; snapshot_date: string; listings_count: number;
  occupancy_rate_30: number | null; occupancy_rate_90: number | null;
};
type OdGeoRow = {
  event_name: string; f: string; t: string; total: number;
  f_lat: number; f_lng: number; t_lat: number; t_lng: number;
};
type HeatRow = { lat: number; lng: number; n: number };
type AirportDay = { airport: string; service_date: string; flights: number; landed: number };
type StockDay = {
  day: string; flights_in: number; flights_out: number;
  pax_in_low: number | null; pax_in_high: number | null;
  pax_out_low: number | null; pax_out_high: number | null;
  coef_samples: number | null; coef_measured: boolean | null;
  stock_low: number | null; stock_high: number | null;
  net_cum_low: number | null; net_cum_high: number | null;
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-xl border border-border bg-white p-4">
      <h2 className="text-sm font-bold">{title}</h2>
      {hint ? <p className="mt-0.5 text-[11px] text-text-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Cell({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2">
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className="font-data text-sm font-bold">{v}</div>
    </div>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded bg-sand/60">
      <div className="h-2 rounded bg-sea/70" style={{ width: `${pct}%` }} />
    </div>
  );
}

const fmtDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });

// Centroïdes des zones du scrapper Airbnb (18 zones, noms = flux_zone_occupancy.zone).
const ZONE_COORDS: Record<string, [number, number]> = {
  agios_nikolaos: [35.19, 25.716], analipsi: [35.333, 25.351], apokoronas: [35.41, 24.23],
  chania: [35.514, 24.018], elounda: [35.263, 25.722], gouves: [35.328, 25.293],
  heraklion: [35.339, 25.134], hersonissos: [35.318, 25.393], ierapetra: [35.01, 25.741],
  lasithi_plateau: [35.198, 25.48], makrigialos: [35.038, 25.973], mochlos: [35.185, 25.906],
  pachia_ammos: [35.103, 25.815], rethymno: [35.365, 24.482], sfaka: [35.115, 25.995],
  sitia: [35.208, 26.101], xerokambos: [35.037, 26.23], zakros: [35.108, 26.217],
};

// Coordonnées des POI suivis par wiki_interest.py ("Crete" = île entière, exclu).
const WIKI_COORDS: Record<string, [number, number]> = {
  Knossos: [35.298, 25.163], Elafonisi: [35.271, 23.541], Balos: [35.582, 23.588],
  "Samariá_Gorge": [35.301, 23.962], Heraklion: [35.339, 25.134], Chania: [35.514, 24.018],
  Rethymno: [35.365, 24.482], "Agios_Nikolaos,_Crete": [35.19, 25.716], Ierapetra: [35.01, 25.741],
  Sitia: [35.208, 26.101], Spinalonga: [35.297, 25.744], "Matala,_Crete": [34.995, 24.749],
  Phaistos: [35.051, 24.814], Preveli: [35.156, 24.47], Arkadi_Monastery: [35.31, 24.629],
  Falasarna: [35.494, 23.577], Loutro: [35.199, 24.081], Elounda: [35.263, 25.722],
  "Malia,_Crete": [35.284, 25.462], Hersonissos: [35.318, 25.393], "Vai_(Crete)": [35.254, 26.265],
};

const AIRPORT_COORDS: Record<string, [number, number]> = {
  HER: [35.3397, 25.1803], CHQ: [35.5317, 24.1497],
};
const PORT_HERAKLION: [number, number] = [35.3446, 25.1355];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default async function FluxAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const sp = await searchParams;
  const key = typeof sp.key === "string" ? sp.key : undefined;
  if (key) {
    if (await isCarAdmin(key)) redirect(`/admin/flux/auth?key=${encodeURIComponent(key)}`);
    notFound();
  }
  if (!(await isCarAdmin())) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);

  let flights: FlightDay[] = [];
  let bus: BusDay[] = [];
  let cruises: CruiseDay[] = [];
  let intents: IntentRow[] = [];
  let wiki: WikiRow[] = [];
  let zones: ZoneRow[] = [];
  let stock: StockDay[] = [];
  let odGeo: OdGeoRow[] = [];
  let heat: HeatRow[] = [];
  let airportDays: AirportDay[] = [];
  let loadError: string | null = null;
  try {
    const [fRes, bRes, cRes, iRes, wRes, zRes, sRes, oRes, hRes, aRes] = await Promise.all([
      supabase.from("v_flux_flights_daily").select("*").order("service_date", { ascending: false }).limit(14),
      supabase.from("v_flux_bus_daily").select("*").order("day", { ascending: false }).limit(21),
      supabase.from("v_flux_cruise_daily").select("*").gte("call_date", today).lte("call_date", in14).order("call_date"),
      supabase.from("v_flux_intent_top").select("event_name, prop_key, prop_value, total"),
      supabase.from("v_flux_wiki_top").select("*").order("avg_views_7d", { ascending: false }).limit(12),
      supabase.from("flux_zone_occupancy").select("*").order("snapshot_date", { ascending: false }).limit(36),
      supabase.from("v_flux_stock_daily").select("*").order("day", { ascending: false }).limit(30),
      supabase.from("v_flux_od_geo").select("*").order("total", { ascending: false }).limit(400),
      supabase.from("v_flux_bus_heat").select("*").order("n", { ascending: false }).limit(1500),
      supabase.from("v_flux_flights_airport").select("*").order("service_date", { ascending: false }).limit(10),
    ]);
    loadError = fRes.error?.message ?? bRes.error?.message ?? cRes.error?.message
      ?? iRes.error?.message ?? wRes.error?.message ?? zRes.error?.message ?? sRes.error?.message
      ?? oRes.error?.message ?? hRes.error?.message ?? aRes.error?.message ?? null;
    flights = (fRes.data ?? []) as FlightDay[];
    bus = (bRes.data ?? []) as BusDay[];
    cruises = (cRes.data ?? []) as CruiseDay[];
    intents = (iRes.data ?? []) as IntentRow[];
    wiki = (wRes.data ?? []) as WikiRow[];
    zones = (zRes.data ?? []) as ZoneRow[];
    stock = ((sRes.data ?? []) as StockDay[]).sort((a, b) => a.day.localeCompare(b.day));
    odGeo = (oRes.data ?? []) as OdGeoRow[];
    heat = (hRes.data ?? []) as HeatRow[];
    airportDays = (aRes.data ?? []) as AirportDay[];
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const topBy = (name: string, n = 12) =>
    intents.filter((r) => r.event_name === name).sort((a, b) => b.total - a.total).slice(0, n);
  const odServed = topBy("bus_search");
  const odZero = topBy("bus_search_zero");
  const queries = [...intents.filter((r) => r.event_name === "search_query" || r.event_name === "explore_search")]
    .sort((a, b) => b.total - a.total).slice(0, 12);

  const todayFlights = flights.find((f) => f.service_date === today);
  const busToday = bus.filter((b) => b.day === today);
  const pax7 = cruises.filter((c) => c.call_date <= new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10))
    .reduce((s, c) => s + c.pax, 0);
  const intentTotal30 = intents.filter((r) => r.event_name === "bus_search" || r.event_name === "bus_search_zero")
    .reduce((s, r) => s + r.total, 0);
  const zeroTotal30 = intents.filter((r) => r.event_name === "bus_search_zero").reduce((s, r) => s + r.total, 0);

  const latestZoneDate = zones[0]?.snapshot_date;
  const latestZones = zones.filter((z) => z.snapshot_date === latestZoneDate)
    .sort((a, b) => b.listings_count - a.listings_count);

  const maxFlights = Math.max(1, ...flights.map((f) => f.flights));
  const maxPax = Math.max(1, ...cruises.map((c) => c.pax));

  const busBySource = new Map<string, BusDay[]>();
  for (const b of bus) {
    busBySource.set(b.source, [...(busBySource.get(b.source) ?? []), b]);
  }

  // Payload carte : arcs OD, densité GPS, points d'entrée dimensionnés sur le
  // dernier jour connu par aéroport, zones Airbnb + POI wiki géocodés en dur.
  const latestByAirport = new Map<string, AirportDay>();
  for (const a of airportDays) {
    if (!latestByAirport.has(a.airport)) latestByAirport.set(a.airport, a);
  }
  const mapData: FluxMapData = {
    od: odGeo.map((r) => ({
      f: r.f, t: r.t, total: r.total, zero: r.event_name === "bus_search_zero",
      fLat: r.f_lat, fLng: r.f_lng, tLat: r.t_lat, tLng: r.t_lng,
    })),
    heat,
    entries: [
      ...[...latestByAirport.values()].map((a) => ({
        name: `Aéroport ${a.airport}`, kind: "airport" as const,
        lat: AIRPORT_COORDS[a.airport]?.[0] ?? 0, lng: AIRPORT_COORDS[a.airport]?.[1] ?? 0,
        detail: `${a.flights} vols le ${fmtDay(a.service_date)} (${a.landed} posés)`,
        size: clamp(6 + a.flights * 0.12, 8, 24),
      })).filter((a) => a.lat !== 0),
      ...(cruises.length ? [{
        name: "Port Héraklion (croisières)", kind: "port" as const,
        lat: PORT_HERAKLION[0], lng: PORT_HERAKLION[1],
        detail: `${pax7.toLocaleString("fr-FR")} passagers attendus sous 7 j`,
        size: clamp(6 + pax7 / 1500, 8, 24),
      }] : []),
    ],
    zones: latestZones.flatMap((z) => {
      const c = ZONE_COORDS[z.zone];
      return c ? [{
        zone: z.zone, lat: c[0], lng: c[1], listings: z.listings_count,
        occ30: z.occupancy_rate_30, size: clamp(4 + Math.sqrt(z.listings_count) * 0.9, 5, 20),
      }] : [];
    }),
    wiki: wiki.flatMap((w) => {
      const c = WIKI_COORDS[w.entity];
      return c ? [{
        entity: w.entity, lat: c[0], lng: c[1], views: w.avg_views_7d,
        size: clamp(3 + Math.sqrt(w.avg_views_7d) * 0.3, 4, 18),
      }] : [];
    }),
  };

  const lastStock = stock.length ? stock[stock.length - 1] : undefined;
  const round100 = (v: number) => Math.round(v / 100) * 100;
  const fmtRange = (low: number | null, high: number | null) =>
    low == null || high == null
      ? "n/d"
      : `${round100(low).toLocaleString("fr-FR")} à ${round100(high).toLocaleString("fr-FR")}`;
  const maxStockHigh = Math.max(1, ...stock.map((s) => s.stock_high ?? 0));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-lg font-bold">Flux touristiques — cockpit</h1>
      <p className="mt-1 text-xs text-text-muted">
        Capteurs : intentions site (Plausible), vols HER+CHQ, GPS bus urbains, croisières Héraklion,
        Wikipedia, occupation Airbnb. Historisation VPS, plan du 10/07/2026.
      </p>

      {loadError ? (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          Erreur de chargement : {loadError}
        </div>
      ) : null}

      <section className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        <Cell label="vols HER aujourd'hui" v={todayFlights ? `${todayFlights.flights} (${todayFlights.landed} posés)` : "n/d"} />
        <Cell label="positions bus aujourd'hui" v={busToday.length ? String(busToday.reduce((s, b) => s + b.positions, 0)) : "n/d"} />
        <Cell label="pax croisières 7 j" v={cruises.length ? pax7.toLocaleString("fr-FR") : "n/d"} />
        <Cell label="recherches bus 30 j" v={intentTotal30 ? String(intentTotal30) : "n/d"} />
        <Cell label="dont NON desservies" v={intentTotal30 ? String(zeroTotal30) : "n/d"} />
      </section>

      <FluxMap data={mapData} />
      <p className="mt-1 text-[10px] text-text-muted">
        Arcs = paires origine→destination recherchées dans le planner bus (30 j), courbés selon le sens.
        Géocodage : bus_destinations, villages, beaches, bus_stops + alias curés (~83 % du volume couvert).
      </p>

      <Section
        title="Touristes présents (estimation)"
        hint="Vols HER+CHQ comptés /10 min, convertis en passagers via calibration officielle HCAA (ypa.gr) ; séjour moyen 7,5 à 8,2 nuits (INSETE 2024). Jours non mesurés comblés par la moyenne HCAA du mois. Toujours une fourchette, jamais un chiffre sec."
      >
        {lastStock && lastStock.stock_low != null ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-data text-2xl font-bold">
                {fmtRange(lastStock.stock_low, lastStock.stock_high)}
              </span>
              <span className="text-xs text-text-muted">
                personnes entrées par avion (HER+CHQ) encore sur l&apos;île, au {fmtDay(lastStock.day)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-muted">
              Bilan cumulé arrivées moins départs depuis le début du comptage :{" "}
              {fmtRange(lastStock.net_cum_low, lastStock.net_cum_high)}. Calibration{" "}
              {lastStock.coef_measured ? "mesurée (mois complet compté)" : "HCAA mouvements officiels"}
              {lastStock.coef_samples ? `, ${lastStock.coef_samples} mois de référence` : ""}.
            </p>
            <div className="mt-3 flex flex-col gap-1">
              {stock.map((s) => (
                <div key={s.day} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-text-muted">{fmtDay(s.day)}</span>
                  <Bar value={s.stock_high ?? 0} max={maxStockHigh} />
                  <span className="w-36 shrink-0 text-right font-data">{fmtRange(s.stock_low, s.stock_high)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-text-muted">
            Pas encore de fourchette : comptage départs ou calibration en cours d&apos;amorçage.
          </p>
        )}
        <ul className="mt-3 list-disc pl-4 text-[11px] text-text-muted">
          <li>Non comptés : ferries (branchement en cours) et Sitia JSH (~0,5 % du trafic). L&apos;estimation couvre HER + CHQ, soit ~97 % du trafic aérien crétois.</li>
          <li>Croisiéristes : transitoires comptés à part (calendrier officiel du port, section Croisières).</li>
          <li>Méthode primaire : fenêtre séjour-moyen 7 à 8 jours glissants sur les arrivées estimées ; croisée au bilan cumulé.</li>
          <li>Montée en charge : la fourchette devient fiable après 8 jours de comptage continu des deux directions.</li>
        </ul>
      </Section>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Section title="Paires bus demandées (30 j)" hint="Événement bus_search, trajets avec résultats">
          <table className="w-full text-xs">
            <tbody>
              {odServed.map((r) => (
                <tr key={r.prop_value} className="border-t border-border/60">
                  <td className="py-1 pr-2">{r.prop_value}</td>
                  <td className="py-1 text-right font-data font-bold">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Paires demandées NON desservies (30 j)" hint="bus_search avec 0 résultat = demande sans offre — la donnée KTEL/Région">
          <table className="w-full text-xs">
            <tbody>
              {odZero.map((r) => (
                <tr key={r.prop_value} className="border-t border-border/60">
                  <td className="py-1 pr-2">{r.prop_value}</td>
                  <td className="py-1 text-right font-data font-bold">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <Section title="Arrivées aéroport Héraklion (14 j)" hint="Tableau officiel scrapé /10 min ; « posés » = statut Landed vu">
        <div className="flex flex-col gap-1">
          {[...flights].sort((a, b) => a.service_date.localeCompare(b.service_date)).map((f) => (
            <div key={f.service_date} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 text-text-muted">{fmtDay(f.service_date)}</span>
              <Bar value={f.flights} max={maxFlights} />
              <span className="w-24 shrink-0 text-right font-data">{f.flights} ({f.landed})</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Croisières Héraklion — 14 prochains jours" hint="Calendrier officiel du port (PDF), passagers attendus par jour">
        <div className="flex flex-col gap-1.5">
          {cruises.map((c) => (
            <div key={c.call_date} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 text-text-muted">{fmtDay(c.call_date)}</span>
              <Bar value={c.pax} max={maxPax} />
              <span className="w-20 shrink-0 text-right font-data font-bold">{c.pax.toLocaleString("fr-FR")}</span>
              <span className="hidden max-w-[40%] truncate text-text-muted sm:block">{c.ships_label}</span>
            </div>
          ))}
          {!cruises.length ? <p className="text-xs text-text-muted">Aucune escale sur la fenêtre.</p> : null}
        </div>
      </Section>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Section title="GPS bus urbains (7 j)" hint="Positions historisées / véhicules distincts par jour">
          {[...busBySource.entries()].map(([source, rows]) => (
            <div key={source} className="mb-2">
              <div className="text-[11px] font-bold text-text-muted">{source}</div>
              <table className="w-full text-xs">
                <tbody>
                  {rows.slice(0, 7).map((b) => (
                    <tr key={b.day} className="border-t border-border/60">
                      <td className="py-1">{fmtDay(b.day)}</td>
                      <td className="py-1 text-right font-data">{b.positions} pos.</td>
                      <td className="py-1 text-right font-data font-bold">{b.vehicles} véh.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </Section>

        <Section title="Intérêt Wikipedia (vues/j, 7 j)" hint="Pageviews en.wikipedia, 22 POI crétois">
          <table className="w-full text-xs">
            <tbody>
              {wiki.map((w) => (
                <tr key={w.entity} className="border-t border-border/60">
                  <td className="py-1 pr-2">{w.entity.replace(/_/g, " ")}</td>
                  <td className="py-1 text-right font-data font-bold">{w.avg_views_7d.toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <Section
        title={`Occupation Airbnb par zone${latestZoneDate ? ` (${fmtDay(latestZoneDate)})` : ""}`}
        hint="Agrégat hebdo scrapper (18 zones). ⚠ Biais sélection : Airbnb ne retourne que les logements avec dispo visible → listings 100 % complets invisibles. Taux ~10 % = occupation des logements encore disponibles, pas taux global (estimé ~85-95 % en juillet). NE PAS publier brut."
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[11px] text-text-muted">
              <th className="py-1">zone</th>
              <th className="py-1 text-right">annonces</th>
              <th className="py-1 text-right">taux 30 j</th>
              <th className="py-1 text-right">taux 90 j</th>
            </tr>
          </thead>
          <tbody>
            {latestZones.map((z) => (
              <tr key={z.zone} className="border-t border-border/60">
                <td className="py-1">{z.zone}</td>
                <td className="py-1 text-right font-data">{z.listings_count}</td>
                <td className="py-1 text-right font-data">{z.occupancy_rate_30 == null ? "n/d" : `${Math.round(z.occupancy_rate_30 * 100)} %`}</td>
                <td className="py-1 text-right font-data">{z.occupancy_rate_90 == null ? "n/d" : `${Math.round(z.occupancy_rate_90 * 100)} %`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Section title="Requêtes de recherche (30 j)" hint="search_query (/search) + explore_search (carte)">
          <table className="w-full text-xs">
            <tbody>
              {queries.map((r) => (
                <tr key={`${r.event_name}:${r.prop_value}`} className="border-t border-border/60">
                  <td className="py-1 pr-2">{r.prop_value}</td>
                  <td className="py-1 text-[10px] text-text-muted">{r.event_name === "explore_search" ? "carte" : "search"}</td>
                  <td className="py-1 text-right font-data font-bold">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Notes capteurs">
          <ul className="list-disc pl-4 text-xs text-text-muted">
            <li>Chania aéroport : JSON officiel Fraport branché (arrivées + départs /10 min).</li>
            <li>Popular Times Google : abandonné (voie fermée côté Google).</li>
            <li>Ferries : hors scope v1.</li>
            <li>Crons : bus /1 min (AgNik) et /5 min (HER+CHA) 7h-22h Athens, vols /10 min, wiki+intentions quotidiens, croisières mensuel.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
