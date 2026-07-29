import { describe, it, expect } from "vitest";
import {
  bookingTotalEur,
  bookingBreakdownCents,
  buildBookingCheckoutParams,
  bookingPaidPartnerBody,
  bookingPaidCustomerBody,
} from "./car-booking";
import { CANCELLATION_OPTION_EUR } from "./booking-policy";

describe("bookingTotalEur", () => {
  it("ajoute l option d annulation au prix de l offre", () => {
    expect(bookingTotalEur(310, true)).toBe(310 + CANCELLATION_OPTION_EUR);
    expect(bookingTotalEur(310, false)).toBe(310);
  });

  it("reste au centime sur des prix non ronds", () => {
    expect(bookingTotalEur(89.9, true)).toBe(94.9);
    expect(bookingTotalEur(233.33, false)).toBe(233.33);
  });
});

describe("bookingBreakdownCents", () => {
  it("repartit le total entre loueur, commission et option, sans reste", () => {
    const b = bookingBreakdownCents({ quotedPriceEur: 310, hasOption: true, partnerRate: 0.1 });
    // 310 de location : 31 de commission, 279 pour le loueur, 5 pour l option.
    expect(b.partnerPayoutCents).toBe(27_900);
    expect(b.commissionCents).toBe(3_100);
    expect(b.optionCents).toBe(500);
    expect(b.totalCents).toBe(31_500);
    expect(b.partnerPayoutCents + b.commissionCents + b.optionCents).toBe(b.totalCents);
  });

  it("l application fee regroupe commission et option", () => {
    // Charge de destination : le loueur recoit le total moins les frais
    // d application. crete.direct encaisse donc commission + option en une fois.
    const b = bookingBreakdownCents({ quotedPriceEur: 310, hasOption: true, partnerRate: 0.1 });
    expect(b.applicationFeeCents).toBe(3_600);
    expect(b.totalCents - b.applicationFeeCents).toBe(b.partnerPayoutCents);
  });

  it("ne reverse jamais l option au loueur : elle paie le risque porte par crete.direct", () => {
    const withOption = bookingBreakdownCents({ quotedPriceEur: 310, hasOption: true, partnerRate: 0.1 });
    const without = bookingBreakdownCents({ quotedPriceEur: 310, hasOption: false, partnerRate: 0.1 });
    expect(withOption.partnerPayoutCents).toBe(without.partnerPayoutCents);
    expect(withOption.commissionCents).toBe(without.commissionCents);
    expect(without.optionCents).toBe(0);
  });

  it("tient l invariant sur des tarifs et des taux non ronds", () => {
    for (const [price, rate] of [[89.9, 0.1], [233.33, 0.075], [1250.55, 0.12], [45, 0.2]] as const) {
      for (const hasOption of [true, false]) {
        const b = bookingBreakdownCents({ quotedPriceEur: price, hasOption, partnerRate: rate });
        expect(b.partnerPayoutCents + b.commissionCents + b.optionCents).toBe(b.totalCents);
        expect(b.partnerPayoutCents).toBeGreaterThan(0);
        expect(b.commissionCents).toBeGreaterThan(0);
        // Le loueur touche toujours strictement moins que ce que paie le client.
        expect(b.partnerPayoutCents).toBeLessThan(b.totalCents);
      }
    }
  });
});

describe("buildBookingCheckoutParams", () => {
  const params = buildBookingCheckoutParams({
    requestId: 25,
    customerEmail: "n.ferdinand@example.com",
    quotedPriceEur: 310,
    hasOption: true,
    partnerName: "Zorbas Rent a Car",
    carLabel: "City car · Manual",
    dateFrom: "2026-09-25",
    dateTo: "2026-10-09",
    bookingToken: "tok-plain",
    locale: "fr",
    connectAccountId: "acct_zorbas",
  });

  it("envoie l argent DIRECTEMENT sur le compte du loueur", () => {
    // Charge de destination : les fonds sont ceux du loueur des la seconde du
    // paiement, crete.direct ne les detient jamais. C est ce qui permet de lui
    // dire « c est votre argent » sans mentir, et ce qui evite d encaisser pour
    // le compte d un tiers.
    expect(params.payment_intent_data?.transfer_data?.destination).toBe("acct_zorbas");
    expect(params.payment_intent_data?.application_fee_amount).toBe(3_600);
  });

  it("facture la location et l option sur deux lignes lisibles", () => {
    expect(params.line_items).toHaveLength(2);
    expect(params.line_items?.[0]?.price_data?.unit_amount).toBe(31_000);
    expect(params.line_items?.[1]?.price_data?.unit_amount).toBe(500);
    const optionName = params.line_items?.[1]?.price_data?.product_data?.name ?? "";
    // Vocabulaire verrouille : « assurance » engagerait une activite reglementee.
    expect(optionName).not.toMatch(/assurance|insurance/i);
    expect(optionName).toMatch(/annulation|cancellation/i);
  });

  it("n ajoute pas de ligne option quand le client n en veut pas", () => {
    const p = buildBookingCheckoutParams({
      requestId: 25, customerEmail: "x@y.z", quotedPriceEur: 310, hasOption: false,
      partnerName: "Zorbas", carLabel: "City car", dateFrom: "2026-09-25",
      dateTo: "2026-10-09", bookingToken: "tok", locale: "fr",
      connectAccountId: "acct_zorbas",
    });
    expect(p.line_items).toHaveLength(1);
    // Sans option, l application fee tombe a la seule commission.
    expect(p.payment_intent_data?.application_fee_amount).toBe(3_100);
  });

  it("porte les discriminants que le webhook lit", () => {
    expect(params.metadata).toMatchObject({
      car_request_id: "25",
      payment_type: "car_booking",
      brand: "crete.direct",
      cancellation_option: "true",
    });
  });

  it("nomme crete.direct sur le releve du client", () => {
    expect(params.payment_intent_data?.statement_descriptor_suffix).toBe("CRETE DIRECT");
  });
});

describe("emails de reservation payee", () => {
  const info = {
    requestId: 25,
    partnerName: "Zorbas Rent a Car",
    partnerPhone: "+30 690 000 0000",
    customerName: "Natasha Ferdinand",
    customerEmail: "n@example.com",
    customerPhone: "+33 6 00 00 00 00",
    carLabel: "City car · Manual",
    pickupLabel: "Chania Airport",
    dateFrom: "2026-09-25",
    dateTo: "2026-10-09",
    amountPaidEur: 315,
    hasOption: true,
    cancelUrl: "https://crete.direct/fr/car-booking/tok/cancel",
  };

  it("donne au loueur les coordonnees du client et dit que c est deja paye", () => {
    const body = bookingPaidPartnerBody(info);
    expect(body).toContain("Natasha Ferdinand");
    expect(body).toContain("n@example.com");
    expect(body).toContain("+33 6 00 00 00 00");
    expect(body).toContain("Chania Airport");
    // Le loueur ne doit surtout pas redemander le paiement au client.
    expect(body).toMatch(/already paid|paid online/i);
    // Il doit savoir quand il touche son argent.
    expect(body).toMatch(/48 hours/i);
  });

  it("ne divulgue pas la commission au client", () => {
    const body = bookingPaidCustomerBody(info);
    expect(body).not.toMatch(/commission/i);
    expect(body).toContain("Zorbas Rent a Car");
    expect(body).toContain("315.00");
  });

  it("donne au client son lien d annulation seulement s il a l option", () => {
    expect(bookingPaidCustomerBody(info)).toContain(info.cancelUrl);
    const without = bookingPaidCustomerBody({ ...info, hasOption: false });
    expect(without).not.toContain(info.cancelUrl);
    // Et il doit savoir qu il n a pas de remboursement possible.
    expect(without).toMatch(/no refund|not refundable/i);
  });
});
