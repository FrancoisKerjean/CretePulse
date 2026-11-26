import { describe, expect, it } from "vitest";
import {
  daysLabel, gearboxLabel, localizeQuotedModel, OFFER_VIEW, priceDelta, recommendOffer, reviewExcerpt,
} from "./car-offer-view";

describe("recommendOffer", () => {
  const rating = (r: Record<number, number | null>) => (o: { id: number }) => r[o.id] ?? null;

  it("met en avant le total le plus bas", () => {
    const offers = [{ id: 1, price: 334.32 }, { id: 2, price: 280 }, { id: 3, price: 313.04 }];
    expect(recommendOffer(offers, rating({}))?.id).toBe(2);
  });

  it("à égalité de prix, la mieux notée sur Google", () => {
    const offers = [{ id: 1, price: 280 }, { id: 2, price: 280 }];
    expect(recommendOffer(offers, rating({ 1: 4.6, 2: 5.0 }))?.id).toBe(2);
  });

  it("une offre moins chère gagne même moins bien notée", () => {
    const offers = [{ id: 1, price: 281 }, { id: 2, price: 280 }];
    expect(recommendOffer(offers, rating({ 1: 5.0, 2: 4.0 }))?.id).toBe(2);
  });

  it("à égalité sans note, l'ordre reçu ; aucune offre : null", () => {
    expect(recommendOffer([{ id: 1, price: 280 }, { id: 2, price: 280 }], rating({}))?.id).toBe(1);
    expect(recommendOffer([], rating({}))).toBeNull();
  });
});

describe("priceDelta", () => {
  it("écart au centime, jamais négatif", () => {
    expect(priceDelta(313.04, 280)).toBe(33.04);
    expect(priceDelta(280, 280)).toBe(0);
    expect(priceDelta(270, 280)).toBe(0);
  });
});

describe("boîte traduite à l'affichage (M1)", () => {
  it("gearboxLabel dans les 4 langues", () => {
    expect(gearboxLabel("automatic", "fr")).toBe("Automatique");
    expect(gearboxLabel("manual", "fr")).toBe("Manuelle");
    expect(gearboxLabel("manual", "de")).toBe("Schaltgetriebe");
    expect(gearboxLabel("automatic", "el")).toBe("Αυτόματο");
    expect(gearboxLabel(null, "fr")).toBeNull();
  });

  it("localizeQuotedModel traduit le modèle figé en anglais en base", () => {
    expect(localizeQuotedModel("VW Polo auto · Automatic", "fr")).toBe("VW Polo auto · Automatique");
    expect(localizeQuotedModel("Fiat Panda · Manual", "de")).toBe("Fiat Panda · Schaltgetriebe");
    expect(localizeQuotedModel("Manual", "fr")).toBe("Manuelle");
    expect(localizeQuotedModel("Toyota Yaris", "fr")).toBe("Toyota Yaris");
    expect(localizeQuotedModel(null, "fr")).toBeNull();
  });
});

describe("reviewExcerpt", () => {
  it("garde un avis court tel quel", () => {
    expect(reviewExcerpt("Parfait.")).toEqual({ short: "Parfait.", truncated: false });
  });
  it("coupe un avis long sur un mot et ajoute des points de suspension", () => {
    const long = "mot ".repeat(100);
    const r = reviewExcerpt(long, 50);
    expect(r.truncated).toBe(true);
    expect(r.short.endsWith("…")).toBe(true);
    expect(r.short.length).toBeLessThanOrEqual(51);
    expect(r.short).not.toMatch(/\s…$/);
  });
});

describe("textes de la page d'offres", () => {
  it("4 langues, mêmes clés, aucun tiret cadratin, aucune mention de Kairos", () => {
    const keys = Object.keys(OFFER_VIEW.en).sort();
    for (const l of ["fr", "de", "el"] as const) expect(Object.keys(OFFER_VIEW[l]).sort()).toEqual(keys);
    const all = JSON.stringify(OFFER_VIEW);
    expect(all).not.toContain(String.fromCharCode(0x2014));
    expect(all.toLowerCase()).not.toContain("kairos");
  });

  it("daysLabel accorde le pluriel", () => {
    expect(daysLabel(1, "fr")).toBe("1 jour");
    expect(daysLabel(7, "fr")).toBe("7 jours");
    expect(daysLabel(7, "el")).toBe("7 ημέρες");
  });
});
