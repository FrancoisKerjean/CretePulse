import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));

beforeEach(() => { send.mockReset(); });

const mail = {
  requestId: 1, partnerName: "X", commissionEur: 20, finalAmountEur: 200,
  dateFrom: "2026-08-07", dateTo: "2026-08-14", payUrl: "https://x",
};

describe("sendPartnerCommissionRequest", () => {
  it("rend true quand Resend accepte", async () => {
    send.mockResolvedValue({ data: { id: "re_1" }, error: null });
    const { sendPartnerCommissionRequest } = await import("./email");
    await expect(sendPartnerCommissionRequest("a@b.c", mail)).resolves.toBe(true);
  });

  it("rend false quand Resend refuse, sans lever", async () => {
    // ⛔ Resend NE LEVE PAS sur refus : sans lecture de `error`, un envoi
    // refuse passerait pour un succes et la facture serait marquee envoyee.
    send.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    const { sendPartnerCommissionRequest } = await import("./email");
    await expect(sendPartnerCommissionRequest("a@b.c", mail)).resolves.toBe(false);
  });

  it("rend false quand l appel jette", async () => {
    send.mockRejectedValue(new Error("network"));
    const { sendPartnerCommissionRequest } = await import("./email");
    await expect(sendPartnerCommissionRequest("a@b.c", mail)).resolves.toBe(false);
  });
});

describe("sendCarDepositMail", () => {
  const m = { subject: "Deposit received", html: "<p>Body</p>" };

  it("envoie depuis crete.direct, réponse vers crete.direct, corps dans l'habillage du site", async () => {
    send.mockResolvedValue({ data: { id: "re_1" }, error: null });
    const { sendCarDepositMail } = await import("./email");
    await expect(sendCarDepositMail("a@b.c", m)).resolves.toBe(true);
    const arg = send.mock.calls[0][0];
    expect(arg.from).toContain("crete.direct");
    expect(arg.replyTo).toBe("hello@crete.direct");
    expect(arg.to).toBe("a@b.c");
    expect(arg.subject).toBe("Deposit received");
    expect(arg.html).toContain("<p>Body</p>");
    expect(JSON.stringify(arg).toLowerCase()).not.toContain("kairos");
  });

  it("rend false quand Resend refuse, sans lever", async () => {
    send.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    const { sendCarDepositMail } = await import("./email");
    await expect(sendCarDepositMail("a@b.c", m)).resolves.toBe(false);
  });

  it("rend false quand l appel jette", async () => {
    send.mockRejectedValue(new Error("network"));
    const { sendCarDepositMail } = await import("./email");
    await expect(sendCarDepositMail("a@b.c", m)).resolves.toBe(false);
  });
});
