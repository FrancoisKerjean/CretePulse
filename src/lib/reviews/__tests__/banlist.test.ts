import { describe, it, expect } from "vitest";
import { containsBanned, looksLikeSpam } from "../banlist";

describe("containsBanned", () => {
  it("matches whole word lowercase", () => {
    expect(containsBanned("you are an idiot")).toBe(true);
  });
  it("matches with diacritics stripped", () => {
    expect(containsBanned("Tu es un crétin")).toBe(true); // 'cretin' in banlist
  });
  it("does not match a substring inside another word", () => {
    expect(containsBanned("assassinated")).toBe(false); // 'ass' is a substring, not a word
  });
  it("returns false for clean text", () => {
    expect(containsBanned("Belle plage, eau cristalline")).toBe(false);
  });
});

describe("looksLikeSpam", () => {
  it("detects two URLs", () => {
    expect(looksLikeSpam("check http://a.com and https://b.com")).toBe(true);
  });
  it("detects e-mail leak in comment", () => {
    expect(looksLikeSpam("contact me at x@y.com")).toBe(true);
  });
  it("detects mostly non-alphanum", () => {
    expect(looksLikeSpam("!!!!@@@@####$$$$")).toBe(true);
  });
  it("accepts normal review", () => {
    expect(looksLikeSpam("Lieu agréable, parking facile.")).toBe(false);
  });
});
