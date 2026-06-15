// Run: node --experimental-strip-types scripts/check-campagne.mjs
import assert from "node:assert";
import { pickRoadVariant, buildShareUrl, getCampagneCopy, SHARE } from "../src/lib/campagne.ts";

// 1) variant par largeur
assert.equal(pickRoadVariant(390), "mobile", "390px -> mobile");
assert.equal(pickRoadVariant(800), "mobile", "800px -> mobile (sous 1024)");
assert.equal(pickRoadVariant(1024), "desktop", "1024px -> desktop");
assert.equal(pickRoadVariant(1440), "desktop", "1440px -> desktop");

// 2) URL de partage
assert.equal(buildShareUrl("fr"), "https://crete.direct/fr/projet");
assert.equal(buildShareUrl("en"), "https://crete.direct/en/projet");

// 3) copie : fr et en complètes (8 beats au total = hero + 6 + cta), fallback en
const fr = getCampagneCopy("fr");
const en = getCampagneCopy("en");
const de = getCampagneCopy("de"); // fallback
assert.equal(de, en, "locale inconnue -> fallback en");
for (const c of [fr, en]) {
  assert.equal(c.beats.length, 6, "6 beats narratifs (hero + cta comptés à part)");
  assert.ok(c.hero.title && c.cta.title, "hero/cta présents");
  assert.ok(c.buttons.instagram && c.buttons.facebook && c.buttons.share, "3 boutons");
}
// 4) payload de partage localisé non vide
assert.ok(SHARE.fr.title.length > 5 && SHARE.en.title.length > 5);

console.log("check-campagne OK");
