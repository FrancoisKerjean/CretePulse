# crete.direct Stays, lot A : tunnel d'encaissement fiable

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le tunnel Stays encaissable de bout en bout sur le compte Stripe NovAI, sans qu'un voyageur puisse payer pour des dates indisponibles ni qu'un propriétaire reste aveugle sur ses réservations, et livrer le solde 70 % promis par l'email de confirmation.

**Architecture:** On garde l'architecture de la Phase 1 (routes API `/api/stays/*`, libs pures testées dans `src/lib/stays/`, Postgres VPS `cretepulse`). On ajoute trois choses. (1) Une couche disponibilité pure (`availability.ts`) branchée en amont de la demande et affichée sur la fiche, pour que la contrainte GIST cesse d'être le seul rempart. (2) Un traitement explicite du cas de collision au paiement, avec remboursement Stripe automatique. (3) Le second charge (solde 70 %), qui réutilise le même webhook via `metadata.payment_type`.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Postgres self-hosted via `supabase-admin` (service role), Stripe Connect Express (destination charge, compte plateforme `acct_1TDPicEQ3UQbwGzY`), Resend, Vitest 4.x (`src/**/*.test.ts`, `environment: node`), Telegram best-effort.

**Spec de référence :** `docs/superpowers/specs/2026-07-24-crete-direct-stays-design.md`. Ce plan ne change aucune décision produit, il livre ce que la spec décrit et que la Phase 1 a laissé ouvert (§6.2 calendrier alimenté par l'iCal, §6.5 statut `confirmed` et email propriétaire, §6.4 solde 70 %).

**Décisions Kami du 28/07/2026 :**
- Entité encaissante = **compte Stripe NovAI `acct_1TDPicEQ3UQbwGzY`**, déjà en Connect Express, partagé avec IEUF et le moteur Kairos. Le cloisonnement se joue sur le `statement_descriptor` et le `replyTo`, pas sur le compte.
- Campagne = propriétaires **et** voyageurs en parallèle, donc lots A puis B en entier.

**Branche :** `feat/stays-marketplace` (worktree `C:\Users\fkerj\cp-stays`). PR #6 déjà ouverte vers `master`. Auteur des commits `kerjeanfrancois29 <kerjeanfrancois29@gmail.com>`. Ne JAMAIS pousser `main` : la promotion `master` vers `main` est faite par l'action quotidienne de 20 h Athènes.

**Commandes :** un fichier de test `npx vitest run <chemin>`, typecheck `npx tsc --noEmit`, garde DA `npm run check:da` (gate CI dur, aucun tiret cadratin autorisé).

---

## File Structure

**Créés**
- `src/lib/stays/availability.ts` — calcul pur de disponibilité à partir des plages réservées. Aucune I/O.
- `src/lib/stays/availability.test.ts`
- `src/app/api/stays/availability/[slug]/route.ts` — GET public, plages indisponibles d'une annonce.
- `src/app/api/stays/availability/[slug]/route.test.ts`
- `src/app/api/stays/pay-balance/route.ts` — POST, second charge du solde 70 %.
- `src/app/api/stays/pay-balance/route.test.ts`
- `src/app/api/cron/stays-balance/route.ts` — cron quotidien, demande de solde à J-14.
- `src/app/api/cron/stays-balance/route.test.ts`
- `src/app/[locale]/stays/[slug]/UnavailableDates.tsx` — composant client, dates barrées dans le formulaire.
- `src/app/[locale]/stays/balance/[token]/page.tsx` + `BalanceButton.tsx` — page de paiement du solde.
- `supabase/migrations/20260728_stays_balance.sql` — colonnes du solde et statut confirmé.

**Modifiés**
- `src/lib/stays/stripe-helpers.ts` — `statement_descriptor_suffix`, `metadata.brand`, paramètres pays et type d'entreprise du Connect, builder du charge de solde.
- `src/lib/stays/emails.ts` — `replyTo` crete.direct, accusé de réception voyageur, notification propriétaire, demande de solde, email de collision.
- `src/lib/stays/db.ts` — lecture des plages réservées pour la disponibilité publique, requêtes du cron solde.
- `src/app/api/stays/request/route.ts` — refus des dates indisponibles et des séjours sous `min_nights`, accusé de réception.
- `src/app/api/stays/webhook/route.ts` — traitement de la collision, branche solde, notification propriétaire.
- `src/app/[locale]/stays/[slug]/page.tsx` + `RequestForm.tsx` — affichage des dates indisponibles.
- `src/app/[locale]/stays/content.ts` — chaînes des nouveaux écrans en/fr/de/el.
- `vercel.json` — cron `stays-balance`.

---

## Task 1 : le relevé bancaire du voyageur dit crete.direct

Le compte Stripe est celui de NovAI, partagé avec IEUF. Sans suffixe explicite, le voyageur voit sur son relevé le descripteur par défaut de la plateforme, donc une marque qui n'est pas celle où il a réservé. `feedback_stripe_no_internal_prefix` interdit de toucher au `product_data.name` pour ça : le bon levier est `statement_descriptor_suffix`, invisible au checkout, visible sur le relevé.

**Files:**
- Modify: `src/lib/stays/stripe-helpers.ts`
- Test: `src/lib/stays/stripe-helpers.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `src/lib/stays/stripe-helpers.test.ts` :

```typescript
it("marque le paiement crete.direct sur le releve bancaire", () => {
  const p = buildCheckoutParams({
    listingTitle: "Villa Danae",
    dateFrom: "2026-08-01",
    dateTo: "2026-08-08",
    depositEur: 220.5,
    applicationFeeCents: 2100,
    connectAccountId: "acct_test",
    guestEmail: "g@example.com",
    requestId: 42,
    payToken: "tok",
    locale: "fr",
  });
  const pid = p.payment_intent_data as { statement_descriptor_suffix?: string };
  expect(pid.statement_descriptor_suffix).toBe("CRETE DIRECT");
  expect(p.metadata?.brand).toBe("crete.direct");
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/lib/stays/stripe-helpers.test.ts`
Expected: FAIL, `expected undefined to be 'CRETE DIRECT'`.

- [ ] **Step 3: Implémenter**

Dans `src/lib/stays/stripe-helpers.ts`, remplacer le bloc `payment_intent_data` et `metadata` de `buildCheckoutParams` par :

```typescript
    payment_intent_data: {
      application_fee_amount: input.applicationFeeCents,
      transfer_data: { destination: input.connectAccountId },
      // Compte plateforme partage (NovAI acct_1TDPicEQ3UQbwGzY). Le suffixe est la
      // seule surface ou le voyageur lit une marque sur son relevé bancaire.
      statement_descriptor_suffix: "CRETE DIRECT",
    },
    customer_email: input.guestEmail,
    metadata: {
      request_id: String(input.requestId),
      payment_type: "deposit",
      brand: "crete.direct",
    },
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run src/lib/stays/stripe-helpers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/stripe-helpers.ts src/lib/stays/stripe-helpers.test.ts
git commit -m "fix(stays): le releve bancaire du voyageur affiche CRETE DIRECT"
```

---

## Task 2 : les emails Stays ne renvoient plus vers Kairos

`emails.ts` pose `REPLY_TO = "contact@kairosguest.com"`. Un voyageur qui répond à un email crete.direct atterrit sur une adresse Kairos, visible dans son client mail. `feedback_crete_direct_no_kairos_mention` l'interdit sur toutes les surfaces crete.direct.

**Files:**
- Modify: `src/lib/stays/emails.ts`
- Test: `src/lib/stays/emails.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `src/lib/stays/emails.test.ts` :

```typescript
import { readFileSync } from "node:fs";

it("aucune adresse kairos dans les emails stays", () => {
  const src = readFileSync("src/lib/stays/emails.ts", "utf8");
  expect(src).not.toMatch(/kairosguest/i);
  expect(src).not.toMatch(/kairos/i);
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/lib/stays/emails.test.ts`
Expected: FAIL sur la présence de `kairosguest`.

- [ ] **Step 3: Implémenter**

Dans `src/lib/stays/emails.ts`, remplacer la constante :

```typescript
const REPLY_TO = "hello@crete.direct";
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run src/lib/stays/emails.test.ts`
Expected: PASS.

- [ ] **Step 5: Vérifier que la boîte reçoit bien**

`hello@crete.direct` doit être routée. Vérifier dans la config Resend inbound (`memory/infra_resend_inbound.md`, inbound vers le VPS port 8765) que l'adresse existe. Si elle n'existe pas, la créer avant de merger : un `replyTo` mort est pire qu'un `replyTo` étranger.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stays/emails.ts src/lib/stays/emails.test.ts
git commit -m "fix(stays): replyTo crete.direct, plus aucune adresse Kairos"
```

---

## Task 3 : onboarding Connect ouvert aux propriétaires non grecs

`createConnectOnboardingLink` fige `country: "GR"` et `business_type: "individual"`. Le propriétaire de Villa Danae est basé en Belgique (IBAN BE), et un propriétaire en IKE est une société. En l'état, ces deux profils ne peuvent pas encaisser.

**Files:**
- Modify: `src/lib/stays/stripe-helpers.ts`
- Test: `src/lib/stays/stripe-helpers.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `src/lib/stays/stripe-helpers.test.ts` :

```typescript
import { buildConnectAccountParams } from "./stripe-helpers";

it("cree un compte grec individuel par defaut", () => {
  const p = buildConnectAccountParams("o@example.com", {});
  expect(p.country).toBe("GR");
  expect(p.business_type).toBe("individual");
});

it("respecte le pays et le type declares par le proprietaire", () => {
  const p = buildConnectAccountParams("o@example.com", { country: "BE", businessType: "company" });
  expect(p.country).toBe("BE");
  expect(p.business_type).toBe("company");
});

it("refuse un code pays invalide et retombe sur GR", () => {
  const p = buildConnectAccountParams("o@example.com", { country: "zzz" });
  expect(p.country).toBe("GR");
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/lib/stays/stripe-helpers.test.ts`
Expected: FAIL, `buildConnectAccountParams is not a function`.

- [ ] **Step 3: Implémenter**

Dans `src/lib/stays/stripe-helpers.ts`, ajouter avant `createConnectOnboardingLink` :

```typescript
export interface ConnectProfile {
  /** Code pays ISO 3166-1 alpha-2 du compte bancaire du proprietaire. */
  country?: string;
  businessType?: "individual" | "company";
}

export function buildConnectAccountParams(
  ownerEmail: string,
  profile: ConnectProfile,
): Stripe.AccountCreateParams {
  const country =
    typeof profile.country === "string" && /^[A-Za-z]{2}$/.test(profile.country)
      ? profile.country.toUpperCase()
      : "GR";
  const businessType = profile.businessType === "company" ? "company" : "individual";
  return {
    type: "express",
    country,
    email: ownerEmail,
    business_type: businessType,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  };
}
```

puis remplacer le corps de `createConnectOnboardingLink` par :

```typescript
export async function createConnectOnboardingLink(
  ownerEmail: string,
  ownerId: number,
  profile: ConnectProfile = {},
): Promise<{ accountId: string; url: string }> {
  const stripe = stripeClient();
  const account = await stripe.accounts.create(buildConnectAccountParams(ownerEmail, profile));
  const base = siteBase();
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${base}/api/stays/connect/onboard?refresh=true&owner=${ownerId}`,
    return_url: `${base}/api/stays/connect/onboard?success=true&account=${account.id}&owner=${ownerId}`,
    type: "account_onboarding",
  });
  return { accountId: account.id, url: link.url };
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/lib/stays/stripe-helpers.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Brancher le profil sur la route d'acceptation**

Dans `src/app/api/stays/approve/route.ts`, à l'appel de `createConnectOnboardingLink`, passer le profil lu du corps de requête :

```typescript
    const { url } = await createConnectOnboardingLink(owner.email, owner.id, {
      country: typeof body.country === "string" ? body.country : undefined,
      businessType: body.businessType === "company" ? "company" : "individual",
    });
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stays/stripe-helpers.ts src/lib/stays/stripe-helpers.test.ts src/app/api/stays/approve/route.ts
git commit -m "feat(stays): onboarding Connect ouvert aux proprietaires non grecs et aux societes"
```

---

## Task 4 : couche de disponibilité pure

Aujourd'hui la contrainte GIST est le seul rempart, et elle ne se déclenche qu'au paiement, quand l'argent est déjà pris. Il faut un calcul de disponibilité utilisable en amont, côté demande et côté affichage.

**Files:**
- Create: `src/lib/stays/availability.ts`
- Test: `src/lib/stays/availability.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/stays/availability.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { eachNight, isRangeFree, unavailableNights } from "./availability";
import type { DateRange } from "./ical";

const booked: DateRange[] = [{ dateFrom: "2026-08-10", dateTo: "2026-08-14" }];

describe("eachNight", () => {
  it("liste les nuits, borne de sortie exclue", () => {
    expect(eachNight("2026-08-01", "2026-08-04")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });
});

describe("isRangeFree", () => {
  it("accepte une plage avant les dates prises", () => {
    expect(isRangeFree(booked, "2026-08-05", "2026-08-10")).toBe(true);
  });
  it("accepte une plage qui commence le jour du depart", () => {
    expect(isRangeFree(booked, "2026-08-14", "2026-08-16")).toBe(true);
  });
  it("refuse un chevauchement partiel", () => {
    expect(isRangeFree(booked, "2026-08-12", "2026-08-16")).toBe(false);
  });
  it("refuse une plage englobante", () => {
    expect(isRangeFree(booked, "2026-08-08", "2026-08-20")).toBe(false);
  });
  it("refuse une plage strictement incluse", () => {
    expect(isRangeFree(booked, "2026-08-11", "2026-08-12")).toBe(false);
  });
});

describe("unavailableNights", () => {
  it("aplatit les plages en nuits", () => {
    expect(unavailableNights(booked)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
    ]);
  });
  it("dedoublonne les plages qui se recouvrent", () => {
    const overlapping: DateRange[] = [
      { dateFrom: "2026-08-10", dateTo: "2026-08-12" },
      { dateFrom: "2026-08-11", dateTo: "2026-08-13" },
    ];
    expect(unavailableNights(overlapping)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/lib/stays/availability.test.ts`
Expected: FAIL, module `./availability` introuvable.

- [ ] **Step 3: Implémenter**

Créer `src/lib/stays/availability.ts` :

```typescript
import type { DateRange } from "./ical";

const DAY_MS = 86_400_000;

function toMs(iso: string): number {
  return new Date(iso + "T00:00:00Z").getTime();
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Nuits couvertes par une plage, borne de sortie exclue (une nuit = une date). */
export function eachNight(dateFrom: string, dateTo: string): string[] {
  const out: string[] = [];
  for (let t = toMs(dateFrom); t < toMs(dateTo); t += DAY_MS) {
    out.push(toIso(t));
  }
  return out;
}

/** Vrai si aucune nuit de [dateFrom, dateTo[ n'est deja prise. */
export function isRangeFree(
  booked: DateRange[],
  dateFrom: string,
  dateTo: string,
): boolean {
  const from = toMs(dateFrom);
  const to = toMs(dateTo);
  return !booked.some((r) => toMs(r.dateFrom) < to && from < toMs(r.dateTo));
}

/** Toutes les nuits indisponibles, triees et dedoublonnees. */
export function unavailableNights(booked: DateRange[]): string[] {
  const set = new Set<string>();
  for (const r of booked) {
    for (const n of eachNight(r.dateFrom, r.dateTo)) set.add(n);
  }
  return [...set].sort();
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/lib/stays/availability.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/availability.ts src/lib/stays/availability.test.ts
git commit -m "feat(stays): couche de disponibilite pure"
```

---

## Task 5 : la demande refuse les dates prises et les séjours trop courts

**Files:**
- Modify: `src/app/api/stays/request/route.ts`
- Test: `src/app/api/stays/request/route.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans `src/app/api/stays/request/route.test.ts`, en suivant le style de mock déjà présent dans ce fichier :

```typescript
it("refuse 409 quand les dates sont deja prises", async () => {
  mockListing({ id: 1, status: "published", min_nights: 1 });
  mockBookedRanges([{ dateFrom: "2026-08-10", dateTo: "2026-08-14" }]);
  const res = await POST(
    jsonRequest({
      slug: "villa",
      guestName: "Ana",
      guestEmail: "ana@example.com",
      dateFrom: "2026-08-12",
      dateTo: "2026-08-16",
    }),
  );
  expect(res.status).toBe(409);
  const body = await res.json();
  expect(body.error).toBe("Dates unavailable");
});

it("refuse 422 sous le minimum de nuits", async () => {
  mockListing({ id: 1, status: "published", min_nights: 5 });
  mockBookedRanges([]);
  const res = await POST(
    jsonRequest({
      slug: "villa",
      guestName: "Ana",
      guestEmail: "ana@example.com",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-03",
    }),
  );
  expect(res.status).toBe(422);
  const body = await res.json();
  expect(body.error).toBe("Minimum stay");
  expect(body.minNights).toBe(5);
});
```

Le fichier de test doit exposer `mockBookedRanges` en ajoutant `bookedRangesForListing` au mock de `@/lib/stays/db` déjà en place :

```typescript
const bookedRangesForListing = vi.hoisted(() => vi.fn(async () => [] as unknown[]));
// ... dans le vi.mock("@/lib/stays/db", ...) existant, ajouter :
//   bookedRangesForListing,
const mockBookedRanges = (r: unknown[]) => bookedRangesForListing.mockResolvedValueOnce(r);
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/app/api/stays/request/route.test.ts`
Expected: FAIL, les deux nouveaux tests reçoivent 200 au lieu de 409 et 422.

- [ ] **Step 3: Implémenter**

Dans `src/app/api/stays/request/route.ts`, ajouter aux imports :

```typescript
import { bookedRangesForListing } from "@/lib/stays/db";
import { isRangeFree } from "@/lib/stays/availability";
import { nightsBetween } from "@/lib/stays/pricing";
```

puis insérer, juste après le bloc qui vérifie que l'annonce est publiée et AVANT le rate-limit par IP :

```typescript
  const minNights = Number(listing.min_nights) || 1;
  if (nightsBetween(v.row.dateFrom, v.row.dateTo) < minNights) {
    return NextResponse.json(
      { ok: false, error: "Minimum stay", minNights },
      { status: 422 },
    );
  }

  const booked = await bookedRangesForListing(listing.id);
  if (!isRangeFree(booked, v.row.dateFrom, v.row.dateTo)) {
    return NextResponse.json(
      { ok: false, error: "Dates unavailable" },
      { status: 409 },
    );
  }
```

L'ordre compte : ces deux refus sont des erreurs honnêtes rendues au voyageur, alors que le rate-limit et la dédup renvoient volontairement `200` silencieux pour ne rien révéler à un robot. Les placer avant garde cette sémantique intacte.

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/app/api/stays/request/route.test.ts`
Expected: PASS, tous les tests du fichier.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stays/request/route.ts src/app/api/stays/request/route.test.ts
git commit -m "feat(stays): la demande refuse les dates prises et les sejours trop courts"
```

---

## Task 6 : la fiche affiche les dates indisponibles

Sans ça, le refus de la Task 5 se transforme en mur : le voyageur découvre l'indisponibilité après avoir rempli tout le formulaire. La spec §6.2 prévoit un calendrier alimenté par l'iCal.

**Files:**
- Create: `src/app/api/stays/availability/[slug]/route.ts`
- Test: `src/app/api/stays/availability/[slug]/route.test.ts`
- Modify: `src/app/[locale]/stays/[slug]/page.tsx`
- Modify: `src/app/[locale]/stays/[slug]/RequestForm.tsx`
- Modify: `src/app/[locale]/stays/content.ts`

- [ ] **Step 1: Écrire le test de la route**

Créer `src/app/api/stays/availability/[slug]/route.test.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const getListingBySlug = vi.hoisted(() => vi.fn());
const bookedRangesForListing = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stays/db", () => ({ getListingBySlug, bookedRangesForListing }));

import { GET } from "./route";

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("GET /api/stays/availability/[slug]", () => {
  beforeEach(() => {
    getListingBySlug.mockReset();
    bookedRangesForListing.mockReset();
  });

  it("renvoie 404 sur une annonce inconnue", async () => {
    getListingBySlug.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://x"), ctx("nope"));
    expect(res.status).toBe(404);
  });

  it("renvoie les nuits indisponibles et le minimum de nuits", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 7, status: "published", min_nights: 3 });
    bookedRangesForListing.mockResolvedValueOnce([
      { dateFrom: "2026-08-10", dateTo: "2026-08-12" },
    ]);
    const res = await GET(new Request("http://x"), ctx("villa"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unavailable).toEqual(["2026-08-10", "2026-08-11"]);
    expect(body.minNights).toBe(3);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/app/api/stays/availability/[slug]/route.test.ts`
Expected: FAIL, module `./route` introuvable.

- [ ] **Step 3: Implémenter la route**

Créer `src/app/api/stays/availability/[slug]/route.ts` :

```typescript
import { NextResponse } from "next/server";
import { getListingBySlug, bookedRangesForListing } from "@/lib/stays/db";
import { unavailableNights } from "@/lib/stays/availability";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await context.params;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "published") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const booked = await bookedRangesForListing(listing.id);
  return NextResponse.json(
    {
      ok: true,
      unavailable: unavailableNights(booked),
      minNights: Number(listing.min_nights) || 1,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run src/app/api/stays/availability/[slug]/route.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Ajouter les chaînes i18n**

Dans `src/app/[locale]/stays/content.ts`, ajouter à `StaysStrings.listing` les clés `unavailableTitle`, `unavailableEmpty`, `errorUnavailable`, `errorMinNights`, puis les valeurs dans les 4 locales :

```typescript
// en
unavailableTitle: "Already booked",
unavailableEmpty: "Every night is open for now.",
errorUnavailable: "Those nights are already booked. Pick another range.",
errorMinNights: "This place is booked from {n} nights.",
// fr
unavailableTitle: "Deja reserve",
unavailableEmpty: "Toutes les nuits sont libres pour l'instant.",
errorUnavailable: "Ces nuits sont deja reservees. Choisissez d'autres dates.",
errorMinNights: "Ce logement se reserve a partir de {n} nuits.",
// de
unavailableTitle: "Bereits gebucht",
unavailableEmpty: "Aktuell sind alle Nachte frei.",
errorUnavailable: "Diese Nachte sind bereits gebucht. Bitte andere Daten wahlen.",
errorMinNights: "Diese Unterkunft wird ab {n} Nachten gebucht.",
// el
unavailableTitle: "Hdh kleismena",
unavailableEmpty: "Oles oi nyxtes einai eleutheres pros to paron.",
errorUnavailable: "Aytes oi nyxtes einai hdh kleismenes. Epilexte alles hmeromhnies.",
errorMinNights: "To katalyma kleinei apo {n} nyxtes.",
```

Note grecque : le fichier `content.ts` existant contient déjà du grec en caractères grecs. Reprendre le même alphabet que les chaînes voisines du fichier plutôt que la translittération ci-dessus, qui n'est là que pour montrer la structure. Vérifier après édition qu'aucun tiret cadratin n'a été introduit.

- [ ] **Step 6: Passer les dates indisponibles au formulaire**

Dans `src/app/[locale]/stays/[slug]/page.tsx`, avant le rendu, charger les plages et les passer au formulaire :

```typescript
import { bookedRangesForListing } from "@/lib/stays/db";
import { unavailableNights } from "@/lib/stays/availability";

// dans le composant, apres avoir recupere `listing` :
const unavailable = unavailableNights(await bookedRangesForListing(listing.id));
```

puis sur l'appel existant : `<RequestForm ... unavailable={unavailable} minNights={Number(listing.min_nights) || 1} />`.

- [ ] **Step 7: Bloquer les dates prises dans le formulaire**

Dans `src/app/[locale]/stays/[slug]/RequestForm.tsx`, ajouter les deux props à l'interface, et avant l'envoi, refuser localement une plage qui touche une nuit indisponible :

```typescript
  const nightsOf = (from: string, to: string): string[] => {
    const out: string[] = [];
    for (
      let t = new Date(from + "T00:00:00Z").getTime();
      t < new Date(to + "T00:00:00Z").getTime();
      t += 86_400_000
    ) {
      out.push(new Date(t).toISOString().slice(0, 10));
    }
    return out;
  };

  const localError = (): string | null => {
    if (!dateFrom || !dateTo) return null;
    const nights = nightsOf(dateFrom, dateTo);
    if (nights.length < minNights) return t.errorMinNights.replace("{n}", String(minNights));
    if (nights.some((n) => unavailable.includes(n))) return t.errorUnavailable;
    return null;
  };
```

et afficher `localError()` sous les champs de date, en désactivant le bouton d'envoi tant qu'il est non nul. Ajouter aussi, sous le formulaire, la liste `t.unavailableTitle` des nuits indisponibles à venir (les 30 premières), ou `t.unavailableEmpty` si la liste est vide.

- [ ] **Step 8: Typecheck et build**

Run: `npx tsc --noEmit`
Expected: 0 erreur.
Run: `npm run build`
Expected: build vert, routes `/[locale]/stays/[slug]` et `/api/stays/availability/[slug]` compilées.

- [ ] **Step 9: Garde DA**

Run: `npm run check:da`
Expected: aucune nouvelle violation (les dettes historiques grandfatherées restent).

- [ ] **Step 10: Commit**

```bash
git add src/app/api/stays/availability src/app/\[locale\]/stays
git commit -m "feat(stays): dates indisponibles affichees et bloquees sur la fiche"
```

---

## Task 7 : collision au paiement, remboursement automatique

Aujourd'hui, si les dates sont prises entre l'acceptation et le paiement, le RPC lève `23P01`, le webhook répond `200 {conflict:true}` et s'arrête. L'acompte est encaissé, il n'y a pas de réservation, personne n'est prévenu, rien n'est remboursé.

**Files:**
- Modify: `src/app/api/stays/webhook/route.ts`
- Modify: `src/lib/stays/emails.ts`
- Test: `src/app/api/stays/webhook/route.test.ts`
- Test: `src/lib/stays/emails.test.ts`

- [ ] **Step 1: Écrire le test de l'email**

Ajouter dans `src/lib/stays/emails.test.ts` :

```typescript
import { guestConflictSubject, guestConflictBody } from "./emails";

it("annonce le remboursement integral au voyageur", () => {
  expect(guestConflictSubject("Villa Danae")).toContain("Villa Danae");
  const html = guestConflictBody({ listingTitle: "Villa Danae", amountEur: 220.5 });
  expect(html).toContain("220.50");
  expect(html).toMatch(/rembours/i);
});
```

- [ ] **Step 2: Écrire le test du webhook**

Ajouter dans `src/app/api/stays/webhook/route.test.ts` :

```typescript
it("rembourse et previent quand les dates ont ete prises entre temps", async () => {
  mockRpcError({ code: "23P01", message: "conflict" });
  mockRequestRow({ id: 9, guest_email: "g@example.com", listing_id: 3, deposit_amount: 220.5 });
  const res = await POST(signedEvent("checkout.session.completed", {
    id: "cs_1",
    payment_intent: "pi_1",
    metadata: { request_id: "9" },
  }));
  expect(res.status).toBe(200);
  expect(refundsCreate).toHaveBeenCalledWith({ payment_intent: "pi_1" });
  expect(sendGuestConflict).toHaveBeenCalled();
  expect(notifyTelegram).toHaveBeenCalledWith(expect.stringMatching(/collision/i));
});
```

Ajouter au mock Stripe du fichier un `refunds: { create: refundsCreate }`, et mocker `sendGuestConflict` dans le mock `@/lib/stays/emails` existant.

- [ ] **Step 3: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/lib/stays/emails.test.ts src/app/api/stays/webhook/route.test.ts`
Expected: FAIL, `guestConflictSubject` non exporté et `refundsCreate` jamais appelé.

- [ ] **Step 4: Implémenter l'email**

Ajouter dans `src/lib/stays/emails.ts` :

```typescript
export function guestConflictSubject(listingTitle: string): string {
  return `Sejour indisponible : ${listingTitle}, vous etes rembourse`;
}

export function guestConflictBody(o: {
  listingTitle: string;
  amountEur: number;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p>Les dates que vous venez de payer pour <strong>${o.listingTitle}</strong> ont ete reservees quelques instants avant votre paiement.</p>
    <p>Votre acompte de ${o.amountEur.toFixed(2)} EUR est <strong>integralement rembourse</strong>. Le remboursement apparait sur votre compte sous 5 a 10 jours ouvres selon votre banque.</p>
    <p>Vous pouvez choisir d'autres dates sur crete.direct. Toutes nos excuses.</p>
  </div>`;
}

export async function sendGuestConflict(
  guestEmail: string,
  o: Parameters<typeof guestConflictBody>[0],
): Promise<void> {
  await send(guestEmail, guestConflictSubject(o.listingTitle), guestConflictBody(o));
}
```

- [ ] **Step 5: Implémenter la branche webhook**

Dans `src/app/api/stays/webhook/route.ts`, remplacer le bloc `if ((error as { code?: string }).code === "23P01")` par :

```typescript
      if ((error as { code?: string }).code === "23P01") {
        // Les dates ont ete prises entre l'acceptation et le paiement. L'argent est
        // deja encaisse : on rembourse tout de suite, on previent, on alerte.
        const pi = obj.payment_intent;
        let refunded = false;
        if (pi) {
          try {
            await stripeClient().refunds.create({ payment_intent: pi });
            refunded = true;
          } catch (e) {
            console.error("[stays/webhook] refund failed:", e);
          }
        }
        const { data: req } = await supabaseAdmin
          .from("stay_requests")
          .select("guest_email, listing_id, deposit_amount")
          .eq("id", requestId)
          .maybeSingle();
        if (req?.guest_email) {
          const { data: l } = await supabaseAdmin
            .from("stay_listings").select("title").eq("id", req.listing_id).maybeSingle();
          await sendGuestConflict(req.guest_email, {
            listingTitle: l?.title ?? "votre sejour",
            amountEur: Number(req.deposit_amount) || 0,
          });
        }
        await notifyTelegram(
          `Collision Stays sur la demande ${requestId} : dates prises entre temps, remboursement ${refunded ? "OK" : "ECHOUE, a traiter a la main"}`,
        );
        return NextResponse.json({ received: true, conflict: true, refunded });
      }
```

et ajouter aux imports : `import { sendGuestConfirmed, sendGuestConflict } from "@/lib/stays/emails";` ainsi que `import { notifyTelegram } from "@/lib/stays/telegram";`.

- [ ] **Step 6: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/lib/stays/emails.test.ts src/app/api/stays/webhook/route.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/stays/webhook src/lib/stays/emails.ts src/lib/stays/emails.test.ts
git commit -m "fix(stays): collision au paiement, remboursement automatique et alerte"
```

---

## Task 8 : accusé de réception au voyageur

Le voyageur envoie sa demande et ne reçoit rien. Le pattern car rental envoie un accusé au submit, avec la promesse de délai.

**Files:**
- Modify: `src/lib/stays/emails.ts`
- Modify: `src/app/api/stays/request/route.ts`
- Test: `src/lib/stays/emails.test.ts`
- Test: `src/app/api/stays/request/route.test.ts`

- [ ] **Step 1: Écrire le test de l'email**

Ajouter dans `src/lib/stays/emails.test.ts` :

```typescript
import { guestReceivedSubject, guestReceivedBody } from "./emails";

it("accuse reception de la demande au voyageur", () => {
  expect(guestReceivedSubject("Villa Danae")).toContain("Villa Danae");
  const html = guestReceivedBody({
    listingTitle: "Villa Danae",
    dateFrom: "2026-08-01",
    dateTo: "2026-08-08",
  });
  expect(html).toContain("2026-08-01");
  expect(html).toMatch(/48/);
});
```

- [ ] **Step 2: Écrire le test de la route**

Ajouter dans `src/app/api/stays/request/route.test.ts` :

```typescript
it("envoie l accuse de reception au voyageur", async () => {
  mockListing({ id: 1, status: "published", min_nights: 1, title: "Villa Danae" });
  mockBookedRanges([]);
  await POST(
    jsonRequest({
      slug: "villa",
      guestName: "Ana",
      guestEmail: "ana@example.com",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-08",
    }),
  );
  expect(sendGuestReceived).toHaveBeenCalledWith(
    "ana@example.com",
    expect.objectContaining({ dateFrom: "2026-08-01" }),
  );
});
```

en ajoutant `sendGuestReceived` au mock `@/lib/stays/emails` du fichier.

- [ ] **Step 3: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/lib/stays/emails.test.ts src/app/api/stays/request/route.test.ts`
Expected: FAIL, exports manquants et fonction jamais appelée.

- [ ] **Step 4: Implémenter l'email**

Ajouter dans `src/lib/stays/emails.ts` :

```typescript
export function guestReceivedSubject(listingTitle: string): string {
  return `Demande envoyee : ${listingTitle}`;
}

export function guestReceivedBody(o: {
  listingTitle: string;
  dateFrom: string;
  dateTo: string;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p>Votre demande pour <strong>${o.listingTitle}</strong> du <strong>${o.dateFrom}</strong> au <strong>${o.dateTo}</strong> est partie chez le proprietaire.</p>
    <p>Il confirme ses dates et son prix. Vous recevez sa reponse sous 48 heures. Rien n'est preleve avant votre accord.</p>
    <p>Sans reponse de sa part sous 7 jours, la demande expire et vous etes prevenu.</p>
  </div>`;
}

export async function sendGuestReceived(
  guestEmail: string,
  o: Parameters<typeof guestReceivedBody>[0],
): Promise<void> {
  await send(guestEmail, guestReceivedSubject(o.listingTitle), guestReceivedBody(o));
}
```

Le délai de 7 jours annoncé ici est tenu par la Task 10 du lot B (expiration des demandes). Ne pas modifier ce texte sans livrer cette tâche.

- [ ] **Step 5: Brancher sur la route**

Dans `src/app/api/stays/request/route.ts`, après l'envoi à `sendOwnerRequest`, ajouter :

```typescript
  await sendGuestReceived(v.row.guestEmail, {
    listingTitle: listing.title ?? slug,
    dateFrom: v.row.dateFrom,
    dateTo: v.row.dateTo,
  });
```

et compléter l'import de `@/lib/stays/emails`.

- [ ] **Step 6: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/lib/stays/emails.test.ts src/app/api/stays/request/route.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stays/emails.ts src/lib/stays/emails.test.ts src/app/api/stays/request
git commit -m "feat(stays): accuse de reception au voyageur au depot de la demande"
```

---

## Task 9 : le propriétaire est prévenu quand la réservation est payée

Le webhook n'écrit qu'au voyageur. Le propriétaire accepte, puis n'apprend jamais qu'il a une réservation. C'est le trou le plus grave côté offre : impossible de recruter des propriétaires sur un outil qui ne les prévient pas.

**Files:**
- Modify: `src/lib/stays/emails.ts`
- Modify: `src/app/api/stays/webhook/route.ts`
- Test: `src/lib/stays/emails.test.ts`
- Test: `src/app/api/stays/webhook/route.test.ts`

- [ ] **Step 1: Écrire le test de l'email**

Ajouter dans `src/lib/stays/emails.test.ts` :

```typescript
import { ownerBookedSubject, ownerBookedBody } from "./emails";

it("annonce la reservation payee au proprietaire", () => {
  expect(ownerBookedSubject("2026-08-01", "2026-08-08")).toContain("2026-08-01");
  const html = ownerBookedBody({
    listingTitle: "Villa Danae",
    guestName: "Ana",
    guestEmail: "ana@example.com",
    guestPhone: "+33600000000",
    dateFrom: "2026-08-01",
    dateTo: "2026-08-08",
    ownerNetEur: 3207,
    depositEur: 1010.21,
  });
  expect(html).toContain("Ana");
  expect(html).toContain("ana@example.com");
  expect(html).toContain("3207.00");
});
```

- [ ] **Step 2: Écrire le test du webhook**

Ajouter dans `src/app/api/stays/webhook/route.test.ts` :

```typescript
it("previent le proprietaire quand l acompte est encaisse", async () => {
  mockRpcOk([{ id: 9, listing_id: 3, guest_email: "g@example.com", guest_name: "Ana",
               guest_phone: null, date_from: "2026-08-01", date_to: "2026-08-08",
               quoted_price_eur: 441 }]);
  await POST(signedEvent("checkout.session.completed", {
    id: "cs_1", payment_intent: "pi_1", metadata: { request_id: "9" },
  }));
  expect(sendOwnerBooked).toHaveBeenCalled();
  expect(sendGuestConfirmed).toHaveBeenCalled();
});
```

- [ ] **Step 3: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/lib/stays/emails.test.ts src/app/api/stays/webhook/route.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implémenter l'email**

Ajouter dans `src/lib/stays/emails.ts` :

```typescript
export function ownerBookedSubject(dateFrom: string, dateTo: string): string {
  return `Reservation confirmee : ${dateFrom} au ${dateTo}`;
}

export function ownerBookedBody(o: {
  listingTitle: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  dateFrom: string;
  dateTo: string;
  ownerNetEur: number;
  depositEur: number;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p><strong>${o.guestName}</strong> a paye son acompte pour <strong>${o.listingTitle}</strong>, du <strong>${o.dateFrom}</strong> au <strong>${o.dateTo}</strong>.</p>
    <p>Vos dates sont bloquees sur crete.direct. Bloquez les aussi sur vos autres canaux si votre calendrier n'est pas synchronise.</p>
    <p>Contact voyageur : ${o.guestEmail}${o.guestPhone ? ` · ${o.guestPhone}` : ""}</p>
    <p>Votre net : <strong>${o.ownerNetEur.toFixed(2)} EUR</strong>. Acompte deja verse sur votre compte Stripe : ${o.depositEur.toFixed(2)} EUR. Le solde suit 14 jours avant l'arrivee.</p>
  </div>`;
}

export async function sendOwnerBooked(
  ownerEmail: string,
  o: Parameters<typeof ownerBookedBody>[0],
): Promise<void> {
  await send(ownerEmail, ownerBookedSubject(o.dateFrom, o.dateTo), ownerBookedBody(o));
}
```

- [ ] **Step 5: Brancher sur le webhook**

Dans `src/app/api/stays/webhook/route.ts`, dans le bloc `if (row)` qui envoie déjà `sendGuestConfirmed`, remplacer par :

```typescript
    if (row) {
      const { data: listing } = await supabaseAdmin
        .from("stay_listings")
        .select("title, owner_id, cleaning_fee_eur, commission_rate")
        .eq("id", row.listing_id)
        .maybeSingle();
      await sendGuestConfirmed(row.guest_email, listing?.title ?? "votre sejour");

      if (listing?.owner_id) {
        const { data: owner } = await supabaseAdmin
          .from("stay_owners").select("email").eq("id", listing.owner_id).maybeSingle();
        if (owner?.email) {
          const quote = computeQuote({
            basePriceEur: Number(row.quoted_price_eur),
            cleaningFeeEur: Number(listing.cleaning_fee_eur) || 0,
            commissionRate: Number(listing.commission_rate) || 5,
            dateFrom: row.date_from,
            dateTo: row.date_to,
          });
          await sendOwnerBooked(owner.email, {
            listingTitle: listing.title ?? "votre logement",
            guestName: row.guest_name,
            guestEmail: row.guest_email,
            guestPhone: row.guest_phone ?? null,
            dateFrom: row.date_from,
            dateTo: row.date_to,
            ownerNetEur: quote.ownerNetEur,
            depositEur: quote.depositEur,
          });
        }
      }
    }
```

et ajouter `import { computeQuote } from "@/lib/stays/pricing";` ainsi que `sendOwnerBooked` à l'import des emails.

- [ ] **Step 6: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/lib/stays/emails.test.ts src/app/api/stays/webhook/route.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stays/emails.ts src/lib/stays/emails.test.ts src/app/api/stays/webhook
git commit -m "feat(stays): le proprietaire est prevenu quand l acompte est encaisse"
```

---

## Task 10 : migration du solde

**Files:**
- Create: `supabase/migrations/20260728_stays_balance.sql`

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/20260728_stays_balance.sql` :

```sql
-- crete.direct Stays : solde 70 % (lot A, 28/07/2026)
-- Convention du repo : idempotent, grants explicites, finit par notify pgrst.

alter table public.stay_requests
  add column if not exists balance_token_hash text unique,
  add column if not exists balance_requested_at timestamptz;

create index if not exists stay_requests_balance_due_idx
  on public.stay_requests (status, date_from);

-- Passe une demande deja payee d'acompte au statut confirme, une seule fois.
create or replace function public.mark_stay_balance_paid(
  p_request_id bigint,
  p_payment_intent_id text
)
returns setof public.stay_requests
language plpgsql
as $$
declare
  r public.stay_requests;
begin
  update public.stay_requests
     set status = 'confirmed',
         balance_paid_at = now(),
         balance_payment_intent_id = p_payment_intent_id
   where id = p_request_id
     and status = 'deposit_paid'
   returning * into r;

  if r.id is null then
    return;
  end if;

  return next r;
end $$;

grant execute on function public.mark_stay_balance_paid(bigint, text) to service_role;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Appliquer sur le Postgres VPS**

La cible est le conteneur Docker `cretepulse-postgres` sur kairos-vps, PAS Supabase (le projet Supabase CretePulse est un vestige en pause, ne pas y toucher).

```bash
scp supabase/migrations/20260728_stays_balance.sql root@89.167.115.63:/tmp/
ssh root@89.167.115.63 "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -v ON_ERROR_STOP=1 --single-transaction < /tmp/20260728_stays_balance.sql && rm /tmp/20260728_stays_balance.sql"
```

Expected: exit 0.

- [ ] **Step 3: Vérifier**

```bash
ssh root@89.167.115.63 "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"select column_name from information_schema.columns where table_name='stay_requests' and column_name in ('balance_token_hash','balance_requested_at');\" -c \"select proname from pg_proc where proname='mark_stay_balance_paid';\""
```

Expected: 2 colonnes, 1 fonction.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260728_stays_balance.sql
git commit -m "feat(stays): migration du solde 70 pourcent"
```

---

## Task 11 : paiement du solde

**Files:**
- Create: `src/app/api/stays/pay-balance/route.ts`
- Test: `src/app/api/stays/pay-balance/route.test.ts`
- Modify: `src/lib/stays/stripe-helpers.ts`
- Modify: `src/lib/stays/db.ts`

- [ ] **Step 1: Écrire le test du builder de charge**

Ajouter dans `src/lib/stays/stripe-helpers.test.ts` :

```typescript
import { buildBalanceCheckoutParams } from "./stripe-helpers";

it("construit le charge du solde avec le bon type de paiement", () => {
  const p = buildBalanceCheckoutParams({
    listingTitle: "Villa Danae",
    dateFrom: "2026-08-01",
    dateTo: "2026-08-08",
    balanceEur: 514.5,
    applicationFeeCents: 4900,
    connectAccountId: "acct_test",
    guestEmail: "g@example.com",
    requestId: 42,
    balanceToken: "tok",
    locale: "fr",
  });
  expect(p.metadata?.payment_type).toBe("balance");
  expect(p.metadata?.request_id).toBe("42");
  expect(p.line_items?.[0]?.price_data?.unit_amount).toBe(51450);
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/lib/stays/stripe-helpers.test.ts`
Expected: FAIL, `buildBalanceCheckoutParams is not a function`.

- [ ] **Step 3: Implémenter le builder**

Ajouter dans `src/lib/stays/stripe-helpers.ts` :

```typescript
export interface BalanceCheckoutInput {
  listingTitle: string;
  dateFrom: string;
  dateTo: string;
  balanceEur: number;
  applicationFeeCents: number;
  connectAccountId: string;
  guestEmail: string;
  requestId: number;
  balanceToken: string;
  locale: string;
}

export function buildBalanceCheckoutParams(
  input: BalanceCheckoutInput,
): Stripe.Checkout.SessionCreateParams {
  const base = siteBase();
  return {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${input.listingTitle} · solde 70%`,
            description: `${input.dateFrom} → ${input.dateTo}`,
          },
          unit_amount: Math.round(input.balanceEur * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: input.applicationFeeCents,
      transfer_data: { destination: input.connectAccountId },
      statement_descriptor_suffix: "CRETE DIRECT",
    },
    customer_email: input.guestEmail,
    metadata: {
      request_id: String(input.requestId),
      payment_type: "balance",
      brand: "crete.direct",
    },
    success_url: `${base}/${input.locale}/stays/balance/${input.balanceToken}?paid=1`,
    cancel_url: `${base}/${input.locale}/stays/balance/${input.balanceToken}`,
  };
}
```

- [ ] **Step 4: Ajouter la lecture par token de solde**

Dans `src/lib/stays/db.ts`, ajouter, calqué sur `getRequestByPayHash` :

```typescript
export async function getRequestByBalanceHash(
  hash: string,
): Promise<StayRequest | null> {
  const { data } = await supabaseAdmin
    .from("stay_requests")
    .select("*")
    .eq("balance_token_hash", hash)
    .maybeSingle();
  return (data as StayRequest) ?? null;
}
```

- [ ] **Step 5: Écrire le test de la route**

Créer `src/app/api/stays/pay-balance/route.test.ts`, en calquant strictement la structure de mocks de `src/app/api/stays/pay/route.test.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const getRequestByBalanceHash = vi.hoisted(() => vi.fn());
const getListingById = vi.hoisted(() => vi.fn());
const sessionsCreate = vi.hoisted(() => vi.fn(async () => ({ id: "cs_b", url: "https://pay" })));
const from = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stays/db", () => ({ getRequestByBalanceHash, getListingById }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/stays/stripe-helpers", async (orig) => ({
  ...(await orig<typeof import("@/lib/stays/stripe-helpers")>()),
  stripeClient: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
}));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) }) as never;

describe("POST /api/stays/pay-balance", () => {
  beforeEach(() => {
    getRequestByBalanceHash.mockReset();
    getListingById.mockReset();
    sessionsCreate.mockClear();
    from.mockReset();
  });

  it("refuse 404 sur un token inconnu", async () => {
    getRequestByBalanceHash.mockResolvedValueOnce(null);
    const res = await POST(req({ token: "nope" }));
    expect(res.status).toBe(404);
  });

  it("refuse 409 si l acompte n a pas ete paye", async () => {
    getRequestByBalanceHash.mockResolvedValueOnce({ id: 1, status: "approved" });
    const res = await POST(req({ token: "t" }));
    expect(res.status).toBe(409);
  });

  it("cree la session de solde", async () => {
    getRequestByBalanceHash.mockResolvedValueOnce({
      id: 1, status: "deposit_paid", listing_id: 3, quoted_price_eur: 100,
      date_from: "2026-08-01", date_to: "2026-08-08", guest_email: "g@example.com",
    });
    getListingById.mockResolvedValueOnce({
      id: 3, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5, owner_id: 2,
    });
    from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { stripe_connect_account_id: "acct_x", kyc_status: "complete" } }) }) }),
      update: () => ({ eq: async () => ({}) }),
    });
    const res = await POST(req({ token: "t", locale: "fr" }));
    expect(res.status).toBe(200);
    expect(sessionsCreate).toHaveBeenCalled();
    const body = await res.json();
    expect(body.url).toBe("https://pay");
  });
});
```

- [ ] **Step 6: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/app/api/stays/pay-balance/route.test.ts`
Expected: FAIL, module `./route` introuvable.

- [ ] **Step 7: Implémenter la route**

Créer `src/app/api/stays/pay-balance/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getRequestByBalanceHash, getListingById } from "@/lib/stays/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildBalanceCheckoutParams, stripeClient } from "@/lib/stays/stripe-helpers";
import { computeQuote } from "@/lib/stays/pricing";
import { hashToken } from "@/lib/stays/tokens";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const locale = typeof body.locale === "string" ? body.locale : "fr";

  const req = await getRequestByBalanceHash(hashToken(token));
  if (!req) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (req.status !== "deposit_paid") {
    return NextResponse.json({ ok: false, error: "Not payable" }, { status: 409 });
  }
  const listing = await getListingById(req.listing_id);
  if (!listing) return NextResponse.json({ ok: false, error: "Listing gone" }, { status: 404 });

  const { data: owner } = await supabaseAdmin
    .from("stay_owners")
    .select("stripe_connect_account_id, kyc_status")
    .eq("id", listing.owner_id)
    .maybeSingle();
  if (!owner?.stripe_connect_account_id || owner.kyc_status !== "complete") {
    return NextResponse.json({ ok: false, error: "Owner payout not ready" }, { status: 409 });
  }

  const quote = computeQuote({
    basePriceEur: Number(req.quoted_price_eur),
    cleaningFeeEur: Number(listing.cleaning_fee_eur) || 0,
    commissionRate: Number(listing.commission_rate) || 5,
    dateFrom: req.date_from,
    dateTo: req.date_to,
  });

  // La commission totale vaut commissionEur. L'acompte en a deja preleve sa part
  // (applicationFeeCents), le solde porte exactement le reste.
  const balanceFeeCents =
    Math.round(quote.commissionEur * 100) - quote.applicationFeeCents;

  const session = await stripeClient().checkout.sessions.create(
    buildBalanceCheckoutParams({
      listingTitle: listing.title ?? "Sejour",
      dateFrom: req.date_from,
      dateTo: req.date_to,
      balanceEur: quote.balanceEur,
      applicationFeeCents: balanceFeeCents,
      connectAccountId: owner.stripe_connect_account_id,
      guestEmail: req.guest_email,
      requestId: req.id,
      balanceToken: token,
      locale,
    }),
  );

  await supabaseAdmin
    .from("stay_requests")
    .update({ balance_amount: quote.balanceEur })
    .eq("id", req.id);

  return NextResponse.json({ ok: true, url: session.url });
}
```

- [ ] **Step 8: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run src/app/api/stays/pay-balance/route.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 9: Page de paiement du solde**

Créer `src/app/[locale]/stays/balance/[token]/BalanceButton.tsx` et `page.tsx` en copiant strictement la structure de `src/app/[locale]/stays/pay/[token]/`, avec `fetch("/api/stays/pay-balance")` à la place de `/api/stays/pay`, et les chaînes `content.ts` de la section `pay` réutilisées (ajouter une section `balance` si le texte diffère : « Réglez le solde de votre séjour »).

- [ ] **Step 10: Typecheck et build**

Run: `npx tsc --noEmit`
Expected: 0 erreur.
Run: `npm run build`
Expected: vert.

- [ ] **Step 11: Commit**

```bash
git add src/app/api/stays/pay-balance src/lib/stays/stripe-helpers.ts src/lib/stays/stripe-helpers.test.ts src/lib/stays/db.ts src/app/\[locale\]/stays/balance
git commit -m "feat(stays): paiement du solde 70 pourcent"
```

---

## Task 12 : le webhook confirme au paiement du solde

**Files:**
- Modify: `src/app/api/stays/webhook/route.ts`
- Test: `src/app/api/stays/webhook/route.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `src/app/api/stays/webhook/route.test.ts` :

```typescript
it("passe la demande en confirmed au paiement du solde", async () => {
  rpc.mockResolvedValueOnce({ data: [{ id: 9, listing_id: 3, guest_email: "g@example.com" }], error: null });
  const res = await POST(signedEvent("checkout.session.completed", {
    id: "cs_2",
    payment_intent: "pi_2",
    metadata: { request_id: "9", payment_type: "balance" },
  }));
  expect(res.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("mark_stay_balance_paid", {
    p_request_id: 9,
    p_payment_intent_id: "pi_2",
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/app/api/stays/webhook/route.test.ts`
Expected: FAIL, le RPC appelé est `mark_stay_deposit_paid`.

- [ ] **Step 3: Implémenter**

Dans `src/app/api/stays/webhook/route.ts`, extraire le type de paiement juste après `requestId` :

```typescript
  const paymentType =
    (event.data.object as { metadata?: Record<string, string> })?.metadata?.payment_type ??
    "deposit";
```

puis, dans `if (event.type === "checkout.session.completed")`, brancher avant le traitement de l'acompte :

```typescript
    if (paymentType === "balance") {
      const { data, error } = await supabaseAdmin.rpc("mark_stay_balance_paid", {
        p_request_id: requestId,
        p_payment_intent_id: obj.payment_intent ?? null,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const row = Array.isArray(data) ? data[0] : null;
      if (row) {
        const { data: l } = await supabaseAdmin
          .from("stay_listings").select("title").eq("id", row.listing_id).maybeSingle();
        await sendGuestBalancePaid(row.guest_email, l?.title ?? "votre sejour");
      }
      return NextResponse.json({ received: true });
    }
```

Ajouter dans `src/lib/stays/emails.ts` :

```typescript
export async function sendGuestBalancePaid(
  guestEmail: string,
  listingTitle: string,
): Promise<void> {
  await send(
    guestEmail,
    `Sejour regle : ${listingTitle}`,
    `<div style="font-family:Inter,Arial,sans-serif">Le solde est regle, votre sejour est integralement paye. Le proprietaire vous contactera pour les modalites d'arrivee.</div>`,
  );
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/app/api/stays/webhook/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stays/webhook src/lib/stays/emails.ts
git commit -m "feat(stays): le webhook confirme le sejour au paiement du solde"
```

---

## Task 13 : cron de demande du solde à J-14

**Files:**
- Create: `src/app/api/cron/stays-balance/route.ts`
- Test: `src/app/api/cron/stays-balance/route.test.ts`
- Modify: `src/lib/stays/emails.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/app/api/cron/stays-balance/route.test.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const from = vi.hoisted(() => vi.fn());
const sendGuestBalanceDue = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/stays/emails", () => ({ sendGuestBalanceDue }));

import { GET } from "./route";

const authed = () =>
  new Request("http://x", { headers: { authorization: "Bearer secret" } }) as never;

describe("GET /api/cron/stays-balance", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "secret";
    from.mockReset();
    sendGuestBalanceDue.mockClear();
  });

  it("refuse 401 sans le bon secret", async () => {
    const res = await GET(new Request("http://x") as never);
    expect(res.status).toBe(401);
  });

  it("envoie la demande de solde une seule fois par demande", async () => {
    const update = vi.fn(() => ({ eq: async () => ({}) }));
    from.mockReturnValue({
      select: () => ({
        eq: () => ({
          is: () => ({
            lte: async () => ({
              data: [
                { id: 1, guest_email: "g@example.com", listing_id: 3,
                  date_from: "2026-08-10", balance_amount: 514.5 },
              ],
            }),
          }),
        }),
      }),
      update,
    });
    const res = await GET(authed());
    expect(res.status).toBe(200);
    expect(sendGuestBalanceDue).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/app/api/cron/stays-balance/route.test.ts`
Expected: FAIL, module `./route` introuvable.

- [ ] **Step 3: Implémenter l'email**

Ajouter dans `src/lib/stays/emails.ts` :

```typescript
export function guestBalanceDueBody(o: {
  listingTitle: string;
  dateFrom: string;
  amountEur: number;
  payUrl: string;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p>Votre arrivee a <strong>${o.listingTitle}</strong> approche : ${o.dateFrom}.</p>
    <p>Il reste le solde de <strong>${o.amountEur.toFixed(2)} EUR</strong> a regler.</p>
    <p><a href="${o.payUrl}" style="background:#C8A35F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Payer le solde</a></p>
  </div>`;
}

export async function sendGuestBalanceDue(
  guestEmail: string,
  o: Parameters<typeof guestBalanceDueBody>[0],
): Promise<void> {
  await send(guestEmail, `Solde a regler : ${o.listingTitle}`, guestBalanceDueBody(o));
}
```

- [ ] **Step 4: Implémenter le cron**

Créer `src/app/api/cron/stays-balance/route.ts`, calqué sur `src/app/api/cron/car-relance/route.ts` pour l'authentification :

```typescript
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendGuestBalanceDue } from "@/lib/stays/emails";
import { newToken, hashToken, siteBase } from "@/lib/stays/tokens";

/** Fenetre de demande du solde, en jours avant l'arrivee. */
const BALANCE_LEAD_DAYS = 14;

export async function GET(request: Request): Promise<NextResponse> {
  const auth = request.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() + BALANCE_LEAD_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const { data } = await supabaseAdmin
    .from("stay_requests")
    .select("id, guest_email, listing_id, date_from, balance_amount")
    .eq("status", "deposit_paid")
    .is("balance_requested_at", null)
    .lte("date_from", cutoff);

  const rows = data ?? [];
  let sent = 0;
  for (const r of rows) {
    const token = newToken();
    const { data: l } = await supabaseAdmin
      .from("stay_listings").select("title").eq("id", r.listing_id).maybeSingle();
    await supabaseAdmin
      .from("stay_requests")
      .update({
        balance_token_hash: hashToken(token),
        balance_requested_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    await sendGuestBalanceDue(r.guest_email, {
      listingTitle: l?.title ?? "votre sejour",
      dateFrom: r.date_from,
      amountEur: Number(r.balance_amount) || 0,
      payUrl: `${siteBase()}/fr/stays/balance/${token}`,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, candidates: rows.length, sent });
}
```

L'écriture de `balance_requested_at` a lieu AVANT l'envoi : si l'email échoue, on préfère un solde non demandé (rattrapable à la main depuis l'admin du lot B) à un envoi en boucle tous les jours.

- [ ] **Step 5: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run src/app/api/cron/stays-balance/route.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Déclarer le cron**

Dans `vercel.json`, ajouter à `crons` :

```json
    { "path": "/api/cron/stays-balance", "schedule": "20 9 * * *" }
```

9 h 20 UTC, décalé des crons car rental (9 h 00) et activities (9 h 10) déjà en place.

- [ ] **Step 7: Typecheck et build**

Run: `npx tsc --noEmit`
Expected: 0 erreur.
Run: `npm run build`
Expected: vert.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/cron/stays-balance src/lib/stays/emails.ts vercel.json
git commit -m "feat(stays): cron de demande du solde a J-14"
```

---

## Task 0 : le webhook ignore les sessions des autres marques du compte ✅ FAIT

[FACT 2026-07-29 source: commit `398c5e6`, 5 tests verts, tsc 0 erreur]

Découvert en inspectant le compte Stripe avant de créer l'endpoint : `acct_1TDPicEQ3UQbwGzY` porte déjà 4 endpoints, dont **trois abonnés à `checkout.session.completed`** (IEUF, Kairos, Eleni). Sur Stripe, chaque endpoint d'un compte reçoit TOUS les événements du type auquel il est abonné, quelle que soit la marque qui a créé la session. Le webhook Stays, tel qu'écrit en Phase 1, aurait donc traité chaque commande IEUF : `Number(undefined)` vaut `NaN`, l'événement était quand même inscrit au registre, puis le RPC partait avec `p_request_id: NaN`, soit une erreur et un `500`. Stripe aurait retenté pendant 3 jours et dégradé la santé de l'endpoint.

Correctif livré : sortie anticipée `200 {received, ignored}` avant toute écriture, si `request_id` n'est pas un entier strictement positif ou si `metadata.brand` désigne une autre marque. Le `200` est délibéré, un `4xx` déclencherait les retries.

**Défaut voisin, hors périmètre, à traiter côté Kairos** : `siteweb/src/app/api/bookings/webhook/route.ts:92` renvoie `400 Missing booking_id` sur toute session sans `booking_id`. Chaque commande IEUF et Eleni produit donc déjà un échec de livraison sur l'endpoint Kairos, et les sessions Stays s'y ajouteront. À corriger de la même façon (sortie `200` silencieuse) dans une session dédiée au dépôt `siteweb`.

---

## Task 14 : mise en service (opérations)

C'est la séquence qui rend le tunnel réellement encaissable. Tant qu'elle n'est pas faite, tout ce qui précède est mort en production.

- [x] **Step 1: Récupérer la clé secrète du compte NovAI** ✅ FAIT 29/07

Clé tirée du projet Vercel `iletaitunfut` (scope Production) via `vercel env pull` dans le scratchpad, jamais affichée, fichier supprimé après usage. Compte confirmé par `GET /v1/account` : `acct_1TDPicEQ3UQbwGzY`, « Novai », pays FR, type standard, `charges_enabled: true`, descripteur de relevé par défaut **`NOVAI`** (ce qui confirme la nécessité de la Task 1 : sans suffixe, le voyageur lit « NOVAI » sur son relevé).

- [x] **Step 2: Poser la clé sur le projet crete.direct** ✅ FAIT 29/07

`STRIPE_SECRET_KEY` ajoutée en Production ET Preview sur `cretepulse-build`.

- [x] **Step 3: Créer l'endpoint webhook Stripe** ✅ FAIT 29/07, **VOLONTAIREMENT DÉSACTIVÉ**

Endpoint créé par API : `we_1TyJZpEQ3UQbwGzYkeimteNI`, URL `https://crete.direct/api/stays/webhook`, événement `checkout.session.completed`, `metadata[brand]=crete.direct`. Le `whsec_` a été posé dans `STRIPE_WEBHOOK_SECRET_STAYS` (Production + Preview).

**Il a été immédiatement passé en `disabled`** : `/api/stays/webhook` renvoie encore 404 en production tant que la PR #6 n'est pas mergée. Le laisser actif ferait marteler un 404 par chaque paiement réel d'IEUF, d'Eleni et de Kairos, avec retries sur 3 jours et risque de désactivation automatique par Stripe.

Constat relevé au passage : le compte n'a **aucun compte connecté en live** (`GET /v1/accounts` renvoie 0). Le flux Connect de Kairos n'a donc jamais tourné qu'en mode test, ce qui est cohérent avec la note de `clients/prospect_avital_zion.md`. Pour Stays, ce n'est pas un blocage : chaque propriétaire crée son compte Express à la première acceptation (KYC juste à temps).

- [x] **Step 4: Vérifier que rien ne manque** ✅ FAIT 29/07

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET_STAYS`, `RESEND_API_KEY`, `CRON_SECRET` présentes en Production.

### Résultat de la mise en service, 29/07/2026 (session autonome)

Séquence exécutée dans l'ordre imposé, chaque étape vérifiée avant la suivante.

**Livré et vérifié**
- PR #6 mergée en squash sur `master` (`54ae5f5`), CI verte, `npm run check` (tsc inclus)
  et 236 tests verts, `next build` local vert avant le merge.
- Promotion `master → main` (`ac87a65`), deployment Vercel `5649913627`.
- Production : `/fr/stays` **200**, `/en/stays` 200, `/fr/stays/villa-danae-makrigialos` 200,
  `/api/stays/availability/villa-danae-makrigialos` → `{"ok":true,"unavailable":[],"minNights":3}`,
  `/api/stays/webhook` → 400 sans signature valide. Noindex toujours en place sur la
  liste et sur la fiche.
- Endpoint Stripe `we_1TyJZpEQ3UQbwGzYkeimteNI` réactivé **après** le 200 vérifié.
- Smoke bout en bout joué sur le build de production servi en local, branché sur la
  **vraie base de production**, avec des `checkout.session.completed` signés au format
  Stripe exact : `min_nights` refusé en 422, demande acceptée, devis calculé
  (700 net, commission 35, acompte 220,50, solde 514,50), acompte encaissé →
  `deposit_paid` + 7 nuits bloquées, disponibilité publique à jour, re-demande sur les
  mêmes dates → 409, rejeu du même `event_id` → `duplicate`, événement d'une autre
  marque (IEUF) → `ignored`, collision GIST → `conflict` avec remboursement tenté et
  échec loggé, cron solde J-14 → 1 envoi puis 0 au second passage, solde payé →
  `confirmed`. **Invariant vérifié : fee acompte 1050 + fee solde 2450 = commission
  3500 centimes**, et acompte + solde = total voyageur.
- Jeu de test entièrement supprimé : `stay_requests` et `stay_availability` revenus à 0,
  `stripe_webhook_events` à 0, 3 annonces et 1 propriétaire d'origine intacts.

**⛔ Bloquant restant, action strictement humaine**
Stripe Connect **n'est pas activé en live** sur `acct_1TDPicEQ3UQbwGzY` :
`POST /v1/accounts` répond `400 You can only create new accounts if you've signed up for
Connect` (requestId `req_w8zGbAC5EWADuw`). Aucun propriétaire ne peut donc être onboardé
et aucun acompte encaissé. Le Step 3 supposait l'inverse en lisant `GET /v1/accounts` = 0
comme « aucun propriétaire encore » alors que cela voulait dire « pas de plateforme
Connect ». À faire sur dashboard.stripe.com/connect.

**Dettes ouvertes constatées pendant le smoke** (aucune ne bloque la mise en service)
1. `/api/stays/approve` renvoie un 500 brut quand Stripe refuse la création du compte :
   le propriétaire mérite un message lisible.
2. `/api/stays/pay-balance` renvoie un 500 à corps vide sur erreur Stripe.
3. Corrigé dans la foulée : `send()` ignorait le `error` renvoyé par Resend, donc un
   email refusé disparaissait sans trace (commit `a4b3c96`).

- [x] **Step 4 bis: Réactiver l'endpoint, APRÈS le déploiement** ✅ FAIT 29/07, après le 200 vérifié

À faire juste après le Step 6 (vérification que `/fr/stays` répond 200 en production), jamais avant :

```bash
curl -s -u "$SK:" https://api.stripe.com/v1/webhook_endpoints/we_1TyJZpEQ3UQbwGzYkeimteNI -d disabled=false
```

Puis vérifier dans le dashboard Stripe, onglet du endpoint, que les premières livraisons passent en `200`.

### Décisions tranchées en autonomie le 29/07 (session de mise en service)

**D1. `check:stays` était rouge et invisible.** Le script attendait encore la sémantique
d'avant la décision Kami du 25/07 (`basePriceEur` est un tarif À LA NUIT, pas un forfait) :
il passait 700 pour un séjour de 7 nuits et attendait 735 de total. Il n'était appelé par
aucune chaîne, donc il a dérivé en silence pendant que `pricing.ts` changeait. Corrigé pour
la sémantique réelle, complété par l'invariant d'encaissement (fee acompte 1050 + fee solde
2450 = commission 3500 centimes) et **branché dans `npm run check`**, donc désormais gardé
par la CI. Commit `7cecc63`.

**D2. Un `next build` local avant le merge.** La politique preview opt-in du repo
(`[preview]` dans le message de commit) fait que Vercel annule le build des branches
`feat/*` : le check Vercel de la PR #6 affiche « Canceled by Ignored Build Step ». Les 49
commits n'ont donc jamais été validés par un `next build` en CI. Comme la promotion vers
`main` est un build prod unique, un échec à ce moment laisserait `/fr/stays` en 404 sans
rien signaler. Build lancé en local avant le merge, sortie redirigée vers un fichier (jamais
`| tail`, qui masquerait le code de sortie derrière celui de `tail`).

**D3. Promotion immédiate par le workflow, pas par un push `main`.** `master` ne se déploie
pas : seule la promotion `master → main` déclenche le build prod, et elle est programmée à
20 h Athènes. Attendre 20 h pour vérifier le 200 laisserait le webhook Stripe désactivé une
journée entière et la séquence à moitié faite. Le geste retenu est
`gh workflow run daily-deploy.yml`, prévu par le workflow lui-même (`workflow_dispatch`) et
par le Step 5 ci-dessous. C'est le workflow qui pousse `main`, jamais moi.

- [x] **Step 5: Faire passer la CI et merger** ✅ FAIT 29/07 (`54ae5f5`)

```bash
npm run check
gh pr checks 6
gh pr merge 6 --squash
```

Expected: checks verts, merge sur `master`. Ne PAS pousser `main` : la promotion se fait à 20 h Athènes par `daily-deploy.yml`. Pour une mise en service immédiate, lancer manuellement le workflow (`gh workflow run daily-deploy.yml`).

- [x] **Step 6: Vérifier la production** ✅ FAIT 29/07, 200 / 200 / JSON

```bash
curl -s -o /dev/null -w "%{http_code}\n" -A "Mozilla/5.0" https://crete.direct/fr/stays
curl -s -o /dev/null -w "%{http_code}\n" -A "Mozilla/5.0" https://crete.direct/fr/stays/villa-danae-makrigialos
curl -s https://crete.direct/api/stays/availability/villa-danae-makrigialos | head -c 200
```

Expected: 200, 200, un JSON `{"ok":true,...}`.

- [x] **Step 7: Smoke bout en bout** ✅ FAIT 29/07, sauf le maillon Connect (bloquant humain)

Dans cet ordre, sur une annonce de test créée pour l'occasion (pas sur les 3 annonces Kairos) :
1. `/stays/new` avec un lien Airbnb, obtenir un brouillon et son jeton de publication.
2. Publier avec une vraie URL iCal privée Airbnb, vérifier le passage à `published`.
3. Déposer une demande depuis `/stays/[slug]`, vérifier l'email propriétaire, l'accusé voyageur et le message Telegram.
4. Ouvrir le lien d'acceptation, fixer un prix, accepter : l'onboarding Stripe Connect doit se déclencher. Le compléter en test, revenir, accepter de nouveau.
5. Payer l'acompte avec une carte de test Stripe. Vérifier `deposit_paid` en base, les dates bloquées, l'email voyageur ET l'email propriétaire.
6. Rejouer une demande sur les mêmes dates : attendre un `409 Dates unavailable`.
7. Forcer `date_from` à J+13 en base et déclencher le cron solde à la main, vérifier l'email de solde puis le paiement et le passage à `confirmed`.

Consigner le résultat dans `memory/dev_state.md` et une ligne `session_log.md`.

- [x] **Step 8: Nettoyer** ✅ FAIT 29/07, base revenue à son état d'avant

Supprimer l'annonce de test et ses demandes en base. Vérifier `select count(*) from stay_requests;` revenu à sa valeur d'avant.

---

## Self-Review

**Couverture de la spec**
- §6.2 calendrier alimenté par l'iCal : Tasks 4, 5, 6. Livré.
- §6.4 acompte 30 % puis solde 70 % : Tasks 10, 11, 12, 13. Livré.
- §6.5 statut `confirmed` + emails voyageur ET propriétaire : Tasks 9, 12. Livré.
- §6.5 dates bloquées atomiquement : déjà en place (RPC + GIST), et la Task 7 traite enfin le cas où la contrainte se déclenche.
- §3.3 destination charge + `application_fee_amount` : déjà en place, complété Task 11 pour que la commission totale reste exactement `commissionEur`.
- §12 double-booking cross-plateforme : traité au lot B (synchro iCal). Le lot A pose la couche de disponibilité dont le lot B se sert.

**Balayage des placeholders** : aucun TODO, aucun TBD, aucune consigne du type « ajouter la gestion d'erreur ». Les seuls renvois sont explicites et datés : le délai de 7 jours annoncé en Task 8 est tenu par la Task 10 du lot B, et la synchro iCal est le lot B.

**Cohérence des types** : `DateRange` est `{dateFrom, dateTo}` (borne de sortie exclue), défini dans `ical.ts`, consommé identiquement par `availability.ts`, `bookedRangesForListing` et la route de disponibilité. `computeQuote` renvoie `StayQuote` et est appelé avec la même forme d'entrée en Tasks 9 et 11. Le RPC du solde s'appelle `mark_stay_balance_paid` en Task 10 (SQL) et Task 12 (appel). `newToken`/`hashToken`/`siteBase` viennent tous de `@/lib/stays/tokens`.

**Point de vigilance qui n'est pas une tâche** : les 3 annonces Kairos actuellement en base sont `published` sans iCal et pointent toutes vers `contact@kairosguest.com`. Elles ne doivent PAS servir au smoke de la Task 14, et elles ne doivent pas recevoir de trafic de campagne avant la Task 13 du lot B, qui les rattache à leurs vrais propriétaires.
