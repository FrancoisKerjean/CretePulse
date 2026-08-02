import { describe, it, expect } from "vitest";
import { sitemapUrlEntry } from "./sitemap-entry";

// Le sitemap declarait 22 hreflang par entree : avec 3 705 entrees, cela annonçait
// ~81 500 URL a Google, qui en avait 81 200 dans un index qu'il a fini par deprecier
// (chute du 19/07/2026). Perimetre ramene a en/fr/de/el.
// Spec : docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md

const entry = { path: "/beaches", changefreq: "monthly" as const, priority: 0.6 };
const LASTMOD = "2026-08-01T00:00:00.000Z";

describe("sitemapUrlEntry", () => {
  it("n'annonce que les 4 locales indexables plus x-default", () => {
    const xml = sitemapUrlEntry(entry, LASTMOD);

    expect(xml.match(/rel="alternate"/g)).toHaveLength(5);
    for (const loc of ["en", "fr", "de", "el"]) {
      expect(xml).toContain(`hreflang="${loc}"`);
    }
    expect(xml).toContain('hreflang="x-default"');
  });

  it("n'annonce plus aucune locale hors perimetre", () => {
    const xml = sitemapUrlEntry(entry, LASTMOD);

    for (const loc of ["es", "ja", "ru", "cs", "no", "pt", "hu", "fi"]) {
      expect(xml, `locale ${loc}`).not.toContain(`hreflang="${loc}"`);
    }
  });

  it("garde le loc canonique en /en", () => {
    expect(sitemapUrlEntry(entry, LASTMOD)).toContain(
      "<loc>https://crete.direct/en/beaches</loc>",
    );
  });

  it("utilise le lastmod de l'entree quand elle en porte un", () => {
    const xml = sitemapUrlEntry({ ...entry, lastmod: "2026-07-15T10:00:00.000Z" }, LASTMOD);

    expect(xml).toContain("<lastmod>2026-07-15T10:00:00.000Z</lastmod>");
  });

  it("echappe les caracteres XML du chemin", () => {
    const xml = sitemapUrlEntry({ ...entry, path: "/explore/a&b" }, LASTMOD);

    expect(xml).toContain("a&amp;b");
    expect(xml).not.toContain("a&b<");
  });
});
