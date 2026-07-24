// scripts/citybus_coverage.mjs — couverture stop-à-stop du planner citybus (paires seedées).
// Run: node --experimental-strip-types scripts/citybus_coverage.mjs
import { createCitybusEngine } from "../src/lib/citybus/engine.ts";
import { CITYBUS_DATA as HER } from "../src/data/heraklion-bus.ts";
import { CITYBUS_DATA as CHA } from "../src/data/chania-bus.ts";

const N = 3000;
function measure(data, label) {
  const eng = createCitybusEngine(data);
  const slugs = Object.keys(data.stops);
  let seed = 42;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let direct = 0, transfer = 0, none = 0;
  for (let n = 0; n < N; n++) {
    const a = slugs[Math.floor(rnd() * slugs.length)];
    const b = slugs[Math.floor(rnd() * slugs.length)];
    if (a === b) { n--; continue; }
    const trips = eng.findTrips(a, b);
    if (!trips.length) none++;
    else if (trips[0].transfers === 0) direct++;
    else transfer++;
  }
  const pc = (x) => ((100 * x) / N).toFixed(1) + "%";
  console.log(`${label} stops=${slugs.length} routes=${data.routes.length} : direct ${pc(direct)} +1corresp ${pc(transfer)} TOTAL ${pc(direct + transfer)} sans trajet ${pc(none)}`);
}
measure(HER, "HER");
measure(CHA, "CHA");
