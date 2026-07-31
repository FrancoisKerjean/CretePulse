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
const { requestCommission } = vi.hoisted(() => ({
  requestCommission: vi.fn(async () => ({ status: "disabled" }) as { status: string; code?: string; missing?: string[] }),
}));
vi.mock("@/lib/car-commission-server", () => ({ requestCommission }));

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
import { setCommissionPaid, setOutcome, updatePartnerIdentity, emitInvoiceAction } from "./actions";

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
function wiring(
  opts: {
    invoice?: unknown;
    request?: unknown;
    /** Refus PostgREST sur les ecritures de la table facture. */
    invoiceWriteError?: { message: string };
    /** Refus PostgREST sur les ecritures de la table loueur. */
    partnerWriteError?: { message: string };
  } = {},
): Wiring {
  const w: Wiring = { tables: [], updates: [], filters: [] };
  from.mockImplementation((table: string) => {
    w.tables.push(table);
    const writeResult = () =>
      table === "car_commission_invoices" && opts.invoiceWriteError
        ? { data: null, error: opts.invoiceWriteError }
        : table === "car_partners" && opts.partnerWriteError
          ? { data: null, error: opts.partnerWriteError }
          : { data: [], error: null };
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
      select: async () => writeResult(),
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

  it.each([
    ["encaissee", true],
    ["due", false],
  ])("une ecriture refusee sur la facture (%s) ne passe pas pour un succes", async (_l, paid) => {
    // Le back-office affichait « commission encaissee » alors que la page du
    // loueur gardait son bouton « Pay by card » : l erreur PostgREST n etait
    // jamais lue. Elle remonte maintenant, comme toutes les erreurs de ce
    // fichier — Next affiche l echec, personne ne croit a un succes.
    wiring({ invoiceWriteError: { message: "permission denied for table" } });
    await expect(setCommissionPaid(42, paid)).rejects.toThrow(/permission denied for table/);
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

describe("setOutcome · louee, facturation refusee pour identite incomplete", () => {
  // La location EST louee : marquer l issue ne doit JAMAIS echouer a cause
  // d un probleme de facturation, c est un fait constate, la facturation se
  // rattrape ensuite. Mais l ecran ne doit pas rester muet sur ce refus, ni
  // afficher une panne : un loueur sans identite legale complete est un etat
  // normal du systeme tant que la fiche n a pas ete remplie.
  function rentedForm(amount = "310") {
    const fd = new FormData();
    fd.set("outcome", "rented");
    fd.set("amount", amount);
    return fd;
  }

  it("marque quand meme la location louee AVANT d appeler requestCommission", async () => {
    const w = wiring({ request: { quoted_by_partner_id: 111, commission: 0.1 } });
    requestCommission.mockResolvedValueOnce({
      status: "partner_identity_incomplete",
      missing: ["vat_id"],
    });

    await expect(setOutcome(42, rentedForm())).rejects.toThrow(/NEXT_REDIRECT:/);

    const req = w.updates.find((u) => u.table === "car_requests");
    expect(req?.patch.outcome).toBe("rented");
  });

  it("explique le refus a l ecran, en nommant le champ manquant", async () => {
    wiring({ request: { quoted_by_partner_id: 111, commission: 0.1 } });
    requestCommission.mockResolvedValueOnce({
      status: "partner_identity_incomplete",
      missing: ["vat_id"],
    });

    try {
      await setOutcome(42, rentedForm());
      throw new Error("aurait du rediriger");
    } catch (err) {
      const message = decodeURIComponent(String((err as Error).message));
      expect(message).toContain("numéro de TVA");
    }
  });

  it("liste TOUS les champs manquants, pas seulement le premier", async () => {
    wiring({ request: { quoted_by_partner_id: 111, commission: 0.1 } });
    requestCommission.mockResolvedValueOnce({
      status: "partner_identity_incomplete",
      missing: ["address_line", "vat_id"],
    });

    try {
      await setOutcome(42, rentedForm());
      throw new Error("aurait du rediriger");
    } catch (err) {
      const message = decodeURIComponent(String((err as Error).message));
      expect(message).toContain("adresse");
      expect(message).toContain("numéro de TVA");
    }
  });

  it("un echec ordinaire (requestCommission failed) reste silencieux comme avant : pas de regression", async () => {
    // Comportement PRE-EXISTANT, a ne pas casser en ajoutant la nouvelle branche.
    wiring({ request: { quoted_by_partner_id: 111, commission: 0.1 } });
    requestCommission.mockResolvedValueOnce({ status: "failed", code: "partner_without_email" });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(setOutcome(42, rentedForm())).resolves.toBeUndefined();
    expect(JSON.stringify(errSpy.mock.calls)).toContain("partner_without_email");
    errSpy.mockRestore();
  });

  it("un succes normal (requested) ne redirige pas et ne journalise rien", async () => {
    wiring({ request: { quoted_by_partner_id: 111, commission: 0.1 } });
    requestCommission.mockResolvedValueOnce({ status: "requested", invoiceNumber: "NOVAI-2026-010" });
    await expect(setOutcome(42, rentedForm())).resolves.toBeUndefined();
  });
});

describe("updatePartnerIdentity", () => {
  // Les colonnes d identite legale existaient, rien ne les ecrivait : dix
  // loueurs actifs, un seul renseigne (a la main, en SQL). Les neuf autres
  // bloquent toute facturation.
  function identityForm(over: Record<string, string> = {}) {
    const fd = new FormData();
    const base: Record<string, string> = {
      legal_name: "Lux Trans IKE",
      legal_form: "Private company (IKE), Greece",
      address_line: "Leoforos Knossou 12",
      postal_code: "71306",
      city: "Heraklion",
      country: "Greece",
      vat_id: "EL801122501",
    };
    for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
    return fd;
  }

  it("ecrit les huit colonnes d identite sur le loueur vise", async () => {
    const w = wiring({ request: null });
    await updatePartnerIdentity(111, identityForm());

    const upd = w.updates.find((u) => u.table === "car_partners");
    expect(Object.keys(upd?.patch ?? {}).sort()).toEqual([
      "address_line", "city", "country", "legal_form", "legal_name",
      "postal_code", "vat_id", "vat_verified_at",
    ]);
    expect(upd?.patch.legal_name).toBe("Lux Trans IKE");
    expect(w.filters).toContainEqual(["id", 111]);
  });

  it("stocke le numero de TVA sous la forme que la facture imprimera", async () => {
    const w = wiring({ request: null });
    await updatePartnerIdentity(111, identityForm({ vat_id: " el 801 122 501 " }));
    const upd = w.updates.find((u) => u.table === "car_partners");
    expect(upd?.patch.vat_id).toBe("EL801122501");
  });

  it("n atteste AUCUNE verification VIES tant que la case n est pas cochee", async () => {
    // La facture imprime « verified against the VIES database on <date> » quand
    // et seulement quand cette colonne est remplie. Un enregistrement ordinaire
    // ne doit jamais la poser.
    const w = wiring({ request: null });
    await updatePartnerIdentity(111, identityForm());
    const upd = w.updates.find((u) => u.table === "car_partners");
    expect(upd?.patch.vat_verified_at).toBeNull();
  });

  it("date l attestation du jour quand la case est cochee", async () => {
    const w = wiring({ request: null });
    await updatePartnerIdentity(111, identityForm({ vatVerified: "on" }));
    const upd = w.updates.find((u) => u.table === "car_partners");
    expect(String(upd?.patch.vat_verified_at)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("relit la fiche AVANT d ecrire : sans elle, l attestation existante serait re-datee", async () => {
    // Le patch conserve la date d origine quand le numero n a pas bouge : il
    // faut donc l ancienne valeur, elle ne peut venir que d une lecture.
    const w = wiring({ request: { vat_id: "EL801122501", vat_verified_at: "2026-07-30" } });
    await updatePartnerIdentity(111, identityForm({ vatVerified: "on" }));
    const upd = w.updates.find((u) => u.table === "car_partners");
    expect(upd?.patch.vat_verified_at).toBe("2026-07-30");
  });

  it("efface l attestation quand le numero de TVA change", async () => {
    const w = wiring({ request: { vat_id: "EL801122501", vat_verified_at: "2026-07-30" } });
    await updatePartnerIdentity(111, identityForm({ vat_id: "EL999888777" }));
    const upd = w.updates.find((u) => u.table === "car_partners");
    expect(upd?.patch.vat_verified_at).toBeNull();
  });

  it("une ecriture refusee par la base ne passe pas pour un succes", async () => {
    // Convention du chantier : toute ecriture lit son `error` (assertWritten).
    // Sans ca, l ecran afficherait la fiche complete alors que rien n est ecrit,
    // et la facturation resterait bloquee sans que personne comprenne pourquoi.
    wiring({ request: null, partnerWriteError: { message: "permission denied for table" } });
    await expect(updatePartnerIdentity(111, identityForm())).rejects.toThrow(/permission denied/);
  });
});

describe("emitInvoiceAction", () => {
  // Une location marquee « louee » dont la facturation a ete refusee porte
  // outcome = 'rented' SANS facture, et le cron ne repassera jamais dessus :
  // il ne prend que `outcome IS NULL`. Ce bouton est le SEUL rattrapage.
  it("appelle requestCommission sur la demande visee", async () => {
    wiring();
    requestCommission.mockResolvedValueOnce({ status: "requested", invoiceNumber: "NOVAI-CD-2026-004" });
    await emitInvoiceAction(42);
    expect(requestCommission).toHaveBeenCalledWith(42);
  });

  it("un succes ne redirige pas : la facture apparait d elle-meme sur la ligne", async () => {
    wiring();
    requestCommission.mockResolvedValueOnce({ status: "requested", invoiceNumber: "NOVAI-CD-2026-004" });
    await expect(emitInvoiceAction(42)).resolves.toBeUndefined();
  });

  it("nomme les champs manquants quand la fiche loueur est encore incomplete", async () => {
    wiring();
    requestCommission.mockResolvedValueOnce({
      status: "partner_identity_incomplete",
      missing: ["address_line", "vat_id"],
    });
    try {
      await emitInvoiceAction(42);
      throw new Error("aurait du rediriger");
    } catch (err) {
      const message = decodeURIComponent(String((err as Error).message));
      expect(message).toContain("adresse");
      expect(message).toContain("numéro de TVA");
    }
  });

  it("dit que le systeme est desarme au lieu de ne rien faire", async () => {
    wiring();
    requestCommission.mockResolvedValueOnce({ status: "disabled" });
    try {
      await emitInvoiceAction(42);
      throw new Error("aurait du rediriger");
    } catch (err) {
      expect(decodeURIComponent(String((err as Error).message))).toContain("CAR_COMMISSION_ENABLED");
    }
  });

  it("dit qu une demande est deja partie quand le verrou est tenu", async () => {
    wiring();
    requestCommission.mockResolvedValueOnce({ status: "already_requested" });
    await expect(emitInvoiceAction(42)).rejects.toThrow(/NEXT_REDIRECT:/);
  });
});
