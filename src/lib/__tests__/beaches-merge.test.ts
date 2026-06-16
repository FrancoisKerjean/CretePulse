import { describe, it, expect, vi } from "vitest";

// Mock supabase avant tout import de beaches (beaches.ts importe supabase au top-level)
vi.mock("../supabase", () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn() })),
  },
}));

import { mergeCbIntoBeaches } from "../beaches";

describe("mergeCbIntoBeaches", () => {
  const beaches = [
    { slug: "a", cb_slug: "cb-a", image_url: "wiki-a.jpg" },
    { slug: "b", cb_slug: null, image_url: "wiki-b.jpg" },
  ] as never[];

  it("ajoute cb_rating et cb_photo depuis la ligne cb correspondante", () => {
    const r = mergeCbIntoBeaches(beaches, [
      { slug: "cb-a", rating: 4.2, photos: ["p1.jpg", "p2.jpg"] },
    ]);
    expect(r[0].cb_rating).toBe(4.2);
    expect(r[0].cb_photo).toBe("p1.jpg");
  });

  it("laisse cb_rating/cb_photo à null quand cb_slug est null", () => {
    const r = mergeCbIntoBeaches(beaches, []);
    expect(r[1].cb_rating).toBeNull();
    expect(r[1].cb_photo).toBeNull();
  });

  it("gère une ligne cb sans photos", () => {
    const r = mergeCbIntoBeaches(beaches, [{ slug: "cb-a", rating: 3, photos: null }]);
    expect(r[0].cb_photo).toBeNull();
    expect(r[0].cb_rating).toBe(3);
  });
});
