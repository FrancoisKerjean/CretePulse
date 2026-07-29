import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ownerRequestSubject,
  ownerRequestBody,
  guestApprovedSubject,
  guestReceivedSubject,
  guestReceivedBody,
  guestConflictSubject,
  guestConflictBody,
} from "./emails";

describe("cloisonnement crete.direct", () => {
  // feedback_crete_direct_no_kairos_mention : aucune surface crete.direct ne doit
  // exposer Kairos. Un replyTo est visible dans le client mail du voyageur.
  it("n expose aucune adresse Kairos", () => {
    const src = readFileSync("src/lib/stays/emails.ts", "utf8");
    expect(src).not.toMatch(/kairos/i);
  });
});

describe("fiabilite des envois", () => {
  // Le SDK Resend ne leve pas sur erreur d'API, il renvoie { data, error }. Un
  // await nu perd l'echec en silence : le proprietaire ne recoit rien et rien ne
  // le signale. La lecture de `error` est donc une garantie, pas un detail.
  it("lit l erreur renvoyee par Resend au lieu de l ignorer", () => {
    const src = readFileSync("src/lib/stays/emails.ts", "utf8");
    expect(src).toMatch(/const \{ error \} = await resendClient\(\)\.emails\.send/);
    expect(src).toMatch(/if \(error\)/);
  });
});

describe("email builders", () => {
  it("owner request subject names the dates", () => {
    expect(ownerRequestSubject("2026-07-01", "2026-07-08")).toContain("2026-07-01");
  });
  it("owner request body embeds the approve link", () => {
    const html = ownerRequestBody({
      guestName: "Jane",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-08",
      pax: 2,
      approveUrl: "https://crete.direct/fr/stays/approve/tok-1",
    });
    expect(html).toContain("https://crete.direct/fr/stays/approve/tok-1");
    expect(html).toContain("Jane");
  });
  it("guest approved subject is celebratory", () => {
    expect(guestApprovedSubject("Sea view villa")).toContain("Sea view villa");
  });

  it("accuse reception de la demande au voyageur", () => {
    expect(guestReceivedSubject("Villa Danae")).toContain("Villa Danae");
    const html = guestReceivedBody({
      listingTitle: "Villa Danae",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-08",
    });
    expect(html).toContain("2026-08-01");
    expect(html).toMatch(/rien n'est prélevé/i);
    // Aucune promesse d'expiration : le cron correspondant n'existe pas encore.
    expect(html).not.toMatch(/\b7 jours\b|expire/i);
  });

  it("annonce le remboursement integral au voyageur", () => {
    expect(guestConflictSubject("Villa Danae")).toContain("Villa Danae");
    const html = guestConflictBody({ listingTitle: "Villa Danae", amountEur: 220.5 });
    expect(html).toContain("220.50");
    expect(html).toMatch(/rembours/i);
  });
});
