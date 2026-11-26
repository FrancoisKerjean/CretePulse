import { describe, expect, it } from "vitest";
import { pickupLabel, LABELLED_PICKUPS } from "./car-pickup-labels";
import { allPickups } from "./car-partners";
import { CAR_LANDINGS } from "./car-landings";
import { carPickupLabel } from "./car-lead";

describe("pickupLabel", () => {
  it("traduit et accentue les aéroports dans les 4 langues", () => {
    expect(pickupLabel("heraklion-airport", "fr")).toBe("Aéroport d'Héraklion (HER)");
    expect(pickupLabel("chania-airport", "fr")).toBe("Aéroport de Chania (CHQ)");
    expect(pickupLabel("chania-airport", "en")).toBe("Chania Airport (CHQ)");
    expect(pickupLabel("heraklion-airport", "de")).toBe("Flughafen Heraklion (HER)");
    expect(pickupLabel("heraklion-airport", "el")).toBe("Αεροδρόμιο Ηρακλείου (HER)");
    expect(pickupLabel("heraklion", "fr")).toBe("Héraklion");
  });

  it("langue inconnue : anglais ; slug inconnu : mots capitalisés", () => {
    expect(pickupLabel("heraklion", "it")).toBe("Heraklion");
    expect(pickupLabel("some-new-place", "fr")).toBe("Some New Place");
  });

  it("chaque point de prise de l'assistant a un libellé", () => {
    const missing = allPickups().map((p) => p.slug).filter((s) => !LABELLED_PICKUPS.includes(s));
    expect(missing).toEqual([]);
  });

  it("carPickupLabel (e-mails, page loueur, back-office) donne le libellé anglais", () => {
    expect(carPickupLabel("heraklion-airport")).toBe("Heraklion Airport (HER)");
    expect(carPickupLabel("agios-nikolaos")).toBe("Agios Nikolaos");
  });
});

describe("aéroport d'Héraklion (G3)", () => {
  it("est un point de prise de la zone Héraklion, et la landing HER y mène", () => {
    expect(allPickups().find((p) => p.slug === "heraklion-airport")?.zoneId).toBe("heraklion-center");
    expect(CAR_LANDINGS.find((l) => l.slug === "heraklion-airport")?.pickup).toBe("heraklion-airport");
  });
});
