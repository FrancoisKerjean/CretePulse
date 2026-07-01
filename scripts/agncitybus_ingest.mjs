#!/usr/bin/env node
/**
 * Ingest du reseau bus urbain d'Agios Nikolaos (agncitybus.gr) dans crete.direct.
 *
 * Source : data/agncitybus/dump.json (aspire le 2026-07-01, cf agncitybus_scrape.mjs).
 * Produit :
 *   1. Ecritures Supabase (idempotentes, prefixe agn-/AGN- => zero collision KTEL) :
 *        bus_operators(agncitybus), bus_lines x3 (source=agncitybus), bus_stops (dedup),
 *        bus_line_stops (seq + cumuls), bus_routes x3 (line_id, cadence 30min).
 *      => alimente la CARTE LIVE (tracer + arrets + bus estimes via busesAt).
 *   2. src/data/agnik-bus.ts : data statique typee pour le CALCULATEUR de trajets urbain.
 *
 * Modes :
 *   node scripts/agncitybus_ingest.mjs            # dry-run : calcule, ecrit le .ts data, N'ECRIT PAS Supabase
 *   node scripts/agncitybus_ingest.mjs --commit   # + upsert Supabase prod (service key)
 *
 * Geometrie : linear-referencing MONOTONE (les 3 lignes sont des BOUCLES : le snap
 * naif est ambigu, on avance le long du tracer sans reculer).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DUMP = join(ROOT, 'data', 'agncitybus', 'dump.json');
const DATA_TS = join(ROOT, 'src', 'data', 'agnik-bus.ts');
const ENV = join(ROOT, 'scripts', 'scrapers', 'buses', '.env');
const COMMIT = process.argv.includes('--commit');

const URBAN_SPEED_KMH = 18;      // vitesse urbaine effective (arrets frequents)
const HEADWAY_MIN = 30;          // cadence
const FIRST_DEP = '07:00';
const LAST_DEP = '22:00';
const DEDUP_M = 25;              // 2 arrets < 25 m = meme arret physique
const SOURCE_URL = 'https://www.agncitybus.gr/';
const COLORS = { yellow: '#F2C21E', red: '#E0342B', green: '#2FA24C' };
const LINE_NAME = { yellow: 'Yellow', red: 'Red', green: 'Green' };
const NAME_EL_LINE = { yellow: 'Κίτρινη Γραμμή', red: 'Κόκκινη Γραμμή', green: 'Πράσινη Γραμμή' };

// ---------- geo helpers ----------
const R = 6371;
const toRad = (d) => (d * Math.PI) / 180;
function haversineKm(a, b) {
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// projection locale equirectangulaire (echelle ville : erreur negligeable)
function projFactor(lat0) {
  return { kx: 111.32 * Math.cos(toRad(lat0)), ky: 110.57 };
}
/** Projette pt [lat,lng] sur le segment a-b ; retourne {t in [0,1], point [lat,lng]}. */
function projectOnSeg(pt, a, b, f) {
  const ax = a[1] * f.kx, ay = a[0] * f.ky;
  const bx = b[1] * f.kx, by = b[0] * f.ky;
  const px = pt[1] * f.kx, py = pt[0] * f.ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return { t, point: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] };
}

/** Longueurs cumulees des noeuds de la polyline (km). */
function cumLengths(poly) {
  const cum = [0];
  for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + haversineKm(poly[i - 1], poly[i]));
  return cum;
}

/**
 * Linear referencing MONOTONE : place chaque arret (dans l'ordre seq) le long du tracer
 * sans jamais reculer. Retourne les km cumules par arret.
 * poly : [[lat,lng],...] ; stops : [[lat,lng],...] dans l'ordre.
 */
function locateStopsMonotone(poly, stops) {
  const f = projFactor(poly[0][0]);
  const nodeCum = cumLengths(poly);
  const total = nodeCum[poly.length - 1];
  const out = [];
  let cumBase = 0;     // km deja parcourus (borne basse)
  for (let si = 0; si < stops.length; si++) {
    const s = stops[si];
    if (si === 0) { out.push(0); cumBase = 0; continue; } // seq 0 = terminus de depart = 0 km
    // fenetre d'avance bornee : evite de sauter a l'autre bout de la boucle
    const straight = haversineKm(stops[si - 1], s);
    const maxAhead = Math.max(0.5, straight * 3 + 0.3);
    let best = { d: Infinity, cum: cumBase };
    for (let i = 0; i < poly.length - 1; i++) {
      const pr = projectOnSeg(s, poly[i], poly[i + 1], f);
      const cum = nodeCum[i] + haversineKm(poly[i], pr.point);
      if (cum < cumBase - 0.001) continue;     // pas de recul
      if (cum > cumBase + maxAhead) continue;   // pas de saut au-dela de la fenetre
      const d = haversineKm(s, pr.point);
      if (d < best.d) best = { d, cum };
    }
    let cum = Math.max(best.cum, cumBase + 0.001);
    cum = Math.min(cum, total);
    out.push(cum);
    cumBase = cum;
  }
  return { cums: out, total };
}

// ---------- name / slug helpers ----------
const GREEK_MAP = { Α: 'A', Β: 'V', Γ: 'G', Δ: 'D', Ε: 'E', Ζ: 'Z', Η: 'I', Θ: 'Th', Ι: 'I', Κ: 'K', Λ: 'L', Μ: 'M', Ν: 'N', Ξ: 'X', Ο: 'O', Π: 'P', Ρ: 'R', Σ: 'S', Τ: 'T', Υ: 'Y', Φ: 'F', Χ: 'Ch', Ψ: 'Ps', Ω: 'O' };
function deGreek(s) { return s.replace(/[Α-Ω]/g, (c) => GREEK_MAP[c] ?? ''); }
/** Retire le prefixe "STATION N - " / "START POINT - " et nettoie l'affichage EN. */
function cleanName(nameEn) {
  let n = nameEn.replace(/\s+/g, ' ').trim();
  const dash = n.indexOf(' - ');
  if (dash >= 0) n = n.slice(dash + 3).trim();     // partie descriptive apres le 1er tiret
  n = deGreek(n).replace(/\s+/g, ' ').trim();       // ex "Α. PAPANDREOU" -> "A. PAPANDREOU"
  // Title Case doux (garde les sigles courts en l'etat)
  return n.split(' ').map((w) => (w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w)
    ? w[0] + w.slice(1).toLowerCase() : w)).join(' ');
}
function cleanNameEl(nameGr) {
  const n = nameGr.replace(/\s+/g, ' ').trim();
  const dash = n.indexOf(' - ');
  return dash >= 0 ? n.slice(dash + 3).trim() : n;
}
function slugify(s) {
  return deGreek(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------- build model ----------
function timesEvery(headway, first, last) {
  const toMin = (h) => +h.slice(0, 2) * 60 + +h.slice(3);
  const pad = (n) => String(n).padStart(2, '0');
  const out = [];
  for (let m = toMin(first); m <= toMin(last); m += headway) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}

function build() {
  const dump = JSON.parse(readFileSync(DUMP, 'utf8'));
  const uniqueStops = [];      // {slug,name,nameEl,lat,lng}
  const usedSlugs = new Set();

  function internStop(src) {
    // dedup par proximite
    for (const u of uniqueStops) {
      if (haversineKm([u.lat, u.lng], [src.lat, src.lng]) * 1000 < DEDUP_M) return u;
    }
    const base = 'agn-' + (slugify(cleanName(src.name_en)) || 'stop');
    let slug = base, n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);
    const u = { slug, name: cleanName(src.name_en), nameEl: cleanNameEl(src.name_gr), lat: src.lat, lng: src.lng };
    uniqueStops.push(u);
    return u;
  }

  const departures = timesEvery(HEADWAY_MIN, FIRST_DEP, LAST_DEP);
  const lines = [];
  for (const l of dump.lines) {
    const poly = l.polyline; // [[lat,lng],...]
    const { cums, total } = locateStopsMonotone(poly, l.stops.map((s) => [s.lat, s.lng]));
    const totalMinutes = Math.max(1, Math.round((total / URBAN_SPEED_KMH) * 60));
    // dedup intra-ligne par slug (2 arrets source <25m fusionnes -> 1 seul, garder le 1er)
    // MEME regle que l'insert Supabase, pour que .ts et DB restent coherents.
    const lineStops = [];
    const seenSlug = new Set();
    l.stops.forEach((s, i) => {
      const u = internStop(s);
      if (seenSlug.has(u.slug)) return;
      seenSlug.add(u.slug);
      lineStops.push({ stop: u, seq: s.seq, cumKm: cums[i], cumMin: (cums[i] / URBAN_SPEED_KMH) * 60 });
    });
    lines.push({
      color: l.color,
      code: `AGN-${l.routeNum}`,
      routeNum: l.routeNum,
      name: `Agios Nikolaos City Bus - ${LINE_NAME[l.color]} Line`,
      nameEl: NAME_EL_LINE[l.color],
      hex: COLORS[l.color],
      geometry: poly.map(([lat, lng]) => [lng, lat]), // -> [lng,lat] GeoJSON
      lengthKm: +total.toFixed(3),
      totalMinutes,
      stops: lineStops,
      from: lineStops[0].stop.name,
      to: lineStops[lineStops.length - 1].stop.name,
      departures,
    });
  }
  return { uniqueStops, lines, departures };
}

// ---------- outputs ----------
function writeDataTs(model) {
  const stops = {};
  for (const u of model.uniqueStops) stops[u.slug] = { slug: u.slug, name: u.name, nameEl: u.nameEl, lat: u.lat, lng: u.lng };
  const lines = model.lines.map((l) => ({
    id: l.code, code: l.code, color: l.color, hex: l.hex, nameEn: l.name, nameEl: l.nameEl,
    totalMinutes: l.totalMinutes, lengthKm: l.lengthKm,
    stops: l.stops.map((s) => ({ slug: s.stop.slug, seq: s.seq, cumKm: +s.cumKm.toFixed(3), cumMin: +s.cumMin.toFixed(2) })),
  }));
  const body = `// AUTO-GENERE par scripts/agncitybus_ingest.mjs — NE PAS EDITER A LA MAIN.
// Reseau bus urbain gratuit d'Agios Nikolaos (agncitybus.gr), aspire le 2026-07-01.
// Source du calculateur de trajets urbain (src/lib/urban-journey.ts).

export interface AgnikStop { slug: string; name: string; nameEl: string; lat: number; lng: number; }
export interface AgnikLineStop { slug: string; seq: number; cumKm: number; cumMin: number; }
export interface AgnikLine {
  id: string; code: string; color: "yellow" | "red" | "green"; hex: string;
  nameEn: string; nameEl: string; totalMinutes: number; lengthKm: number; stops: AgnikLineStop[];
}

export const AGNIK_SERVICE = {
  headwayMin: ${HEADWAY_MIN}, firstDep: "${FIRST_DEP}", lastDep: "${LAST_DEP}",
  days: "Every Day", free: true,
  departures: ${JSON.stringify(model.departures)},
} as const;

export const AGNIK_STOPS: Record<string, AgnikStop> = ${JSON.stringify(stops, null, 2)};

export const AGNIK_LINES: AgnikLine[] = ${JSON.stringify(lines, null, 2)};
`;
  writeFileSync(DATA_TS, body, 'utf8');
  console.log(`data  -> ${DATA_TS.replace(ROOT, '.')}  (${model.uniqueStops.length} arrets uniques, ${model.lines.length} lignes)`);
}

function readEnv() {
  const env = {};
  for (const line of readFileSync(ENV, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function commitSupabase(model) {
  const env = readEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY manquants dans scripts/scrapers/buses/.env');
  const BASE = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
  const KEY = env.SUPABASE_SERVICE_KEY;
  // helper PostgREST (service key = bypass RLS)
  async function pg(method, path, { body, prefer } = {}) {
    const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
    if (prefer) headers.Prefer = prefer;
    const r = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    if (!r.ok) throw new Error(`${method} ${path} -> HTTP ${r.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }
  const upsert = (table, rows, onConflict) => pg('POST', `/${table}?on_conflict=${onConflict}`, { body: rows, prefer: 'resolution=merge-duplicates,return=minimal' });
  const insert = (table, rows) => pg('POST', `/${table}`, { body: rows, prefer: 'return=minimal' });
  const del = (table, filter) => pg('DELETE', `/${table}?${filter}`, { prefer: 'return=minimal' });
  const selIn = (table, col, vals, select) => pg('GET', `/${table}?${col}=in.(${vals.map((v) => encodeURIComponent(v)).join(',')})&select=${select}`);

  // 1. operator
  await upsert('bus_operators', [{ id: 'agncitybus', name: 'Agios Nikolaos City Bus', region: 'east', source_url: SOURCE_URL }], 'id');

  // 2. arrets (upsert par slug unique) puis relire les id
  const stopRows = model.uniqueStops.map((u) => ({
    slug: u.slug, name: u.name, name_el: u.nameEl, lat: u.lat, lng: u.lng,
    prefecture: 'LAS', coords_source: 'agncitybus', coords_confidence: 'high', needs_review: false,
  }));
  await upsert('bus_stops', stopRows, 'slug');
  const stopIdRows = await selIn('bus_stops', 'slug', model.uniqueStops.map((u) => u.slug), 'id,slug');
  const idBySlug = new Map(stopIdRows.map((r) => [r.slug, r.id]));

  // 3. lignes (upsert par code) puis relire les id
  const lineRows = model.lines.map((l) => ({
    code: l.code, code_official: null, name: l.name, operator_id: 'agncitybus', source: 'agncitybus',
    geometry: l.geometry, total_minutes: l.totalMinutes, length_km: l.lengthKm,
    partial_geo: false, color: l.hex, prefecture: 'LAS', osm_id: null,
  }));
  await upsert('bus_lines', lineRows, 'code');
  const lineIdRows = await selIn('bus_lines', 'code', model.lines.map((l) => l.code), 'id,code');
  const idByCode = new Map(lineIdRows.map((r) => [r.code, r.id]));

  // 4. bus_line_stops : reset des lignes agncitybus puis insert
  const lineIds = model.lines.map((l) => idByCode.get(l.code));
  await del('bus_line_stops', `line_id=in.(${lineIds.join(',')})`);
  const lsRows = [];
  for (const l of model.lines) {
    const lineId = idByCode.get(l.code);
    const seen = new Set();
    for (const s of l.stops) {
      const stopId = idBySlug.get(s.stop.slug);
      if (seen.has(stopId)) continue; // PK (line_id, stop_id) : un arret partage 2x sur une meme ligne = garder le 1er
      seen.add(stopId);
      lsRows.push({ line_id: lineId, stop_id: stopId, seq: s.seq, cumulative_km: Math.round(s.cumKm), cumulative_minutes: Math.round(s.cumMin) });
    }
  }
  await insert('bus_line_stops', lsRows);

  // 5. bus_routes : reset operator agncitybus puis insert (1 par ligne)
  await del('bus_routes', `operator_id=eq.agncitybus`);
  const now = new Date().toISOString();
  const routeRows = model.lines.map((l) => ({
    operator_id: 'agncitybus', line_id: idByCode.get(l.code),
    from_place: l.from, to_place: l.to, to_slug: null, season: 'all',
    duration: `${l.totalMinutes}min`, duration_estimated: true,
    price_eur: null, price_estimated: false,
    frequency: `Every ${HEADWAY_MIN} min`,
    departures: l.departures,
    departures_by_day: [{ days: 'Every Day', times: l.departures }],
    via_stops: l.stops.slice(1, -1).map((s) => s.stop.name),
    source_url: SOURCE_URL, scraped_at: now,
  }));
  await insert('bus_routes', routeRows);

  console.log(`\nSupabase COMMIT OK :`);
  console.log(`  bus_operators : agncitybus`);
  console.log(`  bus_stops     : ${stopRows.length} upsert`);
  console.log(`  bus_lines     : ${lineRows.length} upsert`);
  console.log(`  bus_line_stops: ${lsRows.length} insert`);
  console.log(`  bus_routes    : ${routeRows.length} insert`);
}

// ---------- main ----------
async function main() {
  const model = build();
  console.log('=== AgNik ingest (%s) ===', COMMIT ? 'COMMIT' : 'DRY-RUN');
  for (const l of model.lines) {
    const last = l.stops[l.stops.length - 1];
    console.log(`  ${l.code} ${l.color.padEnd(6)} len=${l.lengthKm}km  ~${l.totalMinutes}min  ${l.stops.length} arrets  cumKm[last]=${last.cumKm.toFixed(2)}  from="${l.from}" to="${l.to}"`);
    // check monotonie
    const mono = l.stops.every((s, i) => i === 0 || s.cumKm >= l.stops[i - 1].cumKm);
    if (!mono) console.log(`    ⚠️ cumuls NON monotones !`);
    // check slugs uniques intra-ligne (garantit idxOf/cumMin coherents cote calculateur)
    const slugs = l.stops.map((s) => s.stop.slug);
    if (new Set(slugs).size !== slugs.length) console.log(`    ⚠️ slugs DUPLIQUES intra-ligne !`);
  }
  console.log(`  arrets uniques (dedup): ${model.uniqueStops.length} (sur ${model.lines.reduce((n, l) => n + l.stops.length, 0)} occurrences)`);
  console.log(`  departures/jour: ${model.departures.length} (${model.departures[0]}..${model.departures[model.departures.length - 1]})`);

  writeDataTs(model);

  if (COMMIT) await commitSupabase(model);
  else console.log('\n(dry-run : Supabase NON ecrit. Relancer avec --commit pour ingerer.)');
}

main().catch((e) => { console.error('ERREUR:', e.message || e); process.exit(1); });
