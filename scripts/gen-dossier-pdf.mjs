// Genere les PDF du dossier institutions depuis le one-pager autorites valide.
// One-off : lancer avec le chromium de crete-direct-instagram (cf project_crete_direct_campagne).
//   cd C:/Users/fkerj/crete-direct-instagram
//   node C:/Users/fkerj/cretepulse-projet-publics/scripts/gen-dossier-pdf.mjs
import { chromium } from "playwright";

const SRC = "file:///C:/Users/fkerj/Desktop/crete-direct-onepager-autorites.html";
const OUT = "C:/Users/fkerj/cretepulse-projet-publics/public/dossiers";

const b = await chromium.launch();
const p = await b.newPage();
await p.goto(SRC, { waitUntil: "networkidle" });

for (const lang of ["fr", "en"]) {
  await p.evaluate((l) => window.setLang && window.setLang(l), lang);
  await p.waitForTimeout(300);
  await p.pdf({ path: `${OUT}/crete-direct-institutions-${lang}.pdf`, format: "A4", printBackground: true });
  console.log("PDF genere:", lang);
}

await b.close();
