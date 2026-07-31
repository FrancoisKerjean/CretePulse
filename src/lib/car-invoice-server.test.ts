import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashToken } from "./car-quote";

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from, rpc } }));

import {
  createInvoiceForRequest,
  invoiceForRequest,
  invoiceByToken,
  markInvoiceSent,
  markInvoicePaid,
  creditInvoice,
} from "./car-invoice-server";

const INVOICE = {
  id: 7,
  number: "NOVAI-CD-2026-004",
  request_id: 39,
  partner_id: 16,
  base_amount_eur: 200,
  rate: 0.1,
  amount_eur: 20,
  issued_at: "2026-08-01T05:00:00Z",
  sent_at: null,
  paid_at: null,
  credited_at: null,
  credit_number: null,
  credit_reason: null,
};

const INPUT = { requestId: 39, partnerId: 16, base: 200, rate: 0.1, amount: 20 };

interface Wiring {
  tables: string[];
  /** Filtres `.eq()` et `.is()` poses, dans l ordre, tous appels confondus. */
  filters: Array<[string, unknown]>;
  inserts: Array<Record<string, unknown>>;
  updates: Array<Record<string, unknown>>;
}

/**
 * Chaine PostgREST modelee a la main plutot qu un faux builder qui se rend
 * lui-meme a chaque methode : la FORME de la chaine fait alors partie de ce que
 * le test verifie. Une lecture passe par `select().eq().maybeSingle()`, une
 * creation par `insert().select().maybeSingle()` ; un builder permissif
 * laisserait passer les deux indifferemment.
 * `selects` est consomme dans l ordre, le dernier element se repete : le 1er
 * repond a la lecture initiale, le 2e a la relecture apres course perdue.
 */
function wiring(
  opts: {
    selects?: Array<{ data: unknown }>;
    insert?: { data: unknown; error: { message: string } | null };
  } = {},
): Wiring {
  const w: Wiring = { tables: [], filters: [], inserts: [], updates: [] };
  const selects = [...(opts.selects ?? [{ data: null }])];
  const nextSelect = () => (selects.length > 1 ? selects.shift()! : (selects[0] ?? { data: null }));

  from.mockImplementation((table: string) => {
    w.tables.push(table);
    const chain = {
      eq: (col: string, val: unknown) => {
        w.filters.push([col, val]);
        return chain;
      },
      is: (col: string, val: unknown) => {
        w.filters.push([col, val]);
        return chain;
      },
      maybeSingle: async () => nextSelect(),
      // Fin de chaine d un update : PostgREST ne renvoie les lignes touchees
      // que si `select()` suit.
      select: async () => ({ data: [], error: null }),
    };
    return {
      select: () => chain,
      insert: (row: Record<string, unknown>) => {
        w.inserts.push(row);
        return {
          select: () => ({
            maybeSingle: async () => opts.insert ?? { data: INVOICE, error: null },
          }),
        };
      },
      update: (patch: Record<string, unknown>) => {
        w.updates.push(patch);
        return chain;
      },
    };
  });
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createInvoiceForRequest", () => {
  it("reutilise une facture existante au lieu d en creer une seconde", async () => {
    // Cas reel : requestCommission a relache son verrou apres un echec, la ligne
    // redevient eligible. Creer une seconde facture buterait sur request_id UNIQUE.
    const w = wiring({ selects: [{ data: INVOICE }] });
    const res = await createInvoiceForRequest(INPUT);

    expect(res.reused).toBe(true);
    expect(res.invoice.number).toBe("NOVAI-CD-2026-004");
    expect(rpc).not.toHaveBeenCalled();
    expect(w.inserts).toHaveLength(0);
    expect(w.tables).toEqual(["car_commission_invoices"]);
    expect(w.filters).toEqual([["request_id", 39]]);
  });

  it("ne consomme un numero que lorsqu il faut vraiment creer", async () => {
    // Un numero brule pour rien laisse un trou dans une serie qui doit rester
    // continue : le RPC ne doit etre appele qu apres avoir constate l absence.
    const created = { ...INVOICE, id: 8, number: "NOVAI-CD-2026-005", request_id: 40 };
    const w = wiring({ selects: [{ data: null }], insert: { data: created, error: null } });
    rpc.mockResolvedValue({ data: "NOVAI-CD-2026-005", error: null });

    const res = await createInvoiceForRequest({ ...INPUT, requestId: 40 });

    expect(rpc).toHaveBeenCalledWith("next_car_invoice_number");
    expect(res.reused).toBe(false);
    expect(res.invoice.number).toBe("NOVAI-CD-2026-005");
    expect(w.inserts).toHaveLength(1);
    expect(w.inserts[0]).toMatchObject({
      number: "NOVAI-CD-2026-005",
      request_id: 40,
      partner_id: 16,
      base_amount_eur: 200,
      rate: 0.1,
      amount_eur: 20,
    });
  });

  it("stocke le jeton hache, jamais en clair", async () => {
    const created = { ...INVOICE, id: 8, number: "NOVAI-CD-2026-005", request_id: 40 };
    const w = wiring({ selects: [{ data: null }], insert: { data: created, error: null } });
    rpc.mockResolvedValue({ data: "NOVAI-CD-2026-005", error: null });

    const res = await createInvoiceForRequest({ ...INPUT, requestId: 40 });

    expect(typeof res.token).toBe("string");
    expect(w.inserts[0].token_hash).toBe(hashToken(res.token!));
    expect(w.inserts[0]).not.toHaveProperty("token");
  });

  it("course perdue : rend la facture de l autre appel au lieu de lever", async () => {
    // L insert bute sur request_id UNIQUE parce qu un autre appel a gagne. La
    // contrainte a fait son travail : on relit et on rend SA facture.
    const other = { ...INVOICE, id: 9, number: "NOVAI-CD-2026-006", request_id: 41 };
    const w = wiring({
      selects: [{ data: null }, { data: other }],
      insert: {
        data: null,
        error: {
          message:
            'duplicate key value violates unique constraint "car_commission_invoices_request_id_key"',
        },
      },
    });
    rpc.mockResolvedValue({ data: "NOVAI-CD-2026-007", error: null });

    const res = await createInvoiceForRequest({ ...INPUT, requestId: 41 });

    expect(res.reused).toBe(true);
    expect(res.invoice.number).toBe("NOVAI-CD-2026-006");
    expect(res.invoice.id).toBe(9);
    expect(res.token).toBeNull();
    expect(w.inserts).toHaveLength(1);
  });

  it("course perdue ET relecture vide : la, il faut lever", async () => {
    // L insert a echoue pour une autre raison que la contrainte. Rendre un
    // succes silencieux ferait croire au cron qu une facture existe.
    const w = wiring({
      selects: [{ data: null }, { data: null }],
      insert: { data: null, error: { message: "null value in column partner_id" } },
    });
    rpc.mockResolvedValue({ data: "NOVAI-CD-2026-007", error: null });

    await expect(createInvoiceForRequest({ ...INPUT, requestId: 41 })).rejects.toThrow(
      /null value in column partner_id/,
    );
    expect(w.inserts).toHaveLength(1);
  });

  it("numerotation impossible : leve, et n insere aucune facture", async () => {
    const w = wiring({ selects: [{ data: null }] });
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for function next_car_invoice_number" },
    });

    await expect(createInvoiceForRequest({ ...INPUT, requestId: 42 })).rejects.toThrow(
      /permission denied for function next_car_invoice_number/,
    );
    expect(w.inserts).toHaveLength(0);
  });

  it("ne rend le jeton en clair qu a la creation", async () => {
    // Structurel : le token est stocke hache, il n est jamais relisible ensuite.
    // Un renvoi de facture deja emise passe par le back-office, pas par ici.
    wiring({ selects: [{ data: INVOICE }] });
    const reused = await createInvoiceForRequest(INPUT);
    expect(reused.reused).toBe(true);
    expect(reused.token).toBeNull();

    const created = { ...INVOICE, id: 8, number: "NOVAI-CD-2026-005", request_id: 40 };
    wiring({ selects: [{ data: null }], insert: { data: created, error: null } });
    rpc.mockResolvedValue({ data: "NOVAI-CD-2026-005", error: null });
    const fresh = await createInvoiceForRequest({ ...INPUT, requestId: 40 });
    expect(fresh.reused).toBe(false);
    expect(fresh.token).toBeTruthy();
  });
});

describe("lectures", () => {
  it("cherche la facture d une demande sur request_id", async () => {
    const w = wiring({ selects: [{ data: INVOICE }] });
    expect((await invoiceForRequest(39))?.id).toBe(7);
    expect(w.filters).toEqual([["request_id", 39]]);
  });

  it("cherche par le HASH du jeton, jamais par le jeton en clair", async () => {
    const w = wiring({ selects: [{ data: INVOICE }] });
    const found = await invoiceByToken("jeton-en-clair");

    expect(found?.number).toBe("NOVAI-CD-2026-004");
    expect(w.filters).toEqual([["token_hash", hashToken("jeton-en-clair")]]);
    expect(w.filters[0][1]).not.toBe("jeton-en-clair");
  });

  it("rend null quand rien ne correspond", async () => {
    wiring({ selects: [{ data: null }] });
    expect(await invoiceForRequest(999)).toBeNull();
    expect(await invoiceByToken("inconnu")).toBeNull();
  });
});

describe("marquages", () => {
  it("marque l envoi sur l id de la facture", async () => {
    const w = wiring();
    await markInvoiceSent(7);

    expect(w.filters).toEqual([["id", 7]]);
    expect(typeof w.updates[0].sent_at).toBe("string");
  });

  it("ne marque le paiement que si paid_at est encore vide", async () => {
    // Sans le garde `is(paid_at, null)`, un second webhook Stripe ecraserait la
    // date du premier paiement.
    const w = wiring();
    await markInvoicePaid(39);

    expect(w.filters).toEqual([
      ["request_id", 39],
      ["paid_at", null],
    ]);
    expect(typeof w.updates[0].paid_at).toBe("string");
  });

  it("l avoir porte le numero de sa facture suffixe -A et ne s applique qu une fois", async () => {
    const w = wiring();
    const creditNumber = await creditInvoice(7, "NOVAI-CD-2026-004", "annulation loueur");

    expect(creditNumber).toBe("NOVAI-CD-2026-004-A");
    expect(w.updates[0]).toMatchObject({
      credit_number: "NOVAI-CD-2026-004-A",
      credit_reason: "annulation loueur",
    });
    expect(typeof w.updates[0].credited_at).toBe("string");
    expect(w.filters).toEqual([
      ["id", 7],
      ["credited_at", null],
    ]);
  });
});
