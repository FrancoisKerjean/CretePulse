// node --experimental-strip-types scripts/check-activity-taxonomy.mjs
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CITIES,
  isCategorySlug,
  isCitySlug,
  isTimeslot,
  isGuideLanguage,
  categoryLabel,
  cityLabel,
} from "../src/lib/activity-taxonomy.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

ok("3 catégories", ACTIVITY_CATEGORIES.length === 3);
ok("5 villes", ACTIVITY_CITIES.length === 5);

ok("isCategorySlug('food-tours') === true", isCategorySlug("food-tours") === true);
ok("isCategorySlug('car') === false", isCategorySlug("car") === false);

ok("isCitySlug('chania') === true", isCitySlug("chania") === true);

ok("isTimeslot('morning') === true", isTimeslot("morning") === true);
ok("isTimeslot('night') === false", isTimeslot("night") === false);

ok("isGuideLanguage('it') === true", isGuideLanguage("it") === true);
ok("isGuideLanguage('es') === false", isGuideLanguage("es") === false);

ok("categoryLabel('hiking','fr') === 'Randonnée & nature'", categoryLabel("hiking", "fr") === "Randonnée & nature");
ok("categoryLabel('hiking','pt') retombe sur EN", categoryLabel("hiking", "pt") === "Hiking & nature");
ok("cityLabel('inconnu','en') === 'inconnu'", cityLabel("inconnu", "en") === "inconnu");

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
