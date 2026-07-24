import { describe, it, expect } from "vitest";
import { slugify } from "./db";

describe("slugify", () => {
  it("lowercases, strips accents, hyphenates", () => {
    expect(slugify("Villa Séléné à Makrigialos")).toBe("villa-selene-a-makrigialos");
  });
  it("appends a suffix for uniqueness when given", () => {
    expect(slugify("Villa", "7f3")).toBe("villa-7f3");
  });
});
