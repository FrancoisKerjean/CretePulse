import { describe, it, expect } from "vitest";
import { classifyStripeFailure, stripeLogFields } from "./stripe-errors";

/** Forme reelle d'une erreur `stripe` v22 : les champs utiles sont a plat. */
function stripeError(fields: Record<string, unknown>): Error {
  return Object.assign(new Error(String(fields.message ?? "boom")), {
    type: "invalid_request_error",
    ...fields,
  });
}

const CONNECT_RAW =
  "You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect.";

describe("classifyStripeFailure", () => {
  it("reconnait la plateforme Connect non activee", () => {
    const failure = classifyStripeFailure(stripeError({ message: CONNECT_RAW }));
    expect(failure.code).toBe("payouts_unavailable");
    expect(failure.status).toBe(503);
  });

  it("range toute autre erreur Stripe en panne du prestataire", () => {
    const failure = classifyStripeFailure(
      stripeError({ message: "Invalid API Key provided", type: "authentication_error" }),
    );
    expect(failure.code).toBe("payment_provider");
    expect(failure.status).toBe(502);
  });

  it("range une panne reseau sans forme Stripe en panne du prestataire", () => {
    const failure = classifyStripeFailure(new Error("fetch failed"));
    expect(failure.code).toBe("payment_provider");
    expect(failure.status).toBe(502);
  });

  it("ne renvoie jamais le texte de Stripe au navigateur", () => {
    for (const err of [
      stripeError({ message: CONNECT_RAW }),
      stripeError({ message: "No such destination: acct_1TDPicEQ3UQbwGzY" }),
      new Error("fetch failed"),
    ]) {
      const { message } = classifyStripeFailure(err);
      expect(message).not.toMatch(/stripe/i);
      expect(message).not.toMatch(/acct_/);
      expect(message).not.toContain("You can only create");
      expect(message.length).toBeGreaterThan(20);
    }
  });
});

describe("stripeLogFields", () => {
  it("garde de quoi retrouver la requete dans le journal Stripe", () => {
    const fields = stripeLogFields(
      stripeError({
        message: CONNECT_RAW,
        code: "connect_not_enabled",
        statusCode: 400,
        requestId: "req_LTgM8Q2P3wMWA8",
      }),
    );
    expect(fields).toMatchObject({
      stripeType: "invalid_request_error",
      stripeCode: "connect_not_enabled",
      stripeStatus: 400,
      stripeRequestId: "req_LTgM8Q2P3wMWA8",
      stripeMessage: CONNECT_RAW,
    });
  });

  it("degrade proprement sur une erreur qui ne vient pas de Stripe", () => {
    expect(stripeLogFields(new Error("fetch failed"))).toMatchObject({
      stripeMessage: "fetch failed",
    });
    expect(stripeLogFields("boom")).toMatchObject({ stripeMessage: "boom" });
  });
});
