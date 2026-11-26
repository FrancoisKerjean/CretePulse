import { describe, it, expect, vi, beforeEach } from "vitest";

const constructEvent = vi.fn();
vi.mock("@/lib/stays/stripe-helpers", () => ({
  stripeClient: () => ({ webhooks: { constructEvent } }),
}));
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
const { markInvoicePaidMock } = vi.hoisted(() => ({ markInvoicePaidMock: vi.fn() }));
vi.mock("@/lib/car-invoice-server", () => ({ markInvoicePaid: markInvoicePaidMock }));
const { onDepositPaid, onDepositSessionExpired, notifyOps } = vi.hoisted(() => ({
  onDepositPaid: vi.fn(),
  onDepositSessionExpired: vi.fn(),
  notifyOps: vi.fn(),
}));
vi.mock("@/lib/car-deposit-server", () => ({ onDepositPaid, onDepositSessionExpired }));
vi.mock("@/lib/ops-notify", () => ({ notifyOps }));

import { POST } from "./route";

function req(body = "{}"): Request {
  return new Request("http://localhost/api/car-rental/commission/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body,
  });
}

function event(metadata: Record<string, string>, id = "evt_1") {
  return {
    id,
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_intent: "pi_1", metadata } },
  };
}

const CAR_META = { car_request_id: "42", payment_type: "car_commission", brand: "crete.direct" };

function wiring(opts: { ledgerError?: { code?: string } } = {}) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation((table: string) => {
    if (table === "stripe_webhook_events") {
      return { insert: async () => ({ error: opts.ledgerError ?? null }) };
    }
    return {
      update: (patch: Record<string, unknown>) => {
        updates.push(patch);
        return { eq: async () => ({ error: null }) };
      },
    };
  });
  return updates;
}

describe("POST /api/car-rental/commission/webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400 sur une signature invalide, rien en base", () => {
    constructEvent.mockImplementationOnce(() => { throw new Error("bad sig"); });
    wiring();
    return POST(req() as never).then(async (res) => {
      expect(res.status).toBe(400);
      expect(from).not.toHaveBeenCalled();
    });
  });

  it("marque la commission encaissee", async () => {
    constructEvent.mockReturnValueOnce(event(CAR_META));
    const updates = wiring();
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    expect(updates).toHaveLength(1);
    expect(updates[0].commission_paid_at).toBeTruthy();
    expect(updates[0].commission_payment_intent_id).toBe("pi_1");
  });

  it("marque aussi la facture payee", async () => {
    // Sans cela la page facture continuerait d afficher « due » sur une facture
    // reglee, et un loueur consciencieux paierait deux fois.
    constructEvent.mockReturnValueOnce(event(CAR_META));
    wiring();
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect(markInvoicePaidMock).toHaveBeenCalledWith(42);
  });

  it("marque la facture payee meme si l ecriture sur car_requests echoue", async () => {
    // Stripe a deja encaisse la carte du loueur a ce stade : un echec cote
    // car_requests degrade seulement le suivi interne, il ne doit jamais
    // empecher la facture d etre marquee payee (sinon la page facture reste
    // sur « due » et le loueur paierait deux fois, ce qui est pire qu un
    // car_requests en retard sur son propre etat).
    constructEvent.mockReturnValueOnce(event(CAR_META));
    from.mockImplementation((table: string) => {
      if (table === "stripe_webhook_events") {
        return { insert: async () => ({ error: null }) };
      }
      return {
        update: () => ({ eq: async () => ({ error: { message: "db down" } }) }),
      };
    });
    const res = await POST(req() as never);
    expect(res.status).toBe(500);
    expect(markInvoicePaidMock).toHaveBeenCalledWith(42);
  });

  it("une facture non marquee payee ne rend JAMAIS 200", async () => {
    // Stripe a encaisse la carte du loueur. Si markInvoicePaid est refuse par la
    // base et qu on repond 200, la page facture garde son bouton « Pay by card »
    // sur de l argent deja recu, et personne ne l apprend jamais : le refus doit
    // etre bruyant. L evenement est deja au registre, donc la nouvelle tentative
    // de Stripe ressortira en « duplicate » : pas de tempete de rejeu.
    constructEvent.mockReturnValueOnce(event(CAR_META));
    wiring();
    markInvoicePaidMock.mockRejectedValueOnce(
      new Error("markInvoicePaid(42) refuse par la base: permission denied"),
    );
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req() as never);

    expect(res.status).toBe(500);
    expect(JSON.stringify(err.mock.calls)).toMatch(/PAIEMENT ENCAISSE/);
    err.mockRestore();
  });

  it("un evenement d un autre type ne marque pas la facture payee", async () => {
    constructEvent.mockReturnValueOnce({
      id: "evt_other",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_x", payment_intent: "pi_1", metadata: CAR_META } },
    });
    wiring();
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect(markInvoicePaidMock).not.toHaveBeenCalled();
  });

  it("ignore un evenement Stays sans rien ecrire", async () => {
    // Le compte est partage : cet endpoint recoit AUSSI les sessions Stays,
    // IEUF, Eleni et Kairos. Un 200 muet, jamais un 4xx qui ferait retenter
    // Stripe pendant 3 jours.
    constructEvent.mockReturnValueOnce(
      event({ request_id: "5", payment_type: "deposit", brand: "crete.direct" }),
    );
    wiring();
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("ignore un evenement d une autre marque", async () => {
    constructEvent.mockReturnValueOnce(event({ order_id: "9" }));
    wiring();
    const res = await POST(req() as never);
    expect((await res.json()).ignored).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("refuse un car_request_id qui n est pas un entier positif", async () => {
    constructEvent.mockReturnValueOnce(event({ ...CAR_META, car_request_id: "abc" }));
    wiring();
    expect((await (await POST(req() as never)).json()).ignored).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejoue le meme evenement sans double ecriture", async () => {
    constructEvent.mockReturnValueOnce(event(CAR_META));
    const updates = wiring({ ledgerError: { code: "23505" } });
    const res = await POST(req() as never);
    expect((await res.json()).duplicate).toBe(true);
    expect(updates).toHaveLength(0);
    // Le registre stripe_webhook_events (scope "car") protege aussi l ecriture
    // de la facture : un evenement deja vu ne doit jamais rappeler
    // markInvoicePaid une seconde fois.
    expect(markInvoicePaidMock).not.toHaveBeenCalled();
  });

  it("marque une reservation payee et fixe l echeance de versement", async () => {
    // Second type d'evenement sur le meme endpoint : le paiement du voyageur.
    constructEvent.mockReturnValueOnce({
      id: "evt_book",
      type: "checkout.session.completed",
      data: { object: {
        id: "cs_b1", payment_intent: "pi_b1",
        metadata: { car_request_id: "25", payment_type: "car_booking", brand: "crete.direct" },
      } },
    });
    const updates: Array<Record<string, unknown>> = [];
    from.mockImplementation((table: string) => {
      if (table === "stripe_webhook_events") return { insert: async () => ({ error: null }) };
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 25, date_from: "2026-09-25" } }) }) }),
        update: (patch: Record<string, unknown>) => { updates.push(patch); return { eq: async () => ({ error: null }) }; },
      };
    });

    const res = await POST(req() as never);

    expect(res.status).toBe(200);
    expect((await res.json()).booking).toBe(true);
    expect(updates[0].booking_status).toBe("paid");
    expect(updates[0].booking_payment_intent_id).toBe("pi_b1");
    // 48 h avant le debut : le versement au loueur ne peut pas partir avant la
    // fermeture du droit au remboursement.
    expect(updates[0].transfer_due_at).toBe("2026-09-23T00:00:00.000Z");
  });

  it("inscrit l evenement au registre sous le scope car", async () => {
    constructEvent.mockReturnValueOnce(event(CAR_META));
    const inserts: Array<Record<string, unknown>> = [];
    from.mockImplementation((table: string) => {
      if (table === "stripe_webhook_events") {
        return { insert: async (row: Record<string, unknown>) => { inserts.push(row); return { error: null }; } };
      }
      return { update: () => ({ eq: async () => ({ error: null }) }) };
    });
    await POST(req() as never);
    // `request_id` seul est ambigu entre stay_requests et car_requests : sans
    // scope, deux lignes de tables differentes se confondent au reconcile.
    expect(inserts[0]).toMatchObject({ scope: "car", request_id: 42 });
  });
});

// ── Acompte (car_deposit) ───────────────────────────────────────────────────
describe("POST /api/car-rental/commission/webhook : acompte", () => {
  beforeEach(() => vi.clearAllMocks());

  const DEPOSIT_META = { car_request_id: "25", payment_type: "car_deposit", brand: "crete.direct" };

  function depositEvent(type: string, id = "evt_dep") {
    return { id, type, data: { object: { id: "cs_d1", payment_intent: "pi_d1", metadata: DEPOSIT_META } } };
  }

  /** Registre seul : l'acompte ne touche car_requests que par car-deposit-server. */
  function ledger(opts: { ledgerError?: { code?: string }; deleteError?: { message: string } } = {}) {
    const deleted: Array<Array<[string, unknown]>> = [];
    from.mockImplementation((table: string) => {
      if (table !== "stripe_webhook_events") throw new Error(`table inattendue: ${table}`);
      return {
        insert: async () => ({ error: opts.ledgerError ?? null }),
        delete: () => {
          const filters: Array<[string, unknown]> = [];
          deleted.push(filters);
          const chain = {
            eq: (col: string, val: unknown) => { filters.push([col, val]); return chain; },
            then: (res: (x: unknown) => unknown) => Promise.resolve({ error: opts.deleteError ?? null }).then(res),
          };
          return chain;
        },
      };
    });
    return deleted;
  }

  it("completed : enregistre le paiement par onDepositPaid", async () => {
    constructEvent.mockReturnValueOnce(depositEvent("checkout.session.completed"));
    ledger();
    onDepositPaid.mockResolvedValueOnce("recorded");
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, deposit: "recorded" });
    expect(onDepositPaid).toHaveBeenCalledWith(25, "cs_d1", "pi_d1", expect.any(Number));
    expect(markInvoicePaidMock).not.toHaveBeenCalled();
  });

  it("un événement en double est ignoré par le registre", async () => {
    constructEvent.mockReturnValueOnce(depositEvent("checkout.session.completed"));
    ledger({ ledgerError: { code: "23505" } });
    const res = await POST(req() as never);
    expect((await res.json()).duplicate).toBe(true);
    expect(onDepositPaid).not.toHaveBeenCalled();
  });

  it("le traitement lève : ligne du registre supprimée, ops prévenu, 500 pour que Stripe rejoue", async () => {
    constructEvent.mockReturnValueOnce(depositEvent("checkout.session.completed", "evt_boom"));
    const deleted = ledger();
    onDepositPaid.mockRejectedValueOnce(new Error("onDepositPaid(25) refuse par la base: timeout"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req() as never);

    expect(res.status).toBe(500);
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toContainEqual(["stripe_event_id", "evt_boom"]);
    expect(deleted[0]).toContainEqual(["scope", "car"]);
    expect(notifyOps).toHaveBeenCalledTimes(1);
    err.mockRestore();
  });

  it("suppression du registre refusée : toujours 500, et ops le sait", async () => {
    constructEvent.mockReturnValueOnce(depositEvent("checkout.session.completed"));
    ledger({ deleteError: { message: "permission denied" } });
    onDepositPaid.mockRejectedValueOnce(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req() as never);

    expect(res.status).toBe(500);
    expect(JSON.stringify(notifyOps.mock.calls)).toMatch(/registre/);
    err.mockRestore();
  });

  it("session étrangère : 200, le remboursement est fait par onDepositPaid", async () => {
    constructEvent.mockReturnValueOnce(depositEvent("checkout.session.completed"));
    ledger();
    onDepositPaid.mockResolvedValueOnce("session_mismatch");
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect((await res.json()).deposit).toBe("session_mismatch");
  });

  it("expired : libère le verrou de la demande pour cette session", async () => {
    constructEvent.mockReturnValueOnce(depositEvent("checkout.session.expired"));
    ledger();
    onDepositSessionExpired.mockResolvedValueOnce(true);
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect(onDepositSessionExpired).toHaveBeenCalledWith(25, "cs_d1");
    expect(onDepositPaid).not.toHaveBeenCalled();
  });

  it("un autre type d'événement d'acompte ne déclenche rien", async () => {
    constructEvent.mockReturnValueOnce(depositEvent("payment_intent.succeeded"));
    ledger();
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect(onDepositPaid).not.toHaveBeenCalled();
    expect(onDepositSessionExpired).not.toHaveBeenCalled();
  });

  it("paiement sans payment_intent : traité comme un échec (rejeu Stripe), jamais enregistré à moitié", async () => {
    constructEvent.mockReturnValueOnce({
      id: "evt_nopi",
      type: "checkout.session.completed",
      data: { object: { id: "cs_d1", payment_intent: null, metadata: DEPOSIT_META } },
    });
    const deleted = ledger();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(req() as never);
    expect(res.status).toBe(500);
    expect(onDepositPaid).not.toHaveBeenCalled();
    expect(deleted).toHaveLength(1);
    err.mockRestore();
  });
});
