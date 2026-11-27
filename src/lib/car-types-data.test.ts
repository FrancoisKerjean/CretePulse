import { describe, expect, it } from "vitest";
import { featuredCategory } from "./car-types-data";

describe("featuredCategory", () => {
  it("la catégorie au prix par jour le plus bas ; à égalité, l'ordre du catalogue", () => {
    expect(featuredCategory({ compact: 40, city: 44, sedan: 94.44 }, ["city", "compact", "sedan"])).toBe("compact");
    expect(featuredCategory({ compact: 40, city: 40 }, ["city", "compact"])).toBe("city");
  });
  it("aucun prix (interrupteur éteint, aucune grille) : aucune mise en avant", () => {
    expect(featuredCategory({}, ["city", "compact"])).toBeNull();
  });
  it("ignore une catégorie inconnue et un prix illisible", () => {
    expect(featuredCategory({ truck: 10, compact: Number.NaN, city: 50 }, ["city", "compact"])).toBe("city");
  });
});
