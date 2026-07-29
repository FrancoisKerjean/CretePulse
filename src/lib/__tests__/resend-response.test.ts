import { describe, it, expect, vi, afterEach } from "vitest";
import { assertSent, reportSend } from "../resend-response";

afterEach(() => vi.restoreAllMocks());

describe("assertSent", () => {
  it("rend les donnees quand Resend accepte", () => {
    expect(assertSent({ data: { id: "re_1" }, error: null }, "test")).toEqual({ id: "re_1" });
  });

  // Le SDK Resend ne leve PAS sur un refus API : il resout { data: null, error }.
  // Un appel qui n'inspecte pas la reponse traite donc un refus comme un succes.
  it("leve quand Resend refuse l'envoi", () => {
    expect(() => assertSent({ data: null, error: { name: "validation_error", message: "domain is not verified" } }, "confirmation"))
      .toThrowError(/domain is not verified/);
  });

  it("nomme l'envoi dans le message pour que le log soit exploitable", () => {
    expect(() => assertSent({ data: null, error: { message: "boom" } }, "mise en relation client"))
      .toThrowError(/mise en relation client/);
  });
});

describe("reportSend", () => {
  it("rend true et ne journalise rien quand Resend accepte", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(reportSend({ data: { id: "re_1" }, error: null }, "suivi")).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rend false et journalise quand Resend refuse", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(reportSend({ data: null, error: { name: "rate_limit_exceeded", message: "Too many requests" } }, "suivi")).toBe(false);
    expect(JSON.stringify(spy.mock.calls)).toContain("Too many requests");
  });
});
