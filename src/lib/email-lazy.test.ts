import { afterEach, describe, expect, it, vi } from "vitest";

// M15 : sans clé Resend, importer le module d'e-mails ne doit pas lever
// (la vraie lib lève « Missing API key » dans son constructeur).
describe("email.ts sans RESEND_API_KEY", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it("s'importe sans erreur ; le client n'est créé qu'au premier envoi", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(import("./email")).resolves.toBeDefined();
  });
});
