import { describe, expect, it } from "vitest";
import { primaryCancelAction } from "./cancel-flow";

describe("annulation en deux temps (G4)", () => {
  it("le premier clic demande confirmation, il n'envoie rien", () => {
    expect(primaryCancelAction("idle")).toBe("ask");
  });
  it("seul le clic de confirmation envoie l'annulation", () => {
    expect(primaryCancelAction("confirm")).toBe("send");
  });
});
