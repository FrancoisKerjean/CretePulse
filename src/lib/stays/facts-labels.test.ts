import { describe, it, expect } from "vitest";
import { normalizeAmenities } from "./facts";

// Les trois annonces publiees portent des LIBELLES libres, pas les cles du
// scrape : "Plage privee", "Cuisine equipee", "Wi-Fi"... Aucun ne passait la
// liste fermee, donc la fiche affichait ZERO equipement sur 18 en base.
// Meme motif que les slugs bus contre corridors cote van.
describe("normalizeAmenities sur les libelles reels des annonces", () => {
  it("reconnait les libelles accentues de l annonce 1", () => {
    const raw = [
      "Plage privée", "Vue mer panoramique", "Vue sur la baie", "Vue jardin",
      "Vue montagne", "Sauna privé", "Hammam", "Studio professionnel 90 m²",
      "Climatisation (toutes les ailes)", "Wifi", "Cuisine équipée",
      "Espace de travail dédié", "Lave-linge", "Parking gratuit",
      "Douche extérieure", "Terrasse en bois", "Escalier privé vers la plage",
      "Animaux acceptés",
    ];
    const out = normalizeAmenities(raw);
    expect(out).toContain("private_beach");
    expect(out).toContain("sea_view");
    expect(out).toContain("sauna");
    expect(out).toContain("hammam");
    expect(out).toContain("ac");
    expect(out).toContain("wifi");
    expect(out).toContain("kitchen");
    expect(out).toContain("washer");
    expect(out).toContain("parking");
    expect(out).toContain("pets");
    expect(out).not.toContain("pool");
  });

  // ⛔ L annonce 3 ecrit SANS accents. Sans normalisation des diacritiques,
  // "Cuisine equipee" et "Cuisine équipée" ne donnent pas le meme resultat.
  it("reconnait les memes equipements ecrits sans accents", () => {
    const out = normalizeAmenities([
      "Piscine privee chauffee", "Cuisine equipee", "Climatisation (toutes les chambres)",
      "Parking prive gratuit", "BBQ sous pergola", "Terrasse vue mer", "Lave-linge",
    ]);
    expect(out).toEqual(expect.arrayContaining([
      "pool", "kitchen", "ac", "parking", "bbq", "sea_view", "washer",
    ]));
  });

  it("reconnait les variantes d ecriture d un meme equipement", () => {
    expect(normalizeAmenities(["Wi-Fi"])).toEqual(["wifi"]);
    expect(normalizeAmenities(["WIFI"])).toEqual(["wifi"]);
    expect(normalizeAmenities(["Barbecue"])).toEqual(["bbq"]);
    expect(normalizeAmenities(["BBQ sous pergola"])).toEqual(["bbq"]);
  });

  it("dedoublonne quand plusieurs libelles designent le meme equipement", () => {
    const out = normalizeAmenities(["Vue mer panoramique", "Terrasse vue mer", "Vue mer"]);
    expect(out).toEqual(["sea_view"]);
  });

  // ⛔ Un motif trop large transformerait "Vue jardin" en vue mer et "Douche
  // exterieure" en piscine. Une fiche qui promet la mer sans la mer est pire
  // qu une fiche sans equipements.
  it("ne fabrique pas d equipement a partir d un libelle voisin", () => {
    expect(normalizeAmenities(["Vue jardin"])).toEqual([]);
    expect(normalizeAmenities(["Vue montagne"])).toEqual([]);
    expect(normalizeAmenities(["Douche extérieure"])).toEqual([]);
    expect(normalizeAmenities(["Espace de travail dédié"])).toEqual([]);
  });

  it("continue d accepter les cles canoniques du scrape", () => {
    expect(normalizeAmenities(["pool", "wifi"])).toEqual(["pool", "wifi"]);
  });

  it("garde l ordre d affichage, quel que soit l ordre en base", () => {
    const a = normalizeAmenities(["Wifi", "Plage privée", "Piscine privée"]);
    const b = normalizeAmenities(["Piscine privée", "Wifi", "Plage privée"]);
    expect(a).toEqual(b);
    expect(a[0]).toBe("private_beach");
  });
});
