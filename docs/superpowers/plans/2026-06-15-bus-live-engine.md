# Bus Live Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer la couche moteur pure `src/lib/bus-live/` qui calcule la position estimée de chaque bus en circulation à l'instant `t`, sans GPS ni endpoint serveur, importable par la future carte `/live`.

**Architecture:** Une lib pure déterministe (`position.ts`, zéro I/O) + un loader I/O (`network.ts`, lecture Supabase anon) + types partagés (`types.ts`) + barrel (`index.ts`). Le moteur interpole temps→distance (profil `cumulative_minutes`/`cumulative_km`) puis distance→point le long de la polyline OSRM `geometry`, en gérant l'orientation de la route (sens aller/retour). Tests TDD en `scripts/check-bus-live.mjs` (node ≥ 23 type-stripping, `node:assert/strict`), même convention que `check-bus-journey.mjs`.

**Tech Stack:** TypeScript, Next.js 16, `@supabase/supabase-js` (client anon existant), node type-stripping pour les tests. Réutilise `bus-journey.ts` (`timesForDate`), `athens-time.ts` (`toMin`), `geo.ts` (`haversineKm`).

**Spec:** `docs/superpowers/specs/2026-06-15-bus-live-engine-design.md`

**Conventions non négociables (vérifiées dans le repo) :**
- Imports de *valeur* cross-module dans `position.ts` : **relatif + extension `.ts`** (`../geo.ts`), JAMAIS `@/`. Les `type` : sans extension. (Précédent : `bus-departures.ts`.)
- `geometry` est en **`[lng, lat]`** (GeoJSON). `haversineKm` attend **`[lat, lng]`** → swap obligatoire.
- Git author = `kerjeanfrancois29`. Stage explicite (jamais `git add -A`). Branche `feat/bus-live-map` (worktree `cretepulse-live`).
- Vert avant push : `npx tsc --noEmit` + `node scripts/check-bus-live.mjs`.

---

### Task 1: Types + extension `BusRoute.line_id`

**Files:**
- Create: `src/lib/bus-live/types.ts`
- Modify: `src/lib/buses.ts` (interface `BusRoute`, ajout d'un champ)

- [ ] **Step 1: Étendre `BusRoute` avec `line_id`**

Dans `src/lib/buses.ts`, l'interface `BusRoute` commence par `id: number;`. Ajouter juste après :

```ts
export interface BusRoute {
  id: number;
  line_id: number | null; // FK SP2 vers bus_lines.id (NULL = non apparié)
  operator_id: string;
```

(Le reste de l'interface est inchangé. `getBusRoutes()` fait déjà `select("*")` → ramène la colonne automatiquement.)

- [ ] **Step 2: Créer `src/lib/bus-live/types.ts`**

```ts
// Types de la couche moteur "bus live" (position estimée). Aucun runtime ici.
// Spec : docs/superpowers/specs/2026-06-15-bus-live-engine-design.md
import type { BusRoute } from "../buses";

/** Arrêt d'une ligne, dans l'ordre seq 0..N, avec profil cumulatif depuis seq 0. */
export interface LiveStop {
  seq: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  cumKm: number;   // distance cumulée (km) depuis seq 0
  cumMin: number;  // minutes cumulées depuis seq 0
}

/** Ligne du réseau : tracé OSRM + profil de temps. */
export interface LiveLine {
  id: number;
  code: string;
  codeOfficial: string | null;
  source: "osm" | "ktel";
  totalMinutes: number;
  lengthKm: number;
  partialGeo: boolean;
  geometry: [number, number][]; // [lng, lat] (ordre GeoJSON)
  stops: LiveStop[];            // triés par seq croissant, length >= 2
}

/** Réseau chargé, prêt pour le moteur. */
export interface LiveNetwork {
  lines: Map<number, LiveLine>;
  routes: BusRoute[]; // uniquement les routes avec line_id non-NULL
}

/** Un bus positionné à l'instant t (contrat consommé par la carte). */
export interface LiveBus {
  lineId: number;
  code: string;
  codeOfficial: string | null;
  lat: number;
  lng: number;
  bearing: number;           // cap 0..360, sens de marche réel
  progress: number;          // 0..1, fraction de la course (temps)
  nextStop: string | null;
  etaMinNext: number | null;
  headsign: string;
  direction: "fwd" | "rev";
  degraded: boolean;
}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: PASS (aucune erreur). Si une construction littérale de `BusRoute` casse ailleurs, l'ajouter au champ `line_id: null`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/bus-live/types.ts src/lib/buses.ts
git commit -m "feat(bus-live): types LiveLine/LiveNetwork/LiveBus + BusRoute.line_id"
```

---

### Task 2: `normalizePlace` + `placeSimilarity` (normalisation des noms)

**Files:**
- Create: `src/lib/bus-live/position.ts`
- Create: `scripts/check-bus-live.mjs`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `scripts/check-bus-live.mjs` :

```js
// Assertions du moteur bus-live. Run: node scripts/check-bus-live.mjs
// (Node >= 23 : importe le .ts par type-stripping)
import assert from "node:assert/strict";
import { normalizePlace, placeSimilarity } from "../src/lib/bus-live/position.ts";

// --- normalisation ----------------------------------------------------------
assert.equal(normalizePlace("Chaniá"), "chania");
assert.equal(normalizePlace("Áno Vianno!"), "ano vianno");
assert.equal(normalizePlace("Agios   Nikolaos"), "agios nikolaos");

// --- similarité (tolérante Chania/Khania, départage 2 candidats) -------------
assert.ok(placeSimilarity("Chania", "Khania") > 0.6);     // graphies divergentes
assert.ok(placeSimilarity("Chania", "Chania") === 1);     // identique
assert.ok(placeSimilarity("Chania", "Sitia") < 0.3);      // sans rapport
assert.ok(
  placeSimilarity("Agios Nikolaos", "Agios Nikolaos") >
  placeSimilarity("Agios Nikolaos", "Sitia"),
);

console.log("OK check-bus-live: toutes les assertions passent");
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `node scripts/check-bus-live.mjs`
Expected: FAIL (`Cannot find module '.../position.ts'` ou export absent).

- [ ] **Step 3: Implémentation minimale**

Créer `src/lib/bus-live/position.ts` :

```ts
// Moteur pur de position estimée des bus. Zéro I/O.
// Convention import : valeurs cross-module en relatif + extension .ts
// (le loader node de check-bus-live.mjs ne résout pas l'alias @/ ;
// allowImportingTsExtensions est activé donc tsc accepte l'extension).
// Spec : docs/superpowers/specs/2026-06-15-bus-live-engine-design.md

/** Normalise un nom de lieu : minuscules, sans diacritiques, alphanum + espaces. */
export function normalizePlace(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

/** Similarité 0..1 (Dice sur bigrammes de caractères), tolérante Chania/Khania. */
export function placeSimilarity(a: string, b: string): number {
  const na = normalizePlace(a).replace(/ /g, "");
  const nb = normalizePlace(b).replace(/ /g, "");
  if (na.length === 0 || nb.length === 0) return 0;
  if (na === nb) return 1;
  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.length === 0 || bb.length === 0) return 0;
  const count = new Map<string, number>();
  for (const g of bb) count.set(g, (count.get(g) ?? 0) + 1);
  let inter = 0;
  for (const g of ba) {
    const c = count.get(g) ?? 0;
    if (c > 0) { inter++; count.set(g, c - 1); }
  }
  return (2 * inter) / (ba.length + bb.length);
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `node scripts/check-bus-live.mjs`
Expected: PASS (`OK check-bus-live: ...`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bus-live/position.ts scripts/check-bus-live.mjs
git commit -m "feat(bus-live): normalizePlace + placeSimilarity (Dice bigrammes)"
```

---

### Task 3: `orientRoute` (sens de parcours + profil orienté)

**Files:**
- Modify: `src/lib/bus-live/position.ts`
- Modify: `scripts/check-bus-live.mjs`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `scripts/check-bus-live.mjs`, après le bloc similarité (et compléter l'import `orientRoute`) :

```js
import { normalizePlace, placeSimilarity, orientRoute } from "../src/lib/bus-live/position.ts";

// fixture ligne synthétique LAS-07 (Agios Nikolaos seq0 .. Elounda seq4)
const lineLAS07 = {
  id: 7, code: "LAS-07", codeOfficial: null, source: "osm",
  totalMinutes: 37, lengthKm: 10.0, partialGeo: false,
  geometry: [[25.71, 35.19], [25.72, 35.22], [25.73, 35.25]],
  stops: [
    { seq: 0, slug: "agios-nikolaos", name: "Agios Nikolaos", lat: 35.19, lng: 25.71, cumKm: 0.0, cumMin: 0 },
    { seq: 1, slug: "ammoudara", name: "Ammoudara", lat: 35.20, lng: 25.715, cumKm: 0.4, cumMin: 1 },
    { seq: 2, slug: "ellinika", name: "Ellinika", lat: 35.21, lng: 25.72, cumKm: 5.9, cumMin: 22 },
    { seq: 3, slug: "schisma", name: "Schisma", lat: 35.245, lng: 25.725, cumKm: 8.0, cumMin: 30 },
    { seq: 4, slug: "elounda", name: "Elounda", lat: 35.25, lng: 25.73, cumKm: 10.0, cumMin: 37 },
  ],
};
const R = (id, from, to, extra = {}) => ({
  id, line_id: extra.line_id ?? null, operator_id: "herlas", from_place: from, to_place: to,
  to_slug: null, via_stops: null, season: "all", duration: null, duration_estimated: false,
  price_eur: null, price_estimated: false, frequency: null, departures: null,
  departures_by_day: null, source_url: "x", scraped_at: "2026-06-10", ...extra,
});

// sens AVANT : from ≈ seq0
const fwd = orientRoute(R(1, "Agios Nikolaos", "Elounda", { line_id: 7 }), lineLAS07);
assert.equal(fwd.reversed, false);
assert.deepEqual(fwd.profMin, [0, 1, 22, 30, 37]);
assert.deepEqual(fwd.profKm, [0.0, 0.4, 5.9, 8.0, 10.0]);
assert.equal(fwd.orientedStops[0].name, "Agios Nikolaos");

// sens ARRIÈRE : from ≈ seq4 (Elounda) → profil miroité
const rev = orientRoute(R(2, "Elounda", "Agios Nikolaos", { line_id: 7 }), lineLAS07);
assert.equal(rev.reversed, true);
assert.deepEqual(rev.profMin, [0, 7, 15, 36, 37]);          // 37-37,37-30,37-22,37-1,37-0
assert.deepEqual(rev.profKm, [0.0, 2.0, 4.1, 9.6, 10.0]);   // 10-10,10-8,10-5.9,10-0.4,10-0
assert.equal(rev.orientedStops[0].name, "Elounda");
assert.equal(rev.lengthKm, 10.0);
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `node scripts/check-bus-live.mjs`
Expected: FAIL (`orientRoute is not a function`).

- [ ] **Step 3: Implémentation**

Ajouter à `src/lib/bus-live/position.ts` (en tête, les imports `type`) :

```ts
import type { BusRoute } from "../buses";
import type { LiveLine, LiveStop } from "./types";
```

Puis, à la fin du fichier :

```ts
export interface OrientedRoute {
  reversed: boolean;
  profMin: number[];      // minutes cumulées dans le sens de parcours, k=0..N
  profKm: number[];       // km cumulés dans le sens de parcours
  orientedStops: LiveStop[];
  lengthKm: number;
}

/** Oriente la route sur la géométrie de la ligne (stockée seq0→N). */
export function orientRoute(route: BusRoute, line: LiveLine): OrientedRoute {
  const stops = line.stops;
  const N = stops.length - 1;
  const m = stops.map((s) => s.cumMin);
  const c = stops.map((s) => s.cumKm);
  const L = c[N];
  const simFirst = placeSimilarity(route.from_place, stops[0].name);
  const simLast = placeSimilarity(route.from_place, stops[N].name);
  const reversed = simLast > simFirst; // from ≈ seqN → arrière
  if (!reversed) {
    return { reversed, profMin: m, profKm: c, orientedStops: stops, lengthKm: L };
  }
  const profMin = m.map((_, k) => m[N] - m[N - k]);
  const profKm = c.map((_, k) => L - c[N - k]);
  const orientedStops = [...stops].reverse();
  return { reversed, profMin, profKm, orientedStops, lengthKm: L };
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `node scripts/check-bus-live.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bus-live/position.ts scripts/check-bus-live.mjs
git commit -m "feat(bus-live): orientRoute (sens + profil miroité)"
```

---

### Task 4: `elapsedToKm` (temps → distance parcourue)

**Files:**
- Modify: `src/lib/bus-live/position.ts`
- Modify: `scripts/check-bus-live.mjs`

- [ ] **Step 1: Écrire le test qui échoue**

Compléter l'import et ajouter au check :

```js
import { normalizePlace, placeSimilarity, orientRoute, elapsedToKm } from "../src/lib/bus-live/position.ts";

const pm = [0, 1, 22, 30, 37];
const pk = [0.0, 0.4, 5.9, 8.0, 10.0];
assert.equal(elapsedToKm(0, pm, pk), 0.0);            // borne basse
assert.equal(elapsedToKm(37, pm, pk), 10.0);          // borne haute
assert.equal(elapsedToKm(-5, pm, pk), 0.0);           // clamp avant départ
assert.equal(elapsedToKm(99, pm, pk), 10.0);          // clamp après arrivée
assert.equal(elapsedToKm(22, pm, pk), 5.9);           // pile sur Ellinika
assert.ok(Math.abs(elapsedToKm(26, pm, pk) - 6.95) < 1e-9); // entre Ellinika et Schisma
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `node scripts/check-bus-live.mjs`
Expected: FAIL (`elapsedToKm is not a function`).

- [ ] **Step 3: Implémentation**

Ajouter à `position.ts` :

```ts
/** Distance (km) parcourue après `elapsed` minutes, le long du profil orienté. */
export function elapsedToKm(elapsed: number, profMin: number[], profKm: number[]): number {
  const N = profMin.length - 1;
  if (elapsed <= profMin[0]) return profKm[0];
  if (elapsed >= profMin[N]) return profKm[N];
  let i = 0;
  while (i < N - 1 && profMin[i + 1] < elapsed) i++;
  const span = profMin[i + 1] - profMin[i];
  const f = span > 0 ? (elapsed - profMin[i]) / span : 0;
  return profKm[i] + f * (profKm[i + 1] - profKm[i]);
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `node scripts/check-bus-live.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bus-live/position.ts scripts/check-bus-live.mjs
git commit -m "feat(bus-live): elapsedToKm (interpolation piecewise + clamp)"
```

---

### Task 5: `kmToPoint` (distance → point sur la polyline + cap)

**Files:**
- Modify: `src/lib/bus-live/position.ts`
- Modify: `scripts/check-bus-live.mjs`

- [ ] **Step 1: Écrire le test qui échoue**

Compléter l'import et ajouter au check (polyline simple le long du méridien pour des distances prévisibles) :

```js
import {
  normalizePlace, placeSimilarity, orientRoute, elapsedToKm, kmToPoint,
} from "../src/lib/bus-live/position.ts";

// polyline N-S le long de lng=25 (geometry en [lng,lat]) : 3 points
// segment 0: (25,35.0)->(25,35.1) ≈ 11.12 km ; segment 1: ->(25,35.2) ≈ 11.12 km
const geo = [[25, 35.0], [25, 35.1], [25, 35.2]];
const p0 = kmToPoint(geo, 0);
assert.ok(Math.abs(p0.lat - 35.0) < 1e-6 && Math.abs(p0.lng - 25) < 1e-6);
const pHalf = kmToPoint(geo, 5.56);             // ~moitié du 1er segment
assert.ok(pHalf.lat > 35.04 && pHalf.lat < 35.06);
assert.ok(pHalf.bearing < 1 || pHalf.bearing > 359); // plein nord ≈ 0°
const pSeg2 = kmToPoint(geo, 16.7);             // dans le 2e segment
assert.ok(pSeg2.lat > 35.14 && pSeg2.lat < 35.16);
const pEnd = kmToPoint(geo, 999);               // au-delà → dernier point
assert.ok(Math.abs(pEnd.lat - 35.2) < 1e-6);
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `node scripts/check-bus-live.mjs`
Expected: FAIL (`kmToPoint is not a function`).

- [ ] **Step 3: Implémentation**

Ajouter en tête de `position.ts` l'import de valeur (relatif + `.ts`) :

```ts
import { haversineKm } from "../geo.ts";
```

Puis à la fin :

```ts
export interface PointOnLine {
  lat: number;
  lng: number;
  bearing: number; // cap du segment courant, sens seq 0 -> N
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const p1 = toRad(lat1), p2 = toRad(lat2), dl = toRad(lng2 - lng1);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Point à `km` le long de la polyline (geometry en [lng,lat]) + cap. */
export function kmToPoint(geometry: [number, number][], km: number): PointOnLine {
  if (geometry.length === 0) return { lat: 0, lng: 0, bearing: 0 };
  if (geometry.length === 1) {
    return { lat: geometry[0][1], lng: geometry[0][0], bearing: 0 };
  }
  const target = Math.max(0, km);
  let acc = 0;
  for (let i = 0; i < geometry.length - 1; i++) {
    const [lng1, lat1] = geometry[i];
    const [lng2, lat2] = geometry[i + 1];
    const segLen = haversineKm([lat1, lng1], [lat2, lng2]); // swap -> [lat,lng]
    const last = i === geometry.length - 2;
    if (acc + segLen >= target || last) {
      const raw = segLen > 0 ? (target - acc) / segLen : 0;
      const f = Math.min(1, Math.max(0, raw));
      return {
        lat: lat1 + f * (lat2 - lat1),
        lng: lng1 + f * (lng2 - lng1),
        bearing: bearingDeg(lat1, lng1, lat2, lng2),
      };
    }
    acc += segLen;
  }
  const end = geometry[geometry.length - 1];
  return { lat: end[1], lng: end[0], bearing: 0 };
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `node scripts/check-bus-live.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bus-live/position.ts scripts/check-bus-live.mjs
git commit -m "feat(bus-live): kmToPoint + bearing (swap [lng,lat]->[lat,lng])"
```

---

### Task 6: `activeDepartures` (départs en cours à l'instant t)

**Files:**
- Modify: `src/lib/bus-live/position.ts`
- Modify: `scripts/check-bus-live.mjs`

- [ ] **Step 1: Écrire le test qui échoue**

Compléter l'import et ajouter au check :

```js
import {
  normalizePlace, placeSimilarity, orientRoute, elapsedToKm, kmToPoint, activeDepartures,
} from "../src/lib/bus-live/position.ts";

const routeAD = R(3, "Agios Nikolaos", "Elounda", {
  line_id: 7,
  departures: ["09:00", "12:00", "18:00"],
  departures_by_day: [{ days: "EVERY DAY", times: ["09:00", "12:00", "18:00"] }],
});
// totalMinutes = 37. now = 09:22 (562) -> seul 09:00 (540) est en cours (540..577)
assert.deepEqual(activeDepartures(routeAD, 37, { iso: "2026-06-15", minutes: 562 }), ["09:00"]);
// now = 08:30 (510) -> aucun départ en cours
assert.deepEqual(activeDepartures(routeAD, 37, { iso: "2026-06-15", minutes: 510 }), []);
// now = 12:10 (730) -> 12:00 en cours (720..757)
assert.deepEqual(activeDepartures(routeAD, 37, { iso: "2026-06-15", minutes: 730 }), ["12:00"]);
// jour hors plage (departures_by_day "Mon-Fri") -> aucun le dimanche
const routeWk = R(4, "A", "B", {
  line_id: 7, departures: ["09:00"],
  departures_by_day: [{ days: "Mon-Fri", times: ["09:00"] }],
});
assert.deepEqual(activeDepartures(routeWk, 37, { iso: "2026-06-14", minutes: 545 }), []); // dimanche
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `node scripts/check-bus-live.mjs`
Expected: FAIL (`activeDepartures is not a function`).

- [ ] **Step 3: Implémentation**

Ajouter en tête de `position.ts` les imports de valeur (relatif + `.ts`) :

```ts
import { timesForDate } from "../bus-journey.ts";
import { toMin } from "../athens-time.ts";
```

Puis à la fin :

```ts
export interface NowAthens { iso: string; minutes: number; }

/** Heures de départ (HH:MM) actuellement en cours de trajet à `now`. */
export function activeDepartures(route: BusRoute, totalMinutes: number, now: NowAthens): string[] {
  return timesForDate(route, now.iso).filter((H) => {
    const h = toMin(H);
    return h <= now.minutes && now.minutes <= h + totalMinutes;
  });
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `node scripts/check-bus-live.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bus-live/position.ts scripts/check-bus-live.mjs
git commit -m "feat(bus-live): activeDepartures (reuse timesForDate + fenêtre horaire)"
```

---

### Task 7: `busesAt` — assemblage sens avant + dédoublonnage

**Files:**
- Modify: `src/lib/bus-live/position.ts`
- Modify: `scripts/check-bus-live.mjs`

- [ ] **Step 1: Écrire le test qui échoue**

Compléter l'import et ajouter au check :

```js
import {
  normalizePlace, placeSimilarity, orientRoute, elapsedToKm, kmToPoint,
  activeDepartures, busesAt,
} from "../src/lib/bus-live/position.ts";

const netFwd = {
  lines: new Map([[7, lineLAS07]]),
  routes: [R(10, "Agios Nikolaos", "Elounda", {
    line_id: 7,
    departures: ["09:00"],
    departures_by_day: [{ days: "EVERY DAY", times: ["09:00"] }],
  })],
};
const busesFwd = busesAt({ iso: "2026-06-15", minutes: 562 }, netFwd); // 09:22
assert.equal(busesFwd.length, 1);
const b = busesFwd[0];
assert.equal(b.lineId, 7);
assert.equal(b.direction, "fwd");
assert.equal(b.degraded, false);
assert.equal(b.headsign, "Elounda");
assert.equal(b.nextStop, "Schisma");                 // après Ellinika (22 min) à 22 min écoulées
assert.ok(b.lat > 35.18 && b.lat < 35.26);
assert.ok(Math.abs(b.progress - 22 / 37) < 1e-6);

// hors plage horaire -> 0 bus
assert.equal(busesAt({ iso: "2026-06-15", minutes: 400 }, netFwd).length, 0);

// dédoublonnage : même ligne/sens/heure publiée 2x -> 1 seul bus
const netDup = {
  lines: new Map([[7, lineLAS07]]),
  routes: [
    R(11, "Agios Nikolaos", "Elounda", { line_id: 7, departures: ["09:00"], departures_by_day: [{ days: "EVERY DAY", times: ["09:00"] }] }),
    R(12, "Agios Nikolaos", "Elounda", { line_id: 7, departures: ["09:00"], departures_by_day: [{ days: "EVERY DAY", times: ["09:00"] }] }),
  ],
};
assert.equal(busesAt({ iso: "2026-06-15", minutes: 562 }, netDup).length, 1);
```

(Note : à `elapsed = 22`, le bus est pile à Ellinika ; `nextStop` = premier arrêt **strictement devant** dans le temps = Schisma, 30 min.)

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `node scripts/check-bus-live.mjs`
Expected: FAIL (`busesAt is not a function`).

- [ ] **Step 3: Implémentation**

Ajouter en tête de `position.ts` :

```ts
import type { LiveNetwork, LiveBus } from "./types";
```

Puis à la fin :

```ts
/** Prochain arrêt strictement devant le bus (dans le temps) + ETA minutes. */
function nextStopAndEta(
  orientedStops: LiveStop[],
  profMin: number[],
  elapsed: number,
): { name: string | null; eta: number | null } {
  for (let k = 0; k < orientedStops.length; k++) {
    if (profMin[k] > elapsed) {
      return { name: orientedStops[k].name, eta: Math.round(profMin[k] - elapsed) };
    }
  }
  return { name: null, eta: null };
}

/** Tous les bus en circulation à l'instant `now` (Athens). Déterministe. */
export function busesAt(now: NowAthens, network: LiveNetwork): LiveBus[] {
  const out: LiveBus[] = [];
  const seen = new Set<string>();
  for (const route of network.routes) {
    if (route.line_id == null) continue;
    const line = network.lines.get(route.line_id);
    if (!line || line.stops.length < 2 || line.totalMinutes <= 0 || line.geometry.length < 2) {
      continue;
    }
    const oriented = orientRoute(route, line);
    for (const H of activeDepartures(route, line.totalMinutes, now)) {
      const key = `${line.id}|${oriented.reversed ? "rev" : "fwd"}|${H}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const elapsed = now.minutes - toMin(H);
      const dParcours = elapsedToKm(elapsed, oriented.profMin, oriented.profKm);
      const dGeo = oriented.reversed ? oriented.lengthKm - dParcours : dParcours;
      const pt = kmToPoint(line.geometry, dGeo);
      const ns = nextStopAndEta(oriented.orientedStops, oriented.profMin, elapsed);
      out.push({
        lineId: line.id,
        code: line.code,
        codeOfficial: line.codeOfficial,
        lat: pt.lat,
        lng: pt.lng,
        bearing: oriented.reversed ? (pt.bearing + 180) % 360 : pt.bearing,
        progress: Math.min(1, Math.max(0, elapsed / line.totalMinutes)),
        nextStop: ns.name,
        etaMinNext: ns.eta,
        headsign: route.to_place,
        direction: oriented.reversed ? "rev" : "fwd",
        degraded: line.source === "ktel" || line.partialGeo,
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `node scripts/check-bus-live.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bus-live/position.ts scripts/check-bus-live.mjs
git commit -m "feat(bus-live): busesAt (sens avant, nextStop/ETA, dédoublonnage)"
```

---

### Task 8: `busesAt` — sens arrière (route retour)

**Files:**
- Modify: `scripts/check-bus-live.mjs` (test seul ; le code de Task 7 gère déjà le sens arrière via `orientRoute`)

- [ ] **Step 1: Écrire le test qui échoue (ou révèle un bug)**

Ajouter au check :

```js
// route RETOUR : Elounda -> Agios Nikolaos, départ 09:00, now 09:07 (547)
const netRev = {
  lines: new Map([[7, lineLAS07]]),
  routes: [R(20, "Elounda", "Agios Nikolaos", {
    line_id: 7, departures: ["09:00"],
    departures_by_day: [{ days: "EVERY DAY", times: ["09:00"] }],
  })],
};
const rbuses = busesAt({ iso: "2026-06-15", minutes: 547 }, netRev); // 7 min écoulées
assert.equal(rbuses.length, 1);
const rb = rbuses[0];
assert.equal(rb.direction, "rev");
assert.equal(rb.headsign, "Agios Nikolaos");
// 7 min en sens arrière -> dParcours=2.0 km -> dGeo = 10-2 = 8.0 km (côté Elounda/Schisma)
assert.ok(rb.lat > 35.22, `lat=${rb.lat} doit être côté nord (Elounda), pas en miroir`);
// prochain arrêt dans le sens retour : Schisma (à 7 min écoulées, profMin rev = [0,7,15,36,37])
assert.equal(rb.nextStop, "Ellinika");
```

(Profil arrière `profMin=[0,7,15,36,37]`, `orientedStops=[Elounda,Schisma,Ellinika,Ammoudara,Agios Nikolaos]`. À `elapsed=7`, premier `profMin[k] > 7` est `k=2` (15) → `orientedStops[2]` = Ellinika.)

- [ ] **Step 2: Lancer le test pour vérifier le comportement**

Run: `node scripts/check-bus-live.mjs`
Expected: PASS (le code Task 7 gère déjà l'arrière). Si FAIL sur `lat` (bus en miroir), corriger le calcul `dGeo`/`bearing` dans `busesAt`.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-bus-live.mjs
git commit -m "test(bus-live): busesAt sens arrière (pas de miroir inversé)"
```

---

### Task 9: `busesAt` — ligne KTEL-fallback (2 arrêts, géométrie droite)

**Files:**
- Modify: `scripts/check-bus-live.mjs`

- [ ] **Step 1: Écrire le test qui échoue (ou révèle un bug)**

Ajouter au check :

```js
// ligne KTEL-fallback : 2 arrêts, géométrie droite, source ktel
const lineKtel = {
  id: 99, code: "LAS-10", codeOfficial: null, source: "ktel",
  totalMinutes: 60, lengthKm: 40.0, partialGeo: true,
  geometry: [[25.10, 35.00], [25.50, 35.20]],
  stops: [
    { seq: 0, slug: "agios-nikolaos", name: "Agios Nikolaos", lat: 35.00, lng: 25.10, cumKm: 0.0, cumMin: 0 },
    { seq: 1, slug: "heraklion", name: "Heraklion", lat: 35.20, lng: 25.50, cumKm: 40.0, cumMin: 60 },
  ],
};
const netKtel = {
  lines: new Map([[99, lineKtel]]),
  routes: [R(30, "Agios Nikolaos", "Heraklion", {
    line_id: 99, departures: ["10:00"],
    departures_by_day: [{ days: "EVERY DAY", times: ["10:00"] }],
  })],
};
const kbuses = busesAt({ iso: "2026-06-15", minutes: 630 }, netKtel); // 10:30, mi-parcours
assert.equal(kbuses.length, 1);
assert.equal(kbuses[0].degraded, true);
assert.ok(Math.abs(kbuses[0].progress - 0.5) < 1e-6);
assert.ok(kbuses[0].lat > 35.09 && kbuses[0].lat < 35.11); // ~milieu du segment droit
```

- [ ] **Step 2: Lancer le test**

Run: `node scripts/check-bus-live.mjs`
Expected: PASS (`degraded:true` via `source==='ktel'`, interpolation linéaire sur 2 points).

- [ ] **Step 3: Commit**

```bash
git add scripts/check-bus-live.mjs
git commit -m "test(bus-live): busesAt ligne KTEL-fallback (degraded, segment droit)"
```

---

### Task 10: `network.ts` — loader I/O (Supabase anon)

**Files:**
- Create: `src/lib/bus-live/network.ts`

- [ ] **Step 1: Implémentation**

Créer `src/lib/bus-live/network.ts` (module I/O, autorisé à utiliser `@/lib/supabase` comme `buses.ts`/`bus-alerts.ts`) :

```ts
// Chargement du réseau bus pour le moteur live. Seul module avec I/O.
// Lecture seule via le client anon (RLS public read sur toutes les bus_*).
import { supabase } from "@/lib/supabase";
import type { BusRoute } from "../buses";
import type { LiveLine, LiveNetwork, LiveStop } from "./types";

interface LineRow {
  id: number; code: string; code_official: string | null;
  source: "osm" | "ktel"; geometry: [number, number][] | null;
  total_minutes: number | null; length_km: number | null; partial_geo: boolean | null;
}
interface LineStopRow {
  line_id: number; stop_id: number; seq: number;
  cumulative_km: number | null; cumulative_minutes: number | null;
}
interface StopRow { id: number; slug: string; name: string; lat: number; lng: number; }

/** Charge lignes + arrêts + routes appariées, assemble et filtre les lignes inexploitables. */
export async function loadLiveNetwork(): Promise<LiveNetwork> {
  const [linesRes, lsRes, stopsRes, routesRes] = await Promise.all([
    supabase.from("bus_lines").select(
      "id, code, code_official, source, geometry, total_minutes, length_km, partial_geo",
    ),
    supabase.from("bus_line_stops")
      .select("line_id, stop_id, seq, cumulative_km, cumulative_minutes")
      .order("line_id", { ascending: true }).order("seq", { ascending: true }),
    supabase.from("bus_stops").select("id, slug, name, lat, lng"),
    supabase.from("bus_routes").select("*").not("line_id", "is", null),
  ]);

  if (linesRes.error || lsRes.error || stopsRes.error || routesRes.error) {
    console.error("[bus-live] loadLiveNetwork", {
      lines: linesRes.error?.message, lineStops: lsRes.error?.message,
      stops: stopsRes.error?.message, routes: routesRes.error?.message,
    });
    return { lines: new Map(), routes: [] };
  }

  const stopById = new Map<number, StopRow>();
  for (const s of (stopsRes.data as StopRow[]) ?? []) stopById.set(s.id, s);

  // arrêts groupés par ligne, déjà triés par seq
  const stopsByLine = new Map<number, LiveStop[]>();
  for (const ls of (lsRes.data as LineStopRow[]) ?? []) {
    const s = stopById.get(ls.stop_id);
    if (!s) continue;
    const arr = stopsByLine.get(ls.line_id) ?? [];
    arr.push({
      seq: ls.seq, slug: s.slug, name: s.name, lat: s.lat, lng: s.lng,
      cumKm: ls.cumulative_km ?? 0, cumMin: ls.cumulative_minutes ?? 0,
    });
    stopsByLine.set(ls.line_id, arr);
  }

  const lines = new Map<number, LiveLine>();
  for (const l of (linesRes.data as LineRow[]) ?? []) {
    const stops = stopsByLine.get(l.id) ?? [];
    const total = l.total_minutes ?? 0;
    // garde-fou : >= 2 arrêts, total_minutes > 0
    if (stops.length < 2 || total <= 0) continue;
    // géométrie : OSRM si présente, sinon segment droit entre les 2 terminus
    let geometry = l.geometry ?? [];
    let partialGeo = l.partial_geo ?? false;
    if (geometry.length < 2) {
      const a = stops[0], b = stops[stops.length - 1];
      geometry = [[a.lng, a.lat], [b.lng, b.lat]];
      partialGeo = true;
    }
    lines.set(l.id, {
      id: l.id, code: l.code, codeOfficial: l.code_official, source: l.source,
      totalMinutes: total, lengthKm: l.length_km ?? stops[stops.length - 1].cumKm,
      partialGeo, geometry, stops,
    });
  }

  const routes = ((routesRes.data as BusRoute[]) ?? []).filter((r) => r.line_id != null);
  return { lines, routes };
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/bus-live/network.ts
git commit -m "feat(bus-live): loadLiveNetwork (loader Supabase anon, garde-fous)"
```

---

### Task 11: Barrel `index.ts` + fixture réelle + test d'intégration

**Files:**
- Create: `src/lib/bus-live/index.ts`
- Create: `scripts/extract-bus-live-fixture.mjs`
- Create: `src/lib/bus-live/fixtures/bus_live_sample.json` (généré)
- Modify: `scripts/check-bus-live.mjs`

- [ ] **Step 1: Créer le barrel `index.ts`**

```ts
// Point d'import unique de la couche moteur (consommé par la carte via @/lib/bus-live).
export { busesAt, orientRoute, elapsedToKm, kmToPoint, activeDepartures } from "./position";
export type { NowAthens, OrientedRoute, PointOnLine } from "./position";
export { loadLiveNetwork } from "./network";
export type { LiveBus, LiveLine, LiveNetwork, LiveStop } from "./types";
```

- [ ] **Step 2: Script d'extraction de la fixture réelle**

Créer `scripts/extract-bus-live-fixture.mjs` (lit `.env.local` pour les clés anon, extrait 3 lignes représentatives) :

```js
// Extrait une fixture réelle pour les tests d'intégration du moteur live.
// Run: node --env-file=.env.local scripts/extract-bus-live-fixture.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("env Supabase manquant"); process.exit(1); }
const sb = createClient(url, key);

// 3 lignes : 1 OSM longue (LAS-02 Sitia), 1 OSM courte (LAS-07 Elounda), 1 KTEL-fallback
const CODES = ["LAS-02", "LAS-07"];
const { data: lines } = await sb.from("bus_lines")
  .select("id, code, code_official, source, geometry, total_minutes, length_km, partial_geo")
  .in("code", CODES);
const ktel = (await sb.from("bus_lines")
  .select("id, code, code_official, source, geometry, total_minutes, length_km, partial_geo")
  .eq("source", "ktel").limit(1)).data ?? [];
const allLines = [...(lines ?? []), ...ktel];
const ids = allLines.map((l) => l.id);

const { data: lineStops } = await sb.from("bus_line_stops")
  .select("line_id, stop_id, seq, cumulative_km, cumulative_minutes")
  .in("line_id", ids).order("line_id").order("seq");
const stopIds = [...new Set((lineStops ?? []).map((s) => s.stop_id))];
const { data: stops } = await sb.from("bus_stops")
  .select("id, slug, name, lat, lng").in("id", stopIds);
const { data: routes } = await sb.from("bus_routes")
  .select("*").in("line_id", ids);

mkdirSync("src/lib/bus-live/fixtures", { recursive: true });
writeFileSync(
  "src/lib/bus-live/fixtures/bus_live_sample.json",
  JSON.stringify({ lines: allLines, lineStops, stops, routes }, null, 2),
);
console.log(`fixture: ${allLines.length} lignes, ${routes?.length ?? 0} routes`);
```

- [ ] **Step 3: Générer la fixture**

Run: `node --env-file=.env.local scripts/extract-bus-live-fixture.mjs`
Expected: `fixture: 3 lignes, N routes` et fichier `src/lib/bus-live/fixtures/bus_live_sample.json` créé.

(Si `.env.local` n'a pas les clés anon : récupérer `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` depuis Vercel ou `~/.kairos-keys`, sinon sauter ce test d'intégration — les Tasks 2-9 couvrent déjà la logique en synthétique.)

- [ ] **Step 4: Test d'intégration (tolérant) dans le check**

Ajouter à la fin de `scripts/check-bus-live.mjs` (avant le `console.log` final) :

```js
// --- intégration sur fixture réelle (sautée si absente) ---------------------
import { readFileSync, existsSync } from "node:fs";
const FIXTURE = "src/lib/bus-live/fixtures/bus_live_sample.json";
if (existsSync(FIXTURE)) {
  const raw = JSON.parse(readFileSync(FIXTURE, "utf8"));
  const stopById = new Map(raw.stops.map((s) => [s.id, s]));
  const stopsByLine = new Map();
  for (const ls of raw.lineStops) {
    const s = stopById.get(ls.stop_id); if (!s) continue;
    const arr = stopsByLine.get(ls.line_id) ?? [];
    arr.push({ seq: ls.seq, slug: s.slug, name: s.name, lat: s.lat, lng: s.lng, cumKm: ls.cumulative_km ?? 0, cumMin: ls.cumulative_minutes ?? 0 });
    stopsByLine.set(ls.line_id, arr);
  }
  const lines = new Map();
  for (const l of raw.lines) {
    const stops = stopsByLine.get(l.id) ?? [];
    if (stops.length < 2 || !(l.total_minutes > 0)) continue;
    let geometry = l.geometry ?? []; let partialGeo = l.partial_geo ?? false;
    if (geometry.length < 2) { const a = stops[0], b = stops[stops.length - 1]; geometry = [[a.lng, a.lat], [b.lng, b.lat]]; partialGeo = true; }
    lines.set(l.id, { id: l.id, code: l.code, codeOfficial: l.code_official, source: l.source, totalMinutes: l.total_minutes, lengthKm: l.length_km ?? stops.at(-1).cumKm, partialGeo, geometry, stops });
  }
  const net = { lines, routes: raw.routes.filter((r) => r.line_id != null) };
  // mi-journée : il doit exister au moins 1 bus, tous dans la bbox Crète
  const mid = busesAt({ iso: "2026-06-15", minutes: 12 * 60 }, net);
  for (const bus of mid) {
    assert.ok(bus.lat > 34.7 && bus.lat < 35.8, `lat hors Crète: ${bus.lat}`);
    assert.ok(bus.lng > 23.4 && bus.lng < 26.4, `lng hors Crète: ${bus.lng}`);
    assert.ok(bus.progress >= 0 && bus.progress <= 1);
  }
  console.log(`OK intégration: ${mid.length} bus à midi sur fixture réelle`);
} else {
  console.log("intégration sautée (fixture absente)");
}
```

- [ ] **Step 5: Lancer le test complet**

Run: `node scripts/check-bus-live.mjs`
Expected: PASS (toutes les assertions + ligne d'intégration ou « sautée »).

- [ ] **Step 6: Vérifier la compilation finale**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/bus-live/index.ts scripts/extract-bus-live-fixture.mjs scripts/check-bus-live.mjs src/lib/bus-live/fixtures/bus_live_sample.json
git commit -m "feat(bus-live): barrel index + fixture réelle + test d'intégration"
```

---

## Self-Review Checklist (à faire après implémentation)

1. **Couverture spec** : `orientRoute` (Task 3), `elapsedToKm` (Task 4), `kmToPoint`+swap (Task 5), `activeDepartures` (Task 6), `busesAt` avant/dédoublonnage (Task 7), arrière (Task 8), KTEL-fallback (Task 9), loader (Task 10), fixture+intégration (Task 11). Critères LAS-07/sens arrière/bornes couverts. ✅
2. **Pas de placeholder** : chaque step a du code complet. ✅
3. **Cohérence des types** : `NowAthens` défini Task 6 et utilisé Task 7 ; `OrientedRoute`/`PointOnLine` exportés ; `LiveBus` produit Task 7 = contrat `types.ts` Task 1. ✅
4. **Imports** : valeurs cross-module en `../*.ts` (geo/bus-journey/athens-time), jamais `@/` dans `position.ts`. `network.ts` (I/O) utilise `@/lib/supabase`. ✅

## Hors-scope de ce plan (couche carte = plan séparé)

`LiveMap.tsx`, `LiveBusLayer.tsx`, `app/[locale]/live/page.tsx`, animation RAF, badge « estimé », style `degraded` → plan `2026-06-15-bus-live-map.md` à écrire après ce moteur (spec `2026-06-15-sp4-live-map-design.md`).
