// Un GET n'écrit jamais : les antivirus de messagerie ouvrent chaque lien reçu
// et « confirmaient » ainsi des adresses inscrites par des robots (17-24/11/2026).
import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, sendWelcomeEmail } = vi.hoisted(() => ({
  from: vi.fn(),
  sendWelcomeEmail: vi.fn(async () => {}),
}));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/email", () => ({ sendWelcomeEmail }));

import { GET, POST } from "./route";

const ROW = { id: 7, email: "real@example.com", locale: "fr", confirmed: false };

function db(row: typeof ROW | null) {
  const updates: unknown[] = [];
  from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ limit: async () => ({ data: row ? [row] : [], error: null }) }) }),
    update: (patch: unknown) => { updates.push(patch); return { eq: async () => ({ error: null }) }; },
  }));
  return updates;
}

const get = (qs: string) => GET(new Request(`https://crete.direct/api/newsletter/confirm${qs}`) as never);
const post = (fields: Record<string, string>) =>
  POST(new Request("https://crete.direct/api/newsletter/confirm", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  }) as never);

beforeEach(() => vi.clearAllMocks());

describe("GET /api/newsletter/confirm (liens déjà envoyés)", () => {
  it("ne confirme rien et renvoie vers la page à bouton, dans la langue de l'abonné", async () => {
    const updates = db(ROW);
    const res = await get("?token=tok-7");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://crete.direct/fr/newsletter/confirm?token=tok-7");
    expect(updates).toHaveLength(0);
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("jeton inconnu : page en anglais, qui dira « lien expiré »", async () => {
    db(null);
    const res = await get("?token=nope");
    expect(res.headers.get("location")).toBe("https://crete.direct/en/newsletter/confirm?token=nope");
  });
});

describe("POST /api/newsletter/confirm (bouton de la page)", () => {
  it("confirme, envoie la bienvenue, renvoie vers « confirmé »", async () => {
    const updates = db(ROW);
    const res = await post({ token: "tok-7" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://crete.direct/fr/newsletter/confirmed");
    expect(updates).toEqual([expect.objectContaining({ confirmed: true, confirm_token: null })]);
    expect(sendWelcomeEmail).toHaveBeenCalledWith("real@example.com", "fr");
  });

  it("sans jeton : 400 sans écrire", async () => {
    const updates = db(ROW);
    expect((await post({})).status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("jeton inconnu : 404 sans écrire", async () => {
    const updates = db(null);
    expect((await post({ token: "nope" })).status).toBe(404);
    expect(updates).toHaveLength(0);
  });
});
