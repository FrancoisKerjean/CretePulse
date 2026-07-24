import { describe, it, expect } from "vitest";
import { buildCheckoutParams } from "./stripe-helpers";

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
});
