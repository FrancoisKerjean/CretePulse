import { describe, it, expect, beforeAll } from "vitest";
import { hashIp, hashToken } from "../sec";

beforeAll(() => {
  process.env.REVIEWS_SALT = "test-salt-32-characters-aaaaaaaaaa";
});

describe("hashIp", () => {
  it("is deterministic for same input + salt", () => {
    expect(hashIp("1.2.3.4")).toBe(hashIp("1.2.3.4"));
  });
  it("returns a 64-char hex string", () => {
    expect(hashIp("1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("differs when salt changes", () => {
    const a = hashIp("1.2.3.4");
    process.env.REVIEWS_SALT = "different-salt-32-characters-bbbb";
    const b = hashIp("1.2.3.4");
    expect(a).not.toBe(b);
    process.env.REVIEWS_SALT = "test-salt-32-characters-aaaaaaaaaa";
  });
});

describe("hashToken", () => {
  it("is deterministic and 64-hex", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("does NOT depend on salt (token is already secret)", () => {
    const a = hashToken("xyz");
    process.env.REVIEWS_SALT = "yet-another-salt-32-chars-cccccccc";
    const b = hashToken("xyz");
    expect(a).toBe(b);
    process.env.REVIEWS_SALT = "test-salt-32-characters-aaaaaaaaaa";
  });
});
