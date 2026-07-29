import { describe, it, expect } from "vitest";
import { validateOwnerUpdate, nightsToBlock, canRelease } from "./owner-rules";

describe("validateOwnerUpdate", () => {
  it("accepte une mise a jour normale", () => {
    expect(
      validateOwnerUpdate({ basePriceEur: 120, cleaningFeeEur: 40, minNights: 3, published: true }),
    ).toBeNull();
  });

  it("refuse un prix nul ou negatif", () => {
    // Une annonce a 0 EUR passerait le tunnel de paiement et donnerait une
    // reservation gratuite.
    expect(validateOwnerUpdate({ basePriceEur: 0 })).toMatch(/prix/i);
    expect(validateOwnerUpdate({ basePriceEur: -10 })).toMatch(/prix/i);
  });

  it("refuse des frais de menage negatifs", () => {
    expect(validateOwnerUpdate({ basePriceEur: 100, cleaningFeeEur: -5 })).toMatch(/ménage/i);
  });

  it("refuse un minimum de nuits hors bornes", () => {
    expect(validateOwnerUpdate({ basePriceEur: 100, minNights: 0 })).toMatch(/nuits/i);
    expect(validateOwnerUpdate({ basePriceEur: 100, minNights: 90 })).toMatch(/nuits/i);
  });

  it("refuse un prix absurde, garde-fou contre la faute de frappe", () => {
    // 12000 au lieu de 120 : sans borne, l annonce part en ligne comme ca.
    expect(validateOwnerUpdate({ basePriceEur: 12000 })).toMatch(/prix/i);
  });
});

describe("nightsToBlock", () => {
  it("developpe une plage en nuits, depart exclu", () => {
    expect(nightsToBlock("2026-08-10", "2026-08-13")).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
  });

  it("refuse une plage vide ou inversee", () => {
    expect(nightsToBlock("2026-08-13", "2026-08-10")).toEqual([]);
    expect(nightsToBlock("2026-08-10", "2026-08-10")).toEqual([]);
  });

  it("borne une plage deraisonnable au lieu de bloquer une annee", () => {
    // Garde-fou : une erreur de saisie ne doit pas ecrire 400 lignes.
    expect(nightsToBlock("2026-01-01", "2027-01-01")).toEqual([]);
  });
});

describe("canRelease", () => {
  it("le proprietaire debloque ce qu il a lui-meme pose", () => {
    expect(canRelease("hold")).toBe(true);
  });

  it("il ne peut PAS liberer une nuit vendue", () => {
    // Sinon il revendrait ailleurs une nuit deja payee par un voyageur.
    expect(canRelease("booked")).toBe(false);
  });

  it("il ne peut pas liberer une nuit bloquee par son OTA", () => {
    // Elle reviendrait a la synchro suivante : autant ne pas mentir.
    expect(canRelease("blocked_ota")).toBe(false);
  });
});
