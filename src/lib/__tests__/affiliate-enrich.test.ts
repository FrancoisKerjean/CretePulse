/**
 * Unit tests for the pure functions in affiliate-enrich.ts.
 * Tests: isLikelyRealPhoto, extractOgImage, extractSiteText, fallbackDescription, parseDescriptionJson.
 * No network calls, no DB, no env vars needed.
 */
import { describe, it, expect } from "vitest";
import {
  isLikelyRealPhoto,
  extractOgImage,
  extractSiteText,
  fallbackDescription,
  parseDescriptionJson,
} from "@/lib/affiliate-enrich";

// ─── isLikelyRealPhoto ───────────────────────────────────────────────────────

describe("isLikelyRealPhoto", () => {
  it("accepts a real jpg URL", () => {
    expect(isLikelyRealPhoto("https://example.com/wp-content/uploads/hotel.jpg")).toBe(true);
  });

  it("accepts a real png URL", () => {
    expect(isLikelyRealPhoto("https://example.com/images/gallery/room.png")).toBe(true);
  });

  it("accepts a real webp URL", () => {
    expect(isLikelyRealPhoto("https://cdn.example.com/photos/exterior.webp")).toBe(true);
  });

  it("accepts jpg with query string", () => {
    expect(isLikelyRealPhoto("https://example.com/media/hero.jpg?w=1200")).toBe(true);
  });

  it("rejects a .ico file", () => {
    expect(isLikelyRealPhoto("https://example.com/favicon.ico")).toBe(false);
  });

  it("rejects a path containing 'favicon'", () => {
    expect(isLikelyRealPhoto("https://example.com/assets/favicon-32x32.png")).toBe(false);
  });

  it("rejects a path containing '/icon'", () => {
    expect(isLikelyRealPhoto("https://example.com/icon/app.png")).toBe(false);
  });

  it("rejects apple-touch-icon", () => {
    expect(isLikelyRealPhoto("https://example.com/apple-touch-icon.png")).toBe(false);
  });

  it("rejects sprite", () => {
    expect(isLikelyRealPhoto("https://example.com/assets/sprite.png")).toBe(false);
  });

  it("rejects logo", () => {
    expect(isLikelyRealPhoto("https://example.com/images/logo.png")).toBe(false);
  });
});

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

  it("returns null when only a favicon is present (no real photo)", () => {
    const html = `<link rel="icon" href="images/favicon.ico">`;
    expect(extractOgImage(html, BASE)).toBeNull();
  });

  it("returns null when only shortcut icon is present", () => {
    const html = `<link rel="shortcut icon" href="https://example.com/fav.png">`;
    // fav.png has 'fav' which is not explicitly rejected, but path has no upload keyword
    // and filename doesn't match photo ext heuristic clearly... let's check with favicon in name
    const html2 = `<link rel="shortcut icon" href="https://example.com/favicon.png">`;
    expect(extractOgImage(html2, BASE)).toBeNull();
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

  it("falls through to content img when og:image is a favicon", () => {
    const html = `
      <meta property="og:image" content="https://example.com/favicon.ico">
      <img src="/wp-content/uploads/2024/hotel-hero.jpg" width="1200" height="800">
    `;
    expect(extractOgImage(html, BASE)).toBe("https://example.com/wp-content/uploads/2024/hotel-hero.jpg");
  });

  it("picks a large content img when no og/twitter/link_image_src", () => {
    const html = `
      <html><body>
        <img src="/wp-content/uploads/hero.jpg" width="1200" height="800">
        <img src="/icons/arrow.png" width="16" height="16">
      </body></html>
    `;
    expect(extractOgImage(html, BASE)).toBe("https://example.com/wp-content/uploads/hero.jpg");
  });

  it("returns null when only small icons are in the HTML", () => {
    const html = `
      <img src="/favicon.ico" width="16" height="16">
      <img src="/icons/logo.png" width="48" height="48">
    `;
    expect(extractOgImage(html, BASE)).toBeNull();
  });

  it("resolves relative img src to absolute URL", () => {
    const html = `<img src="/images/gallery/exterior.jpg" width="800" height="600">`;
    expect(extractOgImage(html, BASE)).toBe("https://example.com/images/gallery/exterior.jpg");
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
