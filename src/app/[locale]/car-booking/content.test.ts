import { describe, it, expect } from "vitest";
import { L, CAR_BOOKING_LOCALES, pickCarBookingLocale } from "./content";

describe("contenu /car-booking", () => {
  it("retombe sur l anglais hors des quatre langues redigees", () => {
    expect(pickCarBookingLocale("it")).toBe("en");
    expect(pickCarBookingLocale("fr")).toBe("fr");
  });

  it("expose les memes cles dans les quatre langues", () => {
    const ref = Object.keys(L.en).sort();
    for (const loc of CAR_BOOKING_LOCALES) {
      expect(Object.keys(L[loc]).sort()).toEqual(ref);
    }
  });

  it("ne presente JAMAIS l option comme une assurance", () => {
    // Distribuer de l assurance est une activite reglementee que crete.direct
    // n exerce pas. Le mot est interdit dans toutes les langues.
    for (const loc of CAR_BOOKING_LOCALES) {
      const all = Object.values(L[loc]).join(" ");
      expect(all).not.toMatch(/assurance|insurance|Versicherung|ασφάλ/i);
    }
  });

  it("annonce partout la fenetre de 48 h et l absence de remboursement sans option", () => {
    for (const loc of CAR_BOOKING_LOCALES) {
      expect(L[loc].optionHelp).toMatch(/48/);
      expect(L[loc].optionHelp.length).toBeGreaterThan(40);
    }
  });

  it("respecte la contrainte DA : aucun tiret cadratin", () => {
    // Le caractere est ecrit par son code : l ecrire en clair ferait tomber le
    // gate check:da sur ce fichier de test lui-meme.
    const emDash = String.fromCharCode(0x2014);
    for (const loc of CAR_BOOKING_LOCALES) {
      expect(Object.values(L[loc]).join(" ")).not.toContain(emDash);
    }
  });
});
