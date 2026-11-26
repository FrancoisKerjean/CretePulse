import { describe, it, expect } from "vitest";
import { athensWallToUtcMs } from "./car-deposit";
import { depositMail, DEPOSIT_MAIL_KINDS, type DepositMailData } from "./car-deposit-mail";

const EM_DASH = String.fromCharCode(8212);

// Espaces insécables d'Intl (U+00A0, U+202F) ramenées à l'espace simple.
const flat = (s: string) => s.replace(/[  ]/g, " ");

const DATA: DepositMailData = {
  partnerName: "Zorbas Rent a Car",
  carLabel: "Fiat Panda · Manual",
  pickupLabel: "Heraklion Airport",
  dateFrom: "2027-07-20",
  timeFrom: "10:00",
  dateTo: "2027-07-27",
  timeTo: "10:00",
  totalEur: 412,
  depositEur: 41.2,
  // Paiement à 21:30 heure d'Athènes : échéance 11:30 le lendemain.
  deadlineIso: new Date(athensWallToUtcMs("2027-07-13", "11:30")).toISOString(),
  confirmUrl: "https://crete.direct/en/car-confirm/conf-plain",
  offersUrl: "https://crete.direct/fr/car-offer/client-tok",
  refundReason: "partner_declined",
  refundedEur: 41.2,
  insurance: { type: "cdw_excess", excessEur: 800, upsellPerDay: 9 },
  partnerContact: {
    name: "Zorbas Rent a Car",
    phone: "+30 2810 123456",
    whatsapp: "+30 697 0000000",
    email: "info@zorbas.gr",
    address: "Airport road 1, 71601 Heraklion",
  },
  customer: { name: "Marie Durand", phone: "+33 6 12 34 56 78", email: "marie@example.fr" },
};

const CLIENT_CONTACT = ["Marie Durand", "+33 6 12 34 56 78", "marie@example.fr"];
const PARTNER_CONTACT = ["+30 2810 123456", "+30 697 0000000", "info@zorbas.gr", "Airport road 1"];

function text(kind: Parameters<typeof depositMail>[0], locale = "fr", data: DepositMailData = DATA): string {
  const m = depositMail(kind, data, locale);
  return flat(`${m.subject}\n${m.html}`);
}

describe("depositMail", () => {
  it("client_pending en fr : montant payé, loueur et heure d'échéance", () => {
    const t = text("client_pending", "fr");
    expect(t).toContain("41,20 €");
    expect(t).toContain("Zorbas Rent a Car");
    expect(t).toContain("11:30");
    // Reste au comptoir : 412 - 41,20.
    expect(t).toContain("370,80 €");
  });

  it("client_pending ne donne aucune coordonnée du loueur avant la confirmation", () => {
    const t = text("client_pending", "fr");
    for (const c of PARTNER_CONTACT) expect(t).not.toContain(c);
  });

  it("partner_request : montant à encaisser au comptoir et lien de confirmation, sans aucune coordonnée du client", () => {
    const t = text("partner_request", "fr");
    expect(t).toContain("€370.80");
    expect(t).toContain("€41.20");
    expect(t).toContain("https://crete.direct/en/car-confirm/conf-plain");
    expect(t).toContain("11:30");
    expect(t).toContain("Heraklion Airport");
    for (const c of CLIENT_CONTACT) expect(t).not.toContain(c);
  });

  it("partner_request est en anglais quelle que soit la locale du client", () => {
    expect(text("partner_request", "fr")).toContain("Confirm");
    expect(text("partner_request", "de")).toBe(text("partner_request", "en"));
  });

  it("partner_reminder : rappel avec le lien, sans coordonnée du client", () => {
    const t = text("partner_reminder", "en");
    expect(t).toContain("https://crete.direct/en/car-confirm/conf-plain");
    expect(t).toContain("11:30");
    for (const c of CLIENT_CONTACT) expect(t).not.toContain(c);
  });

  it("client_confirmed : nom, adresse et téléphone du loueur", () => {
    const t = text("client_confirmed", "fr");
    expect(t).toContain("Zorbas Rent a Car");
    expect(t).toContain("+30 2810 123456");
    expect(t).toContain("Airport road 1, 71601 Heraklion");
    expect(t).toContain("370,80 €");
  });

  it("partner_confirmed : nom, téléphone et e-mail du client", () => {
    const t = text("partner_confirmed", "fr");
    for (const c of CLIENT_CONTACT) expect(t).toContain(c);
    expect(t).toContain("€370.80");
  });

  it("client_refunded : motif dans la langue du client et lien vers les autres offres", () => {
    const t = text("client_refunded", "fr");
    expect(t).toContain("Le loueur n'a pas pu confirmer cette voiture.");
    expect(t).toContain("https://crete.direct/fr/car-offer/client-tok");
    expect(t).toContain("41,20 €");
    for (const c of PARTNER_CONTACT) expect(t).not.toContain(c);
  });

  it("client_refunded sans lien d'offres (ancienne demande) : pas de lien vide", () => {
    const t = text("client_refunded", "en", { ...DATA, offersUrl: null });
    expect(t).not.toContain('href=""');
    expect(t).not.toContain("href=\"null\"");
  });

  it("client_cancelled : montant rendu, ou acompte gardé", () => {
    expect(text("client_cancelled", "fr")).toContain("41,20 €");
    const kept = text("client_cancelled", "fr", { ...DATA, refundedEur: 0 });
    expect(kept).toContain("48");
  });

  it("partner_client_cancelled : le loueur apprend l'annulation, sans coordonnée du client", () => {
    const t = text("partner_client_cancelled", "fr");
    expect(t).toContain("2027-07-20");
    expect(t).toContain("Heraklion Airport");
    for (const c of CLIENT_CONTACT) expect(t).not.toContain(c);
  });

  it("une locale non servie retombe sur l'anglais", () => {
    expect(text("client_pending", "it")).toBe(text("client_pending", "en"));
  });

  it("échappe le HTML d'un nom saisi par le client", () => {
    const t = text("partner_confirmed", "en", {
      ...DATA,
      customer: { name: "<script>x</script>", phone: "1", email: "a@b.c" },
    });
    expect(t).not.toContain("<script>");
    expect(t).toContain("&lt;script&gt;");
  });

  it("aucun texte, dans aucune langue, ne contient de tiret cadratin ni le mot Kairos", () => {
    for (const kind of DEPOSIT_MAIL_KINDS) {
      for (const locale of ["en", "fr", "de", "el"]) {
        const t = text(kind, locale);
        expect(t, `${kind}/${locale}`).not.toContain(EM_DASH);
        expect(t.toLowerCase(), `${kind}/${locale}`).not.toContain("kairos");
      }
    }
  });
});
