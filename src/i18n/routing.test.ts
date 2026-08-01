import { describe, it, expect } from "vitest";
import { localeFromPathname, isIndexableLocale, INDEXABLE_LOCALES, routing } from "./routing";

// Le middleware pose `X-Robots-Tag: noindex, follow` sur les locales hors perimetre.
// Il ne peut PAS s'appuyer sur les metadata : 23 templates posent leur propre `robots:`
// et ecrasent l'heritage du layout. Le middleware est le seul point de controle unique,
// donc l'extraction de locale doit etre exacte dans les deux sens.
// Spec : docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md

describe("localeFromPathname", () => {
  it("lit la locale du premier segment", () => {
    expect(localeFromPathname("/es/beaches")).toBe("es");
    expect(localeFromPathname("/en/buses/chania-to-heraklion")).toBe("en");
  });

  it("lit une locale sans chemin ni slash final", () => {
    expect(localeFromPathname("/fr")).toBe("fr");
  });

  it("lit une locale avec slash final", () => {
    expect(localeFromPathname("/ja/")).toBe("ja");
  });

  // Le piege : un `startsWith("/en")` naif ferait passer /enquete pour la locale en.
  // Ici l'erreur serait invisible (en est indexable), mais la meme faute sur un prefixe
  // hors perimetre mettrait en noindex une page qui doit rester indexee.
  it("ne confond pas un chemin qui commence par les memes lettres qu'une locale", () => {
    expect(localeFromPathname("/enquete/paradoxe-tourisme-crete")).toBeNull();
    expect(localeFromPathname("/nombreux")).toBeNull();
    expect(localeFromPathname("/article")).toBeNull();
  });

  it("renvoie null quand il n'y a pas de locale", () => {
    expect(localeFromPathname("/")).toBeNull();
    expect(localeFromPathname("")).toBeNull();
  });
});

describe("isIndexableLocale", () => {
  it("accepte les 4 locales du perimetre", () => {
    for (const loc of INDEXABLE_LOCALES) {
      expect(isIndexableLocale(loc)).toBe(true);
    }
  });

  it("refuse toutes les autres locales servies", () => {
    const horsPerimetre = routing.locales.filter(
      (l) => !(INDEXABLE_LOCALES as readonly string[]).includes(l),
    );

    expect(horsPerimetre).toHaveLength(18);
    for (const loc of horsPerimetre) {
      expect(isIndexableLocale(loc)).toBe(false);
    }
  });
});
