// Le seul chemin d'écriture du lien loueur. Un GET ne doit jamais écrire (la
// page n'a pas de handler ici), et ce POST doit être aussi sourd qu'un mur à
// tout ce qui n'est pas un jeton connu et un choix valide.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, requestCommission, creditCommissionInvoice, expireCommissionSession, notifyOps, invoiceForRequest } = vi.hoisted(() => ({
  from: vi.fn(),
  requestCommission: vi.fn(),
  creditCommissionInvoice: vi.fn(),
  expireCommissionSession: vi.fn(async () => {}),
  notifyOps: vi.fn(async () => true),
  invoiceForRequest: vi.fn(),
}));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/car-commission-server", () => ({ requestCommission }));
vi.mock("@/lib/car-invoice-credit", () => ({ creditCommissionInvoice, expireCommissionSession }));
vi.mock("@/lib/ops-notify", () => ({ notifyOps, echeance: () => "18/09" }));
// Module réel sauf la lecture de facture : `applyOutcome` y appelle aussi
// `assertWritten`, et une garde d'écriture stubbée en no-op ne garde rien.
vi.mock("@/lib/car-invoice-server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/car-invoice-server")>()),
  invoiceForRequest,
}));

import { POST } from "./route";

const ROW = {
  id: 33, status: "accepted", outcome: null as string | null, outcome_source: null as string | null, outcome_at: null,
  outcome_token: "tok-33", date_from: "2026-09-08", date_to: "2026-09-15", pickup_slug: "heraklion-airport",
  quoted_car_model: "Toyota Yaris", quoted_price: 320, customer_name: "Marie Dupont", quoted_by_partner_id: 111,
};

interface Wiring { updates: Array<Record<string, unknown>>; filters: Array<[string, string, unknown]> }

function wiring(opts: { request?: typeof ROW | null; updatedRows?: unknown[] } = {}): Wiring {
  const w: Wiring = { updates: [], filters: [] };
  const request = "request" in opts ? opts.request : ROW;
  from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      eq: (c: string, v: unknown) => { w.filters.push(["eq", c, v]); return chain; },
      is: (c: string, v: unknown) => { w.filters.push(["is", c, v]); return chain; },
      maybeSingle: async () => ({
        data: table === "car_partners"
          ? { name: "Zorbas Rent a Car", commission: 0.1 }
          : w.filters.some(([, c]) => c === "outcome_token") ? request : { quoted_by_partner_id: 111 },
      }),
      select: async () => ({ data: opts.updatedRows ?? [{ id: 33 }], error: null }),
    });
    return {
      select: () => chain,
      update: (patch: Record<string, unknown>) => { w.updates.push(patch); return chain; },
    };
  });
  return w;
}

const post = (fields: Record<string, string>) =>
  POST(new Request("https://crete.direct/api/car-rental/outcome", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  }) as never);

beforeEach(() => {
  vi.clearAllMocks();
  invoiceForRequest.mockResolvedValue(null);
  requestCommission.mockResolvedValue({ status: "requested", invoiceNumber: "NOVAI-CD-2026-003" });
  creditCommissionInvoice.mockResolvedValue({ creditNumber: "NOVAI-CD-2026-002-A", notified: true });
});

describe("POST /api/car-rental/outcome", () => {
  it("400 sans jeton, sans lire la base", async () => {
    wiring();
    const res = await post({ choice: "rented" });
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("400 sur un choix hors { rented, lost }", async () => {
    wiring();
    const res = await post({ token: "tok-33", choice: "maybe" });
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("404 sur un jeton inconnu", async () => {
    wiring({ request: null });
    const res = await post({ token: "inconnu", choice: "rented" });
    expect(res.status).toBe(404);
  });

  it("303 vers la page avec ?result= après écriture", async () => {
    const w = wiring();
    const res = await post({ token: "tok-33", choice: "rented" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://crete.direct/en/rental-outcome/tok-33?result=applied");
    expect(w.updates[0]).toMatchObject({ outcome: "rented", outcome_source: "partner_link", final_amount_eur: 320 });
    expect(requestCommission).toHaveBeenCalledWith(33);
  });

  it("aucune écriture sur une demande annulée", async () => {
    const w = wiring({ request: { ...ROW, status: "cancelled" } });
    const res = await post({ token: "tok-33", choice: "lost" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("result=cancelled");
    expect(w.updates).toHaveLength(0);
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("course perdue (update à zéro ligne) : aucune facturation, result=lost_race", async () => {
    wiring({ updatedRows: [] });
    const res = await post({ token: "tok-33", choice: "rented" });
    expect(res.headers.get("location")).toContain("result=lost_race");
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("présomption facturée déclarée non advenue : avoir, result=credited", async () => {
    wiring({ request: { ...ROW, outcome: "rented", outcome_source: "auto" } });
    invoiceForRequest.mockResolvedValue({ id: 7, number: "NOVAI-CD-2026-002", paid_at: null, credited_at: null });
    const res = await post({ token: "tok-33", choice: "lost" });
    expect(res.headers.get("location")).toContain("result=credited");
    expect(creditCommissionInvoice).toHaveBeenCalledWith(33, expect.any(String), "partner_link");
  });

  it("encode le jeton dans l'URL de redirection", async () => {
    wiring({ request: { ...ROW, outcome_token: "a b" } });
    const res = await post({ token: "a b", choice: "rented" });
    expect(res.headers.get("location")).toContain("/en/rental-outcome/a%20b?");
  });
});
