import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// La borne de mise en service est lue a l import du module : on garantit ici que
// c est bien la valeur PAR DEFAUT du code qui est testee, pas une valeur d env.
vi.hoisted(() => {
  delete process.env.COMMISSION_INVOICING_START;
});

const { from, update, requestCommission, notifyOps } = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  requestCommission: vi.fn(),
  notifyOps: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/car-commission-server", () => ({ requestCommission }));
vi.mock("@/lib/ops-notify", () => ({ notifyOps }));

/** Borne codee en dur dans la route. Le systeme demarre le 05/08/2026. */
const START = "2026-08-05";
const TODAY = "2026-08-10";

const authed = (secret = "s3cret") =>
  new Request("https://x", { headers: { authorization: `Bearer ${secret}` } }) as never;

/** Une location eligible : acceptee, non tranchee, non payee en ligne, demarree. */
const ELIGIBLE = {
  id: 42,
  accepted_at: "2026-08-01T10:00:00.000Z",
  outcome: null,
  date_from: TODAY,
  booking_paid_at: null,
  quoted_by_partner_id: 111,
  quoted_price: 310,
};

/**
 * Identite legale complete d un loueur grec. Sans elle, aucune facture ne peut
 * porter la mention d autoliquidation intra-UE, donc aucune facture ne part.
 */
const IDENTITY = {
  legal_name: "Lux Trans IKE",
  legal_form: "Private company (IKE), Greece",
  address_line: "1922 Street, No 10",
  postal_code: "71601",
  city: "Heraklion",
  country: "Greece",
  vat_id: "EL801122501",
  vat_verified_at: "2026-07-30",
};

type PartnerMock = (Record<string, unknown> & { commission: number | null }) | null;

interface Wiring {
  rows?: Array<Record<string, unknown>>;
  partner?: PartnerMock;
}

function wiring(w: Wiring = {}) {
  const rows = w.rows ?? [ELIGIBLE];
  const partner: PartnerMock =
    w.partner === undefined ? { commission: 0.1, ...IDENTITY } : w.partner;
  const updates: Array<Record<string, unknown>> = [];
  const filters: string[] = [];
  let selected = "";
  let partnerCols = "";

  update.mockImplementation((patch: Record<string, unknown>) => {
    updates.push(patch);
    return { eq: () => ({ select: async () => ({ data: [patch], error: null }) }) };
  });

  from.mockImplementation((table: string) => {
    if (table === "car_requests") {
      return {
        select: (cols: string) => {
          selected = cols;
          const q = {
            not: (c: string, op: string, v: unknown) => {
              filters.push(`not:${c}:${op}:${v}`);
              return q;
            },
            is: (c: string, v: unknown) => {
              filters.push(`is:${c}:${v}`);
              return q;
            },
            lte: (c: string, v: unknown) => {
              filters.push(`lte:${c}:${v}`);
              return q;
            },
            gte: async (c: string, v: unknown) => {
              filters.push(`gte:${c}:${v}`);
              return { data: rows, error: null };
            },
          };
          return q;
        },
        update,
      };
    }
    // ⛔ Aucune branche `car_commission_invoices` : le cron n a pas a relire la
    // table des factures, `outcome IS NULL` suffit. Une relecture reintroduite
    // tomberait sur le `throw` ci-dessous.
    if (table === "car_partners") {
      return {
        select: (cols: string) => {
          partnerCols = cols;
          return { eq: () => ({ maybeSingle: async () => ({ data: partner }) }) };
        },
      };
    }
    throw new Error(`table inattendue: ${table}`);
  });

  return { updates, filters, selected: () => selected, partnerCols: () => partnerCols };
}

describe("GET /api/cron/car-commission-invoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T05:00:00.000Z`));
    process.env.CRON_SECRET = "s3cret";
    // On n arme JAMAIS par defaut : chaque test qui a besoin de l interrupteur
    // le pose lui-meme, et l environnement repart propre entre les cas.
    delete process.env.CAR_COMMISSION_ENABLED;
    requestCommission.mockResolvedValue({ status: "requested", invoiceNumber: "F-001" });
    notifyOps.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CAR_COMMISSION_ENABLED;
  });

  // ── L interrupteur ─────────────────────────────────────────────────────────

  it("n ecrit RIEN quand l interrupteur est eteint", async () => {
    // Le cron ecrivait outcome, final_amount_eur et commission_eur AVANT
    // d appeler requestCommission, seul porteur de la garde. Eteint, il polluait
    // donc les donnees en silence.
    wiring();
    const { GET } = await import("./route");
    const res = await GET(authed());
    expect(await res.json()).toEqual({ disabled: true });
    expect(update).not.toHaveBeenCalled();
    expect(requestCommission).not.toHaveBeenCalled();
    // Rien n a ete lu non plus : desarme, le cron ne touche pas la base.
    expect(from).not.toHaveBeenCalled();
  });

  it("reste eteint sur une valeur approchante", async () => {
    wiring();
    for (const v of ["true", "1", "ON", "yes", ""]) {
      process.env.CAR_COMMISSION_ENABLED = v;
      const { GET } = await import("./route");
      const res = await GET(authed());
      expect(await res.json()).toEqual({ disabled: true });
    }
    expect(update).not.toHaveBeenCalled();
    expect(requestCommission).not.toHaveBeenCalled();
  });

  // ── Authentification ───────────────────────────────────────────────────────

  it("refuse un appel sans en-tete d autorisation valide", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    wiring();
    const { GET } = await import("./route");
    const res = await GET(authed("mauvais"));
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("refuse AVANT de reveler l etat de l interrupteur", async () => {
    // Garde d armement placee avant assertCron : un anonyme obtiendrait
    // { disabled: true } en 200 et saurait que le systeme dort. C est une fuite.
    delete process.env.CAR_COMMISSION_ENABLED;
    wiring();
    const { GET } = await import("./route");
    const res = await GET(authed("mauvais"));
    expect(res.status).toBe(403);
    expect(await res.json()).not.toEqual({ disabled: true });
  });

  // ── L ordre des ecritures ──────────────────────────────────────────────────

  it("bascule outcome=rented AVANT d appeler requestCommission", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    const { updates } = wiring();
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({ invoiced: 1, skipped: [], today: TODAY, start: START });
    expect(updates[0]).toMatchObject({
      outcome: "rented",
      final_amount_eur: 310,
      commission_eur: 31,
    });
    expect(updates[0].outcome_at).toBeTruthy();
    // shouldRequestCommission exige outcome === "rented" : si l appel precede la
    // bascule, requestCommission rend "skipped" et rien n est facture. On verifie
    // l ordre REEL des invocations, pas seulement leur presence.
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(
      requestCommission.mock.invocationCallOrder[0],
    );
    expect(requestCommission).toHaveBeenCalledWith(42);
  });

  // ── La selection ───────────────────────────────────────────────────────────

  it("ecarte cote requete les tranchees, les payees en ligne et le hors-borne", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    const { filters, selected } = wiring();
    const { GET } = await import("./route");
    await GET(authed());

    expect(filters).toContain("not:accepted_at:is:null");
    expect(filters).toContain("is:outcome:null");
    expect(filters).toContain("is:booking_paid_at:null");
    expect(filters).toContain(`lte:date_from:${TODAY}`);
    expect(filters).toContain(`gte:date_from:${START}`);
    expect(selected()).toContain("quoted_price");
  });

  it.each([
    ["deja tranchee", { outcome: "cancelled" }],
    ["payee en ligne", { booking_paid_at: "2026-08-02T00:00:00.000Z" }],
    ["sans loueur gagnant", { quoted_by_partner_id: null }],
    ["anterieure a la borne de mise en service", { date_from: "2026-08-01" }],
    ["jamais acceptee", { accepted_at: null }],
  ])("ecarte une location %s meme si la requete la remonte", async (_label, patch) => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    wiring({ rows: [{ ...ELIGIBLE, ...patch }] });
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({ invoiced: 0, skipped: [] });
    expect(update).not.toHaveBeenCalled();
    expect(requestCommission).not.toHaveBeenCalled();
  });

  // ── Les motifs de rejet ────────────────────────────────────────────────────
  // `skipped` portait des identifiants nus : trois causes tres differentes y
  // etaient indiscernables. Au premier tir en production, le tableau doit dire
  // ce qui s est passe, sinon il faut relire la base ligne par ligne.

  it("ecarte une commission sous le minimum encaissable par Stripe, en le disant", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    // 4 EUR a 10 % = 0,40 EUR, sous les 0,50 EUR minimum de Stripe.
    wiring({ rows: [{ ...ELIGIBLE, quoted_price: 4 }] });
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({
      invoiced: 0,
      skipped: [{ id: 42, reason: "below_minimum" }],
    });
    expect(update).not.toHaveBeenCalled();
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("ecarte une location dont le loueur est introuvable, en le disant", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    wiring({ partner: null });
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({
      invoiced: 0,
      skipped: [{ id: 42, reason: "partner_not_found" }],
    });
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ["nul", null],
    ["a zero", 0],
  ])("distingue un taux de commission %s d une commission trop petite", async (_l, commission) => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    // Number(null) vaut 0 : sans motif propre, un loueur sans taux configure
    // partait en « below_minimum » et se lisait comme une petite location.
    wiring({ partner: { commission } });
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({
      invoiced: 0,
      skipped: [{ id: 42, reason: "no_commission_rate" }],
    });
    expect(update).not.toHaveBeenCalled();
    expect(requestCommission).not.toHaveBeenCalled();
  });

  // ── L identite legale du loueur ────────────────────────────────────────────
  // NovAI est francaise, le loueur est grec : la commission est une prestation
  // de services intra-UE, autoliquidee par le preneur. La piece DOIT porter le
  // numero de TVA du client et son adresse complete. Mieux vaut ne pas facturer
  // que d emettre une facture fausse chez une vraie entreprise.

  it.each([
    ["sans numero de TVA", { vat_id: null }],
    ["sans raison sociale", { legal_name: null }],
    ["sans adresse", { address_line: null }],
    ["sans code postal", { postal_code: null }],
    ["sans ville", { city: null }],
    ["sans pays", { country: null }],
    ["dont le numero de TVA est un fourre-tout", { vat_id: "N/A" }],
  ])("n emet AUCUNE facture pour un loueur %s", async (_label, patch) => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    wiring({ partner: { commission: 0.1, ...IDENTITY, ...patch } });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({
      invoiced: 0,
      skipped: [{ id: 42, reason: "partner_identity_incomplete" }],
    });
    expect(requestCommission).not.toHaveBeenCalled();
    // Le motif rendu est stable et court : c est le journal qui dit QUEL champ
    // manque, sinon il faut relire la fiche loueur pour le savoir.
    expect(JSON.stringify(errSpy.mock.calls)).toContain(Object.keys(patch)[0]);
    errSpy.mockRestore();
  });

  it("ecarte AVANT toute ecriture : la ligne reste facturable une fois la fiche remplie", async () => {
    // ⛔ Le point le plus important de cette garde. `outcome IS NULL` EST le
    // filtre d idempotence : si la ligne basculait en « rented » avant d etre
    // ecartee, elle sortirait DEFINITIVEMENT du lot et la location ne serait
    // jamais facturee, meme apres correction de la fiche loueur.
    process.env.CAR_COMMISSION_ENABLED = "on";
    wiring({ partner: { commission: 0.1, ...IDENTITY, vat_id: null } });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    await GET(authed());

    expect(update).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("va chercher l identite legale dans la meme lecture que le taux", async () => {
    // Une colonne oubliee dans le select rendrait `undefined` cote guarde, et la
    // garde bloquerait TOUT en silence, y compris les loueurs en regle.
    process.env.CAR_COMMISSION_ENABLED = "on";
    const { partnerCols } = wiring();
    const { GET } = await import("./route");
    await GET(authed());

    for (const col of [
      "commission",
      "legal_name",
      "address_line",
      "postal_code",
      "city",
      "country",
      "vat_id",
    ]) {
      expect(partnerCols()).toContain(col);
    }
  });

  it("facture normalement un loueur dont l identite legale est complete", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    wiring();
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({ invoiced: 1, skipped: [] });
  });

  it("la forme juridique absente n empeche pas de facturer", async () => {
    // Elle est le plus souvent dans la raison sociale (« Lux Trans IKE ») et
    // aucune mention obligatoire n en depend.
    process.env.CAR_COMMISSION_ENABLED = "on";
    wiring({ partner: { commission: 0.1, ...IDENTITY, legal_form: null, vat_verified_at: null } });
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({ invoiced: 1, skipped: [] });
  });

  it("porte le code d echec reel quand la facturation elle-meme echoue", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    requestCommission.mockResolvedValueOnce({ status: "failed", code: "partner_without_email" });
    wiring();
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({
      invoiced: 0,
      skipped: [{ id: 42, reason: "commission_failed:partner_without_email" }],
    });
  });

  it("porte le statut quand requestCommission ne facture pas sans echouer", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    // « skipped », « already_requested », « disabled » : pas des echecs, mais pas
    // des factures non plus. Un identifiant nu ne les distinguait de rien.
    requestCommission.mockResolvedValueOnce({ status: "already_requested" });
    wiring();
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({
      invoiced: 0,
      skipped: [{ id: 42, reason: "commission_failed:already_requested" }],
    });
  });

  // ── Idempotence ────────────────────────────────────────────────────────────

  it("l idempotence tient au filtre outcome IS NULL, pas a une relecture des factures", async () => {
    // ⛔ Ce cron tranche l issue en « rented » AVANT de facturer, et aucun chemin
    // du depot ne remet `outcome` a NULL : une ligne facturee, ou seulement
    // tentee, sort definitivement du lot. Une ligne remontee ici n a donc JAMAIS
    // de facture, et la table des factures n a aucune raison d etre relue.
    //
    // Ce test remplace deux cas qui interrogeaient `car_commission_invoices` :
    // l un decrivait un rattrapage inexistant (une facture reutilisee n a plus
    // son jeton en clair, requestCommission rend `invoice_without_token` et
    // n envoie rien, il ne passait que parce que requestCommission est mocke),
    // l autre couvrait un etat inatteignable. Le vrai rattrapage d un envoi rate
    // est le bouton « Renvoyer » du back-office.
    process.env.CAR_COMMISSION_ENABLED = "on";
    const { filters } = wiring();
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({ invoiced: 1 });
    expect(filters).toContain("is:outcome:null");
    expect(from).not.toHaveBeenCalledWith("car_commission_invoices");
  });

  // ── Robustesse ─────────────────────────────────────────────────────────────

  it("un echec ne bloque pas les locations suivantes", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    requestCommission.mockResolvedValueOnce({ status: "failed", code: "invoice_mail_refused" });
    wiring({ rows: [ELIGIBLE, { ...ELIGIBLE, id: 43 }] });
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({
      invoiced: 1,
      skipped: [{ id: 42, reason: "commission_failed:invoice_mail_refused" }],
    });
    expect(requestCommission).toHaveBeenNthCalledWith(1, 42);
    expect(requestCommission).toHaveBeenNthCalledWith(2, 43);
  });

  it("bascule outcome=rented refusee par la base : la ligne est journalisee et sautee, la boucle continue", async () => {
    // Auto-guerissant au passage suivant (outcome reste NULL, la ligne ressort
    // du meme filtre demain), mais appeler quand meme requestCommission
    // produirait un motif opaque `commission_failed:skipped` qui fait chercher
    // au mauvais endroit : on croirait a une regle metier, pas a un refus base.
    process.env.CAR_COMMISSION_ENABLED = "on";
    const { updates } = wiring({ rows: [ELIGIBLE, { ...ELIGIBLE, id: 43 }] });
    // La PREMIERE ligne echoue sur l update outcome, la seconde doit quand meme
    // etre traitee normalement : mockImplementationOnce prend le pas sur le
    // mockImplementation par defaut pose par wiring(), pour ce seul appel.
    update.mockImplementationOnce((patch: Record<string, unknown>) => {
      updates.push(patch);
      return { eq: () => ({ select: async () => ({ data: null, error: { message: "permission denied" } }) }) };
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({
      invoiced: 1,
      skipped: [{ id: 42, reason: "outcome_update_failed" }],
    });
    // requestCommission n a jamais lu outcome === "rented" pour la ligne 42 :
    // l appeler aurait ete pour rien, shouldRequestCommission rend "skipped".
    expect(requestCommission).toHaveBeenCalledTimes(1);
    expect(requestCommission).toHaveBeenCalledWith(43);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("permission denied");
    errSpy.mockRestore();
  });

  it("ne facture rien quand la requete ne remonte aucune ligne", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    wiring({ rows: [] });
    const { GET } = await import("./route");
    const res = await GET(authed());

    expect(await res.json()).toMatchObject({ invoiced: 0, skipped: [] });
    expect(update).not.toHaveBeenCalled();
  });

  // ── Ce que le passage dit a Kami ───────────────────────────────────────────
  //
  // Sans ces cas, une commission ecartee ne vit que dans la reponse HTTP d un
  // cron que personne n ouvre, et dans un console.error noye dans les journaux
  // Vercel. Elle repasserait chaque nuit, invisible, jusqu a ce que la location
  // soit oubliee : exactement l oubli que ce systeme existe pour empecher.
  describe("notification d exploitation", () => {
    it("previent quand une ligne est ecartee, en nommant le loueur et ce qui manque", async () => {
      process.env.CAR_COMMISSION_ENABLED = "on";
      wiring({ partner: { commission: 0.1, name: "Zorbas Rent a Car" } });
      const { GET } = await import("./route");
      await GET(authed());

      expect(notifyOps).toHaveBeenCalledTimes(1);
      const notice = notifyOps.mock.calls[0][0];
      const texte = [notice.title, ...notice.lines, notice.action ?? ""].join("\n");
      // Le loueur par son nom : un identifiant nu n appelle aucune action.
      expect(texte).toContain("Zorbas Rent a Car");
      expect(texte).toContain("42");
      // Les champs a remplir, pas seulement « incomplet ».
      expect(texte).toContain("vat_id");
      expect(notice.action).toBeTruthy();
      expect(notice.url).toContain("/admin/car-rental");
    });

    it("previent aussi quand des factures sont parties : c est de l argent qui bouge", async () => {
      process.env.CAR_COMMISSION_ENABLED = "on";
      wiring();
      const { GET } = await import("./route");
      await GET(authed());

      expect(notifyOps).toHaveBeenCalledTimes(1);
      expect(notifyOps.mock.calls[0][0].title).toContain("1");
    });

    // Un cron qui parle pour ne rien dire devient un cron qu on n ouvre plus.
    it("se tait quand il n y a ni facture emise ni ligne ecartee", async () => {
      process.env.CAR_COMMISSION_ENABLED = "on";
      wiring({ rows: [] });
      const { GET } = await import("./route");
      await GET(authed());

      expect(notifyOps).not.toHaveBeenCalled();
    });

    // Telegram est un canal de confort : son echec ne doit jamais faire perdre
    // le resultat d une facturation deja ecrite en base.
    it("une notification en panne ne fait pas tomber le passage", async () => {
      process.env.CAR_COMMISSION_ENABLED = "on";
      notifyOps.mockRejectedValueOnce(new Error("telegram down"));
      wiring();
      const { GET } = await import("./route");
      const res = await GET(authed());

      expect(await res.json()).toMatchObject({ invoiced: 1 });
    });

    it("ne previent jamais quand l interrupteur est eteint", async () => {
      wiring();
      const { GET } = await import("./route");
      await GET(authed());

      expect(notifyOps).not.toHaveBeenCalled();
    });
  });
});
