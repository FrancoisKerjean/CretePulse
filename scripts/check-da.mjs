#!/usr/bin/env node
// check:da - garde-fou direction artistique Kalimera (anti-regression multi-terminal).
// Empeche la reintroduction des dettes deja eliminees par l'harmonisation DA (audit 22/06) :
//   R11  : tiret cadratin (em dash) interdit, separateurs autorises = point median, virgule, point, deux-points
//   Ch6  : ombres grises Tailwind (shadow-sm/md/lg/xl/2xl) interdites -> shadow-soft/card/float (colorees)
//   Ch1  : ancienne palette (aegean/terra, stone plat, et gris Tailwind stone/gray/slate/zinc/neutral-NNN)
//          interdite -> tokens Kalimera (sea/terracotta/ink/text-muted/surface/foam/night...)
//
// Modele RATCHET (12/07/2026) : les 106 violations pre-existantes (dont ~77 dans du
// texte user-facing i18n + fichiers auto-generes src/data/*-bus.ts) sont figees dans
// scripts/da-baseline.json. Le guard NE BLOQUE QUE les NOUVELLES violations (celles
// absentes du baseline). Une violation grandfatheree se nettoie au fil de l'eau ; des
// qu'une ligne baselinee est editee, son contenu change -> elle sort du baseline ->
// elle doit etre corrigee. Objectif long terme : baseline vide.
// Cle de baseline = `regle \0 fichier \0 contenu-trim` : independante du numero de ligne
// (deplacer une ligne ne casse rien), sensible au contenu (modifier une ligne = nettoyer).
//
// Mise a jour du baseline apres un nettoyage volontaire (retire les entrees corrigees) :
//   node scripts/check-da.mjs --update-baseline
// Lance par `npm run check:da` et par l'agregat `npm run check`.
import fs from "node:fs";
import path from "node:path";

const EM_DASH = "—";
const GRAY_SHADOW = /\bshadow-(sm|md|lg|xl|2xl)\b/;
const OLD_PALETTE = /\b(bg|text|border|border-[trblxy]|from|to|via|ring|accent|fill|stroke|decoration|divide|placeholder|outline)-(aegean|terra)\b/;
const FLAT_STONE = /\b(bg|text|border|from|to|via)-stone(-warm)?(?![-0-9a-z])/;
const GRAY_SCALE = /\b(bg|text|border|border-[trblxy]|from|to|via|ring|divide|placeholder|outline)-(stone|gray|slate|zinc|neutral)-\d{2,3}\b/;

const RULES = [
  { name: "tiret cadratin (R11)", exts: /\.(ts|tsx|json)$/, test: (l) => l.includes(EM_DASH) },
  { name: "ombre grise Tailwind (Ch6)", exts: /\.(ts|tsx)$/, test: (l) => GRAY_SHADOW.test(l) },
  { name: "ancienne palette aegean/terra (Ch1)", exts: /\.(ts|tsx|css)$/, test: (l) => OLD_PALETTE.test(l) },
  { name: "token stone plat (Ch1)", exts: /\.(ts|tsx)$/, test: (l) => FLAT_STONE.test(l) },
  { name: "gris Tailwind -NNN (Ch1)", exts: /\.(ts|tsx)$/, test: (l) => GRAY_SCALE.test(l) },
];

const BASELINE_PATH = path.join("scripts", "da-baseline.json");
const SEP = "\u0000"; // separateur de cle : octet nul, jamais present dans une ligne source

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// Collecte toutes les violations courantes. Cle stable (regle, fichier, contenu-trim).
function collect() {
  const found = [];
  for (const file of walk("src")) {
    const rel = file.replace(/\\/g, "/");
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (const rule of RULES) {
      if (!rule.exts.test(file)) continue;
      lines.forEach((line, i) => {
        if (rule.test(line)) {
          const content = line.trim();
          found.push({ key: `${rule.name}${SEP}${rel}${SEP}${content}`, rule: rule.name, file: rel, lineNo: i + 1, content });
        }
      });
    }
  }
  return found;
}

const violations = collect();

// --update-baseline : fige l'etat courant (a lancer apres un nettoyage volontaire).
if (process.argv.includes("--update-baseline")) {
  const keys = [...new Set(violations.map((v) => v.key))].sort();
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(keys, null, 0) + "\n");
  console.log(`✅ baseline mis a jour : ${keys.length} violation(s) grandfatheree(s) -> ${BASELINE_PATH}`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE_PATH)
  ? new Set(JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")))
  : new Set();

// On ne bloque QUE sur les violations absentes du baseline (nouvelles regressions).
const fresh = violations.filter((v) => !baseline.has(v.key));

if (fresh.length > 0) {
  console.error(`❌ check:da : ${fresh.length} NOUVELLE(S) violation(s) DA Kalimera (hors baseline) :`);
  console.error(fresh.slice(0, 60).map((v) => `  [${v.rule}] ${v.file}:${v.lineNo}  ${v.content.slice(0, 80)}`).join("\n"));
  if (fresh.length > 60) console.error(`  ... et ${fresh.length - 60} autres`);
  console.error(`\nCorrige-les (separateurs autorises : point median, virgule, point, deux-points).`);
  console.error(`Si c'est un nettoyage volontaire d'anciennes dettes : node scripts/check-da.mjs --update-baseline`);
  process.exit(1);
}

const grandfathered = violations.length;
console.log(`✅ check:da : 0 nouvelle violation DA${grandfathered ? ` (${grandfathered} dette(s) grandfatheree(s) via baseline, a nettoyer au fil de l'eau)` : ""}.`);
