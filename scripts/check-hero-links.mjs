// scripts/check-hero-links.mjs : tests purs des destinations cliquables du hero.
// Spec : docs/superpowers/specs/2026-07-29-hero-clickable-design.md
import assert from "node:assert/strict";
import { cruisePortHref, swimHref } from "../src/lib/hero-links.ts";

let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("les quatre ports avec page renvoient leur village", () => {
  assert.equal(cruisePortHref("heraklion"), "/villages/heraklion");
  assert.equal(cruisePortHref("chania"), "/villages/chania");
  assert.equal(cruisePortHref("agios_nikolaos"), "/villages/agios-nikolaos");
});

ok("Souda renvoie vers La Canee, dont il est le port", () => {
  assert.equal(cruisePortHref("souda"), "/villages/chania");
});

ok("Sitia n'a pas de page : aucun lien, jamais un 404", () => {
  assert.equal(cruisePortHref("sitia"), null);
});

ok("un port inconnu ne fabrique pas d'URL", () => {
  assert.equal(cruisePortHref("rethymno"), null);
  assert.equal(cruisePortHref(""), null);
  assert.equal(cruisePortHref("HERAKLION"), null);
});

ok("aucune cible ne pointe vers une page absente du repo", () => {
  // Le mapping ne doit lister que des slugs de village verifies en prod le 29/07.
  const VERIFIES = ["heraklion", "chania", "agios-nikolaos"];
  for (const port of ["heraklion", "chania", "souda", "agios_nikolaos", "sitia"]) {
    const href = cruisePortHref(port);
    if (href === null) continue;
    const slug = href.replace("/villages/", "");
    assert.ok(VERIFIES.includes(slug), `slug non verifie : ${slug}`);
  }
});

ok("la phrase plage renvoie la fiche, pas la liste", () => {
  assert.equal(swimHref("vai"), "/beaches/vai");
  assert.equal(swimHref("balos"), "/beaches/balos");
});

ok("un slug vide ne fabrique pas de lien", () => {
  assert.equal(swimHref(""), null);
  assert.equal(swimHref("   "), null);
});

console.log(`check:hero-links OK (${n} tests)`);
