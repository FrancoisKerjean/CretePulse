// Valide la structure du JSON-LD. Run: npx tsx scripts/check-buses-schema.mjs
// (tsx resout l'alias @/ et l'import valeur ./types ; node --strip-types ne le fait pas)
import { busesPageSchema } from "../src/lib/schema.ts";

const s = busesPageSchema({
  locale: "en",
  pageTitle: "Crete Bus Schedules",
  description: "d",
  routes: [{ from: "Heraklion", to: "Chania" }],
  dateModified: "2026-05-21T00:00:00Z",
  faqItems: [{ q: "Night buses?", a: "Rare." }],
  breadcrumbLabels: { home: "Home", buses: "Buses" },
});
const graph = s["@graph"];
const types = graph.map((g) => g["@type"]);
if (!["WebPage", "BreadcrumbList", "ItemList", "FAQPage"].every((t) => types.includes(t))) {
  console.error("FAIL types", types);
  process.exit(1);
}
if (!graph[0].dateModified) {
  console.error("FAIL dateModified manquant");
  process.exit(1);
}
console.log("OK busesPageSchema:", types.join(","));
