import { describe, it, expect } from "vitest";
import { perDayAmount, rentalDays } from "./car-pricing";

describe("rentalDays", () => {
  it("compte les jours entre deux dates ISO", () => {
    expect(rentalDays("2026-08-07", "2026-08-14")).toBe(7);
  });

  it("rend au moins 1 jour quand les dates sont identiques", () => {
    // Cas reel : la demande 32 de Nabila portait 06/08 -> 06/08. Un total
    // divise par 0 afficherait Infinity au loueur.
    expect(rentalDays("2026-08-06", "2026-08-06")).toBe(1);
  });

  it("rend 1 sur une date non ISO plutot que NaN", () => {
    expect(rentalDays("06/08/2026", "2026-08-14")).toBe(1);
  });
});

describe("perDayAmount", () => {
  it("rend le prix par jour arrondi au dixieme", () => {
    // Le cas Luxtrans du 30/07 : 200 EUR saisis pour 7 jours, prix pense pour 2.
    expect(perDayAmount(200, 7)).toBe(28.6);
  });

  it("ne laisse pas trainer de decimale sur un quotient entier", () => {
    expect(perDayAmount(350, 7)).toBe(50);
  });

  it("rend le total lui-meme sur une location d'un jour", () => {
    expect(perDayAmount(90, 1)).toBe(90);
  });

  it("rend null sur un prix vide, zero ou negatif", () => {
    // Le champ est un <input type=number> : tant qu'il est vide, Number("")
    // vaut 0 et aucun repere ne doit s'afficher.
    expect(perDayAmount(0, 7)).toBeNull();
    expect(perDayAmount(-50, 7)).toBeNull();
    expect(perDayAmount(Number.NaN, 7)).toBeNull();
  });

  it("rend null sur une duree inexploitable", () => {
    expect(perDayAmount(200, 0)).toBeNull();
    expect(perDayAmount(200, 2.5)).toBeNull();
  });
});
