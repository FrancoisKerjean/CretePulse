import { describe, it, expect } from "vitest";
import {
  bookingTotalEur,
  bookingBreakdownCents,
  buildBookingCheckoutParams,
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
  });

  it("encaisse sur le compte plateforme, sans rien transferer tout de suite", () => {
    // Charges separees : les fonds restent chez nous jusqu'au versement differe.
    // Un transfer_data ici rouvrirait la reprise de fonds a l annulation.
    expect(params.payment_intent_data?.transfer_data).toBeUndefined();
    expect(params.payment_intent_data?.application_fee_amount).toBeUndefined();
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
    });
    expect(p.line_items).toHaveLength(1);
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
