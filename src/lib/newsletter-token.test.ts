import { describe, it, expect } from "vitest";
import { unsubscribeToken, emailFromUnsubscribeToken } from "./newsletter-token";

// Jusqu'au 30/09/2026 le lien de désinscription portait l'email seul en base64 :
// n'importe qui pouvait désinscrire n'importe quelle adresse en la codant lui-même.
const KEY = "k".repeat(40);
const BEFORE_CUTOFF = Date.parse("2026-10-15T00:00:00Z");
const AFTER_CUTOFF = Date.parse("2026-11-02T00:00:00Z");

describe("jeton de désinscription", () => {
  it("fait l'aller-retour, email normalisé", () => {
    const t = unsubscribeToken("  Anna@Example.GR ", KEY);
    expect(t.startsWith("v1.")).toBe(true);
    expect(emailFromUnsubscribeToken(t, KEY)).toBe("anna@example.gr");
  });

  it("ne contient pas l'email en clair", () => {
    expect(unsubscribeToken("anna@example.gr", KEY)).not.toContain("anna@example.gr");
  });

  it("refuse un jeton forgé pour une autre adresse", () => {
    const t = unsubscribeToken("anna@example.gr", KEY);
    const sig = t.split(".")[2];
    const forged = `v1.${Buffer.from("bob@example.gr").toString("base64url")}.${sig}`;
    expect(emailFromUnsubscribeToken(forged, KEY)).toBeNull();
  });

  it("refuse un jeton signé avec une autre clé", () => {
    expect(emailFromUnsubscribeToken(unsubscribeToken("anna@example.gr", "x".repeat(40)), KEY)).toBeNull();
  });

  it("refuse les jetons mal formés", () => {
    for (const t of ["", "v1.", "v1.abc", "v1.abc.def.ghi", "v1.@@@.sig"]) {
      expect(emailFromUnsubscribeToken(t, KEY, AFTER_CUTOFF), t).toBeNull();
    }
  });

  it("accepte encore un ancien lien base64 avant le 01/11/2026", () => {
    const legacy = Buffer.from("anna@example.gr").toString("base64");
    expect(emailFromUnsubscribeToken(legacy, KEY, BEFORE_CUTOFF)).toBe("anna@example.gr");
  });

  it("refuse l'ancien format après le 01/11/2026", () => {
    const legacy = Buffer.from("anna@example.gr").toString("base64");
    expect(emailFromUnsubscribeToken(legacy, KEY, AFTER_CUTOFF)).toBeNull();
  });

  it("refuse de signer sans clé", () => {
    expect(() => unsubscribeToken("anna@example.gr", "")).toThrow();
  });
});
