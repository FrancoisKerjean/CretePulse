/**
 * Tests for the pure exported helpers in affiliate-places.ts.
 * getAffiliatePlaces() is NOT tested here (hits Supabase).
 * Only pure pieces: mapAffiliateRow, isAffiliateSlug, partnerLabel.
 */
import { describe, it, expect, vi } from "vitest";

// Mock supabase so the module can be imported without real env vars.
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock cb-places (CbPlaceListItem type only — no runtime side-effects needed).
vi.mock("@/lib/cb-places", () => ({}));

const { mapAffiliateRow, isAffiliateSlug, partnerLabel } = await import(
  "@/lib/affiliate-places"
);

// ---------------------------------------------------------------------------
// mapAffiliateRow
// ---------------------------------------------------------------------------

describe("mapAffiliateRow", () => {
  const sampleRow = {
    slug: "jmp-chania-tours",
    name: "JMP Chania Tours",
    category: "tours",
    area: "Chania",
    latitude: 35.5138,
    longitude: 24.0183,
  };

  it('prefixes slug with "affiliate:"', () => {
    const place = mapAffiliateRow(sampleRow);
    expect(place.slug).toBe("affiliate:jmp-chania-tours");
  });

  it("builds the correct __sponsorUrl", () => {
    const place = mapAffiliateRow(sampleRow);
    expect(place.__sponsorUrl).toBe("https://crete.direct/go/jmp-chania-tours");
  });

  it('sets place_type to "sponsor"', () => {
    const place = mapAffiliateRow(sampleRow);
    expect(place.place_type).toBe("sponsor");
  });

  it("carries over name", () => {
    const place = mapAffiliateRow(sampleRow);
    expect(place.name).toBe("JMP Chania Tours");
  });

  it("carries over category", () => {
    const place = mapAffiliateRow(sampleRow);
    expect(place.category).toBe("tours");
  });

  it("carries over latitude and longitude", () => {
    const place = mapAffiliateRow(sampleRow);
    expect(place.latitude).toBe(35.5138);
    expect(place.longitude).toBe(24.0183);
  });

  it("leaves photos as an empty array", () => {
    const place = mapAffiliateRow(sampleRow);
    expect(place.photos).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isAffiliateSlug
// ---------------------------------------------------------------------------

describe("isAffiliateSlug", () => {
  it('returns true for a slug starting with "affiliate:"', () => {
    expect(isAffiliateSlug("affiliate:x")).toBe(true);
  });

  it('returns false for a slug starting with "sponsor:"', () => {
    expect(isAffiliateSlug("sponsor:x")).toBe(false);
  });

  it("returns false for a bare slug (no prefix)", () => {
    expect(isAffiliateSlug("jmp-chania-tours")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// partnerLabel
// ---------------------------------------------------------------------------

describe("partnerLabel", () => {
  it('returns "Partenaire" for locale "fr"', () => {
    expect(partnerLabel("fr")).toBe("Partenaire");
  });

  it('returns "Συνεργάτης" for locale "el"', () => {
    expect(partnerLabel("el")).toBe("Συνεργάτης");
  });

  it('returns "Partner" for locale "de"', () => {
    expect(partnerLabel("de")).toBe("Partner");
  });

  it('falls back to "Partner" (en) for an unknown locale', () => {
    expect(partnerLabel("zh")).toBe("Partner");
  });
});
