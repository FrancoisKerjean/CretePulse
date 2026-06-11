// node --experimental-strip-types scripts/check-car-partners.mjs
import { zoneForPickup, partnerForPickup, allPickups } from "../src/lib/car-partners.ts";
import { SLUG_COORDS } from "../src/lib/taxi-fare.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

ok("chania-airport -> chania-west", zoneForPickup("chania-airport")?.id === "chania-west");
ok("partner west = Auto Smart", partnerForPickup("chania")?.name === "Auto Smart Car Rental");
ok("east has no partner yet", partnerForPickup("sitia") === null);
ok("unknown pickup -> null", zoneForPickup("nope") === null);
ok("every pickup slug has coords", allPickups().every((p) => SLUG_COORDS[p.slug]));
ok("served flags", allPickups().find((p) => p.slug === "chania").served === true
  && allPickups().find((p) => p.slug === "ierapetra").served === false);

process.exit(fail ? 1 : 0);
