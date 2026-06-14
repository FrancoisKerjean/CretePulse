import { describe, it, expect } from "vitest";
import { nearestKnownTown } from "../crete-towns";

describe("nearestKnownTown", () => {
  it("returns Ierapetra for a south-east coast point near it", () => {
    const r = nearestKnownTown(35.01, 25.74);
    expect(r?.name).toBe("Ierapetra");
    expect(r?.km).toBeLessThan(3);
  });
  it("returns Heraklion for a point in the capital", () => {
    expect(nearestKnownTown(35.3387, 25.1442)?.name).toBe("Heraklion");
  });
  it("returns Ano Viannos for the pilot monastery (35.0546, 25.4094)", () => {
    const r = nearestKnownTown(35.0546, 25.4094);
    expect(r?.name).toBe("Ano Viannos");
    expect(r?.km).toBeLessThan(2);
  });
  it("returns null when coords are missing", () => {
    expect(nearestKnownTown(null, 25)).toBeNull();
    expect(nearestKnownTown(35, null)).toBeNull();
  });
});
