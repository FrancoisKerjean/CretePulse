// Génère public/og-crete-2026-{en,fr,de,el}.jpg (1200 x 630), aperçus sociaux de /[locale]/crete-2026.
// Image statique : la route /api/og a des erreurs satori connues, la page n'en dépend pas.
// Playwright n'est pas une dépendance du dépôt : lancer via une installation existante, ex.
//   PLAYWRIGHT_MODULE=file:///C:/Users/fkerj/crete-direct-instagram/node_modules/playwright/index.mjs node scripts/og-crete-2026.mjs
// Les chiffres affichés sont ceux de la page (bilan validé du 30/09/2026) : les changer ici ET dans src/lib/crete-2026.ts.
import path from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

const COPY = {
  fr: { kicker: "crete.direct · bilan de saison", l1: "L’été 2026", pre: "en ", hl: "Crète", stats: [["10,5 M", "passagers aériens"], ["27 333", "annonces Airbnb"], ["8 031 ha", "brûlés, un record"]] },
  en: { kicker: "crete.direct · season review", l1: "Summer 2026", pre: "in ", hl: "Crete", stats: [["10.5M", "air passengers"], ["27,333", "Airbnb listings"], ["8,031 ha", "burned, a record"]] },
  de: { kicker: "crete.direct · Saisonbilanz", l1: "Sommer 2026", pre: "auf ", hl: "Kreta", stats: [["10,5 Mio.", "Fluggäste"], ["27.333", "Airbnb-Inserate"], ["8.031 ha", "verbrannt, ein Rekord"]] },
  el: { kicker: "crete.direct · απολογισμός σεζόν", l1: "Καλοκαίρι 2026", pre: "στην ", hl: "Κρήτη", stats: [["10,5 εκ.", "αεροπορικοί επιβάτες"], ["27.333", "καταχωρίσεις Airbnb"], ["8.031 ha", "καμένα, ρεκόρ"]] },
};

// lang = locale : en grec, les capitales CSS perdent leurs accents (règle typographique).
// Même chèvre que src/components/campagne/GoatStanding.tsx.
const GOAT = `<svg viewBox="0 0 130 150" width="230" height="265" overflow="visible"><g stroke="#0B3954" stroke-width="3"><rect x="44" y="106" width="12" height="36" rx="6" fill="#D8BE96"/><rect x="74" y="106" width="12" height="36" rx="6" fill="#D8BE96"/><rect x="44" y="136" width="12" height="9" rx="3" fill="#0B3954"/><rect x="74" y="136" width="12" height="9" rx="3" fill="#0B3954"/></g><path d="M99 96 q14 -3 12 -17 q-3 10 -12 8 Z" fill="#E8D2AE" stroke="#0B3954" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="64" cy="98" rx="41" ry="31" fill="#F5E9D2" stroke="#0B3954" stroke-width="3.2"/><g stroke="#0B3954" stroke-width="3"><rect x="50" y="116" width="12" height="30" rx="6" fill="#E8D2AE"/><rect x="68" y="116" width="12" height="30" rx="6" fill="#E8D2AE"/><rect x="50" y="140" width="12" height="9" rx="3" fill="#0B3954"/><rect x="68" y="140" width="12" height="9" rx="3" fill="#0B3954"/></g><path d="M48 92 q16 15 32 0 q-4 17 -16 17 q-12 0 -16 -17 Z" fill="#FFF9EC" opacity=".75"/><ellipse cx="32" cy="54" rx="13" ry="7" transform="rotate(-24 32 54)" fill="#D8BE96" stroke="#0B3954" stroke-width="3"/><ellipse cx="96" cy="54" rx="13" ry="7" transform="rotate(24 96 54)" fill="#D8BE96" stroke="#0B3954" stroke-width="3"/><g fill="#CBA96B" stroke="#0B3954" stroke-width="3" stroke-linejoin="round"><path d="M52 38 C42 24 36 13 33 5 C44 11 54 24 60 35 Z"/><path d="M76 38 C86 24 92 13 95 5 C84 11 74 24 68 35 Z"/></g><g stroke="#0B3954" stroke-width="1.5" opacity=".4" fill="none"><path d="M46 28 q4 -2 7 0 M42 19 q4 -2 7 0 M82 28 q-4 -2 -7 0 M86 19 q-4 -2 -7 0"/></g><path d="M64 32 C42 32 36 50 38 64 C40 82 52 92 64 92 C76 92 88 82 90 64 C92 50 86 32 64 32 Z" fill="#F5E9D2" stroke="#0B3954" stroke-width="3.2"/><ellipse cx="64" cy="74" rx="16" ry="12" fill="#FFF9EC"/><circle cx="59" cy="73" r="1.7" fill="#0B3954"/><circle cx="69" cy="73" r="1.7" fill="#0B3954"/><path d="M57 80 q7 5 14 0" stroke="#0B3954" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M59 88 q5 13 5 17 q0 -4 5 -17 Z" fill="#E8D2AE" stroke="#0B3954" stroke-width="2.4" stroke-linejoin="round"/><circle cx="47" cy="68" r="5" fill="#ED7A5C" opacity=".3"/><circle cx="81" cy="68" r="5" fill="#ED7A5C" opacity=".3"/><circle cx="54" cy="58" r="5" fill="#0B3954"/><circle cx="56" cy="56" r="1.9" fill="#fff"/><circle cx="74" cy="58" r="5" fill="#0B3954"/><circle cx="76" cy="56" r="1.9" fill="#fff"/><path d="M58 33 q6 -7 12 0 q-6 -3 -12 0 Z" fill="#E8D2AE" stroke="#0B3954" stroke-width="2"/></svg>`;

const html = (c, loc) => `<!doctype html><html lang="${loc}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Comfortaa:wght@600;700&display=block">
<style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:'Baloo 2','Comfortaa',sans-serif;color:#07374A;
  background:radial-gradient(55% 90% at 8% 10%,rgba(255,200,61,.32),transparent 60%),linear-gradient(135deg,#16cfe0 0%,#00C2D4 46%,#009fb0 100%);position:relative}
.sun{position:absolute;width:300px;height:300px;left:-90px;top:-110px;border-radius:50%;background:radial-gradient(circle,#FFD766 0%,#FFC83D 62%,rgba(255,200,61,0) 72%)}
.wrap{position:absolute;left:72px;top:64px;right:340px}
.k{font-weight:700;font-size:24px;letter-spacing:.14em;text-transform:uppercase}
h1{font-weight:800;font-size:${loc === "el" ? 86 : 108}px;line-height:.92;letter-spacing:-.03em;margin-top:14px}
.hl{color:#fff;text-shadow:0 3px 22px rgba(11,94,120,.4)}
.goat{position:absolute;right:86px;top:120px}
.stats{position:absolute;left:0;right:0;bottom:0;height:150px;background:#07374A;display:flex;align-items:center;gap:0;padding:0 72px}
.stats div{flex:1;color:#E8F4F6;font-size:22px;font-weight:600;line-height:1.2}
.stats b{display:block;color:#FFC83D;font-size:46px;font-weight:800;letter-spacing:-.02em;line-height:1}
</style></head><body><div class="sun"></div>
<div class="wrap"><div class="k">${c.kicker}</div><h1>${c.l1}<br>${c.pre}<span class="hl">${c.hl}</span></h1></div>
<div class="goat">${GOAT}</div>
<div class="stats">${c.stats.map(([n, l]) => `<div><b>${n.replace(/ /g, "&nbsp;")}</b>${l}</div>`).join("")}</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const [loc, c] of Object.entries(COPY)) {
  await page.setContent(html(c, loc), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(OUT, `og-crete-2026-${loc}.jpg`);
  await page.screenshot({ path: out, type: "jpeg", quality: 86 });
  console.log("OK ->", out);
}
await browser.close();
