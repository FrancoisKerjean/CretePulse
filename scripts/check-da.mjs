#!/usr/bin/env node
// check:da - garde-fou direction artistique Kalimera (anti-regression multi-terminal).
// Empeche la reintroduction des dettes deja eliminees par l'harmonisation DA (audit 22/06) :
//   R11  : tiret cadratin (em dash) interdit, separateurs autorises = point median, virgule, point, deux-points
//   Ch6  : ombres grises Tailwind (shadow-sm/md/lg/xl/2xl) interdites -> shadow-soft/card/float (colorees)
//   Ch1  : ancienne palette (aegean/terra, stone plat, et gris Tailwind stone/gray/slate/zinc/neutral-NNN)
//          interdite -> tokens Kalimera (sea/terracotta/ink/text-muted/surface/foam/night...)
// Tous ces patterns sont a 0 dans le code apres l'harmonisation : ce lint les y maintient.
// Lance par `npm run check:da` et par l'agregat `npm run check`. NB : ne couvre pas encore les
// hex bruts (472 restants) ni les fleches R10 ; a etendre quand ces chantiers seront livres.
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

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk("src");
const violations = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  for (const rule of RULES) {
    if (!rule.exts.test(file)) continue;
    lines.forEach((line, i) => {
      if (rule.test(line)) {
        violations.push(`  [${rule.name}] ${file.replace(/\\/g, "/")}:${i + 1}  ${line.trim().slice(0, 80)}`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`❌ check:da : ${violations.length} violation(s) de la direction artistique Kalimera :`);
  console.error(violations.slice(0, 60).join("\n"));
  if (violations.length > 60) console.error(`  ... et ${violations.length - 60} autres`);
  process.exit(1);
}
console.log("✅ check:da : 0 violation DA (em dash, ombres grises, ancienne palette).");
