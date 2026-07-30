import { describe, it, expect, vi, beforeEach } from "vitest";

const sendGuestExpired = vi.fn(async () => {});
vi.mock("@/lib/stays/emails", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  sendGuestExpired: (...a: unknown[]) => sendGuestExpired(...a),
}));
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

import { GET } from "./route";

function req(secret = "s3cret"): Request {
  return new Request("http://localhost/api/cron/stays-expire", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

const OLD = {
  id: 4, listing_id: 3, guest_email: "g@example.com", guest_name: "Jo",
  date_from: "2026-12-01", date_to: "2026-12-05", locale: "fr",
};

function wiring(rows: unknown[] = [OLD], listing: unknown = { id: 3, title: "Villa Danae" }) {
  const updates: Array<Record<string, unknown>> = [];
  const filters: string[] = [];
  from.mockImplementation((table: string) => {
    if (table === "stay_listings") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: listing }) }) }) };
    }
    return {
      select: () => ({
        eq: () => ({
          lt: async (_col: string, iso: string) => {
            filters.push(iso);
            return { data: rows, error: null };
          },
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        updates.push(patch);
        return { eq: async () => ({ error: null }) };
      },
    };
  });
  return { updates, filters };
}

describe("GET /api/cron/stays-expire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "s3cret";
  });

  it("401 sans le secret du cron", async () => {
    wiring();
    expect((await GET(req("mauvais") as never)).status).toBe(401);
    expect(sendGuestExpired).not.toHaveBeenCalled();
  });

  it("expire une demande restee sans reponse et previent le voyageur", async () => {
    const { updates } = wiring();
    const res = await GET(req() as never);

    expect(res.status).toBe(200);
    expect((await res.json()).expired).toBe(1);
    expect(updates[0]).toMatchObject({ status: "expired" });
    // Le lien d'acceptation doit mourir avec la demande : sinon le proprietaire
    // pourrait accepter un sejour dont le voyageur a ete prevenu du contraire.
    expect(updates[0].approve_token_hash).toBeNull();
    expect(sendGuestExpired).toHaveBeenCalledOnce();
    // Dans la langue de la demande, pas dans celle du serveur.
    expect(sendGuestExpired).toHaveBeenCalledWith(
      "g@example.com",
      expect.objectContaining({ listingTitle: "Villa Danae" }),
      "fr",
    );
  });

  it("ecrit en anglais quand la demande n a pas de locale", async () => {
    wiring([{ ...OLD, locale: null }]);
    await GET(req() as never);
    expect(sendGuestExpired).toHaveBeenCalledWith(
      "g@example.com",
      expect.anything(),
      "en",
    );
  });

  it("ne regarde que les demandes plus vieilles que le delai annonce", async () => {
    const { filters } = wiring();
    await GET(req() as never);
    const cutoff = new Date(filters[0]).getTime();
    const days = (Date.now() - cutoff) / 86_400_000;
    // 7 jours, comme l'accuse de reception le promet au voyageur.
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it("ne fait rien quand aucune demande n a expire", async () => {
    const { updates } = wiring([]);
    expect((await (await GET(req() as never)).json()).expired).toBe(0);
    expect(updates).toHaveLength(0);
    expect(sendGuestExpired).not.toHaveBeenCalled();
  });

  it("un email refuse n empeche pas l expiration des suivantes", async () => {
    sendGuestExpired.mockRejectedValueOnce(new Error("resend down") as never);
    const { updates } = wiring([OLD, { ...OLD, id: 5 }]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const json = await (await GET(req() as never)).json();

    // Les deux sont expirees : l'etat en base prime sur la notification.
    expect(json.expired).toBe(2);
    expect(updates).toHaveLength(2);
    errSpy.mockRestore();
  });
});
