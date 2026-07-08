# Car Rental Admin Monitoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer `/admin/car-rental` en cockpit qui montre, par demande, TOUS les loueurs invités (chiffrés / désistés / silencieux), l'état des relances deux côtés, l'expiry, une timeline, plus un bandeau KPI et une perf loueur enrichie.

**Architecture:** Un nouveau module pur `src/lib/car-monitoring.ts` (zéro I/O, testé par `scripts/check-car-monitoring.mjs`) porte toute la logique de calcul ; il importe et réutilise `car-quotes.ts` (`partnerNeedsRelance`, `clientNeedsRelance`, `sortQuotesByPrice`, `canPartnerQuote`, `findChosenInvite`) et `car-offer-expiry.ts` (`offerExpiresAt`) sans les modifier. La page `page.tsx` étend sa requête invites (colonnes manquantes) et groupe en une seule Map ; les composants `requests-table.tsx` / `partners-table.tsx` sont server-first (forms natifs, liens query-string, zéro client JS). Livraison en deux vagues : **P1** (Tâches 1-9, roster + relances + filtres, déployable seule), **P2** (Tâches 10-14, KPI + perf loueur).

**Tech Stack:** Next.js App Router (server components), TypeScript, Tailwind v4, Supabase (service_role), tests par script Node `--experimental-strip-types` (pattern maison, pas de framework).

---

## Contexte codebase (à lire avant de commencer)

- Base : branche `feat/car-admin-monitoring` (worktree `cretepulse-car-monitoring`), partie de `origin/master`=`cb9ef1b`.
- Style des checks : voir `scripts/check-car-quotes.mjs` — `import {...} from "../src/lib/X.ts"; let fail=0; const ok=(n,c)=>{console.log(c?...:...); if(!c) fail++}; ...; process.exit(fail?1:0)`.
- Fonctions pures réutilisables (NE PAS réécrire) :
  - `src/lib/car-quotes.ts` : `sortQuotesByPrice`, `canPartnerQuote`, `findChosenInvite`, `partnerNeedsRelance(invite:{status,relanced_at}, requestStatus, nowMs, createdAtMs)`, `clientNeedsRelance(req:{status,client_relanced_at,client_relance_count}, nowMs)`.
  - `src/lib/car-offer-expiry.ts` : `offerExpiresAt(quotedAt, dateFrom)`, `isOfferExpired(quotedAt, dateFrom, now)`.
- Git author obligatoire sur CHAQUE commit : `git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit ...`.
- Jamais de commit direct master/main. Déploiement = push `feat/car-admin-monitoring:master` puis `:main`, après `npx tsc --noEmit -p tsconfig.json` vert + checks verts.

---

## P1 — Visibilité invite + relances (déployable seule)

### Task 1: Module `car-monitoring.ts` — types + `classifyInvites`

**Files:**
- Create: `src/lib/car-monitoring.ts`
- Create: `scripts/check-car-monitoring.mjs`
- Modify: `package.json` (script `check:car-monitoring` + ajout dans `check`)

- [ ] **Step 1: Écrire le check qui échoue**

Create `scripts/check-car-monitoring.mjs` :

```js
// node --experimental-strip-types scripts/check-car-monitoring.mjs
import { classifyInvites } from "../src/lib/car-monitoring.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

// Fabrique d'invite : id, price, status, options temporelles.
const inv = (id, price, status = "quoted", o = {}) => ({
  id, request_id: 1, partner_id: id, partner_name: `P${id}`, status,
  quote_price: price, quote_currency: price == null ? null : "EUR",
  quote_car_model: null,
  created_at: o.created_at ?? "2026-07-08T08:00:00Z",
  quoted_at: o.quoted_at ?? (price == null ? null : "2026-07-08T10:00:00Z"),
  declined_at: o.declined_at ?? (status === "declined" ? "2026-07-08T09:00:00Z" : null),
  relanced_at: o.relanced_at ?? null,
});

// classifyInvites : 3 seaux, chiffrés triés prix↑ (choisi en tête), puis silencieux, puis désistés.
{
  const c = classifyInvites([
    inv(1, 300), inv(2, 200), inv(3, null, "invited"),
    inv(4, 250, "chosen"), inv(5, null, "declined"),
  ]);
  ok("chiffrés = 3 (200/250chosen/300)", c.quoted.length === 3);
  ok("choisi en tête", c.quoted[0].id === 4);
  ok("puis prix croissant", c.quoted[1].id === 2 && c.quoted[2].id === 1);
  ok("silencieux = invite 3", c.silent.length === 1 && c.silent[0].id === 3);
  ok("désisté = invite 5", c.declined.length === 1 && c.declined[0].id === 5);
}

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Ajouter le script npm**

Modify `package.json` : après la ligne `"check:car-quotes": ...`, ajouter :

```json
    "check:car-monitoring": "node --experimental-strip-types scripts/check-car-monitoring.mjs",
```

Et dans le script agrégé `"check"`, insérer `&& npm run check:car-monitoring` après `check:car-admin`.

- [ ] **Step 3: Lancer le check, vérifier l'échec**

Run: `npm run check:car-monitoring`
Expected: FAIL (module `car-monitoring.ts` introuvable / `classifyInvites` undefined).

- [ ] **Step 4: Implémenter les types + `classifyInvites`**

Create `src/lib/car-monitoring.ts` :

```ts
// Logique PURE du cockpit de monitoring /admin/car-rental (pattern car-admin.ts /
// car-quotes.ts) : classification des invites, état des relances, timeline, KPI,
// perf loueur. Zéro I/O. Node-safe : importable par scripts/check-car-monitoring.mjs.
// Réutilise car-quotes.ts et car-offer-expiry.ts (jamais réécrits).
import { partnerNeedsRelance, clientNeedsRelance } from "./car-quotes.ts";

const HOUR = 3600000;

/** Invite enrichie lue par la page (toutes les colonnes du monitoring). */
export interface MonitorInvite {
  id: number;
  request_id: number;
  partner_id: number;
  partner_name: string;
  status: string; // invited | quoted | declined | chosen | not_chosen
  quote_price: number | null;
  quote_currency: string | null;
  quote_car_model: string | null;
  created_at: string;      // invitation envoyée
  quoted_at: string | null;
  declined_at: string | null;
  relanced_at: string | null;
}

const isPriced = (i: MonitorInvite): boolean =>
  i.quote_price != null && (i.status === "quoted" || i.status === "chosen" || i.status === "not_chosen");

/** Classe les invites d'UNE demande : chiffrés (choisi en tête puis prix↑), silencieux, désistés. */
export function classifyInvites(invites: MonitorInvite[]): {
  quoted: MonitorInvite[]; silent: MonitorInvite[]; declined: MonitorInvite[];
} {
  const quoted = invites.filter(isPriced).sort((a, b) => {
    if ((a.status === "chosen") !== (b.status === "chosen")) return a.status === "chosen" ? -1 : 1;
    return (a.quote_price! - b.quote_price!);
  });
  const silent = invites.filter((i) => i.status === "invited");
  const declined = invites.filter((i) => i.status === "declined");
  return { quoted, silent, declined };
}
```

- [ ] **Step 5: Lancer le check, vérifier le succès**

Run: `npm run check:car-monitoring`
Expected: PASS (`All passed`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/car-monitoring.ts scripts/check-car-monitoring.mjs package.json
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-monitoring): module pur + classifyInvites (chiffrés/silencieux/désistés)"
```

---

### Task 2: `partnerRelanceState` + `partnerRelanceRollup`

**Files:**
- Modify: `src/lib/car-monitoring.ts`
- Modify: `scripts/check-car-monitoring.mjs`

- [ ] **Step 1: Ajouter les tests qui échouent**

Dans `scripts/check-car-monitoring.mjs` : ajouter l'import `partnerRelanceState, partnerRelanceRollup` et, avant le bloc final `console.log` :

```js
const H = 3600000;
const T = (ms) => new Date(ms).toISOString();
const NOW = Date.parse("2026-07-09T10:00:00Z");

// partnerRelanceState (demande ouverte 'sent')
{
  const created = NOW - 30 * H; // >24h
  ok("relance loueur due (>24h, jamais relancé)",
    partnerRelanceState(inv(1, null, "invited", { created_at: T(created) }), "sent", created, NOW).kind === "due");
  ok("relance loueur déjà faite",
    partnerRelanceState(inv(1, null, "invited", { created_at: T(created), relanced_at: T(NOW - 2 * H) }), "sent", created, NOW).kind === "relanced");
  const dueIn = partnerRelanceState(inv(1, null, "invited", { created_at: T(NOW - 5 * H) }), "sent", NOW - 5 * H, NOW);
  ok("relance loueur due dans Xh (<24h)", dueIn.kind === "dueInMs" && dueIn.ms > 18 * H && dueIn.ms < 20 * H);
  ok("pas de relance si demande fermée",
    partnerRelanceState(inv(1, null, "invited", { created_at: T(created) }), "accepted", created, NOW).kind === "never");
}

// partnerRelanceRollup
{
  const roll = partnerRelanceRollup([
    inv(1, 200), inv(2, null, "invited"), inv(3, null, "invited", { relanced_at: T(NOW) }), inv(4, null, "declined"),
  ]);
  ok("rollup invited=2", roll.invited === 2);
  ok("rollup relanced=1", roll.relanced === 1);
  ok("rollup silent=1 (invited non relancé)", roll.silent === 1);
}
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm run check:car-monitoring`
Expected: FAIL (`partnerRelanceState`/`partnerRelanceRollup` undefined).

- [ ] **Step 3: Implémenter**

Dans `src/lib/car-monitoring.ts`, ajouter :

```ts
export type PartnerRelanceState =
  | { kind: "relanced"; at: string }
  | { kind: "due" }
  | { kind: "dueInMs"; ms: number }
  | { kind: "never" };

/** État de relance loueur d'UNE invite (silencieuse). Réutilise partnerNeedsRelance. */
export function partnerRelanceState(
  inv: MonitorInvite, requestStatus: string, createdAtMs: number, nowMs: number,
): PartnerRelanceState {
  if (inv.relanced_at) return { kind: "relanced", at: inv.relanced_at };
  if (inv.status !== "invited") return { kind: "never" };
  if (partnerNeedsRelance({ status: inv.status, relanced_at: inv.relanced_at }, requestStatus, nowMs, createdAtMs)) {
    return { kind: "due" };
  }
  // Encore invité sur demande ouverte mais <24h : décompte avant éligibilité.
  const dueAt = createdAtMs + 24 * HOUR;
  if (dueAt > nowMs && (requestStatus === "sent" || requestStatus === "quoted")) {
    return { kind: "dueInMs", ms: dueAt - nowMs };
  }
  return { kind: "never" };
}

/** Rollup relances loueur d'une demande : invités (status 'invited'), relancés, silencieux. */
export function partnerRelanceRollup(invites: MonitorInvite[]): {
  invited: number; relanced: number; silent: number;
} {
  const invitedStatus = invites.filter((i) => i.status === "invited");
  return {
    invited: invitedStatus.length,
    relanced: invites.filter((i) => i.relanced_at != null).length,
    silent: invitedStatus.filter((i) => !i.relanced_at).length,
  };
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npm run check:car-monitoring`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-monitoring.ts scripts/check-car-monitoring.mjs
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-monitoring): partnerRelanceState + partnerRelanceRollup"
```

---

### Task 3: `clientRelanceState`

**Files:**
- Modify: `src/lib/car-monitoring.ts`
- Modify: `scripts/check-car-monitoring.mjs`

- [ ] **Step 1: Ajouter les tests qui échouent**

Ajouter l'import `clientRelanceState` et, avant le `console.log` final :

```js
{
  ok("client relance na si pas 'quoted'",
    clientRelanceState({ status: "sent", client_relanced_at: null, client_relance_count: 0 }, NOW).kind === "na");
  ok("client relance eligible (jamais relancé)",
    clientRelanceState({ status: "quoted", client_relanced_at: null, client_relance_count: 0 }, NOW).kind === "eligible");
  ok("client relance exhausted (count>=2)",
    clientRelanceState({ status: "quoted", client_relanced_at: null, client_relance_count: 2 }, NOW).kind === "exhausted");
  const w = clientRelanceState({ status: "quoted", client_relanced_at: T(NOW - 5 * H), client_relance_count: 1 }, NOW);
  ok("client relance waiting (<24h depuis dernière)", w.kind === "waiting" && w.nextEligibleMs > NOW);
}
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm run check:car-monitoring`
Expected: FAIL (`clientRelanceState` undefined).

- [ ] **Step 3: Implémenter**

```ts
export type ClientRelanceState =
  | { kind: "eligible" }
  | { kind: "waiting"; nextEligibleMs: number }
  | { kind: "exhausted" }
  | { kind: "na" };

/** État de relance client d'UNE demande. Réutilise clientNeedsRelance. */
export function clientRelanceState(
  req: { status: string; client_relanced_at: string | null; client_relance_count: number },
  nowMs: number,
): ClientRelanceState {
  if (req.status !== "quoted") return { kind: "na" };
  if (req.client_relance_count >= 2) return { kind: "exhausted" };
  if (clientNeedsRelance(req, nowMs)) return { kind: "eligible" };
  // reste : a été relancé <24h → attente
  const last = req.client_relanced_at ? new Date(req.client_relanced_at).getTime() : nowMs;
  return { kind: "waiting", nextEligibleMs: last + 24 * HOUR };
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npm run check:car-monitoring`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-monitoring.ts scripts/check-car-monitoring.mjs
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-monitoring): clientRelanceState (na/eligible/waiting/exhausted)"
```

---

### Task 4: Filtres dérivés `isSilentRequest` + `isAwaitingChoice`

**Files:**
- Modify: `src/lib/car-monitoring.ts`
- Modify: `scripts/check-car-monitoring.mjs`

- [ ] **Step 1: Ajouter les tests qui échouent**

Ajouter l'import `isSilentRequest, isAwaitingChoice` et :

```js
{
  const old = { status: "sent", created_at: T(NOW - 30 * H) };
  const fresh = { status: "sent", created_at: T(NOW - 2 * H) };
  ok("silencieux : sent >24h sans devis", isSilentRequest(old, [inv(1, null, "invited")], NOW) === true);
  ok("pas silencieux si <24h", isSilentRequest(fresh, [inv(1, null, "invited")], NOW) === false);
  ok("pas silencieux si ≥1 devis", isSilentRequest(old, [inv(1, 200)], NOW) === false);

  ok("en attente de choix : quoted + ≥1 devis", isAwaitingChoice({ status: "quoted" }, [inv(1, 200)]) === true);
  ok("pas en attente si accepted", isAwaitingChoice({ status: "accepted" }, [inv(1, 200, "chosen")]) === false);
  ok("pas en attente si quoted sans invite chiffrée", isAwaitingChoice({ status: "quoted" }, [inv(1, null, "invited")]) === false);
}
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm run check:car-monitoring`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

```ts
const hasPricedInvite = (invites: MonitorInvite[]): boolean => invites.some(isPriced);

/** Demande silencieuse : ouverte (sent), aucun devis chiffré, créée il y a >24h. */
export function isSilentRequest(
  req: { status: string; created_at: string }, invites: MonitorInvite[], nowMs: number,
): boolean {
  if (req.status !== "sent") return false;
  if (hasPricedInvite(invites)) return false;
  return nowMs - new Date(req.created_at).getTime() > 24 * HOUR;
}

/** Demande en attente de choix : 'quoted' avec ≥1 invite chiffrée, non tranchée. */
export function isAwaitingChoice(req: { status: string }, invites: MonitorInvite[]): boolean {
  return req.status === "quoted" && hasPricedInvite(invites);
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npm run check:car-monitoring`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-monitoring.ts scripts/check-car-monitoring.mjs
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-monitoring): isSilentRequest + isAwaitingChoice"
```

---

### Task 5: `buildTimeline`

**Files:**
- Modify: `src/lib/car-monitoring.ts`
- Modify: `scripts/check-car-monitoring.mjs`

- [ ] **Step 1: Ajouter les tests qui échouent**

Ajouter l'import `buildTimeline` et :

```js
{
  const req = {
    created_at: "2026-07-08T08:00:00Z", accepted_at: "2026-07-08T12:00:00Z",
    client_relanced_at: null, outcome: null, outcome_at: null,
  };
  const invites = [
    inv(1, 200, "chosen", { created_at: "2026-07-08T08:05:00Z", quoted_at: "2026-07-08T10:00:00Z" }),
    inv(2, null, "declined", { created_at: "2026-07-08T08:05:00Z", declined_at: "2026-07-08T09:00:00Z" }),
  ];
  const tl = buildTimeline(req, invites);
  ok("timeline triée chrono", tl.every((e, i) => i === 0 || tl[i - 1].at <= e.at));
  ok("timeline contient création", tl[0].at === "2026-07-08T08:00:00Z");
  ok("timeline contient 1er devis", tl.some((e) => e.label.includes("1er devis")));
  ok("timeline contient désistement", tl.some((e) => e.label.toLowerCase().includes("désist")));
  ok("timeline contient choix client", tl.some((e) => e.label.toLowerCase().includes("choisi")));
}
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm run check:car-monitoring`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

```ts
export interface TimelineEvent { at: string; label: string; }

/** Fil chronologique d'une demande : uniquement des événements réels (timestamps non nuls). */
export function buildTimeline(
  req: { created_at: string; accepted_at: string | null; client_relanced_at: string | null;
         outcome?: string | null; outcome_at?: string | null },
  invites: MonitorInvite[],
): TimelineEvent[] {
  const ev: TimelineEvent[] = [{ at: req.created_at, label: "Demande créée" }];

  if (invites.length > 0) {
    const firstInvite = invites.reduce((m, i) => (i.created_at < m ? i.created_at : m), invites[0].created_at);
    ev.push({ at: firstInvite, label: `${invites.length} loueur(s) invité(s)` });
  }

  const priced = invites.filter((i) => i.quoted_at != null);
  if (priced.length > 0) {
    const first = priced.reduce((m, i) => (i.quoted_at! < m.quoted_at! ? i : m));
    ev.push({ at: first.quoted_at!, label: `1er devis reçu (${first.partner_name})` });
  }

  for (const i of invites) {
    if (i.relanced_at) ev.push({ at: i.relanced_at, label: `Relance loueur (${i.partner_name})` });
    if (i.declined_at) ev.push({ at: i.declined_at, label: `Désistement (${i.partner_name})` });
  }

  if (req.client_relanced_at) ev.push({ at: req.client_relanced_at, label: "Relance client" });
  if (req.accepted_at) {
    const chosen = invites.find((i) => i.status === "chosen" && i.quote_price != null) ?? null;
    ev.push({ at: req.accepted_at, label: `Client a choisi${chosen ? ` (${chosen.partner_name})` : ""}` });
  }
  if (req.outcome && req.outcome_at) ev.push({ at: req.outcome_at, label: `Issue : ${req.outcome}` });

  return ev.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npm run check:car-monitoring`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-monitoring.ts scripts/check-car-monitoring.mjs
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-monitoring): buildTimeline (événements réels triés chrono)"
```

---

### Task 6: Étendre la requête invites dans `page.tsx` → Map `MonitorInvite[]`

**Files:**
- Modify: `src/app/admin/car-rental/page.tsx`

- [ ] **Step 1: Étendre la requête `invitesFull` et construire la Map enrichie**

Dans `page.tsx`, remplacer la déclaration de `invitesFull` (type + query) et le groupage `quotesByRequest`.

Remplacer la ligne de type (actuellement) :
```ts
  let invitesFull: { request_id: number; partner_id: number; status: string; quote_price: number | null; car_partners?: { name?: string } }[] = [];
```
par :
```ts
  let invitesFull: {
    id: number; request_id: number; partner_id: number; status: string;
    quote_price: number | null; quote_currency: string | null; quote_car_model: string | null;
    created_at: string; quoted_at: string | null; declined_at: string | null; relanced_at: string | null;
    car_partners?: { name?: string };
  }[] = [];
```

Remplacer la 4ᵉ requête du `Promise.all` (actuellement `.select("request_id, partner_id, status, quote_price, car_partners(name)")`) par :
```ts
      supabase.from("car_quote_invites").select(
        "id, request_id, partner_id, status, quote_price, quote_currency, quote_car_model, created_at, quoted_at, declined_at, relanced_at, car_partners(name)"
      ),
```

- [ ] **Step 2: Construire `monitorByRequest: Map<number, MonitorInvite[]>`**

Remplacer le bloc `quotesByRequest` (lignes ~65-75) par la construction d'une Map de `MonitorInvite` (le composant dérive tout le reste) :

```ts
  const monitorByRequest = new Map<number, MonitorInvite[]>();
  for (const r of invitesFull) {
    const list = monitorByRequest.get(r.request_id) ?? [];
    list.push({
      id: r.id, request_id: r.request_id, partner_id: r.partner_id,
      partner_name: r.car_partners?.name ?? "Agency",
      status: r.status, quote_price: r.quote_price, quote_currency: r.quote_currency,
      quote_car_model: r.quote_car_model, created_at: r.created_at,
      quoted_at: r.quoted_at, declined_at: r.declined_at, relanced_at: r.relanced_at,
    });
    monitorByRequest.set(r.request_id, list);
  }
```

Ajouter l'import en tête :
```ts
import type { MonitorInvite } from "@/lib/car-monitoring";
```

Retirer aussi `type AdminQuote` de l'import `@/lib/car-admin` (devenu inutilisé après le remplacement de `quotesByRequest`).

- [ ] **Step 3: Passer la Map au composant (remplacer `quotesByRequest` par `monitorByRequest`)**

Dans le JSX `<RequestsTable ... />`, remplacer la prop `quotesByRequest={quotesByRequest}` par `monitorByRequest={monitorByRequest}`. (Le type de prop côté composant est mis à jour en Task 7.)

- [ ] **Step 4: Vérifier le typage**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: erreurs UNIQUEMENT dans `requests-table.tsx` (prop renommée, corrigée en Task 7). `page.tsx` doit compiler ses propres lignes. Si erreur dans `page.tsx`, corriger avant de continuer.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/car-rental/page.tsx
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-admin): requête invites enrichie (quoted_at/declined_at/relanced_at) + Map MonitorInvite"
```

---

### Task 7: `requests-table.tsx` — roster complet + relances + expiry + timeline

**Files:**
- Modify: `src/app/admin/car-rental/requests-table.tsx`

- [ ] **Step 1: Mettre à jour l'import et la signature de props**

En tête, remplacer l'import `type { ... AdminQuote }` par l'ajout des helpers monitoring, et importer l'expiry :
```ts
import {
  requestCommission, buildCarWaMessage, waHref,
  type AdminPartner, type AdminRequest,
} from "@/lib/car-admin";
import {
  classifyInvites, partnerRelanceState, clientRelanceState, partnerRelanceRollup, buildTimeline,
  type MonitorInvite,
} from "@/lib/car-monitoring";
import { offerExpiresAt } from "@/lib/car-offer-expiry";
```

Dans la signature de `RequestsTable`, remplacer `quotesByRequest: Map<number, AdminQuote[]>` par `monitorByRequest: Map<number, MonitorInvite[]>` (props + destructuration).

- [ ] **Step 2: Remplacer `QuotesList` par un roster complet**

Supprimer l'ancien composant `QuotesList` et le remplacer par ces helpers + composant. `now` est calculé une fois dans `RequestsTable` et passé en prop.

```tsx
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Athens" });
}
function hoursLabel(ms: number): string {
  const h = Math.round(ms / 3600000);
  return h >= 1 ? `${h}h` : `${Math.max(1, Math.round(ms / 60000))}min`;
}

function InviteRoster({ invites, requestStatus, createdAtMs, now }: {
  invites: MonitorInvite[]; requestStatus: string; createdAtMs: number; now: number;
}) {
  const { quoted, silent, declined } = classifyInvites(invites);
  if (invites.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
      {quoted.map((q) => (
        <li key={q.id} className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 text-sm ${q.status === "chosen" ? "border-ok bg-ok/10 font-bold" : "border-border bg-white text-text-muted"}`}>
          <span>{q.partner_name}</span>
          <span className="font-data">{q.quote_price} {q.quote_currency ?? "€"}</span>
          {q.quote_car_model ? <span className="text-text-light">· {q.quote_car_model}</span> : null}
          {q.quoted_at ? <span className="text-text-light">· {fmtDate(q.quoted_at)}</span> : null}
          {q.status === "chosen" && <span className="rounded-full bg-ok px-2 py-0.5 text-xs font-bold text-white">choisi par le client</span>}
        </li>
      ))}
      {silent.map((s) => {
        const st = partnerRelanceState(s, requestStatus, createdAtMs, now);
        const badge =
          st.kind === "relanced" ? `relancé le ${fmtDate(st.at)}` :
          st.kind === "due" ? "relance due" :
          st.kind === "dueInMs" ? `relance dans ${hoursLabel(st.ms)}` : "jamais relancé";
        return (
          <li key={s.id} className="flex items-center gap-1.5 rounded-xl border border-dashed border-border bg-sand/40 px-3 py-1 text-sm text-text-muted">
            <span>{s.partner_name}</span>
            <span className="italic text-text-light">silencieux</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${st.kind === "due" ? "bg-sun text-night font-bold" : "bg-border text-text-muted"}`}>{badge}</span>
          </li>
        );
      })}
      {declined.map((d) => (
        <li key={d.id} className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1 text-sm text-text-muted">
          <span>{d.partner_name}</span>
          <span className="rounded-full bg-border px-2 py-0.5 text-xs">ne peut pas{d.declined_at ? ` · ${fmtDate(d.declined_at)}` : ""}</span>
        </li>
      ))}
    </ul>
  );
}
```

> Note Tailwind : `bg-sand` existe dans la palette du repo ; si `tsc`/build signale une classe absente, remplacer par `bg-white` (ne pas inventer de couleur).

- [ ] **Step 3: Calculer `now` et injecter roster + relances + expiry + timeline dans la carte**

Au début du corps de `RequestsTable`, ajouter :
```tsx
  const now = Date.now();
```

Dans le `map` des `pageRows`, après avoir récupéré `const winner = ...`, ajouter :
```tsx
            const invites = monitorByRequest.get(r.id) ?? [];
            const createdAtMs = new Date(r.created_at).getTime();
            const roll = partnerRelanceRollup(invites);
            const cRel = clientRelanceState(
              { status: r.status, client_relanced_at: r.client_relanced_at ?? null, client_relance_count: r.client_relance_count ?? 0 },
              now,
            );
            const expMs = offerExpiresAt(r.quoted_at, r.date_from);
            const startPassed = new Date(r.date_from + "T00:00:00").getTime() < now;
```

Remplacer le bloc `{quotesByRequest.has(r.id) && (<QuotesList .../>)}` par :
```tsx
              <InviteRoster invites={invites} requestStatus={r.status} createdAtMs={createdAtMs} now={now} />

              {/* Relances + expiry (une ligne compacte). */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                <span>Loueurs : {roll.invited} invité(s) · {roll.relanced} relancé(s) · {roll.silent} silencieux</span>
                <span>
                  Client :{" "}
                  {cRel.kind === "eligible" ? "relance éligible" :
                   cRel.kind === "waiting" ? `prochaine relance dans ${hoursLabel(cRel.nextEligibleMs - now)}` :
                   cRel.kind === "exhausted" ? "relances épuisées (2/2)" : "—"}
                  {" "}({r.client_relance_count ?? 0}/2)
                </span>
                {expMs != null && !startPassed ? (
                  <span className={now > expMs ? "font-bold text-terracotta" : ""}>
                    {now > expMs ? "offre expirée" : `expire dans ${hoursLabel(expMs - now)}`}
                  </span>
                ) : null}
                {startPassed ? <span className="text-text-light">location commencée</span> : null}
              </div>

              {/* Timeline repliée. */}
              {invites.length > 0 ? (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-text-muted underline">timeline</summary>
                  <ol className="mt-1 space-y-0.5 border-l border-border pl-3">
                    {buildTimeline(
                      { created_at: r.created_at, accepted_at: r.accepted_at, client_relanced_at: r.client_relanced_at ?? null, outcome: r.outcome, outcome_at: r.outcome_at },
                      invites,
                    ).map((e, i) => (
                      <li key={i}><span className="font-data text-text-light">{fmtDate(e.at)}</span> · {e.label}</li>
                    ))}
                  </ol>
                </details>
              ) : null}
```

- [ ] **Step 4: Ajouter les champs manquants au type `AdminRequest`**

Dans `src/lib/car-admin.ts`, l'interface `AdminRequest` doit exposer `client_relanced_at` et `client_relance_count` (colonnes Phase 2, lues par le cockpit). Ajouter à la fin des colonnes optionnelles :
```ts
  client_relanced_at?: string | null;
  client_relance_count?: number;
```
(Modification additive, `car-admin.ts` reste sinon inchangé — les fonctions existantes ne les utilisent pas.)

- [ ] **Step 5: Vérifier le typage + le check pur**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS (0 erreur).
Run: `npm run check:car-monitoring && npm run check:car-admin`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/car-rental/requests-table.tsx src/lib/car-admin.ts
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-admin): roster invites complet (silencieux visibles) + relances + expiry + timeline"
```

---

### Task 8: Filtres `declined_by_client` + silencieux + en-attente-de-choix

**Files:**
- Modify: `src/app/admin/car-rental/requests-table.tsx`

- [ ] **Step 1: Étendre la logique de filtrage**

Dans `RequestsTable`, le filtrage actuel gère `status`, `rented/lost`, `partner`. Ajouter les 3 pseudo-filtres. Remplacer le bloc `if (statusFilter) { ... }` par :

```tsx
  if (statusFilter) {
    if (statusFilter === "rented" || statusFilter === "lost") {
      rows = rows.filter((r) => r.outcome === statusFilter);
    } else if (statusFilter === "silent") {
      rows = rows.filter((r) => isSilentRequest({ status: r.status, created_at: r.created_at }, monitorByRequest.get(r.id) ?? [], now));
    } else if (statusFilter === "awaiting") {
      rows = rows.filter((r) => isAwaitingChoice({ status: r.status }, monitorByRequest.get(r.id) ?? []));
    } else {
      rows = rows.filter((r) => r.status === statusFilter);
    }
  }
```

Ajouter `isSilentRequest, isAwaitingChoice` à l'import depuis `@/lib/car-monitoring`.

> Attention : `now` doit être défini AVANT ce bloc de filtrage. Déplacer `const now = Date.now();` en toute première ligne du corps de `RequestsTable` (avant `let rows = requests;`).

- [ ] **Step 2: Ajouter les pastilles de filtre**

Remplacer le tableau de filtres statut (`["", "sent", "quoted", "accepted", "email_failed", "rented", "lost"]`) par :
```tsx
        {["", "sent", "quoted", "silent", "awaiting", "accepted", "declined_by_client", "email_failed", "rented", "lost"].map((f) => {
          const label = f === "" ? "tous" : f === "silent" ? "silencieux" : f === "awaiting" ? "attente choix" : f === "declined_by_client" ? "décliné client" : f;
          return (
            <a key={f || "all"} href={qs({ status: f, page: "" })}
               className={`rounded-full border px-3 py-1 no-underline ${statusFilter === f ? "border-sea bg-sea text-white" : "border-border bg-white text-text"}`}>
              {label}
            </a>
          );
        })}
```

- [ ] **Step 3: Vérifier le typage**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/car-rental/requests-table.tsx
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-admin): filtres silencieux + attente-choix + décliné-client"
```

---

### Task 9: e2e ciblé P1 + déploiement

**Files:** aucun (données de test + déploiement).

- [ ] **Step 1: `tsc` + tous les checks purs verts**

Run: `npx tsc --noEmit -p tsconfig.json && npm run check:car-monitoring && npm run check:car-admin && npm run check:car-quotes`
Expected: tout PASS.

- [ ] **Step 2: e2e — injecter des demandes de test couvrant tous les états**

Écrire un script jetable `scripts/_e2e-cockpit-seed.mjs` (NON commité) qui, via `supabaseAdmin`, insère :
- 1 demande `sent` créée il y a 30h avec 2 invites `invited` (une `relanced_at` set, une non) → doit apparaître en **silencieux** + badges relance.
- 1 demande `quoted` avec 2 invites chiffrées (200/230) + 1 `declined` → **attente choix**, roster trié.
- 1 demande `accepted` avec invite `chosen`/`not_chosen` → choisi surligné + timeline complète.
- 1 demande `declined_by_client`.
Marqueur obligatoire : `customer_email` finissant par `+cartest@…` ; loueurs test `active=false`.
Vérifier le rendu sur la preview Vercel de la branche (ou `npm run dev` local) : roster, silencieux visibles, badges relance, expiry, timeline, les 3 nouveaux filtres.

- [ ] **Step 3: Nettoyer les données de test**

Écrire/lancer la suppression (DELETE sur `car_requests`/`car_quote_invites` où `customer_email LIKE '%+cartest@%'` + loueurs test). Vérifier 0 ligne test restante. Supprimer le script jetable. **JAMAIS de vraie demande live.**

- [ ] **Step 4: Déployer P1 en prod**

```bash
git push origin feat/car-admin-monitoring
git push origin feat/car-admin-monitoring:master
git push origin feat/car-admin-monitoring:main
```
Vérifier le build Vercel vert. Puis contrôle visuel prod `/admin/car-rental` (avec la clé admin).

- [ ] **Step 5: MAJ mémoire P1**

Ajouter une ligne `session_log.md` (catégorie DEPLOY) + MAJ `project_crete_direct.md` (cockpit P1 livré) + re-coudre la ligne d'index `MEMORY.md` correspondante.

---

## P2 — Bandeau KPI + perf loueur enrichie

### Task 10: `kpis()`

**Files:**
- Modify: `src/lib/car-monitoring.ts`
- Modify: `scripts/check-car-monitoring.mjs`

- [ ] **Step 1: Ajouter les tests qui échouent**

Ajouter l'import `kpis` et un bloc utilisant une fabrique de demande `req(...)`. Cas minimal :

```js
{
  const mkReq = (id, status, o = {}) => ({
    id, status, created_at: o.created_at ?? T(NOW - 48 * H), accepted_at: o.accepted_at ?? null,
    client_relanced_at: o.client_relanced_at ?? null, client_relance_count: o.client_relance_count ?? 0,
  });
  const reqs = [mkReq(1, "quoted"), mkReq(2, "accepted", { accepted_at: T(NOW - 10 * H) }), mkReq(3, "sent")];
  const byReq = new Map([
    [1, [inv(1, 200), inv(2, null, "invited")]],
    [2, [inv(3, 180, "chosen", { quoted_at: T(NOW - 40 * H) })]],
    [3, [inv(4, null, "invited")]],
  ]);
  const k = kpis(reqs, byReq, NOW);
  ok("count = 3", k.count === 3);
  ok("quoteRate = 2/3", Math.abs(k.quoteRate - 2 / 3) < 1e-9);
  ok("choiceRate = 1/2 (accepted / quoted-avec-devis)", Math.abs(k.choiceRate - 0.5) < 1e-9);
  ok("silentInviteRate = 2/4", Math.abs(k.silentInviteRate - 0.5) < 1e-9);
  ok("dénominateur 0 → null (clientDeclineRate a des devis, partnerDecline 0/4=0)", k.partnerDeclineRate === 0);
}
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm run check:car-monitoring`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

```ts
export interface CockpitKpis {
  count: number;
  quoteRate: number | null;
  avgQuotesPerRequest: number | null;
  medianFirstQuoteHours: number | null;
  choiceRate: number | null;
  partnerDeclineRate: number | null;
  clientDeclineRate: number | null;
  partnerRelanceEfficacy: number | null;
  clientRelanceEfficacy: number | null;
  silentInviteRate: number | null;
}

const ratio = (num: number, den: number): number | null => (den === 0 ? null : num / den);

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** KPI agrégés sur les demandes fournies (le caller filtre par fenêtre created_at). */
export function kpis(
  reqs: { id: number; status: string; created_at: string; accepted_at: string | null;
          client_relanced_at: string | null; client_relance_count: number }[],
  invitesByRequest: Map<number, MonitorInvite[]>,
  _nowMs: number,
): CockpitKpis {
  let withQuote = 0, totalQuotes = 0, totalInvites = 0, declinedInvites = 0, silentInvites = 0;
  let quotedWithDevis = 0, accepted = 0;
  let declinedByClient = 0;
  let relancedInvites = 0, relancedThenQuoted = 0;
  let clientRelanced = 0, clientRelancedThenAccepted = 0;
  const firstQuoteHours: number[] = [];

  for (const r of reqs) {
    const invites = invitesByRequest.get(r.id) ?? [];
    totalInvites += invites.length;
    const priced = invites.filter((i) => i.quote_price != null && i.quoted_at != null);
    if (priced.length > 0) {
      withQuote++;
      totalQuotes += priced.length;
      const firstAt = priced.reduce((m, i) => (i.quoted_at! < m ? i.quoted_at! : m), priced[0].quoted_at!);
      firstQuoteHours.push((new Date(firstAt).getTime() - new Date(r.created_at).getTime()) / 3600000);
      quotedWithDevis++;
      if (r.status === "accepted") accepted++;
      if (r.status === "declined_by_client") declinedByClient++;
    }
    for (const i of invites) {
      if (i.status === "declined") declinedInvites++;
      if (i.status === "invited" && i.quoted_at == null && i.declined_at == null) silentInvites++;
      if (i.relanced_at != null) {
        relancedInvites++;
        if (i.quoted_at != null && i.quoted_at > i.relanced_at) relancedThenQuoted++;
      }
    }
    if (r.client_relance_count > 0) {
      clientRelanced++;
      if (r.accepted_at != null && r.client_relanced_at != null && r.accepted_at > r.client_relanced_at) {
        clientRelancedThenAccepted++;
      }
    }
  }

  return {
    count: reqs.length,
    quoteRate: ratio(withQuote, reqs.length),
    avgQuotesPerRequest: ratio(totalQuotes, withQuote),
    medianFirstQuoteHours: median(firstQuoteHours),
    choiceRate: ratio(accepted, quotedWithDevis),
    partnerDeclineRate: ratio(declinedInvites, totalInvites),
    clientDeclineRate: ratio(declinedByClient, quotedWithDevis),
    partnerRelanceEfficacy: ratio(relancedThenQuoted, relancedInvites),
    clientRelanceEfficacy: ratio(clientRelancedThenAccepted, clientRelanced),
    silentInviteRate: ratio(silentInvites, totalInvites),
  };
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npm run check:car-monitoring`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-monitoring.ts scripts/check-car-monitoring.mjs
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-monitoring): kpis() (9 KPI, dénominateur 0 → null)"
```

---

### Task 11: `partnerPerf()`

**Files:**
- Modify: `src/lib/car-monitoring.ts`
- Modify: `scripts/check-car-monitoring.mjs`

- [ ] **Step 1: Ajouter les tests qui échouent**

Ajouter l'import `partnerPerf` et :

```js
{
  const byPartner = new Map([[7, [
    inv(1, 200, "chosen", { created_at: T(NOW - 40 * H), quoted_at: T(NOW - 38 * H) }),
    inv(2, 240, "not_chosen", { created_at: T(NOW - 30 * H), quoted_at: T(NOW - 29 * H) }),
    { ...inv(3, null, "declined"), partner_id: 7 },
    { ...inv(4, null, "invited"), partner_id: 7 },
  ]]]);
  const p = partnerPerf(7, byPartner);
  ok("invited = 4", p.invited === 4);
  ok("quoted = 2", p.quoted === 2);
  ok("chosen = 1", p.chosen === 1);
  ok("declined = 1", p.declined === 1);
  ok("avg quote = 220", p.avgQuotePriceEur === 220);
  ok("responseRate = 3/4 (quoted+declined)", Math.abs(p.responseRate - 0.75) < 1e-9);
  ok("avgResponseHours ≈ 1.5", p.avgResponseHours != null && Math.abs(p.avgResponseHours - 1.5) < 0.01);
  ok("partenaire inconnu → invited 0, ratios null", partnerPerf(99, byPartner).invited === 0 && partnerPerf(99, byPartner).responseRate === null);
}
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm run check:car-monitoring`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

```ts
export interface PartnerPerf {
  invited: number; quoted: number; chosen: number; declined: number;
  avgQuotePriceEur: number | null; responseRate: number | null; avgResponseHours: number | null;
}

/** Perf loueur enrichie (au-delà de partnerStats.won). invitesByPartner = invites du loueur. */
export function partnerPerf(partnerId: number, invitesByPartner: Map<number, MonitorInvite[]>): PartnerPerf {
  const invites = invitesByPartner.get(partnerId) ?? [];
  const priced = invites.filter((i) => i.quote_price != null);
  const respHours = invites
    .filter((i) => i.quoted_at != null)
    .map((i) => (new Date(i.quoted_at!).getTime() - new Date(i.created_at).getTime()) / 3600000);
  const avg = (xs: number[]): number | null => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    invited: invites.length,
    quoted: priced.length,
    chosen: invites.filter((i) => i.status === "chosen").length,
    declined: invites.filter((i) => i.status === "declined").length,
    avgQuotePriceEur: avg(priced.map((i) => i.quote_price!)),
    responseRate: invites.length === 0 ? null : (priced.length + invites.filter((i) => i.status === "declined").length) / invites.length,
    avgResponseHours: avg(respHours),
  };
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npm run check:car-monitoring`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-monitoring.ts scripts/check-car-monitoring.mjs
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-monitoring): partnerPerf (invited/quoted/chosen/declined/prix/réponse)"
```

---

### Task 12: `kpi-band.tsx` + câblage `page.tsx`

**Files:**
- Create: `src/app/admin/car-rental/kpi-band.tsx`
- Modify: `src/app/admin/car-rental/page.tsx`

- [ ] **Step 1: Créer le composant bandeau**

Create `src/app/admin/car-rental/kpi-band.tsx` :

```tsx
// Bandeau KPI (server component pur) : agrégats 7 j / 30 j. Métrique non calculable
// (dénominateur 0) → affichée "—", jamais un ratio inventé.
import type { CockpitKpis } from "@/lib/car-monitoring";

const pct = (r: number | null): string => (r == null ? "—" : `${Math.round(r * 100)} %`);
const num = (r: number | null, d = 1): string => (r == null ? "—" : r.toFixed(d));

function Cell({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2">
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className="font-data text-sm font-bold">{v}</div>
    </div>
  );
}

function Window({ title, k }: { title: string; k: CockpitKpis }) {
  return (
    <div className="flex-1">
      <div className="mb-1 text-xs font-bold text-text-muted">{title} ({k.count} demandes)</div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <Cell label="taux de devis" v={pct(k.quoteRate)} />
        <Cell label="devis / demande" v={num(k.avgQuotesPerRequest)} />
        <Cell label="délai médian 1er devis" v={k.medianFirstQuoteHours == null ? "—" : `${num(k.medianFirstQuoteHours)}h`} />
        <Cell label="taux de choix" v={pct(k.choiceRate)} />
        <Cell label="désist. loueur" v={pct(k.partnerDeclineRate)} />
        <Cell label="décline client" v={pct(k.clientDeclineRate)} />
        <Cell label="effic. relance loueur" v={pct(k.partnerRelanceEfficacy)} />
        <Cell label="effic. relance client" v={pct(k.clientRelanceEfficacy)} />
        <Cell label="invites silencieuses" v={pct(k.silentInviteRate)} />
      </div>
    </div>
  );
}

export function KpiBand({ k7, k30 }: { k7: CockpitKpis; k30: CockpitKpis }) {
  return (
    <section className="mt-5 flex flex-col gap-4 rounded-xl border border-border bg-sand/30 p-4 sm:flex-row">
      <Window title="7 jours" k={k7} />
      <Window title="30 jours" k={k30} />
    </section>
  );
}
```

- [ ] **Step 2: Câbler dans `page.tsx`**

Ajouter les imports :
```ts
import { kpis } from "@/lib/car-monitoring";
import { KpiBand } from "./kpi-band";
```

Après la construction de `monitorByRequest` et avant le `return`, calculer les fenêtres :
```ts
  const nowMs = Date.now();
  const windowReqs = (days: number) => {
    const from = nowMs - days * 86400000;
    return requests.filter((r) => new Date(r.created_at).getTime() >= from);
  };
  const kpiReq = (r: AdminRequest) => ({
    id: r.id, status: r.status, created_at: r.created_at, accepted_at: r.accepted_at,
    client_relanced_at: r.client_relanced_at ?? null, client_relance_count: r.client_relance_count ?? 0,
  });
  const k7 = kpis(windowReqs(7).map(kpiReq), monitorByRequest, nowMs);
  const k30 = kpis(windowReqs(30).map(kpiReq), monitorByRequest, nowMs);
```

Dans le JSX, insérer `<KpiBand k7={k7} k30={k30} />` juste après la `</section>` du bandeau commission (avant la `<nav>` des onglets), uniquement sur l'onglet requests :
```tsx
      {tab === "requests" ? <KpiBand k7={k7} k30={k30} /> : null}
```

- [ ] **Step 3: Vérifier le typage**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/car-rental/kpi-band.tsx src/app/admin/car-rental/page.tsx
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-admin): bandeau KPI 7j/30j (server-first, — si non calculable)"
```

---

### Task 13: `partners-table.tsx` — perf loueur enrichie

**Files:**
- Modify: `src/app/admin/car-rental/page.tsx`
- Modify: `src/app/admin/car-rental/partners-table.tsx`

- [ ] **Step 1: Construire `monitorByPartner` dans `page.tsx` et le passer**

Après `monitorByRequest`, ajouter :
```ts
  const monitorByPartner = new Map<number, MonitorInvite[]>();
  for (const list of monitorByRequest.values()) {
    for (const mi of list) {
      const arr = monitorByPartner.get(mi.partner_id) ?? [];
      arr.push(mi);
      monitorByPartner.set(mi.partner_id, arr);
    }
  }
```

Passer `monitorByPartner={monitorByPartner}` à `<PartnersTable ... />`.

- [ ] **Step 2: Consommer `partnerPerf` dans `partners-table.tsx`**

Lire d'abord le fichier pour repérer où les stats par loueur sont rendues (cherche `partnerStats`). Ajouter l'import :
```ts
import { partnerPerf, type MonitorInvite } from "@/lib/car-monitoring";
```
Ajouter `monitorByPartner: Map<number, MonitorInvite[]>` aux props. Pour chaque loueur rendu, calculer `const perf = partnerPerf(p.id, monitorByPartner);` et afficher, à côté des stats existantes, une ligne compacte :
```tsx
                <div className="text-xs text-text-muted">
                  {perf.invited} invité(s) · {perf.quoted} chiffré(s) · {perf.chosen} choisi(s) · {perf.declined} désisté(s)
                  {perf.avgQuotePriceEur != null ? ` · prix moy ${perf.avgQuotePriceEur.toFixed(0)} €` : ""}
                  {perf.responseRate != null ? ` · réponse ${Math.round(perf.responseRate * 100)} %` : ""}
                  {perf.avgResponseHours != null ? ` · délai moy ${perf.avgResponseHours.toFixed(1)}h` : ""}
                </div>
```

- [ ] **Step 3: Vérifier le typage**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/car-rental/page.tsx src/app/admin/car-rental/partners-table.tsx
git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com commit -m "feat(car-admin): perf loueur enrichie (invités/chiffrés/choisis/désistés/prix/réponse)"
```

---

### Task 14: Vérif finale P2 + déploiement

**Files:** aucun.

- [ ] **Step 1: `tsc` + tous les checks verts**

Run: `npx tsc --noEmit -p tsconfig.json && npm run check`
Expected: tout PASS (le script agrégé `check` inclut désormais `check:car-monitoring`).

- [ ] **Step 2: e2e visuel P2**

Ré-injecter le jeu de test (Task 9 Step 2), vérifier le bandeau KPI (7j/30j, valeurs cohérentes, `—` si dénominateur 0) et la perf loueur enrichie dans l'onglet Partenaires. Puis nettoyer les données de test (Task 9 Step 3).

- [ ] **Step 3: Déployer P2 en prod**

```bash
git push origin feat/car-admin-monitoring
git push origin feat/car-admin-monitoring:master
git push origin feat/car-admin-monitoring:main
```
Vérifier le build Vercel vert + contrôle visuel prod.

- [ ] **Step 4: MAJ mémoire P2**

`session_log.md` (DEPLOY), `project_crete_direct.md` (cockpit complet P1+P2), re-coudre la ligne `MEMORY.md`.

---

## Notes de sécurité / conventions (rappel)

- Chaque commit avec `git -c user.name=kerjeanfrancois29 -c user.email=kerjeanfrancois29@gmail.com`.
- Jamais master/main direct : toujours push `feat/car-admin-monitoring` puis `:master` puis `:main`, après vert.
- Pas de token en clair ni d'IP dans le rendu admin (RGPD). Emails clients OK côté admin.
- Une seule requête invites (Task 6) groupée en Map : pas de N+1.
- Toute la logique de calcul est dans `car-monitoring.ts` (pur, testé), zéro calcul dans le JSX.
