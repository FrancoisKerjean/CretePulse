import { describe, it, expect } from "vitest";
import { formatEur, formatAthensDeadline, formatWallDate } from "./car-format";

const LOCALES = ["en", "fr", "de", "el"];

describe("formatEur", () => {
  it("centimes affichés seulement quand il y en a", () => {
    expect(formatEur(412, "en")).toBe("€412");
    expect(formatEur(41.2, "en")).toBe("€41.20");
    expect(formatEur(41.2, "fr")).toMatch(/^41,20\s€$/);
    expect(formatEur(370.8, "de")).toMatch(/^370,80\s€$/);
  });
});

describe("formatAthensDeadline", () => {
  it("écrit l'heure d'Athènes, pas celle du serveur", () => {
    // 11:00 UTC en juillet = 14:00 à Athènes (UTC+3).
    for (const loc of LOCALES) {
      expect(formatAthensDeadline("2027-07-12T11:00:00.000Z", loc)).toContain("14:00");
    }
    // 12:00 UTC en janvier = 14:00 à Athènes (UTC+2).
    expect(formatAthensDeadline("2027-01-12T12:00:00.000Z", "en")).toContain("14:00");
  });
});

describe("formatWallDate", () => {
  it("date murale lisible dans les quatre langues, avec l'heure et le mot de liaison", () => {
    expect(formatWallDate("2027-07-20", "10:00", "en")).toBe("Tuesday, July 20, 2027 at 10:00");
    expect(formatWallDate("2027-07-20", "10:00", "fr")).toBe("mardi 20 juillet 2027 à 10:00");
    expect(formatWallDate("2027-07-20", "10:00", "de")).toBe("Dienstag, 20. Juli 2027 um 10:00");
    expect(formatWallDate("2027-07-20", "10:00", "el")).toBe("Τρίτη 20 Ιουλίου 2027 στις 10:00");
  });

  it("sans heure : la date seule ; heure Postgres « HH:MM:SS » coupée aux minutes", () => {
    expect(formatWallDate("2027-07-20", null, "fr")).toBe("mardi 20 juillet 2027");
    expect(formatWallDate("2027-07-20", "09:30:00", "en")).toBe("Tuesday, July 20, 2027 at 09:30");
  });

  it("le jour ne dépend pas du fuseau du serveur : la date est murale", () => {
    // Minuit pile : un formatage dans le fuseau local glisserait d'un jour à l'ouest de UTC.
    expect(formatWallDate("2027-01-01", "00:00", "en")).toBe("Friday, January 1, 2027 at 00:00");
  });

  it("date illisible : rendue telle quelle, jamais d'exception", () => {
    expect(formatWallDate("bientôt", "10:00", "en")).toBe("bientôt");
  });

  it("langue hors des quatre : mot de liaison anglais", () => {
    expect(formatWallDate("2027-07-20", "10:00", "it")).toMatch(/ at 10:00$/);
  });

  it("aucun tiret cadratin", () => {
    const emDash = String.fromCharCode(8212);
    for (const loc of LOCALES) expect(formatWallDate("2027-07-20", "10:00", loc)).not.toContain(emDash);
  });
});
