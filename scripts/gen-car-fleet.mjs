// node --experimental-strip-types scripts/gen-car-fleet.mjs
//
// Génère src/data/car-fleet.json (flotte réelle par loueur, lue par
// src/lib/car-fleet.ts) depuis deux sources versionnées :
//   - data/car-fleet/flottes.json : relevé des modèles (sites + devis 2026) ;
//   - data/car-fleet/manifest.json : photos webp gardées.
// Re-générer après toute modif de l'une des deux ; check-car-fleet.mjs échoue
// si le JSON committé diverge. NE PAS éditer src/data/car-fleet.json à la main.
import { readFileSync, writeFileSync } from "node:fs";
import { buildCarFleet } from "../src/lib/car-fleet-build.ts";

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const fleet = buildCarFleet(read("data/car-fleet/flottes.json"), read("data/car-fleet/manifest.json"));
writeFileSync(new URL("../src/data/car-fleet.json", import.meta.url), JSON.stringify(fleet, null, 2) + "\n");

const ids = Object.keys(fleet);
const models = ids.reduce((n, id) => n + fleet[id].models.length, 0);
const withPhoto = ids.reduce((n, id) => n + fleet[id].models.filter((m) => m.photo640).length, 0);
console.log(`wrote src/data/car-fleet.json: ${ids.length} loueurs, ${models} modèles, ${withPhoto} avec photo`);
