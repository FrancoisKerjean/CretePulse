import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

import {
  slugify,
  upsertOwnerByEmail,
  groupRangesByListing,
  mergeAdjacentRanges,
} from "./db";

describe("slugify", () => {
  it("lowercases, strips accents, hyphenates", () => {
    expect(slugify("Villa Séléné à Makrigialos")).toBe("villa-selene-a-makrigialos");
  });
  it("appends a suffix for uniqueness when given", () => {
    expect(slugify("Villa", "7f3")).toBe("villa-7f3");
  });
});

// La langue du proprietaire decide de la langue de TOUS ses emails, longtemps
// apres son inscription. Elle se pose une fois, a la creation, et ne se laisse
// pas ecraser par la langue d'une page visitee plus tard.
describe("upsertOwnerByEmail, langue du proprietaire", () => {
  beforeEach(() => from.mockReset());

  /** Cablage minimal : un proprietaire existant ou non, et les ecritures observees. */
  function wiring(existing: Record<string, unknown> | null) {
    const inserted: Array<Record<string, unknown>> = [];
    const updated: Array<Record<string, unknown>> = [];
    from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing }) }) }),
      insert: (row: Record<string, unknown>) => {
        inserted.push(row);
        return {
          select: () => ({ single: async () => ({ data: { id: 1, ...row }, error: null }) }),
        };
      },
      update: (patch: Record<string, unknown>) => {
        updated.push(patch);
        return { eq: async () => ({ error: null }) };
      },
    });
    return { inserted, updated };
  }

  it("ecrit la langue a la creation du proprietaire", async () => {
    const { inserted } = wiring(null);
    await upsertOwnerByEmail("o@x.com", "Maria", null, "de");
    expect(inserted[0]).toMatchObject({ email: "o@x.com", locale: "de" });
  });

  it("complete la langue d un proprietaire qui n en avait pas", async () => {
    const { updated } = wiring({ id: 7, email: "o@x.com", locale: null });
    await upsertOwnerByEmail("o@x.com", null, null, "el");
    expect(updated[0]).toMatchObject({ locale: "el" });
  });

  it("ne remplace jamais la langue deja choisie par le proprietaire", async () => {
    const { updated } = wiring({ id: 7, email: "o@x.com", locale: "el" });
    const owner = await upsertOwnerByEmail("o@x.com", null, null, "de");
    expect(updated).toHaveLength(0);
    expect(owner.locale).toBe("el");
  });
});

describe("groupRangesByListing", () => {
  it("regroupe par listing_id et convertit en DateRange", () => {
    const rows = [
      { listing_id: 1, date_from: "2026-08-10", date_to: "2026-08-14" },
      { listing_id: 2, date_from: "2026-09-01", date_to: "2026-09-03" },
      { listing_id: 1, date_from: "2026-08-20", date_to: "2026-08-22" },
    ];
    expect(groupRangesByListing(rows)).toEqual({
      1: [
        { dateFrom: "2026-08-10", dateTo: "2026-08-14" },
        { dateFrom: "2026-08-20", dateTo: "2026-08-22" },
      ],
      2: [{ dateFrom: "2026-09-01", dateTo: "2026-09-03" }],
    });
  });

  it("rend un objet vide sur une entree vide ou nulle", () => {
    expect(groupRangesByListing([])).toEqual({});
    expect(groupRangesByListing(null)).toEqual({});
  });
});

// Le collage des nuits prises n'a qu'UNE definition, partagee par la version mono
// annonce et la version multi annonces : deux definitions du mot "pris" finiraient
// par diverger. Convention [) : la nuit D est la plage [D, D+1).
describe("mergeAdjacentRanges", () => {
  it("colle deux nuits qui se suivent en une seule plage", () => {
    expect(
      mergeAdjacentRanges([
        { dateFrom: "2026-08-10", dateTo: "2026-08-11" },
        { dateFrom: "2026-08-11", dateTo: "2026-08-12" },
      ]),
    ).toEqual([{ dateFrom: "2026-08-10", dateTo: "2026-08-12" }]);
  });

  it("ne colle jamais par dessus une nuit libre", () => {
    expect(
      mergeAdjacentRanges([
        { dateFrom: "2026-08-10", dateTo: "2026-08-11" },
        { dateFrom: "2026-08-12", dateTo: "2026-08-13" },
      ]),
    ).toEqual([
      { dateFrom: "2026-08-10", dateTo: "2026-08-11" },
      { dateFrom: "2026-08-12", dateTo: "2026-08-13" },
    ]);
  });
});
