import { describe, it, expect } from "vitest";
import { searchPlaces, normalizeSearch, type PlaceIndexRow } from "./place-search";

// 30/09/2026 : 1 431 des 1 713 recherches internes (83 %) revenaient vides. Les plus
// fréquentes sont des noms de lieux que cb_places connaît : matala, rethymnon, agia galini.
const INDEX: PlaceIndexRow[] = [
  ["Ancient Matala", "ancient-matala", "archaeological-site"],
  ["Matala beach", "matala-beach", "beach"],
  ["Rethymnon beach", "rethymnon-beach", "beach"],
  ["Fortress Fortezza in Rethymnon", "fortezza", "fort"],
  ["Agia Galini beach", "agia-galini-beach", "beach"],
  ["Agia Fotia beach at Ierapetra", "agia-fotia", "beach"],
  ["Voulismata beach", "voulismata", "beach"],
  ["Balos lagoon", "balos", "beach"],
  ["Réthymno Café", "cafe", "town"],
  ["Pahia Ammos beach, Ierapetra", "pahia-ammos", "beach"],
  ["Holy Cross Foundation, Kalyves", "kalyves", "monastery"],
];
const slugs = (q: string) => searchPlaces(INDEX, q).map((r) => r[1]);

describe("searchPlaces", () => {
  it("trouve un lieu par son nom et met la plage en tête à égalité", () => {
    expect(slugs("matala")).toEqual(["matala-beach", "ancient-matala"]);
  });

  it("tolère une variante d'orthographe plus longue que le nom (rethymnon / rethymno)", () => {
    expect(slugs("rethymno")).toContain("rethymnon-beach");
    expect(slugs("rethymnon")).toContain("cafe");
  });

  it("exige tous les mots, dans n'importe quel ordre", () => {
    expect(slugs("agia galini")).toEqual(["agia-galini-beach"]);
    expect(slugs("galini agia")).toEqual(["agia-galini-beach"]);
  });

  it("trouve par début de mot", () => {
    expect(slugs("voulisma")).toEqual(["voulismata"]);
  });

  it("ignore « beach » et ses traductions, qui ne distinguent aucun lieu", () => {
    expect(slugs("balos beach")).toEqual(["balos"]);
    expect(slugs("plage balos")).toEqual(["balos"]);
  });

  it("replie les graphies concurrentes d'un nom grec (ch/h, y/i, ou/u)", () => {
    expect(slugs("pachia ammos")).toEqual(["pahia-ammos"]);
    expect(slugs("kalives")).toEqual(["kalyves"]);
    expect(slugs("vulismata")).toEqual(["voulismata"]);
  });

  it("ignore accents et majuscules", () => {
    expect(normalizeSearch("Réthymno")).toBe("rethymno");
    expect(slugs("RÉTHYMNO café")).toEqual(["cafe"]);
  });

  it("ne rend rien sous deux caractères ni pour un mot absent", () => {
    expect(slugs("m")).toEqual([]);
    expect(slugs("zzzz")).toEqual([]);
  });

  it("plafonne le nombre de résultats", () => {
    expect(searchPlaces(INDEX, "beach", 2)).toHaveLength(2);
  });
});
