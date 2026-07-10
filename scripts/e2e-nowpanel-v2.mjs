// scripts/e2e-nowpanel-v2.mjs : capture NowPanel sur /explore, geoloc simulee Heraklion.
// Usage : BASE_URL=... SHOT=... node scripts/e2e-nowpanel-v2.mjs
import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT = process.env.SHOT ?? "shots/nowpanel-v2-after.png";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices["iPhone 13"],
  geolocation: { latitude: 35.339, longitude: 25.133 },
  permissions: ["geolocation"],
  locale: "fr",
});
const page = await ctx.newPage();
await page.goto(`${BASE}/fr/explore`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(5000); // hydratation
await page.getByRole("button", { name: /near me|autour de moi/i }).first().click();
await page.waitForTimeout(6000); // fetchs swim-near + nearest-stop + scrollIntoView
await page.screenshot({ path: SHOT });
const calls = await page.evaluate(() =>
  performance.getEntriesByType("resource")
    .filter((r) => r.name.includes("swim-near") || r.name.includes("swim-now"))
    .map((r) => r.name),
);
console.log(`capture: ${SHOT}`);
console.log(`appels swim: ${JSON.stringify(calls)}`);
await browser.close();
