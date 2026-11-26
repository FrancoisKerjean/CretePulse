// E-mail « nouvelle offre » au client (sendCustomerNewOffer), le seul envoyé à
// chaque offre depuis le modèle multi-offres (quote/route.ts et submit/route.ts).
// Il renvoie vers la page d'offres, qui seule sait si une offre se réserve par
// acompte. Il ne doit donc jamais porter les lignes « aucun prépaiement » ni
// les étapes de mise en relation de sharedOfferCopy : interrupteur allumé,
// elles contrediraient l'acompte (allumage, point A3).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SHARED_OFFER_COPY } from "./car-offer-copy";

const send = vi.fn();
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ data: { id: "re_1" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

const LOCALES = ["en", "fr", "de", "el"] as const;

async function newOfferHtml(locale: string): Promise<string> {
  const { sendCustomerNewOffer } = await import("./email");
  await sendCustomerNewOffer({
    email: "marie@example.fr",
    locale,
    customerName: "Marie",
    offersUrl: "https://crete.direct/fr/car-offer/tok",
    pickupLabel: "Heraklion Airport",
  });
  return (send.mock.calls.at(-1)?.[0] as { html: string }).html;
}

describe("sendCustomerNewOffer", () => {
  describe.each(["on", "off"])("interrupteur %s", (state) => {
    beforeEach(() => vi.stubEnv("CAR_CATALOGUE_ENABLED", state));

    it.each(LOCALES)("%s : ni « aucun prépaiement » ni étapes de mise en relation", async (locale) => {
      const html = await newOfferHtml(locale);
      expect(html).toContain("https://crete.direct/fr/car-offer/tok");
      for (const line of [...SHARED_OFFER_COPY[locale].reassure, ...SHARED_OFFER_COPY[locale].steps]) {
        expect(html).not.toContain(line);
      }
      expect(html).not.toContain(String.fromCharCode(8212));
    });
  });
});
