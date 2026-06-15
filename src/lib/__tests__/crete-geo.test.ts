import { describe, it, expect } from "vitest";
import { projectCreteLatLng, toRoman } from "../crete-geo";

describe("projectCreteLatLng", () => {
  it("places Heraklion (35.34, 25.14) in the north-central band", () => {
    const { x, y } = projectCreteLatLng(35.3387, 25.1442);
    expect(x).toBeGreaterThan(50);
    expect(x).toBeLessThan(65);
    expect(y).toBeLessThan(45);
  });
  it("places agia-pelagia (35.05, 25.41) east-central and lower", () => {
    const { x, y } = projectCreteLatLng(35.0546, 25.4094);
    expect(x).toBeGreaterThan(60);
    expect(y).toBeGreaterThan(60);
  });
  it("clamps out-of-box coords into [0,100]", () => {
    const { x, y } = projectCreteLatLng(10, 10);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(100);
  });
});

describe("toRoman", () => {
  it("converts centuries", () => {
    expect(toRoman(14)).toBe("XIV");
    expect(toRoman(4)).toBe("IV");
    expect(toRoman(19)).toBe("XIX");
  });
  it("returns empty for non-positive", () => expect(toRoman(0)).toBe(""));
});
