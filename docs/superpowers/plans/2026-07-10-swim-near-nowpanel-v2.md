# swim-near + NowPanel v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classement de baignade par position GPS (top 3 dans 25 km) servi par `/api/swim-near`, consommé par le NowPanel d'/explore à la place de swim-now.

**Architecture:** Une lib pure `pickSwimNear` (filtre rayon + tri score + repli plus-proches) testée par check script node ; un endpoint qui réutilise `buildSwimToday()` (scoring 182 plages déjà existant) et mappe sa sortie ; le NowPanel fetch l'endpoint avec position arrondie à 0.05° (cacheabilité CDN) et recalcule la distance exacte côté client.

**Tech Stack:** Next.js App Router, TypeScript, node assert (`--experimental-strip-types`), Playwright pour l'e2e.

**Spec :** `docs/superpowers/specs/2026-07-10-swim-near-design.md`
**Worktree :** `C:\Users\fkerj\cp-app-companion`, branche `feat/app-companion`. `git add -A` INTERDIT. Zéro tiret cadratin, même en commentaire.

---

### Task 1: Lib pure `pickSwimNear` (TDD)

**Files:**
- Create: `src/lib/swim-near.ts`
- Create: `scripts/check-swim-near.mjs`
- Modify: `package.json` (scripts `check:swim-near` + chaîne `check`)

- [ ] **Step 1: Écrire le check script (test d'abord)**

Créer `scripts/check-swim-near.mjs` :

```js
// scripts/check-swim-near.mjs : tests purs du classement plage par position (NowPanel v2).
import assert from "node:assert/strict";
import { pickSwimNear } from "../src/lib/swim-near.ts";

// Positions réelles : Heraklion centre 35.339/25.133.
const HER = { lat: 35.339, lon: 25.133 };
const beaches = [
  { slug: "ammoudara", lat: 35.334, lng: 25.081, score: 62 },   // ~4.8 km
  { slug: "karteros", lat: 35.331, lng: 25.213, score: 78 },    // ~7.3 km
  { slug: "agia-pelagia", lat: 35.407, lng: 25.017, score: 55 }, // ~13 km
  { slug: "matala", lat: 34.995, lng: 24.749, score: 95 },       // ~52 km : hors rayon
  { slug: "vai", lat: 35.254, lng: 26.265, score: 90 },          // ~103 km : hors rayon
];
let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("top 3 par score dans le rayon, une plage a 95 hors rayon ne gagne pas", () => {
  const r = pickSwimNear(beaches, HER);
  assert.deepEqual(r.map((b) => b.slug), ["karteros", "ammoudara", "agia-pelagia"]);
});
ok("km calcule et arrondi au dixieme", () => {
  const r = pickSwimNear(beaches, HER);
  const k = r.find((b) => b.slug === "karteros");
  assert.ok(k.km > 6 && k.km < 9, `km=${k.km}`);
  assert.equal(k.km, Math.round(k.km * 10) / 10);
});
ok("egalite de score : le plus proche d'abord", () => {
  const r = pickSwimNear(
    [
      { slug: "loin", lat: 35.407, lng: 25.017, score: 70 },
      { slug: "pres", lat: 35.334, lng: 25.081, score: 70 },
    ],
    HER,
  );
  assert.deepEqual(r.map((b) => b.slug), ["pres", "loin"]);
});
ok("rayon vide : repli 5 plus proches re-triees par score", () => {
  // Position au large au sud : tout est a plus de 25 km.
  const r = pickSwimNear(beaches, { lat: 34.6, lon: 24.7 });
  assert.equal(r.length, 3);
  assert.equal(r[0].slug, "matala"); // 95, la mieux notee des 5 plus proches
});
ok("moins de 3 plages dans le rayon : renvoie ce qu'il y a", () => {
  const r = pickSwimNear(beaches.slice(0, 2), HER);
  assert.equal(r.length, 2);
});
ok("coords invalides ignorees sans crash", () => {
  const r = pickSwimNear(
    [{ slug: "nan", lat: NaN, lng: 25.1, score: 99 }, ...beaches],
    HER,
  );
  assert.ok(!r.some((b) => b.slug === "nan"));
});
ok("liste vide : []", () => {
  assert.deepEqual(pickSwimNear([], HER), []);
});
ok("limit et radiusKm configurables", () => {
  const r = pickSwimNear(beaches, HER, { radiusKm: 6, limit: 1 });
  assert.deepEqual(r.map((b) => b.slug), ["ammoudara"]);
});
console.log(`✅ check:swim-near : ${n} tests OK`);
```

- [ ] **Step 2: Câbler dans package.json**

Dans `package.json`, après la ligne `"check:nearest-stop"`, ajouter :

```json
"check:swim-near": "node --experimental-strip-types scripts/check-swim-near.mjs",
```

et dans la chaîne `"check"`, insérer `npm run check:swim-near && ` juste après `npm run check:nearest-stop && `.

- [ ] **Step 3: Vérifier que le test échoue**

Run: `npm run check:swim-near`
Expected: FAIL (module `src/lib/swim-near.ts` introuvable).

- [ ] **Step 4: Implémenter la lib**

Créer `src/lib/swim-near.ts` :

```ts
// Classement de baignade par position : top N par score dans un rayon, avec
// repli sur les plus proches si le rayon est vide. Zéro I/O, importable client,
// serveur et node (check-swim-near.mjs). Consommé par /api/swim-near (NowPanel v2).
// Spec : docs/superpowers/specs/2026-07-10-swim-near-design.md
import { haversineKm, type GeoPos } from "./geo";

export interface SwimNearItem {
  lat: number;
  lng: number;
  score: number;
}

export interface SwimNearOptions {
  radiusKm?: number;
  fallbackCount?: number;
  limit?: number;
}

/** Top `limit` plages par score dans `radiusKm` autour de `pos`. Rayon vide :
 *  repli sur les `fallbackCount` plus proches, re-triées par score. */
export function pickSwimNear<T extends SwimNearItem>(
  items: T[],
  pos: GeoPos,
  { radiusKm = 25, fallbackCount = 5, limit = 3 }: SwimNearOptions = {},
): Array<T & { km: number }> {
  const withKm: Array<T & { km: number }> = [];
  for (const it of items) {
    if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) continue;
    const km = haversineKm([it.lat, it.lng], [pos.lat, pos.lon]);
    withKm.push({ ...it, km: Math.round(km * 10) / 10 });
  }
  const near = withKm.filter((b) => b.km <= radiusKm);
  const pool = near.length > 0
    ? near
    : [...withKm].sort((a, b) => a.km - b.km).slice(0, fallbackCount);
  return pool
    .sort((a, b) => b.score - a.score || a.km - b.km)
    .slice(0, limit);
}
```

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npm run check:swim-near`
Expected: `✅ check:swim-near : 8 tests OK`

- [ ] **Step 6: Commit**

```bash
git add src/lib/swim-near.ts scripts/check-swim-near.mjs package.json
git commit -m "feat(app): lib pickSwimNear, top 3 plages par score dans un rayon (NowPanel v2)"
```

---

### Task 2: Endpoint `/api/swim-near`

**Files:**
- Create: `src/app/api/swim-near/route.ts`

- [ ] **Step 1: Implémenter la route**

Créer `src/app/api/swim-near/route.ts` :

```ts
// /api/swim-near?lat=..&lng=..&locale=.. : les 3 meilleures plages du moment
// autour d'une position (rayon 25 km, repli plus-proches). Réutilise le scoring
// complet de buildSwimToday (météo 10 villes + orientation + abri) et re-trie
// par position via pickSwimNear. Cache CDN 30 min : le client arrondit sa
// position à 0.05° dans l'URL pour rester cacheable (cf NowPanel).
// Spec : docs/superpowers/specs/2026-07-10-swim-near-design.md
import { NextResponse } from "next/server";
import { buildSwimToday } from "@/lib/swim-today";
import { pickSwimNear } from "@/lib/swim-near";
import { getLocalizedField, type Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
};

const BASE_LOCALES = new Set(["en", "fr", "de", "el"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const raw = url.searchParams.get("locale") ?? "en";
  const locale = (BASE_LOCALES.has(raw) ? raw : "en") as Locale;
  // Borné à la Crète élargie, comme nearest-stop : hors bornes = pas de calcul.
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 34 || lat > 36.2 || lng < 23 || lng > 27) {
    return NextResponse.json({ beaches: [] }, { status: 422 });
  }
  const st = await buildSwimToday();
  if (!st) {
    return NextResponse.json({ error: "no_weather" }, { status: 503 });
  }
  const items = st.scored.map((s) => ({
    slug: s.beach.slug,
    name: getLocalizedField(s.beach, "name", locale),
    score: s.score,
    rating: s.rating,
    lat: s.beach.latitude,
    lng: s.beach.longitude,
  }));
  const beaches = pickSwimNear(items, { lat, lon: lng });
  return NextResponse.json({ beaches }, { headers: CACHE_HEADERS });
}
```

- [ ] **Step 2: Vérifier tsc**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3: Smoke test local**

Run (dev server déjà lancé ou `npm run dev` en arrière-plan, port du worktree) :
`curl "http://localhost:3000/api/swim-near?lat=35.339&lng=25.133&locale=fr"`
Expected: `{"beaches":[...]}` avec 3 entrées, chaque `km <= 25` (ou repli), triées score décroissant.
`curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/swim-near?lat=48.8&lng=2.3"`
Expected: `422`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/swim-near/route.ts
git commit -m "feat(app): endpoint /api/swim-near, top 3 plages du moment par position"
```

---

### Task 3: NowPanel v2

**Files:**
- Modify: `src/components/explore/NowPanel.tsx`

- [ ] **Step 1: Remplacer le fetch swim-now par swim-near**

Dans `NowPanel.tsx` :

1. Remplacer le type et l'état plage (une seule → liste) :

```ts
type SwimBeach = { slug: string; name: string; score: number; rating: string; lat: number; lng: number; km: number };
```

```ts
const [beaches, setBeaches] = useState<SwimBeach[]>([]);
```

2. Supprimer la fonction `weighted()` et son commentaire (la sélection vit dans l'API).

3. Dans le premier `useEffect`, remplacer le fetch swim-now et le bloc de tri par :

```ts
// Position arrondie à 0.05° (~3-5 km) : URL stable donc cache CDN efficace,
// position exacte jamais envoyée. La distance affichée est recalculée en exact.
const q = (v: number) => (Math.round(v / 0.05) * 0.05).toFixed(2);
const [swimRes, stopRes] = await Promise.allSettled([
  fetch(`/api/swim-near?lat=${q(pos.lat)}&lng=${q(pos.lon)}&locale=${locale}`).then((r) => (r.ok ? r.json() : null)),
  fetch(`/api/buses/nearest-stop?lat=${pos.lat}&lng=${pos.lon}`).then((r) => (r.ok ? r.json() : null)),
]);
if (dead) return;
if (swimRes.status === "fulfilled" && swimRes.value) {
  const list: SwimBeach[] = (swimRes.value.beaches ?? [])
    .filter((b: SwimBeach) => typeof b.lat === "number" && typeof b.lng === "number")
    .map((b: SwimBeach) => ({ ...b, km: haversineKm([b.lat, b.lng], [pos.lat, pos.lon]) }));
  setBeaches(list.slice(0, 3));
}
```

4. Adapter les usages : `beach` devient `beaches[0]`, la condition de rendu
   `if (!beach && !stop)` devient `if (beaches.length === 0 && !stop)`, l'effet
   Plausible dépend de `[beaches, stop]` avec `(beaches.length > 0 || stop)`.

- [ ] **Step 2: Rendu : plage #1 inchangée + alternatives #2/#3 compactes**

Remplacer le bloc `{beach && (...)}` par (plage principale identique, puis
alternatives ; AUCUNE nouvelle string UI, events Plausible inchangés) :

```tsx
{beaches[0] && (
  <Link
    href={`/${locale}/beaches/${beaches[0].slug}`}
    onClick={() => window.plausible?.("now_panel_click", { props: { target: "beach" } })}
    className="flex items-center gap-2 rounded-xl border border-border p-2 no-underline"
  >
    <span aria-hidden>🏖️</span>
    <span className="min-w-0 flex-1">
      <b className="block truncate font-heading text-[13px] text-ink">{beaches[0].name}</b>
      <span className="text-[11px] text-text-muted">
        {t.beachNow} · {beaches[0].km < 10 ? beaches[0].km.toFixed(1) : Math.round(beaches[0].km)} {t.km}
      </span>
    </span>
    <span className="rounded-full bg-sea-faint px-2 py-0.5 font-heading text-[11px] font-bold text-sea">{beaches[0].score}</span>
  </Link>
)}
{beaches.slice(1).map((b) => (
  <Link
    key={b.slug}
    href={`/${locale}/beaches/${b.slug}`}
    onClick={() => window.plausible?.("now_panel_click", { props: { target: "beach" } })}
    className="mt-1 flex items-center gap-2 rounded-xl px-2 py-1 no-underline"
  >
    <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{b.name}</span>
    <span className="shrink-0 text-[11px] text-text-muted">
      {b.km < 10 ? b.km.toFixed(1) : Math.round(b.km)} {t.km}
    </span>
    <span className="shrink-0 rounded-full bg-sea-faint px-1.5 py-0.5 font-heading text-[10px] font-bold text-sea">{b.score}</span>
  </Link>
))}
```

Mettre à jour le commentaire d'en-tête du fichier (swim-now devient swim-near, top 3 local).

- [ ] **Step 3: Vérifications statiques**

Run: `npm run check`
Expected: tout vert (dont check:da 0 violation, check:i18n, tsc).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build vert.

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/NowPanel.tsx
git commit -m "feat(app): NowPanel v2 consomme swim-near, top 3 plages reellement proches"
```

---

### Task 4: Vérification e2e + captures pour GO Kami

**Files:**
- Create: `scripts/e2e-nowpanel-v2.mjs` (jetable, non commité si hors whitelist)

- [ ] **Step 1: Script Playwright iPhone 13, géoloc Heraklion**

```js
// scripts/e2e-nowpanel-v2.mjs : capture NowPanel v2 sur /explore, geoloc simulee Heraklion.
import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices["iPhone 13"],
  geolocation: { latitude: 35.339, longitude: 25.133 },
  permissions: ["geolocation"],
  locale: "fr",
});
const page = await ctx.newPage();
await page.goto(`${BASE}/fr/explore`, { waitUntil: "networkidle" });
await page.waitForTimeout(5000); // hydratation
await page.getByText(/near me|pr[eè]s de moi/i).first().click();
await page.waitForTimeout(4000); // fetchs swim-near + nearest-stop
await page.screenshot({ path: "shots/nowpanel-v2-after.png" });
const req = await page.evaluate(() =>
  performance.getEntriesByType("resource").filter((r) => r.name.includes("swim-near")).length,
);
console.log(`swim-near appelé : ${req} fois`);
await browser.close();
```

- [ ] **Step 2: Exécuter avant/après**

1. Capture AVANT : `git stash` du NowPanel n'est PAS nécessaire, utiliser la prod
   `BASE_URL=https://crete.direct node scripts/e2e-nowpanel-v2.mjs` (renommer la
   capture `shots/nowpanel-v1-before.png`).
2. Capture APRÈS : dev server local (`npm run dev`), `node scripts/e2e-nowpanel-v2.mjs`.
Expected: le panneau liste 1 plage principale + 2 alternatives, toutes à moins de
25 km d'Heraklion, l'appel réseau part bien vers `/api/swim-near` avec lat/lng
arrondis à 2 décimales.

- [ ] **Step 3: Ouvrir les captures à l'écran**

Run (PowerShell): `Start-Process shots\nowpanel-v1-before.png; Start-Process shots\nowpanel-v2-after.png`

- [ ] **Step 4: Mémoire + GO Kami**

- session_log : ligne CONTENU/FIX avec heure réelle (`date`).
- `project_crete_direct.md` : bloc NowPanel v2 (état : prêt, attente GO captures).
- MEMORY.md : re-coudre la ligne projet dans la même session.
- Push prod UNIQUEMENT après GO Kami : `git push origin feat/app-companion:main`
  puis `git push origin feat/app-companion:master`.
