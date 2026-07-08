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

test("genCodePromo never returns an empty base (single long word)", () => {
  const code = genCodePromo("supercalifragilistic", "AB12");
  assert.equal(code, "SUPERCALIF-AB12");
  assert.doesNotMatch(code, /^-/);
});

import { validateRegisterPayload } from "./affiliate.ts";

const good = {
  name: "Sunset Villas",
  category: "hotel",
  area: "chania",
  email: "info@sunset.gr",
  redirect_url: "https://sunset.gr/book",
  accept: true,
};

test("validateRegisterPayload accepts a clean payload (normalized)", () => {
  const r = validateRegisterPayload(good);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.email, "info@sunset.gr");
    assert.equal(r.data.category, "hotel");
    assert.equal(r.data.category_other, null);
  }
});

test("validateRegisterPayload requires accept=true", () => {
  const r = validateRegisterPayload({ ...good, accept: false });
  assert.equal(r.ok, false);
});

test("validateRegisterPayload rejects bad email and non-http url", () => {
  assert.equal(validateRegisterPayload({ ...good, email: "nope" }).ok, false);
  assert.equal(validateRegisterPayload({ ...good, redirect_url: "ftp://x" }).ok, false);
  assert.equal(validateRegisterPayload({ ...good, redirect_url: "not a url" }).ok, false);
});

test("validateRegisterPayload rejects unknown category/area", () => {
  assert.equal(validateRegisterPayload({ ...good, category: "spaceship" }).ok, false);
  assert.equal(validateRegisterPayload({ ...good, area: "atlantis" }).ok, false);
});

test("validateRegisterPayload keeps category_other when category=other", () => {
  const r = validateRegisterPayload({ ...good, category: "other", category_other: "Diving school" });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.data.category_other, "Diving school");
});

// ── affiliateClass segmentation ─────────────────────────────────────────────

import { affiliateClass } from "./affiliate.ts";

test("affiliateClass: tour → quotable", () => {
  assert.equal(affiliateClass("tour"), "quotable");
});

test("affiliateClass: activity → quotable", () => {
  assert.equal(affiliateClass("activity"), "quotable");
});

test("affiliateClass: transfer → quotable", () => {
  assert.equal(affiliateClass("transfer"), "quotable");
});

test("affiliateClass: taxi → quotable", () => {
  assert.equal(affiliateClass("taxi"), "quotable");
});

test("affiliateClass: restaurant → vitrine", () => {
  assert.equal(affiliateClass("restaurant"), "vitrine");
});

test("affiliateClass: cafe → vitrine", () => {
  assert.equal(affiliateClass("cafe"), "vitrine");
});

test("affiliateClass: bar → vitrine", () => {
  assert.equal(affiliateClass("bar"), "vitrine");
});

test("affiliateClass: hotel → vitrine", () => {
  assert.equal(affiliateClass("hotel"), "vitrine");
});

test("affiliateClass: unknown/empty → vitrine (safe default)", () => {
  assert.equal(affiliateClass(""), "vitrine");
  assert.equal(affiliateClass("unknown-category"), "vitrine");
});

test("affiliateClass: case-insensitive", () => {
  assert.equal(affiliateClass("TOUR"), "quotable");
  assert.equal(affiliateClass("Restaurant"), "vitrine");
});
