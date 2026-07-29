import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  EMAIL_LOCALES,
  pickEmailLocale,
  fallbackListingTitle,
  ownerRequestSubject,
  ownerRequestBody,
  guestApprovedSubject,
  guestApprovedBody,
  guestReceivedSubject,
  guestReceivedBody,
  guestConflictSubject,
  guestConflictBody,
  guestConfirmedSubject,
  guestConfirmedBody,
  guestBalanceDueSubject,
  guestBalanceDueBody,
  guestBalancePaidSubject,
  guestBalancePaidBody,
  guestExpiredSubject,
  guestExpiredBody,
  ownerBookedSubject,
  ownerBookedBody,
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
    expect(ownerRequestSubject("2026-07-01", "2026-07-08", "fr")).toContain("2026-07-01");
  });
  it("owner request body embeds the approve link", () => {
    const html = ownerRequestBody(
      {
        guestName: "Jane",
        dateFrom: "2026-07-01",
        dateTo: "2026-07-08",
        pax: 2,
        approveUrl: "https://crete.direct/fr/stays/approve/tok-1",
      },
      "fr",
    );
    expect(html).toContain("https://crete.direct/fr/stays/approve/tok-1");
    expect(html).toContain("Jane");
  });
  it("guest approved subject is celebratory", () => {
    expect(guestApprovedSubject("Sea view villa", "fr")).toContain("Sea view villa");
  });

  it("accuse reception de la demande au voyageur", () => {
    expect(guestReceivedSubject("Villa Danae", "fr")).toContain("Villa Danae");
    const html = guestReceivedBody(
      { listingTitle: "Villa Danae", dateFrom: "2026-08-01", dateTo: "2026-08-08" },
      "fr",
    );
    expect(html).toContain("2026-08-01");
    expect(html).toMatch(/rien n'est prélevé/i);
    // Le délai est désormais TENU par /api/cron/stays-expire, livré le 30/07.
    // Ce test était l'inverse tant que le cron n'existait pas : il a servi de
    // garde-fou contre une promesse invérifiable, et il bascule avec le produit.
    expect(html).toMatch(/\b7 jours\b/);
  });

  it("annonce le remboursement integral au voyageur", () => {
    expect(guestConflictSubject("Villa Danae", "fr")).toContain("Villa Danae");
    const html = guestConflictBody(
      { listingTitle: "Villa Danae", amountEur: 220.5 },
      "fr",
    );
    expect(html).toContain("220.50");
    expect(html).toMatch(/rembours/i);
  });
});

// ── Quatre langues ──────────────────────────────────────────────────────────
// Les pages /stays servent en/fr/de/el, les emails partaient en francais seul :
// un voyageur allemand recevait du francais. Chaque email est desormais un
// dictionnaire par locale, avec repli anglais, sur le patron de ownerWelcome.

/** Un cas par email : de quoi construire un sujet et un corps dans une locale. */
const CASES = [
  {
    name: "ownerRequest",
    subject: (l: string) => ownerRequestSubject("2026-08-01", "2026-08-08", l),
    body: (l: string) =>
      ownerRequestBody(
        {
          guestName: "Jane",
          dateFrom: "2026-08-01",
          dateTo: "2026-08-08",
          pax: 2,
          approveUrl: "https://crete.direct/fr/stays/approve/tok",
        },
        l,
      ),
    mustContain: ["Jane", "https://crete.direct/fr/stays/approve/tok"],
  },
  {
    name: "guestReceived",
    subject: (l: string) => guestReceivedSubject("Villa Danae", l),
    body: (l: string) =>
      guestReceivedBody(
        { listingTitle: "Villa Danae", dateFrom: "2026-08-01", dateTo: "2026-08-08" },
        l,
      ),
    mustContain: ["Villa Danae", "2026-08-01", "2026-08-08"],
  },
  {
    name: "guestApproved",
    subject: (l: string) => guestApprovedSubject("Villa Danae", l),
    body: (l: string) =>
      guestApprovedBody(
        {
          listingTitle: "Villa Danae",
          guestTotalEur: 735,
          depositEur: 220.5,
          payUrl: "https://crete.direct/fr/stays/pay/tok",
        },
        l,
      ),
    mustContain: ["735.00", "220.50", "https://crete.direct/fr/stays/pay/tok"],
  },
  {
    name: "guestConfirmed",
    subject: (l: string) => guestConfirmedSubject("Villa Danae", l),
    body: (l: string) => guestConfirmedBody("Villa Danae", l),
    mustContain: ["Villa Danae"],
  },
  {
    name: "guestConflict",
    subject: (l: string) => guestConflictSubject("Villa Danae", l),
    body: (l: string) => guestConflictBody({ listingTitle: "Villa Danae", amountEur: 220.5 }, l),
    mustContain: ["Villa Danae", "220.50"],
  },
  {
    name: "guestBalanceDue",
    subject: (l: string) => guestBalanceDueSubject("Villa Danae", l),
    body: (l: string) =>
      guestBalanceDueBody(
        {
          listingTitle: "Villa Danae",
          dateFrom: "2026-08-01",
          amountEur: 514.5,
          payUrl: "https://crete.direct/fr/stays/balance/tok",
        },
        l,
      ),
    mustContain: ["514.50", "https://crete.direct/fr/stays/balance/tok"],
  },
  {
    name: "guestBalancePaid",
    subject: (l: string) => guestBalancePaidSubject("Villa Danae", l),
    body: (l: string) => guestBalancePaidBody("Villa Danae", l),
    mustContain: ["Villa Danae"],
  },
  {
    name: "guestExpired",
    subject: (l: string) => guestExpiredSubject("Villa Danae", l),
    body: (l: string) =>
      guestExpiredBody(
        { listingTitle: "Villa Danae", dateFrom: "2026-08-01", dateTo: "2026-08-08" },
        l,
      ),
    mustContain: ["Villa Danae", "2026-08-01"],
  },
  {
    name: "ownerBooked",
    subject: (l: string) => ownerBookedSubject("2026-08-01", "2026-08-08", l),
    body: (l: string) =>
      ownerBookedBody(
        {
          listingTitle: "Villa Danae",
          guestName: "Jane",
          guestEmail: "jane@example.com",
          guestPhone: "+33600000000",
          dateFrom: "2026-08-01",
          dateTo: "2026-08-08",
          ownerNetEur: 700,
          depositEur: 220.5,
        },
        l,
      ),
    mustContain: ["jane@example.com", "700.00"],
  },
] as const;

describe("choix de la locale d un email", () => {
  it("garde les quatre langues redigees", () => {
    expect([...EMAIL_LOCALES]).toEqual(["en", "fr", "de", "el"]);
  });

  it("retombe sur l anglais pour une locale non redigee", () => {
    expect(pickEmailLocale("ru")).toBe("en");
    expect(pickEmailLocale("it")).toBe("en");
    expect(pickEmailLocale("")).toBe("en");
    expect(pickEmailLocale(null)).toBe("en");
    expect(pickEmailLocale(undefined)).toBe("en");
  });

  it("respecte une locale redigee", () => {
    expect(pickEmailLocale("fr")).toBe("fr");
    expect(pickEmailLocale("de")).toBe("de");
    expect(pickEmailLocale("el")).toBe("el");
    expect(pickEmailLocale("en")).toBe("en");
  });
});

describe.each(CASES)("email $name en quatre langues", (c) => {
  it("existe dans les quatre langues, jamais deux fois le meme texte", () => {
    const bodies = EMAIL_LOCALES.map((l) => c.body(l));
    expect(new Set(bodies).size).toBe(EMAIL_LOCALES.length);
    const subjects = EMAIL_LOCALES.map((l) => c.subject(l));
    expect(new Set(subjects).size).toBe(EMAIL_LOCALES.length);
  });

  it("ecrit vraiment du grec en el", () => {
    expect(c.body("el")).toMatch(/[Α-Ωα-ωίϊΐόάέύϋΰήώ]/);
    expect(c.subject("el")).toMatch(/[Α-Ωα-ωίϊΐόάέύϋΰήώ]/);
  });

  it("retombe sur l anglais pour une langue non redigee", () => {
    expect(c.body("it")).toBe(c.body("en"));
    expect(c.subject("it")).toBe(c.subject("en"));
  });

  it("garde les liens, les montants et les dates dans toutes les langues", () => {
    for (const l of EMAIL_LOCALES) {
      const body = c.body(l);
      for (const needle of c.mustContain) {
        expect(body, `${c.name} ${l} doit contenir ${needle}`).toContain(needle);
      }
    }
  });

  it("ne contient aucun tiret cadratin", () => {
    // Gate check:da, regle R11 : le tiret cadratin est banni de toute surface.
    // Ecrit en echappement unicode, sinon ce test se fait refuser par le gate
    // qu'il sert justement a doubler.
    const emDash = "\u2014";
    for (const l of EMAIL_LOCALES) {
      expect(c.body(l)).not.toContain(emDash);
      expect(c.subject(l)).not.toContain(emDash);
    }
  });

  it("ne promet aucun revenu garanti", () => {
    // Regle Kairos : jamais de garantie de revenus dans un texte sortant.
    for (const l of EMAIL_LOCALES) {
      expect(c.body(l)).not.toMatch(/garanti|guaranteed|garantiert|εγγυημ/i);
    }
  });
});

describe("titre de repli quand l annonce n a pas de nom", () => {
  // Un titre de repli francais glisse dans un email allemand est exactement le
  // defaut qu on corrige : le repli est traduit lui aussi.
  it("est ecrit dans chacune des quatre langues", () => {
    const titles = EMAIL_LOCALES.map((l) => fallbackListingTitle(l));
    expect(new Set(titles).size).toBe(EMAIL_LOCALES.length);
    expect(fallbackListingTitle("fr")).toMatch(/séjour/i);
    expect(fallbackListingTitle("el")).toMatch(/[Α-Ωα-ω]/);
    expect(fallbackListingTitle("ru")).toBe(fallbackListingTitle("en"));
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

describe("coherence entre l accuse de reception et le cron d expiration", () => {
  it("annonce le meme delai que celui applique par le cron, dans les quatre langues", async () => {
    // Promettre un delai qu on ne tient pas est pire que ne rien promettre :
    // ce test casse si l un des deux bouge sans l autre. La verification porte
    // sur les 4 langues : traduire ne doit pas faire deriver la promesse.
    const { EXPIRY_DAYS } = await import("../../app/api/cron/stays-expire/route");
    for (const l of EMAIL_LOCALES) {
      const body = guestReceivedBody(
        { listingTitle: "Villa", dateFrom: "2026-08-01", dateTo: "2026-08-05" },
        l,
      );
      expect(body, `accuse de reception ${l}`).toContain(String(EXPIRY_DAYS));
    }
    // Le francais garde sa formulation exacte, celle que Kami relit.
    expect(
      guestReceivedBody(
        { listingTitle: "Villa", dateFrom: "2026-08-01", dateTo: "2026-08-05" },
        "fr",
      ),
    ).toContain(`${EXPIRY_DAYS} jours`);
  });
});
