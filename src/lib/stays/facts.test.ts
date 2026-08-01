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
    expect(isAmenityKey("sauna")).toBe(false);
  });

  it("AMENITY_KEYS est la liste fermee de la spec", () => {
    expect(AMENITY_KEYS).toEqual(["pool", "sea_view", "ac", "wifi", "bbq", "parking", "pets"]);
  });
});
