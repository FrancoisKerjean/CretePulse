// node --experimental-strip-types scripts/check-activity-catalog.mjs
// Tests de la logique pure du catalogue + gardes anti-exposition et seed JSON.
import { readFileSync, existsSync } from "node:fs";
import {
  localizeItem,
  sortCatalogRows,
  pickHighlights,
  mixByCity,
} from "../src/lib/activity-catalog.ts";
import { isCategorySlug, isCitySlug } from "../src/lib/activity-taxonomy.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

const row = (over = {}) => ({
  id: 1, category: "food-tours", city: "chania",
  title: "Old town food walk", summary: "Tastings across the market.",
  duration_label: "~3h", price_from_eur: 45,
  translations: { fr: { title: "Balade gourmande", summary: "Dégustations au marché." } },
  display_order: 0, ...over,
});

// localizeItem
const fr = localizeItem(row(), "fr");
ok("localizeItem fr : title traduit", fr.title === "Balade gourmande");
ok("localizeItem fr : summary traduit", fr.summary === "Dégustations au marché.");
const pt = localizeItem(row(), "pt");
ok("localizeItem locale absente : fallback EN", pt.title === "Old town food walk");
const partial = localizeItem(row({ translations: { fr: { title: "Titre seul" } } }), "fr");
ok("localizeItem traduction partielle : summary retombe EN", partial.summary === "Tastings across the market.");
ok("localizeItem ne renvoie pas translations", !("translations" in fr));

// sortCatalogRows : display_order puis id
const sorted = sortCatalogRows([row({ id: 2, display_order: 1 }), row({ id: 3 }), row({ id: 1 })]);
ok("sortCatalogRows : display_order asc puis id asc", sorted.map((r) => r.id).join(",") === "1,3,2");

// pickHighlights : round-robin sur les catégories
const rows6 = [
  row({ id: 1 }), row({ id: 2 }),
  row({ id: 3, category: "boat-trips" }), row({ id: 4, category: "boat-trips" }),
  row({ id: 5, category: "hiking" }), row({ id: 6, category: "hiking" }),
];
const hl = pickHighlights(rows6, 6);
ok("pickHighlights limit 6 : 6 items", hl.length === 6);
ok("pickHighlights : 3 catégories représentées dans les 3 premiers",
  new Set(hl.slice(0, 3).map((r) => r.category)).size === 3);
ok("pickHighlights limit 2 : 2 items de 2 catégories différentes",
  new Set(pickHighlights(rows6, 2).map((r) => r.category)).size === 2);

// mixByCity : au plus N par ville
const rowsCities = [
  row({ id: 1 }), row({ id: 2 }), row({ id: 3 }),
  row({ id: 4, city: "rethymno" }), row({ id: 5, city: "rethymno" }),
];
const mix = mixByCity(rowsCities, 2);
ok("mixByCity cap 2/ville", mix.filter((r) => r.city === "chania").length === 2);
ok("mixByCity garde les autres villes", mix.filter((r) => r.city === "rethymno").length === 2);

// Garde anti-exposition : la lib db ne SELECT jamais source_url/source_name
const dbSrc = readFileSync("src/lib/activity-catalog-db.ts", "utf8");
ok("activity-catalog-db.ts ne mentionne pas source_url", !dbSrc.includes("source_url"));
ok("activity-catalog-db.ts ne mentionne pas source_name", !dbSrc.includes("source_name"));
ok("activity-catalog-db.ts sans select *", !/select\(\s*["'`]\s*\*/.test(dbSrc));

// Garde seed JSON (si présent) : slugs valides, champs requis, pas de contact
if (existsSync("data/activity-catalog-seed.json")) {
  const seed = JSON.parse(readFileSync("data/activity-catalog-seed.json", "utf8"));
  ok("seed : tableau non vide", Array.isArray(seed) && seed.length > 0);
  ok("seed : slugs catégorie valides", seed.every((i) => isCategorySlug(i.category)));
  ok("seed : slugs ville valides", seed.every((i) => isCitySlug(i.city)));
  ok("seed : title+summary+source_url+source_name présents",
    seed.every((i) => i.title && i.summary && i.source_url && i.source_name));
  ok("seed : prix entier > 0 ou null",
    seed.every((i) => i.price_from_eur === null || (Number.isInteger(i.price_from_eur) && i.price_from_eur > 0)));
  ok("seed : prix daté si présent", seed.every((i) => i.price_from_eur === null || !!i.price_seen_at));
  ok("seed : aucun champ contact (prospection = fichier séparé non versionné)",
    seed.every((i) => !("contact" in i) && !("email" in i) && !("phone" in i)));
  ok("seed : duration_label numérique sans mots",
    seed.every((i) => i.duration_label == null || /^[~0-9hHmin\-\s.]+$/.test(i.duration_label)));
} else {
  console.log("skip - data/activity-catalog-seed.json absent (Task 7)");
}

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
