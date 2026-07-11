# Instrumentation boucle de feedback flux — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mesurer l'effet des actions crete.direct sur les flux : proxy passif « embarquement bus » (`bus_boarding_proxy`), clics redistribution plages (`quieter_beach_click`), rapport hebdo agrégé (`flux_impact_log.md`).

**Architecture:** Lib pure testée (`boarding-proxy.ts`) + émetteur client dédupliqué (`boarding-beacon.ts`) branché sur 2 surfaces existantes (NextDeparture pour les pages trajet, LiveMapClient pour /live), wrapper client mince pour les liens plages, script hebdo SSH (ClickHouse Plausible + Postgres cretepulse) planifié Windows.

**Tech Stack:** Next.js 16 App Router, Plausible self-hosted (events_v2 ClickHouse conteneur `plausible-plausible_events_db-1`, `site_id=1`), pattern check `node --experimental-strip-types`.

**Worktree:** `C:\Users\fkerj\cp-flux-impact`, branche `feat/flux-impact`. Fin de chantier = `npm run ship` (JAMAIS push main ; le daily-deploy promeut à 20h Athens).

**Spec:** `docs/superpowers/specs/2026-07-11-flux-impact-instrumentation-design.md`

**Faits vérifiés le 11/07 :** `bus_search` = 641 events/7 j (volume réel). Requête ClickHouse validée en SSH : `docker exec plausible-plausible_events_db-1 clickhouse-client --query "SELECT name, count() FROM plausible_events_db.events_v2 WHERE site_id=1 ..."`. `NextDeparture` rendu à 2 endroits : `buses/[pair]/page.tsx:326` (à tracker) et `JourneyPlanner.tsx:187` (à NE PAS tracker). `pickNearestStop` renvoie `{ km, ... }` via `/api/buses/nearest-stop` → `{ stop: { km } | null }`.

---

### Task 1: Lib pure `boarding-proxy` (TDD)

**Files:**
- Create: `src/lib/boarding-proxy.ts`
- Create: `scripts/check-boarding.mjs`
- Modify: `package.json` (scripts `check:boarding` + chaîne `check`)

- [ ] **Step 1: Écrire les tests qui échouent**

`scripts/check-boarding.mjs` (pattern exact de `scripts/check-retention.mjs`) :

```js
// scripts/check-boarding.mjs : tests purs du proxy embarquement bus (chantier flux-impact).
import assert from "node:assert/strict";
import { inBoardingWindow, bucketInMin, nearStopLabel } from "../src/lib/boarding-proxy.ts";

let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("fenêtre : 0 min = dedans", () => assert.equal(inBoardingWindow(0), true));
ok("fenêtre : 15 min = dedans (borne)", () => assert.equal(inBoardingWindow(15), true));
ok("fenêtre : 16 min = dehors", () => assert.equal(inBoardingWindow(16), false));
ok("fenêtre : -5 min = dedans (bus à quai)", () => assert.equal(inBoardingWindow(-5), true));
ok("fenêtre : -6 min = dehors", () => assert.equal(inBoardingWindow(-6), false));
ok("fenêtre : NaN = dehors", () => assert.equal(inBoardingWindow(NaN), false));

ok("bucket : négatif = due", () => assert.equal(bucketInMin(-3), "due"));
ok("bucket : 0 = 0-5", () => assert.equal(bucketInMin(0), "0-5"));
ok("bucket : 5 = 0-5", () => assert.equal(bucketInMin(5), "0-5"));
ok("bucket : 6 = 6-15", () => assert.equal(bucketInMin(6), "6-15"));
ok("bucket : 15 = 6-15", () => assert.equal(bucketInMin(15), "6-15"));

ok("near_stop : null = unknown", () => assert.equal(nearStopLabel(null), "unknown"));
ok("near_stop : NaN = unknown", () => assert.equal(nearStopLabel(NaN), "unknown"));
ok("near_stop : 0.2 km = yes", () => assert.equal(nearStopLabel(0.2), "yes"));
ok("near_stop : 0.3 km = yes (borne)", () => assert.equal(nearStopLabel(0.3), "yes"));
ok("near_stop : 0.31 km = no", () => assert.equal(nearStopLabel(0.31), "no"));

console.log(`✅ check:boarding : ${n} tests OK`);
```

- [ ] **Step 2: Vérifier l'échec**

Run: `cd C:\Users\fkerj\cp-flux-impact && node --experimental-strip-types scripts/check-boarding.mjs`
Expected: FAIL (`Cannot find module '../src/lib/boarding-proxy.ts'`)

- [ ] **Step 3: Implémentation minimale**

`src/lib/boarding-proxy.ts` :

```ts
// src/lib/boarding-proxy.ts : logique pure du proxy embarquement bus
// (event Plausible bus_boarding_proxy). Fenêtre de départ, bucketing à
// cardinalité bornée, label proximité arrêt. Tests : scripts/check-boarding.mjs.
// Spec : docs/superpowers/specs/2026-07-11-flux-impact-instrumentation-design.md
export const BOARDING_WINDOW_MIN = -5;
export const BOARDING_WINDOW_MAX = 15;
export const NEAR_STOP_KM = 0.3;

export function inBoardingWindow(inMin: number): boolean {
  return Number.isFinite(inMin) && inMin >= BOARDING_WINDOW_MIN && inMin <= BOARDING_WINDOW_MAX;
}

export function bucketInMin(inMin: number): "due" | "0-5" | "6-15" {
  if (inMin < 0) return "due";
  return inMin <= 5 ? "0-5" : "6-15";
}

export function nearStopLabel(km: number | null): "yes" | "no" | "unknown" {
  if (km == null || !Number.isFinite(km)) return "unknown";
  return km <= NEAR_STOP_KM ? "yes" : "no";
}
```

- [ ] **Step 4: Vérifier le vert**

Run: `node --experimental-strip-types scripts/check-boarding.mjs`
Expected: `✅ check:boarding : 16 tests OK`

- [ ] **Step 5: Câbler dans package.json**

Dans `scripts` (à côté de `check:retention`) :
```json
"check:boarding": "node --experimental-strip-types scripts/check-boarding.mjs",
```
Et dans la chaîne `"check"`, insérer `npm run check:boarding && ` juste après `npm run check:retention && `.

- [ ] **Step 6: Commit**

```bash
git add src/lib/boarding-proxy.ts scripts/check-boarding.mjs package.json
git commit -m "feat(flux): lib pure boarding-proxy (fenêtre départ, buckets, near_stop) + check:boarding"
```

---

### Task 2: Émetteur client `boarding-beacon` + position passive

**Files:**
- Create: `src/lib/passive-position.ts`
- Create: `src/lib/boarding-beacon.ts`

Pas de test pur (glue navigateur, comme `RetentionBeacon`) ; la logique décisionnelle est déjà testée en Task 1.

- [ ] **Step 1: Créer `src/lib/passive-position.ts`**

```ts
// src/lib/passive-position.ts : position passive stricte. Ne demande JAMAIS
// la permission géoloc : lit la position uniquement si déjà accordée
// (permissions.state === "granted"), sinon résout null. Distance au plus
// proche arrêt via /api/buses/nearest-stop (endpoint NowPanel existant).
// RGPD : jamais de prompt, position jamais stockée ni transmise à Plausible.
export async function passiveNearestStopKm(timeoutMs = 3000): Promise<number | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions || !navigator.geolocation) return null;
    const st = await navigator.permissions.query({ name: "geolocation" });
    if (st.state !== "granted") return null;
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      const t = setTimeout(() => resolve(null), timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (p) => { clearTimeout(t); resolve(p); },
        () => { clearTimeout(t); resolve(null); },
        { maximumAge: 120_000, timeout: timeoutMs },
      );
    });
    if (!pos) return null;
    const res = await fetch(
      `/api/buses/nearest-stop?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { stop: { km: number } | null };
    return data.stop?.km ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Créer `src/lib/boarding-beacon.ts`**

```ts
// src/lib/boarding-beacon.ts : émission dédupliquée de l'event Plausible
// bus_boarding_proxy (1× par surface+clé par session, pattern RetentionBeacon).
// L'event part TOUJOURS, near_stop="unknown" si la géoloc passive échoue.
import { nearStopLabel } from "./boarding-proxy";
import { passiveNearestStopKm } from "./passive-position";

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
  }
}

export async function emitBoardingProxy(
  surface: "pair" | "live",
  key: string,
  props: Record<string, string>,
): Promise<void> {
  try {
    const guard = `cd_bp_${surface}_${key}`;
    if (sessionStorage.getItem(guard)) return;
    sessionStorage.setItem(guard, "1");
    const km = await passiveNearestStopKm();
    window.plausible?.("bus_boarding_proxy", {
      props: { surface, ...props, near_stop: nearStopLabel(km) },
    });
  } catch {
    // sessionStorage indisponible : on ne mesure pas, on ne casse rien.
  }
}
```

⚠️ Si `tsc` râle sur le `declare global` (conflit avec une déclaration locale existante dans `NearMeClient.tsx`/`TaxiCallButton.tsx` — signatures identiques `Record<string, string>` donc normalement OK), retirer le bloc `declare global` et utiliser le cast local pattern `JourneyPlanner.tsx:216-218` à la place.

- [ ] **Step 3: Vérifier tsc**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add src/lib/passive-position.ts src/lib/boarding-beacon.ts
git commit -m "feat(flux): boarding-beacon dédupliqué + géoloc passive stricte (jamais de prompt)"
```

---

### Task 3: Surface `pair` — event dans NextDeparture

**Files:**
- Modify: `src/components/NextDeparture.tsx` (signature L30 + useEffect L34-48)
- Modify: `src/app/[locale]/buses/[pair]/page.tsx:326`

- [ ] **Step 1: Modifier NextDeparture**

Signature (L30) — nouvelle prop optionnelle, comportement existant intact sans elle :

```tsx
export function NextDeparture({ route, trackSurface }: { route: BusRoute; locale: string; trackSurface?: "pair" }) {
```

Imports à ajouter :
```tsx
import { inBoardingWindow, bucketInMin } from "@/lib/boarding-proxy";
import { emitBoardingProxy } from "@/lib/boarding-beacon";
```

Dans le `useEffect`, branche `if (next)` (après L42 `setState({ time: next.t, inMin: next.m - minutes });`, avant le `return`) :

```tsx
      const inMin = next.m - minutes;
      if (trackSurface === "pair" && inBoardingWindow(inMin)) {
        void emitBoardingProxy("pair", route.id, { pair: route.id, in_bucket: bucketInMin(inMin) });
      }
```

Ajouter `trackSurface` au tableau de dépendances du useEffect : `[route, trackSurface]`.
⚠️ NE PAS toucher le rendu ni le cas `tomorrow`. ⚠️ `JourneyPlanner.tsx:187` reste SANS la prop (gate anti-réutilisation, cf spec).

- [ ] **Step 2: Passer la prop sur la page trajet**

`src/app/[locale]/buses/[pair]/page.tsx:326` :
```tsx
              <NextDeparture route={ref} locale={ui} trackSurface="pair" />
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run check:boarding`
Expected: 0 erreur, 16 tests OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/NextDeparture.tsx "src/app/[locale]/buses/[pair]/page.tsx"
git commit -m "feat(flux): bus_boarding_proxy surface pair (fenêtre départ sur pages trajet)"
```

---

### Task 4: Surface `live` — engagement 30 s dans LiveMapClient

**Files:**
- Modify: `src/components/live/LiveMapClient.tsx`

- [ ] **Step 1: Ajouter l'effet d'engagement**

Imports à ajouter en tête de fichier :
```tsx
import { emitBoardingProxy } from "@/lib/boarding-beacon";
```

Dans le corps du composant, APRÈS les déclarations de refs existantes (chercher `gpsCodesRef` — ref des lignes couvertes par le GPS, utilisée L255/L300) et AVANT le grand useEffect carte, ajouter un useEffect indépendant :

```tsx
  // Proxy embarquement : session live "engagée" = 30 s cumulées onglet visible
  // (filtre les rebonds). source=gps si au moins une ligne GPS réelle affichée
  // au moment de l'émission. Dédup session dans boarding-beacon.
  useEffect(() => {
    let acc = 0;
    const iv = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      acc += 1;
      if (acc >= 30) {
        clearInterval(iv);
        void emitBoardingProxy("live", "live", {
          source: gpsCodesRef.current.size > 0 ? "gps" : "estimated",
        });
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);
```

⚠️ Si `gpsCodesRef` est déclaré APRÈS l'emplacement choisi, placer l'effet après sa déclaration (les hooks doivent rester avant tout return conditionnel).

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/LiveMapClient.tsx
git commit -m "feat(flux): bus_boarding_proxy surface live (engagement 30s, source gps/estimated)"
```

---

### Task 5: Clics « alternatives plus calmes » plages

**Files:**
- Create: `src/components/beaches/QuieterAltLink.tsx`
- Modify: `src/components/beaches/BeachCrowd.tsx` (L62-92, composant `QuieterAlternatives`)
- Modify: `src/app/[locale]/beaches/[slug]/page.tsx:616`

- [ ] **Step 1: Créer le wrapper client**

`src/components/beaches/QuieterAltLink.tsx` :

```tsx
"use client";
// Lien d'alternative plage instrumenté : clic = event Plausible
// quieter_beach_click (preuve redistribution des flux).
// Spec : docs/superpowers/specs/2026-07-11-flux-impact-instrumentation-design.md
import Link from "next/link";
import type { ReactNode } from "react";

export function QuieterAltLink({
  href, from, to, band, className, children,
}: {
  href: string; from: string; to: string; band: string; className?: string; children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        (window as unknown as {
          plausible?: (e: string, o?: { props?: Record<string, string> }) => void;
        }).plausible?.("quieter_beach_click", { props: { from, to, band } });
      }}
    >
      {children}
    </Link>
  );
}
```

- [ ] **Step 2: Brancher dans QuieterAlternatives (BeachCrowd.tsx)**

Ajouter la prop `fromSlug` à la signature (L62-68) :

```tsx
export function QuieterAlternatives({
  alternatives,
  locale,
  fromSlug,
}: {
  alternatives: QuieterAlternative[];
  locale: string;
  fromSlug: string;
}) {
```

Remplacer le `<Link>` (L77-87) par `QuieterAltLink`, mêmes classes et contenu exacts :

```tsx
          <QuieterAltLink
            key={a.beach.slug}
            href={`/${locale}/beaches/${a.beach.slug}`}
            from={fromSlug}
            to={a.beach.slug}
            band={a.crowd.band}
            className="rounded-xl border border-border bg-white p-3 hover:border-sea/30 transition-all"
          >
            <p className="font-semibold text-sm">{getLocalizedField(a.beach, "name", locale as Locale)}</p>
            <p className="text-xs text-text-muted">{L.away(a.km)}</p>
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${BAND_STYLES[a.crowd.band]}`}>
              {L.band[a.crowd.band]}
            </span>
          </QuieterAltLink>
```

Import en tête : `import { QuieterAltLink } from "./QuieterAltLink";` (l'import `Link` de next/link devient inutilisé SI plus aucun autre usage dans le fichier — le retirer dans ce cas, sinon le garder).

- [ ] **Step 3: Passer le slug au call site**

`src/app/[locale]/beaches/[slug]/page.tsx:616` (la variable `beach` est celle passée à `quieterAlternatives(beach, regionBeaches)` L280) :

```tsx
        <QuieterAlternatives alternatives={quieter} locale={locale} fromSlug={beach.slug} />
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add src/components/beaches/QuieterAltLink.tsx src/components/beaches/BeachCrowd.tsx "src/app/[locale]/beaches/[slug]/page.tsx"
git commit -m "feat(flux): event quieter_beach_click sur les alternatives plages (redistribution)"
```

---

### Task 6: Rapport hebdo `flux-impact-weekly.mjs` + tâche Windows

**Files:**
- Create: `C:\Users\fkerj\.claude\scripts\flux-impact-weekly.mjs` (HORS repo — script local Kairos)
- Create (auto au premier run): `~/.claude/projects/C--Users-fkerj/memory/flux_impact_log.md`

- [ ] **Step 1: Écrire le script**

```js
#!/usr/bin/env node
// Flux-impact — rapport HEBDO boucle de feedback crete.direct.
// Assemble le funnel BUS (recherches -> fenêtre départ -> live engagé) +
// REDISTRIBUTION plages (quieter_beach_click) + CAR (leads/demandes par source)
// depuis ClickHouse Plausible + Postgres cretepulse (SSH kairos-vps).
// Sortie : append memory/flux_impact_log.md + console. Pas de Telegram (lu au /brief).
// Lance : node ~/.claude/scripts/flux-impact-weekly.mjs
// Planifie : tache Windows "Kairos-Flux-Impact-Weekly" (lundi 09:30).
// Spec : cretepulse-build docs/superpowers/specs/2026-07-11-flux-impact-instrumentation-design.md
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const LOG = join(homedir(), ".claude", "projects", "C--Users-fkerj", "memory", "flux_impact_log.md");
const CH = "docker exec plausible-plausible_events_db-1 clickhouse-client --format TabSeparated --query";

function ch(sql) {
  const out = execFileSync("ssh", ["kairos-vps", `${CH} "${sql.replace(/"/g, '\\"')}"`],
    { encoding: "utf8", timeout: 60_000 });
  return out.split(/\r?\n/).filter(Boolean).map((l) => l.split("\t"));
}

const W = "site_id=1 AND timestamp >= now() - INTERVAL 7 DAY";
const P = "plausible_events_db.events_v2";
const prop = (k) => `meta.value[indexOf(meta.key,'${k}')]`;

function counts() {
  const rows = ch(`SELECT name, count() FROM ${P} WHERE ${W} AND name IN ('bus_search','bus_boarding_proxy','quieter_beach_click','now_panel_click','Car Lead','Activity Lead') GROUP BY name`);
  return Object.fromEntries(rows.map(([n, c]) => [n, Number(c)]));
}
function boardingBreakdown() {
  return ch(`SELECT ${prop("surface")}, ${prop("near_stop")}, count() FROM ${P} WHERE ${W} AND name='bus_boarding_proxy' GROUP BY 1,2 ORDER BY 3 DESC`)
    .map(([surface, near, c]) => `${surface || "?"}/near=${near || "?"}: ${c}`);
}
function corridors() {
  return ch(`SELECT ${prop("from")}, ${prop("to")}, count() AS c FROM ${P} WHERE ${W} AND name='quieter_beach_click' GROUP BY 1,2 ORDER BY c DESC LIMIT 5`)
    .map(([f, t, c]) => `${f} -> ${t} (${c})`);
}
function carLeadSources() {
  return ch(`SELECT ${prop("source")}, count() AS c FROM ${P} WHERE ${W} AND name='Car Lead' GROUP BY 1 ORDER BY c DESC LIMIT 8`)
    .map(([s, c]) => `${s || "(none)"}=${c}`);
}
function returningShare() {
  const r = ch(`SELECT countIf(${prop("bucket")} != 'new'), count() FROM ${P} WHERE ${W} AND name='retention'`);
  const [ret, tot] = (r[0] ?? ["0", "0"]).map(Number);
  return tot ? `${((ret / tot) * 100).toFixed(1)}% (${ret}/${tot})` : "n/d";
}
function carRequests7j() {
  const sql = "select coalesce(source,'(null)')||'|'||count(*) filter (where created_at >= now() - interval '7 days') from car_requests group by 1 order by 2 desc";
  const out = execFileSync("ssh", ["kairos-vps",
    `docker exec cretepulse-postgres psql -U postgres -d cretepulse -tAc "${sql}"`,
  ], { encoding: "utf8", timeout: 60_000 });
  return out.split(/\r?\n/).filter(Boolean)
    .map((l) => l.split("|")).filter(([, c]) => Number(c) > 0)
    .map(([s, c]) => `${s}=${c}`);
}

function main() {
  const c = counts();
  const boarding = boardingBreakdown();
  const cors = corridors();
  let reqs = [];
  try { reqs = carRequests7j(); } catch (e) { reqs = [`ERREUR psql: ${e.message.slice(0, 60)}`]; }
  const snap = [
    ``,
    `## Flux-impact ${new Date().toISOString().slice(0, 10)} (fenêtre 7 j glissants)`,
    `- BUS : ${c.bus_search ?? 0} recherches planner -> ${c.bus_boarding_proxy ?? 0} proxys embarquement${boarding.length ? ` [${boarding.join(" | ")}]` : ""}`,
    `- REDISTRIBUTION : ${c.quieter_beach_click ?? 0} clics alternatives calmes${cors.length ? ` | top : ${cors.join(" · ")}` : ""}`,
    `- CAR : ${c["Car Lead"] ?? 0} leads [${carLeadSources().join(" ")}] -> demandes 7j DB : ${reqs.join(" | ") || "0"}`,
    `- ACTIVITIES : ${c["Activity Lead"] ?? 0} leads | NOW panel : ${c.now_panel_click ?? 0} clics | visiteurs revenants : ${returningShare()}`,
  ].join("\n");
  if (!existsSync(LOG)) {
    writeFileSync(LOG,
      `# Flux-impact — funnel hebdo boucle de feedback crete.direct\n\n` +
      `Instrumentation déployée 12/07/2026 (spec cretepulse 2026-07-11-flux-impact-instrumentation-design.md).\n` +
      `Proxy embarquement = consultation horaires en fenêtre de départ (pair) ou 30 s live engagé, non calibré v1.\n` +
      `Snapshot hebdo auto (tâche Windows Kairos-Flux-Impact-Weekly, lundi 09:30). Premier relevé signifiant : 20/07.\n`);
  }
  appendFileSync(LOG, snap + "\n");
  console.log(snap);
}

main();
```

- [ ] **Step 2: Tester le script à blanc**

Run: `node C:\Users\fkerj\.claude\scripts\flux-impact-weekly.mjs`
Expected: bloc `## Flux-impact ...` en console avec `bus_search` ~600, `bus_boarding_proxy 0` (pas encore déployé), append dans `flux_impact_log.md` créé avec en-tête.

- [ ] **Step 3: Planifier la tâche Windows**

Run (PowerShell) :
```powershell
schtasks /Create /TN "Kairos-Flux-Impact-Weekly" /TR "node C:\Users\fkerj\.claude\scripts\flux-impact-weekly.mjs" /SC WEEKLY /D MON /ST 09:30 /F
```
Expected: `SUCCESS`. Vérifier : `schtasks /Query /TN "Kairos-Flux-Impact-Weekly"`.

- [ ] **Step 4: Indexer le log en mémoire**

Ajouter dans `MEMORY.md` (section fichiers d'état, après `gate_a_log.md`) :
```markdown
- [flux_impact_log.md](flux_impact_log.md) — Funnel hebdo boucle feedback flux (proxy embarquement bus, redistribution plages, car). Lundi 09:30 auto
```

---

### Task 7: Vérification globale + ship

- [ ] **Step 1: Suite complète**

Run: `cd C:\Users\fkerj\cp-flux-impact && npm run check`
Expected: tout vert y compris `check:boarding` (NB : `check:da` a des dettes préexistantes connues hors chantier — si rouge, vérifier que les violations ne viennent PAS des fichiers du chantier).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succès (copier `.env.local` déjà fait à la création du worktree).

- [ ] **Step 3: Smoke test manuel**

Run: `npm run dev` puis curl/navigateur sur `/en/buses/<pair existant>` et `/en/live` : pages 200, pas d'erreur console liée à `boarding`.

- [ ] **Step 4: Ship**

```bash
npm run ship
```
(intègre `feat/flux-impact` dans `master` et pousse — la promotion prod est automatique à 20h Athens.)

- [ ] **Step 5: Mémoire**

- session_log.md : ligne COMMIT/DEPLOY avec le hash.
- Fiche `project_crete_direct.md` : bloc MAJ 11/07 ou 12/07 « instrumentation flux ».
- Vérif J+1 (après deploy 20h) : events `bus_boarding_proxy` visibles sur analytics.crete.direct.

---

## Self-review

- Spec coverage : composants 1-4 de la spec = Tasks 1-6 ; critères de succès couverts (check Task 7, events J+1, log lundi). ✅
- Placeholders : aucun. Tous les blocs de code sont complets. ✅
- Cohérence types : `emitBoardingProxy(surface, key, props)` identique Tasks 2/3/4 ; `nearStopLabel(km: number | null)` cohérent avec `passiveNearestStopKm(): Promise<number | null>`. ✅
