// Régénère public/og-home.jpg = screenshot du hero de la home en 1200x630 (@2x),
// utilisé comme aperçu social (Open Graph / Twitter) du lien partagé crete.direct.
// Playwright n'est pas une dépendance du repo : lancer via un install existant, ex.
//   node scripts/capture-og-home.mjs            (EN -> public/og-home.jpg)
//   OG_URL=https://crete.direct/fr OG_OUT=$PWD/public/og-home-fr.jpg node scripts/capture-og-home.mjs   (FR)
// À rejouer après toute refonte visuelle du hero.
import { chromium } from "playwright";

const TARGET = process.env.OG_URL || "https://crete.direct/en";
const OUT = process.env.OG_OUT || new URL("../public/og-home.jpg", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
// Le barometre du hero affiche l'escale du jour, nom du navire et horaires
// compris. Une image OG est figee jusqu'a la prochaine capture : elle
// annoncerait « Marella Voyager 07:00-15:00 » pendant des semaines. On coupe
// donc /api/island-now pendant la capture, le panneau se limite a la ligne mer
// (rendue cote serveur), qui vieillit sans mentir sur un fait precis.
await page.route("**/api/island-now", (route) => route.abort());
await page.goto(TARGET, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(4500); // laisse l'animation GSAP du hero se poser
await page.screenshot({ path: OUT, type: "jpeg", quality: 88 });
await browser.close();
console.log("OK ->", OUT);
