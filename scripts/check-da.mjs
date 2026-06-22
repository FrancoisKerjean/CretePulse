#!/usr/bin/env node
// check:da - garde-fou direction artistique Kalimera (anti-regression multi-terminal).
// Regle R11 (Kami, dure) : aucun tiret cadratin (em dash, U+2014) dans le code source
// destine a l'UI. Separateurs autorises : point median, virgule, point, deux-points.
// Etendre ce check plus tard (R10 fleches accolees aux liens, hex bruts) quand ces
// chantiers seront livres. Lance par `npm run check:da` et par l'agregat `npm run check`.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EM_DASH = "—";
const root = process.cwd();

const files = execSync("git ls-files src", { encoding: "utf8" })
  .split("\n")
  .map((s) => s.trim())
  .filter((f) => /\.(ts|tsx|json)$/.test(f));

const violations = [];
for (const rel of files) {
  const txt = fs.readFileSync(path.join(root, rel), "utf8");
  txt.split("\n").forEach((line, i) => {
    if (line.includes(EM_DASH)) {
      violations.push(`  ${rel}:${i + 1}  ${line.trim().slice(0, 90)}`);
    }
  });
}

if (violations.length > 0) {
  console.error(
    `❌ check:da : ${violations.length} tiret(s) cadratin (em dash) interdit(s) par la DA (R11). Remplace par un point median, une virgule, un point ou deux-points :`,
  );
  console.error(violations.slice(0, 50).join("\n"));
  if (violations.length > 50) console.error(`  ... et ${violations.length - 50} autres`);
  process.exit(1);
}

console.log("✅ check:da : 0 tiret cadratin (R11 respectee).");
