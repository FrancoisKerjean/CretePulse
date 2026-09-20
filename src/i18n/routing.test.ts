import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  localeFromPathname,
  isIndexableLocale,
  INDEXABLE_LOCALES,
  RETIRED_LOCALES,
  routing,
} from "./routing";

// Le middleware pose `X-Robots-Tag: noindex, follow` sur les locales hors perimetre.
// Il ne peut PAS s'appuyer sur les metadata : 23 templates posent leur propre `robots:`
// et ecrasent l'heritage du layout. Le middleware est le seul point de controle unique,
// donc l'extraction de locale doit etre exacte dans les deux sens.
// Spec : docs/superpowers/specs/2026-08-01-seo-locale-scope-design.md

describe("localeFromPathname", () => {
  it("lit la locale du premier segment", () => {
    expect(localeFromPathname("/de/beaches")).toBe("de");
    expect(localeFromPathname("/en/buses/chania-to-heraklion")).toBe("en");
  });

  it("lit une locale sans chemin ni slash final", () => {
    expect(localeFromPathname("/fr")).toBe("fr");
  });

  it("lit une locale avec slash final", () => {
    expect(localeFromPathname("/el/")).toBe("el");
  });

  // ⛔ Une locale retirée du routage n'est plus UNE LOCALE pour cette fonction : le
  // middleware ne doit pas la traiter comme telle, c'est `next.config.ts` qui la redirige
  // avant lui. Ce test disait l'inverse jusqu'au 20/09/2026 (`/ja/` -> "ja").
  it("ne reconnaît plus une locale retirée du routage", () => {
    expect(localeFromPathname("/ja/")).toBeNull();
    expect(localeFromPathname("/es/beaches")).toBeNull();
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

  // Le 20/09/2026 les 18 locales hors périmètre ont quitté le ROUTAGE, pas seulement
  // l'indexation : il n'existe donc plus de locale servie et non indexable. Ce test
  // exigeait `toHaveLength(18)` et disait vrai jusqu'à cette date.
  it("ne laisse plus aucune locale servie hors du périmètre indexable", () => {
    const horsPerimetre = routing.locales.filter(
      (l) => !(INDEXABLE_LOCALES as readonly string[]).includes(l),
    );

    expect(horsPerimetre).toEqual([]);
  });

  it("refuse une locale retirée du routage", () => {
    for (const loc of RETIRED_LOCALES) {
      expect(isIndexableLocale(loc)).toBe(false);
    }
  });
});

/**
 * ⛔ TROIS ENDROITS DOIVENT RESTER D'ACCORD, ET DEUX SUFFISENT À CASSER LE SITE :
 * `routing.locales` (ce qui est servi), `RETIRED_LOCALES` (ce qui est redirigé) et
 * l'alternation du `next.config.ts` (ce qui redirige pour de vrai).
 *
 * Un trou = 404 sur un vieux lien. Un chevauchement = une locale servie qui se redirige
 * hors d'elle-même, donc une page inatteignable. Ni l'un ni l'autre ne casse le build.
 */
const LOCALES_HISTORIQUES_22 = [
  "en", "fr", "de", "el", "it", "nl", "pl", "es", "pt", "ru", "ja",
  "ko", "zh", "tr", "sv", "da", "no", "fi", "cs", "hu", "ro", "ar",
];

describe("périmètre des locales", () => {
  it("couvre les 22 locales historiques sans trou ni chevauchement", () => {
    const servies = [...routing.locales];
    const retirees = [...RETIRED_LOCALES];

    expect(servies.filter((l) => retirees.includes(l))).toEqual([]);
    expect([...servies, ...retirees].sort()).toEqual([...LOCALES_HISTORIQUES_22].sort());
  });

  // Garde de SOURCE : `next.config.ts` est chargé hors du bundle, on ne peut pas
  // l'importer ici. On lit donc son texte, comme `check:da` le fait pour la charte.
  it("next.config.ts redirige exactement les locales retirées", () => {
    const source = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    const trouve = source.match(/const retired = "([a-z|]+)"/);

    expect(trouve, "la constante `retired` a disparu de next.config.ts").not.toBeNull();
    expect(trouve![1].split("|").sort()).toEqual([...RETIRED_LOCALES].sort());
  });
});
