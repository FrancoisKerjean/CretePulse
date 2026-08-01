import { describe, it, expect } from "vitest";
import { buildAlternates } from "./seo";
import { INDEXABLE_LOCALES, routing } from "@/i18n/routing";

// Contexte : effondrement Google du 19/07/2026. Le sitemap et les <head> declaraient
// 22 hreflang par page, soit ~81 500 URL pour 3 705 pages reelles. Perimetre indexable
// ramene a en/fr/de/el (decision Francois 01/08/2026).
// Spec : docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md

describe("buildAlternates", () => {
  it("n'annonce en hreflang que les 4 locales indexables, plus x-default", () => {
    const { languages } = buildAlternates("en", "/beaches");

    expect(Object.keys(languages).sort()).toEqual(["de", "el", "en", "fr", "x-default"]);
  });

  it("pointe chaque hreflang vers l'URL de sa locale", () => {
    const { languages } = buildAlternates("en", "/beaches");

    expect(languages.fr).toBe("https://crete.direct/fr/beaches");
    expect(languages["x-default"]).toBe("https://crete.direct/en/beaches");
  });

  // Une locale hors perimetre reste SERVIE : elle porte un canonical vers elle-meme.
  // Un canonical vers /en serait contradictoire avec le noindex qu'elle recoit par
  // ailleurs (cf X-Robots-Tag), et Google ignore les signaux contradictoires.
  it("garde un canonical self sur une locale hors perimetre", () => {
    expect(buildAlternates("es", "/beaches").canonical).toBe("https://crete.direct/es/beaches");
  });

  it("n'annonce aucune locale hors perimetre, meme depuis une page hors perimetre", () => {
    const { languages } = buildAlternates("es", "/beaches");

    expect(languages.es).toBeUndefined();
    expect(languages.ja).toBeUndefined();
  });
});

describe("INDEXABLE_LOCALES", () => {
  it("est un sous-ensemble strict des locales servies", () => {
    for (const loc of INDEXABLE_LOCALES) {
      expect(routing.locales).toContain(loc);
    }
    expect(INDEXABLE_LOCALES.length).toBeLessThan(routing.locales.length);
  });
});
