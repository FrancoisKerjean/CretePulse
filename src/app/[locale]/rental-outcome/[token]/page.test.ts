// La page que le loueur ouvre depuis l'email. Elle n'écrit RIEN : elle montre
// la location, pré-coche le choix du lien et offre UN bouton qui poste.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { requestByOutcomeToken, invoiceForRequest } = vi.hoisted(() => ({
  requestByOutcomeToken: vi.fn(),
  invoiceForRequest: vi.fn(),
}));
vi.mock("@/lib/car-outcome-server", () => ({ requestByOutcomeToken }));
vi.mock("@/lib/car-invoice-server", () => ({ invoiceForRequest }));
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const ROW = {
  id: 33, status: "accepted", outcome: null as string | null, outcome_source: null as string | null,
  outcome_at: null as string | null, outcome_token: "tok-33", date_from: "2026-09-08", date_to: "2026-09-15",
  pickup_slug: "heraklion-airport", quoted_car_model: "Toyota Yaris", quoted_price: 320,
  customer_name: "Marie Dupont", quoted_by_partner_id: 111,
};

async function render(search: Record<string, string> = {}, row: typeof ROW | null = ROW): Promise<string> {
  requestByOutcomeToken.mockResolvedValue(row);
  const { default: Page } = await import("./page");
  const el = await Page({
    params: Promise.resolve({ locale: "en", token: "tok-33" }),
    searchParams: Promise.resolve(search),
  });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  vi.clearAllMocks();
  invoiceForRequest.mockResolvedValue(null);
});

describe("page rental-outcome", () => {
  it("est noindex", async () => {
    const { metadata } = await import("./page");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("404 sur un jeton inconnu", async () => {
    await expect(render({}, null)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("montre la location et UN formulaire qui poste vers l'endpoint", async () => {
    const html = await render();
    expect(html).toContain("Rental 33");
    expect(html).toContain("320.00 EUR");
    expect(html).toContain("Marie D.");
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/api/car-rental/outcome"');
    expect(html).toContain('name="token"');
    expect(html).toContain('value="tok-33"');
    expect((html.match(/type="submit"/g) ?? []).length).toBe(1);
  });

  // Lookaheads : React sérialise `checked` AVANT `value`, l'ordre des
  // attributs dans la balise n'est pas un contrat, la coche l'est.
  const checkedRadio = (value: string) =>
    new RegExp(`<input(?=[^>]*name="choice")(?=[^>]*value="${value}")(?=[^>]*checked="")[^>]*>`);

  it("pré-coche le choix passé dans l'URL", async () => {
    const lost = await render({ choice: "lost" });
    expect(lost).toMatch(checkedRadio("lost"));
    expect(lost).not.toMatch(checkedRadio("rented"));
    const rented = await render({ choice: "rented" });
    expect(rented).toMatch(checkedRadio("rented"));
  });

  it("sans ?choice= : rien n'est coché, les radios sont requises", async () => {
    const html = await render();
    expect(html).not.toContain('checked=""');
    expect(html).toContain('required=""');
  });

  it("population B : nomme la facture qui sera annulée", async () => {
    invoiceForRequest.mockResolvedValue({ id: 7, number: "NOVAI-CD-2026-002", amount_eur: 32, paid_at: null, credited_at: null });
    const html = await render({ choice: "lost" }, { ...ROW, outcome: "rented", outcome_source: "auto" });
    expect(html).toContain("NOVAI-CD-2026-002");
    expect(html).toContain("credit note");
  });

  it("état done après un POST", async () => {
    const html = await render({ result: "applied" }, { ...ROW, outcome: "rented", outcome_source: "partner_link", outcome_at: "2026-09-16T06:00:00.000Z" });
    expect(html).toContain("Thank you");
    expect(html).not.toContain('type="submit"');
  });

  it("état recorded : le lien n'a plus de pouvoir, date de l'issue affichée", async () => {
    const html = await render({}, { ...ROW, outcome: "lost", outcome_source: "admin", outcome_at: "2026-09-10T10:00:00.000Z" });
    expect(html).toContain("recorded on 2026-09-10");
    expect(html).not.toContain('type="submit"');
  });

  it("état recorded contesté : renvoie vers hello@crete.direct", async () => {
    const html = await render({ result: "contested" }, { ...ROW, outcome: "lost", outcome_source: "admin", outcome_at: "2026-09-10T10:00:00.000Z" });
    expect(html).toContain("hello@crete.direct");
  });

  it("état already_paid : remboursement par email", async () => {
    const html = await render({ result: "already_paid" }, { ...ROW, outcome: "rented", outcome_source: "auto" });
    expect(html).toContain("already paid");
    expect(html).toContain("hello@crete.direct");
    expect(html).not.toContain('type="submit"');
  });

  it("état cancelled", async () => {
    const html = await render({}, { ...ROW, status: "cancelled" });
    expect(html).toContain("this request was cancelled");
    expect(html).not.toContain('type="submit"');
  });
});
