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

function wiring(invoice: Record<string, unknown> | null = INVOICE) {
  invoiceByToken.mockResolvedValue(invoice);
  from.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data:
            table === "car_partners"
              ? { name: "Luxtrans Crete", email: "info@luxtrans.gr" }
              : { date_from: "2026-08-10", date_to: "2026-08-14", pickup_slug: "heraklion-airport" },
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

  it("aucune coordonnee bancaire n est ecrite en dur dans la page", async () => {
    // Garde de depot : la seule source des coordonnees est l environnement.
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/[A-Z]{2}\d{2}[A-Z0-9]{10,}/);
  });
});
