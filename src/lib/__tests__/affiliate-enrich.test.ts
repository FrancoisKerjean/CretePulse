/**
 * Unit tests for the pure functions in affiliate-enrich.ts.
 * Tests: extractOgImage, fallbackDescription, parseDescriptionJson.
 * No network calls, no DB, no env vars needed.
 */
import { describe, it, expect } from "vitest";
import {
  extractOgImage,
  extractSiteText,
  fallbackDescription,
  parseDescriptionJson,
} from "@/lib/affiliate-enrich";

// ─── extractOgImage ─────────────────────────────────────────────────────────

describe("extractOgImage", () => {
  const BASE = "https://example.com/";

  it("extracts property-first og:image", () => {
    const html = `<meta property="og:image" content="https://example.com/img/hero.jpg">`;
    expect(extractOgImage(html, BASE)).toBe("https://example.com/img/hero.jpg");
  });

  it("extracts content-first og:image", () => {
    const html = `<meta content="https://example.com/img/hero.jpg" property="og:image">`;
    expect(extractOgImage(html, BASE)).toBe("https://example.com/img/hero.jpg");
  });

  it("extracts twitter:image as fallback", () => {
    const html = `<meta name="twitter:image" content="https://example.com/tw.jpg">`;
    expect(extractOgImage(html, BASE)).toBe("https://example.com/tw.jpg");
  });

  it("resolves relative favicon URLs", () => {
    const html = `<link rel="icon" href="images/favicon.ico">`;
    expect(extractOgImage(html, BASE)).toBe("https://example.com/images/favicon.ico");
  });

  it("extracts shortcut icon", () => {
    const html = `<link rel="shortcut icon" href="https://example.com/fav.png">`;
    expect(extractOgImage(html, BASE)).toBe("https://example.com/fav.png");
  });

  it("returns null when no image found", () => {
    const html = `<html><head><title>No images here</title></head></html>`;
    expect(extractOgImage(html, BASE)).toBeNull();
  });

  it("prefers og:image over twitter:image", () => {
    const html = `
      <meta name="twitter:image" content="https://example.com/tw.jpg">
      <meta property="og:image" content="https://example.com/og.jpg">
    `;
    expect(extractOgImage(html, BASE)).toBe("https://example.com/og.jpg");
  });
});

// ─── extractSiteText ─────────────────────────────────────────────────────────

describe("extractSiteText", () => {
  it("extracts title and meta description", () => {
    const html = `
      <title>Halepa Hotel Chania</title>
      <meta name="description" content="Historic hotel in Chania, Crete">
    `;
    const text = extractSiteText(html);
    expect(text).toContain("Halepa Hotel Chania");
    expect(text).toContain("Historic hotel in Chania, Crete");
  });

  it("strips script and style tags", () => {
    const html = `
      <title>Test</title>
      <script>var x = 1;</script>
      <style>.cls { color: red; }</style>
      <p>Visible content here</p>
    `;
    const text = extractSiteText(html);
    expect(text).not.toContain("var x = 1");
    expect(text).not.toContain(".cls { color: red; }");
    expect(text).toContain("Visible content here");
  });

  it("limits total output length", () => {
    const html = `<title>T</title>` + `<p>${"x".repeat(2000)}</p>`;
    expect(extractSiteText(html).length).toBeLessThanOrEqual(900);
  });
});

// ─── fallbackDescription ─────────────────────────────────────────────────────

describe("fallbackDescription", () => {
  it("returns all 4 languages for hotel", () => {
    const desc = fallbackDescription("hotel");
    expect(desc).toHaveProperty("en");
    expect(desc).toHaveProperty("fr");
    expect(desc).toHaveProperty("de");
    expect(desc).toHaveProperty("el");
    expect(desc.en.length).toBeGreaterThan(10);
    expect(desc.fr.length).toBeGreaterThan(10);
    expect(desc.de.length).toBeGreaterThan(10);
    expect(desc.el.length).toBeGreaterThan(10);
  });

  it("returns all 4 languages for restaurant", () => {
    const desc = fallbackDescription("restaurant");
    expect(typeof desc.en).toBe("string");
    expect(typeof desc.fr).toBe("string");
    expect(typeof desc.de).toBe("string");
    expect(typeof desc.el).toBe("string");
  });

  it("returns 'other' fallback for unknown category", () => {
    const desc = fallbackDescription("unknown_category_xyz");
    expect(desc).toHaveProperty("en");
    expect(desc.en.length).toBeGreaterThan(5);
  });

  it("covers all known categories without throwing", () => {
    const categories = ["hotel", "tour", "beach_club", "car_rental", "restaurant", "activity", "taxi", "other"];
    for (const cat of categories) {
      const d = fallbackDescription(cat);
      expect(d.en).toBeTruthy();
      expect(d.fr).toBeTruthy();
      expect(d.de).toBeTruthy();
      expect(d.el).toBeTruthy();
    }
  });
});

// ─── parseDescriptionJson ─────────────────────────────────────────────────────

describe("parseDescriptionJson", () => {
  it("parses a plain JSON object", () => {
    const raw = `{"en":"English","fr":"Français","de":"Deutsch","el":"Ελληνικά"}`;
    const result = parseDescriptionJson(raw);
    expect(result.en).toBe("English");
    expect(result.fr).toBe("Français");
    expect(result.de).toBe("Deutsch");
    expect(result.el).toBe("Ελληνικά");
  });

  it("strips markdown code fences", () => {
    const raw = "```json\n{\"en\":\"A\",\"fr\":\"B\",\"de\":\"C\",\"el\":\"D\"}\n```";
    const result = parseDescriptionJson(raw);
    expect(result.en).toBe("A");
  });

  it("extracts JSON when surrounded by commentary text", () => {
    const raw = `Here is the output:\n{"en":"A","fr":"B","de":"C","el":"D"}\nEnd.`;
    const result = parseDescriptionJson(raw);
    expect(result.en).toBe("A");
  });

  it("throws when shape is invalid (missing field)", () => {
    const raw = `{"en":"A","fr":"B","de":"C"}`;
    expect(() => parseDescriptionJson(raw)).toThrow();
  });

  it("throws when no JSON found", () => {
    const raw = "No JSON here at all.";
    expect(() => parseDescriptionJson(raw)).toThrow();
  });
});
