import { describe, it, expect } from "vitest";
import { validateStayRequest, ipHash } from "./validation";

const base = {
  guestName: "Jane",
  guestEmail: "jane@example.com",
  dateFrom: "2026-07-01",
  dateTo: "2026-07-08",
  pax: 2,
};

describe("validateStayRequest", () => {
  it("accepts a well-formed body", () => {
    const r = validateStayRequest({ ...base });
    expect(r.kind).toBe("ok");
  });
  it("treats a filled honeypot as honeypot (silent)", () => {
    const r = validateStayRequest({ ...base, website: "bot" });
    expect(r.kind).toBe("honeypot");
  });
  it("rejects a bad email", () => {
    const r = validateStayRequest({ ...base, guestEmail: "nope" });
    expect(r.kind).toBe("error");
  });
  it("rejects an inverted date range", () => {
    const r = validateStayRequest({ ...base, dateFrom: "2026-07-08", dateTo: "2026-07-01" });
    expect(r.kind).toBe("error");
  });
});

describe("ipHash", () => {
  it("is deterministic and 64 hex chars", () => {
    const a = ipHash("1.2.3.4");
    const b = ipHash("1.2.3.4");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("returns null for empty ip", () => {
    expect(ipHash(null)).toBeNull();
  });
});
