# Planner citybus bidirectionnel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer la couverture stop-à-stop du planner citybus de HER 38 %/CHA 30 % à ≥70 %/≥60 % en ingérant les routes retour cachées de l'API et en gérant les arrêts jumeaux dans le moteur.

**Architecture:** Trois briques : (1) `citybus_fetch.mjs` découvre les routes cachées via scan `trips/stop/{code}/day/{d}` et fetch leurs séquences réelles ; (2) `citybus_ingest.mjs` les merge dans les lignes (primary = routes publiées uniquement, zéro churn /live) ; (3) `engine.ts` étend origine/destination aux arrêts ≤150 m avec pénalité marche. Un script de couverture seedé sert de critère d'acceptation.

**Tech Stack:** Node 25 (`--experimental-strip-types`), TypeScript, Next.js. Tests = check scripts maison (`node:assert`, pattern `scripts/check-*.mjs`).

**Spec:** `docs/superpowers/specs/2026-07-10-citybus-bidirectional-planner-design.md`
**Worktree:** `C:/Users/fkerj/cp-citybus-bidir`, branche `feat/citybus-bidirectional` (base `69026d7`).
**Baseline mesurée (3000 paires, seed 42):** HER direct 8,0 % + corresp 30,2 % = 38,2 % · CHA 7,0 % + 22,7 % = 29,8 %.

---

### Task 1: Import relatif dans engine.ts (préalable aux check scripts node)

`src/lib/citybus/engine.ts` importe `@/lib/geo` ; node pur ne résout pas l'alias `@/`, or les check scripts et le script de couverture importent l'engine directement.

**Files:**
- Modify: `src/lib/citybus/engine.ts:6`

- [ ] **Step 1: Remplacer l'import alias par un relatif**

```ts
// avant
import { haversineKm } from "@/lib/geo";
// après
import { haversineKm } from "../geo";
```

- [ ] **Step 2: Vérifier que tsc passe toujours**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/citybus/engine.ts
git commit -m "refactor(citybus): import relatif geo (compat check scripts node)"
```

---

### Task 2: Check script moteur — 2 sens + arrêts jumeaux (test d'abord)

**Files:**
- Create: `scripts/check-citybus-engine.mjs`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Écrire le check script (échec attendu)**

```js
// scripts/check-citybus-engine.mjs — assertions moteur citybus (2 sens + arrêts jumeaux).
// Run: node --experimental-strip-types scripts/check-citybus-engine.mjs
import assert from "node:assert/strict";
import { createCitybusEngine } from "../src/lib/citybus/engine.ts";

// Réseau synthétique : ligne L1 aller A→B→C ; retour C2→B2→A2 (jumeaux à ~55 m,
// comme les arrêts ΕΠΙΣΤΡΟΦΗΣ du vrai réseau). D = arrêt isolé (>150 m de tout).
// 0.0005° de latitude ≈ 55 m.
const S = (slug, lat, lng) => ({ slug, name: slug.toUpperCase(), nameEl: slug, lat, lng });
const data = {
  info: { operator: "test", sourceUrl: "x", city: "Test" },
  stops: {
    a: S("a", 35.0, 25.0), b: S("b", 35.01, 25.0), c: S("c", 35.02, 25.0),
    a2: S("a2", 35.0005, 25.0), b2: S("b2", 35.0105, 25.0), c2: S("c2", 35.0205, 25.0),
    d: S("d", 35.1, 25.1),
  },
  lines: [{ code: "L1", apiCode: "1", name: "L1", nameEl: "L1", hex: null, textHex: null, totalMinutes: 10, lengthKm: 3 }],
  routes: [
    { code: "R-ALLER", lineCode: "L1", name: "A - C", direction: 1, stops: [
      { slug: "a", seq: 0, cumKm: 0, cumMin: 0 },
      { slug: "b", seq: 1, cumKm: 1.1, cumMin: 4 },
      { slug: "c", seq: 2, cumKm: 2.2, cumMin: 8 },
    ] },
    { code: "R-RETOUR", lineCode: "L1", name: "C - A", direction: 2, stops: [
      { slug: "c2", seq: 0, cumKm: 0, cumMin: 0 },
      { slug: "b2", seq: 1, cumKm: 1.1, cumMin: 4 },
      { slug: "a2", seq: 2, cumKm: 2.2, cumMin: 8 },
    ] },
  ],
};
const eng = createCitybusEngine(data);

// 1. Direct aller inchangé, sans pénalité (arrêts exacts).
let trips = eng.findTrips("a", "c");
assert.ok(trips.length >= 1, "a->c direct attendu");
assert.equal(trips[0].transfers, 0);
assert.equal(trips[0].legs[0].fromSlug, "a");
assert.equal(trips[0].totalMinutes, 8, "pas de pénalité quand arrêts exacts");

// 2. Retour c->a : la route retour part du jumeau c2 (~55 m) et arrive en a2.
trips = eng.findTrips("c", "a");
assert.ok(trips.length >= 1, "c->a doit passer par les jumeaux c2/a2");
assert.equal(trips[0].legs[0].fromSlug, "c2", "part du jumeau c2");
assert.equal(trips[0].legs[0].toSlug, "a2", "arrive au jumeau a2");

// 3. Pénalité marche incluse dans le total (8 min bus + 2× ~1 min marche).
assert.ok(trips[0].totalMinutes > 8, `pénalité marche attendue, total=${trips[0].totalMinutes}`);

// 4. Arrêt isolé (>150 m de tout) : aucun trajet.
assert.equal(eng.findTrips("d", "a").length, 0, "d isolé, pas de trajet");

// 5. Pas de doublon de signature dans les résultats.
trips = eng.findTrips("a", "c");
const sigs = trips.map((t) => t.legs.map((l) => `${l.routeCode}:${l.fromSlug}>${l.toSlug}`).join("|"));
assert.equal(new Set(sigs).size, sigs.length, "pas de doublons");

console.log("check-citybus-engine OK");
```

- [ ] **Step 2: Le lancer et vérifier l'échec sur l'assertion 2**

Run: `node --experimental-strip-types scripts/check-citybus-engine.mjs`
Expected: FAIL `c->a doit passer par les jumeaux c2/a2` (le moteur actuel ne connaît pas les jumeaux).

- [ ] **Step 3: Enregistrer dans package.json**

Dans `"scripts"` ajouter :
```json
"check:citybus-engine": "node --experimental-strip-types scripts/check-citybus-engine.mjs",
```
et insérer `npm run check:citybus-engine && ` dans la chaîne `"check"` (avant `tsc --noEmit`).

---

### Task 3: Moteur — extension arrêts jumeaux (≤150 m)

**Files:**
- Modify: `src/lib/citybus/engine.ts`

- [ ] **Step 1: Ajouter le cache de voisinage dans `createCitybusEngine`** (après la construction de `routesByStop`)

```ts
const NEIGHBOR_KM = 0.15; // arrêts jumeaux : extension origine/destination à ~2 min de marche
let neighborCache: Map<string, { slug: string; walkMin: number }[]> | null = null;
function neighborsOf(slug: string): { slug: string; walkMin: number }[] {
  if (!neighborCache) {
    neighborCache = new Map();
    const all = Object.values(STOPS);
    for (const s of all) {
      const near: { slug: string; walkMin: number }[] = [];
      for (const o of all) {
        if (o.slug === s.slug) continue;
        const d = haversineKm([s.lat, s.lng], [o.lat, o.lng]);
        if (d <= NEIGHBOR_KM) near.push({ slug: o.slug, walkMin: walkMinFromKm(d) });
      }
      if (near.length) neighborCache.set(s.slug, near);
    }
  }
  return neighborCache.get(slug) ?? [];
}
```

- [ ] **Step 2: Renommer l'actuel `findTrips` en `findTripsExact`** (fonction privée, corps inchangé), puis ajouter le nouveau `findTrips` public :

```ts
function findTrips(fromSlug: string, toSlug: string): CitybusTrip[] {
  if (!fromSlug || !toSlug || fromSlug === toSlug) return [];
  const origins = [{ slug: fromSlug, walkMin: 0 }, ...neighborsOf(fromSlug)];
  const dests = [{ slug: toSlug, walkMin: 0 }, ...neighborsOf(toSlug)];
  const all: CitybusTrip[] = [];
  for (const o of origins) {
    for (const d of dests) {
      if (o.slug === d.slug) continue;
      for (const t of findTripsExact(o.slug, d.slug)) {
        const walk = o.walkMin + d.walkMin;
        all.push(walk ? { ...t, totalMinutes: t.totalMinutes + walk } : t);
      }
    }
  }
  all.sort((a, b) => a.transfers - b.transfers || a.totalMinutes - b.totalMinutes);
  const seen = new Set<string>();
  const out: CitybusTrip[] = [];
  for (const t of all) {
    const sig = t.legs.map((l) => l.lineCode).join(">");
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}
```

Note : la dédup par signature de lignes (sans minutes) fait qu'une même ligne via deux jumeaux ne sort qu'une fois, au meilleur temps. `findTripsExact` garde sa dédup/cap interne (candidats ≤4 par paire exacte).

- [ ] **Step 3: Lancer le check**

Run: `node --experimental-strip-types scripts/check-citybus-engine.mjs`
Expected: `check-citybus-engine OK`

- [ ] **Step 4: tsc**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add src/lib/citybus/engine.ts scripts/check-citybus-engine.mjs package.json
git commit -m "feat(citybus): extension arrets jumeaux <=150m dans findTrips (penalite marche incluse)"
```

---

### Task 4: Script de couverture seedé

**Files:**
- Create: `scripts/citybus_coverage.mjs`

- [ ] **Step 1: Écrire le script**

```js
// scripts/citybus_coverage.mjs — couverture stop-à-stop du planner citybus (paires seedées).
// Run: node --experimental-strip-types scripts/citybus_coverage.mjs
import { createCitybusEngine } from "../src/lib/citybus/engine.ts";
import { CITYBUS_DATA as HER } from "../src/data/heraklion-bus.ts";
import { CITYBUS_DATA as CHA } from "../src/data/chania-bus.ts";

const N = 3000;
function measure(data, label) {
  const eng = createCitybusEngine(data);
  const slugs = Object.keys(data.stops);
  let seed = 42;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let direct = 0, transfer = 0, none = 0;
  for (let n = 0; n < N; n++) {
    const a = slugs[Math.floor(rnd() * slugs.length)];
    const b = slugs[Math.floor(rnd() * slugs.length)];
    if (a === b) { n--; continue; }
    const trips = eng.findTrips(a, b);
    if (!trips.length) none++;
    else if (trips[0].transfers === 0) direct++;
    else transfer++;
  }
  const pc = (x) => ((100 * x) / N).toFixed(1) + "%";
  console.log(`${label} stops=${slugs.length} routes=${data.routes.length} : direct ${pc(direct)} +1corresp ${pc(transfer)} TOTAL ${pc(direct + transfer)} sans trajet ${pc(none)}`);
}
measure(HER, "HER");
measure(CHA, "CHA");
```

- [ ] **Step 2: Le lancer (données actuelles = baseline post-jumeaux)**

Run: `node --experimental-strip-types scripts/citybus_coverage.mjs`
Expected: totaux ≥ baseline brute (38,2 %/29,8 % mesurés sans jumeaux) ; noter les chiffres — c'est la référence avant données bidirectionnelles.

- [ ] **Step 3: Commit**

```bash
git add scripts/citybus_coverage.mjs
git commit -m "chore(citybus): script de mesure couverture stop-a-stop (seed fixe)"
```

---

### Task 5: Fetch — découverte des routes cachées

**Files:**
- Modify: `scripts/citybus_fetch.mjs` (insérer entre la boucle `sequences` et la construction de `dump`, lignes ~117-126 ; ajouter `hiddenRoutes` au dump ligne ~127)

- [ ] **Step 1: Ajouter l'étape de scan après la boucle des séquences publiées**

```js
  // --- routes cachées (sens retour) : découverte via trips-by-stop ---
  // L'API ne publie qu'un sens par ligne dans lines[].routes ; les routes retour ont
  // leurs propres codes, visibles uniquement dans les départs par arrêt.
  const knownRouteCodes = new Set(routeCodes);
  const lineCodesSet = new Set(lines.map((l) => l.code));
  const hiddenMeta = new Map(); // routeCode -> { code, lineCode, name }
  const DAYS = [1, 6, 7]; // lundi / samedi / dimanche = les 3 régimes horaires
  console.log(`hidden routes: scan trips (${stops.length} arrets x ${DAYS.length} jours)...`);
  let scanned = 0;
  for (const s of stops) {
    for (const day of DAYS) {
      await sleep(PACE_MS);
      let trips;
      try {
        trips = await get(`/${LANG}/${AGENCY}/trips/stop/${s.code}/day/${day}`);
      } catch (e) {
        if (!/HTTP 404/.test(String(e.message))) console.log(`  trips ${s.code}/j${day}: ${e.message}`);
        continue;
      }
      if (!Array.isArray(trips)) continue;
      for (const t of trips) {
        const rc = String(t.routeCode ?? '');
        if (!rc || knownRouteCodes.has(rc) || hiddenMeta.has(rc)) continue;
        hiddenMeta.set(rc, { code: rc, lineCode: String(t.lineCode ?? ''), name: t.routeName || rc });
      }
    }
    scanned++;
    if (scanned % 50 === 0) console.log(`  ${scanned}/${stops.length} arrets, ${hiddenMeta.size} routes cachées`);
  }
  const hiddenRoutes = [...hiddenMeta.values()].filter((h) => lineCodesSet.has(h.lineCode));
  for (const h of hiddenMeta.values()) if (!lineCodesSet.has(h.lineCode)) console.log(`  route ${h.code}: ligne inconnue ${h.lineCode}, ignorée`);
  console.log(`  ${hiddenRoutes.length} routes cachées rattachées à une ligne connue`);

  console.log(`sequences cachées (${hiddenRoutes.length})...`);
  for (const h of hiddenRoutes) {
    await sleep(PACE_MS);
    try {
      sequences[h.code] = await get(`/${LANG}/${AGENCY}/routes/${h.code}/sequence`);
    } catch (e) {
      console.log(`  route ${h.code}: ${e.message}`);
      sequences[h.code] = [];
    }
  }
```

- [ ] **Step 2: Ajouter `hiddenRoutes` au dump**

```js
  const dump = {
    fetchedAt: new Date().toISOString(),
    source: `${CITY.subdomain}.citybus.gr`,
    api: API, agency: AGENCY, lines, stops, points, sequences, hiddenRoutes,
  };
```
Et enrichir le log final : `console.log(\`  lines=${lines.length} stops=${stops.length} routes=${routeCodes.length} hidden=${hiddenRoutes.length}\`);`

- [ ] **Step 3: Commit (avant les runs longs, pour séparer code et data)**

```bash
git add scripts/citybus_fetch.mjs
git commit -m "feat(citybus): decouverte des routes retour cachees via trips-by-stop"
```

- [ ] **Step 4: Lancer le fetch des deux villes (long : ~12-15 min chacune)**

Run: `node scripts/citybus_fetch.mjs --city irakleio` puis `node scripts/citybus_fetch.mjs --city chania`
Expected: `hidden=` > 0 pour chaque ville (HER : attendu ~des dizaines, les codes `21xxx/29xxx/1008…` vus en recon). Les dumps `data/citybus-*/dump.json` sont gitignorés (data/ non versionné) — c'est normal.

---

### Task 6: Ingest — merge des routes cachées

**Files:**
- Modify: `scripts/citybus_ingest.mjs` (fonction `build()`, lignes ~71-130)

- [ ] **Step 1: Merger les routes cachées dans leurs lignes au début de `build()`** (juste après `const seqOf = ...`, avant `activeLines`)

```js
  // Routes cachées (sens retour, cf citybus_fetch) : on les greffe sur leur ligne.
  // direction = opposé de la direction majoritaire publiée ; hidden=true les exclut du primary.
  const hiddenByLine = new Map();
  for (const h of dump.hiddenRoutes || []) {
    const arr = hiddenByLine.get(h.lineCode) ?? [];
    arr.push(h);
    hiddenByLine.set(h.lineCode, arr);
  }
  for (const l of dump.lines) {
    const extras = (hiddenByLine.get(l.code) || []).filter((h) => !l.routes.some((r) => r.code === h.code));
    if (!extras.length) continue;
    const dirCounts = {};
    for (const r of l.routes) if (r.direction != null) dirCounts[r.direction] = (dirCounts[r.direction] ?? 0) + 1;
    const majority = Object.entries(dirCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const reverseDir = majority === '2' ? 1 : majority === '1' ? 2 : null;
    for (const h of extras) l.routes.push({ code: h.code, name: h.name, direction: reverseDir, hidden: true });
  }
```

- [ ] **Step 2: Primary = routes publiées uniquement** (ligne ~114, sélection du `primary`)

```js
    const published = routes.filter((r) => !r.hidden);
    const primary = (published.length ? published : routes).reduce((a, b) => (seqOf(b.code).length > seqOf(a.code).length ? b : a));
```

(`usedCodes`, `activeLines`, `routesOut` itèrent déjà `l.routes` : les routes cachées y entrent sans autre changement.)

- [ ] **Step 3: Régénérer les data files (dry-run, PAS de --commit)**

Run: `node scripts/citybus_ingest.mjs --city irakleio` puis `node scripts/citybus_ingest.mjs --city chania`
Expected: `routes:` en nette hausse (81 → ~150+ HER), `arrets:` en hausse (nouveaux arrêts côté retour), aucun `⚠️NON-MONO` nouveau, `geo=` inchangé par ligne.

- [ ] **Step 4: Mesurer la couverture**

Run: `node --experimental-strip-types scripts/citybus_coverage.mjs`
Expected: TOTAL **HER ≥ 70 %, CHA ≥ 60 %**. Sinon : investiguer (lignes sans route retour découverte ? arrêts orphelins ?) et rapporter le vrai plafond.

- [ ] **Step 5: tsc + build**

Run: `npx tsc --noEmit && npm run build`
Expected: verts. Noter le first-load JS des pages `/buses/heraklion` et `/buses/chania` avant/après (data passée au client ; seuil d'alerte : delta gzip > ~80 KB → follow-up dégraissage, pas bloquant).

- [ ] **Step 6: Commit code ingest + data régénérée**

```bash
git add scripts/citybus_ingest.mjs src/data/heraklion-bus.ts src/data/chania-bus.ts
git commit -m "feat(citybus): routes retour dans les data planner HER/CHA (couverture XX%/YY%)"
```
(Remplacer XX/YY par les chiffres mesurés.)

---

### Task 7: Supabase + vérifications finales + preview

- [ ] **Step 1: Upsert Supabase (nouveaux arrêts avec api_code, primary inchangé)**

Run: `node scripts/citybus_ingest.mjs --city irakleio --commit` puis `--city chania --commit`
Expected: `bus_stops : N upsert` (N > 527/474), `bus_line_stops` réinséré à l'identique (primary publié). Vérifier ensuite qu'un arrêt existant n'a pas bougé :
`curl -s "https://crete.direct/api/buses/citybus-live/0122?city=her&lang=en"` → HTTP 200 (proxy intact).

- [ ] **Step 2: Chaîne de checks maison**

Run: `npm run check:citybus-engine && npm run check:bus-select && npm run check:stop-departures && npx tsc --noEmit`
Expected: tout vert (non-régression bus).

- [ ] **Step 3: Push branche → preview Vercel**

```bash
git push -u origin feat/citybus-bidirectional
```
Expected: URL preview Vercel. Vérifier sur la preview `/en/buses/heraklion` : un trajet RETOUR emblématique (ex : aéroport → Ammoudara ET Ammoudara → aéroport donnent tous deux un résultat).

- [ ] **Step 4: Mémoire + rapport**

MAJ `project_crete_direct_bus_live.md` (chantier, chiffres avant/après, [FACT] + source) + ligne MEMORY.md si le hook de fiche change + `session_log.md`. Rapport à Kami avec chiffres et URL preview ; **merge prod `master:main` = GO Kami uniquement**.

---

## Self-review

- Spec coverage : fetch caché (Task 5), ingest merge + primary publié (Task 6), jumeaux engine (Tasks 2-3), script mesure (Task 4), critères (Tasks 6-7), Supabase (Task 7), bundle (Task 6 Step 5). ✔
- Pas de placeholder ; code complet dans chaque step. ✔
- Types cohérents : `findTripsExact` défini Task 3 Step 2 et utilisé uniquement là ; `neighborsOf` défini avant usage ; `hidden` flag posé Task 6 Step 1, consommé Step 2. ✔
