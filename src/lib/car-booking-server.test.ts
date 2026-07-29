import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("./car-quote", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  newToken: () => "book-plain",
  // Hash opaque volontairement : un mock qui recopie le jeton rendrait
  // l assertion « le clair ne va pas en base » impossible a ecrire.
  hashToken: () => "deadbeefhash",
  siteBase: () => "https://crete.direct",
}));

import { startBookingAfterAccept } from "./car-booking-server";

function wiring() {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation(() => ({
    update: (patch: Record<string, unknown>) => {
      updates.push(patch);
      return { eq: async () => ({ error: null }) };
    },
  }));
  return updates;
}

describe("startBookingAfterAccept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAR_BOOKING_ENABLED = "on";
  });

  it("desarme : ne renvoie rien et n ecrit rien, l ancien flux continue", async () => {
    delete process.env.CAR_BOOKING_ENABLED;
    const updates = wiring();
    expect(await startBookingAfterAccept(25, "fr")).toBeNull();
    expect(updates).toHaveLength(0);
    expect(from).not.toHaveBeenCalled();
  });

  it("arme : pose le hash du jeton et rend l URL de paiement", async () => {
    const updates = wiring();
    const out = await startBookingAfterAccept(25, "fr");

    expect(out).toEqual({ payUrl: "https://crete.direct/fr/car-booking/book-plain" });
    // Seul le hash vit en base : le jeton en clair ne passe que par l URL.
    expect(updates[0]).toMatchObject({ booking_token_hash: "deadbeefhash" });
    expect(JSON.stringify(updates)).not.toContain("book-plain");
  });

  it("repart d un etat de reservation vierge", async () => {
    // Un ancien essai de paiement ne doit pas bloquer le nouveau lien : le
    // client vient d accepter, sa reservation commence maintenant.
    const updates = wiring();
    await startBookingAfterAccept(25, "en");
    expect(updates[0].booking_status).toBeNull();
    expect(updates[0].booking_session_id).toBeNull();
  });

  it("suit la locale du client", async () => {
    wiring();
    expect((await startBookingAfterAccept(25, "de"))?.payUrl).toContain("/de/car-booking/");
  });
});
