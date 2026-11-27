// node --experimental-strip-types scripts/check-car-fleet.mjs
// Anti-drift de la flotte statique (src/data/car-fleet.json) : à jour avec ses
// deux sources, chaque photo citée présente dans public/, aucun id loueur
// inconnu. Sinon : npm run gen:car-fleet.
import { existsSync, readFileSync } from "node:fs";
import { buildCarFleet } from "../src/lib/car-fleet-build.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };
const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

const flottes = read("data/car-fleet/flottes.json");
let projected = null;
try {
  projected = JSON.stringify(buildCarFleet(flottes, read("data/car-fleet/manifest.json")), null, 2) + "\n";
} catch (e) {
  ok(`sources lisibles (${e.message})`, false);
}

let committed = null;
try { committed = readFileSync(new URL("../src/data/car-fleet.json", import.meta.url), "utf8"); } catch { /* absent */ }
ok("car-fleet.json en phase avec flottes.json + manifest.json (sinon: npm run gen:car-fleet)",
  projected !== null && committed?.replace(/\r\n/g, "\n") === projected);

const fleet = committed ? JSON.parse(committed) : {};
const known = new Set(flottes.map((p) => String(p.id)));
const unknown = Object.keys(fleet).filter((id) => !known.has(id));
ok(`aucun id loueur inconnu${unknown.length ? ` (${unknown.join(", ")})` : ""}`, unknown.length === 0);

const missing = [];
for (const p of Object.values(fleet)) {
  for (const m of p.models) {
    for (const src of [m.photo640, m.photo1280]) {
      if (src && !existsSync(new URL(`../public${src}`, import.meta.url))) missing.push(src);
    }
  }
}
ok(`chaque photo citée existe dans public/${missing.length ? ` (manquantes : ${missing.slice(0, 5).join(", ")})` : ""}`, missing.length === 0);

// Le chemin d'une photo est lisible dans le HTML avant l'acompte : jamais le nom du loueur (27/11/2026).
const badPaths = [];
for (const ph of read("data/car-fleet/manifest.json")) {
  for (const src of [ph.src640, ph.src1280]) {
    if (src && !src.startsWith(`/images/fleet/p${ph.partnerId}/`)) badPaths.push(src);
  }
}
ok(`photos rangées dans public/images/fleet/p<partnerId>/, sans nom de loueur${badPaths.length ? ` (${badPaths.slice(0, 3).join(", ")})` : ""}`, badPaths.length === 0);

process.exit(fail ? 1 : 0);
