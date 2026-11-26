// Actions ops sur les acomptes : garde admin, résultats rendus à l'écran,
// prolongation bornée (jamais au-delà de la prise en charge moins la marge).
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); },
}));
const { isCarAdmin } = vi.hoisted(() => ({ isCarAdmin: vi.fn(async () => true) }));
vi.mock("@/lib/car-admin-auth", () => ({ isCarAdmin }));
const { confirmBooking, releaseBooking, refundConfirmed } = vi.hoisted(() => ({
  confirmBooking: vi.fn(), releaseBooking: vi.fn(), refundConfirmed: vi.fn(),
}));
vi.mock("@/lib/car-deposit-server", () => ({ confirmBooking, releaseBooking, refundConfirmed }));
vi.mock("@/lib/car-commission-server", () => ({ requestCommission: vi.fn() }));
vi.mock("@/lib/car-invoice-credit", () => ({
  creditCommissionInvoice: vi.fn(), resendCommissionInvoice: vi.fn(), expireCommissionSession: vi.fn(),
}));
vi.mock("@/lib/google-rating-server", () => ({ refreshPartnerRating: vi.fn() }));
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

import { revalidatePath } from "next/cache";
import {
  adminConfirmDeposit, adminDeclineDeposit, adminCancelDeposit, adminExtendDeadline,
  adminRefundConfirmed, adminLiftSuspension,
} from "./actions";

interface Db {
  request: Record<string, unknown> | null;
  partnerStatus: string | null;
  rates: unknown[];
  updates: Array<{ table: string; patch: Record<string, unknown>; filters: Array<[string, unknown]> }>;
  writeError?: { message: string };
}

/** Faux Supabase : le filtre booking_status / rates_status décide du nombre de lignes écrites. */
function wire(db: Db) {
  from.mockImplementation((table: string) => ({
    select: () => {
      const chain: Record<string, unknown> = {};
      Object.assign(chain, {
        eq: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: table === "car_requests" && db.request ? { ...db.request } : null, error: null }),
        then: (res: (v: unknown) => unknown) =>
          Promise.resolve({ data: table === "car_partner_rates" ? db.rates : [], error: null }).then(res),
      });
      return chain;
    },
    update: (patch: Record<string, unknown>) => {
      const filters: Array<[string, unknown]> = [];
      db.updates.push({ table, patch, filters });
      const chain: Record<string, unknown> = {};
      Object.assign(chain, {
        eq: (c: string, v: unknown) => { filters.push([c, v]); return chain; },
        is: (c: string, v: unknown) => { filters.push([c, v]); return chain; },
        select: async () => {
          if (db.writeError) return { data: null, error: db.writeError };
          const matches =
            table === "car_requests"
              ? filters.every(([c, v]) =>
                  (c !== "booking_status" || db.request?.booking_status === v) &&
                  (c !== "confirm_deadline_at" || db.request?.confirm_deadline_at === v))
              : filters.every(([c, v]) => c !== "rates_status" || db.partnerStatus === v);
          return { data: matches ? [{ id: 1 }] : [], error: null };
        },
      });
      return chain;
    },
  }));
}

const NOW = Date.parse("2026-12-01T10:00:00Z");
const base = (): Db => ({
  request: {
    booking_status: "awaiting_partner",
    confirm_deadline_at: "2026-12-01T12:00:00.000Z",
    date_from: "2026-12-05", time_from: "10:00",
  },
  partnerStatus: "paused", rates: [{ partner_id: 9 }], updates: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  isCarAdmin.mockResolvedValue(true);
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

describe("garde admin", () => {
  it.each([
    ["adminConfirmDeposit", () => adminConfirmDeposit(1)],
    ["adminDeclineDeposit", () => adminDeclineDeposit(1)],
    ["adminCancelDeposit", () => adminCancelDeposit(1)],
    ["adminExtendDeadline", () => adminExtendDeadline(1, 1)],
    ["adminRefundConfirmed", () => adminRefundConfirmed(1, "ops")],
    ["adminLiftSuspension", () => adminLiftSuspension(1)],
  ])("%s refuse sans session admin et n'écrit rien", async (_n, call) => {
    isCarAdmin.mockResolvedValue(false);
    wire(base());
    await expect(call()).rejects.toThrow("Forbidden");
    expect(confirmBooking).not.toHaveBeenCalled();
    expect(releaseBooking).not.toHaveBeenCalled();
    expect(refundConfirmed).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});

describe("confirmer, refuser, annuler", () => {
  it("confirmer passe par confirmBooking en admin et rend le résultat", async () => {
    confirmBooking.mockResolvedValue("confirmed");
    expect(await adminConfirmDeposit(7)).toBe("confirmed");
    expect(confirmBooking).toHaveBeenCalledWith(7, "admin");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/car-rental");
  });
  it("refuser = partner_declined (échec du loueur)", async () => {
    releaseBooking.mockResolvedValue("refunded");
    expect(await adminDeclineDeposit(7)).toBe("refunded");
    expect(releaseBooking).toHaveBeenCalledWith(7, "partner_declined", NOW);
  });
  it("annuler = ops (pas la faute du loueur)", async () => {
    releaseBooking.mockResolvedValue("refunded");
    await adminCancelDeposit(7);
    expect(releaseBooking).toHaveBeenCalledWith(7, "ops", NOW);
  });
  it("refund_failed est rendu à l'écran, jamais avalé", async () => {
    releaseBooking.mockResolvedValue("refund_failed");
    expect(await adminDeclineDeposit(7)).toBe("refund_failed");
    expect(await adminCancelDeposit(7)).toBe("refund_failed");
  });
});

describe("adminRefundConfirmed", () => {
  it("rembourse avec le motif demandé", async () => {
    refundConfirmed.mockResolvedValue("refunded");
    expect(await adminRefundConfirmed(7, "partner_cancelled")).toBe("refunded");
    expect(refundConfirmed).toHaveBeenCalledWith(7, "partner_cancelled");
  });
  it("rend refund_failed tel quel", async () => {
    refundConfirmed.mockResolvedValue("refund_failed");
    expect(await adminRefundConfirmed(7, "ops")).toBe("refund_failed");
  });
  it("refuse un motif inconnu (entrée non fiable)", async () => {
    await expect(adminRefundConfirmed(7, "client_cancelled" as never)).rejects.toThrow();
    expect(refundConfirmed).not.toHaveBeenCalled();
  });
});

describe("adminExtendDeadline", () => {
  it("repousse l'échéance du nombre d'heures et remet le rappel à zéro", async () => {
    const db = base(); wire(db);
    const res = await adminExtendDeadline(7, 2);
    expect(res).toEqual({ status: "extended", deadline: "2026-12-01T14:00:00.000Z" });
    const u = db.updates[0];
    expect(u.patch).toEqual({ confirm_deadline_at: "2026-12-01T14:00:00.000Z", confirm_reminded_at: null });
    expect(u.filters).toContainEqual(["booking_status", "awaiting_partner"]);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/car-rental");
  });
  it("part de maintenant quand l'échéance est dépassée", async () => {
    const db = base(); db.request!.confirm_deadline_at = "2026-12-01T08:00:00.000Z"; wire(db);
    expect(await adminExtendDeadline(7, 1)).toEqual({ status: "extended", deadline: "2026-12-01T11:00:00.000Z" });
  });
  it("refuse hors awaiting_partner et n'écrit pas", async () => {
    const db = base(); db.request!.booking_status = "confirmed"; wire(db);
    expect(await adminExtendDeadline(7, 1)).toEqual({ status: "refused", reason: "not_awaiting" });
    expect(db.updates).toHaveLength(0);
  });
  it("refuse quand l'état change entre la lecture et l'écriture (0 ligne)", async () => {
    const db = base(); wire(db);
    const real = from.getMockImplementation()!;
    from.mockImplementation((t: string) => {
      const o = real(t);
      return {
        ...o,
        update: (p: Record<string, unknown>) => {
          const c = o.update(p);
          db.request!.booking_status = "refunded";
          return c;
        },
      };
    });
    expect(await adminExtendDeadline(7, 1)).toEqual({ status: "refused", reason: "not_awaiting" });
  });
  it("refuse quand l'échéance a changé entre la lecture et l'écriture, sans seconde écriture", async () => {
    const db = base(); wire(db);
    const real = from.getMockImplementation()!;
    from.mockImplementation((t: string) => {
      const o = real(t);
      return {
        ...o,
        update: (p: Record<string, unknown>) => {
          const c = o.update(p);
          db.request!.confirm_deadline_at = "2026-12-01T13:00:00.000Z"; // autre onglet passé avant
          return c;
        },
      };
    });
    expect(await adminExtendDeadline(7, 1)).toEqual({ status: "refused", reason: "changed" });
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].filters).toContainEqual(["confirm_deadline_at", "2026-12-01T12:00:00.000Z"]);
  });
  it("échéance absente : écriture filtrée sur null", async () => {
    const db = base(); db.request!.confirm_deadline_at = null; wire(db);
    expect((await adminExtendDeadline(7, 1)).status).toBe("extended");
    expect(db.updates[0].filters).toContainEqual(["confirm_deadline_at", null]);
  });
  it("refuse au-delà de la prise en charge moins la marge de 2 h", async () => {
    // 15:00 Athènes (UTC+2) = 13:00Z, limite 11:00Z ; échéance 12:00Z déjà au-delà
    const db = base(); db.request!.date_from = "2026-12-01"; db.request!.time_from = "15:00"; wire(db);
    expect(await adminExtendDeadline(7, 1)).toEqual({ status: "refused", reason: "beyond_pickup" });
    expect(db.updates).toHaveLength(0);
  });
  it("accepte pile à la limite", async () => {
    // 17:00 Athènes = 15:00Z, limite 13:00Z ; 12:00Z + 1 h = 13:00Z
    const db = base(); db.request!.date_from = "2026-12-01"; db.request!.time_from = "17:00"; wire(db);
    expect((await adminExtendDeadline(7, 1)).status).toBe("extended");
  });
  it("heure de prise en charge absente = minuit", async () => {
    const db = base(); db.request!.date_from = "2026-12-01"; db.request!.time_from = null; wire(db);
    expect(await adminExtendDeadline(7, 1)).toEqual({ status: "refused", reason: "beyond_pickup" });
  });
  it.each([0, 3, 8, 1.5, "2", null])("refuse la durée invalide %s", async (h) => {
    const db = base(); wire(db);
    expect(await adminExtendDeadline(7, h as never)).toEqual({ status: "refused", reason: "invalid_hours" });
    expect(db.updates).toHaveLength(0);
  });
  it("demande introuvable", async () => {
    const db = base(); db.request = null; wire(db);
    expect(await adminExtendDeadline(7, 1)).toEqual({ status: "refused", reason: "not_found" });
  });
  it("une erreur d'écriture remonte, jamais avalée", async () => {
    const db = base(); db.writeError = { message: "boom" }; wire(db);
    await expect(adminExtendDeadline(7, 1)).rejects.toThrow("boom");
  });
});

describe("adminLiftSuspension", () => {
  it("paused vers live quand le loueur a des lignes de grille", async () => {
    const db = base(); wire(db);
    expect(await adminLiftSuspension(9)).toEqual({ status: "lifted", ratesStatus: "live" });
    expect(db.updates[0].patch).toEqual({ rates_status: "live" });
    expect(db.updates[0].filters).toContainEqual(["rates_status", "paused"]);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/car-rental");
  });
  it("paused vers draft sans ligne de grille", async () => {
    const db = base(); db.rates = []; wire(db);
    expect(await adminLiftSuspension(9)).toEqual({ status: "lifted", ratesStatus: "draft" });
    expect(db.updates[0].patch).toEqual({ rates_status: "draft" });
  });
  it("refuse quand le loueur n'est pas en pause", async () => {
    const db = base(); db.partnerStatus = "live"; wire(db);
    expect(await adminLiftSuspension(9)).toEqual({ status: "refused", reason: "not_paused" });
  });
});
