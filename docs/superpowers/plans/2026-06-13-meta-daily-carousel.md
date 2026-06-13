# Carrousel quotidien « Aujourd'hui en Crète » (Kalimera + Kriri) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le carrousel news off-édito (désinstallé le 13/06) par un carrousel Instagram quotidien « utilité » branché sur le feed `swim-today`, rendu dans la charte Kalimera avec la mascotte Kriri en présentateur (zéro photo plein cadre), posté à 19:00 Athens.

**Architecture:** On réutilise l'infra du projet `crete-direct-instagram` (génération HTML → render PNG via Playwright → upload Graph API), mais on crée des **fichiers neufs swim/Kalimera à côté** des fichiers news existants (qu'on ne touche pas, le pipeline news est mort). Données = un seul fetch sur `{SITE}/api/internal/swim-today`. Le générateur écrit `out/<date>/carousel.html` + `carousel.json` (qui embarque la légende). Le renderer screenshote chaque `.slide` en 1080×1350. L'uploader lit `carousel.json.caption` et publie N slides via Graph v22.0 (token partagé).

**Tech Stack:** Node ESM (`.mjs`), Playwright (chromium headless), HTML/CSS statique (charte Kalimera : Baloo 2 / Comfortaa fallback grec, palette lagon/soleil/terracotta/nuit), Meta Graph API v22.0, cron.d sur VPS `kairos-vps`.

**Repo de travail :** `C:\Users\fkerj\crete-direct-instagram` (miroir Windows) ; déploiement VPS `/opt/crete-direct-instagram`. Pas de branches Git imposées ici (projet hors monorepo site) : commits directs sur le repo du projet.

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `lib/fetch-swim.mjs` | Fetch + normalise le feed `swim-today` | Créer |
| `lib/kriri.mjs` | SVG inline de la mascotte Kriri (4 humeurs) | Créer |
| `lib/render-swim-html.mjs` | Construit le HTML 6 slides (charte Kalimera) + `buildSwimCaption()` | Créer |
| `scripts/generate-swim-carousel.mjs` | Orchestration : fetch → HTML → écrit `carousel.html` + `carousel.json` | Créer |
| `scripts/render-swim-png.mjs` | Playwright : screenshot N slides → PNG 1080×1350 | Créer |
| `scripts/upload-swim-carousel.mjs` | Upload carrousel (lit `carousel.json.caption`, N slides) | Créer |
| `bin/render-daily-carousel.sh` | Wrapper VPS : generate → render → upload | Créer (VPS) |
| `/etc/cron.d/crete-direct-daily-carousel` | Cron 16:00 UTC (19:00 Athens) | Créer (VPS) |
| `tests/*.test.mjs` | Tests node (assertions string + smoke) | Créer |

Les fichiers news existants (`lib/render-html.mjs`, `lib/fetch-daily.mjs`, `scripts/generate-carousel.mjs`, `scripts/render-carousel-png.mjs`, `scripts/upload-instagram-carousel.mjs`) **ne sont pas modifiés**.

**Note test runner :** le projet n'a pas de framework de test. On utilise le runner natif `node --test` (Node ≥ 18). Aucune dépendance à ajouter.

---

### Task 1: Fetch du feed swim-today (`lib/fetch-swim.mjs`)

**Files:**
- Create: `lib/fetch-swim.mjs`
- Test: `tests/fetch-swim.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/fetch-swim.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSwim } from "../lib/fetch-swim.mjs";

const RAW = {
  date: "2026-06-13",
  wind: { cardinal: "NW", minSpeed: 12, maxSpeed: 24 },
  pick: { name: "Anatolika Beach", slug: "anatolika-beach", region: "central",
    imageUrl: "https://x/y.jpg", rating: "calm", windCardinal: "N", windSpeed: 10,
    waveHeight: 0.2, seaTemp: 23, lat: 35.0, lng: 25.7, fromCities: [] },
  alternatives: [
    { name: "Agios Charalampos", slug: "a", region: "west", rating: "calm",
      windCardinal: "N", windSpeed: 8, waveHeight: 0.1, seaTemp: 22, lat: 35.3, lng: 23.6 },
    { name: "B", slug: "b", region: "east", rating: "moderate", windCardinal: "E",
      windSpeed: 15, waveHeight: 0.4, seaTemp: 24, lat: 35.1, lng: 26.2 },
    { name: "C", slug: "c", region: "central", rating: "calm", windCardinal: "S",
      windSpeed: 9, waveHeight: 0.2, seaTemp: 23, lat: 35.0, lng: 25.1 },
    { name: "D", slug: "d", region: "west", rating: "exposed", windCardinal: "W",
      windSpeed: 30, waveHeight: 1.2, seaTemp: 21, lat: 35.5, lng: 23.7 },
  ],
  avoid: [
    { name: "Trachilias", slug: "t", region: "east", rating: "exposed",
      windCardinal: "NW", windSpeed: 32, waveHeight: 1.4, seaTemp: 21, lat: 35.2, lng: 26.3 },
  ],
};

test("normalizeSwim garde le pick et 3 alternatives calmes max", () => {
  const n = normalizeSwim(RAW);
  assert.equal(n.date, "2026-06-13");
  assert.equal(n.pick.name, "Anatolika Beach");
  assert.equal(n.alternatives.length, 3, "exactement 3 alternatives");
  assert.ok(n.alternatives.every(a => a.rating !== "exposed"), "aucune exposée dans les alternatives");
  assert.equal(n.avoid.length >= 1, true);
});

test("normalizeSwim jette si pas de pick", () => {
  assert.throws(() => normalizeSwim({ date: "2026-06-13" }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/fetch-swim.test.mjs`
Expected: FAIL (`Cannot find module '../lib/fetch-swim.mjs'`)

- [ ] **Step 3: Write minimal implementation**

```js
// lib/fetch-swim.mjs
const SITE = process.env.SITE_URL || process.env.CRETE_DIRECT_BASE || "https://crete.direct";
const SECRET = process.env.SWIM_FEED_SECRET || process.env.REVALIDATE_SECRET;

/** Normalise le feed brut : pick + 3 meilleures alternatives non exposées + avoid. */
export function normalizeSwim(raw) {
  if (!raw || !raw.pick) throw new Error("swim feed: pick manquant");
  const alternatives = (raw.alternatives || [])
    .filter((b) => b && b.rating !== "exposed")
    .slice(0, 3);
  const avoid = (raw.avoid || []).slice(0, 2);
  return {
    date: raw.date,
    wind: raw.wind || null,
    pick: raw.pick,
    alternatives,
    avoid,
  };
}

/** Récupère et normalise le feed swim-today pour une date donnée. */
export async function fetchSwim(date) {
  if (!SECRET) throw new Error("SWIM_FEED_SECRET (ou REVALIDATE_SECRET) manquant");
  const url = `${SITE}/api/internal/swim-today?secret=${encodeURIComponent(SECRET)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`swim feed HTTP ${res.status}`);
  const raw = await res.json();
  return normalizeSwim(raw);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/fetch-swim.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd /c/Users/fkerj/crete-direct-instagram
git add lib/fetch-swim.mjs tests/fetch-swim.test.mjs
git commit -m "feat(carousel): fetch + normalize swim-today feed"
```

---

### Task 2: Mascotte Kriri inline SVG (`lib/kriri.mjs`)

**Files:**
- Create: `lib/kriri.mjs`
- Test: `tests/kriri.test.mjs`

Source de vérité du dessin : `cretepulse-build/src/components/KriKri.tsx` (4 humeurs `hello`/`alert`/`empty`/`lost`). On porte le tracé en chaîne SVG réutilisable côté HTML.

- [ ] **Step 1: Write the failing test**

```js
// tests/kriri.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { kriri } from "../lib/kriri.mjs";

test("kriri renvoie un <svg> pour chaque humeur", () => {
  for (const mood of ["hello", "alert", "empty", "lost"]) {
    const svg = kriri(mood);
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/, `${mood} doit être un svg complet`);
    assert.match(svg, /viewBox="0 0 120 96"/);
  }
});

test("kriri hello contient le soleil (signature Καλημέρα)", () => {
  assert.match(kriri("hello"), /#FFC83D/);
});

test("kriri mood inconnu retombe sur hello", () => {
  assert.equal(kriri("wat"), kriri("hello"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/kriri.test.mjs`
Expected: FAIL (`Cannot find module '../lib/kriri.mjs'`)

- [ ] **Step 3: Write minimal implementation**

```js
// lib/kriri.mjs
// Mascotte kri-kri de crete.direct, portée depuis src/components/KriKri.tsx.
// Présentateur des contenus Meta (élévation assumée vs usage discret du site).

const BASE = `
  <path d="M44 36 C28 28 22 12 32 4 C33 15 40 24 51 30 Z" fill="#C98A5B" stroke="#0B3954" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M76 36 C92 28 98 12 88 4 C87 15 80 24 69 30 Z" fill="#C98A5B" stroke="#0B3954" stroke-width="2.6" stroke-linejoin="round"/>
  <ellipse cx="33" cy="50" rx="9" ry="5.5" transform="rotate(-22 33 50)" fill="#E8D2AE" stroke="#0B3954" stroke-width="2.6"/>
  <ellipse cx="87" cy="50" rx="9" ry="5.5" transform="rotate(22 87 50)" fill="#E8D2AE" stroke="#0B3954" stroke-width="2.6"/>
  <ellipse cx="60" cy="58" rx="27" ry="25" fill="#F5E9D2" stroke="#0B3954" stroke-width="2.8"/>
  <ellipse cx="60" cy="67" rx="15" ry="10.5" fill="#FFF9EC"/>
  <circle cx="55.5" cy="66.5" r="1.5" fill="#0B3954"/>
  <circle cx="64.5" cy="66.5" r="1.5" fill="#0B3954"/>
  <path d="M56 82 C57 89 63 89 64 82 C62 84 58 84 56 82 Z" fill="#E8D2AE" stroke="#0B3954" stroke-width="2.4" stroke-linejoin="round"/>
`;

const FACES = {
  hello: `
    <path d="M14 22 v6 M10 28 h-6 M17 30 l-4 4" stroke="#FFC83D" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="20" cy="20" r="7" fill="#FFC83D"/>
    ${BASE}
    <circle cx="50" cy="55" r="3.4" fill="#0B3954"/><circle cx="51.2" cy="53.8" r="1.1" fill="#fff"/>
    <circle cx="70" cy="55" r="3.4" fill="#0B3954"/><circle cx="71.2" cy="53.8" r="1.1" fill="#fff"/>
    <path d="M53 72 q7 5.5 14 0" stroke="#0B3954" stroke-width="2.6" stroke-linecap="round" fill="none"/>
  `,
  alert: `
    <g transform="rotate(-6 60 58)">${BASE}</g>
    <circle cx="50" cy="55" r="3.6" fill="#0B3954"/><circle cx="51.4" cy="53.6" r="1.1" fill="#fff"/>
    <circle cx="70" cy="55" r="3.6" fill="#0B3954"/><circle cx="71.4" cy="53.6" r="1.1" fill="#fff"/>
    <path d="M44 47 l9 -3 M76 47 l-9 -3" stroke="#0B3954" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="60" cy="73" rx="4" ry="5" fill="#0B3954"/>
    <g transform="translate(96,14)">
      <circle r="13" fill="#FFC83D" stroke="#0B3954" stroke-width="2.6"/>
      <path d="M0 -6 v7" stroke="#0B3954" stroke-width="3.4" stroke-linecap="round"/>
      <circle cy="5.5" r="1.9" fill="#0B3954"/>
    </g>
  `,
  empty: `
    ${BASE}
    <circle cx="52" cy="55" r="3.4" fill="#0B3954"/><circle cx="53.4" cy="54" r="1.1" fill="#fff"/>
    <circle cx="72" cy="55" r="3.4" fill="#0B3954"/><circle cx="73.4" cy="54" r="1.1" fill="#fff"/>
    <path d="M54 73 q6 3.5 12 0" stroke="#0B3954" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <text x="97" y="34" font-size="30" font-weight="800" fill="#ED7A5C" font-family="'Baloo 2','Comfortaa',sans-serif">?</text>
  `,
  lost: `
    <g transform="rotate(5 60 58)">${BASE}</g>
    <path d="M50 55 a4 4 0 1 1 4 4 a2.6 2.6 0 0 1 -2.6 -2.6 a1.4 1.4 0 0 1 1.4 -1.4" stroke="#0B3954" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M70 55 a4 4 0 1 1 4 4 a2.6 2.6 0 0 1 -2.6 -2.6 a1.4 1.4 0 0 1 1.4 -1.4" stroke="#0B3954" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M54 74 q3 -3 6 0 t6 0" stroke="#0B3954" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <path d="M88 20 q4 -8 12 -6 M92 28 q6 -3 10 1" stroke="#94A3B8" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  `,
};

/** Renvoie le SVG complet de Kriri pour une humeur (fallback hello). */
export function kriri(mood = "hello") {
  const face = FACES[mood] || FACES.hello;
  return `<svg viewBox="0 0 120 96" role="img" aria-label="kri-kri"><g transform="translate(0,6)">${face}</g></svg>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/kriri.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/kriri.mjs tests/kriri.test.mjs
git commit -m "feat(carousel): inline Kriri mascot SVG (4 moods)"
```

---

### Task 3: Template HTML 6 slides + légende (`lib/render-swim-html.mjs`)

**Files:**
- Create: `lib/render-swim-html.mjs`
- Test: `tests/render-swim-html.test.mjs`

Charte Kalimera (réf `cretepulse-build/docs/superpowers/specs/2026-06-11-brand-da-kalimera-design.md`) : tokens couleur, Baloo 2 (titres + données `tabular-nums`) / Comfortaa fallback grec, fonds **abstraction lumineuse** (radial-gradients + grain), arrondi 28-32px, tuiles données couleur. **Règles** : pas de « → », pas de « — » (séparateur « · »). 6 slides : `#slide-01`..`#slide-06`.

- [ ] **Step 1: Write the failing test**

```js
// tests/render-swim-html.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSwimCarousel, buildSwimCaption } from "../lib/render-swim-html.mjs";

const SWIM = {
  date: "2026-06-13",
  wind: { cardinal: "NW", minSpeed: 12, maxSpeed: 24 },
  pick: { name: "Anatolika Beach", region: "central", rating: "calm",
    windCardinal: "N", windSpeed: 10, waveHeight: 0.2, seaTemp: 23, lat: 35.0, lng: 25.7 },
  alternatives: [
    { name: "Agios Charalampos", region: "west", rating: "calm", windCardinal: "N", windSpeed: 8, waveHeight: 0.1, seaTemp: 22, lat: 35.3, lng: 23.6 },
    { name: "Kalo Nero", region: "east", rating: "calm", windCardinal: "S", windSpeed: 9, waveHeight: 0.2, seaTemp: 24, lat: 35.1, lng: 26.2 },
    { name: "Frangokastello", region: "south", rating: "calm", windCardinal: "S", windSpeed: 7, waveHeight: 0.2, seaTemp: 23, lat: 35.18, lng: 24.23 },
  ],
  avoid: [
    { name: "Trachilias", region: "east", rating: "exposed", windCardinal: "NW", windSpeed: 32, waveHeight: 1.4, seaTemp: 21 },
  ],
};

test("buildSwimCarousel produit 6 slides identifiés", () => {
  const html = buildSwimCarousel(SWIM);
  for (let i = 1; i <= 6; i++) {
    assert.ok(html.includes(`id="slide-${String(i).padStart(2, "0")}"`), `slide ${i} présent`);
  }
});

test("le HTML contient la plage héros et la temp eau", () => {
  const html = buildSwimCarousel(SWIM);
  assert.match(html, /Anatolika Beach/);
  assert.match(html, /23/); // seaTemp
});

test("le HTML embarque Kriri et la charte Kalimera", () => {
  const html = buildSwimCarousel(SWIM);
  assert.match(html, /<svg viewBox="0 0 120 96"/); // Kriri
  assert.match(html, /#00C2D4/); // lagoon
  assert.match(html, /Baloo 2/); // typo
});

test("aucune flèche ni tiret cadratin (règles DA)", () => {
  const html = buildSwimCarousel(SWIM);
  assert.ok(!html.includes("→"), "pas de →");
  assert.ok(!html.includes("—"), "pas de —");
});

test("buildSwimCaption mentionne les plages, crete.direct et zéro caractère interdit", () => {
  const cap = buildSwimCaption(SWIM);
  assert.match(cap, /Anatolika Beach/);
  assert.match(cap, /crete\.direct/);
  assert.ok(!cap.includes("→") && !cap.includes("—"));
  assert.ok(cap.length <= 2200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/render-swim-html.test.mjs`
Expected: FAIL (`Cannot find module '../lib/render-swim-html.mjs'`)

- [ ] **Step 3: Write minimal implementation**

```js
// lib/render-swim-html.mjs
import { kriri } from "./kriri.mjs";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Καλημέρα le matin, Καλησπέρα l'après-midi/soir (le carrousel poste à 19:00).
function greeting() { return "Καλησπέρα"; }

function fmtDate(date) {
  return new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

const REGION_LABEL = { west: "Ouest", central: "Centre", east: "Est", south: "Sud", north: "Nord" };
function region(r) { return REGION_LABEL[r] || r || ""; }

const RATING_LABEL = { calm: "Calme", moderate: "Modérée", exposed: "Exposée" };
function rating(r) { return RATING_LABEL[r] || r || ""; }

function styleBlock() {
  return `<style>
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Comfortaa:wght@500;700&family=Geist:wght@400;500&display=swap');
  :root{
    --lagoon:#00C2D4; --lagoon-deep:#008C9E; --sky:#BDEDF5; --sea:#0B5E78;
    --night:#07374A; --sun:#FFC83D; --terracotta:#ED7A5C; --olive:#7C9A53;
    --foam:#F6FBFC; --sand:#FFF3D6; --ink:#0B3954;
    --ok:#14B86B; --warn:#FFC83D; --alert:#E5484D;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Geist',system-ui,sans-serif;background:#fff;}
  .gallery{display:flex;flex-direction:column;gap:32px;align-items:center;padding:32px;}
  .slide{width:1080px;height:1350px;position:relative;overflow:hidden;
    border-radius:0;color:var(--ink);
    font-family:'Baloo 2','Comfortaa',system-ui,sans-serif;}
  /* fond abstraction lumineuse (style D de la DA) */
  .bg-sea{background:
    radial-gradient(120% 90% at 20% 0%, var(--sky) 0%, transparent 55%),
    radial-gradient(120% 90% at 90% 20%, rgba(0,194,212,.55) 0%, transparent 50%),
    radial-gradient(140% 120% at 50% 110%, var(--night) 0%, rgba(11,94,120,.65) 45%, transparent 80%),
    var(--foam);}
  .bg-warm{background:
    radial-gradient(120% 90% at 10% 0%, var(--sand) 0%, transparent 55%),
    radial-gradient(120% 90% at 95% 15%, rgba(255,200,61,.6) 0%, transparent 50%),
    radial-gradient(140% 120% at 50% 110%, rgba(237,122,92,.5) 0%, transparent 75%),
    var(--foam);}
  .grain{position:absolute;inset:0;opacity:.35;pointer-events:none;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");}
  .pad{position:absolute;inset:0;padding:80px 72px;display:flex;flex-direction:column;}
  .wordmark{font-weight:800;font-size:34px;letter-spacing:-.02em;color:var(--ink);}
  .wordmark .sun{color:var(--sun);}
  .kriri{width:150px;height:120px;}
  .greet{font-weight:700;font-size:40px;color:var(--lagoon-deep);}
  .date{font-weight:600;font-size:26px;color:var(--sea);text-transform:capitalize;}
  .title{font-weight:800;font-size:88px;line-height:.98;letter-spacing:-.03em;color:var(--ink);}
  .hero-name{font-weight:800;font-size:104px;line-height:.95;letter-spacing:-.035em;}
  .sub{font-weight:600;font-size:30px;color:var(--sea);}
  .tile{border-radius:30px;padding:36px 40px;box-shadow:0 18px 40px rgba(11,94,120,.16);}
  .tile.lagoon{background:var(--lagoon);color:var(--night);}
  .tile.sea{background:var(--sea);color:#fff;}
  .tile.sand{background:var(--sand);color:var(--ink);}
  .tile .k{font-weight:600;font-size:26px;opacity:.85;}
  .tile .v{font-weight:800;font-size:84px;line-height:1;font-variant-numeric:tabular-nums;}
  .tile .u{font-weight:700;font-size:34px;}
  .row{display:flex;gap:28px;}
  .row>*{flex:1;}
  .pill{display:inline-flex;align-items:center;gap:10px;border-radius:999px;
    padding:12px 24px;font-weight:700;font-size:26px;}
  .pill.ok{background:var(--ok);color:#fff;}
  .pill.warn{background:var(--warn);color:var(--ink);}
  .pill.alert{background:var(--alert);color:#fff;}
  .beach-card{display:flex;justify-content:space-between;align-items:center;
    background:#fff;border-radius:28px;padding:34px 40px;margin-bottom:24px;
    box-shadow:0 14px 34px rgba(11,94,120,.12);}
  .beach-card .name{font-weight:800;font-size:48px;color:var(--ink);}
  .beach-card .meta{font-weight:600;font-size:26px;color:var(--sea);}
  .beach-card .temp{font-weight:800;font-size:64px;color:var(--lagoon-deep);font-variant-numeric:tabular-nums;}
  .spacer{flex:1;}
  .cta-url{font-weight:800;font-size:64px;color:var(--ink);}
  .foot{font-weight:600;font-size:26px;color:var(--sea);}
  .head{display:flex;justify-content:space-between;align-items:flex-start;}
</style>`;
}

function windStr(b) { return `${esc(b.windCardinal || "")} ${Math.round(b.windSpeed || 0)} kn`; }

function beachCard(b) {
  return `<div class="beach-card">
    <div>
      <div class="name">${esc(b.name)}</div>
      <div class="meta">${esc(region(b.region))} · vent ${windStr(b)} · ${esc(rating(b.rating))}</div>
    </div>
    <div class="temp">${Math.round(b.seaTemp || 0)}°</div>
  </div>`;
}

function slideCover(s) {
  return `<section class="slide bg-sea" id="slide-01"><div class="grain"></div><div class="pad">
    <div class="head">
      <div class="wordmark">crete<span class="sun">.</span>direct</div>
      ${kriri("hello")}
    </div>
    <div style="margin-top:40px;">
      <div class="greet">${greeting()} !</div>
      <div class="date">${esc(fmtDate(s.date))} · en direct de l'île</div>
    </div>
    <div class="spacer"></div>
    <div class="title">On se baigne<br>où aujourd'hui ?</div>
    <div class="sub" style="margin-top:28px;">Vent du jour : ${esc(s.wind?.cardinal || "")} ${Math.round(s.wind?.minSpeed||0)} à ${Math.round(s.wind?.maxSpeed||0)} kn</div>
  </div></section>`;
}

function slideHero(s) {
  const p = s.pick;
  return `<section class="slide bg-sea" id="slide-02"><div class="grain"></div><div class="pad">
    <div class="wordmark">La plage du jour</div>
    <div class="spacer"></div>
    <div class="hero-name">${esc(p.name)}</div>
    <div class="sub" style="margin-top:18px;">${esc(region(p.region))}</div>
    <div class="row" style="margin-top:48px;">
      <div class="tile lagoon"><div class="k">Eau</div><div class="v">${Math.round(p.seaTemp||0)}<span class="u">°</span></div></div>
      <div class="tile sea"><div class="k">Vent</div><div class="v" style="font-size:60px;">${esc(p.windCardinal||"")}<span class="u"> ${Math.round(p.windSpeed||0)}kn</span></div></div>
    </div>
    <div style="margin-top:36px;"><span class="pill ok">Baignade ${esc(rating(p.rating))}</span></div>
  </div></section>`;
}

function slideAlternatives(s) {
  const cards = s.alternatives.map(beachCard).join("\n");
  return `<section class="slide bg-sea" id="slide-03"><div class="grain"></div><div class="pad">
    <div class="title" style="font-size:64px;">Les bons<br>plans du jour</div>
    <div class="sub" style="margin:24px 0 40px;">Abritées du vent · eau agréable</div>
    ${cards}
  </div></section>`;
}

function slideMap(s) {
  // Carte simplifiée : pas de SVG géo complet ici (réf CreteMap), on liste les positions.
  const p = s.pick;
  return `<section class="slide bg-warm" id="slide-04"><div class="grain"></div><div class="pad">
    <div class="title" style="font-size:64px;">Où c'est,<br>${esc(p.name)} ?</div>
    <div class="spacer"></div>
    <div class="row">
      <div class="tile sand"><div class="k">Région</div><div class="v" style="font-size:56px;">${esc(region(p.region))}</div></div>
      <div class="tile sand"><div class="k">Vagues</div><div class="v">${(p.waveHeight??0).toFixed(1)}<span class="u">m</span></div></div>
    </div>
    <div class="foot" style="margin-top:40px;">Itinéraires bus · crete.direct/buses</div>
  </div></section>`;
}

function slideAvoid(s) {
  const list = (s.avoid || []).map(b =>
    `<div class="beach-card"><div><div class="name">${esc(b.name)}</div><div class="meta">${esc(region(b.region))} · vent ${windStr(b)}</div></div><span class="pill alert">À éviter</span></div>`
  ).join("\n") || `<div class="foot">Aucune plage déconseillée aujourd'hui.</div>`;
  return `<section class="slide bg-warm" id="slide-05"><div class="grain"></div><div class="pad">
    <div class="head"><div class="title" style="font-size:64px;">Météo<br>du jour</div>${kriri("alert")}</div>
    <div class="sub" style="margin:24px 0 40px;">Vent fort · mer agitée</div>
    ${list}
  </div></section>`;
}

function slideCta(s) {
  return `<section class="slide bg-sea" id="slide-06"><div class="grain"></div><div class="pad">
    <div class="head"><div class="wordmark">crete<span class="sun">.</span>direct</div>${kriri("hello")}</div>
    <div class="spacer"></div>
    <div class="title">Toute la Crète,<br>en direct.</div>
    <div class="cta-url" style="margin-top:48px;">crete.direct</div>
    <div class="foot" style="margin-top:20px;">Plages, météo, bus · projet indépendant</div>
  </div></section>`;
}

/** Construit le HTML complet du carrousel (6 slides). */
export function buildSwimCarousel(swim) {
  const slides = [
    slideCover(swim), slideHero(swim), slideAlternatives(swim),
    slideMap(swim), slideAvoid(swim), slideCta(swim),
  ].join("\n");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">${styleBlock()}</head>
<body><div class="gallery">${slides}</div></body></html>`;
}

/** Construit la légende Instagram (EN primaire, audience touristes), règles DA respectées. */
export function buildSwimCaption(swim) {
  const p = swim.pick;
  const alts = swim.alternatives.map(a => `· ${a.name} (${Math.round(a.seaTemp||0)}°)`).join("\n");
  const head = `Where to swim in Crete · ${swim.date}`;
  const hero = `Beach of the day: ${p.name} · sea ${Math.round(p.seaTemp||0)}°, wind ${p.windCardinal||""} ${Math.round(p.windSpeed||0)}kn.`;
  const more = `More calm spots today:\n${alts}`;
  const foot = `Weather, beaches & bus routes on crete.direct · independent project.`;
  const tags = ["#crete","#cretegreece","#greekislands","#visitgreece","#cretetravel","#cretelife","#greeksummer","#wheretoswim","#cretebeaches","#mediterranean"].join(" ");
  let cap = `${head}\n\n${hero}\n\n${more}\n\n${foot}\n\n${tags}`;
  // garde-fous DA : pas de flèche ni tiret cadratin
  cap = cap.replace(/→/g, "·").replace(/—/g, "·");
  if (cap.length > 2200) cap = cap.slice(0, 2197) + "...";
  return cap;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/render-swim-html.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/render-swim-html.mjs tests/render-swim-html.test.mjs
git commit -m "feat(carousel): Kalimera 6-slide HTML template + caption (swim)"
```

---

### Task 4: Générateur (`scripts/generate-swim-carousel.mjs`)

**Files:**
- Create: `scripts/generate-swim-carousel.mjs`
- Test: `tests/generate-swim.test.mjs`

Écrit `out/<date>/carousel.html` + `out/<date>/carousel.json` (avec `caption`, `slideCount`, `pick`, `date`). Le `carousel.json` est le contrat lu par l'uploader.

- [ ] **Step 1: Write the failing test**

```js
// tests/generate-swim.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCarouselArtifacts } from "../scripts/generate-swim-carousel.mjs";

const SWIM = {
  date: "2026-06-13", wind: { cardinal: "NW", minSpeed: 12, maxSpeed: 24 },
  pick: { name: "Anatolika Beach", region: "central", rating: "calm", windCardinal: "N", windSpeed: 10, waveHeight: 0.2, seaTemp: 23, lat: 35, lng: 25.7 },
  alternatives: [
    { name: "A", region: "west", rating: "calm", windCardinal: "N", windSpeed: 8, waveHeight: 0.1, seaTemp: 22 },
    { name: "B", region: "east", rating: "calm", windCardinal: "S", windSpeed: 9, waveHeight: 0.2, seaTemp: 24 },
    { name: "C", region: "south", rating: "calm", windCardinal: "S", windSpeed: 7, waveHeight: 0.2, seaTemp: 23 },
  ],
  avoid: [],
};

test("buildCarouselArtifacts renvoie html + meta cohérents", () => {
  const { html, meta } = buildCarouselArtifacts(SWIM);
  assert.match(html, /<!doctype html>/i);
  assert.equal(meta.slideCount, 6);
  assert.equal(meta.date, "2026-06-13");
  assert.match(meta.caption, /Anatolika Beach/);
  assert.equal(meta.pick, "Anatolika Beach");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/generate-swim.test.mjs`
Expected: FAIL (`Cannot find module '../scripts/generate-swim-carousel.mjs'`)

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/generate-swim-carousel.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSwim } from "../lib/fetch-swim.mjs";
import { buildSwimCarousel, buildSwimCaption } from "../lib/render-swim-html.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SLIDE_COUNT = 6;

/** Construit html + meta sans I/O (testable). */
export function buildCarouselArtifacts(swim) {
  const html = buildSwimCarousel(swim);
  const meta = {
    date: swim.date,
    slideCount: SLIDE_COUNT,
    pick: swim.pick?.name || null,
    caption: buildSwimCaption(swim),
  };
  return { html, meta };
}

function todayAthens() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Athens" });
}

async function main() {
  const date = (process.argv[2] && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[2]))
    ? process.argv[2] : todayAthens();
  console.log(`[gen] date=${date}`);
  const swim = await fetchSwim(date);
  console.log(`[gen] pick=${swim.pick.name} alternatives=${swim.alternatives.length} avoid=${swim.avoid.length}`);
  const { html, meta } = buildCarouselArtifacts(swim);
  const dir = join(ROOT, "out", date);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "carousel.html"), html, "utf-8");
  await writeFile(join(dir, "carousel.json"), JSON.stringify(meta, null, 2), "utf-8");
  console.log(`[gen] wrote ${dir}/carousel.html + carousel.json (${meta.slideCount} slides)`);
}

// exécution directe seulement (pas à l'import du test)
if (process.argv[1] && process.argv[1].endsWith("generate-swim-carousel.mjs")) {
  main().catch(e => { console.error("[gen] FAILED:", e.message); process.exit(1); });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/generate-swim.test.mjs`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-swim-carousel.mjs tests/generate-swim.test.mjs
git commit -m "feat(carousel): swim carousel generator (html + meta artifacts)"
```

---

### Task 5: Renderer PNG (`scripts/render-swim-png.mjs`)

**Files:**
- Create: `scripts/render-swim-png.mjs`

Réutilise le pattern Playwright du renderer news mais **compte les slides dynamiquement** (6) et viewport portrait 1080×1350. Pas de TDD strict (rendu binaire) : étape de smoke avec données factices.

- [ ] **Step 1: Write implementation**

```js
// scripts/render-swim-png.mjs
import { mkdir, stat, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VIEWPORT = { width: 1080, height: 1350 };

function todayAthens() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Athens" });
}
async function fileExists(p) { try { await stat(p); return true; } catch { return false; } }

async function main() {
  const date = (process.argv[2] && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[2]))
    ? process.argv[2] : todayAthens();
  const dir = join(ROOT, "out", date);
  const htmlPath = join(dir, "carousel.html");
  if (!(await fileExists(htmlPath))) throw new Error(`HTML absent: ${htmlPath} (lancer generate-swim-carousel.mjs)`);

  const meta = JSON.parse(await readFile(join(dir, "carousel.json"), "utf-8"));
  const count = meta.slideCount || 6;
  await mkdir(dir, { recursive: true });

  console.log(`[render] chromium headless, ${count} slides`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  for (let i = 1; i <= count; i++) {
    const id = `#slide-${String(i).padStart(2, "0")}`;
    const handle = await page.$(id);
    if (!handle) { console.warn(`[render] ${id} manquant, skip`); continue; }
    const out = join(dir, `slide-${String(i).padStart(2, "0")}.png`);
    await handle.screenshot({ path: out, type: "png" });
    console.log(`[render] wrote ${out}`);
  }
  await browser.close();
  console.log(`[render] done`);
}
main().catch(e => { console.error("[render] FAILED:", e.message); process.exit(1); });
```

- [ ] **Step 2: Smoke test localement (avec un carousel.json factice)**

```bash
cd /c/Users/fkerj/crete-direct-instagram
mkdir -p out/2026-01-01
node -e "import('./lib/render-swim-html.mjs').then(async m=>{const fs=await import('node:fs/promises');const swim={date:'2026-01-01',wind:{cardinal:'NW',minSpeed:12,maxSpeed:24},pick:{name:'Test Beach',region:'central',rating:'calm',windCardinal:'N',windSpeed:10,waveHeight:0.2,seaTemp:23,lat:35,lng:25.7},alternatives:[{name:'A',region:'west',rating:'calm',windCardinal:'N',windSpeed:8,waveHeight:0.1,seaTemp:22},{name:'B',region:'east',rating:'calm',windCardinal:'S',windSpeed:9,waveHeight:0.2,seaTemp:24},{name:'C',region:'south',rating:'calm',windCardinal:'S',windSpeed:7,waveHeight:0.2,seaTemp:23}],avoid:[{name:'X',region:'east',rating:'exposed',windCardinal:'NW',windSpeed:32,waveHeight:1.4,seaTemp:21}]};await fs.writeFile('out/2026-01-01/carousel.html',m.buildSwimCarousel(swim));await fs.writeFile('out/2026-01-01/carousel.json',JSON.stringify({date:'2026-01-01',slideCount:6,pick:'Test Beach',caption:'x'}));})"
node scripts/render-swim-png.mjs 2026-01-01
```
Expected: `wrote out/2026-01-01/slide-01.png` … `slide-06.png` (6 fichiers), `done`. Ouvrir les PNG et vérifier visuellement : charte Kalimera, Kriri visible, données lisibles, pas de débordement.

- [ ] **Step 3: Commit**

```bash
git add scripts/render-swim-png.mjs
git commit -m "feat(carousel): Playwright PNG renderer (dynamic slide count, 1080x1350)"
```

---

### Task 6: Uploader (`scripts/upload-swim-carousel.mjs`)

**Files:**
- Create: `scripts/upload-swim-carousel.mjs`

Calque le flow Graph de `upload-instagram-carousel.mjs` (postForm / pollContainer / tokens / idempotence `.uploaded`) mais : (1) caption lue depuis `carousel.json.caption` ; (2) nombre de slides dynamique (énumère `slide-*.png`). **On ne modifie pas l'ancien uploader.**

- [ ] **Step 1: Write implementation**

```js
// scripts/upload-swim-carousel.mjs
import { readFile, writeFile, stat, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GRAPH = "https://graph.facebook.com/v22.0";
const MEDIA_BASE = process.env.IG_MEDIA_BASE || "https://media.crete.direct/instagram";
const TOKENS_PATH = process.env.IG_TOKENS_PATH || "/opt/cretepulse-video/instagram-tokens.json";
const POLL_INTERVAL_MS = 4000, POLL_MAX_MS = 5 * 60 * 1000, PER_ITEM_DELAY_MS = 600;

function todayAthens() { return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Athens" }); }
async function fileExists(p) { try { await stat(p); return true; } catch { return false; } }

async function postForm(url, params) {
  const r = await fetch(url, { method: "POST", body: new URLSearchParams(params) });
  const j = await r.json();
  if (!r.ok) throw new Error(`POST ${url} → HTTP ${r.status}: ${JSON.stringify(j)}`);
  return j;
}
async function getJson(url) {
  const r = await fetch(url); const j = await r.json();
  if (!r.ok) throw new Error(`GET ${url} → HTTP ${r.status}: ${JSON.stringify(j)}`);
  return j;
}
async function pollContainer(id, token, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < POLL_MAX_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const j = await getJson(`${GRAPH}/${id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
    console.log(`[IG] ${label} t=${Math.floor((Date.now()-t0)/1000)}s status_code=${j.status_code}`);
    if (j.status_code === "FINISHED") return;
    if (j.status_code === "ERROR" || j.status_code === "EXPIRED") throw new Error(`Container ${id}: ${j.status_code}`);
  }
  throw new Error(`Polling timeout container ${id}`);
}

async function main() {
  const date = (process.argv[2] && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[2])) ? process.argv[2] : todayAthens();
  const dir = join(ROOT, "out", date);
  const metaPath = join(dir, "carousel.json");
  const uploaded = join(dir, ".uploaded");
  console.log(`[IG] date=${date} dir=${dir}`);

  if (!(await fileExists(metaPath))) throw new Error(`carousel.json absent: ${metaPath}`);
  if (await fileExists(uploaded)) { console.log(`[skip] déjà uploadé: ${(await readFile(uploaded,"utf-8"))}`); return; }
  if (!(await fileExists(TOKENS_PATH))) throw new Error(`tokens absents: ${TOKENS_PATH}`);

  const meta = JSON.parse(await readFile(metaPath, "utf-8"));
  const tokens = JSON.parse(await readFile(TOKENS_PATH, "utf-8"));
  const token = tokens.long_lived_token, igUserId = tokens.ig_user_id;
  if (!token || !igUserId) throw new Error("tokens incomplets");
  if (tokens.expires_at_iso && new Date(tokens.expires_at_iso) < new Date()) throw new Error(`token expiré ${tokens.expires_at_iso}`);

  const slides = (await readdir(dir)).filter(f => /^slide-\d{2}\.png$/.test(f)).sort();
  if (slides.length < 2 || slides.length > 10) throw new Error(`carrousel IG = 2..10 slides; trouvé ${slides.length}`);
  console.log(`[IG] ig_user_id=${igUserId} slides=${slides.length}`);

  // 1) containers enfants
  const childIds = [];
  for (const f of slides) {
    const imageUrl = `${MEDIA_BASE}/${date}/${f}`;
    const j = await postForm(`${GRAPH}/${igUserId}/media`, { image_url: imageUrl, is_carousel_item: "true", access_token: token });
    console.log(`[IG]   ${f} → ${j.id}`);
    childIds.push(j.id);
    await new Promise(r => setTimeout(r, PER_ITEM_DELAY_MS));
  }
  // 2) container carrousel
  const carousel = await postForm(`${GRAPH}/${igUserId}/media`, {
    media_type: "CAROUSEL", children: childIds.join(","), caption: meta.caption || "", access_token: token,
  });
  console.log(`[IG] carousel container=${carousel.id}`);
  await pollContainer(carousel.id, token, "carousel");
  // 3) publish
  const pub = await postForm(`${GRAPH}/${igUserId}/media_publish`, { creation_id: carousel.id, access_token: token });
  console.log(`[IG] published media_id=${pub.id}`);

  let permalink = "";
  try { permalink = (await getJson(`${GRAPH}/${pub.id}?fields=permalink&access_token=${encodeURIComponent(token)}`)).permalink || ""; } catch {}
  await writeFile(uploaded, JSON.stringify({ media_id: pub.id, permalink, date }, null, 2));
  console.log(`[ok] Carousel published: ${permalink || pub.id}`);
}
main().catch(e => { console.error("[IG] FAILED:", e.message); process.exit(1); });
```

- [ ] **Step 2: Vérifier le node --check (pas d'upload réel hors VPS)**

Run: `node --check scripts/upload-swim-carousel.mjs`
Expected: aucune sortie (syntaxe OK). L'upload réel se teste sur le VPS en Task 7.

- [ ] **Step 3: Commit**

```bash
git add scripts/upload-swim-carousel.mjs
git commit -m "feat(carousel): swim carousel uploader (caption from meta, dynamic slides)"
```

---

### Task 7: Wrapper + cron VPS + dry-run de bout en bout

**Files:**
- Create (VPS): `/opt/crete-direct-instagram/bin/render-daily-carousel.sh`
- Create (VPS): `/etc/cron.d/crete-direct-daily-carousel`
- Test: dry-run sur `kairos-vps`

- [ ] **Step 1: Déployer le code sur le VPS**

Depuis Windows (les fichiers sont dans le miroir) :
```bash
cd /c/Users/fkerj/crete-direct-instagram
git push   # si remote configuré
# puis sur le VPS : git pull. Sinon, scp des fichiers neufs :
scp lib/fetch-swim.mjs lib/kriri.mjs lib/render-swim-html.mjs kairos-vps:/opt/crete-direct-instagram/lib/
scp scripts/generate-swim-carousel.mjs scripts/render-swim-png.mjs scripts/upload-swim-carousel.mjs kairos-vps:/opt/crete-direct-instagram/scripts/
```

- [ ] **Step 2: Créer le wrapper sur le VPS**

```bash
ssh kairos-vps 'mkdir -p /opt/crete-direct-instagram/bin && cat > /opt/crete-direct-instagram/bin/render-daily-carousel.sh' <<"EOF"
#!/usr/bin/env bash
set -uo pipefail
PROJECT_DIR="/opt/crete-direct-instagram"
LOG_FILE="/var/log/crete-direct-daily-carousel.log"
ENV_FILE="/opt/cretepulse-video/.env.local"   # SITE_URL + SWIM_FEED_SECRET
DATE="$(TZ=Europe/Athens date +%Y-%m-%d)"
cd "$PROJECT_DIR" || exit 1
export PLAYWRIGHT_BROWSERS_PATH="$PROJECT_DIR/browsers"
{
  echo ""
  echo "=== $(date -u +%FT%TZ) | render-daily-carousel | DATE=$DATE ==="
  set -a; [ -f "$ENV_FILE" ] && . "$ENV_FILE"; set +a
  echo "[step] generate"
  node scripts/generate-swim-carousel.mjs "$DATE" || { echo "[FAIL] generate"; exit 1; }
  echo "[step] render"
  node scripts/render-swim-png.mjs "$DATE" || { echo "[FAIL] render"; exit 1; }
  echo "[step] upload"
  node scripts/upload-swim-carousel.mjs "$DATE" || { echo "[FAIL] upload"; exit 1; }
  echo "[ok] done $DATE"
} >> "$LOG_FILE" 2>&1
EOF
ssh kairos-vps 'chmod +x /opt/crete-direct-instagram/bin/render-daily-carousel.sh && bash -n /opt/crete-direct-instagram/bin/render-daily-carousel.sh && echo "wrapper OK"'
```
Expected: `wrapper OK`. (Le `.env.local` partagé fournit `SITE_URL`/`SWIM_FEED_SECRET` comme pour le reel.)

- [ ] **Step 3: Dry-run generate + render SANS upload (vérifier les PNG)**

```bash
ssh kairos-vps 'cd /opt/crete-direct-instagram && set -a && . /opt/cretepulse-video/.env.local && set +a && D=$(TZ=Europe/Athens date +%F) && node scripts/generate-swim-carousel.mjs "$D" && node scripts/render-swim-png.mjs "$D" && ls -la out/$D/slide-*.png'
```
Expected: 6 PNG listés. Récupérer un PNG pour contrôle visuel :
```bash
scp kairos-vps:/opt/crete-direct-instagram/out/$(TZ=Europe/Athens date +%F)/slide-01.png /c/Users/fkerj/Desktop/
```
Ouvrir → valider charte Kalimera + Kriri + lisibilité avant d'autoriser l'upload.

- [ ] **Step 4: Test upload réel UNE fois (validation Kami requise avant d'armer le cron)**

⚠️ Action sortante (poste sur le vrai compte IG). À lancer seulement après GO Kami sur le rendu (Step 3).
```bash
ssh kairos-vps 'cd /opt/crete-direct-instagram && D=$(TZ=Europe/Athens date +%F) && node scripts/upload-swim-carousel.mjs "$D"'
```
Expected: `[ok] Carousel published: https://www.instagram.com/p/...`. Vérifier le post sur @cretedirect.

- [ ] **Step 5: Armer le cron 16:00 UTC (19:00 Athens)**

```bash
ssh kairos-vps 'cat > /etc/cron.d/crete-direct-daily-carousel' <<"EOF"
# Crete Direct — carrousel quotidien "Aujourd'hui en Crète" (swim + Kalimera + Kriri)
# 16:00 UTC = 19:00 Athens. Remplace l'ancien carrousel news (désinstallé 13/06).
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""
0 16 * * * root /opt/crete-direct-instagram/bin/render-daily-carousel.sh
EOF
ssh kairos-vps 'ls -la /etc/cron.d/crete-direct-daily-carousel && echo "cron armé"'
```
Expected: `cron armé`. Le carrousel partira chaque jour à 19:00 Athens (idempotence `.uploaded` par jour).

- [ ] **Step 6: Commit (miroir Windows du wrapper + cron pour la convention)**

```bash
cd /c/Users/fkerj/crete-direct-instagram
mkdir -p bin etc
# copier le wrapper et le cron en miroir pour versionner
scp kairos-vps:/opt/crete-direct-instagram/bin/render-daily-carousel.sh bin/
scp kairos-vps:/etc/cron.d/crete-direct-daily-carousel etc/
git add bin/render-daily-carousel.sh etc/crete-direct-daily-carousel
git commit -m "chore(carousel): VPS wrapper + cron 16:00 UTC (mirror)"
```

---

## Self-Review

**1. Spec coverage :**
- 1 carrousel/jour, 19:00 Athens → Task 7 cron 16:00 UTC ✓
- Source unique swim-today → Task 1 ✓
- Charte Kalimera (palette, Baloo 2/Comfortaa, arrondi) → Task 3 styleBlock ✓
- Kriri présentateur (hello/alert) → Task 2 + slides cover/avoid/cta ✓
- Abstraction lumineuse, pas de photo plein cadre → Task 3 `.bg-sea`/`.bg-warm` + grain, aucune balise photo ✓
- 6 slides (hook / héros / alternatives / carte / météo+avoid / CTA) → Task 3 ✓
- Données en tuiles couleur, chiffres tabular-nums → Task 3 `.tile`/`.v` ✓
- Règles DA (pas de →, pas de —) → tests Task 3 + garde-fou caption ✓
- Légende EN + cross-link crete.direct → Task 3 buildSwimCaption ✓
- Réutilise infra HTML→PNG→upload, sans toucher au pipeline news → Tasks 5/6 fichiers neufs ✓
- Idempotence par jour → Task 6 `.uploaded` ✓

**2. Placeholder scan :** aucun « TODO/TBD ». Tout le code est complet. (La carte slide-04 est volontairement une version liste/tuiles, pas le SVG CreteMap géo complet — choix YAGNI explicite, amélioration possible plus tard.)

**3. Type consistency :** contrat `carousel.json` = `{date, slideCount, pick, caption}` écrit en Task 4, lu en Tasks 5 (`slideCount`) et 6 (`caption`). `normalizeSwim` (Task 1) → `{date, wind, pick, alternatives, avoid}` consommé identique en Task 3. Cohérent.

## Restes / hors plan
- **Plan séparé (chantier 1)** : redesign dynamique de la vidéo `CreteSwimToday` (Remotion + motion-design-system, charte Kalimera + Kriri). À écrire ensuite.
- **Kami** : supprimer manuellement les anciens carrousels news du feed (API ne supprime pas).
- Géotag IG, slide CreteMap géo réelle : itérations futures.
