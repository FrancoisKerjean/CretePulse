import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAirbnbFacts } from "./airbnb-facts";

const html = readFileSync(join(__dirname, "fixtures/airbnb-pdp.html"), "utf8");

describe("parseAirbnbFacts", () => {
  it("lit la note et le nombre d avis", () => {
    const f = parseAirbnbFacts(html);
    expect(f.ratingAvg).toBeGreaterThan(0);
    expect(f.ratingAvg).toBeLessThanOrEqual(5);
    expect(f.reviewsCount).toBeGreaterThan(0);
  });

  it("lit la capacite et la langue de la description", () => {
    const f = parseAirbnbFacts(html);
    expect(f.maxGuests).toBeGreaterThan(0);
    expect(f.descriptionLocale).toMatch(/^[a-z]{2}$/);
  });

  it("rend des nulls sur un html vide, sans lever", () => {
    expect(parseAirbnbFacts("")).toEqual({
      ratingAvg: null, reviewsCount: null, maxGuests: null,
      lat: null, lng: null, descriptionLocale: null,
    });
  });

  it("rend null sur une note hors bornes plutot que de la propager", () => {
    expect(parseAirbnbFacts('"starRating":9.9').ratingAvg).toBe(null);
  });
});
