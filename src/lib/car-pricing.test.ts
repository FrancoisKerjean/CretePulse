import { describe, it, expect } from "vitest";
import { estimateCarPrice, meetsMinDays, perDayAmount, rentalDays } from "./car-pricing";

describe("meetsMinDays", () => {
  it("n'exclut personne quand la duree minimale est inconnue", () => {
    // 11 loueurs sur 11 portaient min_days a NULL le 12/08/2026. Un NULL
    // traite comme 0 exclurait tout le monde et fermerait l'appel d'offres.
    expect(meetsMinDays(null, 1)).toBe(true);
    expect(meetsMinDays(undefined, 1)).toBe(true);
  });

  it("accepte une duree egale au minimum", () => {
    expect(meetsMinDays(3, 3)).toBe(true);
  });

  it("exclut une duree sous le minimum", () => {
    // Cas reel : la demande 53, Rethymno 15/08 -> 16/08 (1 jour), routee vers
    // Luxtrans Crete (Cretecar) qui a repondu par ecrit « 3 day minimum ».
    expect(meetsMinDays(3, 1)).toBe(false);
  });

  it("n'exclut personne sur un minimum absurde en base", () => {
    // La saisie admin borne a 1..30, mais la colonne est un integer nu : une
    // ecriture directe en base ne doit pas pouvoir vider un appel d'offres.
    expect(meetsMinDays(0, 1)).toBe(true);
    expect(meetsMinDays(-2, 1)).toBe(true);
    expect(meetsMinDays(2.5, 1)).toBe(true);
  });
});

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

describe("rentalDays avec les heures de prise et de restitution", () => {
  it("compte la journee entamee quand la restitution depasse l'heure de prise", () => {
    // Cas reel Luxtrans du 01/08 : Heraklion 02/09 01:30 -> 07/09 08:00. Le
    // calcul par dates seules rendait 5 jours, donc 335 EUR affiches a 67 EUR
    // par jour au lieu de 56. Le loueur facture la journee entamee : 6 jours.
    expect(rentalDays("2026-09-02", "2026-09-07", "01:30", "08:00")).toBe(6);
  });

  it("n'ajoute pas de journee quand la voiture rentre a l'heure de prise", () => {
    expect(rentalDays("2026-09-02", "2026-09-07", "10:00", "10:00")).toBe(5);
  });

  it("n'ajoute pas de journee quand la voiture rentre plus tot dans la journee", () => {
    expect(rentalDays("2026-09-02", "2026-09-07", "10:00", "09:00")).toBe(5);
  });

  it("compte 1 jour sur un aller-retour dans la meme journee", () => {
    expect(rentalDays("2026-08-06", "2026-08-06", "08:00", "20:00")).toBe(1);
  });

  it("retombe sur le calcul par dates quand une heure manque ou est invalide", () => {
    // Les demandes d'avant la saisie obligatoire de l'heure ont time_from null
    // en base : mieux vaut la duree par dates qu'un repere invente.
    expect(rentalDays("2026-08-07", "2026-08-14", null, "08:00")).toBe(7);
    expect(rentalDays("2026-08-07", "2026-08-14", "8h", "08:00")).toBe(7);
  });

  it("n'ajoute pas de journee au passage a l'heure d'hiver", () => {
    // Le 25/10/2026 l'heure d'hiver ajoute 3 600 000 ms a l'ecart brut. Un
    // calcul en duree pure rendrait 3 jours pour 2 nuits de location.
    expect(rentalDays("2026-10-24", "2026-10-26", "10:00", "10:00")).toBe(2);
  });
});

describe("estimateCarPrice", () => {
  it("estime sur la duree reelle, journee entamee comprise", () => {
    // L'estimation indicative s'affiche aux etapes 3 et 4 du wizard, ou les
    // heures sont deja saisies : elle doit porter sur la meme duree que l'offre
    // recue ensuite, sinon le client compare 5 jours a 6.
    const est = estimateCarPrice("city", "2026-09-02", "2026-09-07", "01:30", "08:00");
    expect(est?.days).toBe(6);
  });

  it("estime sur les dates seules quand les heures manquent", () => {
    expect(estimateCarPrice("city", "2026-09-02", "2026-09-07")?.days).toBe(5);
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
