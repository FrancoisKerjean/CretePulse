import { describe, it, expect, vi } from "vitest";

// guides.ts instancie le client Supabase a l'import ; on teste la regle pure, pas la base.
vi.mock("./supabase", () => ({ supabase: {} }));
const { isGuideIndexable } = await import("./guides");
type Guide = import("./guides").Guide;

// 235 des 508 articles du sitemap etaient des `crete-weather-*` et `crete-news-recap-*`
// dates (releve du 27/10/2026), le format mesure a 0,2 visiteur par guide : ils
// diluent le budget de crawl. Meme fenetre glissante de 30 j que les news.

const NOW = new Date("2026-10-27T12:00:00Z");
const base = {
  id: 1, slug: "x", category: "beaches", keywords: [], titles: { en: "t" }, meta_descs: {},
  contents: { en: "body en", fr: "corps fr" }, faqs: null, image_url: null, read_time: null,
  created_at: "2026-09-01T00:00:00Z", status: "published", youtube_video_id: null,
} satisfies Omit<Guide, "format" | "published_at">;
const guide = (format: Guide["format"], daysAgo: number): Guide => ({
  ...base, format, published_at: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
});

describe("isGuideIndexable", () => {
  it("garde un guide evergreen quel que soit son age", () => {
    expect(isGuideIndexable(guide("mid", 400), "en", NOW)).toBe(true);
    expect(isGuideIndexable(guide("long", 400), "fr", NOW)).toBe(true);
  });
  it("garde une news de moins de 30 jours", () => {
    expect(isGuideIndexable(guide("news", 29), "en", NOW)).toBe(true);
  });
  it("retire une news de plus de 30 jours", () => {
    expect(isGuideIndexable(guide("news", 90), "en", NOW)).toBe(false);
  });
  it("ne garde jamais un bulletin meteo daily, meme du jour", () => {
    expect(isGuideIndexable(guide("daily", 0), "en", NOW)).toBe(false);
    expect(isGuideIndexable(guide("daily", 10), "en", NOW)).toBe(false);
    expect(isGuideIndexable(guide("daily", 31), "en", NOW)).toBe(false);
  });
  it("retire toujours une locale servie en anglais par repli", () => {
    expect(isGuideIndexable(guide("mid", 1), "de", NOW)).toBe(false);
  });
});
