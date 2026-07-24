// scripts/add-activity-nudge-close.mjs
// Ajoute la clé "close" en première position de l'objet "activityNudge" déjà
// présent dans chaque src/messages/<locale>.json. Insertion textuelle (diff
// minimal). Idempotent : skip si "close" déjà présent dans le fichier.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/messages";
const EN = "Close";
const OVERRIDES = { fr: "Fermer", de: "Schließen", el: "Κλείσιμο" };

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const locale = file.replace(".json", "");
  const path = join(DIR, file);
  const content = readFileSync(path, "utf8");
  if (!content.includes('"activityNudge"')) {
    throw new Error("activityNudge absent (ordre d'exécution ?) : " + file);
  }
  if (/"activityNudge":\s*\{[^}]*"close"/.test(content)) {
    console.log("skip (close déjà présent)", file);
    continue;
  }
  const val = OVERRIDES[locale] ?? EN;
  // insère "close" juste après l'accolade ouvrante de activityNudge (4 espaces d'indent)
  const out = content.replace(/("activityNudge":\s*\{\r?\n)/, (m) => m + "    \"close\": " + JSON.stringify(val) + ",\n");
  if (out === content) {
    throw new Error("Insertion échouée (format inattendu) : " + file);
  }
  writeFileSync(path, out, "utf8");
  console.log("updated", file);
}
