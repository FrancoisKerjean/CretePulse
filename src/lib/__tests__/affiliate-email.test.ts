/**
 * Tests for affiliateWelcomeBody — the pure HTML-building function.
 * We mock the heavy dependencies (resend, car-admin, car-inclusions, car-offer-copy)
 * so vitest can import email.ts without needing real env vars.
 */
import { describe, it, expect, vi } from "vitest";

// Mock resend before any import of email.ts
vi.mock("resend", () => {
  class Resend {
    emails = { send: vi.fn() };
  }
  return { Resend };
});

// Mock the @/lib/* imports that email.ts pulls in at module level
vi.mock("@/lib/car-admin", () => ({ buildCarWaMessage: vi.fn(), waHref: vi.fn() }));
vi.mock("@/lib/car-inclusions", () => ({ inclusionLabels: vi.fn() }));
vi.mock("@/lib/car-offer-copy", () => ({ sharedOfferCopy: vi.fn() }));

const { affiliateWelcomeBody } = await import("@/lib/email");

const baseOpts = {
  name: "Sunset Tours",
  link: "https://crete.direct/go/sunset-tours",
  code: "SUNSETTOURS-AB12",
  commissionPct: 15,
};

describe("affiliateWelcomeBody — quotable (tour/activity/transfer)", () => {
  it("contains '15%' for a quotable affiliate", () => {
    const html = affiliateWelcomeBody("quotable", baseOpts);
    expect(html).toContain("15%");
  });

  it("contains 'commission' or '15%' for quotable", () => {
    const html = affiliateWelcomeBody("quotable", baseOpts);
    expect(html.toLowerCase()).toMatch(/15%|commission/);
  });

  it("contains the affiliate link", () => {
    const html = affiliateWelcomeBody("quotable", baseOpts);
    expect(html).toContain(baseOpts.link);
  });

  it("contains the promo code", () => {
    const html = affiliateWelcomeBody("quotable", baseOpts);
    expect(html).toContain(baseOpts.code);
  });

  it("contains the explore button", () => {
    const html = affiliateWelcomeBody("quotable", baseOpts);
    expect(html).toContain("https://crete.direct/explore");
  });
});

describe("affiliateWelcomeBody — vitrine (restaurant/cafe/bar/unknown)", () => {
  it("does NOT contain '15%' for a vitrine affiliate", () => {
    const html = affiliateWelcomeBody("vitrine", baseOpts);
    expect(html).not.toContain("15%");
  });

  it("does NOT contain 'commission' for a vitrine affiliate", () => {
    const html = affiliateWelcomeBody("vitrine", baseOpts);
    expect(html.toLowerCase()).not.toContain("commission");
  });

  it("contains the affiliate link", () => {
    const html = affiliateWelcomeBody("vitrine", baseOpts);
    expect(html).toContain(baseOpts.link);
  });

  it("contains the promo code", () => {
    const html = affiliateWelcomeBody("vitrine", baseOpts);
    expect(html).toContain(baseOpts.code);
  });

  it("contains the explore button", () => {
    const html = affiliateWelcomeBody("vitrine", baseOpts);
    expect(html).toContain("https://crete.direct/explore");
  });
});
