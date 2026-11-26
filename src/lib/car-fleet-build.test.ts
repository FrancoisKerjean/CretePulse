import { describe, it, expect } from "vitest";
import { buildCarFleet, bodyOf, modelKey, quotesOf, type ManifestPhoto, type SourcePartner } from "./car-fleet-build";

const src = (over: Partial<SourcePartner["models"][number]>): SourcePartner["models"][number] => ({
  model: "Fiat Panda", category: "city", gearbox: "manual", fuel: "gasoline", seats: 5,
  siteGroup: null, sources: [], confirmed: false, ...over,
});
const photo = (over: Partial<ManifestPhoto>): ManifestPhoto => ({
  partnerId: 1, model: "Fiat Panda", gearbox: "manual",
  src640: "/images/fleet/a/fiat-panda-640.webp", src1280: "/images/fleet/a/fiat-panda-1280.webp",
  quality: "good", uniformBackground: true, ...over,
});

describe("modelKey", () => {
  it("casse, accents, ponctuation et Volkswagen ramenés à une clé", () => {
    expect(modelKey("Citroën C3")).toBe("citroen c3");
    expect(modelKey("VW up!")).toBe("vw up");
    expect(modelKey("Volkswagen  Polo")).toBe("vw polo");
    expect(modelKey("Mini Cooper Countryman ")).toBe("mini cooper countryman");
  });
});

describe("quotesOf", () => {
  it("lit le nombre de devis 2026 dans les sources", () => {
    expect(quotesOf(["https://x", "devis 2026 (x22)"])).toBe(22);
    expect(quotesOf(["https://x"])).toBe(0);
  });
});

describe("bodyOf", () => {
  it("garde les carrosseries du relevé", () => {
    for (const c of ["city", "compact", "sedan", "suv"]) expect(bodyOf(src({ category: c }))).toBe(c);
  });
  it("7 places et plus = van, quelle que soit la catégorie relevée", () => {
    expect(bodyOf(src({ category: "suv", seats: 7 }))).toBe("van");
    expect(bodyOf(src({ category: "other", model: "Dacia Jogger", seats: 7 }))).toBe("van");
  });
  it("minibus, MPV et utilitaires sans nombre de places = van", () => {
    expect(bodyOf(src({ category: "other", model: "VW Transporter T6", seats: null, siteGroup: "Group F" }))).toBe("van");
    expect(bodyOf(src({ category: "other", model: "Toyota Proace City Verso", seats: 5, siteGroup: "Minivan" }))).toBe("van");
    expect(bodyOf(src({ category: "other", model: "Renault Grand Scenic", seats: null, siteGroup: "MPV (groupe FA)" }))).toBe("van");
  });
  it("cabriolets et breaks restent other", () => {
    expect(bodyOf(src({ category: "other", model: "Fiat 500c", seats: 4, siteGroup: "Cabrio" }))).toBe("other");
    expect(bodyOf(src({ category: "other", model: "Opel Astra ST", seats: 5, siteGroup: "Station Wagon" }))).toBe("other");
  });
  it("catégorie inconnue : erreur, jamais une carrosserie devinée", () => {
    expect(() => bodyOf(src({ category: "spaceship" }))).toThrow(/spaceship/);
  });
});

describe("buildCarFleet", () => {
  it("garde les modèles confirmés, cités en devis ou photographiés, écarte les autres", () => {
    const fleet = buildCarFleet(
      [{ id: 1, name: "A", models: [
        src({ model: "Fiat Panda" }),
        src({ model: "Kia Picanto", confirmed: true }),
        src({ model: "Hyundai i10", sources: ["devis 2026 (x3)"] }),
        src({ model: "Toyota Aygo" }),
      ] }],
      [photo({})],
    );
    expect(fleet["1"].name).toBe("A");
    expect(fleet["1"].models.map((m) => m.model)).toEqual(["Fiat Panda", "Kia Picanto", "Hyundai i10"]);
    const panda = fleet["1"].models[0];
    expect(panda).toEqual({
      model: "Fiat Panda", body: "city", gearbox: "manual", fuel: "gasoline", seats: 5,
      photo640: "/images/fleet/a/fiat-panda-640.webp", photo1280: "/images/fleet/a/fiat-panda-1280.webp",
      photoQuality: "good", photoUniform: true, confirmed: false, quotes2026: 0,
    });
    expect(fleet["1"].models[2].quotes2026).toBe(3);
    expect(fleet["1"].models[2].photo640).toBeNull();
  });

  it("fusionne les doublons de modèle d'un loueur (boîte des deux, une seule photo)", () => {
    const fleet = buildCarFleet(
      [{ id: 1, name: "A", models: [
        src({ model: "Toyota Proace City", category: "other", seats: 7, gearbox: "manual" }),
        src({ model: "Toyota Proace City", category: "other", seats: 7, gearbox: "automatic", confirmed: true }),
      ] }],
      [
        photo({ model: "Toyota Proace City", gearbox: "manual", src640: "/p1-640.webp", src1280: "/p1-1280.webp", quality: "ok" }),
        photo({ model: "Toyota Proace City", gearbox: "automatic", src640: "/p2-640.webp", src1280: "/p2-1280.webp", quality: "good" }),
      ],
    );
    expect(fleet["1"].models).toHaveLength(1);
    expect(fleet["1"].models[0]).toMatchObject({ body: "van", gearbox: "both", confirmed: true, photo640: "/p2-640.webp", photoQuality: "good" });
  });

  it("carburant « petrol » ramené à « gasoline »", () => {
    const fleet = buildCarFleet([{ id: 1, name: "A", models: [src({ fuel: "petrol", confirmed: true })] }], []);
    expect(fleet["1"].models[0].fuel).toBe("gasoline");
  });

  it("photo d'un loueur absent du relevé : erreur (id loueur inconnu)", () => {
    expect(() => buildCarFleet([{ id: 1, name: "A", models: [src({})] }], [photo({ partnerId: 99 })]))
      .toThrow(/99/);
  });

  it("photo d'un modèle absent du relevé du loueur : erreur", () => {
    expect(() => buildCarFleet([{ id: 1, name: "A", models: [src({})] }], [photo({ model: "Tesla Model S" })]))
      .toThrow(/Tesla Model S/);
  });

  it("id loueur en double dans le relevé : erreur", () => {
    expect(() => buildCarFleet([{ id: 1, name: "A", models: [] }, { id: 1, name: "B", models: [] }], []))
      .toThrow(/double/);
  });
});
