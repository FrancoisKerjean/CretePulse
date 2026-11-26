// Aperçu statique des e-mails de l'acompte voiture : un fichier HTML par type et
// par langue dans docs/mockups/car-deposit-mails/, habillé par la même coquille
// que les envois réels (kalimeraShell). N'envoie rien : le client Resend est
// construit avec une clé factice et n'est jamais appelé.
// Usage : node scripts/preview-car-deposit-mails.mjs
import { createServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.RESEND_API_KEY ||= "re_dummy_preview_only";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "mockups", "car-deposit-mails");

// Même alias que vitest.config.ts, aucune dépendance ajoutée.
const vite = await createServer({
  root,
  configFile: false,
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true, hmr: false, ws: false },
  resolve: { alias: { "@": path.join(root, "src") } },
});

try {
  const { depositMail, DEPOSIT_MAIL_KINDS } = await vite.ssrLoadModule("/src/lib/car-deposit-mail.ts");
  const { kalimeraShell } = await vite.ssrLoadModule("/src/lib/email.ts");

  // Données fictives : 312 EUR, commission 0,10, acompte 31,20 EUR.
  const data = {
    partnerName: "Test Rentals Heraklion",
    carLabel: "Compact (Fiat Panda or similar)",
    pickupLabel: "Heraklion airport",
    dateFrom: "2027-06-12",
    timeFrom: "10:00",
    dateTo: "2027-06-19",
    timeTo: "10:00",
    totalEur: 312,
    depositEur: 31.2,
    deadlineIso: "2027-06-02T09:30:00.000Z",
    confirmUrl: "https://crete.direct/en/car-rental/partner-confirm/tok_fake_confirm_123",
    offersUrl: "https://crete.direct/en/car-rental/offers/tok_fake_offers_456",
    manageUrl: "https://crete.direct/en/car-rental/offers/tok_fake_offers_456",
    refundReason: "partner_declined",
    refundedEur: 31.2,
    insurance: { type: "cdw", excessEur: 800, upsellPerDay: 7 },
    partnerContact: {
      name: "Test Rentals Heraklion",
      phone: "+30 000 000 0000",
      whatsapp: "+30 000 000 0000",
      email: "contact@test-rentals.example",
      address: "1 Example Street, Heraklion",
    },
    bookingStatus: "confirmed",
    invoice: {
      number: "CD-2027-0001",
      url: "https://crete.direct/invoices/fake-invoice-0001",
      baseEur: 312,
      ratePct: "10",
      commissionEur: 31.2,
      depositPaidOn: "2027-05-20",
    },
    ratesExpiry: { lastDay: "2027-03-31", portalUrl: "https://crete.direct/en/partner/portal/tok_fake_portal_789" },
    customer: { name: "Anna Müller", phone: "+49 000 000 0000", email: "anna.mueller@example.com" },
  };

  const LOCALES = ["en", "fr", "de", "el"];
  const EMDASH = String.fromCharCode(8212);
  const BAD = ["undefined", "null", "NaN", EMDASH];

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const rows = [];
  const errors = [];
  for (const kind of DEPOSIT_MAIL_KINDS) {
    const isPartner = kind.startsWith("partner_");
    for (const locale of isPartner ? [null] : LOCALES) {
      const mail = depositMail(kind, data, locale ?? "en");
      const file = locale ? `${kind}.${locale}.html` : `${kind}.html`;
      for (const bad of BAD) {
        if (mail.subject.includes(bad)) errors.push(`${file} : sujet contient "${bad}"`);
        if (mail.html.includes(bad)) errors.push(`${file} : corps contient "${bad}"`);
      }
      const page =
        `<!doctype html><html><head><meta charset="utf-8">` +
        `<meta name="viewport" content="width=device-width, initial-scale=1">` +
        `<title>${mail.subject.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title></head>` +
        `<body style="margin:0">${kalimeraShell(mail.html)}</body></html>`;
      fs.writeFileSync(path.join(outDir, file), page, "utf8");
      rows.push({ file, kind, locale: locale ?? "en (loueur)", subject: mail.subject });
    }
  }

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const index =
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Aperçus des e-mails d'acompte</title>` +
    `<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#0B3954}` +
    `table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #DCE9EE;padding:6px 8px;text-align:left;font-size:14px}</style></head><body>` +
    `<h1>Aperçus des e-mails d'acompte</h1><p>${rows.length} fichiers. Données fictives.</p>` +
    `<table><tr><th>Type</th><th>Langue</th><th>Sujet</th></tr>` +
    rows.map((r) => `<tr><td><a href="${r.file}">${r.file}</a></td><td>${esc(r.locale)}</td><td>${esc(r.subject)}</td></tr>`).join("") +
    `</table></body></html>`;
  fs.writeFileSync(path.join(outDir, "index.html"), index, "utf8");

  if (errors.length) {
    console.error("ECHEC :\n" + errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`${rows.length} aperçus écrits dans ${outDir}`);
  }
} finally {
  await vite.close();
}
