# Suivi d'issue de location et relance de facture : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qu'aucune demande de location acceptée ne reste sans issue connue au-delà de dix jours après `date_to` : le loueur confirme en un clic (email J+1, J+4, J+8, escalade ops J+10), une issue « louée » déclenche la facture, une issue « pas eu lieu » annule la facture par avoir, et une facture due est relancée à J+15 puis remontée à J+30.

**Architecture:** Un nouveau cron `car-outcome-followup` (06:20 UTC) fait deux passes : la passe d'issue (`car-outcome-followup-server.ts`) et la passe de relance de facture (`car-invoice-reminder.ts`). Toute la décision est pure et testée sans base dans `car-outcome-followup.ts` (calendrier, décision au clic, textes, libellés admin). L'écriture d'issue est extraite de `setOutcome` dans `car-outcome-server.ts` (`applyOutcome`) et partagée par l'admin et le nouvel endpoint `POST /api/car-rental/outcome`, que la page `/en/rental-outcome/[token]` appelle par un formulaire HTML (jamais un GET qui écrit). Un jeton stable `car_requests.outcome_token` en clair, même arbitrage que `client_token`.

**Tech Stack:** Next.js 16 (App Router, server components, route handlers), TypeScript strict, Supabase JS (PostgREST), Resend, Vitest, `node --experimental-strip-types` pour les scripts `check:*`.

**Spec source :** `docs/superpowers/specs/2026-09-07-car-outcome-commission-design.md`. La lire avant de commencer, en particulier la section 0 (ce que la mesure du 07/09 disait de travers) et la section 8 (cas limites).

---

## Conventions du dépôt à respecter à chaque tâche

- Branche de chantier : `feat/car-outcome-followup`, partant de `origin/master`. Jamais de commit sur `master` ni sur `main`.
- `git add -A` et `git add .` sont **interdits** : chaque commit nomme ses fichiers.
- Aucun tiret cadratin (U+2014) dans le code, les tests, les textes d'email, les messages de commit : `npm run check:da` refuse toute nouvelle occurrence. Séparateurs autorisés : `·`, `:`, `,`.
- Textes destinés au loueur en anglais, commentaires et libellés du back-office en français avec accents.
- Chaque écriture PostgREST lit `error` : PostgREST ne lève pas. Chaque envoi Resend lit `res.error` via `reportSend`, jamais un `await` nu.
- `npm test` = `vitest run` sur `src/**/*.test.ts`. Un fichier isolé : `npx vitest run <chemin>`.
- Fin de chantier : `npm run check` (agrège `check:da`, `check:car-admin`, `tsc --noEmit`, etc.), puis `npm run ship`. Aucune promotion vers `main` à la main.
- Ce plan n'est pas la prod : la migration SQL s'applique à la main sur la base (tâche 9), jamais depuis un test.

## Structure des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `supabase/migrations/20260908_car_outcome_followup.sql` | 5 colonnes sur `car_requests`, `reminded_at` sur `car_commission_invoices`, rétro-remplissage | 1 |
| `src/lib/car-admin.ts` | `OUTCOME_SOURCES`, type `OutcomeSource`, colonnes optionnelles de `AdminRequest` | 1 |
| `src/lib/car-outcome-server.ts` | `applyOutcome()` partagée, `requestByOutcomeToken()`, `confirmPresumedOutcome()`, `handleOutcomeClick()` | 2, 4 |
| `src/app/admin/car-rental/actions.ts` | `setOutcome` délègue à `applyOutcome(source: 'admin')` | 2 |
| `src/app/api/cron/car-commission-invoice/route.ts` | ajoute `outcome_source: 'auto'` à la bascule | 2 |
| `src/lib/car-invoice-credit.ts` | `creditCommissionInvoice(id, reason, source = 'admin')` | 2 |
| `src/lib/car-outcome-followup.ts` | pur : `outcomeFollowupStep`, `outcomeClickDecision`, `outcomePageState`, textes d'email, libellés admin | 3 |
| `src/lib/email.ts` | `sendPartnerOutcomeQuestion`, `sendInvoiceReminder` | 4, 7 |
| `src/app/api/car-rental/outcome/route.ts` | `POST` token + choice, redirection 303 | 5 |
| `src/app/[locale]/rental-outcome/[token]/page.tsx` | page loueur, `noindex`, un formulaire, un bouton | 5 |
| `src/lib/car-outcome-followup-server.ts` | `runOutcomeFollowupPass(now)` : populations A et B, envois, ops J+10 | 6 |
| `src/app/api/cron/car-outcome-followup/route.ts` | `assertCron`, deux passes, JSON | 6 |
| `vercel.json` | 14e cron `20 6 * * *` | 6 |
| `src/lib/car-commission.ts` | `invoiceReminderSubject`, `invoiceReminderBody` | 7 |
| `src/lib/car-invoice-reminder.ts` | `invoiceReminderDue` (pur) et `runInvoiceReminderPass(now)` | 7 |
| `src/app/admin/car-rental/requests-table.tsx` | badge avec source, ligne d'état de relance | 8 |
| `scripts/check-car-admin.mjs` | `OUTCOME_SOURCES` et libellés de badge | 8 |
| `docs/mockups/rental-outcome.html` | planche visuelle avant push (règle du dépôt) | 8 |

Tests (les 11 fichiers nommés par la spec, section 9) :
`src/lib/car-outcome-followup.test.ts` · `src/lib/car-outcome-server.test.ts` · `src/lib/car-outcome-followup-server.test.ts` · `src/app/api/cron/car-outcome-followup/route.test.ts` · `src/app/api/car-rental/outcome/route.test.ts` · `src/app/[locale]/rental-outcome/[token]/page.test.ts` · `src/lib/car-invoice-reminder.test.ts` · `src/lib/car-commission.test.ts` (ajout) · `src/app/api/cron/car-commission-invoice/route.test.ts` (ajout) · `src/lib/car-invoice-credit.test.ts` (ajout) · `scripts/check-car-admin.mjs` (ajout).

---

### Task 0 : Branche de chantier

**Files:** aucun.

- [ ] **Step 1 : Partir d'un `master` à jour**

Run :
```bash
cd ~/cp-specs-360
git fetch origin master
git switch -c feat/car-outcome-followup origin/master
git status --short
```
Expected : `branch 'feat/car-outcome-followup' set up to track 'origin/master'`, puis un `git status` vide (working tree propre). Si `git status` liste des fichiers, ce sont des restes d'un autre chantier : ne pas les toucher, ne jamais les ajouter aux commits de ce plan.

- [ ] **Step 2 : Vérifier que la suite est verte avant de toucher quoi que ce soit**

Run : `npx vitest run src/app/admin/car-rental/actions.test.ts src/app/api/cron/car-commission-invoice/route.test.ts src/lib/car-invoice-credit.test.ts src/lib/car-commission.test.ts`
Expected : `Test Files  4 passed`. Ces quatre fichiers sont ceux que les tâches 2 et 7 modifient ou doivent laisser verts sans changer leurs assertions.

---

### Task 1 : Migration, types et constante `OUTCOME_SOURCES`

**Files:**
- Create: `supabase/migrations/20260908_car_outcome_followup.sql`
- Modify: `src/lib/car-admin.ts:9-55` (interface `AdminRequest`, la ligne `commission_session_id` est la 46) et `:106-107` (`OUTCOMES`)
- Test: `scripts/check-car-admin.mjs` (assertion d'export, complétée en tâche 8)

- [ ] **Step 1 : Écrire l'assertion de script qui échoue**

Ajouter à `scripts/check-car-admin.mjs`, dans l'import de tête (ligne 4 à 8), `OUTCOME_SOURCES` :

```js
import {
  commissionEur, requestCommission, requestsSummary, partnerStats,
  validatePartnerUpdate, buildCarWaMessage, waHref, ZONE_IDS,
  bookingState, OUTCOME_SOURCES,
} from "../src/lib/car-admin.ts";
```

Et juste avant `process.exit(fail ? 1 : 0);` :

```js
// --- sources d'issue (migration 20260908_car_outcome_followup) ---
// Une issue présumée par le cron au J1 et une issue confirmée par le loueur ne
// doivent plus se lire pareil : la source est une donnée, pas une déduction.
ok("OUTCOME_SOURCES = partner_link, admin, auto",
  Array.isArray(OUTCOME_SOURCES) && OUTCOME_SOURCES.length === 3
  && OUTCOME_SOURCES.includes("partner_link") && OUTCOME_SOURCES.includes("admin") && OUTCOME_SOURCES.includes("auto"));
```

- [ ] **Step 2 : Lancer le script pour le voir échouer**

Run : `npm run check:car-admin`
Expected : `SyntaxError: The requested module '../src/lib/car-admin.ts' does not provide an export named 'OUTCOME_SOURCES'`, code de sortie 1.

- [ ] **Step 3 : Exporter la constante et étendre `AdminRequest`**

Dans `src/lib/car-admin.ts`, remplacer les deux lignes :

```ts
export const OUTCOMES = ["rented", "lost"] as const;
export type Outcome = (typeof OUTCOMES)[number];
```

par :

```ts
export const OUTCOMES = ["rented", "lost"] as const;
export type Outcome = (typeof OUTCOMES)[number];

/**
 * Qui a posé l'issue (migration 20260908_car_outcome_followup) :
 * `auto` = présomption du cron de facturation au J1, `partner_link` = clic du
 * loueur sur son lien d'issue, `admin` = back-office. Sans cette colonne,
 * présumé et confirmé se lisaient pareil et personne ne relançait le loueur.
 */
export const OUTCOME_SOURCES = ["partner_link", "admin", "auto"] as const;
export type OutcomeSource = (typeof OUTCOME_SOURCES)[number];
```

Dans l'interface `AdminRequest`, après la ligne `commission_session_id?: string | null;`, ajouter :

```ts
  // Suivi d'issue après la fin de location (migration 20260908) : optionnelles
  // comme les autres colonnes admin, une prod pas encore migrée ne casse rien.
  outcome_source?: string | null; // 'partner_link' | 'admin' | 'auto' | null
  /** Jeton STABLE en clair du lien d'issue, même arbitrage que client_token. */
  outcome_token?: string | null;
  outcome_followup_count?: number | null;
  outcome_followup_sent_at?: string | null;
  outcome_followup_escalated_at?: string | null;
```

- [ ] **Step 4 : Relancer le script**

Run : `npm run check:car-admin`
Expected : dernière ligne `ok - OUTCOME_SOURCES = partner_link, admin, auto`, aucune ligne `FAIL`, code de sortie 0.

- [ ] **Step 5 : Écrire la migration**

Créer `supabase/migrations/20260908_car_outcome_followup.sql` :

```sql
-- Suivi d'issue après la fin de location, et relance de facture de commission
-- (spec docs/superpowers/specs/2026-09-07-car-outcome-commission-design.md).
--
-- Le cron car-commission-invoice PRÉSUME « louée » au premier jour et facture.
-- Personne ne confirmait ensuite, et une location écartée par ce cron (fiche
-- loueur incomplète, départ antérieur au 05/08) n'avait aucune seconde chance.
-- Ces colonnes portent : qui a posé l'issue, le jeton du lien loueur, et le
-- calendrier des trois emails de question puis de l'escalade ops.

alter table public.car_requests
  -- Qui a posé l'issue : 'auto' = présomption du cron au J1, 'partner_link' =
  -- clic du loueur, 'admin' = back-office. Sans elle, présumé et confirmé se
  -- lisent pareil.
  add column if not exists outcome_source text
    check (outcome_source in ('partner_link', 'admin', 'auto')),
  -- Jeton STABLE en clair, même arbitrage que client_token (20260712) : trois
  -- emails à trois jours d'intervalle, un seul lien vivant. Un jeton rotatif
  -- ferait tomber les deux premiers emails en 404.
  add column if not exists outcome_token text unique,
  add column if not exists outcome_followup_count smallint not null default 0,
  add column if not exists outcome_followup_sent_at timestamptz,
  add column if not exists outcome_followup_escalated_at timestamptz;

alter table public.car_commission_invoices
  -- Rappel J+15 envoyé. NULL = jamais relancée. La remontée ops J+30 n'a pas de
  -- colonne : elle est volontairement répétée à chaque passage tant que due.
  add column if not exists reminded_at timestamptz;

-- Rétro-remplissage des issues déjà posées : elles viennent toutes du
-- back-office, SAUF celles que le cron de facturation a basculées lui-même.
update public.car_requests set outcome_source = 'admin'
  where outcome is not null and outcome_source is null;

-- Le cron tourne à 05:00 UTC et pose outcome_at dans les secondes qui suivent.
-- Un clic admin « Loué » appelle AUSSI requestCommission dans la foulée, donc
-- « outcome_at à la minute près de issued_at » (idée de la spec, section 5) ne
-- sépare pas les deux : c'est l'HEURE de la bascule qui les sépare. Une issue
-- « louée » posée entre 05:00:00 et 05:10:00 UTC avec une facture émise dans
-- la même fenêtre est une présomption du cron : elle recevra la question de
-- confirmation à J+1, ce qui en fait le premier test réel du circuit.
update public.car_requests r set outcome_source = 'auto'
  from public.car_commission_invoices i
  where i.request_id = r.id
    and r.outcome = 'rented'
    and r.outcome_source = 'admin'
    and (r.outcome_at at time zone 'UTC')::time between '05:00:00' and '05:10:00'
    and (i.issued_at at time zone 'UTC')::time between '05:00:00' and '05:10:00'
    and i.issued_at::date = r.outcome_at::date;

-- Pas d'index : car_requests compte moins d'un millier de lignes (limit(1000)
-- de la page admin) et les deux passes lisent une fois par jour.

notify pgrst, 'reload schema';
```

- [ ] **Step 6 : Vérifier le format de la migration contre ses voisines**

Run : `grep -c "add column if not exists" supabase/migrations/20260908_car_outcome_followup.sql; grep -n "notify pgrst" supabase/migrations/20260908_car_outcome_followup.sql; grep -cP '\x{2014}' supabase/migrations/20260908_car_outcome_followup.sql`
Expected : `6`, puis une ligne `notify pgrst, 'reload schema';`, puis `0` (aucun tiret cadratin). Le fichier n'est pas exécuté ici : la base de prod n'est pas accessible depuis le poste (`SUPABASE_SERVICE_KEY` n'existe que sur Vercel), c'est l'objet de la tâche 9.

- [ ] **Step 7 : `tsc` puis commit**

Run : `npx tsc --noEmit`
Expected : aucune sortie, code 0.

```bash
git add supabase/migrations/20260908_car_outcome_followup.sql src/lib/car-admin.ts scripts/check-car-admin.mjs
git commit -m "feat(car-outcome): la source d une issue est une donnee, pas une deduction

Migration 20260908 : outcome_source, outcome_token stable, compteur et dates
du suivi d issue sur car_requests, reminded_at sur car_commission_invoices.
Retro-remplissage : admin partout, auto pour les bascules du cron de 05:00 UTC."
```

---

### Task 2 : `applyOutcome()` partagée, `outcome_source` dans le cron et dans l'avoir

**Files:**
- Create: `src/lib/car-outcome-server.ts`
- Create: `src/lib/car-outcome-server.test.ts`
- Modify: `src/app/admin/car-rental/actions.ts:40-106` (`setOutcome`)
- Modify: `src/app/api/cron/car-commission-invoice/route.ts:156-169`
- Modify: `src/lib/car-invoice-credit.ts:57-102`
- Test: `src/app/admin/car-rental/actions.test.ts` (doit rester vert SANS modification), `src/app/api/cron/car-commission-invoice/route.test.ts` (un `it` de plus), `src/lib/car-invoice-credit.test.ts` (un `it` de plus)

Contrat de `applyOutcome`, lu par toutes les tâches suivantes :

```ts
applyOutcome({ id, outcome, source, finalAmountEur?, expect? })
  → { status: "rented"; commission: CommissionOutcome }
  | { status: "lost" }
  | { status: "lost_race" }   // uniquement quand `expect` est fourni et que l'update a touché zéro ligne
```

`expect` est le verrou optimiste de l'endpoint (section 8 de la spec) : `"outcome_null"` ajoute `.is("outcome", null)`, `"source_auto"` ajoute `.eq("outcome_source", "auto")`. Sans `expect` (chemin admin), zéro ligne touchée n'est PAS une course perdue : les tests de `setOutcome` modélisent l'update avec `data: []`.

- [ ] **Step 1 : Écrire les tests de `applyOutcome`**

Créer `src/lib/car-outcome-server.test.ts` :

```ts
// L'écriture d'issue a trois écrivains (admin, lien loueur, cron). Une seule
// fonction les porte : ce fichier verrouille son contrat, et les tests de
// setOutcome (actions.test.ts) verrouillent que l'admin n'a pas bougé.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, requestCommission, expireCommissionSession, creditCommissionInvoice, notifyOps } = vi.hoisted(() => ({
  from: vi.fn(),
  requestCommission: vi.fn(),
  expireCommissionSession: vi.fn(async () => {}),
  creditCommissionInvoice: vi.fn(),
  notifyOps: vi.fn(async () => true),
}));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("./car-commission-server", () => ({ requestCommission }));
vi.mock("./car-invoice-credit", () => ({ creditCommissionInvoice, expireCommissionSession }));
vi.mock("./ops-notify", () => ({ notifyOps, echeance: () => "09/09" }));

import { applyOutcome } from "./car-outcome-server";

interface Wiring {
  updates: Array<{ table: string; patch: Record<string, unknown> }>;
  filters: Array<[string, string, unknown]>;
}

/**
 * Chaîne PostgREST modelée à la main : la forme fait partie du contrat.
 * Lecture : select().eq().maybeSingle(). Écriture : update().eq()[.is()|.eq()].select().
 */
function wiring(opts: { partnerCommission?: number | null; updatedRows?: unknown[]; updateError?: { message: string } } = {}): Wiring {
  const w: Wiring = { updates: [], filters: [] };
  from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      eq: (col: string, val: unknown) => { w.filters.push(["eq", col, val]); return chain; },
      is: (col: string, val: unknown) => { w.filters.push(["is", col, val]); return chain; },
      maybeSingle: async () => ({
        data: table === "car_requests"
          ? { quoted_by_partner_id: 111 }
          : opts.partnerCommission === undefined ? { commission: 0.1 } : opts.partnerCommission === null ? null : { commission: opts.partnerCommission },
        error: null,
      }),
      select: async () => ({ data: opts.updateError ? null : (opts.updatedRows ?? [{ id: 42 }]), error: opts.updateError ?? null }),
    });
    return {
      select: () => chain,
      update: (patch: Record<string, unknown>) => { w.updates.push({ table, patch }); return chain; },
    };
  });
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
  requestCommission.mockResolvedValue({ status: "requested", invoiceNumber: "NOVAI-CD-2026-009" });
});

describe("applyOutcome · louée", () => {
  it("écrit outcome, outcome_source, le montant et la commission au taux du loueur", async () => {
    const w = wiring();
    const res = await applyOutcome({ id: 42, outcome: "rented", source: "partner_link", finalAmountEur: 320 });
    expect(res).toMatchObject({ status: "rented", commission: { status: "requested" } });
    expect(w.updates[0].table).toBe("car_requests");
    expect(w.updates[0].patch).toMatchObject({ outcome: "rented", outcome_source: "partner_link", final_amount_eur: 320, commission_eur: 32 });
    expect(typeof w.updates[0].patch.outcome_at).toBe("string");
  });

  it("appelle requestCommission APRÈS l'update : shouldRequestCommission exige outcome === rented", async () => {
    wiring();
    await applyOutcome({ id: 42, outcome: "rented", source: "admin", finalAmountEur: 320 });
    expect(requestCommission).toHaveBeenCalledWith(42);
    expect(from.mock.invocationCallOrder.at(-1)!).toBeLessThan(requestCommission.mock.invocationCallOrder[0]);
  });

  it("rend le résultat réel de la facturation, l'issue restant posée", async () => {
    wiring();
    requestCommission.mockResolvedValueOnce({ status: "partner_identity_incomplete", missing: ["vat_id"] });
    const res = await applyOutcome({ id: 42, outcome: "rented", source: "admin", finalAmountEur: 320 });
    expect(res).toEqual({ status: "rented", commission: { status: "partner_identity_incomplete", missing: ["vat_id"] } });
  });

  it("laisse la commission nulle quand le loueur est introuvable", async () => {
    const w = wiring({ partnerCommission: null });
    await applyOutcome({ id: 42, outcome: "rented", source: "admin", finalAmountEur: 320 });
    expect(w.updates[0].patch.commission_eur).toBeNull();
  });
});

describe("applyOutcome · perdue", () => {
  it("remet commission_paid_at à null et tue la session Stripe, sans facturer", async () => {
    const w = wiring();
    const res = await applyOutcome({ id: 42, outcome: "lost", source: "admin" });
    expect(res).toEqual({ status: "lost" });
    expect(w.updates[0].patch).toMatchObject({ outcome: "lost", outcome_source: "admin", commission_paid_at: null, final_amount_eur: null, commission_eur: null });
    expect(expireCommissionSession).toHaveBeenCalledWith(42);
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("n'émet JAMAIS d'avoir ici : la pièce comptable est une décision de l'appelant", async () => {
    wiring();
    await applyOutcome({ id: 42, outcome: "lost", source: "partner_link" });
    expect(creditCommissionInvoice).not.toHaveBeenCalled();
  });
});

describe("applyOutcome · verrou optimiste", () => {
  it("expect outcome_null ajoute .is(outcome, null) et gagne la course quand une ligne est touchée", async () => {
    const w = wiring();
    const res = await applyOutcome({ id: 42, outcome: "rented", source: "partner_link", finalAmountEur: 320, expect: "outcome_null" });
    expect(res.status).toBe("rented");
    expect(w.filters).toContainEqual(["is", "outcome", null]);
  });

  it("expect source_auto ajoute .eq(outcome_source, auto)", async () => {
    const w = wiring();
    await applyOutcome({ id: 42, outcome: "lost", source: "partner_link", expect: "source_auto" });
    expect(w.filters).toContainEqual(["eq", "outcome_source", "auto"]);
  });

  it("zéro ligne touchée avec expect = course perdue : aucune facturation, aucune expiration", async () => {
    wiring({ updatedRows: [] });
    const res = await applyOutcome({ id: 42, outcome: "rented", source: "partner_link", finalAmountEur: 320, expect: "outcome_null" });
    expect(res).toEqual({ status: "lost_race" });
    expect(requestCommission).not.toHaveBeenCalled();
    expect(expireCommissionSession).not.toHaveBeenCalled();
  });

  it("zéro ligne touchée SANS expect n'est pas une course : le chemin admin continue", async () => {
    wiring({ updatedRows: [] });
    const res = await applyOutcome({ id: 42, outcome: "lost", source: "admin" });
    expect(res).toEqual({ status: "lost" });
    expect(expireCommissionSession).toHaveBeenCalledWith(42);
  });

  it("un refus de la base lève, rien ne suit", async () => {
    wiring({ updateError: { message: "permission denied" } });
    await expect(applyOutcome({ id: 42, outcome: "rented", source: "admin", finalAmountEur: 320 })).rejects.toThrow("permission denied");
    expect(requestCommission).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run : `npx vitest run src/lib/car-outcome-server.test.ts`
Expected : `Error: Failed to resolve import "./car-outcome-server"`, `Test Files 1 failed`.

- [ ] **Step 3 : Créer `src/lib/car-outcome-server.ts`**

```ts
// Écriture d'issue PARTAGÉE. Trois écrivains existent : le back-office
// (setOutcome), le lien loueur (POST /api/car-rental/outcome) et le cron de
// facturation (qui garde son update inline, verrouillé par ses tests, et ne
// fait qu'y ajouter outcome_source: 'auto'). Avant ce module, la logique
// vivait dans setOutcome : snapshot de la commission au taux du jour,
// commission_paid_at remis à null sur « perdue », facturation sur « louée »,
// expiration de la session Stripe sur « perdue ». Elle est ici, une fois.
//
// Ce module n'émet JAMAIS d'avoir : une pièce comptable est une décision de
// l'appelant (creditCommissionInvoice), pas un effet de bord d'un statut.
import { supabaseAdmin as supabase } from "./supabase-admin";
import { commissionEur, type Outcome, type OutcomeSource } from "./car-admin";
import { requestCommission, type CommissionOutcome } from "./car-commission-server";
import { expireCommissionSession } from "./car-invoice-credit";

export interface ApplyOutcomeInput {
  id: number;
  outcome: Outcome;
  source: OutcomeSource;
  /** Montant final de la location, requis pour « louée » (snapshot de commission). */
  finalAmountEur?: number | null;
  /**
   * Verrou optimiste du lien loueur : l'update ne touche la ligne QUE si elle
   * est encore dans l'état attendu. Deux clics contradictoires : le premier
   * gagne, le second rend `lost_race` et n'écrit rien. Absent sur le chemin
   * admin, qui corrige une issue déjà posée.
   */
  expect?: "outcome_null" | "source_auto";
}

export type ApplyOutcomeResult =
  | { status: "rented"; commission: CommissionOutcome }
  | { status: "lost" }
  | { status: "lost_race" };

export async function applyOutcome(input: ApplyOutcomeInput): Promise<ApplyOutcomeResult> {
  const finalAmount = input.outcome === "rented" ? (input.finalAmountEur ?? null) : null;

  // Snapshot de la commission au taux du jour (colonne commission_eur) :
  // l'édition ultérieure du taux partenaire ne réécrit pas l'historique
  // facturable.
  let commission: number | null = null;
  if (input.outcome === "rented" && finalAmount != null) {
    const { data: req } = await supabase.from("car_requests")
      .select("quoted_by_partner_id").eq("id", input.id).maybeSingle();
    if (req?.quoted_by_partner_id != null) {
      const { data: p } = await supabase.from("car_partners")
        .select("commission").eq("id", req.quoted_by_partner_id).maybeSingle();
      if (p) commission = commissionEur(finalAmount, p.commission);
    }
  }

  const patch = {
    outcome: input.outcome,
    outcome_source: input.source,
    outcome_at: new Date().toISOString(),
    final_amount_eur: finalAmount,
    commission_eur: commission,
    // une demande reperdue n'a plus de commission encaissable
    ...(input.outcome === "lost" ? { commission_paid_at: null } : {}),
  };

  let query = supabase.from("car_requests").update(patch).eq("id", input.id);
  if (input.expect === "outcome_null") query = query.is("outcome", null);
  if (input.expect === "source_auto") query = query.eq("outcome_source", "auto");
  const { data, error } = await query.select();
  if (error) throw new Error(error.message);
  if (input.expect && (!data || data.length === 0)) return { status: "lost_race" };

  // Facturation au passage en « louée » (décision du 29/07/2026).
  // requestCommission porte ses propres gardes ; un refus ne défait pas
  // l'issue, la location EST louée, la facturation se rattrape ensuite.
  if (input.outcome === "rented") {
    return { status: "rented", commission: await requestCommission(input.id) };
  }

  // Location perdue : le lien de paiement encore vivant doit mourir. Une
  // session Checkout ouverte dans un onglet du loueur vit 24 h chez Stripe.
  await expireCommissionSession(input.id);
  return { status: "lost" };
}
```

- [ ] **Step 4 : Lancer le test**

Run : `npx vitest run src/lib/car-outcome-server.test.ts`
Expected : `Tests  11 passed`, `Test Files  1 passed`.

- [ ] **Step 5 : Faire déléguer `setOutcome`**

Dans `src/app/admin/car-rental/actions.ts`, remplacer intégralement la fonction `setOutcome` (de `/** Issue d'une demande` jusqu'à sa dernière accolade, lignes 40 à 106) par :

```ts
/** Issue d'une demande : bouton rented (avec montant) ou lost. */
export async function setOutcome(id: number, formData: FormData) {
  await guard();
  const outcome = String(formData.get("outcome") ?? "");
  if (!(OUTCOMES as readonly string[]).includes(outcome)) throw new Error("Invalid outcome");
  const finalAmount = outcome === "rented" ? num(formData.get("amount")) : null;
  if (outcome === "rented" && finalAmount == null) {
    redirect(`${PATH}?error=${encodeURIComponent("Montant requis pour marquer une location « louée »")}`);
  }

  // L'écriture elle-même vit dans applyOutcome, partagée avec le lien loueur.
  // Ici ne restent que les décisions d'écran. AUCUN avoir n'est émis sur
  // « perdue » : émettre une pièce comptable est une décision, pas un effet
  // de bord d'un clic de statut.
  const res = await applyOutcome({ id, outcome: outcome as Outcome, source: "admin", finalAmountEur: finalAmount });

  if (res.status === "rented") {
    const result = res.commission;
    if (result.status === "failed") {
      console.error("[admin/car-rental] commission non demandée", { id, code: result.code });
    } else if (result.status === "partner_identity_incomplete") {
      // La location EST louée (l'update a déjà eu lieu) : ce refus ne fait
      // pas échouer le marquage, mais l'écran doit dire pourquoi aucune
      // facture n'est partie, c'est un état normal tant que la fiche
      // partenaire n'a pas été complétée.
      const missing = missingIdentityLabels(result.missing).join(", ");
      redirect(
        `${PATH}?error=${encodeURIComponent(
          `Location marquée louée, mais la facturation de la commission est bloquée : fiche loueur incomplète (${missing}). Complétez la fiche partenaire pour permettre l'émission de la facture.`,
        )}`,
      );
    }
  }

  revalidatePath(PATH);
}
```

Puis les imports en tête du fichier : remplacer

```ts
import { OUTCOMES, commissionEur, validatePartnerUpdate, ZONE_IDS } from "@/lib/car-admin";
```

par

```ts
import { OUTCOMES, validatePartnerUpdate, ZONE_IDS, type Outcome } from "@/lib/car-admin";
import { applyOutcome } from "@/lib/car-outcome-server";
```

et dans l'import de `@/lib/car-invoice-credit`, retirer `expireCommissionSession` (il n'est plus appelé ici) :

```ts
import {
  creditCommissionInvoice,
  resendCommissionInvoice,
} from "@/lib/car-invoice-credit";
```

- [ ] **Step 6 : Vérifier que les tests de l'admin restent verts sans avoir été touchés**

Run : `git diff --stat src/app/admin/car-rental/actions.test.ts && npx vitest run src/app/admin/car-rental/actions.test.ts`
Expected : le `git diff --stat` ne liste rien, puis `Test Files  1 passed`. Les tests `setOutcome · perdu` (expiration de session, aucun avoir) et `setOutcome · louee, facturation refusee` (update AVANT `requestCommission`, champs manquants nommés) passent parce que `applyOutcome` reproduit la même chaîne PostgREST et le même ordre. Si un test rougit, la cause est dans `applyOutcome`, jamais dans le test.

- [ ] **Step 7 : Le cron de facturation écrit `outcome_source: 'auto'` : test d'abord**

Dans `src/app/api/cron/car-commission-invoice/route.test.ts`, après le test `"bascule outcome=rented AVANT d appeler requestCommission"` (ligne 190, il se termine vers la ligne 212, avant le `it` « ecarte cote requete » de la ligne 214), ajouter :

```ts
  it("signe sa bascule outcome_source=auto : une issue presumee doit se lire comme telle", async () => {
    // Le cron PRESUME « louee » au J1. Sans cette signature, le suivi d issue
    // (cron car-outcome-followup) ne saurait pas quelles lignes confirmer, et
    // le back-office lirait la presomption comme un fait constate.
    process.env.CAR_COMMISSION_ENABLED = "on";
    const { updates } = wiring();
    const { GET } = await import("./route");
    await GET(authed());
    expect(updates[0]).toMatchObject({ outcome: "rented", outcome_source: "auto" });
  });
```

Run : `npx vitest run src/app/api/cron/car-commission-invoice/route.test.ts -t "outcome_source=auto"`
Expected : `1 failed`, avec `expected { outcome: 'rented', ... } to match object { outcome_source: 'auto' }`.

- [ ] **Step 8 : Le diff d'une ligne dans le cron**

Dans `src/app/api/cron/car-commission-invoice/route.ts`, l'update de la bascule devient :

```ts
    const { error: outcomeError } = await supabase
      .from("car_requests")
      .update({
        outcome: "rented",
        // Présomption, pas constat : le cron car-outcome-followup demandera
        // confirmation au loueur après date_to. Voir car-admin.ts OUTCOME_SOURCES.
        outcome_source: "auto",
        outcome_at: new Date().toISOString(),
        final_amount_eur: amounts.base,
        commission_eur: amounts.amount,
      })
      .eq("id", row.id)
      .select();
```

Run : `npx vitest run src/app/api/cron/car-commission-invoice/route.test.ts`
Expected : `Test Files  1 passed`, tous les `it` verts, y compris le nouveau.

- [ ] **Step 9 : `creditCommissionInvoice` accepte une `source` : test d'abord**

Dans `src/lib/car-invoice-credit.test.ts`, dans le `describe("creditCommissionInvoice")`, après le premier `it("emet l avoir, repasse la demande en perdue et previent le loueur")`, ajouter :

```ts
  it("signe la demande reperdue outcome_source=admin par defaut", async () => {
    const w = wiring();
    await creditCommissionInvoice(42, "location annulee par le client");
    const patch = w.updates.find((u) => "outcome" in u);
    expect(patch).toMatchObject({ outcome: "lost", outcome_source: "admin" });
  });

  it("porte la source fournie quand l avoir vient du lien loueur", async () => {
    // Le loueur qui declare lui-meme « pas eu lieu » n est pas un clic admin :
    // la mesure anti-fraude de la spec (lost de source partner_link par loueur)
    // se lit sur cette colonne.
    const w = wiring();
    await creditCommissionInvoice(42, "Reported by the rental company via the outcome link on 2026-09-16", "partner_link");
    const patch = w.updates.find((u) => "outcome" in u);
    expect(patch).toMatchObject({ outcome: "lost", outcome_source: "partner_link" });
  });
```

Run : `npx vitest run src/lib/car-invoice-credit.test.ts -t "outcome_source"`
Expected : `2 failed` (`outcome_source` absent du patch).

- [ ] **Step 10 : Le paramètre optionnel**

Dans `src/lib/car-invoice-credit.ts`, la signature et l'update :

```ts
export async function creditCommissionInvoice(
  requestId: number,
  reason: string,
  /** Qui déclare la location non advenue : le back-office par défaut, ou le loueur via son lien d'issue. */
  source: OutcomeSource = "admin",
): Promise<{ creditNumber: string; notified: boolean } | { error: string }> {
```

et dans l'update `car_requests` de la même fonction :

```ts
      .update({
        outcome: "lost",
        outcome_source: source,
        outcome_at: new Date().toISOString(),
        // une demande reperdue n a plus de commission encaissable
        commission_paid_at: null,
        // le lien de paiement est mort : on ne le reproposera pas au clic suivant
        commission_session_id: null,
      })
```

Ajouter l'import en tête : `import type { OutcomeSource } from "./car-admin";`

Run : `npx vitest run src/lib/car-invoice-credit.test.ts`
Expected : `Test Files  1 passed`.

- [ ] **Step 11 : `tsc`, suite complète, commit**

Run : `npx tsc --noEmit && npx vitest run`
Expected : `tsc` muet, puis `Test Files  N passed` sans aucun `failed`.

```bash
git add src/lib/car-outcome-server.ts src/lib/car-outcome-server.test.ts src/app/admin/car-rental/actions.ts src/app/api/cron/car-commission-invoice/route.ts src/app/api/cron/car-commission-invoice/route.test.ts src/lib/car-invoice-credit.ts src/lib/car-invoice-credit.test.ts
git commit -m "refactor(car-outcome): une seule ecriture d issue pour l admin, le lien loueur et le cron

applyOutcome porte le snapshot de commission, le reset de commission_paid_at,
la facturation sur louee et l expiration de session sur perdue. setOutcome
ne garde que ses redirections d ecran, ses tests n ont pas bouge. Le cron de
facturation signe outcome_source=auto, l avoir accepte une source."
```

---

### Task 3 : Logique pure `car-outcome-followup.ts`

**Files:**
- Create: `src/lib/car-outcome-followup.ts`
- Create: `src/lib/car-outcome-followup.test.ts`

Contrat du module, lu par les tâches 4 à 8 :

```ts
addDays(iso: "YYYY-MM-DD", days: number): string
outcomeFollowupStep(row, today, nowMs): "none" | "send" | "escalate" | "remind"
outcomeClickDecision(row, choice): ClickDecision
outcomePageState(row, result): OutcomePageState
outcomeQuestionSubject(m) / outcomeQuestionBody(m)
outcomeBadgeLabel(outcome, source): string | null
followupStatusLine(row): string | null
ddmm(iso): "JJ/MM" · shortName("Marie Dupont"): "Marie D."
```

Le module est node-safe : il n'importe qu'un type de `./car-admin.ts` (extension `.ts` obligatoire pour `node --experimental-strip-types`, comme `car-admin.ts` importe `./car-partners.ts`). Il n'importe NI `car-invoice` NI `car-commission` (leurs imports sans extension cassent le script `check:car-admin`).

- [ ] **Step 1 : Écrire les tests**

Créer `src/lib/car-outcome-followup.test.ts` :

```ts
// Calendrier, décision au clic et textes du suivi d'issue. Tout est pur : le
// moindre écart de borne (J+4 à la seconde) se teste sans base ni horloge.
import { describe, it, expect } from "vitest";
import {
  addDays, ddmm, shortName,
  outcomeFollowupStep, outcomeClickDecision, outcomePageState,
  outcomeQuestionSubject, outcomeQuestionBody,
  outcomeBadgeLabel, followupStatusLine,
  DAY_MS, type OutcomeQuestionMail, type ClickRow,
} from "./car-outcome-followup";

const TODAY = "2026-09-16";
const NOW = new Date(`${TODAY}T06:20:00.000Z`).getTime();
const EMDASH = String.fromCharCode(0x2014);

describe("addDays / ddmm / shortName", () => {
  it("décale une date civile sans fuseau", () => {
    expect(addDays("2026-09-15", 10)).toBe("2026-09-25");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
  it("ddmm rend JJ/MM", () => expect(ddmm("2026-09-08")).toBe("08/09"));
  it("shortName garde le prénom et l'initiale", () => {
    expect(shortName("Marie Dupont")).toBe("Marie D.");
    expect(shortName("Marie")).toBe("Marie");
    expect(shortName("  Jean Pierre Martin ")).toBe("Jean M.");
  });
});

describe("outcomeFollowupStep", () => {
  const base = { date_to: "2026-09-15", outcome_followup_count: 0, outcome_followup_sent_at: null, outcome_followup_escalated_at: null };

  it("date_to = today ne déclenche rien : la location se termine aujourd'hui", () => {
    expect(outcomeFollowupStep({ ...base, date_to: TODAY }, TODAY, NOW)).toBe("none");
  });
  it("date_to < today et count 0 : email 1", () => {
    expect(outcomeFollowupStep(base, TODAY, NOW)).toBe("send");
  });
  it("count 1 : email 2 exactement 3 jours après l'envoi, pas une seconde avant", () => {
    const sent = new Date(NOW - 3 * DAY_MS).toISOString();
    expect(outcomeFollowupStep({ ...base, outcome_followup_count: 1, outcome_followup_sent_at: sent }, TODAY, NOW)).toBe("send");
    expect(outcomeFollowupStep({ ...base, outcome_followup_count: 1, outcome_followup_sent_at: sent }, TODAY, NOW - 1000)).toBe("none");
  });
  it("count 2 : email 3 exactement 4 jours après l'envoi", () => {
    const sent = new Date(NOW - 4 * DAY_MS).toISOString();
    expect(outcomeFollowupStep({ ...base, outcome_followup_count: 2, outcome_followup_sent_at: sent }, TODAY, NOW)).toBe("send");
    expect(outcomeFollowupStep({ ...base, outcome_followup_count: 2, outcome_followup_sent_at: sent }, TODAY, NOW - 1000)).toBe("none");
  });
  it("count 3 : escalade quand date_to + 10 j <= today, rien avant", () => {
    const row = { ...base, outcome_followup_count: 3, outcome_followup_sent_at: new Date(NOW - DAY_MS).toISOString() };
    expect(outcomeFollowupStep({ ...row, date_to: "2026-09-06" }, TODAY, NOW)).toBe("escalate");
    expect(outcomeFollowupStep({ ...row, date_to: "2026-09-07" }, TODAY, NOW)).toBe("none");
  });
  it("déjà escaladée : rappel à chaque passage", () => {
    expect(outcomeFollowupStep({ ...base, outcome_followup_count: 3, outcome_followup_escalated_at: "2026-09-10T06:20:00.000Z" }, TODAY, NOW)).toBe("remind");
  });
  it("colonnes absentes (prod pas migrée) : lues comme count 0", () => {
    expect(outcomeFollowupStep({ date_to: "2026-09-15" }, TODAY, NOW)).toBe("send");
  });
});

describe("outcomeClickDecision · les 12 cases du tableau 3.4", () => {
  const row = (p: Partial<ClickRow>): ClickRow => ({
    status: "accepted", outcome: null, outcome_source: null,
    hasInvoice: false, invoicePaid: false, invoiceCredited: false, ...p,
  });

  it("issue nulle · a eu lieu → apply rented sous verrou outcome_null", () => {
    expect(outcomeClickDecision(row({}), "rented")).toEqual({ kind: "apply", outcome: "rented", expect: "outcome_null" });
  });
  it("issue nulle · pas eu lieu → apply lost sous verrou outcome_null", () => {
    expect(outcomeClickDecision(row({}), "lost")).toEqual({ kind: "apply", outcome: "lost", expect: "outcome_null" });
  });
  it("présumée facturée · a eu lieu → confirm", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true }), "rented")).toEqual({ kind: "confirm" });
  });
  it("présumée facturée · pas eu lieu → credit", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true }), "lost")).toEqual({ kind: "credit" });
  });
  it("présumée, facture payée · a eu lieu → confirm", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true, invoicePaid: true }), "rented")).toEqual({ kind: "confirm" });
  });
  it("présumée, facture payée · pas eu lieu → already_paid, aucune écriture", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true, invoicePaid: true }), "lost")).toEqual({ kind: "already_paid" });
  });
  it("présumée SANS facture (facturation refusée au J1) · pas eu lieu → apply lost sous verrou source_auto", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "auto" }), "lost")).toEqual({ kind: "apply", outcome: "lost", expect: "source_auto" });
  });
  it("posée par l'admin, même choix → recorded non contestée", () => {
    expect(outcomeClickDecision(row({ outcome: "rented", outcome_source: "admin" }), "rented")).toEqual({ kind: "recorded", contested: false });
  });
  it("posée par l'admin, choix contraire → recorded contestée", () => {
    expect(outcomeClickDecision(row({ outcome: "lost", outcome_source: "admin" }), "rented")).toEqual({ kind: "recorded", contested: true });
  });
  it("déjà confirmée par le loueur (double clic) → recorded non contestée", () => {
    expect(outcomeClickDecision(row({ outcome: "lost", outcome_source: "partner_link" }), "lost")).toEqual({ kind: "recorded", contested: false });
  });
  it("annulée · a eu lieu → cancelled", () => {
    expect(outcomeClickDecision(row({ status: "cancelled" }), "rented")).toEqual({ kind: "cancelled" });
  });
  it("annulée · pas eu lieu → cancelled, même avec une issue posée", () => {
    expect(outcomeClickDecision(row({ status: "cancelled", outcome: "rented", outcome_source: "auto" }), "lost")).toEqual({ kind: "cancelled" });
  });
});

describe("outcomePageState", () => {
  const row = (p: Partial<ClickRow & { outcome_at: string | null }>) => ({
    status: "accepted", outcome: null, outcome_source: null, outcome_at: null,
    hasInvoice: false, invoicePaid: false, invoiceCredited: false, ...p,
  });
  it("issue nulle sans résultat : le formulaire", () => {
    expect(outcomePageState(row({}), null)).toEqual({ kind: "form" });
  });
  it("présumée sans résultat : le formulaire (le lien garde son pouvoir)", () => {
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "auto" }), null)).toEqual({ kind: "form" });
  });
  it("après un POST réussi : done avec le choix enregistré", () => {
    expect(outcomePageState(row({ outcome: "lost", outcome_source: "partner_link", outcome_at: "2026-09-16T06:00:00.000Z" }), "credited")).toEqual({ kind: "done", choice: "lost" });
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "partner_link", outcome_at: "x" }), "applied")).toEqual({ kind: "done", choice: "rented" });
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "partner_link", outcome_at: "x" }), "confirmed")).toEqual({ kind: "done", choice: "rented" });
  });
  it("issue déjà posée par une source non auto : recorded, contestée si le résultat le dit", () => {
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "admin", outcome_at: "2026-09-10T10:00:00.000Z" }), null))
      .toEqual({ kind: "recorded", outcome: "rented", at: "2026-09-10T10:00:00.000Z", contested: false });
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "admin", outcome_at: "x" }), "contested"))
      .toEqual({ kind: "recorded", outcome: "rented", at: "x", contested: true });
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "partner_link", outcome_at: "x" }), "lost_race"))
      .toEqual({ kind: "recorded", outcome: "rented", at: "x", contested: false });
  });
  it("facture payée déclarée non advenue : already_paid", () => {
    expect(outcomePageState(row({ outcome: "rented", outcome_source: "auto", hasInvoice: true, invoicePaid: true }), "already_paid")).toEqual({ kind: "already_paid" });
  });
  it("annulée : cancelled quoi qu'il arrive", () => {
    expect(outcomePageState(row({ status: "cancelled" }), "applied")).toEqual({ kind: "cancelled" });
  });
});

describe("email de question au loueur", () => {
  const mail: OutcomeQuestionMail = {
    requestId: 33, partnerName: "Nikos Zorbas", dateFrom: "2026-09-08", dateTo: "2026-09-15",
    pickupLabel: "Heraklion airport", carModel: "Toyota Yaris automatic", customerName: "Marie Dupont",
    priceEur: 320, outcomeUrl: "https://crete.direct/en/rental-outcome/tok-33", attempt: 1,
    invoice: null, expected: { ratePercent: "10", amountEur: 32 },
  };

  it("sujet : premier envoi, rappel, dernier rappel", () => {
    expect(outcomeQuestionSubject(mail)).toBe("crete.direct · did rental 33 take place? One click");
    expect(outcomeQuestionSubject({ ...mail, attempt: 2 })).toBe("Reminder: crete.direct · did rental 33 take place? One click");
    expect(outcomeQuestionSubject({ ...mail, attempt: 3 })).toBe("Last reminder: crete.direct · did rental 33 take place? One click");
  });
  it("corps : les deux liens vers la PAGE avec ?choice=, jamais vers l'endpoint", () => {
    const body = outcomeQuestionBody(mail);
    expect(body).toContain("https://crete.direct/en/rental-outcome/tok-33?choice=rented");
    expect(body).toContain("https://crete.direct/en/rental-outcome/tok-33?choice=lost");
    expect(body).not.toContain("/api/");
  });
  it("corps : la location, le voyageur abrégé et le prix accepté", () => {
    const body = outcomeQuestionBody(mail);
    expect(body).toContain("Hi Nikos,");
    expect(body).toContain("Rental 33 · 08/09 to 15/09 · Heraklion airport · Toyota Yaris automatic");
    expect(body).toContain("Traveller: Marie D. · Price accepted: 320.00 EUR");
  });
  it("population A : annonce la facture à venir, aucune ligne de facture émise", () => {
    const body = outcomeQuestionBody(mail);
    expect(body).toContain("If it took place, the 10% commission invoice (32.00 EUR) follows automatically.");
    expect(body).not.toContain("was issued on the first day");
  });
  it("population B : nomme la facture émise et promet l'avoir, rien sur une facture à venir", () => {
    const body = outcomeQuestionBody({ ...mail, invoice: { number: "NOVAI-CD-2026-002", amountEur: 32 }, expected: null });
    expect(body).toContain("Invoice NOVAI-CD-2026-002 (32.00 EUR) was issued on the first day of the rental.");
    expect(body).toContain("the second link cancels it by credit note, nothing to pay");
    expect(body).not.toContain("follows automatically");
  });
  it("troisième email : annonce l'appel à date_to + 10 j", () => {
    expect(outcomeQuestionBody({ ...mail, attempt: 3 })).toContain("Without an answer by 25/09 we will call you.");
    expect(outcomeQuestionBody({ ...mail, attempt: 2 })).not.toContain("we will call you");
  });
  it("aucun tiret cadratin dans les trois emails (même règle que check-campagne)", () => {
    for (const attempt of [1, 2, 3] as const) {
      expect(outcomeQuestionSubject({ ...mail, attempt })).not.toContain(EMDASH);
      expect(outcomeQuestionBody({ ...mail, attempt })).not.toContain(EMDASH);
    }
  });
  it("signature crete.direct, sans le modèle quand il est inconnu", () => {
    const body = outcomeQuestionBody({ ...mail, carModel: null });
    expect(body).toContain("Rental 33 · 08/09 to 15/09 · Heraklion airport\n");
    expect(body.endsWith("Kami\ncrete.direct")).toBe(true);
  });
});

describe("libellés du back-office", () => {
  it("badge : présumée, confirmée, admin, loueur", () => {
    expect(outcomeBadgeLabel("rented", "auto")).toBe("louée · présumée J1");
    expect(outcomeBadgeLabel("rented", "partner_link")).toBe("louée · confirmée loueur");
    expect(outcomeBadgeLabel("rented", "admin")).toBe("louée · admin");
    expect(outcomeBadgeLabel("lost", "partner_link")).toBe("perdue · loueur");
    expect(outcomeBadgeLabel("lost", "admin")).toBe("perdue · admin");
  });
  it("badge : source inconnue (avant migration) rend le libellé nu", () => {
    expect(outcomeBadgeLabel("rented", null)).toBe("louée");
    expect(outcomeBadgeLabel("lost", undefined)).toBe("perdue");
  });
  it("badge : rien sans issue", () => {
    expect(outcomeBadgeLabel(null, null)).toBeNull();
    expect(outcomeBadgeLabel(undefined, "auto")).toBeNull();
  });
  it("ligne d'état : rien avant le premier envoi", () => {
    expect(followupStatusLine({ date_to: "2026-09-15" })).toBeNull();
    expect(followupStatusLine({ date_to: "2026-09-15", outcome_followup_count: 0 })).toBeNull();
  });
  it("ligne d'état : envois et dernière date", () => {
    expect(followupStatusLine({ date_to: "2026-09-15", outcome_followup_count: 1, outcome_followup_sent_at: "2026-09-12T06:20:00.000Z" }))
      .toBe("question d'issue : 1/3 envoyée, dernière le 12/09/2026");
    expect(followupStatusLine({ date_to: "2026-09-15", outcome_followup_count: 2, outcome_followup_sent_at: "2026-09-12T06:20:00.000Z" }))
      .toBe("question d'issue : 2/3 envoyées, dernière le 12/09/2026");
  });
  it("ligne d'état : l'escalade prime", () => {
    expect(followupStatusLine({ date_to: "2026-09-15", outcome_followup_count: 3, outcome_followup_sent_at: "2026-09-12T06:20:00.000Z", outcome_followup_escalated_at: "2026-09-18T06:20:00.000Z" }))
      .toBe("question d'issue : escaladée le 18/09/2026");
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run : `npx vitest run src/lib/car-outcome-followup.test.ts`
Expected : `Error: Failed to resolve import "./car-outcome-followup"`.

- [ ] **Step 3 : Créer `src/lib/car-outcome-followup.ts`**

```ts
// Suivi d'issue après la fin de location. PUR, zéro I/O, node-safe (importé
// par scripts/check-car-admin.mjs) : calendrier des trois emails et de
// l'escalade, décision au clic du loueur, état de la page, textes d'email,
// libellés du back-office. Les lectures et écritures vivent dans
// car-outcome-followup-server.ts et car-outcome-server.ts.
//
// ⛔ N'importer ici NI car-invoice NI car-commission : leurs imports sans
// extension cassent `node --experimental-strip-types` (check:car-admin).
import type { OutcomeSource } from "./car-admin.ts";

export const DAY_MS = 86_400_000;
/** Délai avant l'email 2 (après l'email 1) et avant l'email 3 (après l'email 2) : J+1, J+4, J+8. */
export const FOLLOWUP_DELAYS_MS: Record<1 | 2, number> = { 1: 3 * DAY_MS, 2: 4 * DAY_MS };
export const FOLLOWUP_MAX = 3;
/** Jours après date_to au bout desquels l'issue inconnue remonte aux ops. */
export const ESCALATION_DAYS = 10;

/** `iso` au format YYYY-MM-DD, décalé de `days` jours civils, sans fuseau. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** JJ/MM depuis YYYY-MM-DD, le format des emails loueur et des lignes ops. */
export const ddmm = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** « Marie Dupont » devient « Marie D. » : le loueur reconnaît le voyageur, l'email n'expose pas son nom complet. */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// ── Calendrier ──────────────────────────────────────────────────────────────

export interface FollowupRow {
  date_to: string;
  outcome_followup_count?: number | null;
  outcome_followup_sent_at?: string | null;
  outcome_followup_escalated_at?: string | null;
}

export type FollowupStep = "none" | "send" | "escalate" | "remind";

/**
 * Étape du jour pour une ligne dont l'issue est inconnue ou seulement
 * présumée. `today` est la date civile d'Athènes (YYYY-MM-DD), `nowMs`
 * l'instant courant : les délais entre emails se comptent à la seconde
 * depuis l'envoi précédent, l'escalade se compte en jours civils depuis
 * date_to. `date_to < today` strictement : le jour de la restitution, on
 * n'écrit pas encore.
 */
export function outcomeFollowupStep(row: FollowupRow, today: string, nowMs: number): FollowupStep {
  if (!(row.date_to < today)) return "none";
  if (row.outcome_followup_escalated_at) return "remind";
  const count = row.outcome_followup_count ?? 0;
  if (count === 0) return "send";
  if (count === 1 || count === 2) {
    const sentMs = row.outcome_followup_sent_at ? new Date(row.outcome_followup_sent_at).getTime() : 0;
    return sentMs + FOLLOWUP_DELAYS_MS[count] <= nowMs ? "send" : "none";
  }
  return addDays(row.date_to, ESCALATION_DAYS) <= today ? "escalate" : "none";
}

// ── Décision au clic ────────────────────────────────────────────────────────

export type OutcomeChoice = "rented" | "lost";
export const OUTCOME_CHOICES: readonly OutcomeChoice[] = ["rented", "lost"];

export interface ClickRow {
  status: string;
  outcome: string | null;
  outcome_source: string | null;
  hasInvoice: boolean;
  invoicePaid: boolean;
  invoiceCredited: boolean;
}

export type ClickDecision =
  /** Demande sortie du flux par l'admin : aucune écriture. */
  | { kind: "cancelled" }
  /** Issue à poser, sous verrou optimiste. */
  | { kind: "apply"; outcome: OutcomeChoice; expect: "outcome_null" | "source_auto" }
  /** Présomption du cron confirmée : seule la source change. */
  | { kind: "confirm" }
  /** Présomption facturée, contredite : avoir automatique. */
  | { kind: "credit" }
  /** Facture déjà réglée : aucun avoir, remboursement manuel. */
  | { kind: "already_paid" }
  /** Issue déjà posée par une source non auto : le lien n'a plus de pouvoir. */
  | { kind: "recorded"; contested: boolean };

/** Tableau 3.4 de la spec, case par case. */
export function outcomeClickDecision(row: ClickRow, choice: OutcomeChoice): ClickDecision {
  if (row.status === "cancelled") return { kind: "cancelled" };
  if (row.outcome == null) return { kind: "apply", outcome: choice, expect: "outcome_null" };
  if (row.outcome === "rented" && row.outcome_source === "auto") {
    if (choice === "rented") return { kind: "confirm" };
    if (row.hasInvoice && row.invoicePaid) return { kind: "already_paid" };
    if (row.hasInvoice && !row.invoiceCredited) return { kind: "credit" };
    // Bascule au J1 mais facturation refusée (fiche incomplète, Resend) : pas
    // de facture à annuler, l'issue devient simplement « perdue ».
    return { kind: "apply", outcome: "lost", expect: "source_auto" };
  }
  return { kind: "recorded", contested: row.outcome !== choice };
}

// ── État de la page ─────────────────────────────────────────────────────────

export type OutcomePageState =
  | { kind: "form" }
  | { kind: "cancelled" }
  | { kind: "done"; choice: OutcomeChoice }
  | { kind: "already_paid" }
  | { kind: "recorded"; outcome: string; at: string | null; contested: boolean };

/**
 * Ce que la page montre. `result` est le `?result=` posé par la redirection
 * 303 de l'endpoint (null à la première visite). La page relit la base, donc
 * après un POST l'issue affichée est celle réellement écrite.
 */
export function outcomePageState(row: ClickRow & { outcome_at: string | null }, result: string | null): OutcomePageState {
  if (row.status === "cancelled") return { kind: "cancelled" };
  if (result === "already_paid") return { kind: "already_paid" };
  if (result === "applied" || result === "confirmed" || result === "credited") {
    return { kind: "done", choice: row.outcome === "lost" ? "lost" : "rented" };
  }
  const presumed = row.outcome === "rented" && row.outcome_source === "auto";
  if (row.outcome == null || presumed) return { kind: "form" };
  return { kind: "recorded", outcome: row.outcome, at: row.outcome_at, contested: result === "contested" };
}

// ── Email de question au loueur ─────────────────────────────────────────────

export interface OutcomeQuestionMail {
  requestId: number;
  partnerName: string;
  dateFrom: string;
  dateTo: string;
  pickupLabel: string;
  carModel: string | null;
  customerName: string;
  priceEur: number;
  /** URL de la page, SANS `?choice=` : le corps ajoute les deux variantes. */
  outcomeUrl: string;
  attempt: 1 | 2 | 3;
  /** Population B : facture déjà émise au J1. */
  invoice: { number: string; amountEur: number } | null;
  /** Population A : ce qui sera facturé si la location a eu lieu. null si taux inconnu. */
  expected: { ratePercent: string; amountEur: number } | null;
}

export function outcomeQuestionSubject(m: OutcomeQuestionMail): string {
  const base = `crete.direct · did rental ${m.requestId} take place? One click`;
  if (m.attempt === 2) return `Reminder: ${base}`;
  if (m.attempt === 3) return `Last reminder: ${base}`;
  return base;
}

export function outcomeQuestionBody(m: OutcomeQuestionMail): string {
  const first = m.partnerName.split(" ")[0] || m.partnerName;
  const lines = [
    `Hi ${first},`,
    ``,
    `Rental ${m.requestId} · ${ddmm(m.dateFrom)} to ${ddmm(m.dateTo)} · ${m.pickupLabel}${m.carModel ? ` · ${m.carModel}` : ""}`,
    `Traveller: ${shortName(m.customerName)} · Price accepted: ${m.priceEur.toFixed(2)} EUR`,
    ``,
    `Did this rental take place?`,
    ``,
    `  Yes, it took place:      ${m.outcomeUrl}?choice=rented`,
    `  No, it did not happen:   ${m.outcomeUrl}?choice=lost`,
    ``,
  ];
  if (m.invoice) {
    lines.push(
      `Invoice ${m.invoice.number} (${m.invoice.amountEur.toFixed(2)} EUR) was issued on the first day of the rental.`,
      `If it did not take place, the second link cancels it by credit note, nothing to pay.`,
      ``,
    );
  } else if (m.expected) {
    lines.push(
      `If it took place, the ${m.expected.ratePercent}% commission invoice (${m.expected.amountEur.toFixed(2)} EUR) follows automatically.`,
      ``,
    );
  }
  if (m.attempt === 3) {
    lines.push(`Without an answer by ${ddmm(addDays(m.dateTo, ESCALATION_DAYS))} we will call you.`, ``);
  }
  lines.push(`Kami`, `crete.direct`);
  return lines.join("\n");
}

// ── Libellés du back-office ─────────────────────────────────────────────────

const SOURCE_LABEL: Record<OutcomeSource, { rented: string; lost: string }> = {
  auto: { rented: "présumée J1", lost: "auto" },
  partner_link: { rented: "confirmée loueur", lost: "loueur" },
  admin: { rented: "admin", lost: "admin" },
};

/** Badge d'issue : une présomption et un fait confirmé ne se lisent plus pareil. */
export function outcomeBadgeLabel(outcome: string | null | undefined, source: string | null | undefined): string | null {
  if (!outcome) return null;
  if (outcome !== "rented" && outcome !== "lost") return outcome;
  const head = outcome === "rented" ? "louée" : "perdue";
  const suffix = source && source in SOURCE_LABEL ? SOURCE_LABEL[source as OutcomeSource][outcome] : null;
  return suffix ? `${head} · ${suffix}` : head;
}

const adminDay = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Athens" });

/** Ligne d'état de la relance sous le badge, null tant que rien n'est parti. */
export function followupStatusLine(row: FollowupRow): string | null {
  if (row.outcome_followup_escalated_at) {
    return `question d'issue : escaladée le ${adminDay(row.outcome_followup_escalated_at)}`;
  }
  const count = row.outcome_followup_count ?? 0;
  if (count === 0) return null;
  const last = row.outcome_followup_sent_at ? `, dernière le ${adminDay(row.outcome_followup_sent_at)}` : "";
  return `question d'issue : ${count}/${FOLLOWUP_MAX} envoyée${count > 1 ? "s" : ""}${last}`;
}
```

- [ ] **Step 4 : Lancer le test**

Run : `npx vitest run src/lib/car-outcome-followup.test.ts`
Expected : `Test Files  1 passed`, aucun `failed` (une quarantaine de `Tests passed`).

- [ ] **Step 5 : Vérifier que le module est node-safe**

Run : `node --experimental-strip-types -e "import('./src/lib/car-outcome-followup.ts').then(m => console.log(m.outcomeBadgeLabel('rented','auto')))"`
Expected : `louée · présumée J1`. Si la sortie est une erreur `Cannot find module`, un import sans extension `.ts` s'est glissé dans le module.

- [ ] **Step 6 : `tsc` et commit**

Run : `npx tsc --noEmit && npm run check:da`
Expected : `tsc` muet ; `check:da` termine sans nouvelle violation.

```bash
git add src/lib/car-outcome-followup.ts src/lib/car-outcome-followup.test.ts
git commit -m "feat(car-outcome): calendrier J+1 J+4 J+8, decision au clic et textes, purs et testes

outcomeFollowupStep, outcomeClickDecision (12 cases), outcomePageState,
les trois emails de question et les libelles du back-office. Zero I/O,
node-safe pour check:car-admin."
```

---

### Task 4 : Lecture par jeton, confirmation, traitement du clic et envoi de la question

**Files:**
- Modify: `src/lib/car-outcome-server.ts` (ajout de `requestByOutcomeToken`, `confirmPresumedOutcome`, `handleOutcomeClick`)
- Modify: `src/lib/car-outcome-server.test.ts` (ajout d'un `describe`)
- Modify: `src/lib/email.ts` (ajout de `sendPartnerOutcomeQuestion` après `sendCreditNote`, ligne 1888)

Contrat, lu par les tâches 5 et 6 :

```ts
requestByOutcomeToken(token): Promise<OutcomeRequestRow | null>     // égalité sur car_requests.outcome_token
confirmPresumedOutcome(id): Promise<boolean>                          // .eq("outcome_source","auto"), true si une ligne touchée
handleOutcomeClick(row, invoice, choice): Promise<ClickResult>
ClickResult = "applied" | "confirmed" | "credited" | "already_paid" | "recorded" | "contested" | "cancelled" | "lost_race"
sendPartnerOutcomeQuestion(email, mail: OutcomeQuestionMail): Promise<boolean>
```

- [ ] **Step 1 : Écrire les tests de `handleOutcomeClick`**

Ajouter à la fin de `src/lib/car-outcome-server.test.ts` (les mocks du fichier couvrent déjà `creditCommissionInvoice` et `notifyOps`) :

```ts
import { handleOutcomeClick, requestByOutcomeToken, type OutcomeRequestRow } from "./car-outcome-server";

const ROW: OutcomeRequestRow = {
  id: 33, status: "accepted", outcome: null, outcome_source: null, outcome_at: null,
  outcome_token: "tok-33", date_from: "2026-09-08", date_to: "2026-09-15",
  pickup_slug: "heraklion-airport", quoted_car_model: "Toyota Yaris", quoted_price: 320,
  customer_name: "Marie Dupont", quoted_by_partner_id: 111,
};
const INVOICE = {
  id: 7, number: "NOVAI-CD-2026-002", request_id: 33, partner_id: 111, base_amount_eur: 320, rate: 0.1,
  amount_eur: 32, issued_at: "2026-09-08T05:00:00.000Z", sent_at: "2026-09-08T05:00:01.000Z",
  paid_at: null as string | null, credited_at: null as string | null, credit_number: null, credit_reason: null,
};

describe("handleOutcomeClick", () => {
  beforeEach(() => {
    creditCommissionInvoice.mockResolvedValue({ creditNumber: "NOVAI-CD-2026-002-A", notified: true });
  });

  it("issue nulle · a eu lieu : applyOutcome partner_link au prix accepté, facture demandée", async () => {
    const w = wiring();
    const res = await handleOutcomeClick(ROW, null, "rented");
    expect(res).toBe("applied");
    expect(w.updates[0].patch).toMatchObject({ outcome: "rented", outcome_source: "partner_link", final_amount_eur: 320 });
    expect(w.filters).toContainEqual(["is", "outcome", null]);
    expect(requestCommission).toHaveBeenCalledWith(33);
    // Rien à signaler : la facture part d'elle-même.
    expect(notifyOps).not.toHaveBeenCalled();
  });

  it("issue nulle · a eu lieu mais facturation refusée : l'issue reste posée et les ops reçoivent le code réel", async () => {
    wiring();
    requestCommission.mockResolvedValueOnce({ status: "failed", code: "partner_without_email" });
    const res = await handleOutcomeClick(ROW, null, "rented");
    expect(res).toBe("applied");
    expect(notifyOps).toHaveBeenCalledTimes(1);
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toContain("partner_without_email");
    expect(n.title).toContain("#33");
    expect(n.silent).not.toBe(true);
  });

  it("issue nulle · pas eu lieu : applyOutcome lost, aucun avoir (il n'y a pas de facture)", async () => {
    const w = wiring();
    expect(await handleOutcomeClick(ROW, null, "lost")).toBe("applied");
    expect(w.updates[0].patch).toMatchObject({ outcome: "lost", outcome_source: "partner_link" });
    expect(creditCommissionInvoice).not.toHaveBeenCalled();
  });

  it("course perdue (update à zéro ligne) : lost_race, aucune facturation", async () => {
    wiring({ updatedRows: [] });
    expect(await handleOutcomeClick(ROW, null, "rented")).toBe("lost_race");
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("présumée · a eu lieu : seule la source change, sous verrou source_auto", async () => {
    const w = wiring();
    const res = await handleOutcomeClick({ ...ROW, outcome: "rented", outcome_source: "auto" }, INVOICE, "rented");
    expect(res).toBe("confirmed");
    expect(w.updates[0].patch).toMatchObject({ outcome_source: "partner_link" });
    expect(w.updates[0].patch).not.toHaveProperty("outcome");
    expect(w.filters).toContainEqual(["eq", "outcome_source", "auto"]);
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("présumée · pas eu lieu : avoir automatique de source partner_link, ops non silencieux", async () => {
    wiring();
    const res = await handleOutcomeClick({ ...ROW, outcome: "rented", outcome_source: "auto" }, INVOICE, "lost");
    expect(res).toBe("credited");
    expect(creditCommissionInvoice).toHaveBeenCalledWith(33, expect.stringContaining("Reported by the rental company via the outcome link on"), "partner_link");
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toContain("NOVAI-CD-2026-002-A");
    expect(n.silent).not.toBe(true);
  });

  it("présumée, facture payée · pas eu lieu : aucune écriture, ops pour remboursement manuel", async () => {
    const w = wiring();
    const res = await handleOutcomeClick({ ...ROW, outcome: "rented", outcome_source: "auto" }, { ...INVOICE, paid_at: "2026-09-10T00:00:00.000Z" }, "lost");
    expect(res).toBe("already_paid");
    expect(w.updates).toHaveLength(0);
    expect(creditCommissionInvoice).not.toHaveBeenCalled();
    expect(notifyOps.mock.calls[0][0].action).toMatch(/rembours/i);
  });

  it("issue admin contredite : aucune écriture, ops « contestation »", async () => {
    const w = wiring();
    const res = await handleOutcomeClick({ ...ROW, outcome: "lost", outcome_source: "admin" }, null, "rented");
    expect(res).toBe("contested");
    expect(w.updates).toHaveLength(0);
    expect(notifyOps.mock.calls[0][0].title).toMatch(/contest/i);
  });

  it("issue déjà confirmée, même choix (double clic) : aucune écriture, aucun bruit", async () => {
    const w = wiring();
    expect(await handleOutcomeClick({ ...ROW, outcome: "lost", outcome_source: "partner_link" }, null, "lost")).toBe("recorded");
    expect(w.updates).toHaveLength(0);
    expect(notifyOps).not.toHaveBeenCalled();
  });

  it("demande annulée : aucune écriture", async () => {
    const w = wiring();
    expect(await handleOutcomeClick({ ...ROW, status: "cancelled" }, null, "rented")).toBe("cancelled");
    expect(w.updates).toHaveLength(0);
  });

  it("Telegram en panne ne fait pas tomber le clic", async () => {
    wiring();
    notifyOps.mockRejectedValueOnce(new Error("telegram down"));
    expect(await handleOutcomeClick({ ...ROW, outcome: "lost", outcome_source: "admin" }, null, "rented")).toBe("contested");
  });
});

describe("requestByOutcomeToken", () => {
  it("cherche par égalité sur outcome_token et rend null sur inconnu", async () => {
    const w = wiring();
    from.mockImplementationOnce((table: string) => {
      const chain = { eq: (col: string, val: unknown) => { w.filters.push(["eq", col, val]); return chain; }, maybeSingle: async () => ({ data: null }) };
      return { select: () => chain };
    });
    expect(await requestByOutcomeToken("inconnu")).toBeNull();
    expect(w.filters).toContainEqual(["eq", "outcome_token", "inconnu"]);
  });
});
```

Dans le `wiring()` déjà défini en tâche 2, `maybeSingle` doit aussi savoir rendre un loueur nommé (`handleOutcomeClick` lit `name` pour la ligne ops). Remplacer son expression `data:` par :

```ts
        data: table === "car_requests"
          ? { quoted_by_partner_id: 111 }
          : opts.partnerCommission === null
            ? null
            : { name: "Zorbas Rent a Car", email: "info@zorbas.gr", whatsapp: "+306912345678", commission: opts.partnerCommission ?? 0.1 },
```

(les tests de `applyOutcome` ne lisent que `commission`, ils restent verts).

- [ ] **Step 2 : Lancer pour voir échouer**

Run : `npx vitest run src/lib/car-outcome-server.test.ts`
Expected : erreurs `does not provide an export named 'handleOutcomeClick'`.

- [ ] **Step 3 : Compléter `src/lib/car-outcome-server.ts`**

Ajouter aux imports :

```ts
import { creditCommissionInvoice, expireCommissionSession } from "./car-invoice-credit";
import type { InvoiceRow } from "./car-invoice-server";
import { outcomeClickDecision, ddmm, type OutcomeChoice } from "./car-outcome-followup";
import { notifyOps, echeance, type OpsNotice } from "./ops-notify";
import { siteBase } from "./car-commission";
import { todayAthens } from "./car-partner-identity";
```

(remplacer la ligne `import { expireCommissionSession } from "./car-invoice-credit";` par la première ci-dessus.) Puis ajouter à la fin du fichier :

```ts
// ── Lien loueur ─────────────────────────────────────────────────────────────

export interface OutcomeRequestRow {
  id: number;
  status: string;
  outcome: string | null;
  outcome_source: string | null;
  outcome_at: string | null;
  outcome_token: string | null;
  date_from: string;
  date_to: string;
  pickup_slug: string;
  quoted_car_model: string | null;
  quoted_price: number | null;
  customer_name: string;
  quoted_by_partner_id: number | null;
}

const OUTCOME_COLS =
  "id, status, outcome, outcome_source, outcome_at, outcome_token, date_from, date_to, pickup_slug, quoted_car_model, quoted_price, customer_name, quoted_by_partner_id";

/** Jeton STABLE en clair (même arbitrage que client_token) : lookup par égalité. */
export async function requestByOutcomeToken(token: string): Promise<OutcomeRequestRow | null> {
  const { data } = await supabase.from("car_requests").select(OUTCOME_COLS).eq("outcome_token", token).maybeSingle();
  return (data as OutcomeRequestRow) ?? null;
}

/**
 * La présomption du cron devient un fait : seule la source change, l'issue,
 * le montant et la facture ne bougent pas. Conditionnel sur `auto` : si
 * l'admin a repris la main entre l'email et le clic, zéro ligne est touchée.
 */
export async function confirmPresumedOutcome(id: number): Promise<boolean> {
  const { data, error } = await supabase.from("car_requests")
    .update({ outcome_source: "partner_link", outcome_at: new Date().toISOString() })
    .eq("id", id).eq("outcome_source", "auto").select();
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export type ClickResult =
  | "applied" | "confirmed" | "credited" | "already_paid"
  | "recorded" | "contested" | "cancelled" | "lost_race";

/** Telegram est un canal de confort : son échec ne doit jamais faire perdre un clic loueur. */
async function ops(n: Omit<OpsNotice, "url">): Promise<void> {
  try {
    await notifyOps({ ...n, url: `${siteBase()}/admin/car-rental` });
  } catch (e) {
    console.error("[car/outcome] notification d exploitation echouee", e);
  }
}

async function partnerNameOf(partnerId: number | null): Promise<string | null> {
  if (partnerId == null) return null;
  const { data } = await supabase.from("car_partners").select("name").eq("id", partnerId).maybeSingle();
  return (data?.name as string | undefined) ?? null;
}

/**
 * Ce que le POST du loueur fait, décision par décision (tableau 3.4 de la
 * spec). La décision est pure (outcomeClickDecision), ici on l'exécute.
 */
export async function handleOutcomeClick(
  row: OutcomeRequestRow,
  invoice: InvoiceRow | null,
  choice: OutcomeChoice,
): Promise<ClickResult> {
  const decision = outcomeClickDecision({
    status: row.status,
    outcome: row.outcome,
    outcome_source: row.outcome_source,
    hasInvoice: Boolean(invoice),
    invoicePaid: Boolean(invoice?.paid_at),
    invoiceCredited: Boolean(invoice?.credited_at),
  }, choice);
  if (decision.kind === "cancelled") return "cancelled";
  if (decision.kind === "recorded" && !decision.contested) return "recorded";

  const nom = await partnerNameOf(row.quoted_by_partner_id);
  const qui = `#${row.id}${nom ? ` ${nom}` : ""} · ${ddmm(row.date_from)} → ${ddmm(row.date_to)}`;

  switch (decision.kind) {
    case "recorded":
      await ops({
        title: `Issue contestée par le loueur : ${qui}`,
        lines: [`Issue enregistrée : ${row.outcome} (${row.outcome_source}), le loueur clique « ${choice} »`],
        action: "Vérifier avec le loueur et corriger l'issue dans le back-office si besoin.",
        due: echeance(2),
      });
      return "contested";

    case "confirm":
      return (await confirmPresumedOutcome(row.id)) ? "confirmed" : "lost_race";

    case "already_paid":
      await ops({
        title: `Location déclarée non advenue, facture DÉJÀ PAYÉE : ${qui}`,
        lines: [`Facture ${invoice?.number ?? "?"} réglée, aucun avoir émis (décision du 31/07 : remboursement manuel)`],
        action: "Rembourser via Stripe ou par virement, puis émettre l'avoir à la main.",
        due: echeance(3),
      });
      return "already_paid";

    case "credit": {
      const reason = `Reported by the rental company via the outcome link on ${todayAthens()}`;
      const res = await creditCommissionInvoice(row.id, reason, "partner_link");
      if ("error" in res) {
        await ops({
          title: `Avoir refusé (${res.error}) sur une location déclarée non advenue : ${qui}`,
          lines: [`Facture ${invoice?.number ?? "?"}`],
          action: "Regarder la facture dans le back-office.",
          due: echeance(1),
        });
        return "recorded";
      }
      await ops({
        title: `Location non advenue déclarée par le loueur, avoir ${res.creditNumber} émis : ${qui}`,
        lines: [
          `Facture ${invoice?.number ?? "?"} annulée, ${res.notified ? "loueur prévenu par email" : "loueur NON prévenu (sans email)"}`,
          `Le voyageur reste joignable pour vérification en cas de doute.`,
        ],
        action: "Rien à faire sauf doute sur la déclaration : la mesure anti-fraude est le nombre de « perdue · loueur » par loueur dans le back-office.",
      });
      return "credited";
    }

    case "apply": {
      const res = await applyOutcome({
        id: row.id,
        outcome: decision.outcome,
        source: "partner_link",
        finalAmountEur: decision.outcome === "rented" ? row.quoted_price : null,
        expect: decision.expect,
      });
      if (res.status === "lost_race") return "lost_race";
      if (res.status === "rented" && res.commission.status !== "requested") {
        // L'issue EST posée. La facture, elle, se rattrape dans le back-office
        // (bouton « Émettre la facture » ou fiche loueur à compléter).
        const detail = res.commission.status === "failed" ? res.commission.code : res.commission.status;
        await ops({
          title: `Loueur a confirmé la location, facture NON émise (${detail}) : ${qui}`,
          lines: [`Prix accepté ${Number(row.quoted_price ?? 0).toFixed(2)} €`],
          action: "Émettre la facture depuis le back-office, ou compléter la fiche du loueur puis réémettre.",
          due: echeance(2),
        });
      }
      return "applied";
    }
  }
}
```

- [ ] **Step 4 : Lancer le test**

Run : `npx vitest run src/lib/car-outcome-server.test.ts`
Expected : `Test Files  1 passed`, tous les `describe` verts (`applyOutcome`, `handleOutcomeClick`, `requestByOutcomeToken`).

- [ ] **Step 5 : `sendPartnerOutcomeQuestion` dans `email.ts`**

Dans `src/lib/email.ts`, ajouter à la liste des imports de tête :

```ts
import { outcomeQuestionSubject, outcomeQuestionBody, type OutcomeQuestionMail } from "./car-outcome-followup";
```

et, juste après la fonction `sendCreditNote` (qui se termine ligne 1888) :

```ts
/**
 * Question d'issue au loueur après la fin de location (cron
 * car-outcome-followup). Texte brut, même canal et même ton que la demande
 * de commission. Best-effort : le compteur est écrit AVANT l'appel, un refus
 * Resend est journalisé et l'étape suivante réessaie.
 */
export async function sendPartnerOutcomeQuestion(
  partnerEmail: string,
  m: OutcomeQuestionMail,
): Promise<boolean> {
  try {
    const res = await resend.emails.send({
      from: FROM_EMAIL,
      to: partnerEmail,
      replyTo: "hello@crete.direct",
      subject: outcomeQuestionSubject(m),
      text: outcomeQuestionBody(m),
    });
    reportSend(res, "question d'issue loueur");
    return !res.error;
  } catch (e) {
    console.error("[sendPartnerOutcomeQuestion] échec:", e);
    return false;
  }
}
```

- [ ] **Step 6 : `tsc`, puis commit**

Run : `npx tsc --noEmit && npx vitest run src/lib/car-outcome-server.test.ts src/app/admin/car-rental/actions.test.ts`
Expected : `tsc` muet, `Test Files  2 passed`.

```bash
git add src/lib/car-outcome-server.ts src/lib/car-outcome-server.test.ts src/lib/email.ts
git commit -m "feat(car-outcome): le clic du loueur pose, confirme ou annule l issue, sous verrou optimiste

handleOutcomeClick execute la decision pure : avoir automatique de source
partner_link sur une presomption facturee, remboursement manuel signale
sur facture payee, contestation remontee aux ops. sendPartnerOutcomeQuestion
lit res.error via reportSend."
```

---

### Task 5 : Endpoint `POST /api/car-rental/outcome` et page `/en/rental-outcome/[token]`

**Files:**
- Create: `src/app/api/car-rental/outcome/route.ts`
- Create: `src/app/api/car-rental/outcome/route.test.ts`
- Create: `src/app/[locale]/rental-outcome/[token]/page.tsx`
- Create: `src/app/[locale]/rental-outcome/[token]/page.test.ts`

Pourquoi une page ET un endpoint : les scanners de liens (Outlook Safe Links, passerelles antispam, aperçus Gmail) suivent les URL d'un email par GET. Un GET qui écrit ferait poser des issues par des robots. Les liens de l'email pointent vers la page, seule le bouton de la page poste. Même pattern que `car-offer/[token]/page.tsx` et `api/car-rental/accept/route.ts`.

- [ ] **Step 1 : Tests de l'endpoint**

Créer `src/app/api/car-rental/outcome/route.test.ts` :

```ts
// Le seul chemin d'écriture du lien loueur. Un GET ne doit jamais écrire (la
// page n'a pas de handler ici), et ce POST doit être aussi sourd qu'un mur à
// tout ce qui n'est pas un jeton connu et un choix valide.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, requestCommission, creditCommissionInvoice, expireCommissionSession, notifyOps, invoiceForRequest } = vi.hoisted(() => ({
  from: vi.fn(),
  requestCommission: vi.fn(),
  creditCommissionInvoice: vi.fn(),
  expireCommissionSession: vi.fn(async () => {}),
  notifyOps: vi.fn(async () => true),
  invoiceForRequest: vi.fn(),
}));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/car-commission-server", () => ({ requestCommission }));
vi.mock("@/lib/car-invoice-credit", () => ({ creditCommissionInvoice, expireCommissionSession }));
vi.mock("@/lib/ops-notify", () => ({ notifyOps, echeance: () => "18/09" }));
vi.mock("@/lib/car-invoice-server", () => ({ invoiceForRequest }));

import { POST } from "./route";

const ROW = {
  id: 33, status: "accepted", outcome: null as string | null, outcome_source: null as string | null, outcome_at: null,
  outcome_token: "tok-33", date_from: "2026-09-08", date_to: "2026-09-15", pickup_slug: "heraklion-airport",
  quoted_car_model: "Toyota Yaris", quoted_price: 320, customer_name: "Marie Dupont", quoted_by_partner_id: 111,
};

interface Wiring { updates: Array<Record<string, unknown>>; filters: Array<[string, string, unknown]> }

function wiring(opts: { request?: typeof ROW | null; updatedRows?: unknown[] } = {}): Wiring {
  const w: Wiring = { updates: [], filters: [] };
  const request = "request" in opts ? opts.request : ROW;
  from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      eq: (c: string, v: unknown) => { w.filters.push(["eq", c, v]); return chain; },
      is: (c: string, v: unknown) => { w.filters.push(["is", c, v]); return chain; },
      maybeSingle: async () => ({
        data: table === "car_partners"
          ? { name: "Zorbas Rent a Car", commission: 0.1 }
          : w.filters.some(([, c]) => c === "outcome_token") ? request : { quoted_by_partner_id: 111 },
      }),
      select: async () => ({ data: opts.updatedRows ?? [{ id: 33 }], error: null }),
    });
    return {
      select: () => chain,
      update: (patch: Record<string, unknown>) => { w.updates.push(patch); return chain; },
    };
  });
  return w;
}

const post = (fields: Record<string, string>) =>
  POST(new Request("https://crete.direct/api/car-rental/outcome", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  }) as never);

beforeEach(() => {
  vi.clearAllMocks();
  invoiceForRequest.mockResolvedValue(null);
  requestCommission.mockResolvedValue({ status: "requested", invoiceNumber: "NOVAI-CD-2026-003" });
  creditCommissionInvoice.mockResolvedValue({ creditNumber: "NOVAI-CD-2026-002-A", notified: true });
});

describe("POST /api/car-rental/outcome", () => {
  it("400 sans jeton, sans lire la base", async () => {
    wiring();
    const res = await post({ choice: "rented" });
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("400 sur un choix hors { rented, lost }", async () => {
    wiring();
    const res = await post({ token: "tok-33", choice: "maybe" });
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("404 sur un jeton inconnu", async () => {
    wiring({ request: null });
    const res = await post({ token: "inconnu", choice: "rented" });
    expect(res.status).toBe(404);
  });

  it("303 vers la page avec ?result= après écriture", async () => {
    const w = wiring();
    const res = await post({ token: "tok-33", choice: "rented" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://crete.direct/en/rental-outcome/tok-33?result=applied");
    expect(w.updates[0]).toMatchObject({ outcome: "rented", outcome_source: "partner_link", final_amount_eur: 320 });
    expect(requestCommission).toHaveBeenCalledWith(33);
  });

  it("aucune écriture sur une demande annulée", async () => {
    const w = wiring({ request: { ...ROW, status: "cancelled" } });
    const res = await post({ token: "tok-33", choice: "lost" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("result=cancelled");
    expect(w.updates).toHaveLength(0);
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("course perdue (update à zéro ligne) : aucune facturation, result=lost_race", async () => {
    wiring({ updatedRows: [] });
    const res = await post({ token: "tok-33", choice: "rented" });
    expect(res.headers.get("location")).toContain("result=lost_race");
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("présomption facturée déclarée non advenue : avoir, result=credited", async () => {
    wiring({ request: { ...ROW, outcome: "rented", outcome_source: "auto" } });
    invoiceForRequest.mockResolvedValue({ id: 7, number: "NOVAI-CD-2026-002", paid_at: null, credited_at: null });
    const res = await post({ token: "tok-33", choice: "lost" });
    expect(res.headers.get("location")).toContain("result=credited");
    expect(creditCommissionInvoice).toHaveBeenCalledWith(33, expect.any(String), "partner_link");
  });

  it("encode le jeton dans l'URL de redirection", async () => {
    wiring({ request: { ...ROW, outcome_token: "a b" } });
    const res = await post({ token: "a b", choice: "rented" });
    expect(res.headers.get("location")).toContain("/en/rental-outcome/a%20b?");
  });
});
```

- [ ] **Step 2 : Lancer pour voir échouer**

Run : `npx vitest run src/app/api/car-rental/outcome/route.test.ts`
Expected : `Failed to resolve import "./route"`.

- [ ] **Step 3 : Créer la route**

`src/app/api/car-rental/outcome/route.ts` :

```ts
// Le loueur dit si la location a eu lieu. POST uniquement : les liens de
// l'email pointent vers la PAGE /en/rental-outcome/[token], qui affiche et
// dont le seul bouton poste ici. Un GET qui écrirait ferait poser des issues
// par les scanners de liens des messageries (Safe Links, aperçus).
//
// Pas de JavaScript requis côté loueur : formulaire HTML, redirection 303
// vers la même page, comme commission/checkout/route.ts.
import { NextRequest, NextResponse } from "next/server";
import { requestByOutcomeToken, handleOutcomeClick } from "@/lib/car-outcome-server";
import { invoiceForRequest } from "@/lib/car-invoice-server";
import { OUTCOME_CHOICES, type OutcomeChoice } from "@/lib/car-outcome-followup";
import { siteBase } from "@/lib/car-commission";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "").trim();
  const choice = String(form.get("choice") ?? "");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });
  if (!(OUTCOME_CHOICES as readonly string[]).includes(choice)) {
    return NextResponse.json({ error: "invalid_choice" }, { status: 400 });
  }

  const row = await requestByOutcomeToken(token);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const invoice = await invoiceForRequest(row.id);
  const result = await handleOutcomeClick(row, invoice, choice as OutcomeChoice);

  return NextResponse.redirect(
    `${siteBase()}/en/rental-outcome/${encodeURIComponent(token)}?result=${result}`,
    303,
  );
}
```

- [ ] **Step 4 : Lancer le test de la route**

Run : `npx vitest run src/app/api/car-rental/outcome/route.test.ts`
Expected : `Tests  8 passed`.

- [ ] **Step 5 : Tests de la page**

Créer `src/app/[locale]/rental-outcome/[token]/page.test.ts` :

```ts
// La page que le loueur ouvre depuis l'email. Elle n'écrit RIEN : elle montre
// la location, pré-coche le choix du lien et offre UN bouton qui poste.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { requestByOutcomeToken, invoiceForRequest } = vi.hoisted(() => ({
  requestByOutcomeToken: vi.fn(),
  invoiceForRequest: vi.fn(),
}));
vi.mock("@/lib/car-outcome-server", () => ({ requestByOutcomeToken }));
vi.mock("@/lib/car-invoice-server", () => ({ invoiceForRequest }));
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const ROW = {
  id: 33, status: "accepted", outcome: null as string | null, outcome_source: null as string | null,
  outcome_at: null as string | null, outcome_token: "tok-33", date_from: "2026-09-08", date_to: "2026-09-15",
  pickup_slug: "heraklion-airport", quoted_car_model: "Toyota Yaris", quoted_price: 320,
  customer_name: "Marie Dupont", quoted_by_partner_id: 111,
};

async function render(search: Record<string, string> = {}, row: typeof ROW | null = ROW): Promise<string> {
  requestByOutcomeToken.mockResolvedValue(row);
  const { default: Page } = await import("./page");
  const el = await Page({
    params: Promise.resolve({ locale: "en", token: "tok-33" }),
    searchParams: Promise.resolve(search),
  });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  vi.clearAllMocks();
  invoiceForRequest.mockResolvedValue(null);
});

describe("page rental-outcome", () => {
  it("est noindex", async () => {
    const { metadata } = await import("./page");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("404 sur un jeton inconnu", async () => {
    await expect(render({}, null)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("montre la location et UN formulaire qui poste vers l'endpoint", async () => {
    const html = await render();
    expect(html).toContain("Rental 33");
    expect(html).toContain("320.00 EUR");
    expect(html).toContain("Marie D.");
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/api/car-rental/outcome"');
    expect(html).toContain('name="token"');
    expect(html).toContain('value="tok-33"');
    expect((html.match(/type="submit"/g) ?? []).length).toBe(1);
  });

  it("pré-coche le choix passé dans l'URL", async () => {
    const lost = await render({ choice: "lost" });
    expect(lost).toMatch(/name="choice"[^>]*value="lost"[^>]*checked=""/);
    expect(lost).not.toMatch(/name="choice"[^>]*value="rented"[^>]*checked=""/);
    const rented = await render({ choice: "rented" });
    expect(rented).toMatch(/name="choice"[^>]*value="rented"[^>]*checked=""/);
  });

  it("sans ?choice= : rien n'est coché, les radios sont requises", async () => {
    const html = await render();
    expect(html).not.toContain('checked=""');
    expect(html).toContain('required=""');
  });

  it("population B : nomme la facture qui sera annulée", async () => {
    invoiceForRequest.mockResolvedValue({ id: 7, number: "NOVAI-CD-2026-002", amount_eur: 32, paid_at: null, credited_at: null });
    const html = await render({ choice: "lost" }, { ...ROW, outcome: "rented", outcome_source: "auto" });
    expect(html).toContain("NOVAI-CD-2026-002");
    expect(html).toContain("credit note");
  });

  it("état done après un POST", async () => {
    const html = await render({ result: "applied" }, { ...ROW, outcome: "rented", outcome_source: "partner_link", outcome_at: "2026-09-16T06:00:00.000Z" });
    expect(html).toContain("Thank you");
    expect(html).not.toContain('type="submit"');
  });

  it("état recorded : le lien n'a plus de pouvoir, date de l'issue affichée", async () => {
    const html = await render({}, { ...ROW, outcome: "lost", outcome_source: "admin", outcome_at: "2026-09-10T10:00:00.000Z" });
    expect(html).toContain("recorded on 2026-09-10");
    expect(html).not.toContain('type="submit"');
  });

  it("état recorded contesté : renvoie vers hello@crete.direct", async () => {
    const html = await render({ result: "contested" }, { ...ROW, outcome: "lost", outcome_source: "admin", outcome_at: "2026-09-10T10:00:00.000Z" });
    expect(html).toContain("hello@crete.direct");
  });

  it("état already_paid : remboursement par email", async () => {
    const html = await render({ result: "already_paid" }, { ...ROW, outcome: "rented", outcome_source: "auto" });
    expect(html).toContain("already paid");
    expect(html).toContain("hello@crete.direct");
    expect(html).not.toContain('type="submit"');
  });

  it("état cancelled", async () => {
    const html = await render({}, { ...ROW, status: "cancelled" });
    expect(html).toContain("this request was cancelled");
    expect(html).not.toContain('type="submit"');
  });
});
```

- [ ] **Step 6 : Lancer pour voir échouer**

Run : `npx vitest run "src/app/[locale]/rental-outcome/[token]/page.test.ts"`
Expected : `Failed to resolve import "./page"`.

- [ ] **Step 7 : Créer la page**

`src/app/[locale]/rental-outcome/[token]/page.tsx` :

```tsx
// Page d'issue de location, PUBLIQUE PAR CONCEPTION : le loueur n'a pas de
// compte, la protection est l'imprévisibilité du jeton (même principe que la
// page devis et la page facture). Servie sous /en uniquement : les loueurs
// sont servis en anglais, un seul canal, une seule langue.
//
// Elle n'écrit RIEN. Le seul bouton poste vers /api/car-rental/outcome, qui
// redirige ici avec ?result=. Sans JavaScript : un <form method="post">.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requestByOutcomeToken } from "@/lib/car-outcome-server";
import { invoiceForRequest } from "@/lib/car-invoice-server";
import { carPickupLabel } from "@/lib/car-lead";
import {
  outcomePageState, shortName, ddmm, OUTCOME_CHOICES, type OutcomeChoice,
} from "@/lib/car-outcome-followup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const shell = { maxWidth: 520, margin: "0 auto", padding: "40px 20px", fontFamily: "'Baloo 2', system-ui, sans-serif", color: "#0B3954" } as const;
const card = { background: "#fff", border: "1px solid #DCE9EE", borderRadius: 20, padding: "26px 24px" } as const;
const notice = { margin: 0, padding: "16px 18px", borderRadius: 12, fontSize: 15, lineHeight: 1.6 } as const;
const option = { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid #DCE9EE", marginBottom: 10, cursor: "pointer" } as const;
const button = { width: "100%", padding: "14px 20px", borderRadius: 999, border: "none", background: "#008C9E", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" } as const;

const day = (iso: string) => new Date(iso).toISOString().slice(0, 10);

export default async function RentalOutcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ choice?: string; result?: string }>;
}) {
  const { locale, token } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const row = await requestByOutcomeToken(token);
  if (!row) notFound();

  const invoice = await invoiceForRequest(row.id);
  const choice = (OUTCOME_CHOICES as readonly string[]).includes(sp.choice ?? "") ? (sp.choice as OutcomeChoice) : null;
  const state = outcomePageState(
    {
      status: row.status,
      outcome: row.outcome,
      outcome_source: row.outcome_source,
      outcome_at: row.outcome_at,
      hasInvoice: Boolean(invoice),
      invoicePaid: Boolean(invoice?.paid_at),
      invoiceCredited: Boolean(invoice?.credited_at),
    },
    sp.result ?? null,
  );
  const openInvoice = invoice && !invoice.paid_at && !invoice.credited_at ? invoice : null;

  return (
    <main style={shell}>
      <h1 style={{ fontSize: 22, margin: "0 0 18px" }}>Did this rental take place?</h1>
      <div style={card}>
        <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
          Rental {row.id} · {ddmm(row.date_from)} to {ddmm(row.date_to)} · {carPickupLabel(row.pickup_slug)}
          {row.quoted_car_model ? ` · ${row.quoted_car_model}` : ""}
        </p>
        <p style={{ margin: "0 0 20px", color: "#5C7886" }}>
          Traveller: {shortName(row.customer_name)} · Price accepted: {Number(row.quoted_price ?? 0).toFixed(2)} EUR
        </p>

        {state.kind === "form" ? (
          <form method="post" action="/api/car-rental/outcome">
            <input type="hidden" name="token" value={token} />
            <label style={option}>
              <input type="radio" name="choice" value="rented" required defaultChecked={choice === "rented"} />
              Yes, it took place
            </label>
            <label style={option}>
              <input type="radio" name="choice" value="lost" required defaultChecked={choice === "lost"} />
              No, it did not happen
            </label>
            {openInvoice ? (
              <p style={{ ...notice, background: "#F6FBFC", marginBottom: 14 }}>
                Invoice {openInvoice.number} ({Number(openInvoice.amount_eur).toFixed(2)} EUR) was issued on the first day of the rental.
                If it did not take place, confirming cancels it by credit note, nothing to pay.
              </p>
            ) : null}
            <button type="submit" style={button}>Confirm</button>
          </form>
        ) : state.kind === "done" ? (
          <p style={{ ...notice, background: "#ECFDF5", color: "#065F46" }}>
            Thank you, recorded: {state.choice === "rented" ? "the rental took place." : "the rental did not take place."}
            {state.choice === "lost" && invoice?.credited_at ? ` Invoice ${invoice.number} is cancelled by credit note ${invoice.credit_number ?? ""}, nothing to pay.` : ""}
            {state.choice === "rented" ? " If a commission is due, the invoice follows by email." : ""}
          </p>
        ) : state.kind === "already_paid" ? (
          <p style={{ ...notice, background: "#FEF9EC", color: "#92400E" }}>
            This invoice is already paid, so it cannot be cancelled here. Reply to hello@crete.direct and we will refund it.
          </p>
        ) : state.kind === "cancelled" ? (
          <p style={{ ...notice, background: "#FEF9EC", color: "#92400E" }}>
            Sorry, this request was cancelled. Nothing to confirm.
          </p>
        ) : (
          <p style={{ ...notice, background: "#F6FBFC" }}>
            Already recorded{state.at ? ` on ${day(state.at)}` : ""}: {state.outcome === "rented" ? "the rental took place." : "the rental did not take place."}
            {state.contested ? " If this is wrong, reply to hello@crete.direct." : ""}
          </p>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 8 : Lancer les tests de la page**

Run : `npx vitest run "src/app/[locale]/rental-outcome/[token]/page.test.ts"`
Expected : `Tests  11 passed`.

- [ ] **Step 9 : `tsc`, `check:da`, commit**

Run : `npx tsc --noEmit && npm run check:da`
Expected : muet puis pas de nouvelle violation.

```bash
git add src/app/api/car-rental/outcome/route.ts src/app/api/car-rental/outcome/route.test.ts "src/app/[locale]/rental-outcome/[token]/page.tsx" "src/app/[locale]/rental-outcome/[token]/page.test.ts"
git commit -m "feat(car-outcome): page loueur et endpoint POST, un GET n ecrit jamais

Les liens de l email menent a la page /en/rental-outcome/[token]?choice=,
noindex, qui pre-coche et offre un seul bouton. L ecriture ne passe que par
POST /api/car-rental/outcome, redirection 303 vers la page avec ?result=."
```

---

### Task 6 : Passe d'issue `runOutcomeFollowupPass`, route cron, `vercel.json`

**Files:**
- Create: `src/lib/car-outcome-followup-server.ts`
- Create: `src/lib/car-outcome-followup-server.test.ts`
- Create: `src/app/api/cron/car-outcome-followup/route.ts`
- Create: `src/app/api/cron/car-outcome-followup/route.test.ts`
- Modify: `vercel.json` (14e cron)

Contrat, lu par la tâche 7 (la route appelle les deux passes) :

```ts
runOutcomeFollowupPass(now: Date): Promise<{ sent: number; refused: number; escalated: number; reminded: number; withoutEmail: number }>
```

- [ ] **Step 1 : Tests de la passe d'issue**

Créer `src/lib/car-outcome-followup-server.test.ts` :

```ts
// La passe quotidienne qui pose la question au loueur. Ce que ce fichier
// verrouille : les deux populations, le compteur écrit AVANT l'envoi, un
// refus Resend qui n'empêche pas l'incrément, et l'escalade ops à J+10 qui
// se répète tant que rien n'est résolu.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, sendPartnerOutcomeQuestion, invoiceForRequest, notifyOps } = vi.hoisted(() => ({
  from: vi.fn(),
  sendPartnerOutcomeQuestion: vi.fn(),
  invoiceForRequest: vi.fn(),
  notifyOps: vi.fn(),
}));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("./email", () => ({ sendPartnerOutcomeQuestion }));
vi.mock("./car-invoice-server", () => ({ invoiceForRequest }));
vi.mock("./ops-notify", () => ({ notifyOps, echeance: (n: number) => `+${n}` }));

import { runOutcomeFollowupPass } from "./car-outcome-followup-server";

const TODAY = "2026-09-16";
const NOW = new Date(`${TODAY}T06:20:00.000Z`);

/** Population A : acceptée, issue inconnue, location finie hier. */
const UNKNOWN = {
  id: 33, status: "accepted", date_from: "2026-09-08", date_to: "2026-09-15", pickup_slug: "heraklion-airport",
  quoted_car_model: "Toyota Yaris", quoted_price: 320, customer_name: "Marie Dupont", quoted_by_partner_id: 111,
  booking_paid_at: null, outcome: null, outcome_source: null, outcome_token: null,
  outcome_followup_count: 0, outcome_followup_sent_at: null, outcome_followup_escalated_at: null,
};
/** Population B : présumée louée et facturée au J1. */
const PRESUMED = { ...UNKNOWN, id: 63, outcome: "rented", outcome_source: "auto", outcome_token: "tok-63" };
const PARTNER = { id: 111, name: "Zorbas Rent a Car", email: "info@zorbas.gr", whatsapp: "+306912345678", phone: null, commission: 0.1 };

interface Wiring {
  queries: Array<{ filters: string[] }>;
  updates: Array<{ id: unknown; patch: Record<string, unknown> }>;
}

function wiring(opts: { unknown?: unknown[]; presumed?: unknown[]; partner?: unknown; updateError?: { message: string } } = {}): Wiring {
  const w: Wiring = { queries: [], updates: [] };
  from.mockImplementation((table: string) => {
    if (table === "car_partners") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: "partner" in opts ? opts.partner : PARTNER }) }) }) };
    }
    if (table !== "car_requests") throw new Error(`table inattendue: ${table}`);
    return {
      select: () => {
        const q = { filters: [] as string[] };
        w.queries.push(q);
        const chain: Record<string, unknown> = {};
        const push = (s: string) => { q.filters.push(s); return chain; };
        Object.assign(chain, {
          eq: (c: string, v: unknown) => push(`eq:${c}:${v}`),
          is: (c: string, v: unknown) => push(`is:${c}:${v}`),
          not: (c: string, op: string, v: unknown) => push(`not:${c}:${op}:${v}`),
          lt: async (c: string, v: unknown) => {
            q.filters.push(`lt:${c}:${v}`);
            const populationB = q.filters.includes("eq:outcome_source:auto");
            return { data: populationB ? (opts.presumed ?? []) : (opts.unknown ?? [UNKNOWN]), error: null };
          },
        });
        return chain;
      },
      update: (patch: Record<string, unknown>) => ({
        eq: (_c: string, id: unknown) => {
          w.updates.push({ id, patch });
          return { select: async () => (opts.updateError ? { data: null, error: opts.updateError } : { data: [{ id }], error: null }) };
        },
      }),
    };
  });
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
  sendPartnerOutcomeQuestion.mockResolvedValue(true);
  invoiceForRequest.mockResolvedValue(null);
  notifyOps.mockResolvedValue(true);
});

describe("runOutcomeFollowupPass · sélection", () => {
  it("lit les deux populations avec les bons filtres, date_to strictement passée", async () => {
    const w = wiring();
    await runOutcomeFollowupPass(NOW);
    const [a, b] = w.queries;
    expect(a.filters).toEqual(expect.arrayContaining(["eq:status:accepted", "is:outcome:null", "is:booking_paid_at:null", "not:quoted_by_partner_id:is:null", `lt:date_to:${TODAY}`]));
    expect(b.filters).toEqual(expect.arrayContaining(["eq:outcome:rented", "eq:outcome_source:auto", `lt:date_to:${TODAY}`]));
  });

  it("écarte en code une annulée ou une payée en ligne remontée par la requête", async () => {
    const w = wiring({ unknown: [{ ...UNKNOWN, status: "cancelled" }], presumed: [{ ...PRESUMED, booking_paid_at: "2026-09-01T00:00:00.000Z" }] });
    const res = await runOutcomeFollowupPass(NOW);
    expect(res.sent).toBe(0);
    expect(w.updates).toHaveLength(0);
    expect(sendPartnerOutcomeQuestion).not.toHaveBeenCalled();
  });

  it("population B : l'email nomme la facture émise", async () => {
    wiring({ unknown: [], presumed: [PRESUMED] });
    invoiceForRequest.mockResolvedValue({ id: 7, number: "NOVAI-CD-2026-001", amount_eur: 32, paid_at: null, credited_at: null });
    await runOutcomeFollowupPass(NOW);
    const mail = sendPartnerOutcomeQuestion.mock.calls[0][1];
    expect(mail.invoice).toEqual({ number: "NOVAI-CD-2026-001", amountEur: 32 });
    expect(mail.expected).toBeNull();
    // Le jeton existant est réutilisé : le lien de l'email précédent reste vivant.
    expect(mail.outcomeUrl).toContain("/en/rental-outcome/tok-63");
  });

  it("population A : l'email annonce la commission attendue au taux du loueur", async () => {
    wiring();
    await runOutcomeFollowupPass(NOW);
    const mail = sendPartnerOutcomeQuestion.mock.calls[0][1];
    expect(mail.invoice).toBeNull();
    expect(mail.expected).toEqual({ ratePercent: "10", amountEur: 32 });
    expect(mail.attempt).toBe(1);
    expect(mail.pickupLabel).toBeTruthy();
  });
});

describe("runOutcomeFollowupPass · envoi", () => {
  it("écrit jeton, compteur et date AVANT l'envoi", async () => {
    const w = wiring();
    const res = await runOutcomeFollowupPass(NOW);
    expect(res.sent).toBe(1);
    expect(w.updates[0].id).toBe(33);
    expect(w.updates[0].patch).toMatchObject({ outcome_followup_count: 1, outcome_followup_sent_at: NOW.toISOString() });
    expect(typeof w.updates[0].patch.outcome_token).toBe("string");
    expect(from.mock.invocationCallOrder.at(-1)!).toBeLessThan(sendPartnerOutcomeQuestion.mock.invocationCallOrder[0]);
    // L'URL envoyée porte le jeton qui vient d'être écrit.
    expect(sendPartnerOutcomeQuestion.mock.calls[0][1].outcomeUrl).toContain(String(w.updates[0].patch.outcome_token));
    expect(sendPartnerOutcomeQuestion.mock.calls[0][0]).toBe("info@zorbas.gr");
  });

  it("un refus Resend n'empêche pas l'incrément : l'étape suivante réessaie", async () => {
    const w = wiring();
    sendPartnerOutcomeQuestion.mockResolvedValue(false);
    const res = await runOutcomeFollowupPass(NOW);
    expect(w.updates[0].patch.outcome_followup_count).toBe(1);
    expect(res.sent).toBe(0);
    expect(res.refused).toBe(1);
  });

  it("une écriture refusée par la base n'envoie rien", async () => {
    wiring({ updateError: { message: "permission denied" } });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await runOutcomeFollowupPass(NOW);
    expect(sendPartnerOutcomeQuestion).not.toHaveBeenCalled();
    expect(res.sent).toBe(0);
    expect(JSON.stringify(errSpy.mock.calls)).toContain("permission denied");
    errSpy.mockRestore();
  });

  it("email 2 à J+4 avec attempt 2, rien avant", async () => {
    wiring({ unknown: [{ ...UNKNOWN, outcome_followup_count: 1, outcome_followup_sent_at: "2026-09-13T06:20:00.000Z", outcome_token: "tok-33" }] });
    await runOutcomeFollowupPass(NOW);
    expect(sendPartnerOutcomeQuestion.mock.calls[0][1].attempt).toBe(2);

    vi.clearAllMocks();
    wiring({ unknown: [{ ...UNKNOWN, outcome_followup_count: 1, outcome_followup_sent_at: "2026-09-14T06:20:00.000Z", outcome_token: "tok-33" }] });
    await runOutcomeFollowupPass(NOW);
    expect(sendPartnerOutcomeQuestion).not.toHaveBeenCalled();
  });

  it("loueur sans email : aucun envoi, notification ops immédiate avec le motif", async () => {
    const w = wiring({ partner: { ...PARTNER, email: null } });
    const res = await runOutcomeFollowupPass(NOW);
    expect(res.withoutEmail).toBe(1);
    expect(w.updates).toHaveLength(0);
    expect(sendPartnerOutcomeQuestion).not.toHaveBeenCalled();
    const texte = JSON.stringify(notifyOps.mock.calls[0][0]);
    expect(texte).toContain("partner_without_email");
    expect(texte).toContain("Zorbas Rent a Car");
  });
});

describe("runOutcomeFollowupPass · escalade J+10", () => {
  const STALE = { ...UNKNOWN, date_to: "2026-09-05", outcome_followup_count: 3, outcome_followup_sent_at: "2026-09-13T06:20:00.000Z", outcome_token: "tok-33" };

  it("pose escalated_at et prévient les ops, non silencieux, loueur nommé, avec due et url", async () => {
    const w = wiring({ unknown: [STALE] });
    const res = await runOutcomeFollowupPass(NOW);
    expect(res.escalated).toBe(1);
    expect(w.updates[0].patch).toMatchObject({ outcome_followup_escalated_at: NOW.toISOString() });
    expect(sendPartnerOutcomeQuestion).not.toHaveBeenCalled();
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toBe("Issue de location inconnue à J+10 : 1 demande(s)");
    expect(n.lines[0]).toBe("#33 Zorbas Rent a Car · 08/09 → 05/09 · 320 € · 3 emails sans réponse");
    expect(n.lines.some((l: string) => l.includes("wa.me/306912345678"))).toBe(true);
    expect(n.action).toContain("back-office");
    expect(n.due).toBe("+2");
    expect(n.url).toContain("/admin/car-rental");
    expect(n.silent).not.toBe(true);
  });

  it("passage suivant : nouvelle notification tant que non résolu, sans réécrire escalated_at", async () => {
    const w = wiring({ unknown: [{ ...STALE, outcome_followup_escalated_at: "2026-09-15T06:20:00.000Z" }] });
    const res = await runOutcomeFollowupPass(NOW);
    expect(res.reminded).toBe(1);
    expect(w.updates).toHaveLength(0);
    expect(notifyOps).toHaveBeenCalledTimes(1);
  });

  it("Telegram en panne ne fait pas tomber la passe", async () => {
    wiring({ unknown: [STALE] });
    notifyOps.mockRejectedValueOnce(new Error("telegram down"));
    await expect(runOutcomeFollowupPass(NOW)).resolves.toMatchObject({ escalated: 1 });
  });

  it("se tait quand il n'y a rien à dire", async () => {
    wiring({ unknown: [] });
    await runOutcomeFollowupPass(NOW);
    expect(notifyOps).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Lancer pour voir échouer**

Run : `npx vitest run src/lib/car-outcome-followup-server.test.ts`
Expected : `Failed to resolve import "./car-outcome-followup-server"`.

- [ ] **Step 3 : Créer `src/lib/car-outcome-followup-server.ts`**

```ts
// Passe quotidienne du suivi d'issue (cron car-outcome-followup, 06:20 UTC).
//
// Deux populations, une seule question au loueur :
//   A. issue inconnue : acceptée, outcome NULL, non payée en ligne, loueur
//      connu, date_to passée. Ce sont les lignes que le cron de facturation a
//      écartées (fiche incomplète) ou n'a jamais vues (départ avant le 05/08).
//   B. issue présumée : outcome = rented ET outcome_source = auto, date_to
//      passée. Basculées par le cron au J1, facturées, jamais confirmées.
//
// Compteur et horodatage sont écrits AVANT l'envoi, comme relanced_at dans
// runPartnerNudgePass : un email refusé par Resend n'est pas renvoyé le
// lendemain, il le sera à l'étape suivante, et un double envoi le même jour
// est impossible.
import { supabaseAdmin as supabase } from "./supabase-admin";
import { newToken } from "./car-quote";
import { siteBase } from "./car-commission";
import { invoiceForRequest } from "./car-invoice-server";
import { ratePercentLabel } from "./car-invoice";
import { commissionEur, waHref } from "./car-admin";
import { carPickupLabel } from "./car-lead";
import { todayAthens } from "./car-partner-identity";
import { notifyOps, echeance, type OpsNotice } from "./ops-notify";
import { outcomeFollowupStep, ddmm, type OutcomeQuestionMail } from "./car-outcome-followup";

const COLS =
  "id, status, date_from, date_to, pickup_slug, quoted_car_model, quoted_price, customer_name, quoted_by_partner_id, booking_paid_at, outcome, outcome_source, outcome_token, outcome_followup_count, outcome_followup_sent_at, outcome_followup_escalated_at";

interface FollowupRequest {
  id: number;
  status: string;
  date_from: string;
  date_to: string;
  pickup_slug: string;
  quoted_car_model: string | null;
  quoted_price: number | null;
  customer_name: string;
  quoted_by_partner_id: number | null;
  booking_paid_at: string | null;
  outcome: string | null;
  outcome_source: string | null;
  outcome_token: string | null;
  outcome_followup_count: number | null;
  outcome_followup_sent_at: string | null;
  outcome_followup_escalated_at: string | null;
}

interface PartnerRow {
  id: number;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
  commission: number | null;
}

export interface OutcomeFollowupResult {
  /** Emails acceptés par Resend. */
  sent: number;
  /** Emails refusés par Resend : compteur incrémenté quand même, réessai à l'étape suivante. */
  refused: number;
  escalated: number;
  reminded: number;
  withoutEmail: number;
}

async function partnerRow(id: number): Promise<PartnerRow | null> {
  const { data } = await supabase.from("car_partners")
    .select("id, name, email, whatsapp, phone, commission").eq("id", id).maybeSingle();
  return (data as PartnerRow) ?? null;
}

/** Telegram est un canal de confort : son échec ne doit jamais faire perdre le résultat d'une passe. */
async function ops(n: OpsNotice): Promise<void> {
  try {
    await notifyOps(n);
  } catch (e) {
    console.error("[car/outcome-followup] notification d exploitation echouee", e);
  }
}

const money = (n: number | null): string => Number(n ?? 0).toFixed(2).replace(/\.00$/, "");

function ligneEscalade(row: FollowupRequest, nom: string): string {
  const count = row.outcome_followup_count ?? 0;
  return `#${row.id} ${nom} · ${ddmm(row.date_from)} → ${ddmm(row.date_to)} · ${money(row.quoted_price)} € · ${count} emails sans réponse`;
}

function ligneWhatsApp(row: FollowupRequest, partner: PartnerRow): string | null {
  const numero = partner.whatsapp ?? partner.phone;
  if (!numero) return null;
  const first = (partner.name ?? "").split(" ")[0] || "there";
  const message = `Hi ${first}, quick question from crete.direct: did rental ${row.id} (${ddmm(row.date_from)} to ${ddmm(row.date_to)}) take place? Thanks!`;
  return `   WhatsApp #${row.id} : ${waHref(numero, message)}`;
}

function buildQuestion(
  row: FollowupRequest,
  partner: PartnerRow,
  token: string,
  attempt: 1 | 2 | 3,
  invoice: { number: string; amount_eur: number } | null,
): OutcomeQuestionMail {
  const price = Number(row.quoted_price ?? 0);
  const rate = Number(partner.commission);
  const expected = !invoice && Number.isFinite(rate) && rate > 0
    ? { ratePercent: ratePercentLabel(rate), amountEur: commissionEur(price, rate) }
    : null;
  return {
    requestId: row.id,
    partnerName: partner.name ?? "",
    dateFrom: row.date_from,
    dateTo: row.date_to,
    pickupLabel: carPickupLabel(row.pickup_slug),
    carModel: row.quoted_car_model,
    customerName: row.customer_name,
    priceEur: price,
    outcomeUrl: `${siteBase()}/en/rental-outcome/${token}`,
    attempt,
    invoice: invoice ? { number: invoice.number, amountEur: Number(invoice.amount_eur) } : null,
    expected,
  };
}

/**
 * Une passe. `now` est injecté : la route passe `new Date()`, les tests une
 * date fixe. `today` est la date civile d'Athènes, comme les actions admin.
 */
export async function runOutcomeFollowupPass(now: Date): Promise<OutcomeFollowupResult> {
  const today = todayAthens(now);
  const nowMs = now.getTime();
  const { sendPartnerOutcomeQuestion } = await import("./email");

  // A. Issue inconnue.
  const { data: unknown } = await supabase.from("car_requests").select(COLS)
    .eq("status", "accepted")
    .is("outcome", null)
    .is("booking_paid_at", null)
    .not("quoted_by_partner_id", "is", null)
    .lt("date_to", today);
  // B. Issue présumée, non confirmée.
  const { data: presumed } = await supabase.from("car_requests").select(COLS)
    .eq("outcome", "rented")
    .eq("outcome_source", "auto")
    .lt("date_to", today);

  const rows = [...((unknown ?? []) as FollowupRequest[]), ...((presumed ?? []) as FollowupRequest[])];
  const result: OutcomeFollowupResult = { sent: 0, refused: 0, escalated: 0, reminded: 0, withoutEmail: 0 };
  const escalations: string[] = [];
  const sansEmail: string[] = [];

  for (const row of rows) {
    // Exclusions communes, redites en code : la requête B ne filtre ni le
    // statut ni le paiement en ligne.
    if (row.status === "cancelled" || row.booking_paid_at || row.quoted_by_partner_id == null) continue;

    const step = outcomeFollowupStep(row, today, nowMs);
    if (step === "none") continue;

    const partner = await partnerRow(row.quoted_by_partner_id);
    const nom = partner?.name ?? `loueur ${row.quoted_by_partner_id}`;
    if (!partner?.email) {
      // Pas d'attente J+10 : sans email, rien ne partira jamais, il faut une
      // main tout de suite. La ligne reste chaque jour jusqu'à saisie admin.
      sansEmail.push(`#${row.id} ${nom} : loueur sans email (partner_without_email)`);
      result.withoutEmail += 1;
      continue;
    }

    if (step === "send") {
      // Jeton STABLE : réutilisé s'il existe, le lien de l'email précédent
      // reste vivant (même arbitrage que client_token, migration 20260712).
      const token = row.outcome_token || newToken();
      const count = Math.min((row.outcome_followup_count ?? 0) + 1, 3) as 1 | 2 | 3;
      const { error } = await supabase.from("car_requests").update({
        outcome_token: token,
        outcome_followup_count: count,
        outcome_followup_sent_at: now.toISOString(),
      }).eq("id", row.id).select();
      if (error) {
        // Refusée en silence, l'email partirait avec un jeton qui n'existe
        // pas en base : lien mort chez le loueur. On journalise et on saute.
        console.error("[car/outcome-followup] ecriture du compteur refusee, aucun envoi", { requestId: row.id, error: error.message });
        continue;
      }
      const invoice = row.outcome === "rented" ? await invoiceForRequest(row.id) : null;
      const mail = buildQuestion(row, partner, token, count, invoice);
      const ok = await sendPartnerOutcomeQuestion(partner.email, mail);
      if (ok) result.sent += 1;
      else result.refused += 1;
      continue;
    }

    if (step === "escalate") {
      const { error } = await supabase.from("car_requests")
        .update({ outcome_followup_escalated_at: now.toISOString() }).eq("id", row.id).select();
      if (error) console.error("[car/outcome-followup] escalated_at refuse par la base", { requestId: row.id, error: error.message });
      result.escalated += 1;
    } else {
      result.reminded += 1;
    }
    escalations.push(ligneEscalade(row, nom));
    const wa = ligneWhatsApp(row, partner);
    if (wa) escalations.push(wa);
  }

  // Le rappel est VOLONTAIREMENT quotidien tant que l'issue est inconnue :
  // la ligne se tait dès qu'un clic ou l'admin pose l'issue, la sortie du
  // bruit est évidente. Rien à dire = silence total.
  if (escalations.length > 0) {
    await ops({
      title: `Issue de location inconnue à J+10 : ${result.escalated + result.reminded} demande(s)`,
      lines: escalations,
      action: "Poser l'issue dans le back-office (Loué / Perdu) ou appeler le loueur, lien WhatsApp ci-dessus.",
      due: echeance(2),
      url: `${siteBase()}/admin/car-rental`,
    });
  }
  if (sansEmail.length > 0) {
    await ops({
      title: `Issue de location : ${sansEmail.length} loueur(s) sans email, question impossible`,
      lines: sansEmail,
      action: "Renseigner l'email du loueur dans l'onglet Partenaires, ou poser l'issue à la main.",
      due: echeance(1),
      url: `${siteBase()}/admin/car-rental?tab=partners`,
    });
  }
  return result;
}
```

- [ ] **Step 4 : Lancer le test**

Run : `npx vitest run src/lib/car-outcome-followup-server.test.ts`
Expected : `Tests  14 passed`.

- [ ] **Step 5 : Tests de la route cron**

Créer `src/app/api/cron/car-outcome-followup/route.test.ts` :

```ts
// Route mince : authentification fail-closed, deux passes, compteurs en JSON.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { runOutcomeFollowupPass, runInvoiceReminderPass } = vi.hoisted(() => ({
  runOutcomeFollowupPass: vi.fn(async () => ({ sent: 2, refused: 0, escalated: 1, reminded: 0, withoutEmail: 0 })),
  runInvoiceReminderPass: vi.fn(async () => ({ reminded: 1, overdue: 0 })),
}));
vi.mock("@/lib/car-outcome-followup-server", () => ({ runOutcomeFollowupPass }));
vi.mock("@/lib/car-invoice-reminder", () => ({ runInvoiceReminderPass }));

import { GET } from "./route";

const req = (auth?: string) =>
  new Request("https://x/api/cron/car-outcome-followup", { headers: auth ? { authorization: auth } : {} }) as never;

describe("GET /api/cron/car-outcome-followup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "s3cret";
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("503 sans CRON_SECRET : fail-closed, aucune passe", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req("Bearer undefined"));
    expect(res.status).toBe(503);
    expect(runOutcomeFollowupPass).not.toHaveBeenCalled();
  });

  it("403 sur un mauvais secret, aucune passe", async () => {
    const res = await GET(req("Bearer mauvais"));
    expect(res.status).toBe(403);
    expect(runOutcomeFollowupPass).not.toHaveBeenCalled();
    expect(runInvoiceReminderPass).not.toHaveBeenCalled();
  });

  it("appelle les deux passes avec le même instant et rend les compteurs", async () => {
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      outcome: { sent: 2, refused: 0, escalated: 1, reminded: 0, withoutEmail: 0 },
      invoices: { reminded: 1, overdue: 0 },
    });
    expect(runOutcomeFollowupPass).toHaveBeenCalledTimes(1);
    expect(runInvoiceReminderPass).toHaveBeenCalledTimes(1);
    const a = runOutcomeFollowupPass.mock.calls[0][0] as Date;
    const b = runInvoiceReminderPass.mock.calls[0][0] as Date;
    expect(a).toBeInstanceOf(Date);
    expect(a.getTime()).toBe(b.getTime());
  });
});
```

- [ ] **Step 6 : Créer la route et un stub temporaire de la passe facture**

`src/app/api/cron/car-outcome-followup/route.ts` :

```ts
// Suivi d'issue après la fin de location et relance de facture de commission.
//
// 06:20 UTC = 09:20 Athènes : après le cron de facturation de 05:00 (une
// ligne facturée au J1 le matin même ne reçoit pas de question d'issue le
// même jour), heure ouvrable côté loueur, même jour civil UTC et Athènes.
// Route mince, pattern car-partner-nudge : assertCron, module serveur, JSON.
import { NextRequest, NextResponse } from "next/server";
import { assertCron } from "@/lib/cron-auth";
import { runOutcomeFollowupPass } from "@/lib/car-outcome-followup-server";
import { runInvoiceReminderPass } from "@/lib/car-invoice-reminder";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertCron(request);
  if (denied) return denied;

  const now = new Date();
  const outcome = await runOutcomeFollowupPass(now);
  const invoices = await runInvoiceReminderPass(now);
  return NextResponse.json({ ok: true, outcome, invoices });
}
```

La passe facture n'existe pas encore (tâche 7). Pour que `tsc` et le test de route passent dès maintenant, créer `src/lib/car-invoice-reminder.ts` avec ce contenu provisoire, que la tâche 7 remplace intégralement :

```ts
// Relance de facture de commission : J+15 email, J+30 ops. Implémentée en
// tâche 7 du plan 2026-09-07-car-outcome-followup ; ce stub tient tsc.
export interface InvoiceReminderResult {
  reminded: number;
  overdue: number;
}

export async function runInvoiceReminderPass(_now: Date): Promise<InvoiceReminderResult> {
  return { reminded: 0, overdue: 0 };
}
```

- [ ] **Step 7 : Lancer le test de route**

Run : `npx vitest run src/app/api/cron/car-outcome-followup/route.test.ts`
Expected : `Tests  3 passed`.

- [ ] **Step 8 : Le 14e cron dans `vercel.json`**

Ajouter, après la ligne `stays-expire` et avant le `]` :

```json
    { "path": "/api/cron/stays-expire", "schedule": "10 5 * * *" },
    { "path": "/api/cron/car-outcome-followup", "schedule": "20 6 * * *" }
```

(virgule ajoutée sur la ligne `stays-expire`.)

Run : `node -e "const c=require('./vercel.json').crons; console.log(c.length, c.at(-1).path, c.at(-1).schedule); console.log(new Set(c.map(x=>x.schedule)).size === c.length ? 'horaires distincts' : 'DOUBLON')"`
Expected : `14 /api/cron/car-outcome-followup 20 6 * * *` puis `horaires distincts`.

- [ ] **Step 9 : `tsc`, suite, commit**

Run : `npx tsc --noEmit && npx vitest run`
Expected : muet, puis `Test Files  N passed`, 0 failed.

```bash
git add src/lib/car-outcome-followup-server.ts src/lib/car-outcome-followup-server.test.ts src/lib/car-invoice-reminder.ts src/app/api/cron/car-outcome-followup/route.ts src/app/api/cron/car-outcome-followup/route.test.ts vercel.json
git commit -m "feat(car-outcome): le cron qui demande au loueur si la location a eu lieu

Deux populations (issue inconnue, issue presumee par le cron de 05:00),
emails J+1 J+4 J+8, escalade ops a J+10 repetee chaque passage. Compteur
ecrit avant l envoi. Route 06:20 UTC protegee par assertCron, 14e cron
de vercel.json. La passe facture est un stub jusqu a la tache suivante."
```

---

### Task 7 : Relance de facture J+15 et remontée ops J+30

**Files:**
- Modify: `src/lib/car-commission.ts` (ajout de `invoiceReminderSubject`, `invoiceReminderBody` après `commissionRequestBody`, ligne 85)
- Modify: `src/lib/car-commission.test.ts` (ajout d'un `describe`)
- Modify: `src/lib/email.ts` (ajout de `sendInvoiceReminder`)
- Replace: `src/lib/car-invoice-reminder.ts` (le stub de la tâche 6)
- Create: `src/lib/car-invoice-reminder.test.ts`

⛔ On ne réutilise PAS `resendCommissionInvoice` : son texte dit « starts today ». ⛔ `sent_at IS NULL` n'entre jamais dans cette passe : une facture numérotée jamais partie est l'état `alert` de `invoiceAdminState`, rattrapé par « Renvoyer » dans l'admin.

- [ ] **Step 1 : Test du texte de rappel**

Ajouter à la fin de `src/lib/car-commission.test.ts` (compléter l'import de tête avec `invoiceReminderSubject, invoiceReminderBody`) :

```ts
describe("invoiceReminderSubject / Body", () => {
  const m = {
    invoiceNumber: "NOVAI-CD-2026-001", partnerName: "Nikos Zorbas", requestId: 63,
    dateFrom: "2026-09-06", dateTo: "2026-09-13", issuedOn: "2026-09-06", amountEur: 24,
    invoiceUrl: "https://crete.direct/en/invoice/tok-neuf", outcomeUrl: "https://crete.direct/en/rental-outcome/tok-63",
  };

  it("sujet : numero et montant", () => {
    expect(invoiceReminderSubject(m)).toBe("Reminder · crete.direct invoice NOVAI-CD-2026-001 (24.00 EUR)");
  });
  it("corps : numero, montant, date d emission, les deux liens", () => {
    const body = invoiceReminderBody(m);
    expect(body).toContain("Hi Nikos,");
    expect(body).toContain("Invoice NOVAI-CD-2026-001 for rental 63 (06/09 to 13/09) was issued on 2026-09-06 and is still open.");
    expect(body).toContain("Amount: 24.00 EUR, payable on receipt.");
    expect(body).toContain("https://crete.direct/en/invoice/tok-neuf");
    expect(body).toContain("https://crete.direct/en/rental-outcome/tok-63?choice=lost");
  });
  it("ne dit JAMAIS « starts today » : ce n est pas le texte de premiere emission", () => {
    expect(invoiceReminderBody(m)).not.toContain("starts today");
  });
  it("laisse partir un loueur qui a deja vire, sans tiret cadratin", () => {
    const body = invoiceReminderBody(m);
    expect(body).toContain("If you already paid by transfer, thank you, please ignore this message.");
    expect(body).not.toContain(String.fromCharCode(0x2014));
    expect(body.endsWith("Kami\ncrete.direct")).toBe(true);
  });
});
```

Run : `npx vitest run src/lib/car-commission.test.ts`
Expected : `does not provide an export named 'invoiceReminderSubject'`.

- [ ] **Step 2 : Les deux fonctions dans `car-commission.ts`**

Ajouter après `commissionRequestBody` (ligne 85) :

```ts
export interface InvoiceReminderMail {
  invoiceNumber: string;
  partnerName: string;
  requestId: number;
  dateFrom: string;
  dateTo: string;
  /** YYYY-MM-DD, la date que la page facture imprime. */
  issuedOn: string;
  amountEur: number;
  /** Lien facture FRAIS : le jeton est tourné avant l'envoi (rotateInvoiceToken). */
  invoiceUrl: string;
  /** Lien d'issue SANS ?choice= : le corps ajoute ?choice=lost. */
  outcomeUrl: string;
}

const ddmm = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function invoiceReminderSubject(m: InvoiceReminderMail): string {
  return `Reminder · crete.direct invoice ${m.invoiceNumber} (${m.amountEur.toFixed(2)} EUR)`;
}

/**
 * Rappel J+15 d'une facture due. Distinct de commissionRequestBody, qui dit
 * « starts today » : quinze jours plus tard, ce serait faux. Le second lien
 * réutilise le jeton d'issue : une facture contestée à J+15 passe par le
 * même circuit qu'une issue déclarée à J+1.
 */
export function invoiceReminderBody(m: InvoiceReminderMail): string {
  const first = m.partnerName.split(" ")[0] || m.partnerName;
  return [
    `Hi ${first},`,
    ``,
    `Invoice ${m.invoiceNumber} for rental ${m.requestId} (${ddmm(m.dateFrom)} to ${ddmm(m.dateTo)}) was issued on ${m.issuedOn} and is still open.`,
    `Amount: ${m.amountEur.toFixed(2)} EUR, payable on receipt.`,
    ``,
    `View and pay the invoice here (card or bank transfer, IBAN on the page):`,
    m.invoiceUrl,
    ``,
    `If you already paid by transfer, thank you, please ignore this message.`,
    `If the rental did not take place, tell us here and the invoice will be cancelled:`,
    `${m.outcomeUrl}?choice=lost`,
    ``,
    `Kami`,
    `crete.direct`,
  ].join("\n");
}
```

Run : `npx vitest run src/lib/car-commission.test.ts`
Expected : `Test Files  1 passed`.

- [ ] **Step 3 : `sendInvoiceReminder` dans `email.ts`**

Compléter l'import existant de `./car-commission` (ligne 8) :

```ts
import {
  commissionRequestSubject, commissionRequestBody, type CommissionMail,
  invoiceReminderSubject, invoiceReminderBody, type InvoiceReminderMail,
} from "./car-commission";
```

et ajouter après `sendPartnerOutcomeQuestion` :

```ts
/** Rappel J+15 d'une facture de commission due (cron car-outcome-followup). Best-effort, `reminded_at` est écrit avant. */
export async function sendInvoiceReminder(partnerEmail: string, m: InvoiceReminderMail): Promise<boolean> {
  try {
    const res = await resend.emails.send({
      from: FROM_EMAIL,
      to: partnerEmail,
      replyTo: "hello@crete.direct",
      subject: invoiceReminderSubject(m),
      text: invoiceReminderBody(m),
    });
    reportSend(res, "rappel de facture loueur");
    return !res.error;
  } catch (e) {
    console.error("[sendInvoiceReminder] échec:", e);
    return false;
  }
}
```

- [ ] **Step 4 : Tests de la passe facture**

Créer `src/lib/car-invoice-reminder.test.ts` :

```ts
// Relance J+15 et remontée J+30 d'une facture de commission due. Ce que ce
// fichier verrouille : jamais une facture jamais envoyée, jamais une payée
// ou avoirée, le jeton tourné et reminded_at écrit AVANT l'email, et un refus
// de rotation qui n'envoie rien.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, rotateInvoiceToken, sendInvoiceReminder, notifyOps } = vi.hoisted(() => ({
  from: vi.fn(),
  rotateInvoiceToken: vi.fn(),
  sendInvoiceReminder: vi.fn(),
  notifyOps: vi.fn(),
}));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("./car-invoice-server", () => ({ rotateInvoiceToken }));
vi.mock("./email", () => ({ sendInvoiceReminder }));
vi.mock("./ops-notify", () => ({ notifyOps, echeance: (n: number) => `+${n}` }));

import { invoiceReminderDue, runInvoiceReminderPass, DAY_MS } from "./car-invoice-reminder";

const NOW = new Date("2026-09-21T06:20:00.000Z");
const INVOICE = {
  id: 1, number: "NOVAI-CD-2026-001", request_id: 63, partner_id: 111, amount_eur: 24,
  issued_at: "2026-09-06T05:00:00.000Z", sent_at: "2026-09-06T05:00:01.000Z",
  paid_at: null as string | null, credited_at: null as string | null, reminded_at: null as string | null,
};
const REQUEST = { id: 63, date_from: "2026-09-06", date_to: "2026-09-13", outcome_token: "tok-63" };
const PARTNER = { name: "Zorbas Rent a Car", email: "info@zorbas.gr", whatsapp: "+306912345678", phone: null };

describe("invoiceReminderDue (pur)", () => {
  const nowMs = NOW.getTime();
  it("J+15 exactement : rappel, pas encore en retard", () => {
    const sent = new Date(nowMs - 15 * DAY_MS).toISOString();
    expect(invoiceReminderDue({ ...INVOICE, sent_at: sent }, nowMs)).toEqual({ remind: true, overdue: false });
    expect(invoiceReminderDue({ ...INVOICE, sent_at: sent }, nowMs - 1000)).toEqual({ remind: false, overdue: false });
  });
  it("J+30 : en retard ; le rappel ne repart pas s il a deja ete envoye", () => {
    const sent = new Date(nowMs - 30 * DAY_MS).toISOString();
    expect(invoiceReminderDue({ ...INVOICE, sent_at: sent, reminded_at: "2026-09-06T00:00:00.000Z" }, nowMs)).toEqual({ remind: false, overdue: true });
    // Premier passage sur une vieille facture : rappel ET retard le meme jour.
    expect(invoiceReminderDue({ ...INVOICE, sent_at: sent }, nowMs)).toEqual({ remind: true, overdue: true });
  });
  it("jamais envoyee, payee ou avoiree : rien", () => {
    expect(invoiceReminderDue({ ...INVOICE, sent_at: null }, nowMs)).toEqual({ remind: false, overdue: false });
    expect(invoiceReminderDue({ ...INVOICE, sent_at: "2026-08-01T00:00:00.000Z", paid_at: "2026-08-02T00:00:00.000Z" }, nowMs)).toEqual({ remind: false, overdue: false });
    expect(invoiceReminderDue({ ...INVOICE, sent_at: "2026-08-01T00:00:00.000Z", credited_at: "2026-08-02T00:00:00.000Z" }, nowMs)).toEqual({ remind: false, overdue: false });
  });
});

interface Wiring { filters: string[]; updates: Array<{ table: string; patch: Record<string, unknown> }> }

function wiring(opts: { invoices?: unknown[]; request?: unknown; partner?: unknown; updateError?: { message: string } } = {}): Wiring {
  const w: Wiring = { filters: [], updates: [] };
  from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    const push = (s: string) => { w.filters.push(`${table}:${s}`); return chain; };
    Object.assign(chain, {
      eq: (c: string, v: unknown) => push(`eq:${c}:${v}`),
      is: (c: string, v: unknown) => push(`is:${c}:${v}`),
      not: (c: string, op: string, v: unknown) => push(`not:${c}:${op}:${v}`),
      lte: async (c: string, v: unknown) => { push(`lte:${c}:${v}`); return { data: opts.invoices ?? [INVOICE], error: null }; },
      maybeSingle: async () => ({ data: table === "car_partners" ? ("partner" in opts ? opts.partner : PARTNER) : ("request" in opts ? opts.request : REQUEST) }),
      select: async () => (opts.updateError ? { data: null, error: opts.updateError } : { data: [{ id: 1 }], error: null }),
    });
    return {
      select: () => chain,
      update: (patch: Record<string, unknown>) => { w.updates.push({ table, patch }); return chain; },
    };
  });
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
  rotateInvoiceToken.mockResolvedValue("tok-neuf");
  sendInvoiceReminder.mockResolvedValue(true);
  notifyOps.mockResolvedValue(true);
});

describe("runInvoiceReminderPass · J+15", () => {
  it("selectionne les factures envoyees, non payees, non avoirees, envoyees depuis 15 j", async () => {
    const w = wiring();
    await runInvoiceReminderPass(NOW);
    expect(w.filters).toEqual(expect.arrayContaining([
      "car_commission_invoices:not:sent_at:is:null",
      "car_commission_invoices:is:paid_at:null",
      "car_commission_invoices:is:credited_at:null",
      `car_commission_invoices:lte:sent_at:${new Date(NOW.getTime() - 15 * DAY_MS).toISOString()}`,
    ]));
  });

  it("tourne le jeton, ecrit reminded_at, PUIS envoie, dans cet ordre", async () => {
    const w = wiring();
    const res = await runInvoiceReminderPass(NOW);
    expect(res.reminded).toBe(1);
    expect(rotateInvoiceToken).toHaveBeenCalledWith(1);
    const reminded = w.updates.find((u) => u.table === "car_commission_invoices");
    expect(reminded?.patch).toEqual({ reminded_at: NOW.toISOString() });
    expect(rotateInvoiceToken.mock.invocationCallOrder[0]).toBeLessThan(sendInvoiceReminder.mock.invocationCallOrder[0]);
    expect(from.mock.invocationCallOrder.at(-1)!).toBeLessThan(sendInvoiceReminder.mock.invocationCallOrder[0]);
    const [email, mail] = sendInvoiceReminder.mock.calls[0];
    expect(email).toBe("info@zorbas.gr");
    expect(mail).toMatchObject({ invoiceNumber: "NOVAI-CD-2026-001", amountEur: 24, requestId: 63, issuedOn: "2026-09-06" });
    expect(mail.invoiceUrl).toContain("/en/invoice/tok-neuf");
    expect(mail.outcomeUrl).toContain("/en/rental-outcome/tok-63");
  });

  it("refus de rotateInvoiceToken : aucun email, reminded_at intact", async () => {
    const w = wiring();
    rotateInvoiceToken.mockRejectedValueOnce(new Error("rotateInvoiceToken(1) refuse par la base"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await runInvoiceReminderPass(NOW);
    expect(res.reminded).toBe(0);
    expect(sendInvoiceReminder).not.toHaveBeenCalled();
    expect(w.updates.find((u) => u.table === "car_commission_invoices")).toBeUndefined();
    errSpy.mockRestore();
  });

  it("reminded_at refuse par la base : aucun email", async () => {
    wiring({ updateError: { message: "permission denied" } });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await runInvoiceReminderPass(NOW);
    expect(sendInvoiceReminder).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("deja rappelee : pas de second rappel", async () => {
    wiring({ invoices: [{ ...INVOICE, reminded_at: "2026-09-21T06:20:00.000Z" }] });
    await runInvoiceReminderPass(NOW);
    expect(sendInvoiceReminder).not.toHaveBeenCalled();
  });

  it("demande sans jeton d issue : en genere un et le persiste avant l email", async () => {
    const w = wiring({ request: { ...REQUEST, outcome_token: null } });
    await runInvoiceReminderPass(NOW);
    const tokenWrite = w.updates.find((u) => u.table === "car_requests");
    expect(typeof tokenWrite?.patch.outcome_token).toBe("string");
    expect(sendInvoiceReminder.mock.calls[0][1].outcomeUrl).toContain(String(tokenWrite?.patch.outcome_token));
  });

  it("loueur sans email : rien n est tourne ni ecrit", async () => {
    const w = wiring({ partner: { ...PARTNER, email: null } });
    await runInvoiceReminderPass(NOW);
    expect(rotateInvoiceToken).not.toHaveBeenCalled();
    expect(w.updates).toHaveLength(0);
  });
});

describe("runInvoiceReminderPass · J+30", () => {
  const OLD = { ...INVOICE, sent_at: "2026-08-20T05:00:01.000Z", reminded_at: "2026-09-04T06:20:00.000Z" };

  it("previent les ops chaque passage, non silencieux, loueur nomme, WhatsApp, due +3", async () => {
    wiring({ invoices: [OLD] });
    const res = await runInvoiceReminderPass(NOW);
    expect(res.overdue).toBe(1);
    expect(sendInvoiceReminder).not.toHaveBeenCalled();
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toBe("Facture NOVAI-CD-2026-001 due depuis 30 j · Zorbas Rent a Car · 24 €");
    expect(n.lines.some((l: string) => l.includes("wa.me/306912345678"))).toBe(true);
    expect(n.action).toMatch(/WhatsApp/);
    expect(n.due).toBe("+3");
    expect(n.url).toContain("/admin/car-rental");
    expect(n.silent).not.toBe(true);
  });

  it("plusieurs factures en retard : un seul message, une ligne chacune", async () => {
    wiring({ invoices: [OLD, { ...OLD, id: 2, number: "NOVAI-CD-2026-002", amount_eur: 32 }] });
    await runInvoiceReminderPass(NOW);
    expect(notifyOps).toHaveBeenCalledTimes(1);
    const n = notifyOps.mock.calls[0][0];
    expect(n.title).toBe("2 facture(s) de commission due(s) depuis 30 j");
    expect(n.lines.filter((l: string) => l.startsWith("NOVAI-CD-2026-")).length).toBe(2);
  });

  it("Telegram en panne ne fait pas tomber la passe", async () => {
    wiring({ invoices: [OLD] });
    notifyOps.mockRejectedValueOnce(new Error("telegram down"));
    await expect(runInvoiceReminderPass(NOW)).resolves.toMatchObject({ overdue: 1 });
  });

  it("rien de du : silence", async () => {
    wiring({ invoices: [] });
    await runInvoiceReminderPass(NOW);
    expect(notifyOps).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5 : Lancer pour voir échouer**

Run : `npx vitest run src/lib/car-invoice-reminder.test.ts`
Expected : `does not provide an export named 'invoiceReminderDue'`.

- [ ] **Step 6 : Remplacer intégralement `src/lib/car-invoice-reminder.ts`**

```ts
// Relance d'une facture de commission due : rappel email à J+15 (une fois),
// remontée ops à J+30 (chaque passage tant que due). Seconde passe du cron
// car-outcome-followup.
//
// ⛔ sent_at IS NULL n'entre JAMAIS ici : une facture numérotée jamais partie
// est l'état `alert` de invoiceAdminState, rattrapée par « Renvoyer » dans
// l'admin. ⛔ Pas resendCommissionInvoice : son texte dit « starts today ».
import { supabaseAdmin as supabase } from "./supabase-admin";
import { rotateInvoiceToken } from "./car-invoice-server";
import { newToken } from "./car-quote";
import { siteBase, type InvoiceReminderMail } from "./car-commission";
import { waHref } from "./car-admin";
import { notifyOps, echeance, type OpsNotice } from "./ops-notify";
import { ddmm } from "./car-outcome-followup";

export const DAY_MS = 86_400_000;
export const REMINDER_DAYS = 15;
export const OVERDUE_DAYS = 30;

export interface ReminderCandidate {
  sent_at: string | null;
  paid_at: string | null;
  credited_at: string | null;
  reminded_at?: string | null;
}

/** Pur : rappel J+15 une seule fois, retard J+30 tant que due. */
export function invoiceReminderDue(inv: ReminderCandidate, nowMs: number): { remind: boolean; overdue: boolean } {
  if (!inv.sent_at || inv.paid_at || inv.credited_at) return { remind: false, overdue: false };
  const sentMs = new Date(inv.sent_at).getTime();
  return {
    remind: !inv.reminded_at && sentMs + REMINDER_DAYS * DAY_MS <= nowMs,
    overdue: sentMs + OVERDUE_DAYS * DAY_MS <= nowMs,
  };
}

interface ReminderInvoice extends ReminderCandidate {
  id: number;
  number: string;
  request_id: number;
  partner_id: number;
  amount_eur: number;
  issued_at: string;
  sent_at: string;
}

interface ReminderRequest {
  id: number;
  date_from: string;
  date_to: string;
  outcome_token: string | null;
}

interface ReminderPartner {
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
}

export interface InvoiceReminderResult {
  reminded: number;
  overdue: number;
}

async function ops(n: OpsNotice): Promise<void> {
  try {
    await notifyOps(n);
  } catch (e) {
    console.error("[car/invoice-reminder] notification d exploitation echouee", e);
  }
}

const money = (n: number): string => Number(n).toFixed(2).replace(/\.00$/, "");

/**
 * Jeton d'issue STABLE de la demande : réutilisé s'il existe, sinon généré
 * et persisté AVANT l'email, sinon le lien « the invoice will be cancelled »
 * du rappel serait mort.
 */
async function ensureOutcomeToken(req: ReminderRequest): Promise<string | null> {
  if (req.outcome_token) return req.outcome_token;
  const token = newToken();
  const { error } = await supabase.from("car_requests").update({ outcome_token: token }).eq("id", req.id).select();
  if (error) {
    console.error("[car/invoice-reminder] jeton d issue non enregistre", { requestId: req.id, error: error.message });
    return null;
  }
  return token;
}

export async function runInvoiceReminderPass(now: Date): Promise<InvoiceReminderResult> {
  const nowMs = now.getTime();
  const { sendInvoiceReminder } = await import("./email");
  const cutoff = new Date(nowMs - REMINDER_DAYS * DAY_MS).toISOString();

  const { data } = await supabase.from("car_commission_invoices")
    .select("id, number, request_id, partner_id, amount_eur, issued_at, sent_at, paid_at, credited_at, reminded_at")
    .not("sent_at", "is", null)
    .is("paid_at", null)
    .is("credited_at", null)
    .lte("sent_at", cutoff);

  const result: InvoiceReminderResult = { reminded: 0, overdue: 0 };
  const overdueLines: string[] = [];
  let overdueTitle = "";

  for (const inv of (data ?? []) as ReminderInvoice[]) {
    const due = invoiceReminderDue(inv, nowMs);
    if (!due.remind && !due.overdue) continue;

    const { data: partner } = await supabase.from("car_partners")
      .select("name, email, whatsapp, phone").eq("id", inv.partner_id).maybeSingle();
    const p = (partner as ReminderPartner | null) ?? null;
    const nom = p?.name ?? `loueur ${inv.partner_id}`;

    if (due.remind) {
      const { data: request } = await supabase.from("car_requests")
        .select("id, date_from, date_to, outcome_token").eq("id", inv.request_id).maybeSingle();
      const req = (request as ReminderRequest | null) ?? null;
      if (!p?.email || !req) {
        console.error("[car/invoice-reminder] rappel impossible", { invoice: inv.number, partnerWithoutEmail: !p?.email, requestMissing: !req });
      } else {
        await remind(inv, req, p.email, nom, now, sendInvoiceReminder, result);
      }
    }

    if (due.overdue) {
      result.overdue += 1;
      overdueTitle = `Facture ${inv.number} due depuis ${OVERDUE_DAYS} j · ${nom} · ${money(inv.amount_eur)} €`;
      overdueLines.push(`${inv.number} · ${nom} · ${money(inv.amount_eur)} € · envoyée le ${ddmm(inv.sent_at.slice(0, 10))}`);
      const numero = p?.whatsapp ?? p?.phone;
      if (numero) {
        const first = (p?.name ?? "").split(" ")[0] || "there";
        overdueLines.push(`   WhatsApp : ${waHref(numero, `Hi ${first}, crete.direct here. Invoice ${inv.number} (${inv.amount_eur} EUR) is still open, can you have a look? Thanks!`)}`);
      }
    }
  }

  // Volontairement répété chaque passage tant que due : la ligne se tait dès
  // que la facture est payée ou avoirée, la sortie du bruit est évidente.
  if (overdueLines.length > 0) {
    await ops({
      title: result.overdue === 1 ? overdueTitle : `${result.overdue} facture(s) de commission due(s) depuis ${OVERDUE_DAYS} j`,
      lines: overdueLines,
      action: "Appeler ou WhatsApp le loueur, lien ci-dessus. Marquer « commission encaissée » dans le back-office dès réception du virement.",
      due: echeance(3),
      url: `${siteBase()}/admin/car-rental`,
    });
  }
  return result;
}

async function remind(
  inv: ReminderInvoice,
  req: ReminderRequest,
  email: string,
  nom: string,
  now: Date,
  send: (email: string, m: InvoiceReminderMail) => Promise<boolean>,
  result: InvoiceReminderResult,
): Promise<void> {
  // ⛔ AVANT l'email, et le refus arrête tout : le clair n'est pas relisible
  // (car-invoice-server.ts), un jeton non enregistré est un lien mort.
  let token: string;
  try {
    token = await rotateInvoiceToken(inv.id);
  } catch (err) {
    console.error("[car/invoice-reminder] rotation du jeton refusee, aucun rappel", { invoice: inv.number, err });
    return;
  }
  const outcomeToken = await ensureOutcomeToken(req);
  if (!outcomeToken) return;

  // reminded_at AVANT l'envoi : un refus Resend ne provoque pas un second
  // rappel le lendemain, la facture passera à J+30 chez les ops.
  const { error } = await supabase.from("car_commission_invoices")
    .update({ reminded_at: now.toISOString() }).eq("id", inv.id).select();
  if (error) {
    console.error("[car/invoice-reminder] reminded_at refuse par la base, aucun rappel", { invoice: inv.number, error: error.message });
    return;
  }

  const ok = await send(email, {
    invoiceNumber: inv.number,
    partnerName: nom,
    requestId: req.id,
    dateFrom: req.date_from,
    dateTo: req.date_to,
    issuedOn: inv.issued_at.slice(0, 10),
    amountEur: Number(inv.amount_eur),
    invoiceUrl: `${siteBase()}/en/invoice/${token}`,
    outcomeUrl: `${siteBase()}/en/rental-outcome/${outcomeToken}`,
  });
  if (ok) result.reminded += 1;
  else console.error("[car/invoice-reminder] rappel refuse par Resend", { invoice: inv.number });
}
```

- [ ] **Step 7 : Lancer les tests**

Run : `npx vitest run src/lib/car-invoice-reminder.test.ts src/app/api/cron/car-outcome-followup/route.test.ts`
Expected : `Test Files  2 passed` (15 tests dans le premier, 3 dans le second).

- [ ] **Step 8 : `tsc`, suite, commit**

Run : `npx tsc --noEmit && npx vitest run && npm run check:da`
Expected : muet, `0 failed`, pas de nouvelle violation.

```bash
git add src/lib/car-commission.ts src/lib/car-commission.test.ts src/lib/email.ts src/lib/car-invoice-reminder.ts src/lib/car-invoice-reminder.test.ts
git commit -m "feat(car-outcome): une facture due est rappelee a J+15 et remontee aux ops a J+30

Nouveau texte invoiceReminderBody, jamais « starts today ». Jeton de facture
tourne et reminded_at ecrit avant l email. Jamais une facture jamais partie,
jamais une payee ou avoiree. Le lien d annulation reutilise le jeton d issue."
```

---

### Task 8 : Back-office (badge avec source, ligne d'état), script `check:car-admin`, planche visuelle

**Files:**
- Modify: `src/app/admin/car-rental/requests-table.tsx:117-124` (`outcomeBadge`) et `:373` (appel)
- Modify: `scripts/check-car-admin.mjs` (libellés de badge)
- Create: `docs/mockups/rental-outcome.html`

Le bouton « Loué / Perdu » demandé par la spec **existe déjà** (lignes 467 à 501, formulaires liés à `setOutcome`). On ne le duplique pas. Pas de bouton « renvoyer la question » : le cron le fait. Pas de nouveau filtre : la notification ops porte le lien.

- [ ] **Step 1 : Assertions de script d'abord**

Dans `scripts/check-car-admin.mjs`, ajouter l'import (après celui de `car-admin.ts`) :

```js
import { outcomeBadgeLabel, followupStatusLine } from "../src/lib/car-outcome-followup.ts";
```

et, après le bloc `OUTCOME_SOURCES` de la tâche 1 :

```js
// Libellés de badge : une présomption du cron et une confirmation du loueur
// ne se lisent plus pareil. Une source par entrée de OUTCOME_SOURCES.
for (const source of OUTCOME_SOURCES) {
  ok(`badge louée · ${source} porte la source`, (outcomeBadgeLabel("rented", source) ?? "").startsWith("louée · "));
  ok(`badge perdue · ${source} porte la source`, (outcomeBadgeLabel("lost", source) ?? "").startsWith("perdue · "));
}
ok("badge présumée J1", outcomeBadgeLabel("rented", "auto") === "louée · présumée J1");
ok("badge confirmée loueur", outcomeBadgeLabel("rented", "partner_link") === "louée · confirmée loueur");
ok("badge sans source (pré-migration) reste lisible", outcomeBadgeLabel("rented", null) === "louée");
ok("badge sans issue -> null", outcomeBadgeLabel(null, null) === null);
ok("ligne d'état absente avant le premier envoi", followupStatusLine({ date_to: "2026-09-15" }) === null);
ok("ligne d'état compte les envois", /2\/3 envoyées/.test(followupStatusLine({ date_to: "2026-09-15", outcome_followup_count: 2, outcome_followup_sent_at: "2026-09-12T06:20:00.000Z" })));
ok("ligne d'état : l'escalade prime", /escaladée/.test(followupStatusLine({ date_to: "2026-09-15", outcome_followup_count: 3, outcome_followup_escalated_at: "2026-09-18T06:20:00.000Z" })));
```

Run : `npm run check:car-admin`
Expected : toutes les lignes `ok - ...` (le module de la tâche 3 existe déjà), code 0. Si une ligne `FAIL` apparaît, c'est le libellé de `car-outcome-followup.ts` qui a dérivé.

- [ ] **Step 2 : Le badge et la ligne d'état dans `requests-table.tsx`**

Ajouter l'import :

```ts
import { outcomeBadgeLabel, followupStatusLine } from "@/lib/car-outcome-followup";
```

Remplacer la fonction `outcomeBadge` (lignes 117 à 124) par :

```tsx
/**
 * Issue ET sa source : « louée · présumée J1 » (le cron a facturé sans
 * confirmation) ne se lit plus comme « louée · confirmée loueur ». Sous le
 * badge, l'état de la question posée au loueur, données déjà chargées par le
 * select("*") de page.tsx, aucune requête de plus.
 */
function outcomeBadge(r: AdminRequest) {
  const label = outcomeBadgeLabel(r.outcome, r.outcome_source);
  const status = followupStatusLine(r);
  if (!label && !status) return null;
  const presumed = r.outcome === "rented" && r.outcome_source === "auto";
  return (
    <>
      {label ? (
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
          r.outcome === "rented"
            ? presumed ? "border border-olive bg-white text-olive" : "bg-olive text-white"
            : "bg-text-light text-white"
        }`}>
          {label}
        </span>
      ) : null}
      {status ? <span className="text-xs text-text-muted">{status}</span> : null}
    </>
  );
}
```

Et l'appel, ligne 373 : `{outcomeBadge(r.outcome)}` devient `{outcomeBadge(r)}`.

- [ ] **Step 3 : `tsc` et `check:da`**

Run : `npx tsc --noEmit && npm run check:da && npm run check:car-admin`
Expected : les trois muets ou verts. Une erreur `Property 'outcome_source' does not exist on type 'AdminRequest'` signifierait que la tâche 1 n'a pas été appliquée.

- [ ] **Step 4 : La planche visuelle (règle du dépôt : visuel AVANT push)**

Créer `docs/mockups/rental-outcome.html`, planche statique des états de la page loueur et du badge admin, ouverte dans un navigateur avant le ship :

```html
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Planche · page d'issue loueur et badge admin</title>
<style>
  body { font-family: 'Baloo 2', system-ui, sans-serif; color: #0B3954; background: #F6FBFC; margin: 0; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 24px; }
  h2 { font-size: 14px; color: #5C7886; margin: 32px 0 12px; text-transform: uppercase; letter-spacing: .04em; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
  .card { background: #fff; border: 1px solid #DCE9EE; border-radius: 20px; padding: 26px 24px; }
  .card p.head { margin: 0 0 4px; font-weight: 700; }
  .card p.sub { margin: 0 0 20px; color: #5C7886; }
  .option { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; border: 1px solid #DCE9EE; margin-bottom: 10px; }
  .notice { margin: 0 0 14px; padding: 16px 18px; border-radius: 12px; font-size: 15px; line-height: 1.6; background: #F6FBFC; }
  .ok { background: #ECFDF5; color: #065F46; }
  .warn { background: #FEF9EC; color: #92400E; }
  button { width: 100%; padding: 14px 20px; border-radius: 999px; border: none; background: #008C9E; color: #fff; font-size: 16px; font-weight: 700; }
  .badges { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .badge { border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 700; }
  .olive { background: #6B8E23; color: #fff; }
  .olive-outline { border: 1px solid #6B8E23; background: #fff; color: #6B8E23; }
  .grey { background: #94A3B8; color: #fff; }
  .muted { font-size: 12px; color: #5C7886; }
  .email { white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 13px; line-height: 1.5; }
</style>
</head>
<body>
<h1>Page /en/rental-outcome/[token] · états, et badge admin</h1>

<h2>1. Formulaire, ?choice=lost pré-coché, population B (facture émise)</h2>
<div class="grid">
  <div class="card">
    <p class="head">Rental 33 · 08/09 to 15/09 · Heraklion airport · Toyota Yaris automatic</p>
    <p class="sub">Traveller: Marie D. · Price accepted: 320.00 EUR</p>
    <label class="option"><input type="radio" name="c1"> Yes, it took place</label>
    <label class="option"><input type="radio" name="c1" checked> No, it did not happen</label>
    <p class="notice">Invoice NOVAI-CD-2026-002 (32.00 EUR) was issued on the first day of the rental. If it did not take place, confirming cancels it by credit note, nothing to pay.</p>
    <button>Confirm</button>
  </div>
  <div class="card">
    <p class="head">Rental 25 · 01/08 to 08/08 · Chania airport</p>
    <p class="sub">Traveller: Paul M. · Price accepted: 210.00 EUR</p>
    <label class="option"><input type="radio" name="c2" checked> Yes, it took place</label>
    <label class="option"><input type="radio" name="c2"> No, it did not happen</label>
    <button>Confirm</button>
  </div>
</div>

<h2>2. Après le POST</h2>
<div class="grid">
  <div class="card"><p class="notice ok">Thank you, recorded: the rental did not take place. Invoice NOVAI-CD-2026-002 is cancelled by credit note NOVAI-CD-2026-002-A, nothing to pay.</p></div>
  <div class="card"><p class="notice ok">Thank you, recorded: the rental took place. If a commission is due, the invoice follows by email.</p></div>
  <div class="card"><p class="notice">Already recorded on 2026-09-10: the rental did not take place. If this is wrong, reply to hello@crete.direct.</p></div>
  <div class="card"><p class="notice warn">This invoice is already paid, so it cannot be cancelled here. Reply to hello@crete.direct and we will refund it.</p></div>
  <div class="card"><p class="notice warn">Sorry, this request was cancelled. Nothing to confirm.</p></div>
</div>

<h2>3. Badge admin (requests-table.tsx) et ligne d'état</h2>
<div class="card">
  <div class="badges"><span class="badge olive-outline">louée · présumée J1</span><span class="muted">question d'issue : 2/3 envoyées, dernière le 12/09/2026</span></div>
  <div class="badges" style="margin-top:10px"><span class="badge olive">louée · confirmée loueur</span></div>
  <div class="badges" style="margin-top:10px"><span class="badge olive">louée · admin</span></div>
  <div class="badges" style="margin-top:10px"><span class="badge grey">perdue · loueur</span></div>
  <div class="badges" style="margin-top:10px"><span class="muted">question d'issue : escaladée le 18/09/2026</span> <span class="muted">(issue encore nulle : pas de badge, la ligne d'état seule)</span></div>
</div>

<h2>4. Email 3 (population A)</h2>
<div class="card email">Subject: Last reminder: crete.direct · did rental 25 take place? One click

Hi Nikos,

Rental 25 · 01/08 to 08/08 · Chania airport
Traveller: Paul M. · Price accepted: 210.00 EUR

Did this rental take place?

  Yes, it took place:      https://crete.direct/en/rental-outcome/{token}?choice=rented
  No, it did not happen:   https://crete.direct/en/rental-outcome/{token}?choice=lost

If it took place, the 10% commission invoice (21.00 EUR) follows automatically.

Without an answer by 18/08 we will call you.

Kami
crete.direct</div>
</body>
</html>
```

Run : `start docs/mockups/rental-outcome.html` (Windows) et regarder les cinq états et les badges. Vérifier à l'œil : un seul bouton par formulaire, le choix pré-coché lisible, le badge « présumée J1 » se distingue de « confirmée loueur » (contour contre plein).
Expected : la planche s'ouvre, aucun état ne montre deux boutons, aucun texte ne contient de tiret cadratin (`grep -cP '\x{2014}' docs/mockups/rental-outcome.html` rend `0`).

- [ ] **Step 5 : Commit**

```bash
git add src/app/admin/car-rental/requests-table.tsx scripts/check-car-admin.mjs docs/mockups/rental-outcome.html
git commit -m "feat(car-outcome): le back-office distingue une issue presumee d une issue confirmee

Badge avec source, ligne d etat de la question posee au loueur sous le badge,
zero requete de plus. Planche visuelle des etats de la page loueur."
```

---

### Task 9 : Vert complet, `ship`, puis rattrapage manuel des quatre demandes

**Files:** aucun fichier de code. Cette tâche mêle des commandes (vérification, ship) et des **actions humaines** sur la base de production et le back-office, marquées comme telles. Rien ici ne s'exécute depuis un test.

- [ ] **Step 1 : ACTION HUMAINE, AVANT TOUT LE RESTE ET AVANT LE 08/09 : la fiche légale du loueur de la demande 33**

Qui : François, dans l'onglet Partenaires du back-office (`/admin/car-rental?tab=partners`), fiche du loueur qui a remporté la demande 33. Butoir : **07/09/2026 avant 05:00 UTC du 08/09** (le cron de facturation tourne à 05:00 UTC).

Quoi : les six champs de `REQUIRED_BILLING_FIELDS` (`src/lib/car-invoice.ts`) doivent être remplis et le numéro de TVA avoir la forme `EL` + chiffres : `legal_name`, `address_line`, `postal_code`, `city`, `country`, `vat_id`. Le formulaire « identité de facturation » de la fiche partenaire nomme ce qui manque (`identityStatus`).

Pourquoi : c'est cette fiche qui décide si `NOVAI-CD-2026-002` (32 €) part le 08/09 à 05:00 UTC. Ne dépend d'aucun code de ce plan. Si elle reste incomplète, la ligne Telegram du matin dira `#33 <loueur> : fiche legale incomplete (<champs>)` chaque jour jusqu'à complétion, sans perte : le `<=` du cron rattrape.

Preuve attendue : le 08/09 après 05:00 UTC, `select number from car_commission_invoices where request_id = 33;` rend une ligne. Sinon, le motif est dans le fil ops.

- [ ] **Step 2 : Vert complet local**

Run : `npx vitest run && npm run check`
Expected : `Test Files  N passed`, 0 failed ; `npm run check` termine sur `tsc --noEmit` muet, code 0. Si `check:da` remonte une nouvelle violation R11, c'est un tiret cadratin introduit par ce chantier : le remplacer par `:` ou `·`, jamais l'ajouter au baseline.

- [ ] **Step 3 : Ship (jamais `main`)**

Run :
```bash
git status --short
npm run ship
```
Expected : `git status` vide ; `ship` affiche le vert de `npm run check`, intègre `origin/master`, puis `N commit(s) en attente sur master -> partiront au deploy de 20h Athens`. Aucun `git push origin master:main` : la promotion prod est l'Action `daily-deploy` de 20h Athènes. Le nouveau cron de `vercel.json` n'est pris en compte par Vercel qu'à ce déploiement de `main`.

- [ ] **Step 4 : ACTION HUMAINE : appliquer la migration sur la base de production**

Qui : François, depuis le VPS (la base est un Postgres self-hosted derrière PostgREST, `SUPABASE_SERVICE_KEY` n'existe que sur Vercel). Butoir : **avant le déploiement de 20h Athènes du jour du ship**, sinon le cron de 06:20 UTC du lendemain lit des colonnes absentes et sa requête échoue (PostgREST rend `error`, la passe journalise et rend des compteurs à zéro, rien n'est cassé mais rien ne part).

Run (sur le VPS, adapter le nom de base et l'utilisateur à ceux du runbook du serveur) :
```bash
psql "$DATABASE_URL" -f supabase/migrations/20260908_car_outcome_followup.sql
psql "$DATABASE_URL" -c "select column_name from information_schema.columns where table_name = 'car_requests' and column_name like 'outcome_%' order by 1;"
psql "$DATABASE_URL" -c "select id, outcome, outcome_source, outcome_at from car_requests where outcome is not null order by id;"
```
Expected : `ALTER TABLE`, `UPDATE 6` (les 6 issues existantes : 2 `rented`, 4 `lost`), `UPDATE 0` ou `UPDATE 1` pour le rétro-remplissage `auto`, `NOTIFY` ; la deuxième requête liste `outcome`, `outcome_at`, `outcome_followup_count`, `outcome_followup_escalated_at`, `outcome_followup_sent_at`, `outcome_source`, `outcome_token` ; la troisième montre `outcome_source` rempli sur chaque ligne. Si la 63 porte `auto`, elle recevra la question de confirmation à J+1 après son `date_to` : premier test réel du circuit, c'est voulu.

- [ ] **Step 5 : ACTION HUMAINE : la requête de la spec (section 5), une seule fois**

Run (sur le VPS) :
```sql
select r.id, r.status, r.date_from, r.date_to, r.quoted_price, r.quoted_by_partner_id,
       r.outcome, r.booking_paid_at, p.name, p.vat_id, p.legal_name, p.address_line,
       p.postal_code, p.city, p.country, i.number
from car_requests r
join car_partners p on p.id = r.quoted_by_partner_id
left join car_commission_invoices i on i.request_id = r.id
where r.id in (25, 33, 48, 62, 63);
```
Expected : cinq lignes. Puis, ligne par ligne, appliquer la règle en trois cas selon `date_from` :

| Cas | Ce que le cron actuel fait | Action |
|---|---|---|
| `date_from > 07/09` (33 à partir du 08/09, vraisemblablement 48 et 62) | facture au J1 à 05:00 UTC **si** `partnerBillingIdentity` est complète | **Aucune écriture.** Vérifier la fiche légale (Step 1). Fiche incomplète = ligne « NON facturée » chaque matin sur Telegram jusqu'à complétion, sans perte |
| `05/08 <= date_from <= 07/09` sans facture (`i.number` vide) | la ligne repasse chaque nuit, écartée pour un motif nommé sur Telegram | Lire le motif dans le fil ops, corriger la fiche (ou le taux), le cron facture la nuit suivante. Rien à poser à la main |
| `date_from < 05/08` (hypothèse pour la 25) | jamais reprise, sous `COMMISSION_INVOICING_START` | Si `date_to` est passée : bouton « Loué » avec le montant (`quoted_price`) dans l'admin, `setOutcome` → `applyOutcome(admin)` → `requestCommission` émet la facture, ou « Perdu ». Si la location est encore à venir : ne rien faire, le nouveau cron posera la question au loueur à J+1 |

Après mise en service, toute ligne dont `date_to` est passée est rattrapée d'un coup par le premier passage du cron de 06:20 UTC (`date_to < today`, pas `=`) : c'est le rattrapage groupé voulu par la spec, y compris la 63 si sa location est finie.

- [ ] **Step 6 : ACTION HUMAINE : lecture du lendemain**

Le lendemain du déploiement, après 06:20 UTC :

Run (sur le VPS) :
```sql
select id, outcome, outcome_source, outcome_followup_count, outcome_followup_sent_at, outcome_token is not null as has_token
from car_requests where outcome_followup_count > 0 or outcome_followup_escalated_at is not null order by id;
```
Expected : une ligne par demande de populations A et B dont `date_to` est passée, `outcome_followup_count = 1`, `has_token = true`, et autant d'emails partis chez les loueurs (visibles dans le tableau Resend). Le fil ops porte, s'il y a lieu, `Issue de location inconnue à J+10 : N demande(s)` (lignes dont `date_to + 10 j` est déjà passé au premier passage : elles sautent directement à l'escalade après leurs trois emails, un par passage à J+0, J+3, J+7 depuis la mise en service) et `N loueur(s) sans email`.

Pour `NOVAI-CD-2026-001` (demande 63, envoyée le 06/09) : si le chantier est en prod avant le 21/09, le cron la rappelle tout seul ce jour-là ; sinon le premier passage la rattrape (`sent_at + 15 j <= now`). Aucune action manuelle.

- [ ] **Step 7 : Mesure de succès à J+14 (spec section 10), à poser à la main dans le fil ops**

```sql
-- 0 attendu : issue inconnue ou seulement présumée au-delà de J+10
select count(*) from car_requests
where status = 'accepted' and booking_paid_at is null
  and date_to + 10 < current_date
  and (outcome is null or outcome_source = 'auto');

-- 0 attendu : louée sans facture dans les 48 h (hors tunnel voyageur)
select r.id from car_requests r
left join car_commission_invoices i on i.request_id = r.id
where r.outcome = 'rented' and r.booking_paid_at is null
  and r.outcome_at < now() - interval '48 hours'
  and (i.id is null or i.issued_at > r.outcome_at + interval '48 hours');

-- suivi : factures dues depuis plus de 30 j
select number, amount_eur, sent_at from car_commission_invoices
where paid_at is null and credited_at is null and sent_at < now() - interval '30 days';

-- part des issues posées par le loueur, cible > 60 % à 30 jours
select outcome_source, count(*) from car_requests
where outcome_at > now() - interval '30 days' group by 1;
```
Expected : première requête à 0 ; deuxième à 0 sauf lignes bloquées par une fiche loueur incomplète (déjà nommées chaque matin) ; part `partner_link` > 60 %, sinon l'email n'est pas lu et il faut regarder l'objet, pas le calendrier.

---

## Auto-revue du plan (faite avant remise)

**1. Couverture de la spec, section par section :**
- 0 (recadrage) : repris en tête de la tâche 9, aucune écriture sur 33/48/62.
- 1 (objectif, non-objectifs) : rien d'implémenté hors périmètre (pas de PDF, pas de WhatsApp automatique, pas de remboursement Stripe, pas de vérification voyageur).
- 2.1 (nouvelle route, pattern route mince + serveur + pur) : tâches 3, 4, 6. 2.2 (horaire `20 6 * * *`, `todayAthens`) : tâche 6 steps 6 et 8, `todayAthens(now)` dans la passe. 2.3 (populations A et B, exclusions) : tâche 6 step 3. 2.4 (calendrier, compteur avant envoi, `reportSend`) : tâches 3 et 6, `sendPartnerOutcomeQuestion` en tâche 4. 2.5 (notification J+10 : title, lines, action, `waHref`, `echeance(2)`, url) : tâche 6.
- 3.1 (jeton stable en clair) : migration tâche 1, `row.outcome_token || newToken()` tâche 6. 3.2 (page, POST, 303, noindex) : tâche 5. 3.3 (`applyOutcome`, `setOutcome` → admin, cron `outcome_source: 'auto'`) : tâche 2. 3.4 (12 cases) : tâche 3 (pure) et tâche 4 (exécution, avoir automatique via `creditCommissionInvoice(id, reason, 'partner_link')`, motif « Reported by the rental company via the outcome link on <date> »). 3.5 (email, sujets `Reminder:` / `Last reminder:`, ligne d'appel sur le 3e) : tâche 3.
- 4 (back-office : `applyOutcome(admin)`, badge avec source, ligne d'état, pas de bouton en plus) : tâches 2 et 8.
- 5 (rattrapage, requête SQL, 3 cas, fiche du loueur de la 33 avant le 08/09, rétro-remplissage de la 63) : tâche 9 steps 1, 4, 5 ; migration tâche 1 avec la règle d'heure (la règle « à la minute près » de la spec ne sépare pas cron et clic admin, les deux facturent dans la seconde).
- 6 (rappel J+15 avec `rotateInvoiceToken`, `reminded_at` avant l'envoi, `invoiceReminderBody`, jamais `resendCommissionInvoice`, `sent_at IS NULL` exclu, ops J+30 avec `waHref` et `echeance(3)`) : tâche 7.
- 7 (migration, `AdminRequest`, `OUTCOME_SOURCES`) : tâche 1.
- 8 (cas limites) : double clic et clics contradictoires (verrou `expect`, tests tâches 2, 4, 5), deux POST simultanés (`expect: "outcome_null"` plus `UNIQUE request_id`), lien sans expiration, annulée, issue admin entre email et clic, Resend refusé (compteur déjà incrémenté), loueur sans email (ops immédiat), `requestCommission` refusé après clic (issue posée, ops avec le code réel), facture payée (aucun avoir, ops), Telegram indisponible (`ops()` avale). Aucun chemin ne remet `outcome` à NULL.
- 9 (11 fichiers de tests) : tous nommés dans « Structure des fichiers », chacun a sa tâche.
- 10 (mesure) : tâche 9 step 7. 11 (ordre 1 → 9) : respecté, la fiche de la 33 en step 1 de la tâche 9, marquée à faire avant tout le reste.

**2. Placeholders :** aucun « TBD », « à compléter », « comme la tâche N » ; chaque étape de code montre le code ; chaque commande a sa sortie attendue. Le seul `{token}` du plan est dans la planche HTML statique (tâche 8) et dans la spec citée, pas dans du code.

**3. Cohérence des types et signatures entre tâches :**
- `applyOutcome({ id, outcome, source, finalAmountEur?, expect? })` → `{ status: "rented"; commission } | { status: "lost" } | { status: "lost_race" }` : définie tâche 2, appelée tâches 2 (`setOutcome`) et 4 (`handleOutcomeClick`) avec les mêmes clés.
- `OutcomeSource` = `"partner_link" | "admin" | "auto"` (tâche 1), utilisée par `applyOutcome`, `creditCommissionInvoice(id, reason, source)`, `SOURCE_LABEL`.
- `outcomeClickDecision(row: ClickRow, choice)` et `ClickDecision` (tâche 3) consommées telles quelles en tâche 4 ; `outcomePageState(row & { outcome_at }, result)` consommée en tâche 5 ; `result` prend les valeurs de `ClickResult` (tâche 4), posées dans l'URL par la route (tâche 5).
- `OutcomeQuestionMail` (tâche 3) construite par `buildQuestion` (tâche 6) et envoyée par `sendPartnerOutcomeQuestion` (tâche 4) ; `InvoiceReminderMail` (tâche 7) construite et envoyée dans la même tâche.
- `runOutcomeFollowupPass(now: Date)` → `{ sent, refused, escalated, reminded, withoutEmail }` et `runInvoiceReminderPass(now: Date)` → `{ reminded, overdue }` : stub tâche 6, vrai module tâche 7, mêmes noms de champs dans le test de route.
- `requestByOutcomeToken` rend `OutcomeRequestRow` (tâche 4), lue par la route et la page (tâche 5) avec les champs `pickup_slug`, `quoted_car_model`, `quoted_price`, `customer_name`, `outcome_at`.
