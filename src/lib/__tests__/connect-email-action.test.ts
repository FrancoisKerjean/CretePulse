// Pourquoi ce test existe : le mail de mise en relation disait au client
// « they will also reach out to finalise your booking ». Le client comprenait
// donc que le loueur s'occupait de tout, et n'avait aucune raison de repondre.
// Cas reel du 07/08/2026 : Firmino Facchin a OUVERT ce mail (Resend `ok lu`),
// n'a jamais repondu a Zakros Tours, et la location 33 (280 EUR, 28 EUR de
// commission) est restee en suspens 9 jours.
// Deux verrous ici : le mail demande une action au client, et un simple
// « repondre » atteint le loueur au lieu de la boite relais.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const email = await import("../email");

const OK = { data: { id: "re_ok" }, error: null };

const partner = { name: "Zakros Tours", email: "info@zakrostours.com", phone: "+302897022137", whatsapp: "+306978186250" };
const quote = {
  pickupLabel: "Heraklion", dateFrom: "2026-09-08", dateTo: "2026-09-16",
  carTypeLabel: "City car", price: 280, currency: "EUR", partnerName: partner.name, days: 8,
};

/** Le 2e envoi de sendConnectionEmails est celui du client (le 1er va au loueur). */
async function envoiClient(locale: string) {
  sendMock.mockReset();
  sendMock.mockResolvedValue(OK);
  await email.sendConnectionEmails({
    partner,
    customer: { name: "Firmino Facchin", email: "client@example.com", phone: "+393331234567", locale },
    quote,
  });
  return sendMock.mock.calls[1][0];
}

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => { errorSpy = vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

describe("mise en relation client : le mail doit appeler une action", () => {
  it("met le loueur en replyTo pour qu'un simple « repondre » l'atteigne", async () => {
    const envoi = await envoiClient("en");
    const replyTo = Array.isArray(envoi.replyTo) ? envoi.replyTo : [envoi.replyTo];
    expect(replyTo).toContain(partner.email);
  });

  it("garde la boite relais en copie de replyTo pour ne pas perdre le fil", async () => {
    const envoi = await envoiClient("en");
    const replyTo = Array.isArray(envoi.replyTo) ? envoi.replyTo : [envoi.replyTo];
    expect(replyTo).toContain("contact@kairosguest.com");
  });

  it("offre un mailto cliquable vers le loueur dans le corps", async () => {
    const envoi = await envoiClient("en");
    expect(envoi.html).toContain(`mailto:${partner.email}`);
  });

  // Regression : ces quatre formulations mettaient le client en position passive.
  it.each([
    ["en", "will also reach out"],
    ["fr", "vous contactera aussi"],
    ["de", "meldet sich ebenfalls"],
    ["el", "θα επικοινωνήσει και εκείνο"],
  ])("n'annonce plus au client (%s) que le loueur fera tout", async (locale, passif) => {
    const envoi = await envoiClient(locale);
    expect(envoi.html).not.toContain(passif);
  });

  it("previent que la reservation n'est pas ferme tant que le client n'a pas repondu", async () => {
    // Le fait porteur du changement, verifie dans les 4 langues via un marqueur
    // propre a chaque locale plutot qu'une traduction en dur cote test.
    const attendu: Record<string, string> = {
      en: "not held yet",
      fr: "pas encore bloquée",
      de: "noch nicht reserviert",
      el: "δεν έχει δεσμευτεί ακόμη",
    };
    for (const [locale, marqueur] of Object.entries(attendu)) {
      const envoi = await envoiClient(locale);
      expect(envoi.html, `locale ${locale}`).toContain(marqueur);
    }
  });
});
