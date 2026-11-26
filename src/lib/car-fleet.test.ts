import { describe, it, expect } from "vitest";
import { fleetModelsFor, categoryShowcase, offerCarPhoto } from "./car-fleet";
import type { CarFleet, FleetModel } from "./car-fleet-build";

const m = (model: string, over: Partial<FleetModel> = {}): FleetModel => ({
  model, body: "city", gearbox: "manual", fuel: null, seats: 5,
  photo640: null, photo1280: null, photoQuality: null, photoUniform: null,
  confirmed: false, quotes2026: 0, ...over,
});
const ph = (slug: string, quality: "good" | "ok" = "good", uniform = true): Partial<FleetModel> => ({
  photo640: `/f/${slug}-640.webp`, photo1280: `/f/${slug}-1280.webp`, photoQuality: quality, photoUniform: uniform,
});

const FLEET: CarFleet = {
  "1": { name: "Alpha", models: [
    m("Hyundai i10", { quotes2026: 30 }),
    m("Fiat Panda", { ...ph("a-panda", "ok", false), quotes2026: 2 }),
    m("Kia Picanto", { confirmed: true, gearbox: "both" }),
    m("Toyota Aygo", { ...ph("a-aygo"), confirmed: true, quotes2026: 1 }),
    m("VW Polo", { body: "compact", gearbox: "automatic", ...ph("a-polo") }),
    m("Citroën C3", { body: "compact", ...ph("a-c3") }),
    m("Citroën C3 Aircross", { body: "suv", ...ph("a-c3x") }),
    m("Renault Trafic", { body: "van", gearbox: "automatic", seats: 9 }),
  ] },
  "2": { name: "Beta", models: [
    m("Fiat Panda", { ...ph("b-panda", "good", false), confirmed: true }),
    m("Kia Picanto", { quotes2026: 5 }),
    m("Toyota Aygo X", { ...ph("b-aygox", "good", true) }),
  ] },
  "3": { name: "Gamma", models: [
    m("Fiat Panda", { quotes2026: 4 }),
    m("Suzuki Celerio", { ...ph("c-celerio", "ok", true) }),
  ] },
};

describe("fleetModelsFor", () => {
  it("catégorie = carrosserie ; ordre : confirmés, puis avec photo, puis devis 2026", () => {
    expect(fleetModelsFor(1, "city", FLEET).map((x) => x.model))
      .toEqual(["Toyota Aygo", "Kia Picanto", "Fiat Panda", "Hyundai i10"]);
  });
  it("automatic = toute boîte automatique (ou les deux), toutes carrosseries", () => {
    expect(fleetModelsFor(1, "automatic", FLEET).map((x) => x.model).sort())
      .toEqual(["Kia Picanto", "Renault Trafic", "VW Polo"]);
  });
  it("loueur inconnu ou catégorie vide : liste vide", () => {
    expect(fleetModelsFor(99, "city", FLEET)).toEqual([]);
    expect(fleetModelsFor(3, "sedan", FLEET)).toEqual([]);
  });
});

describe("categoryShowcase", () => {
  it("les 3 modèles proposés par le plus de loueurs, puis par devis", () => {
    const s = categoryShowcase("city", [1, 2, 3], FLEET);
    expect(s.models).toEqual(["Fiat Panda", "Kia Picanto", "Hyundai i10"]);
  });
  it("meilleure photo : qualité « good », fond uni d'abord", () => {
    expect(categoryShowcase("city", [1, 2, 3], FLEET).photo).toEqual({
      model: "Toyota Aygo", partnerId: 1, src640: "/f/a-aygo-640.webp", src1280: "/f/a-aygo-1280.webp",
    });
    // Sans Alpha : Aygo X (good, uni) passe devant la Panda (good, fond non uni) et la Celerio (ok).
    expect(categoryShowcase("city", [2, 3], FLEET).photo?.model).toBe("Toyota Aygo X");
  });
  it("à qualité égale, la photo d'un des modèles cités passe devant", () => {
    const fleet: CarFleet = { "1": { name: "A", models: [
      m("Seat Mii", ph("mii")),
      m("Fiat Panda", { ...ph("panda"), quotes2026: 9 }),
    ] } };
    expect(categoryShowcase("city", [1], fleet).photo?.model).toBe("Fiat Panda");
  });
  it("photo sans version 1280 (source < 1 100 px) : gardée, la 1280 retombe sur la 640", () => {
    const fleet: CarFleet = { "1": { name: "A", models: [
      m("Toyota Corolla", { body: "sedan", photo640: "/f/corolla-640.webp", photoQuality: "good", photoUniform: true }),
    ] } };
    expect(categoryShowcase("sedan", [1], fleet).photo).toEqual({
      model: "Toyota Corolla", partnerId: 1, src640: "/f/corolla-640.webp", src1280: "/f/corolla-640.webp",
    });
    expect(offerCarPhoto(1, "sedan", "Corolla or similar", fleet))
      .toEqual({ model: "Toyota Corolla", src640: "/f/corolla-640.webp", src1280: "/f/corolla-640.webp", exact: true });
  });
  it("seuls les loueurs demandés comptent ; aucun modèle : vitrine vide", () => {
    expect(categoryShowcase("city", [3], FLEET).models).toEqual(["Fiat Panda", "Suzuki Celerio"]);
    expect(categoryShowcase("sedan", [1, 2, 3], FLEET)).toEqual({ models: [], photo: null });
    expect(categoryShowcase("city", [99], FLEET)).toEqual({ models: [], photo: null });
  });
});

describe("offerCarPhoto", () => {
  it("modèle saisi reconnu (casse, « or similar ») : sa photo, exacte", () => {
    expect(offerCarPhoto(1, "compact", "vw polo or similar", FLEET))
      .toEqual({ model: "VW Polo", src640: "/f/a-polo-640.webp", src1280: "/f/a-polo-1280.webp", exact: true });
  });
  it("sans la marque, avec plusieurs modèles séparés : le premier reconnu qui a une photo", () => {
    expect(offerCarPhoto(2, "city", "I10, Panda", FLEET)?.model).toBe("Fiat Panda");
    expect(offerCarPhoto(1, "city", "Aygo / Panda", FLEET)?.model).toBe("Toyota Aygo");
  });
  it("Volkswagen, accents, instantané « · Automatic » du devis", () => {
    expect(offerCarPhoto(1, "automatic", "Volkswagen Polo auto · Automatic", FLEET)?.model).toBe("VW Polo");
    expect(offerCarPhoto(1, "compact", "Citroen C3 ou similaire", FLEET)?.model).toBe("Citroën C3");
  });
  it("le nom le plus long l'emporte (C3 Aircross, pas C3)", () => {
    expect(offerCarPhoto(1, "suv", "Citroën C3 Aircross", FLEET)?.model).toBe("Citroën C3 Aircross");
  });
  it("modèle inconnu du loueur : vitrine du loueur dans la catégorie, non exacte", () => {
    expect(offerCarPhoto(1, "city", "Mitsubishi Space Star", FLEET))
      .toEqual({ model: "Toyota Aygo", src640: "/f/a-aygo-640.webp", src1280: "/f/a-aygo-1280.webp", exact: false });
    expect(offerCarPhoto(1, "city", null, FLEET)?.exact).toBe(false);
  });
  it("modèle reconnu sans photo : vitrine, pas une autre voiture du même nom ailleurs", () => {
    expect(offerCarPhoto(1, "city", "Hyundai i10", FLEET)).toMatchObject({ model: "Toyota Aygo", exact: false });
  });
  it("« Toyota Aygo » ne prend pas la photo de l'Aygo X", () => {
    expect(offerCarPhoto(2, "city", "Toyota Aygo", FLEET)?.exact).toBe(false);
  });
  it("loueur sans flotte, ou sans photo dans la catégorie : null", () => {
    expect(offerCarPhoto(99, "city", "Fiat Panda", FLEET)).toBeNull();
    expect(offerCarPhoto(3, "compact", "VW Polo", FLEET)).toBeNull();
  });
});

describe("flotte réelle (src/data/car-fleet.json)", () => {
  it("vitrine citadine des 9 loueurs : la Fiat Panda en tête, avec une photo", () => {
    const ids = [134, 105, 81, 31, 137, 16, 100, 120, 111];
    const s = categoryShowcase("city", ids);
    expect(s.models[0]).toBe("Fiat Panda");
    expect(s.models).toHaveLength(3);
    expect(s.photo?.src640).toMatch(/^\/images\/fleet\/.+-640\.webp$/);
  });
  it("chaque catégorie du catalogue a au moins un modèle photographié", () => {
    const ids = [134, 105, 81, 31, 137, 16, 100, 120, 111];
    for (const c of ["city", "compact", "sedan", "automatic", "suv"] as const) {
      expect(categoryShowcase(c, ids).photo, c).not.toBeNull();
    }
  });
});
