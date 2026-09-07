// Relance J+15 et remontée J+30 d'une facture de commission due. Ce que ce
// fichier verrouille : jamais une facture jamais envoyée, jamais une payée
// ou avoirée, le jeton tourné et reminded_at écrit AVANT l'email, et un refus
// de rotation qui n'envoie rien.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, rotateInvoiceToken, sendInvoiceReminder, notifyOps } = vi.hoisted(() => ({
  from: vi.fn(),
  rotateInvoiceToken: vi.fn(),
  sendInvoiceReminder: vi.fn(),
  notifyOps: vi.fn(),
}));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("./car-invoice-server", () => ({ rotateInvoiceToken }));
vi.mock("./email", () => ({ sendInvoiceReminder }));
vi.mock("./ops-notify", () => ({ notifyOps, echeance: (n: number) => `+${n}` }));

import { invoiceReminderDue, runInvoiceReminderPass, DAY_MS } from "./car-invoice-reminder";

const NOW = new Date("2026-09-21T06:20:00.000Z");
const INVOICE = {
  id: 1, number: "NOVAI-CD-2026-001", request_id: 63, partner_id: 111, amount_eur: 24,
  issued_at: "2026-09-06T05:00:00.000Z", sent_at: "2026-09-06T05:00:01.000Z",
  paid_at: null as string | null, credited_at: null as string | null, reminded_at: null as string | null,
};
const REQUEST = { id: 63, date_from: "2026-09-06", date_to: "2026-09-13", outcome_token: "tok-63" };
const PARTNER = { name: "Zorbas Rent a Car", email: "info@zorbas.gr", whatsapp: "+306912345678", phone: null };

describe("invoiceReminderDue (pur)", () => {
  const nowMs = NOW.getTime();
  it("J+15 exactement : rappel, pas encore en retard", () => {
    const sent = new Date(nowMs - 15 * DAY_MS).toISOString();
    expect(invoiceReminderDue({ ...INVOICE, sent_at: sent }, nowMs)).toEqual({ remind: true, overdue: false });
    expect(invoiceReminderDue({ ...INVOICE, sent_at: sent }, nowMs - 1000)).toEqual({ remind: false, overdue: false });
  });
  it("J+30 : en retard ; le rappel ne repart pas s il a deja ete envoye", () => {
    const sent = new Date(nowMs - 30 * DAY_MS).toISOString();
    expect(invoiceReminderDue({ ...INVOICE, sent_at: sent, reminded_at: "2026-09-06T00:00:00.000Z" }, nowMs)).toEqual({ remind: false, overdue: true });
    // Premier passage sur une vieille facture : rappel ET retard le meme jour.
    expect(invoiceReminderDue({ ...INVOICE, sent_at: sent }, nowMs)).toEqual({ remind: true, overdue: true });
  });
  it("jamais envoyee, payee ou avoiree : rien", () => {
    expect(invoiceReminderDue({ ...INVOICE, sent_at: null }, nowMs)).toEqual({ remind: false, overdue: false });
    expect(invoiceReminderDue({ ...INVOICE, sent_at: "2026-08-01T00:00:00.000Z", paid_at: "2026-08-02T00:00:00.000Z" }, nowMs)).toEqual({ remind: false, overdue: false });
    expect(invoiceReminderDue({ ...INVOICE, sent_at: "2026-08-01T00:00:00.000Z", credited_at: "2026-08-02T00:00:00.000Z" }, nowMs)).toEqual({ remind: false, overdue: false });
  });
});

interface Wiring { filters: string[]; updates: Array<{ table: string; patch: Record<string, unknown> }> }

function wiring(opts: { invoices?: unknown[]; request?: unknown; partner?: unknown; updateError?: { message: string } } = {}): Wiring {
  const w: Wiring = { filters: [], updates: [] };
  from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    const push = (s: string) => { w.filters.push(`${table}:${s}`); return chain; };
    Object.assign(chain, {
      eq: (c: string, v: unknown) => push(`eq:${c}:${v}`),
      is: (c: string, v: unknown) => push(`is:${c}:${v}`),
      not: (c: string, op: string, v: unknown) => push(`not:${c}:${op}:${v}`),
      lte: async (c: string, v: unknown) => { push(`lte:${c}:${v}`); return { data: opts.invoices ?? [INVOICE], error: null }; },
      maybeSingle: async () => ({ data: table === "car_partners" ? ("partner" in opts ? opts.partner : PARTNER) : ("request" in opts ? opts.request : REQUEST) }),
      select: async () => (opts.updateError ? { data: null, error: opts.updateError } : { data: [{ id: 1 }], error: null }),
    });
    return {
      select: () => chain,
      update: (patch: Record<string, unknown>) => { w.updates.push({ table, patch }); return chain; },
    };
  });
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
  rotateInvoiceToken.mockResolvedValue("tok-neuf");
  sendInvoiceReminder.mockResolvedValue(true);
  notifyOps.mockResolvedValue(true);
});

describe("runInvoiceReminderPass · J+15", () => {
  it("selectionne les factures envoyees, non payees, non avoirees, envoyees depuis 15 j", async () => {
    const w = wiring();
    await runInvoiceReminderPass(NOW);
    expect(w.filters).toEqual(expect.arrayContaining([
      "car_commission_invoices:not:sent_at:is:null",
      "car_commission_invoices:is:paid_at:null",
      "car_commission_invoices:is:credited_at:null",
      `car_commission_invoices:lte:sent_at:${new Date(NOW.getTime() - 15 * DAY_MS).toISOString()}`,
    ]));
  });

  it("tourne le jeton, ecrit reminded_at, PUIS envoie, dans cet ordre", async () => {
    const w = wiring();
    const res = await runInvoiceReminderPass(NOW);
    expect(res.reminded).toBe(1);
    expect(rotateInvoiceToken).toHaveBeenCalledWith(1);
    const reminded = w.updates.find((u) => u.table === "car_commission_invoices");
    expect(reminded?.patch).toEqual({ reminded_at: NOW.toISOString() });
    expect(rotateInvoiceToken.mock.invocationCallOrder[0]).toBeLessThan(sendInvoiceReminder.mock.invocationCallOrder[0]);
    expect(from.mock.invocationCallOrder.at(-1)!).toBeLessThan(sendInvoiceReminder.mock.invocationCallOrder[0]);
    const [email, mail] = sendInvoiceReminder.mock.calls[0];
    expect(email).toBe("info@zorbas.gr");
    expect(mail).toMatchObject({ invoiceNumber: "NOVAI-CD-2026-001", amountEur: 24, requestId: 63, issuedOn: "2026-09-06" });
    expect(mail.invoiceUrl).toContain("/en/invoice/tok-neuf");
    expect(mail.outcomeUrl).toContain("/en/rental-outcome/tok-63");
  });

  it("refus de rotateInvoiceToken : aucun email, reminded_at intact", async () => {
    const w = wiring();
    rotateInvoiceToken.mockRejectedValueOnce(new Error("rotateInvoiceToken(1) refuse par la base"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await runInvoiceReminderPass(NOW);
    expect(res.reminded).toBe(0);
    expect(sendInvoiceReminder).not.toHaveBeenCalled();
    expect(w.updates.find((u) => u.table === "car_commission_invoices")).toBeUndefined();
    errSpy.mockRestore();
  });

  it("reminded_at refuse par la base : aucun email", async () => {
    wiring({ updateError: { message: "permission denied" } });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await runInvoiceReminderPass(NOW);
    expect(sendInvoiceReminder).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("deja rappelee : pas de second rappel", async () => {
    wiring({ invoices: [{ ...INVOICE, reminded_at: "2026-09-21T06:20:00.000Z" }] });
    await runInvoiceReminderPass(NOW);
    expect(sendInvoiceReminder).not.toHaveBeenCalled();
  });

  it("demande sans jeton d issue : en genere un et le persiste avant l email", async () => {
    const w = wiring({ request: { ...REQUEST, outcome_token: null } });
    await runInvoiceReminderPass(NOW);
    const tokenWrite = w.updates.find((u) => u.table === "car_requests");
    expect(typeof tokenWrite?.patch.outcome_token).toBe("string");
    expect(sendInvoiceReminder.mock.calls[0][1].outcomeUrl).toContain(String(tokenWrite?.patch.outcome_token));
  });

  it("loueur sans email : rien n est tourne ni ecrit", async () => {
    const w = wiring({ partner: { ...PARTNER, email: null } });
    await runInvoiceReminderPass(NOW);
    expect(rotateInvoiceToken).not.toHaveBeenCalled();
    expect(w.updates).toHaveLength(0);
  });
});

describe("runInvoiceReminderPass · J+30", () => {
  const OLD = { ...INVOICE, sent_at: "2026-08-20T05:00:01.000Z", reminded_at: "2026-09-04T06:20:00.000Z" };

  it("previent les ops chaque passage, non silencieux, loueur nomme, WhatsApp, due +3", async () => {
    wiring({ invoices: [OLD] });
    const res = await runInvoiceReminderPass(NOW);
    expect(res.overdue).toBe(1);
    expect(sendInvoiceReminder).not.toHaveBeenCalled();
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toBe("Facture NOVAI-CD-2026-001 due depuis 30 j · Zorbas Rent a Car · 24 €");
    expect(n.lines.some((l: string) => l.includes("wa.me/306912345678"))).toBe(true);
    expect(n.action).toMatch(/WhatsApp/);
    expect(n.due).toBe("+3");
    expect(n.url).toContain("/admin/car-rental");
    expect(n.silent).not.toBe(true);
  });

  it("plusieurs factures en retard : un seul message, une ligne chacune", async () => {
    wiring({ invoices: [OLD, { ...OLD, id: 2, number: "NOVAI-CD-2026-002", amount_eur: 32 }] });
    await runInvoiceReminderPass(NOW);
    expect(notifyOps).toHaveBeenCalledTimes(1);
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toBe("2 facture(s) de commission due(s) depuis 30 j");
    expect(n.lines.filter((l: string) => l.startsWith("NOVAI-CD-2026-")).length).toBe(2);
  });

  it("Telegram en panne ne fait pas tomber la passe", async () => {
    wiring({ invoices: [OLD] });
    notifyOps.mockRejectedValueOnce(new Error("telegram down"));
    await expect(runInvoiceReminderPass(NOW)).resolves.toMatchObject({ overdue: 1 });
  });

  it("rien de du : silence", async () => {
    wiring({ invoices: [] });
    await runInvoiceReminderPass(NOW);
    expect(notifyOps).not.toHaveBeenCalled();
  });
});
