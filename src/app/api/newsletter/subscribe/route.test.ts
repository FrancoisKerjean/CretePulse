// Garde-fous contre le « subscription bombing » (17-24/11/2026) : un robot ne
// déclenche aucun mail, une adresse ne reçoit pas deux confirmations en 7 jours,
// et le plafond quotidien tient même si BotID tombe.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, checkBotId, sendConfirmationEmail } = vi.hoisted(() => ({
  from: vi.fn(),
  checkBotId: vi.fn(),
  sendConfirmationEmail: vi.fn(async () => {}),
}));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("botid/server", () => ({ checkBotId }));
vi.mock("@/lib/email", () => ({ sendConfirmationEmail }));

import { POST } from "./route";
import { DAILY_CONFIRMATION_CAP } from "@/lib/newsletter-signup";

interface Db {
  existing?: Record<string, unknown> | null;
  last24h?: number;
  readError?: boolean;
}
interface Seen { inserts: unknown[]; deletes: number }

function db(opts: Db = {}): Seen {
  const seen: Seen = { inserts: [], deletes: 0 };
  from.mockImplementation(() => ({
    select: (_cols: string, o?: { head?: boolean }) => {
      const error = opts.readError ? { message: "boom" } : null;
      if (o?.head) return { gte: async () => ({ count: opts.last24h ?? 0, error }) };
      return { eq: () => ({ limit: async () => ({ data: opts.existing ? [opts.existing] : [], error }) }) };
    },
    delete: () => ({ eq: async () => { seen.deletes++; return { error: null }; } }),
    insert: async (row: unknown) => { seen.inserts.push(row); return { error: null }; },
  }));
  return seen;
}

const post = (body: Record<string, unknown>) =>
  POST(new Request("https://crete.direct/api/newsletter/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as never);

const HOUR = 3_600_000;

beforeEach(() => {
  vi.clearAllMocks();
  checkBotId.mockResolvedValue({ isBot: false, isGoodBot: false, bypassed: false });
});

describe("POST /api/newsletter/subscribe", () => {
  it("robot détecté par BotID : succès muet, ni base ni mail", async () => {
    db();
    checkBotId.mockResolvedValue({ isBot: true, isGoodBot: false, bypassed: false });
    const res = await post({ email: "victim@example.com", locale: "en" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(from).not.toHaveBeenCalled();
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
  });

  it("nouvelle adresse sous le plafond : inscrite et un mail", async () => {
    const seen = db({ last24h: 0 });
    const res = await post({ email: " New@Example.com ", locale: "fr" });
    expect(res.status).toBe(200);
    expect(seen.inserts).toHaveLength(1);
    expect(seen.inserts[0]).toMatchObject({ email: "new@example.com", locale: "fr", confirmed: false });
    expect(sendConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it("BotID en panne (OIDC absent) : on continue, le plafond reste le filet", async () => {
    checkBotId.mockRejectedValue(new Error("The 'x-vercel-oidc-token' header is missing"));
    const seen = db({ last24h: DAILY_CONFIRMATION_CAP });
    const res = await post({ email: "victim@example.com" });
    expect(res.status).toBe(200);
    expect(seen.inserts).toHaveLength(0);
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
  });

  it("même adresse rejouée 1 h après : aucun second mail", async () => {
    const seen = db({
      existing: { id: 1, confirmed: false, unsubscribed_at: null, subscribed_at: new Date(Date.now() - HOUR).toISOString() },
    });
    await post({ email: "victim@example.com" });
    expect(seen.deletes).toBe(0);
    expect(seen.inserts).toHaveLength(0);
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
  });

  it("plafond quotidien atteint : rien ne part", async () => {
    const seen = db({ last24h: DAILY_CONFIRMATION_CAP });
    await post({ email: "someone@example.com" });
    expect(seen.inserts).toHaveLength(0);
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
  });

  it("désabonné qui revient : ancienne ligne remplacée, un mail", async () => {
    const seen = db({
      existing: { id: 1, confirmed: true, unsubscribed_at: new Date(Date.now() - HOUR).toISOString(), subscribed_at: "2026-10-01T00:00:00Z" },
    });
    await post({ email: "back@example.com" });
    expect(seen.deletes).toBe(1);
    expect(seen.inserts).toHaveLength(1);
    expect(sendConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it("honeypot rempli : succès muet sans base", async () => {
    db();
    await post({ email: "x@example.com", website: "http://spam" });
    expect(from).not.toHaveBeenCalled();
  });

  it("adresse invalide : 422", async () => {
    db();
    expect((await post({ email: "pas-une-adresse" })).status).toBe(422);
  });

  it("lecture en base en échec : 500 sans mail", async () => {
    db({ readError: true });
    expect((await post({ email: "x@example.com" })).status).toBe(500);
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
  });
});
