// Vérifie les helpers SEO purs. Run: node --experimental-strip-types scripts/check-bus-seo.ts
import { pairHasTimetable, qualityPairSlugs, priorityPairSlugs, pairLastmod, compareToPairSlug } from "../src/lib/bus-seo.ts";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { failed++; console.error(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
  else console.log(`ok   ${name}`);
}

const routes = [
  { from_place: "Heraklion", to_place: "Malia", departures: ["08:00", "09:30"], scraped_at: "2026-06-10T00:00:00Z" },
  { from_place: "Malia", to_place: "Heraklion", departures: [], scraped_at: "2026-06-12T00:00:00Z" },
  // paire sans aucun horaire (les 2 sens vides) = NON qualité
  { from_place: "Myrtos", to_place: "Ierapetra", departures: [], scraped_at: "2026-06-01T00:00:00Z" },
  { from_place: "Chania", to_place: "Rethymno", departures: ["07:00"], scraped_at: "2026-06-11T00:00:00Z" },
  // paire DIGNE (horaires) mais entre 2 petits villages (pas des hubs) = qualité, PAS prioritaire
  { from_place: "Bali", to_place: "Panormo", departures: ["10:00"], scraped_at: "2026-06-09T00:00:00Z" },
];

eq("pairHasTimetable heraklion-malia", pairHasTimetable(routes, "heraklion-to-malia"), true);
eq("pairHasTimetable myrtos-ierapetra (vide)", pairHasTimetable(routes, "ierapetra-to-myrtos"), false);
eq("qualityPairSlugs", qualityPairSlugs(routes), ["bali-to-panormo", "chania-to-rethymno", "heraklion-to-malia"]);
// priorité = sous-ensemble qualité entre 2 hubs majeurs (Bali/Panormo exclus)
eq("priorityPairSlugs (hubs only)", priorityPairSlugs(routes), ["chania-to-rethymno", "heraklion-to-malia"]);
eq("priorityPairSlugs exclut villages dignes", priorityPairSlugs(routes).includes("bali-to-panormo"), false);
eq("pairLastmod = max scraped_at de la paire", pairLastmod(routes, "heraklion-to-malia"), "2026-06-12T00:00:00Z");
eq("compareToPairSlug existe", compareToPairSlug(routes, "Heraklion", "Malia"), "heraklion-to-malia");
eq("compareToPairSlug paire inexistante", compareToPairSlug(routes, "Heraklion", "Sitia"), null);
eq("compareToPairSlug island (non mappé)", compareToPairSlug(routes, "Crete", "Santorini"), null);

if (failed) { console.error(`\n${failed} FAIL`); process.exit(1); }
console.log("\nall ok");
