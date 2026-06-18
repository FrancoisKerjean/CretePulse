import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, CATEGORIES, AREAS, AFFILIATE_DEFAULT_COMMISSION_PCT } from "./affiliate.ts";

test("slugify lowercases, strips diacritics, collapses to hyphens", () => {
  assert.equal(slugify("Beach Club Élafonísi!"), "beach-club-elafonisi");
  assert.equal(slugify("  Café   Crète  "), "cafe-crete");
  assert.equal(slugify("A & B / C"), "a-b-c");
});

test("slugify truncates very long names", () => {
  const s = slugify("x".repeat(120));
  assert.ok(s.length <= 60);
});

test("constants are sane", () => {
  assert.equal(AFFILIATE_DEFAULT_COMMISSION_PCT, 15);
  assert.ok(CATEGORIES.some((c) => c.id === "hotel"));
  assert.ok(CATEGORIES.some((c) => c.id === "other"));
  assert.ok(AREAS.includes("chania"));
});

import { buildUniqueSlug, randomSuffix, genCodePromo, hashIp } from "./affiliate.ts";

test("buildUniqueSlug returns base when free", async () => {
  const s = await buildUniqueSlug("Sunset Villas", async () => false);
  assert.equal(s, "sunset-villas");
});

test("buildUniqueSlug suffixes on collision", async () => {
  const taken = new Set(["sunset-villas", "sunset-villas-2"]);
  const s = await buildUniqueSlug("Sunset Villas", async (x) => taken.has(x));
  assert.equal(s, "sunset-villas-3");
});

test("randomSuffix has the requested length and charset", () => {
  const r = randomSuffix(4);
  assert.equal(r.length, 4);
  assert.match(r, /^[0-9A-F]+$/);
});

test("genCodePromo builds an uppercase code from slug + suffix", () => {
  assert.equal(genCodePromo("beach-club-elafonisi", "AB12"), "BEACHCLUB-AB12");
});

test("hashIp is deterministic and salted", () => {
  assert.equal(hashIp("1.2.3.4", "salt"), hashIp("1.2.3.4", "salt"));
  assert.notEqual(hashIp("1.2.3.4", "salt"), hashIp("1.2.3.4", "other"));
  assert.match(hashIp("1.2.3.4", "salt"), /^[0-9a-f]{64}$/);
});
