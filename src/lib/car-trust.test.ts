import { describe, expect, it } from "vitest";
import { aggregateRating, ratingAriaLabel, formatRating, trustBarCopy } from "./car-trust";

describe("aggregateRating", () => {
  it("moyenne pondérée par le nombre d'avis, arrondie au dixième", () => {
    // (5,0 × 367 + 4,6 × 345 + 4,8 × 349) / 1061 = 4,80
    const r = aggregateRating([
      { google_rating: 5.0, google_rating_count: 367 },
      { google_rating: 4.6, google_rating_count: 345 },
      { google_rating: 4.8, google_rating_count: 349 },
    ]);
    expect(r).toEqual({ rating: 4.8, count: 1061, partners: 3 });
  });

  it("un gros loueur pèse plus qu'un petit", () => {
    const r = aggregateRating([
      { google_rating: 4.0, google_rating_count: 1000 },
      { google_rating: 5.0, google_rating_count: 10 },
    ]);
    expect(r?.rating).toBe(4.0);
  });

  it("ignore les loueurs sans note ou sans avis", () => {
    const r = aggregateRating([
      { google_rating: null, google_rating_count: null },
      { google_rating: 4.5, google_rating_count: 0 },
      { google_rating: 4.4, google_rating_count: 50 },
    ]);
    expect(r).toEqual({ rating: 4.4, count: 50, partners: 1 });
  });

  it("aucun loueur noté : null, jamais une note inventée", () => {
    expect(aggregateRating([])).toBeNull();
    expect(aggregateRating([{ google_rating: null, google_rating_count: 12 }])).toBeNull();
  });

  it("lit les nombres renvoyés en chaîne par PostgREST (numeric)", () => {
    const r = aggregateRating([{ google_rating: "4.9" as unknown as number, google_rating_count: 100 }]);
    expect(r).toEqual({ rating: 4.9, count: 100, partners: 1 });
  });
});

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

describe("trustBarCopy", () => {
  it("la note et le nombre d'avis dans la langue, jamais de chiffre en dur", () => {
    const agg = { rating: 4.9, count: 5598, partners: 6 };
    expect(trustBarCopy(agg, "fr").rating).toBe("4,9/5 sur 5 598 avis Google de nos loueurs");
    expect(trustBarCopy(agg, "en").rating).toBe("4.9/5 from 5,598 Google reviews of our rental partners");
  });
  it("les deux garanties de l'acompte, dans les 4 langues, sans tiret cadratin", () => {
    for (const l of ["en", "fr", "de", "el"]) {
      const c = trustBarCopy({ rating: 4.8, count: 10, partners: 1 }, l);
      expect(c.confirm.length).toBeGreaterThan(10);
      expect(c.cancel.length).toBeGreaterThan(10);
      expect(JSON.stringify(c)).not.toContain(String.fromCharCode(0x2014));
    }
    // La règle réelle est 4 h OUVERTES (8 h-22 h, car-deposit.ts) : « sous 4 h » tout court serait faux le soir.
    const fr = trustBarCopy({ rating: 4.8, count: 10, partners: 1 }, "fr");
    expect(fr.confirm).toBe("Confirmée sous 4 h d'ouverture (8 h à 22 h, heure grecque), sinon remboursée");
    expect(fr.cancel).toBe("Annulation gratuite jusqu'à 48 h avant la prise du véhicule");
    for (const l of ["en", "de", "el"]) expect(trustBarCopy(null, l).confirm).toMatch(/22/);
  });
});
