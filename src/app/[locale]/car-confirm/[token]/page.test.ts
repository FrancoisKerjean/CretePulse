// Page loueur « Confirm / Not available ». ⛔ Elle n'écrit JAMAIS en GET : les
// antivirus de messagerie ouvrent les liens des e-mails, une page qui agirait à
// l'ouverture confirmerait ou refuserait à la place du loueur (R33).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { bookingByConfirmToken, confirmBooking, releaseBooking, refundConfirmed, from } = vi.hoisted(() => ({
  bookingByConfirmToken: vi.fn(),
  confirmBooking: vi.fn(),
  releaseBooking: vi.fn(),
  refundConfirmed: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/car-deposit-server", () => ({ bookingByConfirmToken, confirmBooking, releaseBooking, refundConfirmed }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));

import CarConfirmPage from "./page";

const EM_DASH = String.fromCharCode(8212);

const BOOKING = {
  id: 25,
  booking_status: "awaiting_partner",
  refund_reason: null,
  partner_name: "Zorbas Rent a Car",
  quoted_car_model: "Fiat Panda · Manual",
  car_type: "compact",
  pickup_slug: "heraklion-airport",
  date_from: "2027-07-20",
  time_from: "10:00",
  date_to: "2027-07-27",
  time_to: "10:00",
  quoted_price: 412,
  deposit_eur: 41.2,
  quoted_insurance_type: "cdw_excess",
  quoted_excess_eur: 800,
  quoted_zero_excess_upsell_eur_day: null,
  confirm_deadline_at: "2099-07-13T08:30:00.000Z",
};

async function render(booking: unknown, locale = "en"): Promise<string> {
  bookingByConfirmToken.mockResolvedValueOnce(booking);
  const el = await CarConfirmPage({ params: Promise.resolve({ locale, token: "conf-plain" }) });
  return renderToStaticMarkup(el).replace(/[  ]/g, " ");
}

describe("/[locale]/car-confirm/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("en attente : récapitulatif, échéance et les deux boutons, sans aucune écriture", async () => {
    const html = await render(BOOKING);
    expect(bookingByConfirmToken).toHaveBeenCalledWith("conf-plain");
    expect(html).toContain("Confirm");
    expect(html).toContain("Not available");
    expect(html).toContain("Heraklion Airport");
    expect(html).toContain("2027-07-20");
    expect(html).toContain("Fiat Panda · Manual");
    expect(html).toContain("€412");
    expect(html).toContain("€370.80");
    // R33 : l'ouverture de la page ne déclenche aucune transition ni écriture.
    expect(confirmBooking).not.toHaveBeenCalled();
    expect(releaseBooking).not.toHaveBeenCalled();
    expect(refundConfirmed).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("confirmée : le dit, sans bouton", async () => {
    const html = await render({ ...BOOKING, booking_status: "confirmed" });
    expect(html).toMatch(/confirmed/i);
    expect(html).not.toContain("Not available");
  });

  it("remboursée faute de réponse : « expired, the client was refunded »", async () => {
    const html = await render({ ...BOOKING, booking_status: "refunded", refund_reason: "partner_timeout" });
    expect(html).toMatch(/expired/i);
    expect(html).toMatch(/refunded/i);
    expect(html).not.toContain("Not available");
  });

  it("refusée par le loueur : le dit", async () => {
    const html = await render({ ...BOOKING, booking_status: "refunded", refund_reason: "partner_declined" });
    expect(html).toMatch(/declined/i);
  });

  it("jeton inconnu : lien plus valable, sans récapitulatif", async () => {
    const html = await render(null);
    expect(html).toMatch(/no longer valid/i);
    expect(html).not.toContain("Heraklion");
  });

  it("anglais seulement : toute autre locale renvoie vers /en", async () => {
    await expect(CarConfirmPage({ params: Promise.resolve({ locale: "fr", token: "conf-plain" }) }))
      .rejects.toThrow("NEXT_REDIRECT /en/car-confirm/conf-plain");
    expect(bookingByConfirmToken).not.toHaveBeenCalled();
  });

  it("aucun tiret cadratin affiché", async () => {
    for (const b of [
      BOOKING,
      { ...BOOKING, booking_status: "confirmed" },
      { ...BOOKING, booking_status: "refunded", refund_reason: "partner_timeout" },
      null,
    ]) {
      expect(await render(b)).not.toContain(EM_DASH);
    }
  });
});
