import { describe, it, expect } from "vitest";
import { buildCheckoutParams, buildConnectAccountParams } from "./stripe-helpers";

describe("buildConnectAccountParams", () => {
  it("cree un compte grec individuel par defaut", () => {
    const p = buildConnectAccountParams("o@example.com", {});
    expect(p.country).toBe("GR");
    expect(p.business_type).toBe("individual");
    expect(p.email).toBe("o@example.com");
  });

  // Vangelis (Villa Danae) est base en Belgique, un proprietaire en IKE est une
  // societe : les deux etaient bloques par un pays et un type figes.
  it("respecte le pays et le type declares par le proprietaire", () => {
    const p = buildConnectAccountParams("o@example.com", {
      country: "be",
      businessType: "company",
    });
    expect(p.country).toBe("BE");
    expect(p.business_type).toBe("company");
  });

  it("retombe sur GR quand le code pays est invalide", () => {
    expect(buildConnectAccountParams("o@example.com", { country: "zzz" }).country).toBe("GR");
    expect(buildConnectAccountParams("o@example.com", { country: "" }).country).toBe("GR");
  });
});

describe("buildCheckoutParams", () => {
  it("builds a destination charge with application_fee on the deposit", () => {
    const params = buildCheckoutParams({
      listingTitle: "Sea view villa",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-08",
      depositEur: 220.5,
      applicationFeeCents: 1050,
      connectAccountId: "acct_123",
      guestEmail: "jane@example.com",
      requestId: 42,
      payToken: "tok-abc",
      locale: "fr",
    });
    expect(params.mode).toBe("payment");
    expect(params.line_items![0].price_data!.unit_amount).toBe(22050);
    expect(params.payment_intent_data?.application_fee_amount).toBe(1050);
    expect(params.payment_intent_data?.transfer_data?.destination).toBe("acct_123");
    expect(params.metadata?.request_id).toBe("42");
    expect(params.customer_email).toBe("jane@example.com");
    expect(params.success_url).toContain("/fr/stays/");
  });

  // Le compte Stripe est partage (NovAI acct_1TDPicEQ3UQbwGzY, descripteur par
  // defaut "NOVAI"). Sans suffixe, le voyageur lit NOVAI sur son releve bancaire,
  // ce qui casse le cloisonnement crete.direct.
  it("marque le paiement crete.direct sur le releve bancaire", () => {
    const params = buildCheckoutParams({
      listingTitle: "Villa Danae",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-08",
      depositEur: 220.5,
      applicationFeeCents: 2100,
      connectAccountId: "acct_test",
      guestEmail: "g@example.com",
      requestId: 42,
      payToken: "tok",
      locale: "fr",
    });
    expect(params.payment_intent_data?.statement_descriptor_suffix).toBe("CRETE DIRECT");
    expect(params.metadata?.brand).toBe("crete.direct");
    expect(params.metadata?.payment_type).toBe("deposit");
  });
});
