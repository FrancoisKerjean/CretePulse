import { describe, it, expect } from "vitest";
import { AMENITY_KEYS, normalizeAmenities, isAmenityKey } from "./facts";

describe("normalizeAmenities", () => {
  it("garde les cles connues, dans l ordre d affichage", () => {
    expect(normalizeAmenities(["wifi", "pool"])).toEqual(["pool", "wifi"]);
  });

  it("jette les cles inconnues sans lever", () => {
    expect(normalizeAmenities(["pool", "jacuzzi", "helipad"])).toEqual(["pool"]);
  });

  it("dedoublonne", () => {
    expect(normalizeAmenities(["wifi", "wifi"])).toEqual(["wifi"]);
  });

  it("accepte une entree nulle, absente ou mal typee", () => {
    expect(normalizeAmenities(null)).toEqual([]);
    expect(normalizeAmenities(undefined)).toEqual([]);
    expect(normalizeAmenities("pool" as unknown as string[])).toEqual([]);
    expect(normalizeAmenities([1, {}, null] as unknown as string[])).toEqual([]);
  });

  it("isAmenityKey discrimine", () => {
    expect(isAmenityKey("pool")).toBe(true);
    expect(isAmenityKey("jacuzzi")).toBe(false);
  });

  // Liste elargie deux fois le 11/08/2026 : d abord plage privee, hammam et
  // sauna, que les annonces portaient sans avoir de cle ou aller ; puis
  // terrasse, douche exterieure, espace de travail et equipement bebe, apres
  // avoir compte que 8 libelles sur 18 tombaient encore a cote.
  // L ORDRE est l ordre d affichage, du plus differenciant au moins.
  it("AMENITY_KEYS est la liste fermee de la spec", () => {
    expect(AMENITY_KEYS).toEqual([
      "private_beach", "pool", "sea_view", "hammam", "sauna", "terrace",
      "outdoor_shower", "ac", "wifi", "kitchen", "washer", "bbq",
      "workspace", "parking", "baby_gear", "pets",
    ]);
  });
});
