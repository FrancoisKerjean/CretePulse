# Carte /live — sélection interactive d'un bus — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur la page `/live`, cliquer un bus fait ressortir sa ligne (les autres estompées) avec ses arrêts (prochain en avant) et ouvre un bottom sheet (opérateur, origine → destination, prochain arrêt + heure, arrivée terminus via durée KTEL réelle, progression, lien « Voir la ligne »), avec recentrage doux.

**Architecture:** On n'altère pas le moteur de positionnement ; on l'**enrichit** (le `LiveBus` gagne 5 champs déjà calculés mais jetés). Trois nouveaux modules **purs et testés** (`duration.ts`, `selection.ts`, `clockHHMM`), un bottom sheet de présentation pure (`BusSheet.tsx`), et la couche d'orchestration carte dans `LiveMapClient.tsx`. Gate = checks node + tsc + build + preview Vercel.

**Tech Stack:** Next.js 16, React 19, TypeScript, MapLibre GL 5.x, Supabase, tests `node --experimental-strip-types` + `node:assert/strict` (pattern repo).

**Spec :** `docs/superpowers/specs/2026-06-16-live-bus-select-design.md`

---

## Notes transverses (lire avant de commencer)

- **Branche/worktree** : tout se fait sur la branche `feat/live-bus-select` (Task 1). Jamais sur `master`/`main`.
- **Imports moteur** : la couche `src/lib/bus-live/*` impose les imports **relatifs avec extension `.ts`** (cf `position.ts:2-4`). Les composants utilisent l'alias `@/`.
- **Commits fréquents** : un commit par task (au minimum). `git add` **explicite** (jamais `git add -A`).
- **Lancer les tests** depuis le worktree : `node --experimental-strip-types scripts/check-bus-live-selection.mjs`.

---

## Task 1 : Worktree + branche + spec/plan versionnés

**Files :**
- Create (worktree) : `C:/Users/fkerj/cretepulse-livebus/` (branche `feat/live-bus-select`)
- Copy : le spec et ce plan (actuellement untracked dans le checkout principal) → dans le worktree

- [ ] **Step 1 : Créer le worktree depuis `origin/master`**

```bash
git -C C:/Users/fkerj/cretepulse-live fetch origin
git -C C:/Users/fkerj/cretepulse-live worktree add -b feat/live-bus-select C:/Users/fkerj/cretepulse-livebus origin/master
```

- [ ] **Step 2 : Jonctionner `node_modules` sur le checkout principal** (le worktree n'en a pas)

```bash
cmd /c mklink /J C:\Users\fkerj\cretepulse-livebus\node_modules C:\Users\fkerj\cretepulse-live\node_modules
```

- [ ] **Step 3 : Copier le spec et le plan (untracked) dans le worktree**

```bash
cp C:/Users/fkerj/cretepulse-live/docs/superpowers/specs/2026-06-16-live-bus-select-design.md C:/Users/fkerj/cretepulse-livebus/docs/superpowers/specs/
cp C:/Users/fkerj/cretepulse-live/docs/superpowers/plans/2026-06-16-live-bus-select.md C:/Users/fkerj/cretepulse-livebus/docs/superpowers/plans/
```

- [ ] **Step 4 : Commit du spec + plan**

```bash
cd C:/Users/fkerj/cretepulse-livebus
git add docs/superpowers/specs/2026-06-16-live-bus-select-design.md docs/superpowers/plans/2026-06-16-live-bus-select.md
git commit -m "docs: spec + plan carte /live sélection interactive d'un bus"
```

> **Tout le reste se passe dans `C:/Users/fkerj/cretepulse-livebus`.**

---

## Task 2 : `duration.ts` — parser de durée KTEL (pur, TDD)

**Files :**
- Create : `src/lib/bus-live/duration.ts`
- Create : `scripts/check-bus-live-selection.mjs`
- Modify : `package.json` (script `check:bus-select` + chaîne `check`)

- [ ] **Step 1 : Écrire le test qui échoue** — créer `scripts/check-bus-live-selection.mjs`

```js
// Assertions des couches sélection (durée, horloge, view-model, champs moteur).
// Run: node --experimental-strip-types scripts/check-bus-live-selection.mjs
import assert from "node:assert/strict";
import { parseDurationMin } from "../src/lib/bus-live/duration.ts";

// --- parseDurationMin -------------------------------------------------------
assert.equal(parseDurationMin("2h 30min"), 150);
assert.equal(parseDurationMin("2h30"), 150);
assert.equal(parseDurationMin("1h45"), 105);
assert.equal(parseDurationMin("1h"), 60);
assert.equal(parseDurationMin("1h30min"), 90);
assert.equal(parseDurationMin("20min"), 20);
assert.equal(parseDurationMin("45 min"), 45);
assert.equal(parseDurationMin(null), null);
assert.equal(parseDurationMin(""), null);
assert.equal(parseDurationMin("abc"), null);

console.log("OK check-bus-live-selection: toutes les assertions passent");
```

- [ ] **Step 2 : Câbler le script dans `package.json`** — ajouter aux `scripts` :

```json
"check:bus-select": "node --experimental-strip-types scripts/check-bus-live-selection.mjs",
```
et modifier la chaîne `check` pour l'inclure :
```json
"check": "npm run check:geo && npm run check:car-partners && npm run check:car-lead && npm run check:bus-select && tsc --noEmit",
```

- [ ] **Step 3 : Lancer le test, vérifier qu'il échoue**

Run : `node --experimental-strip-types scripts/check-bus-live-selection.mjs`
Expected : FAIL — `Cannot find module '../src/lib/bus-live/duration.ts'`

- [ ] **Step 4 : Implémenter `src/lib/bus-live/duration.ts`**

```ts
// Parse une durée KTEL texte ("2h 30min", "1h45", "20min", "1h") en minutes.
// null si vide ou illisible. Pur, zéro I/O.
export function parseDurationMin(s: string | null): number | null {
  if (!s) return null;
  const t = s.toLowerCase().replace(/\s+/g, "");
  const hm = t.match(/^(\d+)h(\d+)?(?:min)?$/); // 2h30 / 2h30min / 1h
  if (hm) return parseInt(hm[1], 10) * 60 + (hm[2] ? parseInt(hm[2], 10) : 0);
  const mm = t.match(/^(\d+)min$/); // 45min
  if (mm) return parseInt(mm[1], 10);
  return null;
}
```

- [ ] **Step 5 : Lancer le test, vérifier qu'il passe**

Run : `node --experimental-strip-types scripts/check-bus-live-selection.mjs`
Expected : PASS — `OK check-bus-live-selection: ...`

- [ ] **Step 6 : Commit**

```bash
git add src/lib/bus-live/duration.ts scripts/check-bus-live-selection.mjs package.json
git commit -m "feat(live): parseDurationMin + check câblé dans npm check"
```

---

## Task 3 : `clockHHMM` — formateur d'heure (pur, TDD)

**Files :**
- Modify : `src/lib/athens-time.ts` (ajout en fin de fichier)
- Modify : `scripts/check-bus-live-selection.mjs` (ajout section)

- [ ] **Step 1 : Ajouter le test qui échoue** — dans `scripts/check-bus-live-selection.mjs`, ajouter l'import en tête (sous celui de `parseDurationMin`) :

```js
import { clockHHMM } from "../src/lib/athens-time.ts";
```
et la section d'assertions **avant** la ligne `console.log("OK ...")` :

```js
// --- clockHHMM --------------------------------------------------------------
assert.equal(clockHHMM(0), "00:00");
assert.equal(clockHHMM(545), "09:05");
assert.equal(clockHHMM(1439), "23:59");
assert.equal(clockHHMM(1440), "00:00");   // minuit jour+1
assert.equal(clockHHMM(1505), "01:05");   // arrivée le lendemain
assert.equal(clockHHMM(-5), "23:55");     // borne négative
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `node --experimental-strip-types scripts/check-bus-live-selection.mjs`
Expected : FAIL — `clockHHMM is not a function` / import introuvable.

- [ ] **Step 3 : Implémenter `clockHHMM`** — ajouter en fin de `src/lib/athens-time.ts` :

```ts
/** Minutes-depuis-minuit (Athens) → "HH:MM", modulo 24h (gère l'arrivée le lendemain). */
export const clockHHMM = (minutes: number): string => {
  const m = (((Math.round(minutes) % 1440) + 1440) % 1440);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run : `node --experimental-strip-types scripts/check-bus-live-selection.mjs`
Expected : PASS

- [ ] **Step 5 : Commit**

```bash
git add src/lib/athens-time.ts scripts/check-bus-live-selection.mjs
git commit -m "feat(live): clockHHMM (minutes Athens → HH:MM, modulo 24h)"
```

---

## Task 4 : Enrichir le contrat `LiveBus` + le moteur (TDD)

**Files :**
- Modify : `src/lib/bus-live/types.ts` (5 champs sur `LiveBus`)
- Modify : `src/lib/bus-live/position.ts` (imports + remplissage à l'émission)
- Modify : `scripts/check-bus-live-selection.mjs` (assertions moteur)

- [ ] **Step 1 : Ajouter le test qui échoue** — dans `scripts/check-bus-live-selection.mjs`, ajouter l'import :

```js
import { busesAt } from "../src/lib/bus-live/position.ts";
```
et la section (avant le `console.log` final) :

```js
// --- moteur enrichi : origin / operatorId / pairSlug / etaMinTerminus -------
const line = {
  id: 7, code: "LAS-07", codeOfficial: null, source: "osm",
  totalMinutes: 60, lengthKm: 40, partialGeo: false,
  geometry: [[25.10, 35.00], [25.50, 35.20]],
  stops: [
    { seq: 0, slug: "agios-nikolaos", name: "Agios Nikolaos", lat: 35.00, lng: 25.10, cumKm: 0, cumMin: 0 },
    { seq: 1, slug: "heraklion", name: "Heraklion", lat: 35.20, lng: 25.50, cumKm: 40, cumMin: 60 },
  ],
};
const baseRoute = {
  id: 1, line_id: 7, operator_id: "herlas", from_place: "Agios Nikolaos", to_place: "Heraklion",
  to_slug: null, via_stops: null, season: "all", duration: "45min", duration_estimated: false,
  price_eur: null, price_estimated: false, frequency: null,
  departures: ["09:00"], departures_by_day: [{ days: "EVERY DAY", times: ["09:00"] }],
  source_url: "x", scraped_at: "2026-06-10",
};
const net = { lines: new Map([[7, line]]), routes: [baseRoute] };
const [bus] = busesAt({ iso: "2026-06-15", minutes: 562 }, net); // 09:22
assert.equal(bus.origin, "Agios Nikolaos");
assert.equal(bus.operatorId, "herlas");
assert.equal(bus.pairSlug, "agios-nikolaos-to-heraklion");
assert.equal(bus.durationEstimated, false);
assert.equal(bus.etaMinTerminus, 23); // toMin(09:00)=540 + 45 - 562 = 23

// pairSlug null hors whitelist + durée absente => etaMinTerminus null
const net2 = { lines: new Map([[7, line]]), routes: [{ ...baseRoute, id: 2, to_place: "Elounda", duration: null, duration_estimated: null }] };
const [bus2] = busesAt({ iso: "2026-06-15", minutes: 562 }, net2);
assert.equal(bus2.pairSlug, null);        // "Elounda" absent de BUS_PLACE_SLUGS (clé = "Eloynta")
assert.equal(bus2.etaMinTerminus, null);
assert.equal(bus2.durationEstimated, false); // null ?? false
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `node --experimental-strip-types scripts/check-bus-live-selection.mjs`
Expected : FAIL — `bus.origin` undefined (champs absents).

- [ ] **Step 3 : Étendre le type `LiveBus`** — dans `src/lib/bus-live/types.ts`, ajouter les 5 champs à l'interface `LiveBus` (après `degraded`) :

```ts
  degraded: boolean;
  // --- enrichissement sélection interactive (spec 2026-06-16) ---
  origin: string;                // route.from_place (origine du trajet)
  operatorId: string;            // route.operator_id ('herlas'=Est, 'ektel'=Ouest)
  pairSlug: string | null;       // pairSlug(from,to) ; null = pas de page /buses/[pair]
  etaMinTerminus: number | null; // minutes restantes jusqu'au terminus à `now` ; null si durée inconnue
  durationEstimated: boolean;    // durée KTEL estimée → libellé « estimé »
```

- [ ] **Step 4 : Remplir les champs dans `busesAt`** — dans `src/lib/bus-live/position.ts` :

(a) ajouter les imports (sous les imports existants, lignes ~7-11) :
```ts
import { pairSlug } from "../bus-pairs.ts";
import { parseDurationMin } from "./duration.ts";
```

(b) dans `busesAt`, à l'intérieur de la boucle `for (const route of network.routes)`, **après** `const oriented = orientRoute(route, line);` (≈ l.163), calculer la durée une fois :
```ts
    const durMin = parseDurationMin(route.duration);
```

(c) dans l'objet passé à `out.push({ ... })` (≈ l.173-188), ajouter les 5 champs après `degraded: ...` :
```ts
        degraded: line.source === "ktel" || line.partialGeo,
        origin: route.from_place,
        operatorId: route.operator_id,
        pairSlug: pairSlug(route.from_place, route.to_place),
        etaMinTerminus: durMin == null ? null : (toMin(H) + durMin) - now.minutes,
        durationEstimated: route.duration_estimated ?? false,
```
(`toMin` est déjà importé dans `position.ts`.)

- [ ] **Step 5 : Lancer, vérifier le succès** (et la non-régression du moteur)

Run : `node --experimental-strip-types scripts/check-bus-live-selection.mjs`
Expected : PASS
Run : `node --experimental-strip-types scripts/check-bus-live.mjs`
Expected : PASS (`OK check-bus-live: ...`) — la non-régression du moteur existant.

- [ ] **Step 6 : Commit**

```bash
git add src/lib/bus-live/types.ts src/lib/bus-live/position.ts scripts/check-bus-live-selection.mjs
git commit -m "feat(live): enrichir LiveBus (origin, operatorId, pairSlug, etaMinTerminus, durationEstimated)"
```

---

## Task 5 : `selection.ts` — view-model du bottom sheet (pur, TDD)

**Files :**
- Create : `src/lib/bus-live/selection.ts`
- Modify : `src/lib/bus-live/index.ts` (barrel : exporter `deriveBusSheet`, `BusSheetVM`, et le type `LiveLine` s'il ne l'est pas déjà)
- Modify : `scripts/check-bus-live-selection.mjs` (assertions)

- [ ] **Step 1 : Ajouter le test qui échoue** — dans `scripts/check-bus-live-selection.mjs`, import :

```js
import { deriveBusSheet } from "../src/lib/bus-live/selection.ts";
```
et la section :

```js
// --- deriveBusSheet ---------------------------------------------------------
const liveBus = {
  id: "7|fwd|09:00", lineId: 7, code: "LAS-07", codeOfficial: null,
  lat: 35, lng: 25, bearing: 0, progress: 0.48,
  nextStop: "Malia", etaMinNext: 7, headsign: "Agios Nikolaos", direction: "fwd",
  degraded: false, origin: "Heraklion", operatorId: "herlas",
  pairSlug: "agios-nikolaos-to-heraklion", etaMinTerminus: 26, durationEstimated: false,
};
const vm = deriveBusSheet(liveBus, 540, "fr"); // now = 09:00 = 540
assert.equal(vm.code, "LAS-07");
assert.equal(vm.operatorLabel, "KTEL Est");
assert.equal(vm.origin, "Heraklion");
assert.equal(vm.destination, "Agios Nikolaos");
assert.deepEqual(vm.nextStop, { name: "Malia", etaMin: 7, clock: "09:07" });
assert.deepEqual(vm.terminus, { etaMin: 26, clock: "09:26", estimated: false });
assert.equal(vm.progressPct, 48);
assert.equal(vm.lineHref, "/buses/agios-nikolaos-to-heraklion");

// cas null : prochain/terminus/pairSlug absents + opérateur ouest + fallback locale
const vm2 = deriveBusSheet(
  { ...liveBus, nextStop: null, etaMinNext: null, etaMinTerminus: null, pairSlug: null, operatorId: "ektel" },
  540, "it", // locale non gérée → fallback en
);
assert.equal(vm2.nextStop, null);
assert.equal(vm2.terminus, null);
assert.equal(vm2.lineHref, null);
assert.equal(vm2.operatorLabel, "KTEL West");

// terminus ≤ 0 (divergence durée-route/ligne) → null
assert.equal(deriveBusSheet({ ...liveBus, etaMinTerminus: 0 }, 540, "fr").terminus, null);
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `node --experimental-strip-types scripts/check-bus-live-selection.mjs`
Expected : FAIL — module `selection.ts` introuvable.

- [ ] **Step 3 : Implémenter `src/lib/bus-live/selection.ts`**

```ts
// Dérivation présentation du bottom sheet (pur). `nowMinutes` injecté → testable.
import type { LiveBus } from "./types";
import { clockHHMM } from "../athens-time.ts";

export interface BusSheetVM {
  code: string;
  operatorLabel: string;
  origin: string;
  destination: string;
  nextStop: { name: string; etaMin: number; clock: string } | null;
  terminus: { etaMin: number; clock: string; estimated: boolean } | null;
  progressPct: number;
  lineHref: string | null;
}

const OPERATOR: Record<string, Record<string, string>> = {
  herlas: { en: "KTEL East", fr: "KTEL Est", de: "KTEL Ost", el: "ΚΤΕΛ Ανατολής" },
  ektel: { en: "KTEL West", fr: "KTEL Ouest", de: "KTEL West", el: "ΚΤΕΛ Δυτικής" },
};

function operatorLabel(operatorId: string, locale: string): string {
  const row = OPERATOR[operatorId];
  if (!row) return operatorId;
  return row[locale] ?? row.en;
}

export function deriveBusSheet(bus: LiveBus, nowMinutes: number, locale: string): BusSheetVM {
  const nextStop =
    bus.nextStop != null && bus.etaMinNext != null
      ? { name: bus.nextStop, etaMin: bus.etaMinNext, clock: clockHHMM(nowMinutes + bus.etaMinNext) }
      : null;
  const terminus =
    bus.etaMinTerminus != null && bus.etaMinTerminus > 0
      ? { etaMin: bus.etaMinTerminus, clock: clockHHMM(nowMinutes + bus.etaMinTerminus), estimated: bus.durationEstimated }
      : null;
  return {
    code: bus.codeOfficial ?? bus.code,
    operatorLabel: operatorLabel(bus.operatorId, locale),
    origin: bus.origin,
    destination: bus.headsign,
    nextStop,
    terminus,
    progressPct: Math.round(bus.progress * 100),
    lineHref: bus.pairSlug ? `/buses/${bus.pairSlug}` : null,
  };
}
```

- [ ] **Step 4 : Exposer dans le barrel** — dans `src/lib/bus-live/index.ts`, ajouter (en suivant le style des exports existants) :

```ts
export { deriveBusSheet } from "./selection";
export type { BusSheetVM } from "./selection";
```
Vérifier que `LiveLine` est exporté (utilisé par `LiveMapClient` en Task 8). S'il manque, l'ajouter à l'export de types :
```ts
export type { LiveStop, LiveLine, LiveNetwork, LiveBus } from "./types";
```

- [ ] **Step 5 : Lancer, vérifier le succès**

Run : `node --experimental-strip-types scripts/check-bus-live-selection.mjs`
Expected : PASS

- [ ] **Step 6 : Commit**

```bash
git add src/lib/bus-live/selection.ts src/lib/bus-live/index.ts scripts/check-bus-live-selection.mjs
git commit -m "feat(live): deriveBusSheet (view-model bottom sheet) + barrel"
```

---

## Task 6 : `BusSheet.tsx` — bottom sheet (présentation pure)

**Files :**
- Create : `src/components/live/BusSheet.tsx`

> Pas de test unitaire (pas de RTL pour les composants ici) : gate = `tsc` + revue visuelle (Task 9).

- [ ] **Step 1 : Vérifier les tokens de charte disponibles** (éviter d'inventer)

Run : `grep -nE "aegean|terra|sun|surface|--color-text|font-heading|font-data" src/app/globals.css`
Expected : confirmer la présence de `aegean`, `terra`, `sun`, `surface`, `text`, `font-heading`, `font-data` (déjà utilisés par `LiveMapClient.tsx`). Si un token manque, utiliser l'équivalent présent.

- [ ] **Step 2 : Implémenter `src/components/live/BusSheet.tsx`**

```tsx
"use client";
import { useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import type { BusSheetVM } from "@/lib/bus-live";

const L: Record<string, { next: string; arrival: string; imminent: string; estimated: string; viewLine: string; close: string }> = {
  en: { next: "Next", arrival: "Arrival", imminent: "Arriving", estimated: "estimated", viewLine: "View line", close: "Close" },
  fr: { next: "Prochain", arrival: "Arrivée", imminent: "Arrivée imminente", estimated: "estimé", viewLine: "Voir la ligne", close: "Fermer" },
  de: { next: "Nächster", arrival: "Ankunft", imminent: "Kommt an", estimated: "geschätzt", viewLine: "Linie ansehen", close: "Schließen" },
  el: { next: "Επόμενη", arrival: "Άφιξη", imminent: "Καταφθάνει", estimated: "εκτίμηση", viewLine: "Δείτε τη γραμμή", close: "Κλείσιμο" },
};

export function BusSheet({ vm, locale, onClose }: { vm: BusSheetVM; locale: string; onClose: () => void }) {
  const t = L[locale] ?? L.en;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`${vm.code} ${vm.origin} → ${vm.destination}`}
      tabIndex={-1}
      className="absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl outline-none"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" aria-hidden />
      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-text/60 hover:bg-black/5"
      >
        ✕
      </button>

      <div className="flex items-center gap-2 text-sm text-text/60">
        <span className="rounded-md bg-aegean px-2 py-0.5 font-data text-xs font-bold text-white">{vm.code}</span>
        <span>{vm.operatorLabel}</span>
      </div>

      <p className="mt-1 font-heading text-lg font-bold text-text">
        {vm.origin} <span className="text-terra">→</span> {vm.destination}
      </p>

      <div className="mt-3 space-y-1.5 border-t border-black/10 pt-3 text-sm">
        <p>
          <span className="text-text/60">{t.next} : </span>
          {vm.nextStop ? (
            <span className="font-medium text-text">
              {vm.nextStop.name}{" "}
              <span className="font-data text-text/60">~{vm.nextStop.etaMin} min (≈{vm.nextStop.clock})</span>
            </span>
          ) : (
            <span className="font-medium text-text">{t.imminent}</span>
          )}
        </p>
        {vm.terminus && (
          <p>
            <span className="text-text/60">{t.arrival} : </span>
            <span className="font-medium text-text">
              {vm.destination} <span className="font-data text-text/60">≈{vm.terminus.clock}</span>
            </span>
            {vm.terminus.estimated && <span className="text-text/60"> · {t.estimated}</span>}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-sun" style={{ width: `${vm.progressPct}%` }} />
        </div>
        <span className="font-data text-xs tabular-nums text-text/60">{vm.progressPct}%</span>
      </div>

      {vm.lineHref && (
        <Link
          href={vm.lineHref}
          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-aegean px-5 py-2.5 font-heading text-sm font-semibold text-white transition hover:bg-aegean/90"
        >
          {t.viewLine} →
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/components/live/BusSheet.tsx
git commit -m "feat(live): BusSheet (bottom sheet présentation, a11y dialog, i18n en/fr/de/el)"
```

---

## Task 7 : `busMarker.ts` — clic, états sélectionné/estompé, hit-area

**Files :**
- Modify : `src/components/live/busMarker.ts` (réécriture)

- [ ] **Step 1 : Réécrire `src/components/live/busMarker.ts`**

```ts
import type { LiveBus } from "@/lib/bus-live";

const NORMAL = "#0B5E78";   // aegean
const SELECTED = "#ED7A5C"; // terra

/** Élément DOM d'un marqueur bus : hit-area 44px + inner 26px (flèche + halo). */
export function createBusEl(bus: LiveBus): HTMLDivElement {
  const el = document.createElement("div");
  // conteneur = zone tactile 44px transparente, centre l'inner
  el.style.cssText =
    "position:absolute;top:0;left:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;will-change:transform";
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", `${bus.codeOfficial ?? bus.code} → ${bus.headsign}`);
  el.title = `${bus.codeOfficial ?? bus.code} → ${bus.headsign}`;

  const color = bus.degraded ? "#5C7886" : NORMAL;
  const inner = document.createElement("div");
  inner.className = "bus-inner";
  inner.style.cssText = "position:relative;width:26px;height:26px;transition:transform .15s ease";
  inner.innerHTML =
    `<span style="position:absolute;inset:-8px;border-radius:50%;background:rgba(11,94,120,.16);animation:cd-pulse 2s ease-out infinite"></span>` +
    `<span class="bus-arrow" data-base="${color}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;` +
    `width:26px;height:26px;border-radius:50%;background:${color};color:#fff;font:700 11px/1 var(--font-heading),sans-serif;` +
    `box-shadow:0 1px 4px rgba(0,0,0,.3);transform:rotate(${bus.bearing}deg)">▲</span>`;
  el.appendChild(inner);
  return el;
}

/** Met à jour l'orientation de la flèche d'un élément existant. */
export function setBusArrow(el: HTMLElement, bearingDeg: number): void {
  const arrow = el.querySelector(".bus-arrow") as HTMLElement | null;
  if (arrow) arrow.style.transform = `rotate(${bearingDeg}deg)`;
}

/** Marque (ou démarque) le bus sélectionné : agrandi + couleur terra + au-dessus. */
export function setBusSelected(el: HTMLElement, on: boolean): void {
  const inner = el.querySelector(".bus-inner") as HTMLElement | null;
  const arrow = el.querySelector(".bus-arrow") as HTMLElement | null;
  if (inner) inner.style.transform = on ? "scale(1.35)" : "scale(1)";
  if (arrow) arrow.style.background = on ? SELECTED : (arrow.getAttribute("data-base") ?? NORMAL);
  el.style.zIndex = on ? "3" : "";
}

/** Estompe (ou rétablit) un marqueur non sélectionné. */
export function setBusDimmed(el: HTMLElement, on: boolean): void {
  el.style.opacity = on ? "0.35" : "1";
}
```

> Note : `setBusArrow` agit sur `.bus-arrow` (rotation), `setBusSelected` sur `.bus-inner` (scale) → aucun conflit de `transform`.

- [ ] **Step 2 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/live/busMarker.ts
git commit -m "feat(live): marqueur cliquable (hit-area 44px, a11y) + états selected/dimmed"
```

---

## Task 8 : `LiveMapClient.tsx` — orchestration de l'interaction

**Files :**
- Modify : `src/components/live/LiveMapClient.tsx` (réécriture complète)

- [ ] **Step 1 : Réécrire `src/components/live/LiveMapClient.tsx`**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  loadLiveNetwork, busesAt, reconcile, lerp, lerpAngle, deriveBusSheet,
  type LiveNetwork, type LiveBus, type LiveLine, type BusSheetVM,
} from "@/lib/bus-live";
import { athensNow } from "@/lib/athens-time";
import { createBusEl, setBusArrow, setBusSelected, setBusDimmed } from "./busMarker";
import { BusSheet } from "./BusSheet";
import { Link } from "@/i18n/navigation";

type MaplibreMap = import("maplibre-gl").Map;
type MaplibreMarker = import("maplibre-gl").Marker;
type GeoJSONSource = import("maplibre-gl").GeoJSONSource;
type Pose = { lat: number; lng: number; bearing: number };

const SHEET_H = 240; // hauteur approx du bottom sheet, pour l'offset de recentrage
const EMPTY = { type: "FeatureCollection" as const, features: [] };

const T: Record<string, { estimated: string; circulating: string; planTrip: string; rentCar: string }> = {
  en: { estimated: "Estimated from the timetable", circulating: "buses running", planTrip: "Plan a trip", rentCar: "Rent a car" },
  fr: { estimated: "Estimé selon l'horaire", circulating: "bus en circulation", planTrip: "Planifier un trajet", rentCar: "Louer une voiture" },
};

function isMapped(l: { source: "osm" | "ktel"; partialGeo: boolean }): boolean {
  return l.source !== "ktel" && !l.partialGeo;
}

function linesGeoJSON(net: LiveNetwork) {
  return {
    type: "FeatureCollection" as const,
    features: [...net.lines.values()].filter(isMapped).map((l) => ({
      type: "Feature" as const,
      properties: { code: l.code, lineId: l.id },
      geometry: { type: "LineString" as const, coordinates: l.geometry },
    })),
  };
}

function stopsGeoJSON(line: LiveLine | null, nextStopName: string | null) {
  if (!line) return EMPTY;
  return {
    type: "FeatureCollection" as const,
    features: line.stops.map((s) => ({
      type: "Feature" as const,
      properties: { isNext: s.name === nextStopName },
      geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
    })),
  };
}

export function LiveMapClient({ locale }: { locale: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const netRef = useRef<LiveNetwork | null>(null);
  const markersRef = useRef(new Map<string, { marker: MaplibreMarker; el: HTMLDivElement; cur: Pose }>());
  const targetsRef = useRef(new Map<string, LiveBus>());
  const selectedRef = useRef<string | null>(null);
  const deselectRef = useRef<() => void>(() => {});
  const [count, setCount] = useState(0);
  const [sheetVM, setSheetVM] = useState<BusSheetVM | null>(null);

  useEffect(() => {
    let cancelled = false;
    let iv: ReturnType<typeof setInterval> | undefined;
    let raf = 0;
    let onVis: (() => void) | undefined;
    let onKey: ((e: KeyboardEvent) => void) | undefined;

    const reduceMotion = () =>
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    Promise.all([import("maplibre-gl"), loadLiveNetwork()]).then(([ml, net]) => {
      if (cancelled || !containerRef.current) return;
      netRef.current = net;
      const map = new ml.Map({
        container: containerRef.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [25.0, 35.25], zoom: 8.5, minZoom: 7, maxZoom: 16,
      });
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      const stopsSource = () => map.getSource("sel-stops") as GeoJSONSource | undefined;

      const applyMarkerStates = () => {
        const sel = selectedRef.current;
        for (const [id, m] of markersRef.current) {
          setBusSelected(m.el, id === sel);
          setBusDimmed(m.el, sel != null && id !== sel);
        }
      };
      const applyHighlight = (lineId: number) => {
        map.setFilter("bus-lines-highlight", ["==", ["get", "lineId"], lineId]);
        map.setPaintProperty("bus-lines-base", "line-opacity", 0.12);
      };
      const resetHighlight = () => {
        map.setFilter("bus-lines-highlight", ["==", ["get", "lineId"], -1]);
        map.setPaintProperty("bus-lines-base", "line-opacity", 0.55);
      };
      const setStops = (line: LiveLine | null, nextStopName: string | null) =>
        stopsSource()?.setData(stopsGeoJSON(line, nextStopName));

      const deselect = () => {
        if (selectedRef.current == null) return;
        selectedRef.current = null;
        resetHighlight();
        setStops(null, null);
        applyMarkerStates();
        setSheetVM(null);
      };
      deselectRef.current = deselect;

      const selectBus = (id: string) => {
        const bus = targetsRef.current.get(id);
        if (!bus) return;
        selectedRef.current = id;
        const line = netRef.current?.lines.get(bus.lineId) ?? null;
        applyHighlight(bus.lineId);
        setStops(line, bus.nextStop);
        applyMarkerStates();
        setSheetVM(deriveBusSheet(bus, athensNow().minutes, locale));
        map.easeTo({ center: [bus.lng, bus.lat], offset: [0, -SHEET_H / 2], duration: reduceMotion() ? 0 : 400 });
      };

      map.on("load", () => {
        if (cancelled) return;
        map.addSource("bus-lines", { type: "geojson", data: linesGeoJSON(net) });
        map.addLayer({
          id: "bus-lines-base", type: "line", source: "bus-lines",
          paint: { "line-color": "#0B5E78", "line-width": 3, "line-opacity": 0.55 },
        });
        map.addLayer({
          id: "bus-lines-highlight", type: "line", source: "bus-lines",
          filter: ["==", ["get", "lineId"], -1],
          paint: { "line-color": "#ED7A5C", "line-width": 5, "line-opacity": 1 },
        });
        map.addSource("sel-stops", { type: "geojson", data: EMPTY });
        map.addLayer({
          id: "sel-stops-dot", type: "circle", source: "sel-stops",
          filter: ["==", ["get", "isNext"], false],
          paint: { "circle-radius": 4, "circle-color": "#0B5E78", "circle-stroke-width": 1.5, "circle-stroke-color": "#fff" },
        });
        map.addLayer({
          id: "sel-stops-next", type: "circle", source: "sel-stops",
          filter: ["==", ["get", "isNext"], true],
          paint: { "circle-radius": 8, "circle-color": "#FFC83D", "circle-stroke-width": 2, "circle-stroke-color": "#0B3954" },
        });

        map.on("click", () => deselect()); // clic sur le fond = désélection

        const markers = markersRef.current;
        const tick = () => {
          const n = netRef.current; if (!n) return;
          const buses = busesAt(athensNow(), n).filter((bus) => !bus.degraded);
          setCount(buses.length);
          const poses = new Map([...markers].map(([id, m]) => [id, m.cur]));
          const { entering, leaving } = reconcile(poses, buses);
          for (const bus of entering) {
            const el = createBusEl(bus);
            el.addEventListener("click", (e) => { e.stopPropagation(); selectBus(bus.id); });
            el.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectBus(bus.id); }
            });
            const marker = new ml.Marker({ element: el, anchor: "center" }).setLngLat([bus.lng, bus.lat]).addTo(map);
            markers.set(bus.id, { marker, el, cur: { lat: bus.lat, lng: bus.lng, bearing: bus.bearing } });
          }
          for (const id of leaving) { markers.get(id)?.marker.remove(); markers.delete(id); }
          targetsRef.current = new Map(buses.map((bus) => [bus.id, bus]));
          applyMarkerStates();
          const sel = selectedRef.current;
          if (sel) {
            const b = targetsRef.current.get(sel);
            if (b) {
              setSheetVM(deriveBusSheet(b, athensNow().minutes, locale));
              setStops(netRef.current?.lines.get(b.lineId) ?? null, b.nextStop);
            } else {
              deselect();
            }
          }
        };
        tick();
        iv = setInterval(tick, 2000);

        const animate = () => {
          for (const [id, m] of markers) {
            const t2 = targetsRef.current.get(id);
            if (!t2) continue;
            m.cur.lat = lerp(m.cur.lat, t2.lat, 0.08);
            m.cur.lng = lerp(m.cur.lng, t2.lng, 0.08);
            m.cur.bearing = lerpAngle(m.cur.bearing, t2.bearing, 0.12);
            m.marker.setLngLat([m.cur.lng, m.cur.lat]);
            setBusArrow(m.el, m.cur.bearing);
          }
          raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);

        onVis = () => { if (document.visibilityState === "visible") tick(); };
        document.addEventListener("visibilitychange", onVis);
        onKey = (e) => { if (e.key === "Escape") deselect(); };
        document.addEventListener("keydown", onKey);
      });
    });

    return () => {
      cancelled = true;
      if (iv) clearInterval(iv);
      if (raf) cancelAnimationFrame(raf);
      if (onVis) document.removeEventListener("visibilitychange", onVis);
      if (onKey) document.removeEventListener("keydown", onKey);
      for (const m of markersRef.current.values()) m.marker.remove();
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [locale]);

  const t = T[locale] ?? T.en;

  return (
    <div className="relative overflow-hidden" style={{ height: "calc(100dvh - 56px)" }}>
      <div className="absolute inset-0"><div ref={containerRef} className="h-full w-full" /></div>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2">
        <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-night/90 px-3 py-1.5 text-xs font-medium text-sand backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-sun animate-live-pulse" />
          {t.estimated}
        </span>
        <span className="pointer-events-auto inline-flex items-baseline gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-sm text-text shadow backdrop-blur">
          <span className="font-data font-bold text-aegean tabular-nums">{count}</span> {t.circulating}
        </span>
      </div>

      {!sheetVM && (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 flex justify-center px-3 sm:bottom-6">
          <div className="flex w-full max-w-sm gap-2 sm:w-auto">
            <Link href="/buses" className="pointer-events-auto inline-flex flex-1 items-center justify-center rounded-full bg-aegean px-5 py-2.5 text-sm font-heading font-semibold text-white shadow-lg transition hover:bg-aegean/90 sm:flex-none">
              {t.planTrip}
            </Link>
            <Link href="/car-rental" className="pointer-events-auto inline-flex flex-1 items-center justify-center rounded-full bg-terra px-5 py-2.5 text-sm font-heading font-semibold text-white shadow-lg transition hover:bg-terra/90 sm:flex-none">
              {t.rentCar}
            </Link>
          </div>
        </div>
      )}

      {sheetVM && <BusSheet vm={sheetVM} locale={locale} onClose={() => deselectRef.current()} />}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : 0 erreur. (Si `GeoJSONSource` n'est pas exporté par la version de maplibre-gl, remplacer le type par `import("maplibre-gl").GeoJSONSource` inline déjà utilisé, ou caster via `as unknown as { setData: (d: unknown) => void }`.)

- [ ] **Step 3 : Lancer le build**

Run : `npm run build`
Expected : build OK (la page `/live` compile).

- [ ] **Step 4 : Commit**

```bash
git add src/components/live/LiveMapClient.tsx
git commit -m "feat(live): sélection au clic — highlight ligne, arrêts, bottom sheet, recentrage, désélection"
```

---

## Task 9 : Gate complet + preview + merge prod

**Files :** aucun nouveau (intégration).

- [ ] **Step 1 : Suite de checks + types complète**

Run : `npm run check`
Expected : `check:geo`, `check:car-partners`, `check:car-lead`, **`check:bus-select`** et `tsc --noEmit` passent tous.

- [ ] **Step 2 : Non-régression moteur**

Run : `node --experimental-strip-types scripts/check-bus-live.mjs`
Expected : PASS.

- [ ] **Step 3 : Push de la branche → preview Vercel**

```bash
git push origin feat/live-bus-select
```
Récupérer l'URL de preview (Vercel l'attache au push, ou `vercel ls --meta githubCommitRef=feat/live-bus-select`).

- [ ] **Step 4 : Checklist de validation visuelle (Kami, sur la preview)**

  - Cliquer un bus → sa ligne passe en orange, les autres lignes/bus s'estompent, ses arrêts apparaissent (prochain en jaune), bottom sheet ouvert.
  - Le sheet affiche : code + opérateur, origine → destination, prochain arrêt + heure, arrivée terminus (≈heure, « estimé » le cas échéant), progression, bouton « Voir la ligne » (présent seulement si la page existe).
  - Le bouton « Voir la ligne » mène à la bonne page `/buses/[pair]`.
  - Cliquer un autre bus → bascule propre (pas de doublon de sheet).
  - Fermer via ✕, via Échap, via clic sur le fond → tout revient à l'état initial, les CTA « Planifier / Louer » réapparaissent.
  - Mobile : le sheet ne masque pas le bus (recentrage), pas de débordement, encoche iOS respectée.
  - Au fil du temps : l'ETA du prochain arrêt décroît, la position du bus suit.

- [ ] **Step 5 : Merge prod (sur ✅ Kami uniquement)**

```bash
git push origin feat/live-bus-select:master
git push origin feat/live-bus-select:master:main   # (ou master:main selon le flux : déploiement prod = acte conscient)
```
> Forme exacte : `git push origin feat/live-bus-select:master` puis `git push origin master:main`. Vérifier `origin/master`/`origin/main` avant (zéro clobber d'un autre terminal).

- [ ] **Step 6 : Cleanup worktree**

```bash
git -C C:/Users/fkerj/cretepulse-live worktree remove C:/Users/fkerj/cretepulse-livebus
git -C C:/Users/fkerj/cretepulse-live branch -d feat/live-bus-select   # si déjà mergée
```

---

## Auto-revue du plan (couverture spec)

- **Interaction clic → ligne ressort + estompage** : Task 8 (`applyHighlight`/`resetHighlight`, 2 layers). ✅
- **Arrêts + prochain en avant** : Task 8 (`sel-stops` + 2 layers cercles, `isNext`). ✅
- **Bottom sheet (contenu validé)** : Task 6 (`BusSheet`), alimenté par Task 5 (`deriveBusSheet`). ✅
- **Arrivée terminus via durée KTEL réelle (option B)** : Task 4 (`etaMinTerminus` via `parseDurationMin`) + Task 5 (`terminus`, libellé `estimated`). ✅
- **Origine exposée (B2)** : Task 4 (`origin`). ✅
- **Opérateur Est/Ouest correct** : Task 5 (`operatorLabel` depuis `operatorId`, table créée). ✅
- **Lien /buses/[pair] gaté** : Task 4 (`pairSlug`) + Task 5 (`lineHref` null si absent) + Task 6 (bouton masqué). ✅
- **Recentrage doux** : Task 8 (`easeTo` offset, reduced-motion). ✅
- **Désélection (✕/Échap/fond)** : Task 8. ✅
- **i18n en/fr/de/el + fallback EN** : Task 5 (opérateur) + Task 6 (libellés). ✅
- **Edge cases** (bus disparu, nextStop null, etaMinTerminus null/≤0, pairSlug null, onVis, mobile/safe-area) : Tasks 4/5/6/8. ✅
- **Tests purs câblés au gate** : Tasks 2-5 (`check-bus-live-selection.mjs` dans `npm run check`). ✅
- **Charte Kalimera (pas Kairos), pattern import `.ts`, worktree, gate preview** : Tasks 1/6/9. ✅

Types cohérents entre tasks : `BusSheetVM` (Task 5) consommé identiquement en Tasks 6/8 ; `deriveBusSheet(bus, nowMinutes, locale)` signature stable ; `setBusSelected/setBusDimmed/setBusArrow/createBusEl` (Task 7) consommés en Task 8 ; les 5 champs `LiveBus` (Task 4) lus en Task 5. Aucun placeholder.
