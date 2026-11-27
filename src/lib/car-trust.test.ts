import { describe, expect, it } from "vitest";
import { ratingAriaLabel, formatRating, trustBarCopy, partnerRevealed, validRating, agenciesServing } from "./car-trust";

describe("formatRating / ratingAriaLabel", () => {
  it("virgule décimale en fr/de/el, point en en", () => {
    expect(formatRating(4.9, "fr")).toBe("4,9");
    expect(formatRating(4.9, "de")).toBe("4,9");
    expect(formatRating(4.9, "el")).toBe("4,9");
    expect(formatRating(4.9, "en")).toBe("4.9");
    expect(formatRating(5, "fr")).toBe("5,0");
  });

  it("libellé lisible par un lecteur d'écran, 4 langues", () => {
    expect(ratingAriaLabel(4.6, "fr")).toBe("Note 4,6 sur 5");
    expect(ratingAriaLabel(4.6, "en")).toBe("Rated 4.6 out of 5");
    expect(ratingAriaLabel(4.6, "de")).toBe("Bewertung 4,6 von 5");
    expect(ratingAriaLabel(4.6, "el")).toBe("Βαθμολογία 4,6 στα 5");
  });
});

describe("agenciesServing : le bandeau ne compte que les agences qui servent la page", () => {
  const P = [
    { zone_ids: ["heraklion-center", "chania-west"] },
    { zone_ids: ["chania-west"] },
    { zone_ids: [] as string[] },
    { zone_ids: null },
  ];
  it("page de zone : seules les agences dont zone_ids contient la zone", () => {
    expect(agenciesServing(P, "chania-west")).toBe(2);
    expect(agenciesServing(P, "heraklion-center")).toBe(1);
    expect(agenciesServing(P, "rethymno")).toBe(0);
  });
  it("zone inconnue de la page : 0 (jamais le total de l'île)", () => {
    expect(agenciesServing(P, null)).toBe(0);
    expect(agenciesServing([], "chania-west")).toBe(0);
  });
  it("page centrale (sans zone) : les agences qui servent au moins une zone, sans zone = pas comptée", () => {
    expect(agenciesServing(P)).toBe(2);
  });
});

describe("trustBarCopy", () => {
  it("nombre d'agences : donnée à nous, 4 langues, rien si moins de deux", () => {
    expect(trustBarCopy(7, "fr").agencies).toBe("7 agences locales vérifiées");
    expect(trustBarCopy(7, "en").agencies).toBe("7 verified local agencies");
    expect(trustBarCopy(7, "de").agencies).toBe("7 geprüfte lokale Agenturen");
    expect(trustBarCopy(7, "el").agencies).toBe("7 επαληθευμένα τοπικά γραφεία");
    expect(trustBarCopy(1, "fr").agencies).toBeNull();
    expect(trustBarCopy(0, "fr").agencies).toBeNull();
  });
  it("aucune note ni aucun avis Google dans le bandeau (politique Places : pas de contenu dérivé)", () => {
    for (const l of ["en", "fr", "de", "el"]) {
      expect(trustBarCopy(7, l)).not.toHaveProperty("rating");
      expect(JSON.stringify(trustBarCopy(7, l))).not.toMatch(/Google|\/5/);
    }
  });
  it("les deux garanties de l'acompte, dans les 4 langues, sans tiret cadratin", () => {
    for (const l of ["en", "fr", "de", "el"]) {
      const c = trustBarCopy(7, l);
      expect(c.confirm.length).toBeGreaterThan(10);
      expect(c.cancel.length).toBeGreaterThan(10);
      expect(JSON.stringify(c)).not.toContain(String.fromCharCode(0x2014));
    }
    // La règle réelle est 4 h OUVERTES (8 h-22 h, car-deposit.ts) : « sous 4 h » tout court serait faux le soir.
    const fr = trustBarCopy(7, "fr");
    expect(fr.confirm).toBe("Confirmée sous 4 h d'ouverture (8 h à 22 h, heure grecque), sinon remboursée");
    expect(fr.cancel).toBe("Annulation gratuite jusqu'à 48 h avant la prise du véhicule");
    for (const l of ["en", "de", "el"]) expect(trustBarCopy(7, l).confirm).toMatch(/22/);
  });
});

describe("partnerRevealed : le loueur n'est nommé qu'après l'acompte ou l'acceptation", () => {
  it("révélé dès qu'un acompte a été payé, y compris remboursé ou gardé", () => {
    for (const bookingStatus of ["awaiting_partner", "confirmed", "cancelled_kept", "refunded"]) {
      expect(partnerRevealed({ bookingStatus, requestStatus: "quoted" })).toBe(true);
    }
  });
  it("jamais révélé sans statut, avec une session Stripe ouverte, ou sur des offres en cours", () => {
    expect(partnerRevealed({ bookingStatus: null, requestStatus: "quoted" })).toBe(false);
    expect(partnerRevealed({ bookingStatus: undefined, requestStatus: "new" })).toBe(false);
    expect(partnerRevealed({ bookingStatus: "pending_payment", requestStatus: "quoted" })).toBe(false);
    expect(partnerRevealed({ bookingStatus: "pending_payment", requestStatus: "accepted" })).toBe(false);
    expect(partnerRevealed({})).toBe(false);
  });
  it("mise en relation : révélé quand l'offre est acceptée sans acompte", () => {
    expect(partnerRevealed({ bookingStatus: null, requestStatus: "accepted" })).toBe(true);
    expect(partnerRevealed({ requestStatus: "accepted" })).toBe(true);
  });
  it("un statut inconnu n'ouvre rien", () => {
    expect(partnerRevealed({ bookingStatus: "whatever", requestStatus: "quoted" })).toBe(false);
  });
});

describe("validRating", () => {
  it("note valide seulement avec un nombre d'avis > 0 ; chaînes numériques acceptées", () => {
    expect(validRating({ google_rating: 4.8, google_rating_count: 367 })).toEqual({ rating: 4.8, count: 367 });
    expect(validRating({ google_rating: "4.6", google_rating_count: "12" })).toEqual({ rating: 4.6, count: 12 });
    expect(validRating({ google_rating: 4.8, google_rating_count: 0 })).toBeNull();
    expect(validRating({ google_rating: null, google_rating_count: 10 })).toBeNull();
    expect(validRating({ google_rating: "abc", google_rating_count: 10 })).toBeNull();
    expect(validRating(undefined)).toBeNull();
  });
});
