import { describe, it, expect } from "vitest";
import { parseClaudeJsonArray } from "../bento-extract";

describe("parseClaudeJsonArray", () => {
  it("parses a bare JSON array", () => {
    const r = parseClaudeJsonArray('[{"slug":"a","tiles":{"century":14}}]');
    expect(r[0].tiles.century).toBe(14);
  });
  it("strips markdown fences", () => {
    const r = parseClaudeJsonArray('```json\n[{"slug":"b","tiles":{}}]\n```');
    expect(r[0].slug).toBe("b");
  });
  it("throws on non-array", () => {
    expect(() => parseClaudeJsonArray('{"slug":"x"}')).toThrow();
  });
});
