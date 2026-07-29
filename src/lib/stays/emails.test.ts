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
  ownerWelcomeBody,
  ownerWelcomeSubject,
  ownerWelcomeHtml,
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

describe("email d accueil du proprietaire", () => {
  const o = {
    ownerName: "Maria",
    listingTitle: "Villa Danae",
    spaceUrl: "https://crete.direct/fr/stays/owner/tok-123",
    icalExportUrl: "https://crete.direct/api/stays/ical/villa-danae",
  };

  it("donne le lien de l espace et dit qu il ne faut pas le perdre", () => {
    const body = ownerWelcomeBody(o, "fr");
    expect(body).toContain(o.spaceUrl);
    // Sans compte ni mot de passe, ce lien EST l acces : le dire explicitement.
    expect(body).toMatch(/gardez|conservez/i);
  });

  it("donne le lien iCal a coller dans Airbnb", () => {
    const body = ownerWelcomeBody(o, "fr");
    expect(body).toContain(o.icalExportUrl);
    expect(body).toMatch(/airbnb/i);
  });

  it("existe dans les quatre langues, sans retomber sur l anglais par accident", () => {
    const fr = ownerWelcomeBody(o, "fr");
    const de = ownerWelcomeBody(o, "de");
    const el = ownerWelcomeBody(o, "el");
    expect(fr).not.toBe(de);
    expect(de).not.toBe(el);
    expect(el).toMatch(/[Α-Ωα-ω]/);
  });

  it("retombe sur l anglais pour une langue non redigee", () => {
    expect(ownerWelcomeBody(o, "it")).toBe(ownerWelcomeBody(o, "en"));
  });

  it("nomme le logement dans le sujet", () => {
    expect(ownerWelcomeSubject("Villa Danae", "fr")).toContain("Villa Danae");
  });

  it("ne promet aucun revenu", () => {
    // Regle Kairos : jamais de garantie de revenus dans un texte sortant.
    for (const l of ["en", "fr", "de", "el"]) {
      expect(ownerWelcomeBody(o, l)).not.toMatch(/garanti|guaranteed|garantiert/i);
    }
  });
});

describe("mise en forme HTML de l accueil", () => {
  const o = {
    ownerName: "Maria", listingTitle: "Villa Danae",
    spaceUrl: "https://crete.direct/fr/stays/owner/tok",
    icalExportUrl: "https://crete.direct/api/stays/ical/villa",
  };

  it("rend chaque ligne en paragraphe, pas un bloc illisible", () => {
    // send() envoie du HTML : sans conversion, tout le message arriverait colle.
    const html = ownerWelcomeHtml(o, "fr");
    expect(html.match(/<p /g)?.length ?? 0).toBeGreaterThan(4);
  });

  it("rend les deux liens cliquables", () => {
    const html = ownerWelcomeHtml(o, "fr");
    expect(html).toContain(`href="${o.spaceUrl}"`);
    expect(html).toContain(`href="${o.icalExportUrl}"`);
  });

  it("ne laisse aucune ligne vide produire un paragraphe fantome", () => {
    expect(ownerWelcomeHtml(o, "fr")).not.toContain("<p style=\"margin:0 0 12px\"></p>");
  });
});
