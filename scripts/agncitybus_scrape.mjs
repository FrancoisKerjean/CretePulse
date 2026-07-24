#!/usr/bin/env node
// Aspire le réseau bus urbain municipal d'Agios Nikolaos (agncitybus.gr) :
// tracés + arrêts (statique, dans les pages live_*.php) + échantillon API positions live.
// Source GPS live PUBLIQUE non authentifiée. Découverte 2026-07-01.
// Sortie : data/agncitybus/dump.json (brut) + lines.geojson (ingest carte /live).
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.agncitybus.gr';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'agncitybus');
const COLORS = ['yellow', 'red', 'green'];
const UA = 'Mozilla/5.0 (crete.direct bus ingest; +https://crete.direct)';

async function getText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.text();
}

function parseLine(html, color) {
  // Arrêts : L.marker([lat,lng] ...).bindPopup("<b>GR</b><br>EN<br>")
  const stops = [];
  const reM = /L\.marker\(\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\][\s\S]*?\.bindPopup\(\s*(["'`])([\s\S]*?)\3\s*\)/g;
  let m, seq = 0;
  while ((m = reM.exec(html))) {
    const parts = m[4].replace(/<br\s*\/?>/gi, '|').replace(/<[^>]+>/g, '').split('|').map(s => s.trim()).filter(Boolean);
    stops.push({ seq: seq++, lat: +m[1], lng: +m[2], name_gr: parts[0] || '', name_en: parts[1] || '' });
  }
  // Tracé : plus longue séquence contiguë de coords [35.x, 25.y] (gap < 30 chars entre points).
  const re = /\[\s*(35\.\d+)\s*,\s*(25\.\d+)\s*\]/g;
  let x, items = [];
  while ((x = re.exec(html))) items.push({ i: x.index, end: re.lastIndex, ll: [+x[1], +x[2]] });
  const runs = [];
  let cur = [];
  for (const it of items) {
    if (!cur.length) { cur = [it]; continue; }
    if (it.i - cur[cur.length - 1].end < 30) cur.push(it);
    else { runs.push(cur); cur = [it]; }
  }
  if (cur.length) runs.push(cur);
  runs.sort((a, b) => b.length - a.length);
  const polyline = (runs[0] || []).map(o => o.ll); // [lat, lng]
  const routeNum = Number((html.match(/get_location_route\.php\?route=(\d+)/) || [])[1]) || null;
  return { color, routeNum, stopCount: stops.length, pointCount: polyline.length, stops, polyline };
}

async function sampleLive(routeNums) {
  const out = {};
  for (const n of routeNums) {
    try {
      const t = await getText(`${BASE}/map/get_location_route.php?route=${n}`);
      out[n] = JSON.parse(t);
    } catch (e) { out[n] = { error: String(e) }; }
  }
  return out;
}

function toGeoJSON(lines) {
  const features = [];
  for (const l of lines) {
    features.push({
      type: 'Feature',
      properties: { kind: 'route', color: l.color, route: l.routeNum, source: 'agncitybus', operator: 'Dimos Agiou Nikolaou' },
      geometry: { type: 'LineString', coordinates: l.polyline.map(([lat, lng]) => [lng, lat]) },
    });
    for (const s of l.stops) {
      features.push({
        type: 'Feature',
        properties: { kind: 'stop', color: l.color, route: l.routeNum, seq: s.seq, name_gr: s.name_gr, name_en: s.name_en, source: 'agncitybus' },
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

async function main() {
  const lines = [];
  for (const c of COLORS) {
    const html = await getText(`${BASE}/map/live_${c}.php`);
    const l = parseLine(html, c);
    lines.push(l);
    console.log(`${c.padEnd(6)} route=${l.routeNum}  stops=${l.stopCount}  points=${l.pointCount}`);
  }
  const routeNums = [...new Set(lines.map(l => l.routeNum).filter(Boolean))].sort();
  const live = await sampleLive([...routeNums, ...routeNums.map(n => n + 3)].filter((v, i, a) => a.indexOf(v) === i));

  const dump = {
    source: 'agncitybus.gr',
    operator: "Municipalité d'Agios Nikolaos (Dimos Agiou Nikolaou)",
    network: 'Bus urbain gratuit Agios Nikolaos',
    scraped_at: new Date().toISOString(),
    live_api: {
      endpoint: `${BASE}/map/get_location_route.php?route={N}`,
      auth: 'none (public)',
      poll_seconds: 2.5,
      fields: 'id, latitude, longitude, speed, alt, sat, direction, timenow, route, number, imei, pinakida',
      sample: live,
    },
    lines,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, 'dump.json'), JSON.stringify(dump, null, 2), 'utf8');
  await writeFile(join(OUT_DIR, 'lines.geojson'), JSON.stringify(toGeoJSON(lines), null, 2), 'utf8');
  const totalStops = lines.reduce((s, l) => s + l.stopCount, 0);
  const totalPts = lines.reduce((s, l) => s + l.pointCount, 0);
  console.log(`\nOK -> ${OUT_DIR}`);
  console.log(`dump.json + lines.geojson : ${lines.length} lignes, ${totalStops} arrêts, ${totalPts} points de tracé`);
  console.log('Live sample routes actives :', Object.entries(live).filter(([, v]) => Array.isArray(v) && v.length).map(([k]) => k).join(', ') || 'aucune (hors service)');
}

main().catch(e => { console.error(e); process.exit(1); });
