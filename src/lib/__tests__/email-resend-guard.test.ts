// Le SDK Resend ne leve PAS quand l'API refuse un envoi (domaine non verifie,
// rate limit, cle revoquee, destinataire invalide) : il resout avec
// { data: null, error }. Tout appel qui n'inspecte pas la reponse traite donc
// un refus comme un succes. Ces tests verrouillent le comportement attendu
// pour les envois qui n'avaient aucune lecture de reponse.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const email = await import("../email");

const REFUS = { data: null, error: { name: "validation_error", message: "domain is not verified" } };
const OK = { data: { id: "re_ok" }, error: null };

const partner = { name: "Zorbas Rent a Car", email: "zorbas@example.com", phone: "+302841000000", whatsapp: "+302841000000" };
const customer = { name: "Jean Dupont", email: "jean@example.com", phone: "0612345678", locale: "fr" };
const carQuote = {
  pickupLabel: "Heraklion Airport", dateFrom: "2026-08-10", dateTo: "2026-08-17",
  carTypeLabel: "Economy", price: 310, currency: "EUR", partnerName: partner.name, days: 7,
};
const activityQuote = {
  categoryLabel: "Boat trip", cityLabel: "Ierapetra", date: "2026-08-12",
  adults: 2, children: 0, price: 180, currency: "EUR", partnerName: partner.name,
};
const carLead = {
  pickupLabel: "Heraklion Airport", dateFrom: "2026-08-10", dateTo: "2026-08-17",
  carTypeLabel: "Economy", customerName: "Jean Dupont", customerEmail: "jean@example.com",
};

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sendMock.mockReset();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("envois critiques : un refus doit remonter a l'appelant", () => {
  it("sendConfirmationEmail : sans lui, l'abonne n'a jamais son lien de confirmation", async () => {
    sendMock.mockResolvedValue(REFUS);
    await expect(email.sendConfirmationEmail("a@b.com", "tok", "fr")).rejects.toThrow(/domain is not verified/);
  });

  it("sendWelcomeEmail : un refus ne passe plus pour un succes", async () => {
    sendMock.mockResolvedValue(REFUS);
    await expect(email.sendWelcomeEmail("a@b.com", "fr")).rejects.toThrow();
  });

  it("sendReviewConfirmationEmail : sans lui, l'avis reste bloque en attente de confirmation", async () => {
    sendMock.mockResolvedValue(REFUS);
    await expect(email.sendReviewConfirmationEmail({
      email: "a@b.com", confirmToken: "c", deleteToken: "d", locale: "fr", placeName: "Vai",
    })).rejects.toThrow();
  });

  // Le plus couteux : le loueur recoit bien les coordonnees du client, mais le
  // client ne recoit jamais celles du loueur. La reservation est acceptee des
  // deux cotes et personne ne peut se joindre.
  it("sendConnectionEmails : un refus sur l'email CLIENT remonte (le loueur, lui, est deja servi)", async () => {
    sendMock.mockResolvedValueOnce(OK).mockResolvedValueOnce(REFUS);
    await expect(email.sendConnectionEmails({ partner, customer, quote: carQuote })).rejects.toThrow();
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("sendActivityConnectionEmails : meme garantie cote activites", async () => {
    sendMock.mockResolvedValueOnce(OK).mockResolvedValueOnce(REFUS);
    await expect(email.sendActivityConnectionEmails({ partner, customer, quote: activityQuote })).rejects.toThrow();
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("laisse passer sans bruit quand Resend accepte", async () => {
    sendMock.mockResolvedValue(OK);
    await expect(email.sendConnectionEmails({ partner, customer, quote: carQuote })).resolves.toBeUndefined();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("envois best-effort : un refus doit au moins laisser une trace", () => {
  it("sendLeadKamiSummary journalise le refus au lieu de l'ignorer", async () => {
    sendMock.mockResolvedValue(REFUS);
    await email.sendLeadKamiSummary(carLead, ["Zorbas"]);
    expect(JSON.stringify(errorSpy.mock.calls)).toContain("domain is not verified");
  });

  it("sendActivityLeadKamiSummary journalise le refus", async () => {
    sendMock.mockResolvedValue(REFUS);
    await email.sendActivityLeadKamiSummary({
      categoryLabel: "Boat trip", cityLabel: "Ierapetra", date: "2026-08-12",
      adults: 2, children: 0, customerName: "Jean", customerEmail: "jean@example.com",
    }, ["Zorbas"]);
    expect(JSON.stringify(errorSpy.mock.calls)).toContain("domain is not verified");
  });
});
