// Captures /fr/match : idle, mode proche (Makrigialos), mode prépa (Paris).
// Préalable : npm run dev sur :3000. Run: node scripts/capture-match-geo.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000/fr/match";
const shots = [
  { name: "match-geo-idle", geo: null },
  { name: "match-geo-near", geo: { lat: 35.04, lon: 25.97, status: "granted" } },
  { name: "match-geo-prep", geo: { lat: 48.85, lon: 2.35, status: "granted" } },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  if (s.geo) {
    await ctx.addInitScript((g) => sessionStorage.setItem("cd-geo", JSON.stringify(g)), s.geo);
  }
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  // passer l'onboarding intérêts si présent
  const all = page.getByText(/Tout me va/);
  if (await all.isVisible().catch(() => false)) await all.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `.playwright-tmp/${s.name}.png`, fullPage: false });
  await ctx.close();
}
await browser.close();
console.log("captures OK dans .playwright-tmp/");
