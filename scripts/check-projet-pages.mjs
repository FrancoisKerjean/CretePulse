// Verif Playwright des 3 routes /projet (visiteur/institutions/entreprises) en FR+EN.
// Lancer avec le chromium de crete-direct-instagram, dev server sur BASE.
//   cd C:/Users/fkerj/crete-direct-instagram
//   BASE=http://localhost:3100 node C:/Users/fkerj/cretepulse-projet-publics/scripts/check-projet-pages.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3100";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
let fails = 0;

const urls = [
  "/fr/projet", "/en/projet",
  "/fr/projet/institutions", "/en/projet/institutions",
  "/fr/projet/entreprises", "/en/projet/entreprises",
];
for (const url of urls) {
  try {
    const r = await p.goto(BASE + url, { waitUntil: "networkidle", timeout: 60000 });
    const status = r ? r.status() : 0;
    const tabs = await p.locator("nav[aria-label='public'] a").count();
    if (status !== 200 || tabs < 3) { console.error("FAIL", url, "status=", status, "tabs=", tabs); fails++; }
    else console.log("OK", url, "tabs=", tabs);
  } catch (e) {
    console.error("FAIL", url, String(e).split("\n")[0]); fails++;
  }
}

// formulaire present sur institutions + entreprises
for (const url of ["/fr/projet/institutions", "/fr/projet/entreprises"]) {
  await p.goto(BASE + url, { waitUntil: "networkidle" });
  const hasForm = await p.locator("form button[type=submit]").count();
  if (hasForm < 1) { console.error("FAIL form", url); fails++; }
  else console.log("OK form", url);
}

await b.close();
console.log(fails ? `ECHEC: ${fails} probleme(s)` : "TOUT VERT");
process.exit(fails ? 1 : 0);
