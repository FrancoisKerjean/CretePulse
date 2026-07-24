// Assertions du module geo. Run: node scripts/check-geo.mjs
// (Node >= 23 : importe le .ts par type-stripping)
import { haversineKm, nearestBy, isOnCrete } from "../src/lib/geo.ts";

let fail = 0;
const ok = (name, cond) => { console.log(cond ? `ok - ${name}` : `FAIL - ${name}`); if (!cond) fail++; };

// Heraklion -> Chania vol d'oiseau ~120-145 km
const d = haversineKm([35.3387, 25.1442], [35.5138, 24.018]);
ok("haversine HER->CHQ plausible", d > 95 && d < 145);
ok("haversine zero", haversineKm([35, 25], [35, 25]) === 0);

const items = [
  { name: "a", c: [35.34, 25.14] }, { name: "b", c: [35.51, 24.02] },
  { name: "noCoords", c: null }, { name: "c", c: [35.2, 26.1] },
];
const res = nearestBy(items, (i) => i.c, { lat: 35.33, lon: 25.13 }, 2);
ok("nearestBy sort + limit", res.length === 2 && res[0].name === "a");
ok("nearestBy excludes null coords", !res.some((r) => r.name === "noCoords"));
ok("nearestBy km attached", typeof res[0].km === "number" && res[0].km < 5);

ok("isOnCrete Makrigialos", isOnCrete({ lat: 35.039, lon: 25.973 }));
ok("isOnCrete Paris false", !isOnCrete({ lat: 48.85, lon: 2.35 }));

process.exit(fail ? 1 : 0);
