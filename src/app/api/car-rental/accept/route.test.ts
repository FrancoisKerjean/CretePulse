import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QuoteOption } from "@/lib/car-quotes";

const { from, requestByClientToken, startDeposit, sendConnectionEmails } = vi.hoisted(() => ({
  from: vi.fn(),
  requestByClientToken: vi.fn(),
  startDeposit: vi.fn(),
  sendConnectionEmails: vi.fn(async () => undefined),
}));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/car-quotes-db", () => ({ requestByClientToken }));
vi.mock("@/lib/car-deposit-server", () => ({ startDeposit }));
vi.mock("@/lib/car-partners-db", () => ({
  partnerById: async () => ({ id: 111, name: "Zorbas Rent a Car", email: "z@example.com", phone: "+30 2810 000000", whatsapp: null, commission: 0.1 }),
}));
vi.mock("@/lib/email", () => ({ sendConnectionEmails }));

import { POST } from "./route";

const OPTION: QuoteOption = {
  id: 501, invite_id: 77, partner_id: 111, partner_name: "Zorbas", price: 412, currency: "EUR",
  car_model: "Fiat Panda", gearbox: "manual", inclusions: [], insurance_type: null, excess_eur: null,
  zero_excess_upsell_eur_day: null, note: null, created_at: new Date().toISOString(), source: "catalogue",
};

const REQUEST = {
  id: 25, status: "quoted", booking_status: null, locale: "fr", pickup_slug: "heraklion-airport",
  date_from: "2099-07-20", time_from: "10:00", date_to: "2099-07-27", time_to: "10:00", car_type: "compact",
  customer_name: "Nina", customer_email: "n@example.com", customer_phone: null as string | null,
};

function wiring(opts: { phone?: string | null; inviteStatus?: string; bookingStatus?: string | null } = {}) {
  const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
  requestByClientToken.mockResolvedValue({
    request: {
      ...REQUEST,
      customer_phone: opts.phone === undefined ? null : opts.phone,
      booking_status: opts.bookingStatus ?? null,
    },
    quotes: [{ id: 77, partner_id: 111, partner_name: "Zorbas", status: opts.inviteStatus ?? "quoted", quote_price: 412, quoted_at: null }],
    options: [OPTION],
  });
  from.mockImplementation((table: string) => ({
    update: (patch: Record<string, unknown>) => {
      updates.push({ table, patch });
      const chain = {
        eq: () => chain,
        neq: () => chain,
        is: () => chain,
        select: async () => ({ data: [{ id: 25 }], error: null }),
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(ok),
      };
      return chain;
    },
  }));
  return updates;
}

function req(body: unknown): Request {
  return new Request("http://localhost/api/car-rental/accept", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/car-rental/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CAR_CATALOGUE_ENABLED;
  });

  it("interrupteur éteint : flux historique, mise en relation, aucun acompte", async () => {
    const updates = wiring({ phone: "+33 6 12 34 56 78" });
    const res = await POST(req({ token: "tok", option_id: 501 }) as never);

    expect(res.status).toBe(200);
    expect(startDeposit).not.toHaveBeenCalled();
    expect(updates.some((u) => u.table === "car_requests" && u.patch.status === "accepted")).toBe(true);
    expect(sendConnectionEmails).toHaveBeenCalledOnce();
  });

  describe("interrupteur allumé", () => {
    beforeEach(() => {
      process.env.CAR_CATALOGUE_ENABLED = "on";
    });

    it("ouvre l'acompte et rend payUrl, sans mise en relation ni passage en accepted", async () => {
      startDeposit.mockResolvedValue({ payUrl: "https://crete.direct/fr/car-booking/b1" });
      const updates = wiring();
      const res = await POST(req({ token: "tok", option_id: 501, phone: "+33 6 12 34 56 78" }) as never);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, payUrl: "https://crete.direct/fr/car-booking/b1" });
      // Le téléphone saisi part avec l'acompte : le loueur en a besoin à la confirmation.
      expect(startDeposit).toHaveBeenCalledWith(25, OPTION, "fr", expect.any(Number), "+33 6 12 34 56 78");
      expect(updates).toHaveLength(0);
      expect(sendConnectionEmails).not.toHaveBeenCalled();
    });

    it("un téléphone déjà stocké et rappelable est celui transmis", async () => {
      startDeposit.mockResolvedValue({ payUrl: "https://crete.direct/fr/car-booking/b1" });
      wiring({ phone: "+30 690 000 0000" });
      await POST(req({ token: "tok", option_id: 501 }) as never);
      expect(startDeposit).toHaveBeenCalledWith(25, OPTION, "fr", expect.any(Number), "+30 690 000 0000");
    });

    it("le contrôle du téléphone reste avant : 422 sans numéro, aucun acompte", async () => {
      wiring();
      const res = await POST(req({ token: "tok", option_id: 501 }) as never);
      expect(res.status).toBe(422);
      expect((await res.json()).phoneRequired).toBe(true);
      expect(startDeposit).not.toHaveBeenCalled();
    });

    it.each([
      ["in_progress", { inProgress: true }],
      ["too_close", { tooClose: true }],
      ["below_minimum", { belowMinimum: true }],
      ["not_quotable", { notReady: true }],
    ])("refus %s : 409 avec le drapeau attendu", async (error, flag) => {
      startDeposit.mockResolvedValue({ error });
      const updates = wiring({ phone: "+33 6 12 34 56 78" });
      const res = await POST(req({ token: "tok", option_id: 501 }) as never);
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ ok: false, ...flag });
      expect(updates).toHaveLength(0);
      expect(sendConnectionEmails).not.toHaveBeenCalled();
    });

    it("une offre dont le loueur a décliné n'est plus payable", async () => {
      // Le loueur a déjà dit « pas disponible » : repayer ferait rembourser une
      // seconde fois, frais Stripe perdus.
      wiring({ phone: "+33 6 12 34 56 78", inviteStatus: "declined" });
      const res = await POST(req({ token: "tok", option_id: 501 }) as never);
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ ok: false, unavailable: true });
      expect(startDeposit).not.toHaveBeenCalled();
    });
  });
});

describe("POST /api/car-rental/accept?decline=1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAR_CATALOGUE_ENABLED = "on";
  });

  function declineReq(): Request {
    return new Request("http://localhost/api/car-rental/accept?decline=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "tok" }),
    });
  }

  it.each(["pending_payment", "awaiting_partner", "confirmed", "cancelled_kept"])(
    "refuse de fermer la demande quand booking_status vaut %s : 409 inProgress, rien d'écrit",
    async (bookingStatus) => {
      // Un acompte payable ou payé : fermer la demande laisserait de l'argent
      // sans réservation en face.
      const updates = wiring({ bookingStatus });
      const res = await POST(declineReq() as never);
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ ok: false, inProgress: true });
      expect(updates).toHaveLength(0);
    },
  );

  it("sans acompte en cours, le désistement ferme la demande comme avant", async () => {
    const updates = wiring({ bookingStatus: null });
    const res = await POST(declineReq() as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, declined: true });
    expect(updates.some((u) => u.patch.status === "declined_by_client")).toBe(true);
  });

  it("après un remboursement, le client peut encore tout refuser", async () => {
    const updates = wiring({ bookingStatus: "refunded" });
    const res = await POST(declineReq() as never);
    expect(res.status).toBe(200);
    expect(updates.some((u) => u.patch.status === "declined_by_client")).toBe(true);
  });
});
