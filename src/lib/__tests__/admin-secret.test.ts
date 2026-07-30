import { describe, it, expect } from "vitest";
import { isAdminSecret } from "../admin-secret";

const SECRET = "reviews-admin-secret-de-test";

describe("isAdminSecret", () => {
  it("refuse quand le secret n'est pas configure (echec ferme)", () => {
    expect(isAdminSecret(SECRET, undefined)).toBe(false);
    expect(isAdminSecret("", undefined)).toBe(false);
    expect(isAdminSecret(SECRET, "")).toBe(false);
  });

  it("accepte le secret exact", () => {
    expect(isAdminSecret(SECRET, SECRET)).toBe(true);
  });

  it("refuse une valeur absente, vide ou partielle", () => {
    expect(isAdminSecret("", SECRET)).toBe(false);
    expect(isAdminSecret(null, SECRET)).toBe(false);
    expect(isAdminSecret(SECRET.slice(0, -1), SECRET)).toBe(false);
    expect(isAdminSecret(`${SECRET}x`, SECRET)).toBe(false);
  });

  // Comparer avec !== s'arrete au premier octet different : le temps de reponse
  // fuit la longueur du prefixe correct. timingSafeEqual ne court-circuite pas,
  // et le garde de longueur doit passer AVANT (il leve sur des tailles inegales).
  it("ne leve jamais, quelles que soient les longueurs", () => {
    expect(() => isAdminSecret("court", "beaucoup-plus-long")).not.toThrow();
    expect(() => isAdminSecret("beaucoup-plus-long", "court")).not.toThrow();
    expect(isAdminSecret("a".repeat(64), "b".repeat(64))).toBe(false);
  });
});
