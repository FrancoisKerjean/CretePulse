#!/usr/bin/env node
/**
 * Ingest du reseau bus urbain d'Heraklion (Αστικό ΚΤΕΛ Ηρακλείου, plateforme citybus.gr)
 * dans crete.direct. Miroir de agncitybus_ingest.mjs (Agios Nikolaos), adapte a l'API
 * citybus (26 lignes / 528 arrets / 81 routes) et a l'echelle d'Heraklion.
 *
 * Source : data/citybus-irakleio/dump.json (cf citybus_irakleio_fetch.mjs).
 * Produit :
 *   1. Ecritures Supabase (kairos-n8n, idempotentes, prefixe hkl-/HKL- => zero collision) :
 *        bus_operators(urban-her), bus_stops (dedup par slug), bus_lines (source=citybus,
 *        geometry = tracer le + long de la ligne), bus_line_stops (route primaire + cumuls).
 *      => alimente la CARTE /live (tracer + arrets). PAS de bus_routes : la cadence
 *         Heraklion n'est pas uniforme (pas de headway a inventer) et le live viendra du GPS.
 *   2. src/data/heraklion-bus.ts : data statique typee pour le CALCULATEUR de trajets urbain
 *        (toutes les routes actives = reachabilite complete, direct + 1 correspondance).
 *
 * Modes :
 *   node scripts/citybus_irakleio_ingest.mjs            # dry-run : ecrit le .ts, N'ECRIT PAS la DB
 *   node scripts/citybus_irakleio_ingest.mjs --commit   # + upsert Supabase prod (service key)
 *
 * Honnetete data : cumuls = distance chaine-d'arrets (haversine) x facteur detour, /vitesse
 * urbaine. Zero horaire invente. Est. de temps de trajet, flagge comme tel cote UI.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DUMP = join(ROOT, 'data', 'citybus-irakleio', 'dump.json');
const DATA_TS = join(ROOT, 'src', 'data', 'heraklion-bus.ts');
const ENV = join(ROOT, 'scripts', 'scrapers', 'buses', '.env');
const COMMIT = process.argv.includes('--commit');

const OPERATOR_ID = 'urban-her';                 // deja seede dans bus_operators
const OPERATOR_NAME = 'Heraklion Urban Bus (Astiko KTEL Irakleiou)';
const SOURCE = 'citybus';                        // valeur bus_lines.source (union TS a etendre)
const PREFECTURE = 'HER';
const SOURCE_URL = 'https://astiko-irakleiou.gr/';
const URBAN_SPEED_KMH = 18;                      // vitesse urbaine effective (arrets frequents)
const DETOUR = 1.3;                              // routes reelles vs distance a vol d'oiseau
const STOP_PREFIX = 'hkl-';
const LINE_PREFIX = 'HKL-';

// ---------- geo ----------
const R = 6371;
const toRad = (d) => (d * Math.PI) / 180;
function haversineKm(a, b) {
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function polyLengthKm(poly) { // poly: [[lat,lng],...]
  let t = 0;
  for (let i = 1; i < poly.length; i++) t += haversineKm(poly[i - 1], poly[i]);
  return t;
}

// ---------- name / slug ----------
const GREEK_MAP = { Α: 'A', Β: 'V', Γ: 'G', Δ: 'D', Ε: 'E', Ζ: 'Z', Η: 'I', Θ: 'Th', Ι: 'I', Κ: 'K', Λ: 'L', Μ: 'M', Ν: 'N', Ξ: 'X', Ο: 'O', Π: 'P', Ρ: 'R', Σ: 'S', Τ: 'T', Υ: 'Y', Φ: 'F', Χ: 'Ch', Ψ: 'Ps', Ω: 'O', ά: 'a', έ: 'e', ή: 'i', ί: 'i', ό: 'o', ύ: 'y', ώ: 'o', Ά: 'A', Έ: 'E', Ή: 'I', Ί: 'I', Ό: 'O', Ύ: 'Y', Ώ: 'O' };
function deGreek(s) { return s.replace(/[Α-Ωα-ωΆΈΉΊΌΎΏάέήίόύώ]/g, (c) => GREEK_MAP[c] ?? ''); }
/** Nettoie un nom d'affichage (EN si dispo, sinon translitteration du grec). Title Case doux. */
function displayName(nameEn, nameEl) {
  let n = (nameEn && nameEn.trim()) ? nameEn.trim() : deGreek(nameEl || '').trim();
  n = n.replace(/\s+/g, ' ');
  return n.split(' ').map((w) => (w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w)
    ? w[0] + w.slice(1).toLowerCase() : w)).join(' ');
}
function slugify(s) {
  return deGreek(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------- build ----------
function build() {
  const dump = JSON.parse(readFileSync(DUMP, 'utf8'));
  // normalise : l'API expose latitude/longitude (pas lat/lng)
  const stopByCode = new Map(dump.stops.map((s) => [s.code, {
    code: s.code, name: s.name, nameEn: s.nameEn,
    lat: Number(s.latitude), lng: Number(s.longitude),
  }]));
  const seqOf = (routeCode) => (dump.sequences[routeCode] || []).slice().sort((a, b) => a.sequence - b.sequence);

  // lignes actives = au moins une route avec une sequence >= 2 arrets
  const activeLines = dump.lines.filter((l) =>
    l.routes.some((r) => seqOf(r.code).length >= 2));

  // 1. codes d'arrets reellement utilises par les routes actives
  const usedCodes = new Set();
  for (const l of activeLines)
    for (const r of l.routes)
      for (const st of seqOf(r.code)) usedCodes.add(st.code);

  // 2. slugs deterministes (tri par code), 1 code = 1 arret (la liste /stops est deja unique)
  const slugByCode = new Map();
  const stops = {}; // slug -> {slug,name,nameEl,lat,lng}
  const usedSlugs = new Set();
  for (const code of [...usedCodes].sort()) {
    const s = stopByCode.get(code);
    if (!s) continue;
    const base = STOP_PREFIX + (slugify(s.nameEn || s.name) || 'stop');
    let slug = base, n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);
    slugByCode.set(code, slug);
    stops[slug] = { slug, name: displayName(s.nameEn, s.name), nameEl: (s.name || '').trim(), lat: s.lat, lng: s.lng };
  }

  // 3. cumuls d'une route via la chaine d'arrets (haversine x detour, /vitesse)
  function routeStopsWithCumuls(routeCode) {
    const seq = seqOf(routeCode);
    const out = [];
    let cumKm = 0;
    for (let i = 0; i < seq.length; i++) {
      const s = stopByCode.get(seq[i].code);
      if (!s) continue;
      if (out.length > 0) {
        const prev = out[out.length - 1];
        cumKm += haversineKm([prev.lat, prev.lng], [s.lat, s.lng]) * DETOUR;
      }
      out.push({
        slug: slugByCode.get(seq[i].code), seq: out.length,
        lat: s.lat, lng: s.lng,
        cumKm: +cumKm.toFixed(3), cumMin: +((cumKm / URBAN_SPEED_KMH) * 60).toFixed(2),
      });
    }
    return out;
  }

  // 4. modele par ligne
  const lines = [];
  const routesOut = []; // pour le calculateur (toutes les routes actives)
  for (const l of activeLines) {
    const routes = l.routes.filter((r) => seqOf(r.code).length >= 2);
    // route primaire = sequence la plus longue (representative de la ligne)
    const primary = routes.reduce((a, b) => (seqOf(b.code).length > seqOf(a.code).length ? b : a));
    const primaryStops = routeStopsWithCumuls(primary.code);

    // geometry = le tracer le plus long parmi les routePoints de la ligne
    const polys = (dump.points[l.code] || [])
      .map((rp) => (rp.routePoints || []).slice().sort((a, b) => a.sequence - b.sequence)
        .map((p) => [Number(p.latitude), Number(p.longitude)]))
      .filter((p) => p.length >= 2);
    const bestPoly = polys.sort((a, b) => b.length - a.length)[0] || null;
    const geometry = bestPoly ? bestPoly.map(([lat, lng]) => [lng, lat]) : null; // [lng,lat] GeoJSON
    const lengthKm = bestPoly ? +polyLengthKm(bestPoly).toFixed(3)
      : +(primaryStops[primaryStops.length - 1]?.cumKm || 0).toFixed(3);
    const totalMinutes = Math.max(1, Math.round(primaryStops[primaryStops.length - 1]?.cumMin || 1));

    const code = LINE_PREFIX + l.code;
    lines.push({
      code, apiCode: l.code,
      name: displayName(l.nameEn, l.name), nameEl: (l.name || '').trim(),
      hex: l.color || null, textHex: l.textColor || null,
      geometry, lengthKm, totalMinutes, partialGeo: !bestPoly,
      primaryStops,
    });
    for (const r of routes) {
      routesOut.push({
        code: r.code, lineCode: code,
        name: displayName(null, r.name), direction: r.direction ?? null,
        stops: routeStopsWithCumuls(r.code).map((s) => ({ slug: s.slug, seq: s.seq, cumKm: s.cumKm, cumMin: s.cumMin })),
      });
    }
  }

  return { stops, lines, routes: routesOut };
}

// ---------- output .ts ----------
function writeDataTs(model) {
  const linesMeta = model.lines.map((l) => ({
    code: l.code, apiCode: l.apiCode, name: l.name, nameEl: l.nameEl,
    hex: l.hex, textHex: l.textHex, totalMinutes: l.totalMinutes, lengthKm: l.lengthKm,
  }));
  const body = `// AUTO-GENERE par scripts/citybus_irakleio_ingest.mjs — NE PAS EDITER A LA MAIN.
// Reseau bus urbain d'Heraklion (Αστικό ΚΤΕΛ Ηρακλείου, plateforme citybus.gr),
// aspire le ${new Date().toISOString().slice(0, 10)}. Source du calculateur urbain
// (src/lib/urban-journey.ts, generalise). Temps = estimations (vitesse urbaine ${URBAN_SPEED_KMH} km/h),
// pas d'horaire officiel (la cadence Heraklion n'est pas uniforme).

export interface HklStop { slug: string; name: string; nameEl: string; lat: number; lng: number; }
export interface HklLine {
  code: string; apiCode: string; name: string; nameEl: string;
  hex: string | null; textHex: string | null; totalMinutes: number; lengthKm: number;
}
export interface HklRouteStop { slug: string; seq: number; cumKm: number; cumMin: number; }
export interface HklRoute {
  code: string; lineCode: string; name: string; direction: number | null; stops: HklRouteStop[];
}

export const HKL_INFO = {
  operator: ${JSON.stringify(OPERATOR_NAME)},
  sourceUrl: ${JSON.stringify(SOURCE_URL)},
  city: "Heraklion",
  note: "Frequencies vary by line; check the operator for exact times.",
} as const;

export const HKL_STOPS: Record<string, HklStop> = ${JSON.stringify(model.stops, null, 2)};

export const HKL_LINES: HklLine[] = ${JSON.stringify(linesMeta, null, 2)};

export const HKL_ROUTES: HklRoute[] = ${JSON.stringify(model.routes, null, 2)};
`;
  writeFileSync(DATA_TS, body, 'utf8');
  console.log(`data  -> ${DATA_TS.replace(ROOT, '.')}  (${Object.keys(model.stops).length} arrets, ${model.lines.length} lignes, ${model.routes.length} routes)`);
}

// ---------- Supabase ----------
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
  await upsert('bus_operators', [{ id: OPERATOR_ID, name: OPERATOR_NAME, region: 'east', source_url: SOURCE_URL }], 'id');

  // 2. arrets (upsert par slug) puis relire les id
  const stopRows = Object.values(model.stops).map((u) => ({
    slug: u.slug, name: u.name, name_el: u.nameEl, lat: u.lat, lng: u.lng,
    prefecture: PREFECTURE, coords_source: SOURCE, coords_confidence: 'high', needs_review: false,
  }));
  await upsert('bus_stops', stopRows, 'slug');
  const stopIdRows = await selIn('bus_stops', 'slug', Object.keys(model.stops), 'id,slug');
  const idBySlug = new Map(stopIdRows.map((r) => [r.slug, r.id]));

  // 3. lignes (upsert par code) puis relire les id
  const lineRows = model.lines.map((l) => ({
    code: l.code, code_official: l.apiCode, name: l.name, operator_id: OPERATOR_ID, source: SOURCE,
    geometry: l.geometry, total_minutes: l.totalMinutes, length_km: l.lengthKm,
    partial_geo: l.partialGeo, color: l.hex, prefecture: PREFECTURE, osm_id: null,
  }));
  await upsert('bus_lines', lineRows, 'code');
  const lineIdRows = await selIn('bus_lines', 'code', model.lines.map((l) => l.code), 'id,code');
  const idByCode = new Map(lineIdRows.map((r) => [r.code, r.id]));

  // 4. bus_line_stops : reset des lignes urban-her puis insert (route primaire par ligne)
  const lineIds = model.lines.map((l) => idByCode.get(l.code)).filter(Boolean);
  await del('bus_line_stops', `line_id=in.(${lineIds.join(',')})`);
  const lsRows = [];
  for (const l of model.lines) {
    const lineId = idByCode.get(l.code);
    const seen = new Set();
    for (const s of l.primaryStops) {
      const stopId = idBySlug.get(s.slug);
      if (stopId == null || seen.has(stopId)) continue; // PK (line_id, stop_id)
      seen.add(stopId);
      lsRows.push({ line_id: lineId, stop_id: stopId, seq: s.seq, cumulative_km: Math.round(s.cumKm), cumulative_minutes: Math.round(s.cumMin) });
    }
  }
  await insert('bus_line_stops', lsRows);

  console.log(`\nSupabase COMMIT OK :`);
  console.log(`  bus_operators : ${OPERATOR_ID}`);
  console.log(`  bus_stops     : ${stopRows.length} upsert`);
  console.log(`  bus_lines     : ${lineRows.length} upsert`);
  console.log(`  bus_line_stops: ${lsRows.length} insert`);
  console.log(`  (bus_routes   : volontairement NON ecrit — cadence non uniforme)`);
}

// ---------- main ----------
async function main() {
  const model = build();
  console.log('=== Heraklion citybus ingest (%s) ===', COMMIT ? 'COMMIT' : 'DRY-RUN');
  for (const l of model.lines) {
    const last = l.primaryStops[l.primaryStops.length - 1];
    const mono = l.primaryStops.every((s, i) => i === 0 || s.cumKm >= l.primaryStops[i - 1].cumKm);
    console.log(`  ${l.code.padEnd(7)} ${(l.name || '').slice(0, 26).padEnd(26)} ${String(l.primaryStops.length).padStart(2)} arrets  len=${String(l.lengthKm).padStart(6)}km ~${String(l.totalMinutes).padStart(3)}min  geo=${l.geometry ? l.geometry.length + 'pts' : 'FALLBACK'} ${mono ? '' : '⚠️NON-MONO'}`);
  }
  const totalStops = Object.keys(model.stops).length;
  console.log(`  lignes actives: ${model.lines.length}  |  arrets uniques: ${totalStops}  |  routes (calc): ${model.routes.length}`);
  const noGeo = model.lines.filter((l) => !l.geometry).length;
  if (noGeo) console.log(`  lignes sans tracer (fallback segment droit): ${noGeo}`);

  writeDataTs(model);

  if (COMMIT) await commitSupabase(model);
  else console.log('\n(dry-run : Supabase NON ecrit. Relancer avec --commit pour ingerer.)');
}

main().catch((e) => { console.error('ERREUR:', e.message || e); process.exit(1); });
