import { describe, it, expect, vi, beforeEach } from "vitest";

const { bookingByConfirmToken, confirmBooking, releaseBooking } = vi.hoisted(() => ({
  bookingByConfirmToken: vi.fn(),
  confirmBooking: vi.fn(),
  releaseBooking: vi.fn(),
}));
vi.mock("@/lib/car-deposit-server", () => ({ bookingByConfirmToken, confirmBooking, releaseBooking }));

import * as route from "./route";

const { POST } = route;

function req(body: unknown): Request {
  return new Request("http://localhost/api/car-rental/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const row = (booking_status: string | null, refund_reason: string | null = null) => ({
  id: 25,
  booking_status,
  refund_reason,
});

describe("POST /api/car-rental/confirm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aucune action en GET : seuls les boutons postent (les antivirus de messagerie ouvrent les liens)", () => {
    expect(Object.keys(route)).toEqual(["POST"]);
  });

  it("400 sans jeton ou avec une décision inconnue", async () => {
    expect((await POST(req({ decision: "confirm" }) as never)).status).toBe(400);
    expect((await POST(req({ token: "t", decision: "maybe" }) as never)).status).toBe(400);
    expect((await POST(req("{not json") as never)).status).toBe(400);
    expect(bookingByConfirmToken).not.toHaveBeenCalled();
  });

  it("404 sur un jeton inconnu, rien d'appelé", async () => {
    bookingByConfirmToken.mockResolvedValueOnce(null);
    const res = await POST(req({ token: "t", decision: "confirm" }) as never);
    expect(res.status).toBe(404);
    expect(confirmBooking).not.toHaveBeenCalled();
  });

  it("Confirm : confirmBooking au nom du loueur, puis l'état réel relu", async () => {
    bookingByConfirmToken.mockResolvedValueOnce(row("awaiting_partner")).mockResolvedValueOnce(row("confirmed"));
    confirmBooking.mockResolvedValueOnce("confirmed");
    const res = await POST(req({ token: "t", decision: "confirm" }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, state: "confirmed" });
    expect(confirmBooking).toHaveBeenCalledWith(25, "partner");
    expect(releaseBooking).not.toHaveBeenCalled();
  });

  it("Not available : releaseBooking avec le motif partner_declined", async () => {
    bookingByConfirmToken
      .mockResolvedValueOnce(row("awaiting_partner"))
      .mockResolvedValueOnce(row("refunded", "partner_declined"));
    releaseBooking.mockResolvedValueOnce("refunded");
    const res = await POST(req({ token: "t", decision: "decline" }) as never);
    expect(await res.json()).toEqual({ ok: true, state: "declined" });
    expect(releaseBooking).toHaveBeenCalledWith(25, "partner_declined", expect.any(Number));
  });

  it("Confirm après le remboursement automatique : rien ne bouge, la réponse dit « expired »", async () => {
    bookingByConfirmToken
      .mockResolvedValueOnce(row("refunded", "partner_timeout"))
      .mockResolvedValueOnce(row("refunded", "partner_timeout"));
    confirmBooking.mockResolvedValueOnce("not_awaiting");
    const res = await POST(req({ token: "t", decision: "confirm" }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, state: "expired" });
  });

  it("Confirm puis Not available : la réservation reste confirmée", async () => {
    bookingByConfirmToken.mockResolvedValue(row("confirmed"));
    releaseBooking.mockResolvedValueOnce("not_releasable");
    const res = await POST(req({ token: "t", decision: "decline" }) as never);
    expect(await res.json()).toEqual({ ok: true, state: "confirmed" });
  });

  it("remboursement refusé par Stripe : 503, le loueur peut réessayer", async () => {
    bookingByConfirmToken.mockResolvedValue(row("awaiting_partner"));
    releaseBooking.mockResolvedValueOnce("refund_failed");
    const res = await POST(req({ token: "t", decision: "decline" }) as never);
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
  });

  it("base indisponible : 503 propre", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    bookingByConfirmToken.mockResolvedValueOnce(row("awaiting_partner"));
    confirmBooking.mockRejectedValueOnce(new Error("confirmBooking(25) refuse par la base: timeout"));
    const res = await POST(req({ token: "t", decision: "confirm" }) as never);
    expect(res.status).toBe(503);
    err.mockRestore();
  });
});
