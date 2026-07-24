// scripts/add-activity-nudge-i18n.mjs
// Injecte le namespace "activityNudge" comme PREMIÈRE clé racine de chaque
// src/messages/<locale>.json. Insertion textuelle pour garder un diff minimal
// (n'altère pas le reste du fichier). Idempotent : skip si déjà présent.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/messages";

const EN = {
  title: "Still undecided?",
  subtitle: "Swipe the best spots in Crete and find the one that fits you.",
  dismiss: "Later",
  cta: "Start swiping",
};
const OVERRIDES = {
  fr: {
    title: "Pas encore décidé ?",
    subtitle: "Swipe les meilleurs spots de Crète et trouve celui qui te ressemble.",
    dismiss: "Plus tard",
    cta: "Je swipe",
  },
  de: {
    title: "Noch unentschlossen?",
    subtitle: "Swipe durch die besten Orte Kretas und finde den, der zu dir passt.",
    dismiss: "Später",
    cta: "Los swipen",
  },
  el: {
    title: "Ακόμα αναποφάσιστος;",
    subtitle: "Κάνε swipe στα καλύτερα μέρη της Κρήτης και βρες αυτό που σου ταιριάζει.",
    dismiss: "Αργότερα",
    cta: "Ξεκίνα swipe",
  },
};

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const locale = file.replace(".json", "");
  const path = join(DIR, file);
  const content = readFileSync(path, "utf8");
  if (content.includes('"activityNudge"')) {
    console.log("skip (déjà présent)", file);
    continue;
  }
  const obj = OVERRIDES[locale] ?? EN;
  // bloc indenté de 2 espaces, inséré juste après l'accolade ouvrante racine
  const block = "  \"activityNudge\": " + JSON.stringify(obj, null, 2).replace(/\n/g, "\n  ") + ",\n";
  const out = content.replace(/^\{\r?\n/, (m) => m + block);
  if (out === content) {
    throw new Error("Insertion échouée (format racine inattendu) : " + file);
  }
  writeFileSync(path, out, "utf8");
  console.log("updated", file);
}
