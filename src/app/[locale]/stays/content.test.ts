import { describe, it, expect } from "vitest";
import { L, STAYS_LOCALES, pickStaysLocale, languageName } from "./content";

describe("pickStaysLocale", () => {
  it("garde les quatre langues servies par /stays", () => {
    for (const l of STAYS_LOCALES) expect(pickStaysLocale(l)).toBe(l);
  });

  // Le site sert 22 langues, /stays quatre : les 18 autres retombent sur en,
  // jamais sur une page vide.
  it("retombe sur l anglais pour une des 18 autres langues du site", () => {
    expect(pickStaysLocale("it")).toBe("en");
    expect(pickStaysLocale("")).toBe("en");
  });
});

describe("languageName", () => {
  // ⛔ Le defaut corrige ici : la fiche affichait « rédigée en en », le code
  // ISO brut injecte dans la phrase. Vu en prod le 11/08/2026.
  it("rend un nom de langue, jamais le code", () => {
    expect(languageName("en", "fr")).toBe("anglais");
    expect(languageName("fr", "en")).toBe("French");
    expect(languageName("el", "de")).toBe("Griechisch");
  });

  it("ecrit ce nom dans la langue de la page", () => {
    expect(languageName("en", "fr")).not.toBe(languageName("en", "de"));
  });

  // Une langue inconnue vaut mieux affichee en code qu effacee : la phrase
  // reste lisible et on voit ce qui cloche.
  it("retombe sur le code plutot que sur du vide", () => {
    expect(languageName("zz-ZZ-nawak", "fr")).toBeTruthy();
    expect(languageName("", "fr")).toBe("");
  });
});

describe("langNote", () => {
  // ⛔ Les quatre variantes annoncaient une traduction automatique qui n existe
  // nulle part dans le depot : une seule colonne `description`, affichee telle
  // quelle. Ce test empeche la phrase de revenir.
  it("ne promet plus une traduction que le produit ne fait pas", () => {
    for (const l of STAYS_LOCALES) {
      expect(L[l].langNote.toLowerCase()).not.toMatch(
        /traduit|translated|übersetzt|μετάφραση/,
      );
    }
  });

  it("porte le marqueur {lang} dans les quatre langues", () => {
    for (const l of STAYS_LOCALES) expect(L[l].langNote).toContain("{lang}");
  });
});
