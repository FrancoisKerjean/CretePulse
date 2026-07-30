import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notifyOps } from "./ops-notify";

// Un devis reçu ou une demande entrante, c'est de l'argent qui attend une action.
// Aujourd'hui ces événements n'arrivent nulle part : `car-rental/quote` écrit en
// base et envoie un email AU CLIENT, et Kami doit ouvrir /admin/car-rental pour
// l'apprendre. Ce helper les fait remonter dans le sujet ACTION du groupe.

const ENV_KEYS = [
  "TG_OPS_TOKEN",
  "TG_OPS_CHAT_ID",
  "TG_OPS_THREAD_ACTION",
  "TELEGRAM_BOT_TOKEN",
  "TG_CHAT_ID",
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  vi.restoreAllMocks();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function mockFetch(ok = true) {
  const spy = vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 400 });
  vi.stubGlobal("fetch", spy);
  return spy;
}

function payloadOf(spy: ReturnType<typeof mockFetch>) {
  return JSON.parse(spy.mock.calls[0][1].body as string);
}

describe("notifyOps", () => {
  it("ne fait rien et ne jette pas quand rien n'est configuré", async () => {
    const spy = mockFetch();
    const envoye = await notifyOps({ title: "Devis reçu", lines: ["x"] });
    expect(envoye).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("poste dans le sujet ACTION quand le groupe est configuré", async () => {
    process.env.TG_OPS_TOKEN = "ops:AA";
    process.env.TG_OPS_CHAT_ID = "-1004451379484";
    process.env.TG_OPS_THREAD_ACTION = "3";
    const spy = mockFetch();

    const envoye = await notifyOps({ title: "Devis reçu", lines: ["Zorbas · 145 EUR"] });

    expect(envoye).toBe(true);
    expect(spy.mock.calls[0][0]).toContain("ops:AA");
    const body = payloadOf(spy);
    expect(body.chat_id).toBe("-1004451379484");
    expect(body.message_thread_id).toBe("3");
  });

  it("retombe sur l'ancienne configuration quand le groupe n'est pas encore posé", async () => {
    // Les trois sites tournent déjà avec ce couple : la bascule ne doit rien casser.
    process.env.TELEGRAM_BOT_TOKEN = "legacy:BB";
    process.env.TG_CHAT_ID = "7017828892";
    const spy = mockFetch();

    const envoye = await notifyOps({ title: "Devis reçu", lines: ["x"] });

    expect(envoye).toBe(true);
    expect(spy.mock.calls[0][0]).toContain("legacy:BB");
    const body = payloadOf(spy);
    expect(body.chat_id).toBe("7017828892");
    expect(body.message_thread_id).toBeUndefined();
  });

  it("le groupe gagne sur l'ancienne configuration", async () => {
    process.env.TG_OPS_TOKEN = "ops:AA";
    process.env.TG_OPS_CHAT_ID = "-100";
    process.env.TELEGRAM_BOT_TOKEN = "legacy:BB";
    process.env.TG_CHAT_ID = "7017828892";
    const spy = mockFetch();

    await notifyOps({ title: "Devis reçu", lines: ["x"] });

    expect(spy.mock.calls[0][0]).toContain("ops:AA");
    expect(payloadOf(spy).chat_id).toBe("-100");
  });

  it("porte l'action attendue et l'échéance", async () => {
    process.env.TG_OPS_TOKEN = "ops:AA";
    process.env.TG_OPS_CHAT_ID = "-100";
    const spy = mockFetch();

    await notifyOps({
      title: "Devis reçu — Zorbas Rent a Car",
      lines: ["Heraklion · 3 jours", "145 EUR · 2 options"],
      action: "vérifier l'offre dans le cockpit",
      due: "31/07",
      url: "https://crete.direct/admin/car-rental",
    });

    const texte = payloadOf(spy).text as string;
    expect(texte).toContain("Devis reçu — Zorbas Rent a Car");
    expect(texte).toContain("Heraklion · 3 jours");
    expect(texte).toContain("vérifier l'offre dans le cockpit");
    expect(texte).toContain("31/07");
    expect(texte).toContain("https://crete.direct/admin/car-rental");
  });

  it("notifie en silencieux quand on le demande", async () => {
    process.env.TG_OPS_TOKEN = "ops:AA";
    process.env.TG_OPS_CHAT_ID = "-100";
    const spy = mockFetch();

    await notifyOps({ title: "Rapport", lines: ["x"], silent: true });

    expect(payloadOf(spy).disable_notification).toBe(true);
  });

  it("sonne par défaut", async () => {
    process.env.TG_OPS_TOKEN = "ops:AA";
    process.env.TG_OPS_CHAT_ID = "-100";
    const spy = mockFetch();

    await notifyOps({ title: "Devis", lines: ["x"] });

    expect(payloadOf(spy).disable_notification).toBe(false);
  });

  it("une panne réseau ne fait jamais échouer l'appelant", async () => {
    // Un devis doit être enregistré même si Telegram est indisponible.
    process.env.TG_OPS_TOKEN = "ops:AA";
    process.env.TG_OPS_CHAT_ID = "-100";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));

    await expect(notifyOps({ title: "Devis", lines: ["x"] })).resolves.toBe(false);
  });

  it("une réponse d'erreur de Telegram est signalée sans jeter", async () => {
    process.env.TG_OPS_TOKEN = "ops:AA";
    process.env.TG_OPS_CHAT_ID = "-100";
    const spy = mockFetch(false);

    await expect(notifyOps({ title: "Devis", lines: ["x"] })).resolves.toBe(false);
    expect(spy).toHaveBeenCalled();
  });

  it("échappe le HTML des données venues du partenaire", async () => {
    // Le nom du loueur et son modèle de voiture sont saisis par un tiers.
    process.env.TG_OPS_TOKEN = "ops:AA";
    process.env.TG_OPS_CHAT_ID = "-100";
    const spy = mockFetch();

    await notifyOps({ title: "Devis <b>x</b>", lines: ["Fiat & <script>alert(1)</script>"] });

    const texte = payloadOf(spy).text as string;
    expect(texte).not.toContain("<script>");
    expect(texte).toContain("&lt;script&gt;");
    expect(texte).toContain("&amp;");
  });
});
