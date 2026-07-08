/**
 * Tests for the pure exported helpers in affiliate-places.ts.
 * getAffiliatePlaces() is NOT tested here (hits Supabase).
 * Only pure pieces: mapAffiliateRow, isAffiliateSlug, partnerLabel, affiliateDescription.
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

const { mapAffiliateRow, isAffiliateSlug, partnerLabel, affiliateDescription } = await import(
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
    photo_url: null as string | null,
    description: null as { en?: string; fr?: string; de?: string; el?: string } | null,
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

  it("leaves photos as an empty array when photo_url is null", () => {
    const place = mapAffiliateRow({ ...sampleRow, photo_url: null });
    expect(place.photos).toEqual([]);
  });

  it("carries photo_url as first photo when present", () => {
    const url = "https://media.crete.direct/instagram/jmp/cover.jpg";
    const place = mapAffiliateRow({ ...sampleRow, photo_url: url });
    expect(place.photos).toEqual([url]);
  });

  it("carries __affiliateDescription when description is set", () => {
    const desc = { en: "Great tours", fr: "Super excursions" };
    const place = mapAffiliateRow({ ...sampleRow, description: desc });
    expect(place.__affiliateDescription).toEqual(desc);
  });

  it("carries __affiliateDescription as null when description is null", () => {
    const place = mapAffiliateRow({ ...sampleRow, description: null });
    expect(place.__affiliateDescription).toBeNull();
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

// ---------------------------------------------------------------------------
// affiliateDescription
// ---------------------------------------------------------------------------

describe("affiliateDescription", () => {
  const makePlace = (desc: { en?: string; fr?: string; de?: string; el?: string } | null) => ({
    slug: "affiliate:test",
    name: "Test",
    place_type: "sponsor",
    category: null,
    latitude: 35.5,
    longitude: 24.0,
    rating: null,
    prefecture: null,
    water_color: null,
    sand_type: null,
    depth: null,
    sea_surface: null,
    crowds: null,
    facilities: null,
    accessibility: null,
    photos: [] as string[],
    photo_count: 0,
    water_quality: null,
    __sponsorUrl: "https://crete.direct/go/test",
    __affiliateDescription: desc,
  });

  it("returns the localized description for a known locale", () => {
    const place = makePlace({ en: "English desc", fr: "Description FR" });
    expect(affiliateDescription(place, "fr")).toBe("Description FR");
  });

  it("falls back to 'en' when the requested locale is missing", () => {
    const place = makePlace({ en: "English desc" });
    expect(affiliateDescription(place, "de")).toBe("English desc");
  });

  it("returns null when description is null", () => {
    const place = makePlace(null);
    expect(affiliateDescription(place, "en")).toBeNull();
  });

  it("returns null when both locale and en are missing", () => {
    const place = makePlace({ fr: "Uniquement FR" });
    expect(affiliateDescription(place, "de")).toBeNull();
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
