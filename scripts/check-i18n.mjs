#!/usr/bin/env node
// check:i18n - garde-fou parite des cles i18n (anti-regression multi-terminal).
// Toutes les locales de src/messages/*.json doivent avoir EXACTEMENT le meme jeu de
// cles que en.json (la reference). Empeche un nouvel ecran de montrer un chemin brut
// (cle manquante) ou de laisser deriver les 22 locales. Lance par `npm run check:i18n`
// et par l'agregat `npm run check`. NB : ne verifie pas la qualite des traductions,
// seulement la presence des cles.
import fs from "node:fs";
import path from "node:path";

const dir = "src/messages";
const REF = "en";

function leafKeys(obj, prefix = "") {
  const out = [];
  for (const k of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...leafKeys(v, p));
    else out.push(p);
  }
  return out;
}

const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const refKeys = new Set(leafKeys(read(`${REF}.json`)));
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

let problems = 0;
for (const f of files) {
  const loc = f.replace(/\.json$/, "");
  if (loc === REF) continue;
  const keys = new Set(leafKeys(read(f)));
  const missing = [...refKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !refKeys.has(k));
  if (missing.length || extra.length) {
    problems++;
    console.error(`❌ ${loc} : ${missing.length} cle(s) manquante(s), ${extra.length} en trop`);
    if (missing.length) console.error(`   manquantes : ${missing.join(", ")}`);
    if (extra.length) console.error(`   en trop : ${extra.join(", ")}`);
  }
}

if (problems > 0) {
  console.error(`\ncheck:i18n : ${problems} locale(s) hors parite vs ${REF}.json.`);
  process.exit(1);
}
console.log(`✅ check:i18n : ${files.length} locales en parite (${refKeys.size} cles chacune).`);
