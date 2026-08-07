import { describe, it, expect } from "vitest";
import { resolveAcceptPhone } from "@/lib/car-lead";

// Le telephone est exige ICI, au moment ou le client accepte une offre chiffree,
// et nulle part avant :
//   - a l'acceptation le client est engage (il a choisi un prix), la friction
//     d'un champ ne lui fait pas abandonner ce qu'il vient de decider ;
//   - c'est exactement le moment ou le numero devient utile, puisque le loueur
//     ne recoit les coordonnees qu'apres acceptation ;
//   - 100 % des conversions portent donc un canal de rappel, sans toucher au
//     volume de demandes.
// Declencheur : demande 33, Zakros Tours, 9 jours de silence faute de numero.

describe("resolveAcceptPhone : un numéro rappelable sur chaque conversion", () => {
  it("garde le numéro déjà donné à la demande, sans rien redemander", () => {
    const r = resolveAcceptPhone("+39 333 1234567", undefined);
    expect(r).toEqual({ ok: true, phone: "+39 333 1234567" });
  });

  it("prend le numéro saisi à l'acceptation quand la demande n'en portait pas", () => {
    const r = resolveAcceptPhone(null, " +30 6978 186250 ");
    expect(r).toEqual({ ok: true, phone: "+30 6978 186250" });
  });

  it("refuse l'acceptation quand aucun numéro n'existe ni n'est saisi", () => {
    expect(resolveAcceptPhone(null, undefined)).toEqual({ ok: false });
    expect(resolveAcceptPhone("", "")).toEqual({ ok: false });
  });

  it("refuse un numéro saisi qui ne rappelle personne", () => {
    for (const saisi of ["-", "n/a", "00", "12345"]) {
      expect(resolveAcceptPhone(null, saisi), `saisi "${saisi}"`).toEqual({ ok: false });
    }
  });

  it("laisse le client corriger un numéro stocké inutilisable", () => {
    // Une demande ancienne peut porter « - » : le champ etait libre. Dans ce cas
    // on redemande, au lieu de propager un numero mort jusqu'au loueur.
    expect(resolveAcceptPhone("-", "+39 333 1234567")).toEqual({ ok: true, phone: "+39 333 1234567" });
    expect(resolveAcceptPhone("-", undefined)).toEqual({ ok: false });
  });

  it("applique exactement la règle isCallablePhone, jamais une seconde", async () => {
    const { isCallablePhone } = await import("@/lib/car-lead");
    for (const p of ["+39 333 1234567", "12345", "-", "0612345678", ""]) {
      const accepte = resolveAcceptPhone(null, p).ok;
      expect(accepte, `divergence sur "${p}"`).toBe(isCallablePhone(p));
    }
  });
});
