#!/usr/bin/env node
/**
 * Ingest générique d'un réseau bus urbain citybus.gr dans crete.direct.
 * Lit data/citybus-<city>/dump.json (cf citybus_fetch.mjs). Produit :
 *   1. src/data/<dataName>.ts : export CITYBUS_DATA (type CitybusData) pour le planner.
 *   2. --commit : upsert Supabase (bus_operators/bus_lines/bus_stops/bus_line_stops).
 *      PAS de bus_routes (cadence non uniforme -> pas d'horaire inventé, pas de bus estimé).
 *
 * Villes (cf CITIES) : irakleio (Heraklion), chania.
 * Usage :
 *   node scripts/citybus_ingest.mjs --city chania            # dry-run (écrit le .ts)
 *   node scripts/citybus_ingest.mjs --city chania --commit   # + Supabase prod
 *
 * Cumuls = distance chaîne-d'arrêts (haversine) x détour, / vitesse urbaine. Zéro horaire.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV = join(ROOT, 'scripts', 'scrapers', 'buses', '.env');
const COMMIT = process.argv.includes('--commit');

const CITIES = {
  irakleio: {
    operatorId: 'urban-her', operatorName: 'Heraklion Urban Bus (Astiko KTEL Irakleiou)',
    prefecture: 'HER', stopPrefix: 'hkl-', linePrefix: 'HKL-',
    sourceUrl: 'https://astiko-irakleiou.gr/', dataName: 'heraklion-bus', cityLabel: 'Heraklion',
  },
  chania: {
    operatorId: 'urban-cha', operatorName: 'Chania Urban Bus (Astiko KTEL Chanion)',
    prefecture: 'CHA', stopPrefix: 'cha-', linePrefix: 'CHA-',
    sourceUrl: 'https://chania.citybus.gr/', dataName: 'chania-bus', cityLabel: 'Chania',
  },
};

const cityArg = (process.argv.find((a) => a.startsWith('--city=')) || '').split('=')[1]
  || process.argv[process.argv.indexOf('--city') + 1];
const CITY = CITIES[cityArg];
if (!CITY) { console.error(`--city requis parmi : ${Object.keys(CITIES).join(', ')}`); process.exit(1); }

const DUMP = join(ROOT, 'data', `citybus-${cityArg}`, 'dump.json');
const DATA_TS = join(ROOT, 'src', 'data', `${CITY.dataName}.ts`);
const SOURCE = 'citybus';
const URBAN_SPEED_KMH = 18;
const DETOUR = 1.3;

// ---------- geo ----------
const R = 6371;
const toRad = (d) => (d * Math.PI) / 180;
function haversineKm(a, b) {
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function polyLengthKm(poly) { let t = 0; for (let i = 1; i < poly.length; i++) t += haversineKm(poly[i - 1], poly[i]); return t; }

// ---------- name / slug ----------
const GREEK_MAP = { Α: 'A', Β: 'V', Γ: 'G', Δ: 'D', Ε: 'E', Ζ: 'Z', Η: 'I', Θ: 'Th', Ι: 'I', Κ: 'K', Λ: 'L', Μ: 'M', Ν: 'N', Ξ: 'X', Ο: 'O', Π: 'P', Ρ: 'R', Σ: 'S', Τ: 'T', Υ: 'Y', Φ: 'F', Χ: 'Ch', Ψ: 'Ps', Ω: 'O', ά: 'a', έ: 'e', ή: 'i', ί: 'i', ό: 'o', ύ: 'y', ώ: 'o', Ά: 'A', Έ: 'E', Ή: 'I', Ί: 'I', Ό: 'O', Ύ: 'Y', Ώ: 'O' };
function deGreek(s) { return s.replace(/[Α-Ωα-ωΆΈΉΊΌΎΏάέήίόύώ]/g, (c) => GREEK_MAP[c] ?? ''); }
function displayName(nameEn, nameEl) {
  let n = (nameEn && nameEn.trim()) ? nameEn.trim() : deGreek(nameEl || '').trim();
  n = n.replace(/\s+/g, ' ');
  return n.split(' ').map((w) => (w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w) ? w[0] + w.slice(1).toLowerCase() : w)).join(' ');
}
function slugify(s) {
  return deGreek(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------- build ----------
function build() {
  const dump = JSON.parse(readFileSync(DUMP, 'utf8'));
  const stopByCode = new Map(dump.stops.map((s) => [s.code, {
    code: s.code, name: s.name, nameEn: s.nameEn, lat: Number(s.latitude), lng: Number(s.longitude),
  }]));
  const seqOf = (rc) => (dump.sequences[rc] || []).slice().sort((a, b) => a.sequence - b.sequence);

  const activeLines = dump.lines.filter((l) => l.routes.some((r) => seqOf(r.code).length >= 2));

  const usedCodes = new Set();
  for (const l of activeLines) for (const r of l.routes) for (const st of seqOf(r.code)) usedCodes.add(st.code);

  const slugByCode = new Map();
  const stops = {};
  const usedSlugs = new Set();
  for (const code of [...usedCodes].sort()) {
    const s = stopByCode.get(code);
    if (!s) continue;
    const base = CITY.stopPrefix + (slugify(s.nameEn || s.name) || 'stop');
    let slug = base, n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);
    slugByCode.set(code, slug);
    stops[slug] = { slug, name: displayName(s.nameEn, s.name), nameEl: (s.name || '').trim(), lat: s.lat, lng: s.lng };
  }

  function routeStopsWithCumuls(rc) {
    const seq = seqOf(rc);
    const out = [];
    let cumKm = 0;
    for (let i = 0; i < seq.length; i++) {
      const s = stopByCode.get(seq[i].code);
      if (!s) continue;
      if (out.length > 0) { const prev = out[out.length - 1]; cumKm += haversineKm([prev.lat, prev.lng], [s.lat, s.lng]) * DETOUR; }
      out.push({ slug: slugByCode.get(seq[i].code), seq: out.length, lat: s.lat, lng: s.lng, cumKm: +cumKm.toFixed(3), cumMin: +((cumKm / URBAN_SPEED_KMH) * 60).toFixed(2) });
    }
    return out;
  }

  const lines = [];
  const routesOut = [];
  for (const l of activeLines) {
    const routes = l.routes.filter((r) => seqOf(r.code).length >= 2);
    const primary = routes.reduce((a, b) => (seqOf(b.code).length > seqOf(a.code).length ? b : a));
    const primaryStops = routeStopsWithCumuls(primary.code);
    const polys = (dump.points[l.code] || [])
      .map((rp) => (rp.routePoints || []).slice().sort((a, b) => a.sequence - b.sequence).map((p) => [Number(p.latitude), Number(p.longitude)]))
      .filter((p) => p.length >= 2);
    const bestPoly = polys.sort((a, b) => b.length - a.length)[0] || null;
    const geometry = bestPoly ? bestPoly.map(([lat, lng]) => [lng, lat]) : null;
    const lengthKm = bestPoly ? +polyLengthKm(bestPoly).toFixed(3) : +(primaryStops[primaryStops.length - 1]?.cumKm || 0).toFixed(3);
    const totalMinutes = Math.max(1, Math.round(primaryStops[primaryStops.length - 1]?.cumMin || 1));
    const code = CITY.linePrefix + l.code;
    lines.push({ code, apiCode: l.code, name: displayName(l.nameEn, l.name), nameEl: (l.name || '').trim(), hex: l.color || null, textHex: l.textColor || null, geometry, lengthKm, totalMinutes, partialGeo: !bestPoly, primaryStops });
    for (const r of routes) {
      routesOut.push({ code: r.code, lineCode: code, name: displayName(null, r.name), direction: r.direction ?? null, stops: routeStopsWithCumuls(r.code).map((s) => ({ slug: s.slug, seq: s.seq, cumKm: s.cumKm, cumMin: s.cumMin })) });
    }
  }
  return { stops, lines, routes: routesOut };
}

// ---------- output .ts ----------
function writeDataTs(model) {
  const linesMeta = model.lines.map((l) => ({ code: l.code, apiCode: l.apiCode, name: l.name, nameEl: l.nameEl, hex: l.hex, textHex: l.textHex, totalMinutes: l.totalMinutes, lengthKm: l.lengthKm }));
  const data = {
    info: { operator: CITY.operatorName, sourceUrl: CITY.sourceUrl, city: CITY.cityLabel },
    stops: model.stops, lines: linesMeta, routes: model.routes,
  };
  const body = `// AUTO-GENERE par scripts/citybus_ingest.mjs --city ${cityArg} — NE PAS EDITER A LA MAIN.
// Reseau bus urbain de ${CITY.cityLabel} (plateforme citybus.gr), aspire le ${new Date().toISOString().slice(0, 10)}.
// Temps = estimations (vitesse urbaine ${URBAN_SPEED_KMH} km/h), pas d'horaire officiel.
import type { CitybusData } from "@/lib/citybus/types";

export const CITYBUS_DATA: CitybusData = ${JSON.stringify(data, null, 2)};
`;
  writeFileSync(DATA_TS, body, 'utf8');
  console.log(`data  -> ${DATA_TS.replace(ROOT, '.')}  (${Object.keys(model.stops).length} arrets, ${model.lines.length} lignes, ${model.routes.length} routes)`);
}

// ---------- Supabase ----------
function readEnv() {
  const env = {};
  for (const line of readFileSync(ENV, 'utf8').split(/\r?\n/)) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
  return env;
}

async function commitSupabase(model) {
  const env = readEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY manquants');
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
  const upsert = (t, rows, oc) => pg('POST', `/${t}?on_conflict=${oc}`, { body: rows, prefer: 'resolution=merge-duplicates,return=minimal' });
  const insert = (t, rows) => pg('POST', `/${t}`, { body: rows, prefer: 'return=minimal' });
  const del = (t, f) => pg('DELETE', `/${t}?${f}`, { prefer: 'return=minimal' });
  const selIn = (t, c, v, sel) => pg('GET', `/${t}?${c}=in.(${v.map((x) => encodeURIComponent(x)).join(',')})&select=${sel}`);

  await upsert('bus_operators', [{ id: CITY.operatorId, name: CITY.operatorName, region: 'east', source_url: CITY.sourceUrl }], 'id');

  const stopRows = Object.values(model.stops).map((u) => ({ slug: u.slug, name: u.name, name_el: u.nameEl, lat: u.lat, lng: u.lng, prefecture: CITY.prefecture, coords_source: SOURCE, coords_confidence: 'high', needs_review: false }));
  await upsert('bus_stops', stopRows, 'slug');
  const stopIdRows = await selIn('bus_stops', 'slug', Object.keys(model.stops), 'id,slug');
  const idBySlug = new Map(stopIdRows.map((r) => [r.slug, r.id]));

  const lineRows = model.lines.map((l) => ({ code: l.code, code_official: l.apiCode, name: l.name, operator_id: CITY.operatorId, source: SOURCE, geometry: l.geometry, total_minutes: l.totalMinutes, length_km: l.lengthKm, partial_geo: l.partialGeo, color: l.hex, prefecture: CITY.prefecture, osm_id: null }));
  await upsert('bus_lines', lineRows, 'code');
  const lineIdRows = await selIn('bus_lines', 'code', model.lines.map((l) => l.code), 'id,code');
  const idByCode = new Map(lineIdRows.map((r) => [r.code, r.id]));

  const lineIds = model.lines.map((l) => idByCode.get(l.code)).filter(Boolean);
  await del('bus_line_stops', `line_id=in.(${lineIds.join(',')})`);
  const lsRows = [];
  for (const l of model.lines) {
    const lineId = idByCode.get(l.code);
    const seen = new Set();
    for (const s of l.primaryStops) {
      const stopId = idBySlug.get(s.slug);
      if (stopId == null || seen.has(stopId)) continue;
      seen.add(stopId);
      lsRows.push({ line_id: lineId, stop_id: stopId, seq: s.seq, cumulative_km: Math.round(s.cumKm), cumulative_minutes: Math.round(s.cumMin) });
    }
  }
  await insert('bus_line_stops', lsRows);

  console.log(`\nSupabase COMMIT OK (${CITY.cityLabel}) :`);
  console.log(`  bus_operators : ${CITY.operatorId}`);
  console.log(`  bus_stops     : ${stopRows.length} upsert`);
  console.log(`  bus_lines     : ${lineRows.length} upsert`);
  console.log(`  bus_line_stops: ${lsRows.length} insert`);
}

async function main() {
  const model = build();
  console.log('=== citybus ingest %s (%s) ===', CITY.cityLabel, COMMIT ? 'COMMIT' : 'DRY-RUN');
  for (const l of model.lines) {
    const mono = l.primaryStops.every((s, i) => i === 0 || s.cumKm >= l.primaryStops[i - 1].cumKm);
    console.log(`  ${l.code.padEnd(7)} ${(l.name || '').slice(0, 24).padEnd(24)} ${String(l.primaryStops.length).padStart(2)} arrets ~${String(l.totalMinutes).padStart(3)}min geo=${l.geometry ? l.geometry.length + 'pts' : 'FALLBACK'} ${mono ? '' : '⚠️NON-MONO'}`);
  }
  console.log(`  lignes: ${model.lines.length} | arrets: ${Object.keys(model.stops).length} | routes: ${model.routes.length}`);
  writeDataTs(model);
  if (COMMIT) await commitSupabase(model);
  else console.log('\n(dry-run : Supabase NON ecrit.)');
}

main().catch((e) => { console.error('ERREUR:', e.message || e); process.exit(1); });
