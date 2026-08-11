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
    // Ajoutees a la seconde passe du 11/08/2026 : elles tombaient a cote.
    expect(out).toContain("terrace");
    expect(out).toContain("outdoor_shower");
    expect(out).toContain("workspace");
    expect(out).not.toContain("pool");
  });

  // Le compte est le vrai sujet : la fiche affichait 0 libelle sur 18, puis 10.
  // Ce test tombe des qu un motif se met a ratisser plus large qu il ne doit.
  it("retient 13 des 18 libelles de l annonce 1, et pas un de plus", () => {
    const raw = [
      "Plage privée", "Vue mer panoramique", "Vue sur la baie", "Vue jardin",
      "Vue montagne", "Sauna privé", "Hammam", "Studio professionnel 90 m²",
      "Climatisation (toutes les ailes)", "Wifi", "Cuisine équipée",
      "Espace de travail dédié", "Lave-linge", "Parking gratuit",
      "Douche extérieure", "Terrasse en bois", "Escalier privé vers la plage",
      "Animaux acceptés",
    ];
    expect(normalizeAmenities(raw)).toHaveLength(13);
  });

  // ⛔ Les cinq qui restent dehors le sont chacun pour une raison ecrite dans
  // facts.ts. Ce test est la pour qu on ne les rattrape pas par accident.
  it("laisse dehors les libelles qui ne sont pas des equipements comparables", () => {
    expect(normalizeAmenities(["Studio professionnel 90 m²"])).toEqual([]);
    expect(normalizeAmenities(["Gazebo en pierre"])).toEqual([]);
    expect(normalizeAmenities(["200 m² sur un niveau"])).toEqual([]);
    expect(normalizeAmenities(["Reception parlee FR / EN / GR"])).toEqual([]);
    // Dit deux fois la meme chose que private_beach, sans la promettre seule.
    expect(normalizeAmenities(["Escalier privé vers la plage"])).toEqual([]);
  });

  // Annonce 3 : lit bebe et chaise haute disent la meme chose, « on peut venir
  // avec un bebe ». Une seule pastille, pas deux.
  it("regroupe le materiel bebe en une seule pastille", () => {
    expect(normalizeAmenities(["Lit bebe fourni", "Chaise haute fournie"]))
      .toEqual(["baby_gear"]);
  });

  // « Terrasse vue mer » porte VRAIMENT les deux : la terrasse et la vue.
  it("rend deux cles quand un libelle en porte deux", () => {
    expect(normalizeAmenities(["Terrasse vue mer"])).toEqual(["sea_view", "terrace"]);
    expect(normalizeAmenities(["Toit-terrasse panoramique"])).toEqual(["terrace"]);
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
    const out = normalizeAmenities(["Vue mer panoramique", "Vue sur la mer", "Vue mer"]);
    expect(out).toEqual(["sea_view"]);
  });

  // ⛔ Un motif trop large transformerait "Vue jardin" en vue mer. Une fiche qui
  // promet la mer sans la mer est pire qu une fiche sans equipements.
  // Ce test ne garde QUE les vues : "Douche exterieure" et "Espace de travail
  // dedie" y figuraient tant qu ils n avaient pas de cle, ils en ont une depuis
  // le 11/08/2026 et sont couverts plus haut.
  it("ne fabrique pas d equipement a partir d un libelle voisin", () => {
    expect(normalizeAmenities(["Vue jardin"])).toEqual([]);
    expect(normalizeAmenities(["Vue montagne"])).toEqual([]);
    expect(normalizeAmenities(["Vue sur la baie"])).toEqual([]);
    // Une douche tout court n est pas une douche exterieure.
    expect(normalizeAmenities(["Douche à l'italienne"])).toEqual([]);
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
