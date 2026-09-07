// La passe quotidienne qui pose la question au loueur. Ce que ce fichier
// verrouille : les deux populations, le compteur écrit AVANT l'envoi, un
// refus Resend qui n'empêche pas l'incrément, et l'escalade ops à J+10 qui
// se répète tant que rien n'est résolu.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, sendPartnerOutcomeQuestion, invoiceForRequest, notifyOps } = vi.hoisted(() => ({
  from: vi.fn(),
  sendPartnerOutcomeQuestion: vi.fn(),
  invoiceForRequest: vi.fn(),
  notifyOps: vi.fn(),
}));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("./email", () => ({ sendPartnerOutcomeQuestion }));
vi.mock("./car-invoice-server", () => ({ invoiceForRequest }));
vi.mock("./ops-notify", () => ({ notifyOps, echeance: (n: number) => `+${n}` }));

import { runOutcomeFollowupPass } from "./car-outcome-followup-server";

const TODAY = "2026-09-16";
const NOW = new Date(`${TODAY}T06:20:00.000Z`);

/** Population A : acceptée, issue inconnue, location finie hier. */
const UNKNOWN = {
  id: 33, status: "accepted", date_from: "2026-09-08", date_to: "2026-09-15", pickup_slug: "heraklion-airport",
  quoted_car_model: "Toyota Yaris", quoted_price: 320, customer_name: "Marie Dupont", quoted_by_partner_id: 111,
  booking_paid_at: null, outcome: null, outcome_source: null, outcome_token: null,
  outcome_followup_count: 0, outcome_followup_sent_at: null, outcome_followup_escalated_at: null,
};
/** Population B : présumée louée et facturée au J1. */
const PRESUMED = { ...UNKNOWN, id: 63, outcome: "rented", outcome_source: "auto", outcome_token: "tok-63" };
const PARTNER = { id: 111, name: "Zorbas Rent a Car", email: "info@zorbas.gr", whatsapp: "+306912345678", phone: null, commission: 0.1 };

interface Wiring {
  queries: Array<{ filters: string[] }>;
  updates: Array<{ id: unknown; patch: Record<string, unknown> }>;
}

function wiring(opts: { unknown?: unknown[]; presumed?: unknown[]; partner?: unknown; updateError?: { message: string } } = {}): Wiring {
  const w: Wiring = { queries: [], updates: [] };
  from.mockImplementation((table: string) => {
    if (table === "car_partners") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: "partner" in opts ? opts.partner : PARTNER }) }) }) };
    }
    if (table !== "car_requests") throw new Error(`table inattendue: ${table}`);
    return {
      select: () => {
        const q = { filters: [] as string[] };
        w.queries.push(q);
        const chain: Record<string, unknown> = {};
        const push = (s: string) => { q.filters.push(s); return chain; };
        Object.assign(chain, {
          eq: (c: string, v: unknown) => push(`eq:${c}:${v}`),
          is: (c: string, v: unknown) => push(`is:${c}:${v}`),
          not: (c: string, op: string, v: unknown) => push(`not:${c}:${op}:${v}`),
          lt: async (c: string, v: unknown) => {
            q.filters.push(`lt:${c}:${v}`);
            const populationB = q.filters.includes("eq:outcome_source:auto");
            return { data: populationB ? (opts.presumed ?? []) : (opts.unknown ?? [UNKNOWN]), error: null };
          },
        });
        return chain;
      },
      update: (patch: Record<string, unknown>) => ({
        eq: (_c: string, id: unknown) => {
          w.updates.push({ id, patch });
          return { select: async () => (opts.updateError ? { data: null, error: opts.updateError } : { data: [{ id }], error: null }) };
        },
      }),
    };
  });
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
  sendPartnerOutcomeQuestion.mockResolvedValue(true);
  invoiceForRequest.mockResolvedValue(null);
  notifyOps.mockResolvedValue(true);
});

describe("runOutcomeFollowupPass · sélection", () => {
  it("lit les deux populations avec les bons filtres, date_to strictement passée", async () => {
    const w = wiring();
    await runOutcomeFollowupPass(NOW);
    const [a, b] = w.queries;
    expect(a.filters).toEqual(expect.arrayContaining(["eq:status:accepted", "is:outcome:null", "is:booking_paid_at:null", "not:quoted_by_partner_id:is:null", `lt:date_to:${TODAY}`]));
    expect(b.filters).toEqual(expect.arrayContaining(["eq:outcome:rented", "eq:outcome_source:auto", `lt:date_to:${TODAY}`]));
  });

  it("écarte en code une annulée ou une payée en ligne remontée par la requête", async () => {
    const w = wiring({ unknown: [{ ...UNKNOWN, status: "cancelled" }], presumed: [{ ...PRESUMED, booking_paid_at: "2026-09-01T00:00:00.000Z" }] });
    const res = await runOutcomeFollowupPass(NOW);
    expect(res.sent).toBe(0);
    expect(w.updates).toHaveLength(0);
    expect(sendPartnerOutcomeQuestion).not.toHaveBeenCalled();
  });

  it("population B : l'email nomme la facture émise", async () => {
    wiring({ unknown: [], presumed: [PRESUMED] });
    invoiceForRequest.mockResolvedValue({ id: 7, number: "NOVAI-CD-2026-001", amount_eur: 32, paid_at: null, credited_at: null });
    await runOutcomeFollowupPass(NOW);
    const mail = sendPartnerOutcomeQuestion.mock.calls[0][1];
    expect(mail.invoice).toEqual({ number: "NOVAI-CD-2026-001", amountEur: 32 });
    expect(mail.expected).toBeNull();
    // Le jeton existant est réutilisé : le lien de l'email précédent reste vivant.
    expect(mail.outcomeUrl).toContain("/en/rental-outcome/tok-63");
  });

  it("population A : l'email annonce la commission attendue au taux du loueur", async () => {
    wiring();
    await runOutcomeFollowupPass(NOW);
    const mail = sendPartnerOutcomeQuestion.mock.calls[0][1];
    expect(mail.invoice).toBeNull();
    expect(mail.expected).toEqual({ ratePercent: "10", amountEur: 32 });
    expect(mail.attempt).toBe(1);
    expect(mail.pickupLabel).toBeTruthy();
  });
});

describe("runOutcomeFollowupPass · envoi", () => {
  it("écrit jeton, compteur et date AVANT l'envoi", async () => {
    const w = wiring();
    const res = await runOutcomeFollowupPass(NOW);
    expect(res.sent).toBe(1);
    expect(w.updates[0].id).toBe(33);
    expect(w.updates[0].patch).toMatchObject({ outcome_followup_count: 1, outcome_followup_sent_at: NOW.toISOString() });
    expect(typeof w.updates[0].patch.outcome_token).toBe("string");
    expect(from.mock.invocationCallOrder.at(-1)!).toBeLessThan(sendPartnerOutcomeQuestion.mock.invocationCallOrder[0]);
    // L'URL envoyée porte le jeton qui vient d'être écrit.
    expect(sendPartnerOutcomeQuestion.mock.calls[0][1].outcomeUrl).toContain(String(w.updates[0].patch.outcome_token));
    expect(sendPartnerOutcomeQuestion.mock.calls[0][0]).toBe("info@zorbas.gr");
  });

  it("un refus Resend n'empêche pas l'incrément : l'étape suivante réessaie", async () => {
    const w = wiring();
    sendPartnerOutcomeQuestion.mockResolvedValue(false);
    const res = await runOutcomeFollowupPass(NOW);
    expect(w.updates[0].patch.outcome_followup_count).toBe(1);
    expect(res.sent).toBe(0);
    expect(res.refused).toBe(1);
  });

  it("une écriture refusée par la base n'envoie rien", async () => {
    wiring({ updateError: { message: "permission denied" } });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await runOutcomeFollowupPass(NOW);
    expect(sendPartnerOutcomeQuestion).not.toHaveBeenCalled();
    expect(res.sent).toBe(0);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("permission denied");
    errSpy.mockRestore();
  });

  it("email 2 à J+4 avec attempt 2, rien avant", async () => {
    wiring({ unknown: [{ ...UNKNOWN, outcome_followup_count: 1, outcome_followup_sent_at: "2026-09-13T06:20:00.000Z", outcome_token: "tok-33" }] });
    await runOutcomeFollowupPass(NOW);
    expect(sendPartnerOutcomeQuestion.mock.calls[0][1].attempt).toBe(2);

    vi.clearAllMocks();
    wiring({ unknown: [{ ...UNKNOWN, outcome_followup_count: 1, outcome_followup_sent_at: "2026-09-14T06:20:00.000Z", outcome_token: "tok-33" }] });
    await runOutcomeFollowupPass(NOW);
    expect(sendPartnerOutcomeQuestion).not.toHaveBeenCalled();
  });

  it("loueur sans email : aucun envoi, notification ops immédiate avec le motif", async () => {
    const w = wiring({ partner: { ...PARTNER, email: null } });
    const res = await runOutcomeFollowupPass(NOW);
    expect(res.withoutEmail).toBe(1);
    expect(w.updates).toHaveLength(0);
    expect(sendPartnerOutcomeQuestion).not.toHaveBeenCalled();
    const texte = JSON.stringify(notifyOps.mock.calls[0][0]);
    expect(texte).toContain("partner_without_email");
    expect(texte).toContain("Zorbas Rent a Car");
  });
});

describe("runOutcomeFollowupPass · escalade J+10", () => {
  const STALE = { ...UNKNOWN, date_to: "2026-09-05", outcome_followup_count: 3, outcome_followup_sent_at: "2026-09-13T06:20:00.000Z", outcome_token: "tok-33" };

  it("pose escalated_at et prévient les ops, non silencieux, loueur nommé, avec due et url", async () => {
    const w = wiring({ unknown: [STALE] });
    const res = await runOutcomeFollowupPass(NOW);
    expect(res.escalated).toBe(1);
    expect(w.updates[0].patch).toMatchObject({ outcome_followup_escalated_at: NOW.toISOString() });
    expect(sendPartnerOutcomeQuestion).not.toHaveBeenCalled();
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toBe("Issue de location inconnue à J+10 : 1 demande(s)");
    expect(n.lines[0]).toBe("#33 Zorbas Rent a Car · 08/09 → 05/09 · 320 € · 3 emails sans réponse");
    expect(n.lines.some((l: string) => l.includes("wa.me/306912345678"))).toBe(true);
    expect(n.action).toContain("back-office");
    expect(n.due).toBe("+2");
    expect(n.url).toContain("/admin/car-rental");
    expect(n.silent).not.toBe(true);
  });

  it("passage suivant : nouvelle notification tant que non résolu, sans réécrire escalated_at", async () => {
    const w = wiring({ unknown: [{ ...STALE, outcome_followup_escalated_at: "2026-09-15T06:20:00.000Z" }] });
    const res = await runOutcomeFollowupPass(NOW);
    expect(res.reminded).toBe(1);
    expect(w.updates).toHaveLength(0);
    expect(notifyOps).toHaveBeenCalledTimes(1);
  });

  it("Telegram en panne ne fait pas tomber la passe", async () => {
    wiring({ unknown: [STALE] });
    notifyOps.mockRejectedValueOnce(new Error("telegram down"));
    await expect(runOutcomeFollowupPass(NOW)).resolves.toMatchObject({ escalated: 1 });
  });

  it("se tait quand il n'y a rien à dire", async () => {
    wiring({ unknown: [] });
    await runOutcomeFollowupPass(NOW);
    expect(notifyOps).not.toHaveBeenCalled();
  });
});
