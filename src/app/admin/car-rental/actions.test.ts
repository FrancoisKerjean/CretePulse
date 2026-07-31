// Etat du paiement d une commission : il n a qu UNE source de verite, et elle
// doit rester vraie quel que soit le canal. L email promet au loueur « pay by
// card on that page, or by bank transfer to the IBAN shown on it » : le virement
// n a pas de webhook, il n est reconcilie QUE par le bouton du back-office.
// Si ce bouton n ecrit que car_requests, la page facture continue d afficher son
// bouton « Pay » sur de l argent deja recu, et le loueur paie deux fois.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/car-admin-auth", () => ({ isCarAdmin: async () => true }));
vi.mock("@/lib/car-commission-server", () => ({ requestCommission: vi.fn(async () => ({ status: "disabled" })) }));

const creditCommissionInvoice = vi.fn();
const resendCommissionInvoice = vi.fn();
const expireCommissionSession = vi.fn(async () => {});
vi.mock("@/lib/car-invoice-credit", () => ({
  creditCommissionInvoice: (...a: unknown[]) => creditCommissionInvoice(...a),
  resendCommissionInvoice: (...a: unknown[]) => resendCommissionInvoice(...a),
  expireCommissionSession: (...a: unknown[]) => expireCommissionSession(...a),
}));
vi.mock("@/lib/car-connect-server", () => ({
  startPartnerOnboarding: vi.fn(),
  refreshPartnerKyc: vi.fn(),
}));
vi.mock("@/lib/google-rating-server", () => ({ refreshPartnerRating: vi.fn() }));

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

// car-invoice-server n est PAS mocke : c est justement le couplage entre les
// deux tables que ce fichier verifie. Il partage le meme faux Supabase.
import { setCommissionPaid, setOutcome } from "./actions";

const INVOICE = {
  id: 7,
  number: "NOVAI-CD-2026-004",
  request_id: 42,
  partner_id: 111,
  base_amount_eur: 310,
  rate: 0.1,
  amount_eur: 31,
  issued_at: "2026-08-10T05:00:00.000Z",
  sent_at: "2026-08-10T05:00:01.000Z",
  paid_at: null as string | null,
  credited_at: null as string | null,
  credit_number: null as string | null,
  credit_reason: null as string | null,
};

interface Wiring {
  tables: string[];
  updates: Array<{ table: string; patch: Record<string, unknown> }>;
  filters: Array<[string, unknown]>;
}

/** Chaine PostgREST modelee a la main : la FORME de la chaine fait partie de ce
 *  que le test verifie. `update().eq()...` est attendu, donc thenable. */
function wiring(opts: { invoice?: unknown; request?: unknown } = {}): Wiring {
  const w: Wiring = { tables: [], updates: [], filters: [] };
  from.mockImplementation((table: string) => {
    w.tables.push(table);
    const row = () =>
      table === "car_commission_invoices"
        ? ("invoice" in opts ? opts.invoice : INVOICE)
        : ("request" in opts ? opts.request : null);
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      eq: (col: string, val: unknown) => {
        w.filters.push([col, val]);
        return chain;
      },
      is: (col: string, val: unknown) => {
        w.filters.push([col, val]);
        return chain;
      },
      maybeSingle: async () => ({ data: row(), error: null }),
      select: async () => ({ data: [], error: null }),
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(res, rej),
    });
    return {
      select: () => chain,
      update: (patch: Record<string, unknown>) => {
        w.updates.push({ table, patch });
        return chain;
      },
    };
  });
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setCommissionPaid", () => {
  it("porte l encaissement sur la demande ET sur la facture", async () => {
    // Le virement bancaire n a pas de webhook : ce bouton est sa SEULE
    // reconciliation. Sans l ecriture sur la facture, la page garde son bouton
    // « Pay by card » et le loueur paie une seconde fois.
    const w = wiring();
    await setCommissionPaid(42, true);

    const req = w.updates.find((u) => u.table === "car_requests");
    expect(typeof req?.patch.commission_paid_at).toBe("string");

    const inv = w.updates.find((u) => u.table === "car_commission_invoices");
    expect(typeof inv?.patch.paid_at).toBe("string");
  });

  it("repasse les DEUX etats en du quand on decoche", async () => {
    // Symetrie obligatoire : un bouton qui marque payé des deux cotes mais ne
    // depaie que d un seul laisse la facture bloquee sur « payee ».
    const w = wiring({ invoice: { ...INVOICE, paid_at: "2026-08-11T09:00:00.000Z" } });
    await setCommissionPaid(42, false);

    const req = w.updates.find((u) => u.table === "car_requests");
    expect(req?.patch.commission_paid_at).toBeNull();

    const inv = w.updates.find((u) => u.table === "car_commission_invoices");
    expect(inv?.patch.paid_at).toBeNull();
  });

  it("une commission encaissee sans facture n echoue pas", async () => {
    // Commission d une demande anterieure au systeme de facturation : il n y a
    // aucune ligne a mettre a jour, et ce n est pas une erreur.
    const w = wiring({ invoice: null });
    await expect(setCommissionPaid(42, true)).resolves.toBeUndefined();
    expect(w.updates.some((u) => u.table === "car_requests")).toBe(true);
  });

  it("ne marque payee que sur une demande reellement louee", async () => {
    // Garde existante, a ne pas perdre en ajoutant la facture.
    const w = wiring();
    await setCommissionPaid(42, true);
    expect(w.filters).toContainEqual(["outcome", "rented"]);
  });
});

describe("setOutcome · perdu", () => {
  it("tue la session Stripe encore ouverte", async () => {
    // Le geste naturel du back-office pour une location qui n a pas eu lieu.
    // Une session Checkout vit 24 h : sans expiration, l onglet reste ouvert
    // chez le loueur et encaisse de l argent sur une location annulee.
    wiring();
    const fd = new FormData();
    fd.set("outcome", "lost");
    await setOutcome(42, fd);
    expect(expireCommissionSession).toHaveBeenCalledWith(42);
  });

  it("n emet AUCUN avoir : une piece comptable n est pas un effet de bord", async () => {
    wiring();
    const fd = new FormData();
    fd.set("outcome", "lost");
    await setOutcome(42, fd);
    expect(creditCommissionInvoice).not.toHaveBeenCalled();
  });
});
