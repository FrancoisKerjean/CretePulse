# Near-me arrêt-centré (WS2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher dans `/near-me`, pour la position de l'utilisateur, l'arrêt de bus le plus proche *desservi* (+ 1-2 alternatives) avec, par destination, le prochain passage estimé.

**Architecture:** Approche hybride B. Le serveur charge le réseau (`loadLiveNetwork`), en projette un **graphe statique** sérialisable (`StopGraph`) et le passe au client. Le client géolocalise (position jamais envoyée au serveur), choisit les arrêts proches desservis, et calcule les passages estimés à l'heure d'Athènes via un module pur `stop-departures.ts`. Le passage est proratisé sur la **durée KTEL réelle** du trajet pour absorber l'écart géométrie-OSM ↔ horaire-KTEL.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, Supabase (lecture anon), tests Node `--experimental-strip-types` + `node:assert/strict` (pattern existant `scripts/check-*.mjs`).

**Spec:** `docs/superpowers/specs/2026-06-17-near-me-arret-centre-design.md` (§5 WS2, §6 moteur, §7 UX, §8 edge cases).

**Périmètre de CE plan = WS2 uniquement.** La normalisation des noms (WS1, Python/VPS) est un plan séparé, exécuté après.

---

## File Structure

- **Create** `src/lib/stop-departures.ts` — module pur : types `StopGraph`/`StopDeparture`, `buildStopGraph(network)` (projection serveur), `stopDepartures(graph, slug, now, tomorrowIso)` (calcul client). Zéro I/O.
- **Create** `scripts/check-stop-departures.mjs` — assertions Node (fixtures synthétiques + cas Pachia Ammos).
- **Modify** `package.json` — script `check:stop-departures` + l'ajouter à `check`.
- **Modify** `src/app/[locale]/near-me/page.tsx` — charger le réseau, construire le graphe, le passer à `NearMeClient` ; retirer l'ancien calcul `busStops`.
- **Modify** `src/components/near-me/NearMeClient.tsx` — recevoir `stopGraph`, choisir l'arrêt desservi le plus proche + alternatives, rendre par destination ; retirer l'ancienne section basée sur `busStops`/`NearBusStop`.

Les modules réutilisés (NE PAS les modifier) : `src/lib/bus-live/network.ts` (`loadLiveNetwork`), `src/lib/bus-live/position.ts` (`placeSimilarity`), `src/lib/bus-journey.ts` (`timesForDate`, `parseDurationMin`), `src/lib/athens-time.ts` (`toMin`, `clockHHMM`), `src/lib/geo.ts` (`nearestBy`).

---

## Task 1: Module pur `stop-departures.ts` — calcul des passages estimés

**Files:**
- Create: `src/lib/stop-departures.ts`
- Test: `scripts/check-stop-departures.mjs`
- Modify: `package.json`

- [ ] **Step 1: Écrire le test qui échoue**

Create `scripts/check-stop-departures.mjs` :

```js
// Assertions du moteur arrêt-centré. Run: node --experimental-strip-types scripts/check-stop-departures.mjs
import assert from "node:assert/strict";
import { stopDepartures } from "../src/lib/stop-departures.ts";

// Ligne synthétique L1 : A(0) → M(30) → B(60). total 60 min.
// Route R1 A→B (durée réelle 40min) ; R2 B→A (40min) ; R3 sans durée.
const R = (from, to, extra = {}) => ({
  id: 1, line_id: 1, operator_id: "x", from_place: from, to_place: to,
  to_slug: null, via_stops: null, season: "all", duration: extra.duration ?? null,
  duration_estimated: false, price_eur: null, price_estimated: false,
  frequency: null, departures: null,
  departures_by_day: [{ days: "Every Day", times: extra.times ?? ["10:00", "12:00"] }],
  source_url: "x", scraped_at: "2026-06-17",
});
const graph = {
  stops: [
    { slug: "a", name: "A", lat: 0, lng: 0 },
    { slug: "m", name: "M", lat: 0, lng: 0 },
    { slug: "b", name: "B", lat: 0, lng: 0 },
  ],
  lines: [{
    id: 1, code: "L1", totalMinutes: 60,
    stops: [
      { slug: "a", name: "A", cumMin: 0 },
      { slug: "m", name: "M", cumMin: 30 },
      { slug: "b", name: "B", cumMin: 60 },
    ],
    routes: [
      R("A", "B", { duration: "40min" }),
      R("B", "A", { duration: "40min" }),
      R("A", "B", { duration: null }), // durée inconnue
    ],
  }],
};
const now = { iso: "2026-06-17", minutes: 0 }; // minuit : tout est à venir
const tmw = "2026-06-18";

// À l'arrêt M : 2 destinations (vers B en sens A→B, vers A en sens B→A)
const d = stopDepartures(graph, "m", now, tmw);
const dests = d.map((x) => x.destination).sort();
assert.deepEqual(dests, ["A", "B"], "M dessert A et B");

// vers B : départ 10:00 + frac(30/60)*40min = 10:20 ; 12:00 -> 12:20
const toB = d.find((x) => x.destination === "B");
assert.ok(toB.durationKnown, "durée B connue");
assert.deepEqual(toB.nextTimes, ["10:20", "12:20"], "passage proratisé à M vers B");
assert.equal(toB.estimated, true);

// Route sans durée fusionnée dans la même destination B : ne casse pas, durationKnown reste vrai (R1 a une durée)
// vers A (sens inverse) : M est à 30min de B -> départ + frac(30/60)*40 = +20 ; 10:20,12:20
const toA = d.find((x) => x.destination === "A");
assert.deepEqual(toA.nextTimes, ["10:20", "12:20"], "passage proratisé à M vers A (sens inverse)");

// À l'arrêt B (terminus d'arrivée du sens A→B) : PAS desservi vers B, seulement vers A
const atB = stopDepartures(graph, "b", now, tmw).map((x) => x.destination);
assert.deepEqual(atB.sort(), ["A"], "B n'est pas desservi vers B (terminus), seulement vers A");

// Repli demain : à 23:59, plus de passage aujourd'hui -> 1er de demain marqué isTomorrow
const late = stopDepartures(graph, "m", { iso: "2026-06-17", minutes: 23 * 60 + 59 }, tmw);
const lb = late.find((x) => x.destination === "B");
assert.equal(lb.isTomorrow, true, "repli demain");
assert.deepEqual(lb.nextTimes, ["10:20"], "1er passage de demain");

console.log("check-stop-departures OK");
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `node --experimental-strip-types scripts/check-stop-departures.mjs`
Expected: FAIL — `Cannot find module '../src/lib/stop-departures.ts'`.

- [ ] **Step 3: Écrire l'implémentation minimale**

Create `src/lib/stop-departures.ts` :

```ts
// Moteur arrêt-centré : pour un arrêt, les destinations atteignables avec passage
// estimé (départ KTEL + proratisation de la durée réelle du trajet). Pur, zéro I/O,
// exécutable côté client. Réutilise placeSimilarity (matching noms terminus) +
// timesForDate/parseDurationMin (grille KTEL).
// Spec : docs/superpowers/specs/2026-06-17-near-me-arret-centre-design.md (§6)
import type { LiveNetwork } from "./bus-live/types";
import type { BusRoute } from "./buses";
import { placeSimilarity } from "./bus-live/position";
import { timesForDate, parseDurationMin } from "./bus-journey";
import { toMin, clockHHMM } from "./athens-time";

export interface GraphStop { slug: string; name: string; lat: number; lng: number; }
export interface GraphLineStop { slug: string; name: string; cumMin: number; }
export interface GraphLine {
  id: number;
  code: string;
  totalMinutes: number;
  stops: GraphLineStop[]; // triés seq 0..N
  routes: BusRoute[];     // routes à horaire de cette ligne
}
export interface StopGraph { stops: GraphStop[]; lines: GraphLine[]; }

export interface StopDeparture {
  destination: string;    // route.to_place (sens de circulation)
  lineCode: string;
  nextTimes: string[];    // "HH:MM" estimés à venir (max 2) ; vide si durée inconnue
  estimated: boolean;     // true : passage proratisé, pas une heure ferme
  durationKnown: boolean; // false : destination affichée sans horaire (« au guichet »)
  isTomorrow: boolean;    // true : nextTimes = 1er passage de demain
}

const SIM = 0.5;

/** Index du stop de `stops` le mieux apparié à `name` (similarité >= SIM), sinon -1. */
function matchIdx(name: string, stops: GraphLineStop[]): number {
  let best = -1, bestS = SIM;
  for (let i = 0; i < stops.length; i++) {
    const s = placeSimilarity(name, stops[i].name);
    if (s >= bestS) { bestS = s; best = i; }
  }
  return best;
}

interface Raw { destination: string; lineCode: string; durationKnown: boolean; minutes: number[]; tmw: number[]; }

/** Destinations desservies à `stopSlug`, passages estimés à `now` (TZ Athens). */
export function stopDepartures(
  graph: StopGraph,
  stopSlug: string,
  now: { iso: string; minutes: number },
  tomorrowIso: string,
): StopDeparture[] {
  const raws: Raw[] = [];
  for (const line of graph.lines) {
    const sIdx = line.stops.findIndex((s) => s.slug === stopSlug);
    if (sIdx < 0) continue;
    const cumS = line.stops[sIdx].cumMin;
    for (const r of line.routes) {
      const a = matchIdx(r.from_place, line.stops);
      const b = matchIdx(r.to_place, line.stops);
      const iFrom = a >= 0 ? a : 0;
      const iTo = b >= 0 ? b : line.stops.length - 1;
      if (iFrom === iTo) continue;
      const forward = iFrom < iTo;
      // l'arrêt doit être DANS le tronçon parcouru, et pas le terminus d'arrivée
      const served = forward ? (sIdx >= iFrom && sIdx < iTo) : (sIdx > iTo && sIdx <= iFrom);
      if (!served) continue;
      const dur = parseDurationMin(r.duration);
      const durationKnown = dur != null;
      let mins: number[] = [];
      let tmw: number[] = [];
      if (durationKnown) {
        const cumFrom = line.stops[iFrom].cumMin;
        const cumTo = line.stops[iTo].cumMin;
        const span = Math.abs(cumTo - cumFrom);
        const frac = span > 0 ? Math.abs(cumS - cumFrom) / span : 0;
        const offset = frac * (dur as number);
        mins = timesForDate(r, now.iso).map((H) => toMin(H) + offset);
        tmw = timesForDate(r, tomorrowIso).map((H) => toMin(H) + offset);
      }
      raws.push({ destination: r.to_place, lineCode: line.code, durationKnown, minutes: mins, tmw });
    }
  }
  // Fusion par destination (une destination peut venir de plusieurs routes/lignes).
  const byDest = new Map<string, { lineCode: string; durationKnown: boolean; today: number[]; tmw: number[] }>();
  for (const r of raws) {
    const e = byDest.get(r.destination) ?? { lineCode: r.lineCode, durationKnown: false, today: [], tmw: [] };
    e.durationKnown = e.durationKnown || r.durationKnown;
    e.today.push(...r.minutes);
    e.tmw.push(...r.tmw);
    byDest.set(r.destination, e);
  }
  const out: StopDeparture[] = [];
  for (const [destination, e] of byDest) {
    const upcoming = e.today.filter((m) => m >= now.minutes).sort((x, y) => x - y);
    let times = upcoming, isTomorrow = false;
    if (times.length === 0 && e.tmw.length > 0) {
      times = e.tmw.sort((x, y) => x - y).slice(0, 1);
      isTomorrow = true;
    }
    out.push({
      destination,
      lineCode: e.lineCode,
      nextTimes: times.slice(0, 2).map(clockHHMM),
      estimated: true,
      durationKnown: e.durationKnown,
      isTomorrow,
    });
  }
  // Tri : destinations avec horaire d'abord (prochain passage croissant), puis les autres.
  return out.sort((x, y) => {
    const tx = x.nextTimes[0] ?? "99:99";
    const ty = y.nextTimes[0] ?? "99:99";
    return tx.localeCompare(ty);
  });
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `node --experimental-strip-types scripts/check-stop-departures.mjs`
Expected: PASS — `check-stop-departures OK`.

- [ ] **Step 5: Ajouter le script npm**

Modify `package.json` (section `scripts`) — ajouter la ligne et l'inclure dans `check` :

```json
    "check:stop-departures": "node --experimental-strip-types scripts/check-stop-departures.mjs",
    "check": "npm run check:geo && npm run check:car-partners && npm run check:car-lead && npm run check:bus-select && npm run check:stop-departures && tsc --noEmit"
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/stop-departures.ts scripts/check-stop-departures.mjs package.json
git commit -m "feat(near-me): moteur pur stop-departures (passages estimes par destination)"
```

---

## Task 2: `buildStopGraph(network)` — projection serveur du réseau

**Files:**
- Modify: `src/lib/stop-departures.ts`
- Test: `scripts/check-stop-departures.mjs`

- [ ] **Step 1: Ajouter le test qui échoue**

Append to `scripts/check-stop-departures.mjs` (avant le `console.log` final) :

```js
import { buildStopGraph } from "../src/lib/stop-departures.ts";

// LiveNetwork synthétique : 1 ligne, 2 arrêts partagés, 1 route à horaire.
const liveStops = [
  { seq: 0, slug: "a", name: "A", lat: 1, lng: 1, cumKm: 0, cumMin: 0 },
  { seq: 1, slug: "b", name: "B", lat: 2, lng: 2, cumKm: 10, cumMin: 60 },
];
const net = {
  lines: new Map([[1, {
    id: 1, code: "L1", codeOfficial: null, source: "osm",
    totalMinutes: 60, lengthKm: 10, partialGeo: false,
    geometry: [[1, 1], [2, 2]], stops: liveStops,
  }]]),
  routes: [R("A", "B", { duration: "40min" })], // R défini plus haut, line_id:1
};
const g = buildStopGraph(net);
assert.equal(g.stops.length, 2, "2 arrêts dédupliqués");
assert.equal(g.lines.length, 1, "1 ligne");
assert.equal(g.lines[0].routes.length, 1, "route rattachée à la ligne");
assert.deepEqual(g.lines[0].stops.map((s) => s.slug), ["a", "b"], "stops projetés slug+cumMin");
assert.ok(g.stops[0].lat != null, "coords conservées");
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `node --experimental-strip-types scripts/check-stop-departures.mjs`
Expected: FAIL — `buildStopGraph is not a function` (import non résolu).

- [ ] **Step 3: Implémenter `buildStopGraph`**

Append to `src/lib/stop-departures.ts` :

```ts
/** Projette un LiveNetwork (loadLiveNetwork) en graphe statique sérialisable client. */
export function buildStopGraph(network: LiveNetwork): StopGraph {
  const stopsBySlug = new Map<string, GraphStop>();
  const routesByLine = new Map<number, BusRoute[]>();
  for (const r of network.routes) {
    if (r.line_id == null) continue;
    const arr = routesByLine.get(r.line_id) ?? [];
    arr.push(r);
    routesByLine.set(r.line_id, arr);
  }
  const lines: GraphLine[] = [];
  for (const line of network.lines.values()) {
    const routes = routesByLine.get(line.id);
    if (!routes || routes.length === 0) continue; // ligne sans horaire : ignorée
    for (const s of line.stops) {
      if (!stopsBySlug.has(s.slug)) {
        stopsBySlug.set(s.slug, { slug: s.slug, name: s.name, lat: s.lat, lng: s.lng });
      }
    }
    lines.push({
      id: line.id,
      code: line.code,
      totalMinutes: line.totalMinutes,
      stops: line.stops.map((s) => ({ slug: s.slug, name: s.name, cumMin: s.cumMin })),
      routes,
    });
  }
  return { stops: [...stopsBySlug.values()], lines };
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `node --experimental-strip-types scripts/check-stop-departures.mjs`
Expected: PASS — `check-stop-departures OK`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stop-departures.ts scripts/check-stop-departures.mjs
git commit -m "feat(near-me): buildStopGraph projette le reseau en graphe arret-centre"
```

---

## Task 3: Brancher le graphe dans `near-me/page.tsx` (serveur)

**Files:**
- Modify: `src/app/[locale]/near-me/page.tsx`

- [ ] **Step 1: Importer le réseau + le builder**

Dans `src/app/[locale]/near-me/page.tsx`, ajouter aux imports (après la ligne `import { BUS_PLACE_SLUGS } from "@/lib/bus-pairs";`) :

```ts
import { loadLiveNetwork } from "@/lib/bus-live";
import { buildStopGraph, type StopGraph } from "@/lib/stop-departures";
```

- [ ] **Step 2: Construire le graphe et retirer l'ancien calcul busStops**

Dans `NearMePage`, remplacer le bloc qui charge `routes` puis construit `busStops`
(de `const routes = await getBusRoutes()...` jusqu'à la fin du `const busStops = [...]`)
par :

```ts
  // Réseau arrêt-centré (loadLiveNetwork = lignes + arrêts + routes à horaire).
  const network = await loadLiveNetwork().catch(() => ({ lines: new Map(), routes: [] }));
  const stopGraph: StopGraph = buildStopGraph(network);
```

Retirer les imports devenus inutiles s'ils ne servent plus ailleurs dans le fichier :
`getBusRoutes`, `timesForDate`, `BUS_PLACE_SLUGS`, `athensTodayISO`/`athensNowHM` si plus référencés. (Vérifier par recherche dans le fichier avant suppression.)

- [ ] **Step 3: Passer `stopGraph` au client**

Dans le JSX, remplacer `busStops={busStops}` par `stopGraph={stopGraph}` dans
`<NearMeClient ... />`.

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: une erreur attendue côté `NearMeClient` (prop `busStops` retirée / `stopGraph` non encore acceptée) — corrigée en Task 4. Les autres fichiers compilent. (Si d'autres erreurs apparaissent dans `page.tsx`, corriger les imports orphelins.)

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/near-me/page.tsx
git commit -m "feat(near-me): page charge le reseau et construit le StopGraph (serveur)"
```

---

## Task 4: Section arrêt-centrée dans `NearMeClient.tsx` (client)

**Files:**
- Modify: `src/components/near-me/NearMeClient.tsx`

- [ ] **Step 1: Remplacer le type/props bus + importer le moteur**

Dans `NearMeClient.tsx` :

1. Ajouter aux imports :

```ts
import { stopDepartures, type StopGraph, type StopDeparture } from "@/lib/stop-departures";
import { athensNow } from "@/lib/athens-time";
```

2. Supprimer l'interface `NearBusStop` (plus utilisée) et, dans la signature du
composant, remplacer le paramètre `busStops: NearBusStop[]` par `stopGraph: StopGraph`
(et le retirer de l'objet de destructuration des props).

- [ ] **Step 2: Calculer l'arrêt desservi le plus proche + alternatives**

Remplacer, dans le `useMemo` qui calcule `sections`, la ligne
`const stop = nearestBy(busStops, (s) => [s.lat, s.lon], pos, 1)[0] ?? null;`
par le calcul arrêt-centré (la position `pos` a la forme `{ lat, lon }`) :

```ts
    const now = athensNow();
    const tomorrowIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" })
      .format(new Date(Date.now() + 86_400_000));
    // arrêts triés par distance ; on garde ceux qui ont au moins une destination,
    // l'arrêt mis en avant = le plus proche desservi, + 2 alternatives.
    const ranked = nearestBy(stopGraph.stops, (s) => [s.lat, s.lng], pos, 12);
    const served = ranked
      .map((s) => ({ stop: s, deps: stopDepartures(stopGraph, s.slug, now, tomorrowIso) }))
      .filter((x) => x.deps.length > 0);
    const busStop = served[0] ?? null;
    const busAlts = served.slice(1, 3);
```

Adapter le `return { ... }` du `useMemo` : remplacer `stop` par `busStop, busAlts`
et retirer la dérivation `upcoming` basée sur l'ancien modèle
(`const upcoming = sections?.stop ? ...`).

- [ ] **Step 3: Ajouter les libellés i18n (4 langues)**

Dans l'objet `T`, ajouter à CHAQUE langue (en/fr/de/el) les clés ci-dessous
(remplacer la clé `nextToday`/`noMoreToday` existantes si présentes ; conserver
`busStop`, `allSchedules`) :

```ts
// en
toward: "toward", estimatedNote: "Estimated from the timetable — no GPS.",
counterFare: "at the counter", tomorrow: "tomorrow", otherStops: "Other stops nearby",
// fr
toward: "vers", estimatedNote: "Estimé d'après l'horaire — pas de GPS.",
counterFare: "au guichet", tomorrow: "demain", otherStops: "Autres arrêts à proximité",
// de
toward: "nach", estimatedNote: "Geschätzt nach Fahrplan — kein GPS.",
counterFare: "am Schalter", tomorrow: "morgen", otherStops: "Weitere Haltestellen in der Nähe",
// el
toward: "προς", estimatedNote: "Εκτίμηση βάσει δρομολογίου — χωρίς GPS.",
counterFare: "στο ταμείο", tomorrow: "αύριο", otherStops: "Άλλες κοντινές στάσεις",
```

Et ajouter ces clés au type `Strings` :

```ts
  toward: string; estimatedNote: string; counterFare: string; tomorrow: string; otherStops: string;
```

- [ ] **Step 4: Remplacer le rendu de la section bus**

Remplacer entièrement le bloc `{/* 5. Ton arrêt de bus */}` (de `{sections?.stop && (`
jusqu'à son `)}` fermant) par :

```tsx
      {/* 5. Ton arrêt de bus (arrêt-centré) */}
      {sections?.busStop && (
        <section>
          <SectionTitle icon={<CiBus className="w-6 h-6 text-aegean" />}>{t.busStop}</SectionTitle>
          <div className="card-base p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-heading font-bold text-lg text-text m-0">{sections.busStop.stop.name}</p>
              <span className="text-sm text-text-muted font-data">{fmtKm(sections.busStop.stop.km)} km</span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 list-none p-0 m-0">
              {sections.busStop.deps.map((d: StopDeparture) => (
                <li key={`${d.destination}-${d.lineCode}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="text-text-muted">{t.toward}</span>
                  <span className="font-heading font-bold text-text">{d.destination}</span>
                  {d.durationKnown && d.nextTimes.length > 0 ? (
                    <span className="font-data text-text">
                      {d.isTomorrow ? `${t.tomorrow} ` : ""}~{d.nextTimes.join(" · ~")}
                    </span>
                  ) : (
                    <span className="text-text-muted italic">{t.counterFare}</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-text-muted">{t.estimatedNote}</p>
            <Link
              href={`/${locale}/buses?from=${encodeURIComponent(sections.busStop.stop.name)}`}
              onClick={() => track("bus")}
              className="inline-flex mt-4 bg-sun text-text rounded-full px-4 py-2 text-[13px] font-heading font-bold no-underline hover:brightness-105 transition-all"
            >
              {t.allSchedules}
            </Link>
            {sections.busAlts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[11px] uppercase tracking-wide text-text-muted mb-1.5">{t.otherStops}</p>
                <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0 font-data">
                  {sections.busAlts.map((alt) => (
                    <li key={alt.stop.slug}>
                      <Link
                        href={`/${locale}/buses?from=${encodeURIComponent(alt.stop.name)}`}
                        onClick={() => track("bus")}
                        className="px-2.5 py-1 rounded-[10px] bg-surface border-[1.5px] border-lagoon/35 text-xs font-semibold text-text no-underline"
                      >
                        {alt.stop.name} · {fmtKm(alt.stop.km)} km
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
```

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `npx tsc --noEmit && npx eslint src/components/near-me/NearMeClient.tsx src/app/[locale]/near-me/page.tsx`
Expected: 0 erreur. (Si `nextToday`/`noMoreToday` étaient utilisées ailleurs, corriger.)

- [ ] **Step 6: Commit**

```bash
git add src/components/near-me/NearMeClient.tsx
git commit -m "feat(near-me): section arret-centree par destination + alternatives"
```

---

## Task 5: Vérification complète + build + prod

**Files:** aucun (vérification).

- [ ] **Step 1: Suite de checks pure**

Run: `npm run check`
Expected: tous les `check:*` PASS + `tsc --noEmit` sans erreur.

- [ ] **Step 2: Build de production local**

Run: `SUPABASE_SERVICE_KEY=dummy npm run build`
Expected: build EXIT 0 (la clé factice suffit, cf. découverte 10/06 ; near-me est ISR/force-dynamic).

- [ ] **Step 3: Vérif fonctionnelle dev (cas Pachia Ammos)**

Lancer `npm run dev` (port isolé du worktree), ouvrir `/fr/near-me`, choisir un lieu
proche de Pachia Ammos via le sélecteur (ou simuler la géoloc 35.109 / 25.805).
Attendu : arrêt « Pakheia Ammos » mis en avant, destinations **vers Sitia**,
**vers Ierapetra**, **vers Agios Nikolaos** avec passages `~HH:MM`, note « estimé ».

- [ ] **Step 4: Pousser la branche pour preview Vercel (PAS de prod)**

```bash
git push -u origin feat/near-me-stop-centric
```
Expected: Vercel génère une URL preview. Valider `/fr/near-me` + `/en/near-me` dessus
(UA navigateur). **Ne PAS** `push origin ...:main` ici — le déploiement prod est un acte
conscient distinct, après revue Kami.

- [ ] **Step 5: Mémoire**

Append une ligne `session_log.md` : DEPLOY/COMMIT branche `feat/near-me-stop-centric`
poussée, preview à valider, WS2 livré, WS1 (normalisation) reste à faire.

---

## Self-Review

**Spec coverage :**
- §5 WS2 archi hybride B → Tasks 2 (graphe serveur) + 3 (chargement) + 4 (calcul client). ✔
- §6 moteur (proratisation, span, orientation, groupement par destination, durée manquante) → Task 1 (`stopDepartures`) + tests. ✔
- §7 UX (arrêt le plus proche desservi + 2 alternatives, par destination, `~`/estimé, CTA, 4 langues) → Task 4. ✔
- §8 edge cases (durée manquante → guichet ; repli demain ; hors Crète inchangé) → Task 1 (demain, durée) + Task 4 (guichet) ; hors-Crète/refus géoloc : code existant non touché. ✔
- §9 tests (cas réel Pakheia Ammos) → Task 5 step 3. ✔
- Contrainte RGPD (position jamais envoyée) : calcul 100 % client, aucune route API ajoutée. ✔

**Placeholders :** aucun « TBD/TODO » ; code complet à chaque step.

**Type consistency :** `StopGraph`/`GraphLine`/`GraphStop`/`StopDeparture` définis en Task 1, réutilisés identiques en Tasks 2-4. `stopDepartures(graph, slug, now, tomorrowIso)` signature stable. `buildStopGraph(network)` retourne `StopGraph`. `nearestBy` utilise `[s.lat, s.lng]` (GraphStop a `lat`/`lng`, pas `lon` — attention : `pos` est `{lat, lon}`, mais `getCoords` renvoie `[lat, lng]`, cohérent avec `haversineKm`). ✔

**Note d'attention pour l'exécutant :** vérifier la signature réelle de `timesForDate(route, dateISO)` et `parseDurationMin(duration)` dans `src/lib/bus-journey.ts` avant Task 1 step 3 (utilisées telles quelles). Si `timesForDate` exige des champs de `BusRoute` absents du fixture, compléter le fixture `R(...)` en conséquence.
