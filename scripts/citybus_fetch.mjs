#!/usr/bin/env node
/**
 * Fetch générique d'un réseau bus urbain sur la plateforme citybus.gr.
 * L'API rest.citybus.gr exige un Bearer JWT servi EN CLAIR dans le HTML de la page
 * <sous-domaine>.citybus.gr/el/stops (`const token = 'eyJ...'`). On le scrape puis on
 * interroge l'API. Produit data/citybus-<city>/dump.json.
 *
 * Villes supportées (cf CITIES) : irakleio (Heraklion, agency 110), chania (agency 120).
 * Usage : node scripts/citybus_fetch.mjs --city chania
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CITIES = {
  irakleio: { subdomain: 'irakleio', agency: '110' },
  chania: { subdomain: 'chania', agency: '120' },
};

const cityArg = (process.argv.find((a) => a.startsWith('--city=')) || '').split('=')[1]
  || process.argv[process.argv.indexOf('--city') + 1];
const CITY = CITIES[cityArg];
if (!CITY) {
  console.error(`--city requis parmi : ${Object.keys(CITIES).join(', ')}`);
  process.exit(1);
}

const API = 'https://rest.citybus.gr/api/v1';
const AGENCY = CITY.agency;
const LANG = 'el';
const PAGE = `https://${CITY.subdomain}.citybus.gr/el/stops`;
const REFERER = `https://${CITY.subdomain}.citybus.gr/`;
const OUT_DIR = join(ROOT, 'data', `citybus-${cityArg}`);
const OUT = join(OUT_DIR, 'dump.json');
const UA = 'Mozilla/5.0 (crete.direct bus-network fetch)';
const PACE_MS = 250;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchToken() {
  const r = await fetch(PAGE, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`page ${PAGE} -> HTTP ${r.status}`);
  const html = await r.text();
  const m = html.match(/const token\s*=\s*'([^']+)'/);
  if (!m) throw new Error('token JWT introuvable dans le HTML');
  return m[1];
}

function makeApi(token) {
  const headers = { Authorization: `Bearer ${token}`, Referer: REFERER, 'User-Agent': UA };
  return async function api(path) {
    const r = await fetch(`${API}${path}`, { headers });
    if (r.status === 401) throw Object.assign(new Error('401'), { code: 401 });
    if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
    return r.json();
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[${cityArg}] token: scraping...`);
  let token = await fetchToken();
  let api = makeApi(token);

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

  console.log('lines (en)...');
  const linesEn = await get(`/en/${AGENCY}/lines`);
  const enLineName = new Map(linesEn.map((l) => [l.code, l.name]));
  for (const l of lines) l.nameEn = enLineName.get(l.code) || null;
  await sleep(PACE_MS);

  console.log('stops (el)...');
  const stops = await get(`/${LANG}/${AGENCY}/stops`);
  console.log(`  ${stops.length} arrets`);
  await sleep(PACE_MS);

  console.log('stops (en)...');
  const stopsEn = await get(`/en/${AGENCY}/stops`);
  const enStopName = new Map(stopsEn.map((s) => [s.code, s.name]));
  for (const s of stops) s.nameEn = enStopName.get(s.code) || null;

  const points = {};
  console.log('points (par ligne)...');
  for (const l of lines) {
    await sleep(PACE_MS);
    try {
      points[l.code] = await get(`/${AGENCY}/lines/${l.code}/points`);
    } catch (e) {
      console.log(`  ligne ${l.code}: ${e.message}`);
      points[l.code] = [];
    }
  }

  const routeCodes = [...new Set(lines.flatMap((l) => l.routes.map((r) => r.code)))];
  const sequences = {};
  console.log(`sequences (${routeCodes.length} routes)...`);
  for (const rc of routeCodes) {
    await sleep(PACE_MS);
    try {
      sequences[rc] = await get(`/${LANG}/${AGENCY}/routes/${rc}/sequence`);
    } catch (e) {
      console.log(`  route ${rc}: ${e.message}`);
      sequences[rc] = [];
    }
  }

  const dump = {
    fetchedAt: new Date().toISOString(),
    source: `${CITY.subdomain}.citybus.gr`,
    api: API, agency: AGENCY, lines, stops, points, sequences,
  };
  writeFileSync(OUT, JSON.stringify(dump));
  console.log(`\ndump -> ${OUT.replace(ROOT, '.')}`);
  console.log(`  lines=${lines.length} stops=${stops.length} routes=${routeCodes.length}`);
}

main().catch((e) => { console.error('ERREUR:', e.message || e); process.exit(1); });
