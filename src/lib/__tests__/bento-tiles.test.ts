import { describe, it, expect } from "vitest";
import { familyOf } from "../bento-tiles";

describe("familyOf", () => {
  it("maps beach to beach", () => expect(familyOf("beach")).toBe("beach"));
  it("maps monastery and museum to heritage", () => {
    expect(familyOf("monastery")).toBe("heritage");
    expect(familyOf("museum")).toBe("heritage");
    expect(familyOf("archaeological-site")).toBe("heritage");
    expect(familyOf("tradition")).toBe("heritage");
  });
  it("maps gorge/cave/waterfall to nature", () => {
    expect(familyOf("gorge")).toBe("nature");
    expect(familyOf("cave")).toBe("nature");
    expect(familyOf("waterfall")).toBe("nature");
  });
  it("maps town to village", () => expect(familyOf("town")).toBe("village"));
  it("maps unknown/flora/lighthouse to default", () => {
    expect(familyOf("flora")).toBe("default");
    expect(familyOf("lighthouse")).toBe("default");
    expect(familyOf("totally-unknown-type")).toBe("default");
  });
});
