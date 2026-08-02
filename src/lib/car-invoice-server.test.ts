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
  markInvoiceUnpaid,
  creditInvoice,
  rotateInvoiceToken,
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
    /** Reponse de PostgREST a un UPDATE. Par defaut : accepte, 0 ligne touchee. */
    write?: { data: unknown; error: { message: string } | null };
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
      // que si `select()` suit. Il ne LEVE jamais, il rend `{ data, error }`.
      select: async () => opts.write ?? { data: [], error: null },
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

  it("ne marque le paiement que si paid_at est encore vide et la facture non avoiree", async () => {
    // Sans le garde `is(paid_at, null)`, un second webhook Stripe ecraserait la
    // date du premier paiement. Sans `is(credited_at, null)`, un paiement arrive
    // apres l avoir marquerait payee une facture annulee.
    const w = wiring({ selects: [{ data: INVOICE }] });
    await markInvoicePaid(39);

    expect(w.filters).toEqual([
      ["request_id", 39], // lecture prealable
      ["request_id", 39],
      ["paid_at", null],
      ["credited_at", null],
    ]);
    expect(typeof w.updates[0].paid_at).toBe("string");
  });

  it("ne marque JAMAIS payee une facture avoiree, et le hurle", async () => {
    // Cas reel : la session Stripe est restee ouverte dans un onglet, l avoir a
    // ete emis entre-temps, le loueur paie quand meme. L argent EST encaisse.
    // Se contenter d ignorer le webhook laisserait un remboursement du que
    // personne n apprendrait jamais.
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = wiring({
      selects: [
        {
          data: {
            ...INVOICE,
            credited_at: "2026-08-02T10:00:00Z",
            credit_number: "NOVAI-CD-2026-004-A",
          },
        },
      ],
    });

    await markInvoicePaid(39);

    expect(w.updates).toHaveLength(0);
    const logged = JSON.stringify(err.mock.calls);
    expect(logged).toContain("NOVAI-CD-2026-004");
    expect(logged).toMatch(/REMBOURSEMENT/i);
    err.mockRestore();
  });

  it("une demande sans facture ne fait rien echouer", async () => {
    // Commission encaissee sur une demande anterieure au systeme de
    // facturation : il n y a aucune ligne a toucher, ce n est pas une erreur.
    wiring({ selects: [{ data: null }] });
    await expect(markInvoicePaid(999)).resolves.toBeUndefined();
  });

  it("markInvoiceUnpaid repasse la facture en due sur request_id", async () => {
    // Symetrique de markInvoicePaid : le bouton du back-office bascule dans les
    // deux sens, la facture doit suivre dans les deux sens.
    const w = wiring();
    await markInvoiceUnpaid(39);

    expect(w.updates[0]).toEqual({ paid_at: null });
    expect(w.filters).toEqual([["request_id", 39]]);
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

describe("rotateInvoiceToken", () => {
  it("ecrit un nouveau hash et rend le jeton en clair, sur l id de la facture", async () => {
    // Le jeton est stocke hache donc jamais relisible : un renvoi ne peut pas
    // reutiliser l ancien lien, il doit en fabriquer un neuf.
    const w = wiring();
    const token = await rotateInvoiceToken(7);

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(16);
    expect(w.updates[0]).toEqual({ token_hash: hashToken(token) });
    expect(w.updates[0]).not.toHaveProperty("token");
    expect(w.filters).toEqual([["id", 7]]);
  });

  it("ne touche jamais au numero de facture", async () => {
    // Exigence comptable : une piece emise garde son numero, quel que soit le
    // nombre de renvois.
    const w = wiring();
    await rotateInvoiceToken(7);
    await rotateInvoiceToken(7);

    for (const patch of w.updates) {
      expect(patch).not.toHaveProperty("number");
      expect(patch).not.toHaveProperty("credit_number");
    }
    expect(w.tables).toEqual(["car_commission_invoices", "car_commission_invoices"]);
  });

  it("rend un jeton different a chaque rotation", async () => {
    wiring();
    const a = await rotateInvoiceToken(7);
    const b = await rotateInvoiceToken(7);
    expect(a).not.toBe(b);
  });
});

describe("une ecriture refusee ne passe JAMAIS pour un succes", () => {
  // PostgREST ne LEVE pas sur refus : il rend `{ data, error }`, exactement
  // comme l API Resend, sur laquelle ce depot a deja paye ce piege (des envois
  // refuses comptes comme partis). Sans lecture de `error`, une ecriture
  // refusee, droits, contrainte, panne reseau, est totalement invisible.
  const REFUS = {
    data: null,
    error: { message: "permission denied for table car_commission_invoices" },
  };

  it.each([
    ["markInvoiceSent", () => markInvoiceSent(7)],
    ["markInvoicePaid", () => markInvoicePaid(39)],
    ["markInvoiceUnpaid", () => markInvoiceUnpaid(39)],
    ["creditInvoice", () => creditInvoice(7, "NOVAI-CD-2026-004", "annulation")],
    ["rotateInvoiceToken", () => rotateInvoiceToken(7)],
  ])("%s leve quand PostgREST refuse l ecriture", async (_label, call) => {
    wiring({ selects: [{ data: INVOICE }], write: REFUS });
    await expect(call()).rejects.toThrow(/permission denied for table/);
  });

  it("markInvoiceSent refuse : la facture n est pas comptee comme partie", async () => {
    // Consequence concrete : une facture reellement envoyee resterait affichee
    // « jamais envoyee » au back-office, et quelqu un la renverrait.
    wiring({ write: REFUS });
    await expect(markInvoiceSent(7)).rejects.toThrow(/markInvoiceSent/);
  });

  it("markInvoicePaid refuse : le bloquant du double paiement remonte", async () => {
    // Le loueur a paye par carte, la page continuerait d afficher « a payer ».
    // C est le defaut qu on vient de corriger, revenu par un autre chemin.
    wiring({ selects: [{ data: INVOICE }], write: REFUS });
    await expect(markInvoicePaid(39)).rejects.toThrow(/markInvoicePaid/);
  });

  it("rotateInvoiceToken refuse : aucun jeton fantome n est rendu", async () => {
    // Le jeton rendu a l appelant ne correspondrait a rien en base, et l email
    // partirait avec un lien mort.
    wiring({ write: REFUS });
    await expect(rotateInvoiceToken(7)).rejects.toThrow(/rotateInvoiceToken/);
  });

  it.each([
    ["markInvoicePaid", () => markInvoicePaid(999)],
    ["markInvoiceUnpaid", () => markInvoiceUnpaid(999)],
  ])("%s : zero ligne touchee n est PAS une erreur", async (_label, call) => {
    // Commission d une demande anterieure au systeme de facturation : il n y a
    // aucune ligne a toucher, PostgREST rend `error: null`, tout va bien.
    wiring({ selects: [{ data: null }], write: { data: [], error: null } });
    await expect(call()).resolves.toBeUndefined();
  });

  it("une facture avoiree ne tente aucune ecriture, donc ne leve pas", async () => {
    // La sortie anticipee de markInvoicePaid precede l update : le refus
    // simule ne doit pas transformer ce cas en echec.
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = wiring({
      selects: [{ data: { ...INVOICE, credited_at: "2026-08-02T10:00:00Z" } }],
      write: REFUS,
    });
    await expect(markInvoicePaid(39)).resolves.toBeUndefined();
    expect(w.updates).toHaveLength(0);
    err.mockRestore();
  });
});
