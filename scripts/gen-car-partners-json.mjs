// node --experimental-strip-types scripts/gen-car-partners-json.mjs
//
// Génère src/data/car-partners.json depuis la SOURCE UNIQUE src/lib/car-partners.ts.
// Ce JSON est consommé par le rapport partenaire VPS (vps/partner_report.py), qui
// ne peut pas importer du TypeScript. Déployé sur le VPS comme taxi-partners.json.
// Re-générer après toute modif de CAR_ZONES / CAR_PARTNERS ; check-car-partners.mjs
// échoue si le JSON committé diverge de car-partners.ts.
import { writeFileSync } from "node:fs";
import { CAR_ZONES, CAR_PARTNERS } from "../src/lib/car-partners.ts";

const data = { zones: CAR_ZONES, partners: CAR_PARTNERS };
const out = new URL("../src/data/car-partners.json", import.meta.url);
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`wrote src/data/car-partners.json: ${CAR_ZONES.length} zones, ${CAR_PARTNERS.length} partners`);
