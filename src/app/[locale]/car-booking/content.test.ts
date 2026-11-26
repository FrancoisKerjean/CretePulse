import { describe, it, expect } from "vitest";
import { L, CAR_BOOKING_LOCALES, pickCarBookingLocale, formatEur, formatAthensDeadline, fill } from "./content";

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

  it("acompte : chaque langue annonce les 48 h, les 4 h d'ouverture et porte ses gabarits", () => {
    for (const loc of CAR_BOOKING_LOCALES) {
      const s = L[loc];
      expect(s.depositCancelRule).toMatch(/48/);
      expect(s.depositConfirmRule).toMatch(/4/);
      expect(s.depositPay).toContain("{deposit}");
      expect(s.awaitingBody).toContain("{partner}");
      expect(s.awaitingBody).toContain("{deadline}");
      expect(s.confirmedBody).toContain("{partner}");
    }
  });

  it("annulation client : chaque langue dit avant le clic ce qui est rendu, et après le clic le montant", () => {
    for (const loc of CAR_BOOKING_LOCALES) {
      const s = L[loc];
      expect(s.cancelGetBack).toContain("{amount}");
      expect(s.cancelGetBackNothing).toContain("{amount}");
      expect(s.cancelGetBackNothing).toMatch(/48/);
      expect(s.cancelledRefunded).toContain("{amount}");
      expect(s.cancelRetry).toContain("hello@crete.direct");
    }
  });

  it("fill remplace chaque gabarit, même répété", () => {
    expect(fill("{a} et {b}, {a}", { a: "1", b: "2" })).toBe("1 et 2, 1");
  });

  it("formatEur : centimes affichés seulement quand il y en a", () => {
    expect(formatEur(412, "en")).toBe("€412");
    expect(formatEur(41.2, "en")).toBe("€41.20");
    expect(formatEur(41.2, "fr")).toMatch(/^41,20\s€$/);
    expect(formatEur(370.8, "de")).toMatch(/^370,80\s€$/);
  });

  it("formatAthensDeadline écrit l'heure d'Athènes, pas celle du serveur", () => {
    // 11:00 UTC en juillet = 14:00 à Athènes (UTC+3).
    for (const loc of CAR_BOOKING_LOCALES) {
      expect(formatAthensDeadline("2027-07-12T11:00:00.000Z", loc)).toContain("14:00");
    }
    // 12:00 UTC en janvier = 14:00 à Athènes (UTC+2).
    expect(formatAthensDeadline("2027-01-12T12:00:00.000Z", "en")).toContain("14:00");
  });
});
