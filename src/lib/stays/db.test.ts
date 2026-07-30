import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

import { slugify, upsertOwnerByEmail } from "./db";

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
