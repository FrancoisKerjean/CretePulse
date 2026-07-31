// Coordonnees bancaires de la page facture. L email promet au loueur un
// virement « to the IBAN shown on it » : si la page n en montre aucun, l email
// ment. Et aucune coordonnee ne vit dans le depot, donc les deux cas — variables
// posees, variables absentes — sont des comportements a part entiere.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { invoiceByToken, from } = vi.hoisted(() => ({
  invoiceByToken: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/car-invoice-server", () => ({ invoiceByToken }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const INVOICE = {
  id: 7,
  number: "F-2026-0004",
  request_id: 42,
  partner_id: 111,
  base_amount_eur: 310,
  rate: 0.1,
  amount_eur: 31,
  issued_at: "2026-08-10T05:00:00.000Z",
  sent_at: "2026-08-10T05:00:01.000Z",
  paid_at: null,
  credited_at: null,
  credit_number: null,
  credit_reason: null,
};

const REQUEST = {
  date_from: "2026-08-10",
  date_to: "2026-08-14",
  pickup_slug: "heraklion-airport",
  outcome: "rented",
};

/**
 * Loueur grec dont l identite legale est COMPLETE : c est la seule situation
 * dans laquelle une facture peut exister, la garde du cron s en assure en amont.
 * Valeurs reprises de la facture validee par le comptable (NOVAI-2026-003).
 */
const PARTNER = {
  name: "cretecar.rent",
  email: "info@cretecar.rent",
  legal_name: "Lux Trans IKE",
  legal_form: "Private company (IKE), Greece",
  address_line: "1922 Street, No 10",
  postal_code: "71601",
  city: "Heraklion",
  country: "Greece",
  vat_id: "EL801122501",
  vat_verified_at: "2026-07-30",
};

function wiring(
  invoice: Record<string, unknown> | null = INVOICE,
  request: Record<string, unknown> = REQUEST,
  partner: Record<string, unknown> | null = PARTNER,
) {
  invoiceByToken.mockResolvedValue(invoice);
  from.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: table === "car_partners" ? partner : request,
        }),
      }),
    }),
  }));
}

async function render(token = "tok"): Promise<string> {
  const { default: InvoicePage } = await import("./page");
  const el = await InvoicePage({ params: Promise.resolve({ locale: "en", token }) });
  return renderToStaticMarkup(el);
}

const IBAN = "FR7630006000011234567890189";
const BIC = "AGRIFRPP";

describe("page facture · coordonnees bancaires", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NOVAI_IBAN;
    delete process.env.NOVAI_BIC;
  });

  afterEach(() => {
    delete process.env.NOVAI_IBAN;
    delete process.env.NOVAI_BIC;
  });

  it("affiche l IBAN et le BIC quand les variables sont posees", async () => {
    process.env.NOVAI_IBAN = IBAN;
    process.env.NOVAI_BIC = BIC;
    wiring();

    const html = await render();
    expect(html).toContain(IBAN);
    expect(html).toContain(BIC);
    // La promesse de l email est tenue : plus de renvoi vers un echange manuel.
    expect(html).not.toContain("we send you the bank details");
    // La reference du virement reste le numero de facture.
    expect(html).toContain("F-2026-0004");
  });

  it("garde le texte de repli quand les variables sont absentes", async () => {
    wiring();

    const html = await render();
    expect(html).toContain("we send you the bank details");
    expect(html).not.toContain(IBAN);
  });

  it("garde le texte de repli quand une seule des deux variables est posee", async () => {
    // Un IBAN sans BIC n est pas un virement executable : moitie de coordonnees
    // affichee comme si c etait complet ferait rater le paiement.
    process.env.NOVAI_IBAN = IBAN;
    wiring();

    const html = await render();
    expect(html).toContain("we send you the bank details");
    expect(html).not.toContain(IBAN);
  });

  it("ne montre aucune coordonnee bancaire sur une facture deja reglee", async () => {
    // Expliquer le virement a un loueur qui a paye, c est du bruit qui contredit
    // le bandeau juste au-dessus (defaut deja corrige sur le bloc de repli).
    process.env.NOVAI_IBAN = IBAN;
    process.env.NOVAI_BIC = BIC;
    wiring({ ...INVOICE, paid_at: "2026-08-11T09:00:00.000Z" });

    const html = await render();
    expect(html).not.toContain(IBAN);
    expect(html).not.toContain(BIC);
  });

  it("ne montre aucune coordonnee bancaire sur une facture annulee par un avoir", async () => {
    process.env.NOVAI_IBAN = IBAN;
    process.env.NOVAI_BIC = BIC;
    wiring({ ...INVOICE, credited_at: "2026-08-11T09:00:00.000Z", credit_number: "F-2026-0004-A" });

    const html = await render();
    expect(html).not.toContain(IBAN);
    expect(html).not.toContain(BIC);
  });

  it("une location annulee ne montre ni bouton de paiement ni IBAN", async () => {
    // Le back-office a clique « Perdu ». Le loueur a deja son email avec le
    // lien : la page doit lui dire pourquoi il n y a rien a payer, plutot que
    // de lui presenter un bouton qui encaisserait une location inexistante.
    process.env.NOVAI_IBAN = IBAN;
    process.env.NOVAI_BIC = BIC;
    wiring(INVOICE, { ...REQUEST, outcome: "lost" });

    const html = await render();
    expect(html).toContain("This rental was cancelled. Nothing to pay.");
    expect(html).not.toContain("by card");
    expect(html).not.toContain(IBAN);
    expect(html).not.toContain(BIC);
  });

  it("l avoir prime sur la location annulee : son numero reste affiche", async () => {
    // Emettre l avoir repasse la demande en « perdue ». Le message le plus
    // informe est celui qui porte le numero de la piece comptable.
    wiring(
      { ...INVOICE, credited_at: "2026-08-11T09:00:00.000Z", credit_number: "F-2026-0004-A" },
      { ...REQUEST, outcome: "lost" },
    );

    const html = await render();
    expect(html).toContain("F-2026-0004-A");
    expect(html).not.toContain("This rental was cancelled");
  });

  it("un paiement deja encaisse prime sur la location annulee", async () => {
    // Sinon la page dirait « rien a payer » a un loueur qui a paye, et le
    // suivi interne perdrait la seule trace visible de son virement.
    wiring({ ...INVOICE, paid_at: "2026-08-11T09:00:00.000Z" }, { ...REQUEST, outcome: "lost" });

    const html = await render();
    expect(html).toContain("Paid on 2026-08-11");
    expect(html).not.toContain("This rental was cancelled");
  });

  it("n arrondit pas un taux fractionnaire sur la piece comptable", async () => {
    // 7,5 % s imprimait « 8% » (toFixed(0)) : base x 8 % ne redonne pas le total
    // affiche juste en dessous, et sur une facture deux nombres qui ne se
    // recoupent pas, c est une contestation.
    wiring({ ...INVOICE, base_amount_eur: 200, rate: 0.075, amount_eur: 15 });

    const html = await render();
    expect(html).toContain("7.5%");
    expect(html).not.toContain("8%");
    // Montants au format du gabarit comptable (« €68.00 »), le meme que la ligne
    // de TVA « €0.00 — reverse charge » : deux formats sur une meme piece se
    // lisent comme deux devises.
    expect(html).toContain("€15.00");
  });

  it("un taux entier reste ecrit sans decimale", async () => {
    // Le bruit du flottant (0.1 * 100 = 10.000000000000002) ne doit pas non plus
    // apparaitre sur la facture.
    wiring();

    // Ancre sur le libelle du taux : « 10.0 » nu se retrouverait dans le montant
    // « 310.00 EUR » de la ligne d a cote.
    const html = await render();
    expect(html).toContain("accepted · 10%");
    expect(html).not.toContain("accepted · 10.0");
  });

  it("aucune coordonnee bancaire n est ecrite en dur dans la page", async () => {
    // Garde de depot : la seule source des coordonnees est l environnement.
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/[A-Z]{2}\d{2}[A-Z0-9]{10,}/);
  });
});

// ── Mentions legales et bloc client ──────────────────────────────────────────
// NovAI est francaise, le loueur est grec : la commission est une prestation de
// services intra-UE, autoliquidee par le preneur. La page tient lieu de facture
// (aucun PDF n est genere), elle porte donc TOUTES les mentions de la piece
// validee par le comptable, `docs/facture-novai-luxtrans-2026-003.html`.
// ⛔ Aucune de ces phrases n a ete redigee ici : elles sont recopiees.

describe("page facture · mentions intra-UE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NOVAI_IBAN;
    delete process.env.NOVAI_BIC;
  });

  it("imprime l identite legale complete du client", async () => {
    wiring();
    const html = await render();

    expect(html).toContain("Lux Trans IKE");
    expect(html).toContain("Private company (IKE), Greece");
    expect(html).toContain("1922 Street, No 10");
    expect(html).toContain("71601 Heraklion, Greece");
    expect(html).toContain("EL801122501");
  });

  it("distingue le nom commercial de la raison sociale", async () => {
    // Le loueur signe ses emails « cretecar.rent », mais la facture est adressee
    // a la personne morale. Les deux doivent apparaitre, sans se confondre.
    wiring();
    const html = await render();
    expect(html).toContain("Trading as cretecar.rent");
  });

  it("ne repete pas le nom commercial quand il est identique a la raison sociale", async () => {
    wiring(INVOICE, REQUEST, { ...PARTNER, name: "Lux Trans IKE" });
    const html = await render();
    expect(html).not.toContain("Trading as");
  });

  it("imprime la forme juridique seulement quand elle est connue", async () => {
    wiring(INVOICE, REQUEST, { ...PARTNER, legal_form: null });
    const html = await render();
    expect(html).toContain("Lux Trans IKE");
    expect(html).not.toContain("Private company");
  });

  it("porte la ligne de TVA a zero et l autoliquidation", async () => {
    wiring();
    const html = await render();
    expect(html).toContain("€0.00 — reverse charge");
  });

  it("porte l article 44 et l article 196 de la directive 2006/112/CE", async () => {
    wiring();
    const html = await render();
    expect(html).toContain(
      "The supply of services is located in the customer&#x27;s member state under Article 44 of Council Directive 2006/112/EC; VAT is to be accounted for by the recipient under Article 196 of the same Directive.",
    );
  });

  it("porte l autoliquidation en francais, article 283-2 du CGI", async () => {
    wiring();
    const html = await render();
    expect(html).toContain(
      "Autoliquidation par le preneur — article 283-2 du CGI et article 196 de la directive 2006/112/CE.",
    );
  });

  it("porte le 293 B DANS SA FORME COMPLETE, jamais la mention domestique nue", async () => {
    // ⛔ « VAT not applicable, article 293 B » tout court est la mention reservee
    // aux operations FRANCAISES. Sur une prestation intra-UE elle est fausse :
    // c est le defaut que ce chantier corrige.
    wiring();
    const html = await render();

    expect(html).toContain(
      "NovAI applies the French small business VAT exemption (article 293 B of the French Tax Code) to its domestic transactions; the present supply is an intra-Community supply of services and falls outside the scope of French VAT.",
    );
    expect(html).not.toContain("VAT not applicable, article 293 B");
  });

  it("n affirme une verification VIES que si elle a eu lieu", async () => {
    // ⛔ Ecrire « verifie contre VIES » sur une facture generee alors qu aucune
    // verification n a eu lieu serait une affirmation fausse. La phrase du
    // gabarit ne s imprime qu avec la date de la verification reelle.
    wiring();
    const withCheck = await render();
    expect(withCheck).toContain(
      "Both VAT numbers shown above were verified against the European Commission VIES database on 2026-07-30 and returned as valid.",
    );

    vi.clearAllMocks();
    wiring(INVOICE, REQUEST, { ...PARTNER, vat_verified_at: null });
    const without = await render();
    expect(without).not.toContain("VIES");
    // Le reste de la mention, lui, ne depend d aucune verification.
    expect(without).toContain("falls outside the scope of French VAT");
  });

  it("porte la mention de retard de paiement du gabarit", async () => {
    wiring();
    const html = await render();
    expect(html).toContain(
      "In accordance with articles L441-10 and D441-5 of the French Commercial Code, late payment gives rise to penalties calculated at three times the French legal interest rate, plus a fixed recovery indemnity of €40, with no reminder required. No discount is granted for early payment.",
    );
  });

  it("porte la mention de commission, au taux reellement facture", async () => {
    wiring();
    const html = await render();
    expect(html).toContain(
      "10% of the rental value, payable per completed introduction, as set out in the crete.direct partner terms accepted by the customer. crete.direct is a trading name operated by SAS NovAI.",
    );
  });

  it("porte le pied de page societe", async () => {
    wiring();
    const html = await render();
    expect(html).toContain(
      "NovAI SAS — Simplified joint-stock company — RCS Brest 994 765 857 — Share capital €50 — Registered office: 15 Rue Berthollet, 29200 Brest, France",
    );
  });

  it("porte le numero de TVA du fournisseur", async () => {
    wiring();
    const html = await render();
    expect(html).toContain("FR45994765857");
  });
});

describe("page facture · identite client perdue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NOVAI_IBAN = IBAN;
    process.env.NOVAI_BIC = BIC;
  });

  afterEach(() => {
    delete process.env.NOVAI_IBAN;
    delete process.env.NOVAI_BIC;
  });

  it.each([
    ["le loueur a ete efface", null],
    ["son numero de TVA a disparu", { vat_id: null }],
    ["son adresse a disparu", { city: null }],
  ])(
    "n affiche AUCUNE facture quand %s, et le dit franchement",
    async (_label, patch) => {
      // Etat inatteignable par construction : la garde du cron refuse de
      // facturer un loueur incomplet. Mais une fiche peut etre videe APRES
      // l emission, et une facture privee de l identite de son client n est pas
      // une facture. Servir le document ampute mettrait une piece fausse chez
      // une vraie entreprise ; un 404 nu ferait croire a un lien casse. La page
      // dit donc ce qui se passe, et ne reclame rien.
      wiring(INVOICE, REQUEST, patch === null ? null : { ...PARTNER, ...patch });
      const html = await render();

      expect(html).toContain("F-2026-0004");
      expect(html).toContain("cannot be issued");
      // Ni mention fiscale (elles seraient invalides), ni demande d argent.
      expect(html).not.toContain("reverse charge");
      expect(html).not.toContain("293 B");
      expect(html).not.toContain("by card");
      expect(html).not.toContain(IBAN);
      expect(html).not.toContain("Total due");
    },
  );
});
