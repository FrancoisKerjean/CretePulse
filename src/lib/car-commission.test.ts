import { describe, it, expect } from "vitest";
import {
  shouldRequestCommission,
  buildCommissionCheckoutParams,
  commissionRequestSubject,
  commissionRequestBody,
  type CommissionCandidate,
} from "./car-commission";

const rented: CommissionCandidate = {
  id: 42,
  outcome: "rented",
  commission_eur: 31.5,
  commission_paid_at: null,
  commission_session_id: null,
  quoted_by_partner_id: 111,
};

describe("shouldRequestCommission", () => {
  it("demande la commission sur une location fraichement marquee louee", () => {
    expect(shouldRequestCommission(rented)).toBe(true);
  });

  it("ne demande rien tant que la location n est pas louee", () => {
    expect(shouldRequestCommission({ ...rented, outcome: "lost" })).toBe(false);
    expect(shouldRequestCommission({ ...rented, outcome: null })).toBe(false);
  });

  it("ne redemande pas une commission deja reglee", () => {
    expect(
      shouldRequestCommission({ ...rented, commission_paid_at: "2026-07-29T08:00:00Z" }),
    ).toBe(false);
  });

  it("ne cree pas une seconde session si une demande est deja partie", () => {
    expect(shouldRequestCommission({ ...rented, commission_session_id: "cs_1" })).toBe(false);
  });

  it("ne facture pas une commission nulle, negative ou inconnue", () => {
    for (const c of [0, -5, null]) {
      expect(shouldRequestCommission({ ...rented, commission_eur: c })).toBe(false);
    }
  });

  it("ne facture personne quand aucun loueur n a remporte la demande", () => {
    expect(shouldRequestCommission({ ...rented, quoted_by_partner_id: null })).toBe(false);
  });

  it("ne facture pas sous le minimum encaissable de Stripe (0,50 EUR)", () => {
    expect(shouldRequestCommission({ ...rented, commission_eur: 0.49 })).toBe(false);
    expect(shouldRequestCommission({ ...rented, commission_eur: 0.5 })).toBe(true);
  });
});

describe("buildCommissionCheckoutParams", () => {
  const params = buildCommissionCheckoutParams({
    requestId: 42,
    partnerName: "Zorbas Rent a Car",
    partnerEmail: "info@zorbas.gr",
    commissionEur: 31.5,
    finalAmountEur: 210,
    dateFrom: "2026-08-01",
    dateTo: "2026-08-08",
  });

  it("facture le montant exact de la commission, au centime", () => {
    expect(params.line_items?.[0]?.price_data?.unit_amount).toBe(3150);
    expect(params.line_items?.[0]?.price_data?.currency).toBe("eur");
  });

  it("encaisse sur le compte plateforme, sans rien devoir a Connect", () => {
    // Pas de transfer_data, pas d'application_fee : c'est une vente directe de
    // crete.direct au loueur, elle doit marcher Connect ferme.
    expect(params.payment_intent_data?.transfer_data).toBeUndefined();
    expect(params.payment_intent_data?.application_fee_amount).toBeUndefined();
  });

  it("porte les discriminants que le webhook lit", () => {
    expect(params.metadata).toMatchObject({
      car_request_id: "42",
      payment_type: "car_commission",
      brand: "crete.direct",
    });
  });

  it("adresse la session au loueur et nomme la location facturee", () => {
    expect(params.customer_email).toBe("info@zorbas.gr");
    const name = params.line_items?.[0]?.price_data?.product_data?.name ?? "";
    expect(name).toContain("crete.direct");
    const desc = params.line_items?.[0]?.price_data?.product_data?.description ?? "";
    expect(desc).toContain("2026-08-01");
    expect(desc).toContain("210");
  });

  it("laisse un descripteur de releve qui nomme crete.direct", () => {
    // Le compte plateforme est partage (NovAI) : sans suffixe le loueur lit
    // « NOVAI » sur son releve et ne rapproche rien.
    expect(params.payment_intent_data?.statement_descriptor_suffix).toBe("CRETE DIRECT");
  });
});

describe("commissionRequestSubject / Body", () => {
  const mail = {
    requestId: 42,
    partnerName: "Zorbas Rent a Car",
    commissionEur: 31.5,
    finalAmountEur: 210,
    dateFrom: "2026-08-01",
    dateTo: "2026-08-08",
    payUrl: "https://checkout.stripe.com/c/pay/cs_live_abc",
  };

  it("annonce le montant du dans le sujet", () => {
    const subject = commissionRequestSubject(mail);
    expect(subject).toContain("31.50");
    expect(subject).toMatch(/commission/i);
  });

  it("donne au loueur de quoi rapprocher la ligne et payer", () => {
    const body = commissionRequestBody(mail);
    expect(body).toContain("https://checkout.stripe.com/c/pay/cs_live_abc");
    expect(body).toContain("2026-08-01");
    expect(body).toContain("210.00");
    expect(body).toContain("31.50");
    expect(body).toContain("42");
  });

  it("ecrit au loueur en anglais, la langue de travail des agences", () => {
    // Les loueurs cretois recoivent deja leurs leads en anglais
    // (sendCarLeadEmail) : ne pas melanger les langues sur un meme canal.
    const body = commissionRequestBody(mail);
    expect(body).toMatch(/commission/i);
    expect(body).not.toMatch(/veuillez|règlement|montant/i);
  });
});

describe("commissionRequestBody apres retouche", () => {
  const mail = {
    requestId: 39,
    partnerName: "Luxtrans Crete",
    commissionEur: 20,
    finalAmountEur: 200,
    dateFrom: "2026-08-07",
    dateTo: "2026-08-14",
    payUrl: "https://crete.direct/en/invoice/abc",
    invoiceNumber: "NOVAI-CD-2026-004",
  };

  it("annonce le prix du devis accepte, jamais un montant encaisse", () => {
    // Au premier jour de location on ignore ce que le loueur a encaisse :
    // ecrire « the amount you collected » serait faux.
    const body = commissionRequestBody(mail);
    expect(body).toContain("quoted and accepted");
    expect(body).not.toContain("you collected");
  });

  it("porte le numero de facture", () => {
    expect(commissionRequestBody(mail)).toContain("NOVAI-CD-2026-004");
  });

  it("omet la ligne facture quand le numero n est pas encore connu", () => {
    const { invoiceNumber: _omit, ...sansNumero } = mail;
    expect(commissionRequestBody(sansNumero)).not.toContain("Invoice:");
  });

  it("pointe vers la page facture et jamais vers Stripe", () => {
    const body = commissionRequestBody(mail);
    expect(body).toContain("/invoice/");
    expect(body).not.toContain("stripe.com");
  });

  it("rappelle que l argent de la location reste chez le loueur", () => {
    expect(commissionRequestBody(mail)).toContain("Your rental money stays with you");
  });

  it("dit au loueur comment faire annuler une location qui n a pas eu lieu", () => {
    expect(commissionRequestBody(mail)).toContain("did not take place");
  });
});
