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
