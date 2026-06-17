import assert from "node:assert";
import { getInstitutionsCopy, getEntreprisesCopy, PRO_AUDIENCES } from "../src/lib/campagne-pro.ts";
import { getInstitutionsCopyEN } from "../src/lib/campagne-institutions.ts";
import { getEntreprisesCopyEN } from "../src/lib/campagne-entreprises.ts";

const ALL = [getInstitutionsCopy("fr"), getInstitutionsCopy("en"), getEntreprisesCopy("fr"), getEntreprisesCopy("en")];

for (const c of ALL) {
  assert.ok(c.meta.title && c.meta.description, "meta complet");
  assert.ok(c.hero.title, "hero.title");
  assert.equal(c.stats.length, 4, "4 stats");
  assert.ok(c.beats.length >= 2, ">=2 beats");
  assert.equal(c.frise.steps.length, 3, "frise 3 temps");
  assert.ok(c.form && c.form.fields.length >= 3, "form >=3 champs");
}
// fallback locale inconnue => EN
assert.equal(getInstitutionsCopy("zz").meta.title, getInstitutionsCopy("en").meta.title, "fallback EN");
// zero tiret cadratin + zero fleche dans tout le texte serialise
const blob = JSON.stringify(ALL);
assert.ok(!blob.includes("—"), "aucun tiret cadratin");
assert.ok(!/[→←➔]|->/.test(blob), "aucune fleche");
// entreprises a des portes, institutions a un ask+dossier
assert.ok(getEntreprisesCopy("fr").doors?.length === 2, "2 portes entreprises");
assert.ok(getInstitutionsCopy("fr").ask?.dossierHref, "dossier institutions");
assert.deepEqual(PRO_AUDIENCES, ["visiteur", "institutions", "entreprises"]);
console.log("check-projet-copy OK");
