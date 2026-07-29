// scripts/check-home-services.mjs : tests purs du catalogue des services de la home.
import assert from "node:assert/strict";
import fs from "node:fs";
import { getHomeServices } from "../src/lib/home-services.ts";

let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("flag eteint : 3 services, pas de villa", () => {
  const s = getHomeServices({ staysEnabled: false });
  assert.equal(s.length, 3);
  assert.deepEqual(s.map((x) => x.id), ["car", "van", "activities"]);
});

ok("flag allume : 4 services, villa en dernier", () => {
  const s = getHomeServices({ staysEnabled: true });
  assert.equal(s.length, 4);
  assert.deepEqual(s.map((x) => x.id), ["car", "van", "activities", "stays"]);
});

ok("la voiture est le seul bandeau et arrive en premier", () => {
  const s = getHomeServices({ staysEnabled: true });
  assert.equal(s[0].id, "car");
  assert.equal(s[0].layout, "band");
  assert.deepEqual(s.slice(1).map((x) => x.layout), ["card", "card", "card"]);
});

ok("seul le van est externe", () => {
  const s = getHomeServices({ staysEnabled: true });
  assert.deepEqual(s.filter((x) => x.external).map((x) => x.id), ["van"]);
  assert.ok(s.find((x) => x.id === "van").href.startsWith("https://"));
});

ok("aucun href vide", () => {
  for (const s of getHomeServices({ staysEnabled: true })) {
    assert.ok(s.href.length > 1, `href vide pour ${s.id}`);
  }
});

ok("chaque photo existe reellement dans public/", () => {
  for (const s of getHomeServices({ staysEnabled: true })) {
    assert.ok(fs.existsSync(`public${s.photo}`), `photo manquante : public${s.photo}`);
  }
});

console.log(`check:home-services OK (${n} tests)`);
