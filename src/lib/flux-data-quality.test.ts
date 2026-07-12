import { describe, expect, it } from "vitest";
import { ageInDays, confidenceLabel, freshnessLabel, type FluxQualityItem } from "./flux-data-quality";

const base: FluxQualityItem = {
  id: "test",
  decision: "Tester",
  source: "Source",
  evidence: "observé",
  coverage: "forte",
  status: "opérationnel",
  cadence: "quotidien",
  confidence: 3,
  limit: "Aucune",
  next: "Surveiller",
};

describe("flux data quality", () => {
  it("calcule la fraîcheur en jours UTC", () => {
    expect(ageInDays("2026-07-10", new Date("2026-07-12T23:00:00Z"))).toBe(2);
    expect(ageInDays(undefined, new Date("2026-07-12T00:00:00Z"))).toBeNull();
  });

  it("distingue une source fraîche d'un angle mort", () => {
    expect(freshnessLabel({ ...base, latestDay: "2026-07-12" }, new Date("2026-07-12T12:00:00Z")))
      .toBe("à jour aujourd'hui");
    expect(freshnessLabel({ ...base, status: "angle mort" }, new Date("2026-07-12T12:00:00Z")))
      .toBe("non collecté");
  });

  it("rend les quatre niveaux de confiance", () => {
    expect([0, 1, 2, 3].map((score) => confidenceLabel(score as 0 | 1 | 2 | 3)))
      .toEqual(["non mesuré", "exploratoire", "indicatif", "robuste"]);
  });
});

