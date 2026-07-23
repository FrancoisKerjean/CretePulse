import { describe, expect, it } from "vitest";
import { buildFluxRecommendations } from "./flux-recommendations";

describe("buildFluxRecommendations", () => {
  it("propose une vérification sans conclure qu'une liaison est absente", () => {
    const items = buildFluxRecommendations({
      cruisePax7: 0,
      busSearches30: 2_151,
      busSearchesZero30: 106,
      topZeroRoute: "almyrida → chania",
      latestIntentDay: "2026-07-22",
      latestBusDay: "2026-07-23",
      stockMeasuredDays: 8,
      stockLow: 300_000,
      stockHigh: 350_000,
    }, "2026-07-23");

    expect(items[0]).toMatchObject({
      id: "verify-unserved-demand",
      confidence: "moyenne",
    });
    expect(items[0]?.guardrail).toContain("ne prouve pas");
  });

  it("bloque l'usage décisionnel d'un stock incomplet", () => {
    const items = buildFluxRecommendations({
      cruisePax7: 0,
      busSearches30: 0,
      busSearchesZero30: 0,
      stockMeasuredDays: 3,
      stockLow: 319_402,
      stockHigh: 474_936,
    }, "2026-07-23");

    expect(items).toContainEqual(expect.objectContaining({
      id: "stock-not-actionable",
      priority: "bloquée",
    }));
  });

  it("prépare un pic croisière sans confondre capacité et débarquements", () => {
    const items = buildFluxRecommendations({
      cruisePax7: 8_000,
      busSearches30: 0,
      busSearchesZero30: 0,
      stockMeasuredDays: 8,
      stockLow: 300_000,
      stockHigh: 340_000,
    }, "2026-07-23");

    expect(items).toContainEqual(expect.objectContaining({
      id: "cruise-peak-readiness",
      owner: "Port + KTEL + Région",
    }));
  });
});
