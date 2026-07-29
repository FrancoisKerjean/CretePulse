import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, update } = vi.hoisted(() => {
  const update = vi.fn(() => ({ eq: async () => ({}) }));
  return { from: vi.fn(), update };
});
const sendGuestBalanceDue = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/stays/emails", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  sendGuestBalanceDue: (...a: unknown[]) => sendGuestBalanceDue(...a),
}));
vi.mock("@/lib/stays/tokens", () => ({
  newToken: () => "tok-plain",
  hashToken: (t: string) => `hash(${t})`,
  siteBase: () => "https://crete.direct",
}));

import { GET } from "./route";

const authed = (secret = "secret") =>
  new Request("http://x", { headers: { authorization: `Bearer ${secret}` } }) as never;

/** Une seule demande eligible dans la fenetre J-14. */
function oneDueRequest() {
  from.mockImplementation((table: string) => {
    if (table === "stay_requests") {
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              lte: async () => ({
                data: [
                  {
                    id: 1,
                    guest_email: "g@example.com",
                    listing_id: 3,
                    date_from: "2026-08-10",
                    balance_amount: 514.5,
                    locale: "de",
                  },
                ],
              }),
            }),
          }),
        }),
        update,
      };
    }
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { title: "Villa Danae" } }) }) }),
    };
  });
}

describe("GET /api/cron/stays-balance", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "secret";
    from.mockReset();
    update.mockClear();
    sendGuestBalanceDue.mockClear();
  });

  it("403 avec un mauvais secret", async () => {
    expect((await GET(authed("wrong"))).status).toBe(403);
  });

  it("403 sans en tete d autorisation", async () => {
    expect((await GET(new Request("http://x") as never)).status).toBe(403);
  });

  it("503 quand le secret n est pas configure, fail closed", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(authed())).status).toBe(503);
  });

  it("pose le verrou puis envoie la demande de solde", async () => {
    oneDueRequest();
    const res = await GET(authed());

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ candidates: 1, sent: 1 });
    // Verrou ecrit AVANT l'envoi : pas de relance quotidienne si l'email echoue.
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ balance_token_hash: "hash(tok-plain)" }),
    );
    // La demande de solde part dans la langue du voyageur, et la page de paiement
    // avec : un lien /fr sur un voyageur allemand casse le tunnel a la derniere
    // etape, celle ou l'argent arrive.
    expect(sendGuestBalanceDue).toHaveBeenCalledWith(
      "g@example.com",
      expect.objectContaining({
        listingTitle: "Villa Danae",
        amountEur: 514.5,
        payUrl: "https://crete.direct/de/stays/balance/tok-plain",
      }),
      "de",
    );
  });

  it("ne fait rien quand aucune arrivee n approche", async () => {
    from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ is: () => ({ lte: async () => ({ data: [] }) }) }) }),
      update,
    }));
    const res = await GET(authed());
    expect(await res.json()).toMatchObject({ candidates: 0, sent: 0 });
    expect(sendGuestBalanceDue).not.toHaveBeenCalled();
  });
});
