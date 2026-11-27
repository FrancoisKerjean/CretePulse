import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { partnerRatings, reviewsForPlace } = vi.hoisted(() => ({ partnerRatings: vi.fn(), reviewsForPlace: vi.fn() }));
vi.mock("@/lib/car-trust-server", () => ({ partnerRatings }));
vi.mock("@/lib/google-reviews-server", () => ({ reviewsForPlace }));

import { PartnerReveal } from "./PartnerReveal";

const ROW = { id: 16, name: "Zorbas", google_rating: 4.8, google_rating_count: 930, google_place_id: "ChIJabc", google_maps_url: "https://maps.google.com/?cid=1", zone_ids: null };
const REVIEW = { author: "Marius", authorUri: null, authorPhoto: null, reviewUri: null, rating: 5, text: "Excellent", relativeTime: "il y a 6 mois", publishTime: "2026-06-01T00:00:00Z" };
const render = async (props: Parameters<typeof PartnerReveal>[0]) => renderToStaticMarkup((await PartnerReveal(props)) as never);

describe("PartnerReveal (après l'acompte ou l'acceptation)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("note complète avec nombre d'avis, avis, lien Maps", async () => {
    partnerRatings.mockResolvedValue([ROW]);
    reviewsForPlace.mockResolvedValue({ mapsUri: "https://maps.google.com/?cid=2", reviews: [REVIEW] });
    const h = await render({ partnerId: 16, locale: "fr", name: "Zorbas" });
    expect(h).toContain("Zorbas");
    expect(h).toContain("930 avis Google");
    expect(h).toContain("Marius");
    expect(h).toContain("https://maps.google.com/?cid=2");
  });

  it("Places muet : le lien Maps de la base reste affiché, seul", async () => {
    partnerRatings.mockResolvedValue([ROW]);
    reviewsForPlace.mockResolvedValue({ mapsUri: null, reviews: [] });
    const h = await render({ partnerId: 16, locale: "fr" });
    expect(h).toContain("https://maps.google.com/?cid=1");
    expect(h).toContain("Tous les avis sur Google");
  });

  it("ligne déjà lue passée en prop : pas de seconde lecture de car_partners", async () => {
    reviewsForPlace.mockResolvedValue({ mapsUri: null, reviews: [REVIEW] });
    const h = await render({ partnerId: 16, locale: "fr", withRating: false, rated: ROW });
    expect(partnerRatings).not.toHaveBeenCalled();
    expect(h).toContain("Marius");
    expect(h).not.toContain("930");
  });

  it("rien à montrer : rien", async () => {
    partnerRatings.mockResolvedValue([{ ...ROW, google_rating: null, google_maps_url: null }]);
    reviewsForPlace.mockResolvedValue({ mapsUri: null, reviews: [] });
    expect(await PartnerReveal({ partnerId: 16, locale: "fr" })).toBeNull();
  });
});
