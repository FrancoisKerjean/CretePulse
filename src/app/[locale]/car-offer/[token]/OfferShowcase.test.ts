import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OfferRow, PickCard, type OfferItem } from "./OfferShowcase";
import { OFFER_VIEW } from "@/lib/car-offer-view";

// Anonymisation de la liste des offres : ce que le serveur rend avant l'acompte.
const ITEM: OfferItem = {
  id: 1, token: "tok", price: 455, priceText: "455 €", splitText: "45,50 € aujourd'hui · 409,50 € au comptoir",
  rating: 4.8,
  photo: { src640: "/images/fleet/p111/fiat-panda-640.webp", src1280: "/images/fleet/p111/fiat-panda-1280.webp", model: "Fiat Panda", exact: true },
  model: "Fiat Panda", gearbox: "Manuelle", note: null, insurance: [], inclusions: [],
  blockedText: null, buttonLabel: "Réserver", doneText: "ok", expiredText: "expiré", needsPhone: false,
  phoneLabel: "", phoneHint: "", phoneError: "", errorText: "", rank: 1, total: 2,
  refusals: {} as OfferItem["refusals"],
};
const v = OFFER_VIEW.fr;
const pick = (item: OfferItem) => renderToStaticMarkup(createElement(PickCard, {
  item, v, locale: "fr", eyebrow: "Notre choix", reason: "Le prix le plus bas", daysText: "7 jours", guarantees: [], revealLine: v.revealLine,
}));
const row = (item: OfferItem) => renderToStaticMarkup(createElement(OfferRow, { item, v, locale: "fr", delta: 0 }));

describe("offres avant l'acompte", () => {
  it("carte « Notre choix » : libellé neutre, note sans nombre, ligne de révélation, ni avis ni lien Maps", () => {
    const h = pick(ITEM);
    expect(h).toContain("Agence locale vérifiée");
    expect(h).toContain("Google Maps");
    expect(h).not.toMatch(/\d+ avis Google/);
    expect(h).not.toMatch(/google\.com\/maps|Lire les avis|Tous les avis/);
    expect(h).toContain(v.revealLine.replace(/'/g, "&#x27;"));
    expect(h).toContain('alt="Fiat Panda"');
  });
  it("offre bloquée : pas de promesse « dès l'acompte payé »", () => {
    expect(pick({ ...ITEM, blockedText: "Trop proche du départ" })).not.toContain(v.revealLine.replace(/'/g, "&#x27;"));
  });
  it("ligne des autres offres : libellé neutre, sans « Lire les avis »", () => {
    const h = row(ITEM);
    expect(h).toContain("Agence locale vérifiée");
    expect(h).not.toContain("Lire les avis");
    expect(h).not.toMatch(/\d+ avis Google/);
  });
});
