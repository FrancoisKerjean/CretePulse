#!/usr/bin/env node
/**
 * Fetch du reseau bus urbain d'Heraklion (Αστικό ΚΤΕΛ Ηρακλείου) via la plateforme
 * telematique citybus.gr (irakleio.citybus.gr, agency 110).
 *
 * L'API rest.citybus.gr exige un Bearer JWT servi EN CLAIR dans le HTML de la page
 * /el/stops (`const token = 'eyJ...'`). On le scrape puis on interroge l'API.
 *
 * Produit : data/citybus-irakleio/dump.json (raw, non modelise), consomme par
 * citybus_irakleio_ingest.mjs.
 *
 * Endpoints (base https://rest.citybus.gr/api/v1) :
 *   /el/110/lines                      -> lignes (code, nom GR, couleur, routes[])
 *   /el/110/stops                      -> arrets (code, nom, lat/lng, lineCodes[], routeCodes[])
 *   /110/lines/{lineCode}/points       -> tracer GPS par route variant
 *   /el/110/routes/{routeCode}/sequence-> sequence ordonnee des arrets (codes)
 *
 * Usage : node scripts/citybus_irakleio_fetch.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'data', 'citybus-irakleio');
const OUT = join(OUT_DIR, 'dump.json');

const PAGE = 'https://irakleio.citybus.gr/el/stops';
const API = 'https://rest.citybus.gr/api/v1';
const AGENCY = '110';
const LANG = 'el';
const UA = 'Mozilla/5.0 (crete.direct bus-network fetch)';
const PACE_MS = 250; // pacing poli entre appels API

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Scrape le JWT Bearer depuis le HTML de la page. */
async function fetchToken() {
  const r = await fetch(PAGE, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`page ${PAGE} -> HTTP ${r.status}`);
  const html = await r.text();
  const m = html.match(/const token\s*=\s*'([^']+)'/);
  if (!m) throw new Error('token JWT introuvable dans le HTML');
  return m[1];
}

function makeApi(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Referer: 'https://irakleio.citybus.gr/',
    'User-Agent': UA,
  };
  return async function api(path) {
    const r = await fetch(`${API}${path}`, { headers });
    if (r.status === 401) throw Object.assign(new Error('401'), { code: 401 });
    if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
    return r.json();
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log('token: scraping...');
  let token = await fetchToken();
  let api = makeApi(token);

  // retry wrapper : re-scrape le token si 401
  async function get(path) {
    try {
      return await api(path);
    } catch (e) {
      if (e.code === 401) {
        console.log('  401 -> re-scrape token');
        token = await fetchToken();
        api = makeApi(token);
        return api(path);
      }
      throw e;
    }
  }

  console.log('lines (el)...');
  const lines = await get(`/${LANG}/${AGENCY}/lines`);
  console.log(`  ${lines.length} lignes`);
  await sleep(PACE_MS);

  console.log('lines (en) pour noms anglais...');
  const linesEn = await get(`/en/${AGENCY}/lines`);
  const enLineName = new Map(linesEn.map((l) => [l.code, l.name]));
  for (const l of lines) l.nameEn = enLineName.get(l.code) || null;
  await sleep(PACE_MS);

  console.log('stops (el)...');
  const stops = await get(`/${LANG}/${AGENCY}/stops`);
  console.log(`  ${stops.length} arrets`);
  await sleep(PACE_MS);

  console.log('stops (en) pour noms anglais...');
  const stopsEn = await get(`/en/${AGENCY}/stops`);
  const enStopName = new Map(stopsEn.map((s) => [s.code, s.name]));
  for (const s of stops) s.nameEn = enStopName.get(s.code) || null;

  // points par ligne (chaque appel renvoie tous les route variants de la ligne)
  const points = {};
  console.log('points (par ligne)...');
  for (const l of lines) {
    await sleep(PACE_MS);
    try {
      points[l.code] = await get(`/${AGENCY}/lines/${l.code}/points`);
      const nr = points[l.code].reduce((a, r) => a + (r.routePoints?.length || 0), 0);
      console.log(`  ligne ${l.code}: ${points[l.code].length} routes, ${nr} pts`);
    } catch (e) {
      console.log(`  ligne ${l.code}: ERREUR ${e.message}`);
      points[l.code] = [];
    }
  }

  // sequences par route variant
  const routeCodes = [...new Set(lines.flatMap((l) => l.routes.map((r) => r.code)))];
  const sequences = {};
  console.log(`sequences (${routeCodes.length} routes)...`);
  for (const rc of routeCodes) {
    await sleep(PACE_MS);
    try {
      sequences[rc] = await get(`/${LANG}/${AGENCY}/routes/${rc}/sequence`);
    } catch (e) {
      console.log(`  route ${rc}: ERREUR ${e.message}`);
      sequences[rc] = [];
    }
  }
  console.log(`  ${Object.keys(sequences).length} sequences`);

  const dump = {
    fetchedAt: new Date().toISOString(),
    source: 'irakleio.citybus.gr',
    api: API,
    agency: AGENCY,
    lines,
    stops,
    points,
    sequences,
  };
  writeFileSync(OUT, JSON.stringify(dump));
  console.log(`\ndump -> ${OUT.replace(ROOT, '.')}`);
  console.log(`  lines=${lines.length} stops=${stops.length} routes=${routeCodes.length}`);
}

main().catch((e) => {
  console.error('ERREUR:', e.message || e);
  process.exit(1);
});
