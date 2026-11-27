import { describe, it, expect } from "vitest";
import { insuranceSummary } from "./car-inclusions";

describe("insuranceSummary", () => {
  it("anglais : montants et unité par jour inchangés", () => {
    expect(insuranceSummary("cdw_excess", 800, 9, "en")).toEqual([
      "Collision damage waiver (CDW)",
      "Excess: €800",
      "Zero-excess option: +€9/day",
    ]);
  });

  it("français : montant dans la langue, unité « /jour », deux-points français", () => {
    const [, excess, upsell] = insuranceSummary("cdw_excess", 800, 8.5, "fr");
    expect(excess).toMatch(/^Franchise\u00a0: 800\s€$/);
    expect(upsell).toMatch(/^Option zéro franchise\u00a0: \+8,50\s€\/jour$/);
  });

  it("allemand et grec : unité par jour traduite, plus de « /day » ni de « € » devant", () => {
    const de = insuranceSummary("cdw_excess", 800, 9, "de");
    expect(de[1]).toMatch(/^Selbstbeteiligung: 800\s€$/);
    expect(de[2]).toMatch(/^Option ohne Selbstbeteiligung: \+9\s€\/Tag$/);
    const el = insuranceSummary("cdw_excess", 800, 9, "el");
    expect(el[1]).toMatch(/^Απαλλαγή: 800\s€$/);
    expect(el[2]).toMatch(/\+9\s€\/ημέρα$/);
    for (const line of [...de, ...el]) expect(line).not.toContain("/day");
  });

  it("langue hors des quatre : tout en anglais, comme avant", () => {
    expect(insuranceSummary("cdw_excess", 800, 9, "it").slice(1)).toEqual(["Excess: €800", "Zero-excess option: +€9/day"]);
  });

  it("aucune info : aucune ligne", () => {
    expect(insuranceSummary(null, null, null, "fr")).toEqual([]);
  });
});
