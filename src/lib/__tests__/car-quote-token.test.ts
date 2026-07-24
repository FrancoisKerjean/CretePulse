import { describe, it, expect } from "vitest";
import { resolveClientToken } from "@/lib/car-quote";

// Régression : le lien d'offres client (page /car-offer/{token}) doit être
// STABLE sur toute la vie de la demande. Avant ce fix, chaque nouveau devis et
// chaque relance rotationnaient le token, invalidant tous les emails précédents
// (le client tombait sur une 404 sur tous ses mails sauf le tout dernier).
describe("resolveClientToken (lien d'offres client stable)", () => {
  it("réutilise le token existant pour que chaque email pointe la même page", () => {
    const atSubmit = resolveClientToken(null); // demande créée : on frappe une fois
    expect(atSubmit.isNew).toBe(true);
    expect(atSubmit.token).toBeTruthy();

    const onNewQuote = resolveClientToken(atSubmit.token); // loueur B chiffre
    const onRelance = resolveClientToken(atSubmit.token); // cron relance

    expect(onNewQuote.isNew).toBe(false);
    expect(onNewQuote.token).toBe(atSubmit.token);
    expect(onRelance.token).toBe(atSubmit.token);
  });

  it("frappe un token neuf pour une demande legacy sans token stocké", () => {
    const undef = resolveClientToken(undefined);
    const empty = resolveClientToken("");
    expect(undef.isNew).toBe(true);
    expect(empty.isNew).toBe(true);
    expect(undef.token).toBeTruthy();
  });
});
