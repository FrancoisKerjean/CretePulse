// Le frere du defaut voiture. `ACT_CONNECT_COPY` portait la meme formulation
// passive (« they will also reach out to finalise the booking »), donc le meme
// silence est possible cote activites, ou la commission est de 15 % et non 10 %.
// Corrige en meme temps que les voitures : un garde dans une seule des deux
// copies aurait laisse l'autre pourrir sans que personne ne le voie.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const email = await import("../email");

const OK = { data: { id: "re_ok" }, error: null };

const partner = { name: "Io Tours", email: "info@iotours.example", phone: "+302841000000", whatsapp: "+306900000000" };
const quote = {
  categoryLabel: "Boat trip", cityLabel: "Ierapetra", date: "2026-08-12",
  adults: 2, children: 0, price: 180, currency: "EUR", partnerName: partner.name,
};

/** Le 2e envoi est celui du client (le 1er va au prestataire). */
async function envoiClient(locale: string) {
  sendMock.mockReset();
  sendMock.mockResolvedValue(OK);
  await email.sendActivityConnectionEmails({
    partner,
    customer: { name: "Anna Rossi", email: "client@example.com", phone: "+393331234567", locale },
    quote,
  });
  return sendMock.mock.calls[1][0];
}

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => { errorSpy = vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

describe("mise en relation activite : le mail doit appeler une action", () => {
  it("met le prestataire en replyTo, boite relais conservee derriere", async () => {
    const envoi = await envoiClient("en");
    const replyTo = Array.isArray(envoi.replyTo) ? envoi.replyTo : [envoi.replyTo];
    expect(replyTo).toContain(partner.email);
    expect(replyTo).toContain("contact@kairosguest.com");
  });

  it("offre un mailto cliquable vers le prestataire", async () => {
    const envoi = await envoiClient("en");
    expect(envoi.html).toContain(`mailto:${partner.email}`);
  });

  it.each([
    ["en", "will also reach out"],
    ["fr", "il vous contactera aussi"],
    ["de", "meldet sich ebenfalls"],
    ["el", "θα επικοινωνήσει και εκείνος"],
  ])("n'annonce plus au client (%s) que le prestataire fera tout", async (locale, passif) => {
    const envoi = await envoiClient(locale);
    expect(envoi.html).not.toContain(passif);
  });

  it("previent que la place n'est pas reservee tant que le client n'a pas repondu", async () => {
    const attendu: Record<string, string> = {
      en: "not booked yet",
      fr: "pas encore réservée",
      de: "noch nicht gebucht",
      el: "δεν έχει κρατηθεί ακόμη",
    };
    for (const [locale, marqueur] of Object.entries(attendu)) {
      const envoi = await envoiClient(locale);
      expect(envoi.html, `locale ${locale}`).toContain(marqueur);
    }
  });
});
