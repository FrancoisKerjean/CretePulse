import { describe, it, expect } from "vitest";
import { normalizeEmail, sanitizeText, sanitizeAuthorName } from "../sanitize";

describe("normalizeEmail", () => {
  it("lowercases", () => {
    expect(normalizeEmail("Alice@Example.COM")).toBe("alice@example.com");
  });
  it("strips Gmail +tag", () => {
    expect(normalizeEmail("alice+spam@gmail.com")).toBe("alice@gmail.com");
  });
  it("strips Gmail dot", () => {
    expect(normalizeEmail("a.l.i.c.e@gmail.com")).toBe("alice@gmail.com");
  });
  it("does NOT strip dots/plus on non-Gmail", () => {
    expect(normalizeEmail("a.b+c@outlook.com")).toBe("a.b+c@outlook.com");
  });
});

describe("sanitizeText", () => {
  it("strips script tag", () => {
    expect(sanitizeText("<script>alert(1)</script>hello")).toBe("hello");
  });
  it("strips img onerror", () => {
    expect(sanitizeText('<img src=x onerror="alert(1)">ok')).toBe("ok");
  });
  it("keeps plain text", () => {
    expect(sanitizeText("Belle plage, calme.")).toBe("Belle plage, calme.");
  });
});

describe("sanitizeAuthorName", () => {
  it("strips newlines", () => {
    expect(sanitizeAuthorName("Alice\nBob")).toBe("AliceBob");
  });
  it("keeps Unicode letters and accents", () => {
    expect(sanitizeAuthorName("Hélène Müller")).toBe("Hélène Müller");
  });
  it("rejects HTML brackets", () => {
    expect(sanitizeAuthorName("Alice<b>X</b>")).toBe("AliceX");
  });
  it("truncates above 40 chars", () => {
    expect(sanitizeAuthorName("a".repeat(50)).length).toBe(40);
  });
});
