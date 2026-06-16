import { describe, it, expect } from "vitest";
import { haversineM, classifyMatch, matchBeachToCb } from "../cb-link";

describe("haversineM", () => {
  it("renvoie ~0 pour le même point", () => {
    expect(haversineM(35, 25, 35, 25)).toBeLessThan(1);
  });
  it("mesure une distance connue (~1 km)", () => {
    // 0.009° de latitude ≈ 1 km
    const d = haversineM(35.0, 25.0, 35.009, 25.0);
    expect(d).toBeGreaterThan(950);
    expect(d).toBeLessThan(1050);
  });
});

describe("classifyMatch", () => {
  it("high: candidat unique proche (<=400m, pas de second)", () => {
    expect(classifyMatch(120, null)).toBe("high");
  });
  it("high: second très loin (> 2x best)", () => {
    expect(classifyMatch(150, 900)).toBe("high");
  });
  it("review: best entre 400 et 1500m", () => {
    expect(classifyMatch(700, null)).toBe("review");
  });
  it("review: deux candidats proches (second <= 2x best)", () => {
    expect(classifyMatch(200, 300)).toBe("review");
  });
  it("none: aucun candidat (best null)", () => {
    expect(classifyMatch(null, null)).toBe("none");
  });
});

describe("matchBeachToCb", () => {
  const beach = { slug: "b1", latitude: 35.0, longitude: 25.0 };
  it("retourne high + le bon slug quand un seul candidat proche", () => {
    const r = matchBeachToCb(beach, [
      { slug: "cb-near", latitude: 35.001, longitude: 25.0 },
      { slug: "cb-far", latitude: 35.05, longitude: 25.0 },
    ]);
    expect(r.confidence).toBe("high");
    expect(r.cbSlug).toBe("cb-near");
    expect(r.distanceM).toBeGreaterThan(0);
  });
  it("retourne none quand aucun candidat dans 1500m", () => {
    const r = matchBeachToCb(beach, [{ slug: "cb-far", latitude: 35.2, longitude: 25.0 }]);
    expect(r.confidence).toBe("none");
    expect(r.cbSlug).toBeNull();
  });
  it("ignore les candidats sans coordonnées", () => {
    const r = matchBeachToCb(beach, [{ slug: "cb-nogeo", latitude: null, longitude: null }]);
    expect(r.confidence).toBe("none");
  });
});
