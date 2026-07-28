# crete.direct Stays, lot B : autonomie propriétaire et surface de campagne

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prérequis :** le lot A (`2026-07-28-stays-lot-a-tunnel-encaissement.md`) doit être livré et vérifié en production. Ce plan s'appuie sur `src/lib/stays/availability.ts` et sur le fait que le tunnel de paiement fonctionne réellement.

**Goal:** Rendre un propriétaire autonome après sa publication (prix, dates, calendrier synchronisé, désactivation) et ouvrir /stays à la campagne, sur les deux faces à la fois : recrutement de propriétaires et acquisition de voyageurs.

**Architecture:** Trois blocs. (1) La synchronisation iCal, qui manque totalement : la publication vérifie aujourd'hui que le flux est lisible puis le jette, ce qui garantit le surbooking dès qu'un propriétaire reste sur Airbnb. (2) Un espace propriétaire sans compte ni mot de passe, sur le modèle des liens à jeton déjà utilisés pour l'acceptation, cohérent avec le reste du site. (3) La levée du noindex et le maillage, qui ne se fait qu'une fois qu'une annonce réelle d'un propriétaire souscripteur est en ligne.

**Tech Stack:** identique au lot A.

**Décision de campagne (Kami, 28/07/2026) :** propriétaires et voyageurs en parallèle. Conséquence directe : les Tasks 12 et 13 sont bloquantes pour la face voyageurs, la Task 7 l'est pour la face propriétaires.

**Branche :** `feat/stays-marketplace` si le lot A n'est pas encore mergé, sinon une nouvelle branche `feat/stays-owner-space` depuis `master`. Jamais `main`.

---

## File Structure

**Créés**
- `src/lib/stays/ical-sync.ts` + test — diff pur entre un flux iCal et l'état de disponibilité en base.
- `src/lib/stays/owner-tokens.ts` — dérivation et vérification du jeton d'espace propriétaire.
- `src/app/api/stays/owner/route.ts` + test — mise à jour du prix, du minimum de nuits, de la publication.
- `src/app/api/stays/owner/block/route.ts` + test — blocage et déblocage manuel de dates.
- `src/app/api/cron/stays-ical/route.ts` + test — resynchronisation quotidienne des flux OTA.
- `src/app/api/cron/stays-expire/route.ts` + test — expiration des demandes sans réponse.
- `src/app/[locale]/stays/owner/[token]/page.tsx` + `OwnerPanel.tsx` — espace propriétaire.
- `src/app/admin/stays/page.tsx` — cockpit interne.
- `supabase/migrations/20260729_stays_owner_space.sql`

**Modifiés**
- `src/app/api/stays/publish/route.ts` — écrire les dates OTA, renvoyer l'URL d'export iCal et le lien d'espace.
- `src/lib/stays/db.ts` — écritures de disponibilité, lecture par jeton propriétaire.
- `src/lib/stays/emails.ts` — passage en 4 langues, email d'accueil propriétaire, email d'expiration.
- `src/app/[locale]/stays/metadata.ts` — retrait du bloc `robots`.
- `src/app/sitemap.xml/route.ts` — entrée `/stays` et annonces publiées.
- `src/components/layout/Footer.tsx` — lien /stays.
- `src/app/[locale]/where-to-stay/[area]/page.tsx` — maillage vers /stays.
- `vercel.json` — deux crons.

---

## Task 1 : migration de l'espace propriétaire

**Files:**
- Create: `supabase/migrations/20260729_stays_owner_space.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- crete.direct Stays : espace proprietaire et expiration (lot B, 29/07/2026)

alter table public.stay_owners
  add column if not exists owner_token_hash text unique,
  add column if not exists country text,
  add column if not exists business_type text;

alter table public.stay_listings
  add column if not exists ical_synced_at timestamptz,
  add column if not exists ical_last_error text;

create index if not exists stay_listings_ical_sync_idx
  on public.stay_listings (status, ical_synced_at);

create index if not exists stay_requests_pending_idx
  on public.stay_requests (status, created_at);

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Appliquer sur le Postgres VPS**

```bash
scp supabase/migrations/20260729_stays_owner_space.sql root@89.167.115.63:/tmp/
ssh root@89.167.115.63 "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -v ON_ERROR_STOP=1 --single-transaction < /tmp/20260729_stays_owner_space.sql && rm /tmp/20260729_stays_owner_space.sql"
```

Expected: exit 0.

- [ ] **Step 3: Vérifier**

```bash
ssh root@89.167.115.63 "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"select column_name from information_schema.columns where table_name='stay_owners' and column_name in ('owner_token_hash','country','business_type');\""
```

Expected: 3 lignes.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729_stays_owner_space.sql
git commit -m "feat(stays): migration espace proprietaire et synchro ical"
```

---

## Task 2 : diff de synchronisation iCal

Le flux iCal d'un propriétaire change à chaque réservation sur Airbnb. La synchro doit poser les nuits bloquées par l'OTA sans jamais toucher aux nuits vendues par crete.direct.

**Files:**
- Create: `src/lib/stays/ical-sync.ts`
- Test: `src/lib/stays/ical-sync.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { describe, it, expect } from "vitest";
import { diffOtaNights } from "./ical-sync";
import type { DateRange } from "./ical";

const feed: DateRange[] = [{ dateFrom: "2026-08-10", dateTo: "2026-08-13" }];

describe("diffOtaNights", () => {
  it("ajoute les nuits nouvellement bloquees par l OTA", () => {
    const d = diffOtaNights(feed, []);
    expect(d.toBlock).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
    expect(d.toRelease).toEqual([]);
  });

  it("libere les nuits disparues du flux", () => {
    const d = diffOtaNights([], [
      { date: "2026-08-10", status: "blocked_ota" },
      { date: "2026-08-11", status: "blocked_ota" },
    ]);
    expect(d.toBlock).toEqual([]);
    expect(d.toRelease).toEqual(["2026-08-10", "2026-08-11"]);
  });

  it("ne touche jamais une nuit vendue par crete.direct", () => {
    const d = diffOtaNights([], [{ date: "2026-08-10", status: "booked" }]);
    expect(d.toRelease).toEqual([]);
  });

  it("ne rebloque pas une nuit deja bloquee", () => {
    const d = diffOtaNights(feed, [
      { date: "2026-08-10", status: "blocked_ota" },
      { date: "2026-08-11", status: "blocked_ota" },
      { date: "2026-08-12", status: "blocked_ota" },
    ]);
    expect(d.toBlock).toEqual([]);
    expect(d.toRelease).toEqual([]);
  });

  it("laisse intacte une nuit vendue qui apparait aussi dans le flux OTA", () => {
    const d = diffOtaNights(feed, [{ date: "2026-08-10", status: "booked" }]);
    expect(d.toBlock).toEqual(["2026-08-11", "2026-08-12"]);
    expect(d.toRelease).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/lib/stays/ical-sync.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Implémenter**

Créer `src/lib/stays/ical-sync.ts` :

```typescript
import type { DateRange } from "./ical";
import { unavailableNights } from "./availability";

export interface AvailabilityRow {
  date: string;
  status: string;
}

export interface OtaDiff {
  /** Nuits a inserer ou passer en blocked_ota. */
  toBlock: string[];
  /** Nuits blocked_ota a rendre disponibles car disparues du flux. */
  toRelease: string[];
}

/**
 * Compare le flux iCal du proprietaire a l'etat de disponibilite en base.
 * Regle absolue : une nuit vendue par crete.direct (booked) ou tenue (hold) n'est
 * JAMAIS modifiee, quoi que dise l'OTA. Seules les lignes blocked_ota sont pilotees
 * par cette synchro.
 */
export function diffOtaNights(
  feed: DateRange[],
  current: AvailabilityRow[],
): OtaDiff {
  const feedNights = new Set(unavailableNights(feed));
  const byDate = new Map(current.map((r) => [r.date, r.status]));

  const toBlock = [...feedNights]
    .filter((d) => {
      const status = byDate.get(d);
      return status !== "blocked_ota" && status !== "booked" && status !== "hold";
    })
    .sort();

  const toRelease = current
    .filter((r) => r.status === "blocked_ota" && !feedNights.has(r.date))
    .map((r) => r.date)
    .sort();

  return { toBlock, toRelease };
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/lib/stays/ical-sync.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/ical-sync.ts src/lib/stays/ical-sync.test.ts
git commit -m "feat(stays): diff de synchronisation ical"
```

---

## Task 3 : la publication écrit vraiment les dates OTA

**Files:**
- Modify: `src/lib/stays/db.ts`
- Modify: `src/app/api/stays/publish/route.ts`
- Test: `src/app/api/stays/publish/route.test.ts`
- Test: `src/lib/stays/db.test.ts`

- [ ] **Step 1: Écrire le test de l'écriture en base**

Ajouter dans `src/lib/stays/db.test.ts` :

```typescript
import { applyOtaDiff } from "./db";

it("ecrit les nuits bloquees et libere les nuits disparues", async () => {
  const upsert = vi.fn(async () => ({}));
  const del = vi.fn(() => ({ eq: () => ({ in: async () => ({}) }) }));
  from.mockReturnValue({ upsert, delete: del });
  await applyOtaDiff(7, { toBlock: ["2026-08-10"], toRelease: ["2026-08-20"] });
  expect(upsert).toHaveBeenCalledWith(
    [{ listing_id: 7, date: "2026-08-10", status: "blocked_ota", source: "ical" }],
    { onConflict: "listing_id,date" },
  );
  expect(del).toHaveBeenCalled();
});
```

- [ ] **Step 2: Écrire le test de la route**

Ajouter dans `src/app/api/stays/publish/route.test.ts` :

```typescript
it("bloque les dates du flux ical a la publication", async () => {
  getListingBySlug.mockResolvedValueOnce({
    id: 7, publish_token_hash: hashToken("tok"), status: "draft",
  });
  currentAvailability.mockResolvedValueOnce([]);
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    text: async () =>
      "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260810\r\nDTEND;VALUE=DATE:20260812\r\nEND:VEVENT\r\nEND:VCALENDAR",
  })) as never;

  const res = await POST(jsonRequest({
    slug: "villa", icalUrl: "https://airbnb.com/calendar/ical/x.ics", token: "tok",
  }));

  expect(res.status).toBe(200);
  expect(applyOtaDiff).toHaveBeenCalledWith(7, {
    toBlock: ["2026-08-10", "2026-08-11"],
    toRelease: [],
  });
  const body = await res.json();
  expect(body.icalExportUrl).toContain("/api/stays/ical/villa");
  expect(body.ownerUrl).toContain("/stays/owner/");
});
```

- [ ] **Step 3: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/lib/stays/db.test.ts src/app/api/stays/publish/route.test.ts`
Expected: FAIL, `applyOtaDiff` non exporté.

- [ ] **Step 4: Implémenter les écritures**

Ajouter dans `src/lib/stays/db.ts` :

```typescript
import type { OtaDiff } from "./ical-sync";
import type { AvailabilityRow } from "./ical-sync";

export async function currentAvailability(
  listingId: number,
): Promise<AvailabilityRow[]> {
  const { data } = await supabaseAdmin
    .from("stay_availability")
    .select("date, status")
    .eq("listing_id", listingId);
  return (data as AvailabilityRow[]) ?? [];
}

export async function applyOtaDiff(
  listingId: number,
  diff: OtaDiff,
): Promise<void> {
  if (diff.toBlock.length) {
    await supabaseAdmin.from("stay_availability").upsert(
      diff.toBlock.map((date) => ({
        listing_id: listingId,
        date,
        status: "blocked_ota",
        source: "ical",
      })),
      { onConflict: "listing_id,date" },
    );
  }
  if (diff.toRelease.length) {
    await supabaseAdmin
      .from("stay_availability")
      .delete()
      .eq("listing_id", listingId)
      .in("date", diff.toRelease);
  }
}
```

La libération se fait par suppression de la ligne plutôt que par passage à `available` : `bookedRangesForListing` filtre déjà sur les statuts bloquants, et une table sans lignes inutiles reste lisible.

- [ ] **Step 5: Implémenter la route**

Dans `src/app/api/stays/publish/route.ts`, remplacer le bloc `try` qui fait `void events` par :

```typescript
  let events: DateRange[];
  try {
    const res = await fetch(icalUrl);
    if (!res.ok) throw new Error("fetch failed");
    events = parseICalText(await res.text());
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not read the private iCal" },
      { status: 422 },
    );
  }

  await publishListing(listing.id, icalUrl);
  await applyOtaDiff(listing.id, diffOtaNights(events, await currentAvailability(listing.id)));

  // Jeton d'espace proprietaire, cree une seule fois.
  const ownerToken = newToken();
  await supabaseAdmin
    .from("stay_owners")
    .update({ owner_token_hash: hashToken(ownerToken) })
    .eq("id", listing.owner_id)
    .is("owner_token_hash", null);

  return NextResponse.json({
    ok: true,
    status: "published",
    icalExportUrl: `${siteBase()}/api/stays/ical/${listing.slug}`,
    ownerUrl: `${siteBase()}/fr/stays/owner/${ownerToken}`,
  });
```

avec les imports correspondants (`DateRange` depuis `@/lib/stays/ical`, `diffOtaNights` depuis `@/lib/stays/ical-sync`, `applyOtaDiff` et `currentAvailability` depuis `@/lib/stays/db`, `newToken`/`hashToken`/`siteBase` depuis `@/lib/stays/tokens`, `supabaseAdmin`).

Le `is("owner_token_hash", null)` évite qu'une republication invalide un lien d'espace déjà envoyé par email.

- [ ] **Step 6: Afficher les deux URL au propriétaire**

Dans `src/app/[locale]/stays/new/NewListingWizard.tsx`, à l'étape de succès, afficher `icalExportUrl` avec la consigne de le coller dans Airbnb (Calendrier, Synchronisation, Importer un calendrier), et `ownerUrl` comme lien à conserver. Ajouter les chaînes en/fr/de/el dans `content.ts` sous `new.publishedIcalTitle`, `new.publishedIcalHelp`, `new.publishedOwnerTitle`, `new.publishedOwnerHelp`.

C'est l'étape critique identifiée par la spec §12 : sans ce collage, le double-booking cross-plateforme reste possible dans le sens crete.direct vers Airbnb.

- [ ] **Step 7: Lancer les tests, typecheck, build**

Run: `npx vitest run src/lib/stays src/app/api/stays`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: 0 erreur.
Run: `npm run build`
Expected: vert.

- [ ] **Step 8: Commit**

```bash
git add src/lib/stays/db.ts src/lib/stays/db.test.ts src/app/api/stays/publish src/app/\[locale\]/stays
git commit -m "feat(stays): la publication bloque les dates ical et remet les liens proprietaire"
```

---

## Task 4 : cron de resynchronisation iCal

**Files:**
- Create: `src/app/api/cron/stays-ical/route.ts`
- Test: `src/app/api/cron/stays-ical/route.test.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const from = vi.hoisted(() => vi.fn());
const currentAvailability = vi.hoisted(() => vi.fn(async () => []));
const applyOtaDiff = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/stays/db", () => ({ currentAvailability, applyOtaDiff }));

import { GET } from "./route";

const authed = () =>
  new Request("http://x", { headers: { authorization: "Bearer secret" } }) as never;

describe("GET /api/cron/stays-ical", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "secret";
    from.mockReset();
    applyOtaDiff.mockClear();
  });

  it("refuse 401 sans secret", async () => {
    expect((await GET(new Request("http://x") as never)).status).toBe(401);
  });

  it("resynchronise chaque annonce publiee avec un flux", async () => {
    const update = vi.fn(() => ({ eq: async () => ({}) }));
    from.mockReturnValue({
      select: () => ({ eq: () => ({ not: async () => ({
        data: [{ id: 7, ical_private_url: "https://x.ics" }] }) }) }),
      update,
    });
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      text: async () =>
        "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260810\r\nDTEND;VALUE=DATE:20260811\r\nEND:VEVENT\r\nEND:VCALENDAR",
    })) as never;

    const res = await GET(authed());
    expect(res.status).toBe(200);
    expect(applyOtaDiff).toHaveBeenCalledWith(7, {
      toBlock: ["2026-08-10"], toRelease: [],
    });
  });

  it("enregistre l erreur sans planter quand le flux est mort", async () => {
    const update = vi.fn(() => ({ eq: async () => ({}) }));
    from.mockReturnValue({
      select: () => ({ eq: () => ({ not: async () => ({
        data: [{ id: 7, ical_private_url: "https://x.ics" }] }) }) }),
      update,
    });
    globalThis.fetch = vi.fn(async () => ({ ok: false })) as never;
    const res = await GET(authed());
    expect(res.status).toBe(200);
    expect(applyOtaDiff).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/app/api/cron/stays-ical/route.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Implémenter**

```typescript
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { currentAvailability, applyOtaDiff } from "@/lib/stays/db";
import { parseICalText } from "@/lib/stays/ical";
import { diffOtaNights } from "@/lib/stays/ical-sync";

export async function GET(request: Request): Promise<NextResponse> {
  const auth = request.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("stay_listings")
    .select("id, ical_private_url")
    .eq("status", "published")
    .not("ical_private_url", "is", null);

  const rows = data ?? [];
  let synced = 0;
  let failed = 0;

  for (const l of rows) {
    try {
      const res = await fetch(l.ical_private_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const events = parseICalText(await res.text());
      await applyOtaDiff(l.id, diffOtaNights(events, await currentAvailability(l.id)));
      await supabaseAdmin
        .from("stay_listings")
        .update({ ical_synced_at: new Date().toISOString(), ical_last_error: null })
        .eq("id", l.id);
      synced++;
    } catch (e) {
      await supabaseAdmin
        .from("stay_listings")
        .update({ ical_last_error: String(e).slice(0, 500) })
        .eq("id", l.id);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, listings: rows.length, synced, failed });
}
```

Un flux mort n'interrompt pas la boucle et ne dépublie pas l'annonce : il laisse une trace dans `ical_last_error`, remontée par le cockpit de la Task 11.

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/app/api/cron/stays-ical/route.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Déclarer le cron**

Dans `vercel.json`, ajouter :

```json
    { "path": "/api/cron/stays-ical", "schedule": "40 */6 * * *" }
```

Toutes les 6 heures : un calendrier Airbnb ne bouge pas plus vite que ça en pratique, et ça borne le coût.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron/stays-ical vercel.json
git commit -m "feat(stays): cron de resynchronisation des flux ical"
```

---

## Task 5 : le propriétaire modifie son annonce

**Files:**
- Create: `src/app/api/stays/owner/route.ts`
- Test: `src/app/api/stays/owner/route.test.ts`
- Modify: `src/lib/stays/db.ts`

- [ ] **Step 1: Ajouter la lecture par jeton**

Dans `src/lib/stays/db.ts` :

```typescript
export async function getOwnerByTokenHash(
  hash: string,
): Promise<{ id: number; email: string; name: string | null } | null> {
  const { data } = await supabaseAdmin
    .from("stay_owners")
    .select("id, email, name")
    .eq("owner_token_hash", hash)
    .maybeSingle();
  return data ?? null;
}

export async function listingsForOwner(ownerId: number): Promise<StayListing[]> {
  const { data } = await supabaseAdmin
    .from("stay_listings")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  return (data as StayListing[]) ?? [];
}
```

- [ ] **Step 2: Écrire le test qui échoue**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const getOwnerByTokenHash = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stays/db", () => ({ getOwnerByTokenHash }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) }) as never;

describe("POST /api/stays/owner", () => {
  beforeEach(() => {
    getOwnerByTokenHash.mockReset();
    from.mockReset();
  });

  it("refuse 403 sur un jeton inconnu", async () => {
    getOwnerByTokenHash.mockResolvedValueOnce(null);
    expect((await POST(req({ token: "nope", listingId: 1 }))).status).toBe(403);
  });

  it("refuse 403 sur une annonce d un autre proprietaire", async () => {
    getOwnerByTokenHash.mockResolvedValueOnce({ id: 2, email: "o@x" });
    from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 9, owner_id: 99 } }) }) }),
    });
    expect((await POST(req({ token: "t", listingId: 9, basePriceEur: 200 }))).status).toBe(403);
  });

  it("refuse 422 sur un prix negatif", async () => {
    getOwnerByTokenHash.mockResolvedValueOnce({ id: 2, email: "o@x" });
    from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 9, owner_id: 2 } }) }) }),
    });
    expect((await POST(req({ token: "t", listingId: 9, basePriceEur: -5 }))).status).toBe(422);
  });

  it("met a jour prix, minimum de nuits et statut", async () => {
    getOwnerByTokenHash.mockResolvedValueOnce({ id: 2, email: "o@x" });
    const update = vi.fn(() => ({ eq: async () => ({}) }));
    from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 9, owner_id: 2 } }) }) }),
      update,
    });
    const res = await POST(req({
      token: "t", listingId: 9, basePriceEur: 250, cleaningFeeEur: 60,
      minNights: 4, status: "unpublished",
    }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      base_price_eur: 250, cleaning_fee_eur: 60, min_nights: 4, status: "unpublished",
    }));
  });
});
```

- [ ] **Step 3: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/app/api/stays/owner/route.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 4: Implémenter**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getOwnerByTokenHash } from "@/lib/stays/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/stays/tokens";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const owner = await getOwnerByTokenHash(hashToken(token));
  if (!owner) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const listingId = Number(body.listingId);
  const { data: listing } = await supabaseAdmin
    .from("stay_listings")
    .select("id, owner_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.owner_id !== owner.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};

  if (body.basePriceEur !== undefined) {
    const v = Number(body.basePriceEur);
    if (!Number.isFinite(v) || v <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid price" }, { status: 422 });
    }
    patch.base_price_eur = v;
  }
  if (body.cleaningFeeEur !== undefined) {
    const v = Number(body.cleaningFeeEur);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ ok: false, error: "Invalid fee" }, { status: 422 });
    }
    patch.cleaning_fee_eur = v;
  }
  if (body.minNights !== undefined) {
    const v = Number(body.minNights);
    if (!Number.isInteger(v) || v < 1 || v > 90) {
      return NextResponse.json({ ok: false, error: "Invalid min nights" }, { status: 422 });
    }
    patch.min_nights = v;
  }
  if (body.status === "published" || body.status === "unpublished") {
    patch.status = body.status;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 422 });
  }

  await supabaseAdmin.from("stay_listings").update(patch).eq("id", listingId);
  return NextResponse.json({ ok: true, updated: Object.keys(patch) });
}
```

Le prix ne s'applique qu'aux demandes futures : `stay_requests.quoted_price_eur` fige le prix au moment de l'acceptation, une réservation déjà acceptée n'est donc jamais rétroactivement modifiée.

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/app/api/stays/owner/route.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/stays/owner src/lib/stays/db.ts
git commit -m "feat(stays): le proprietaire modifie prix, minimum de nuits et publication"
```

---

## Task 6 : le propriétaire bloque et débloque des dates

**Files:**
- Create: `src/app/api/stays/owner/block/route.ts`
- Test: `src/app/api/stays/owner/block/route.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const getOwnerByTokenHash = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stays/db", () => ({ getOwnerByTokenHash }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) }) as never;

describe("POST /api/stays/owner/block", () => {
  beforeEach(() => {
    getOwnerByTokenHash.mockReset();
    from.mockReset();
  });

  it("bloque une plage de nuits", async () => {
    getOwnerByTokenHash.mockResolvedValueOnce({ id: 2, email: "o@x" });
    const upsert = vi.fn(async () => ({}));
    from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 9, owner_id: 2 } }) }) }),
      upsert,
    });
    const res = await POST(req({
      token: "t", listingId: 9, dateFrom: "2026-09-01", dateTo: "2026-09-03", block: true,
    }));
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      [
        { listing_id: 9, date: "2026-09-01", status: "hold", source: "owner" },
        { listing_id: 9, date: "2026-09-02", status: "hold", source: "owner" },
      ],
      { onConflict: "listing_id,date" },
    );
  });

  it("refuse de debloquer une nuit vendue", async () => {
    getOwnerByTokenHash.mockResolvedValueOnce({ id: 2, email: "o@x" });
    const del = vi.fn(() => ({ eq: () => ({ in: () => ({ in: async () => ({}) }) }) }));
    from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 9, owner_id: 2 } }) }) }),
      delete: del,
    });
    const res = await POST(req({
      token: "t", listingId: 9, dateFrom: "2026-09-01", dateTo: "2026-09-02", block: false,
    }));
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/app/api/stays/owner/block/route.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Implémenter**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getOwnerByTokenHash } from "@/lib/stays/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/stays/tokens";
import { eachNight } from "@/lib/stays/availability";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const owner = await getOwnerByTokenHash(
    hashToken(typeof body.token === "string" ? body.token : ""),
  );
  if (!owner) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const listingId = Number(body.listingId);
  const { data: listing } = await supabaseAdmin
    .from("stay_listings").select("id, owner_id").eq("id", listingId).maybeSingle();
  if (!listing || listing.owner_id !== owner.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const isDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!isDate(body.dateFrom) || !isDate(body.dateTo)) {
    return NextResponse.json({ ok: false, error: "Invalid dates" }, { status: 422 });
  }
  const nights = eachNight(body.dateFrom as string, body.dateTo as string);
  if (!nights.length || nights.length > 365) {
    return NextResponse.json({ ok: false, error: "Invalid range" }, { status: 422 });
  }

  if (body.block === false) {
    // On ne libere que ce que le proprietaire a lui meme pose. Une nuit vendue
    // (booked) ou bloquee par l'OTA (blocked_ota) n'est jamais liberee ici.
    await supabaseAdmin
      .from("stay_availability")
      .delete()
      .eq("listing_id", listingId)
      .in("date", nights)
      .in("status", ["hold"]);
    return NextResponse.json({ ok: true, released: nights.length });
  }

  await supabaseAdmin.from("stay_availability").upsert(
    nights.map((date) => ({
      listing_id: listingId,
      date,
      status: "hold",
      source: "owner",
    })),
    { onConflict: "listing_id,date" },
  );
  return NextResponse.json({ ok: true, blocked: nights.length });
}
```

Attention : l'`upsert` écraserait une ligne `booked`. Ajouter le garde-fou avant l'écriture, en filtrant les nuits déjà vendues :

```typescript
  const { data: taken } = await supabaseAdmin
    .from("stay_availability")
    .select("date")
    .eq("listing_id", listingId)
    .in("date", nights)
    .in("status", ["booked"]);
  const lockedDates = new Set((taken ?? []).map((r: { date: string }) => r.date));
  const writable = nights.filter((n) => !lockedDates.has(n));
  if (!writable.length) {
    return NextResponse.json({ ok: false, error: "All nights are booked" }, { status: 409 });
  }
```

et poser l'`upsert` sur `writable` au lieu de `nights`. Adapter le test de la Task 6 Step 1 pour mocker cette lecture (retour vide) avant l'`upsert`.

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/app/api/stays/owner/block/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stays/owner/block
git commit -m "feat(stays): le proprietaire bloque et debloque ses dates"
```

---

## Task 7 : espace propriétaire

**Files:**
- Create: `src/app/[locale]/stays/owner/[token]/page.tsx`
- Create: `src/app/[locale]/stays/owner/[token]/OwnerPanel.tsx`
- Modify: `src/app/[locale]/stays/content.ts`
- Modify: `src/app/[locale]/stays/metadata.ts`

- [ ] **Step 1: Ajouter les chaînes i18n**

Dans `content.ts`, ajouter la clé `owner` au type `StaysStrings` et la clé `owner` à `StaysMetaKey`, avec les champs : `h1`, `intro`, `priceLabel`, `cleaningLabel`, `minNightsLabel`, `statusLabel`, `statusPublished`, `statusUnpublished`, `save`, `saved`, `blockTitle`, `blockIntro`, `blockAction`, `unblockAction`, `icalTitle`, `icalHelp`, `requestsTitle`, `requestsEmpty`, `error`. Rédiger les 4 locales en/fr/de/el en reprenant le ton des sections voisines. Aucun tiret cadratin.

- [ ] **Step 2: Écrire la page serveur**

```tsx
import { notFound } from "next/navigation";
import { getOwnerByTokenHash, listingsForOwner } from "@/lib/stays/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/stays/tokens";
import { unavailableNights } from "@/lib/stays/availability";
import { bookedRangesForListing } from "@/lib/stays/db";
import { STRINGS, pickStaysLocale } from "../../content";
import { staysMetadata } from "../../metadata";
import OwnerPanel from "./OwnerPanel";

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return staysMetadata(locale, "owner");
}

export default async function OwnerPage({
  params,
}: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  const owner = await getOwnerByTokenHash(hashToken(token));
  if (!owner) notFound();

  const listings = await listingsForOwner(owner.id);
  const ids = listings.map((l) => l.id);
  const { data: requests } = await supabaseAdmin
    .from("stay_requests")
    .select("id, listing_id, guest_name, date_from, date_to, status, quoted_price_eur")
    .in("listing_id", ids.length ? ids : [-1])
    .order("created_at", { ascending: false })
    .limit(50);

  const unavailable: Record<number, string[]> = {};
  for (const l of listings) {
    unavailable[l.id] = unavailableNights(await bookedRangesForListing(l.id));
  }

  return (
    <OwnerPanel
      token={token}
      listings={listings}
      requests={requests ?? []}
      unavailable={unavailable}
      t={STRINGS[pickStaysLocale(locale)].owner}
    />
  );
}
```

- [ ] **Step 3: Écrire le panneau client**

`OwnerPanel.tsx` : composant client rendant, pour chaque annonce, un formulaire (prix par nuit, frais de ménage, minimum de nuits, publié ou non) qui poste sur `/api/stays/owner`, un bloc de blocage de dates qui poste sur `/api/stays/owner/block`, la liste des nuits déjà indisponibles, l'URL d'export iCal à coller dans Airbnb, et le tableau des demandes reçues. Reprendre les classes Tailwind et les tokens de couleur des composants `/stays` existants (`RequestForm.tsx` sert de référence de style).

- [ ] **Step 4: Retirer `owner` du noindex plus tard, pas maintenant**

Dans `metadata.ts`, l'espace propriétaire doit rester `index: false, follow: false` de façon permanente, même après la Task 12 : c'est une page privée à jeton. Le documenter en commentaire pour qu'une future levée globale du noindex ne l'emporte pas.

- [ ] **Step 5: Typecheck et build**

Run: `npx tsc --noEmit`
Expected: 0 erreur.
Run: `npm run build`
Expected: vert.

- [ ] **Step 6: Commit**

```bash
git add src/app/\[locale\]/stays/owner src/app/\[locale\]/stays/content.ts src/app/\[locale\]/stays/metadata.ts
git commit -m "feat(stays): espace proprietaire a jeton"
```

---

## Task 8 : email d'accueil du propriétaire

**Files:**
- Modify: `src/lib/stays/emails.ts`
- Modify: `src/app/api/stays/publish/route.ts`
- Test: `src/lib/stays/emails.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { ownerWelcomeBody } from "./emails";

it("donne au proprietaire son lien d espace et son ical d export", () => {
  const html = ownerWelcomeBody({
    listingTitle: "Villa Danae",
    ownerUrl: "https://crete.direct/fr/stays/owner/tok",
    icalExportUrl: "https://crete.direct/api/stays/ical/villa-danae",
  });
  expect(html).toContain("/stays/owner/tok");
  expect(html).toContain("/api/stays/ical/villa-danae");
  expect(html).toMatch(/airbnb/i);
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/lib/stays/emails.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

```typescript
export function ownerWelcomeBody(o: {
  listingTitle: string;
  ownerUrl: string;
  icalExportUrl: string;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p><strong>${o.listingTitle}</strong> est en ligne sur crete.direct.</p>
    <p><a href="${o.ownerUrl}" style="background:#C8A35F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Gerer mon annonce</a></p>
    <p>Conservez ce lien : il donne acces a votre prix, votre minimum de nuits, vos dates bloquees et vos demandes. Il n'y a ni compte ni mot de passe.</p>
    <p><strong>Une etape a ne pas sauter.</strong> Collez cette adresse dans Airbnb, rubrique Calendrier puis Synchronisation puis Importer un calendrier :</p>
    <p style="font-family:monospace;background:#F2F0EB;padding:12px;border-radius:8px;word-break:break-all">${o.icalExportUrl}</p>
    <p>Sans cela, une reservation prise sur crete.direct ne bloquera pas vos dates sur Airbnb.</p>
  </div>`;
}

export async function sendOwnerWelcome(
  ownerEmail: string,
  o: Parameters<typeof ownerWelcomeBody>[0],
): Promise<void> {
  await send(ownerEmail, `Votre annonce est en ligne : ${o.listingTitle}`, ownerWelcomeBody(o));
}
```

- [ ] **Step 4: Brancher sur la publication**

Dans `src/app/api/stays/publish/route.ts`, après la génération du jeton propriétaire, envoyer l'email à l'adresse du propriétaire de l'annonce, uniquement lors du premier passage à `published` (donc quand `listing.status !== "published"` avant l'appel).

- [ ] **Step 5: Lancer les tests, typecheck**

Run: `npx vitest run src/lib/stays src/app/api/stays`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stays/emails.ts src/lib/stays/emails.test.ts src/app/api/stays/publish
git commit -m "feat(stays): email d accueil proprietaire avec espace et ical d export"
```

---

## Task 9 : emails en quatre langues

Les pages servent en/fr/de/el, les emails sont en français seul. Un voyageur allemand reçoit un email français : ça tue la conversion sur une campagne multilingue.

**Files:**
- Modify: `src/lib/stays/emails.ts`
- Create: `src/lib/stays/email-copy.ts`
- Test: `src/lib/stays/email-copy.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { describe, it, expect } from "vitest";
import { EMAIL_COPY, pickEmailLocale } from "./email-copy";

describe("email-copy", () => {
  it("retombe sur l anglais pour une locale non redigee", () => {
    expect(pickEmailLocale("ru")).toBe("en");
    expect(pickEmailLocale("de")).toBe("de");
  });

  it("expose les memes cles dans les 4 locales", () => {
    const ref = Object.keys(EMAIL_COPY.en).sort();
    for (const loc of ["fr", "de", "el"] as const) {
      expect(Object.keys(EMAIL_COPY[loc]).sort()).toEqual(ref);
    }
  });

  it("n a aucun tiret cadratin", () => {
    expect(JSON.stringify(EMAIL_COPY)).not.toContain("—");
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/lib/stays/email-copy.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Implémenter le module de copie**

Créer `src/lib/stays/email-copy.ts` exportant `EMAIL_LOCALES = ["en","fr","de","el"]`, `pickEmailLocale(locale)` (même logique que `pickStaysLocale`), et `EMAIL_COPY` : un objet par locale portant les sujets et les corps de tous les emails livrés jusqu'ici (`ownerRequest`, `guestReceived`, `guestApproved`, `guestConfirmed`, `guestConflict`, `guestBalanceDue`, `guestBalancePaid`, `ownerBooked`, `ownerWelcome`), avec des jetons `{name}`, `{dateFrom}`, `{amount}` remplacés à l'appel.

- [ ] **Step 4: Propager la locale**

Ajouter un paramètre `locale: string` à toutes les fonctions `send*` de `emails.ts`, résolu par `pickEmailLocale`. Stocker la locale du voyageur : ajouter une colonne `locale text` à `stay_requests` (nouvelle migration `20260729b_stays_request_locale.sql`, même procédure d'application que la Task 1), remplie par `/api/stays/request` depuis le corps de requête, et lue partout où un email part vers le voyageur. Pour le propriétaire, utiliser la locale de la page où il a publié.

- [ ] **Step 5: Lancer toute la suite**

Run: `npx vitest run src/lib/stays src/app/api/stays`
Expected: PASS. Les tests existants qui assertaient des chaînes françaises doivent être mis à jour pour passer `"fr"` explicitement.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stays supabase/migrations/20260729b_stays_request_locale.sql src/app/api/stays
git commit -m "feat(stays): emails en quatre langues"
```

---

## Task 10 : expiration des demandes sans réponse

L'accusé de réception promet une expiration à 7 jours. Le statut `expired` existe en base et n'est jamais posé.

**Files:**
- Create: `src/app/api/cron/stays-expire/route.ts`
- Test: `src/app/api/cron/stays-expire/route.test.ts`
- Modify: `src/lib/stays/emails.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const from = vi.hoisted(() => vi.fn());
const sendGuestExpired = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/stays/emails", () => ({ sendGuestExpired }));

import { GET } from "./route";

const authed = () =>
  new Request("http://x", { headers: { authorization: "Bearer secret" } }) as never;

describe("GET /api/cron/stays-expire", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "secret";
    from.mockReset();
    sendGuestExpired.mockClear();
  });

  it("refuse 401 sans secret", async () => {
    expect((await GET(new Request("http://x") as never)).status).toBe(401);
  });

  it("expire les demandes en attente depuis plus de 7 jours", async () => {
    const update = vi.fn(() => ({ eq: async () => ({}) }));
    from.mockReturnValue({
      select: () => ({ eq: () => ({ lt: async () => ({
        data: [{ id: 4, guest_email: "g@example.com", listing_id: 3, locale: "fr" }] }) }) }),
      update,
    });
    const res = await GET(authed());
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ status: "expired" });
    expect(sendGuestExpired).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/app/api/cron/stays-expire/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

```typescript
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendGuestExpired } from "@/lib/stays/emails";

/** Delai annonce au voyageur dans l'accuse de reception. */
const EXPIRE_AFTER_DAYS = 7;

export async function GET(request: Request): Promise<NextResponse> {
  const auth = request.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - EXPIRE_AFTER_DAYS * 86_400_000).toISOString();
  const { data } = await supabaseAdmin
    .from("stay_requests")
    .select("id, guest_email, listing_id, locale")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  const rows = data ?? [];
  for (const r of rows) {
    await supabaseAdmin.from("stay_requests").update({ status: "expired" }).eq("id", r.id);
    const { data: l } = await supabaseAdmin
      .from("stay_listings").select("title").eq("id", r.listing_id).maybeSingle();
    await sendGuestExpired(r.guest_email, l?.title ?? "votre sejour", r.locale ?? "fr");
  }

  return NextResponse.json({ ok: true, expired: rows.length });
}
```

Ajouter `sendGuestExpired` dans `emails.ts` (sujet et corps dans `email-copy.ts`, clé `guestExpired`, à ajouter aux 4 locales et donc au test de parité de clés de la Task 9).

- [ ] **Step 4: Déclarer le cron**

Dans `vercel.json` :

```json
    { "path": "/api/cron/stays-expire", "schedule": "50 9 * * *" }
```

- [ ] **Step 5: Lancer les tests, commit**

Run: `npx vitest run src/app/api/cron/stays-expire/route.test.ts`
Expected: PASS.

```bash
git add src/app/api/cron/stays-expire src/lib/stays vercel.json
git commit -m "feat(stays): expiration des demandes sans reponse a 7 jours"
```

---

## Task 11 : cockpit interne /admin/stays

**Files:**
- Create: `src/app/admin/stays/page.tsx`
- Modify: `src/app/admin/cockpit/page.tsx`

- [ ] **Step 1: Écrire la page**

Calquer strictement l'authentification de `src/app/admin/flux/page.tsx` (secret `CAR_ADMIN_SECRET`, cookie `car_admin` partagé). Rendu serveur, zéro JS client, à l'image de `/admin/car-rental`.

Contenu, en trois tableaux :
1. **Annonces** : slug, propriétaire, statut, prix par nuit, minimum de nuits, nombre de photos, présence d'un iCal, `ical_synced_at`, `ical_last_error`. Une annonce publiée sans iCal ou dont la dernière synchro date de plus de 24 heures doit ressortir visuellement : c'est le signal de surbooking.
2. **Demandes** : annonce, voyageur, dates, statut, prix accepté, acompte payé, solde demandé, solde payé. Filtrer par statut.
3. **Propriétaires** : email, statut KYC, identifiant de compte Connect, nombre d'annonces. Un propriétaire `kyc_status` différent de `complete` avec une annonce publiée est bloquant : l'annonce est visible mais non réservable.

Ajouter un compteur en tête : demandes des 7 derniers jours, taux d'acceptation, taux de paiement de l'acompte, commission encaissée. Dénominateur nul, afficher `n/d`, jamais un chiffre inventé.

- [ ] **Step 2: Ajouter le raccourci au cockpit**

Dans `src/app/admin/cockpit/page.tsx`, ajouter `/admin/stays` à la constante `ZONES`, zone des outils internes, à côté de `/admin/car-rental`.

- [ ] **Step 3: Typecheck et build**

Run: `npx tsc --noEmit`
Expected: 0 erreur.
Run: `npm run build`
Expected: vert.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/stays src/app/admin/cockpit/page.tsx
git commit -m "feat(stays): cockpit interne admin"
```

---

## Task 12 : ouvrir /stays au référencement et au maillage

Ne faire cette tâche qu'une fois la Task 13 exécutée : ouvrir l'indexation sur trois annonces qui ne peuvent pas honorer une réservation ferait exactement le contraire de l'objectif, sur un site déjà sous chute algorithmique depuis le 19/07.

**Files:**
- Modify: `src/app/[locale]/stays/metadata.ts`
- Modify: `src/app/sitemap.xml/route.ts`
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/app/[locale]/where-to-stay/[area]/page.tsx`

- [ ] **Step 1: Lever le noindex sauf sur les pages à jeton**

Dans `metadata.ts`, remplacer le bloc `robots` par une liste explicite : `index`, `listing` et `terms` deviennent indexables et reçoivent `buildAlternates()` comme les autres pages du site ; `new`, `approve`, `pay`, `balance` et `owner` gardent `robots: { index: false, follow: false }` de façon permanente. Mettre à jour le commentaire d'en-tête pour dire pourquoi.

- [ ] **Step 2: Ajouter au sitemap**

Dans `src/app/sitemap.xml/route.ts`, ajouter l'entrée `/stays` et une entrée par annonce publiée, en suivant exactement le pattern des autres boucles du fichier (priorité 0.7, hreflang sur les locales servies).

- [ ] **Step 3: Maillage interne**

Ajouter un lien `/stays` au `Footer.tsx`, dans la colonne des services, à côté du lien `/car-rental`.

Dans `src/app/[locale]/where-to-stay/[area]/page.tsx`, ajouter un encart vers `/stays` filtré sur la zone quand au moins une annonce publiée s'y trouve. C'est le maillage le plus pertinent du site : ces pages traitent déjà de l'intention « où loger ».

- [ ] **Step 4: Vérifier**

Run: `npm run build`
Expected: vert.

```bash
curl -s http://localhost:3000/sitemap.xml | grep -c "/stays"
```

Expected: au moins 2 (index + annonces).

- [ ] **Step 5: Commit**

```bash
git add src/app/\[locale\]/stays/metadata.ts src/app/sitemap.xml src/components/layout/Footer.tsx src/app/\[locale\]/where-to-stay
git commit -m "feat(stays): indexation, sitemap et maillage interne"
```

---

## Task 13 : régulariser les trois annonces Kairos

Sans code. Ces trois annonces ont été importées le 25/07 avec un propriétaire unique `contact@kairosguest.com`, sans iCal, sans KYC. En l'état elles sont visibles mais non réservables, et une demande voyageur arrive chez Kairos au lieu du propriétaire.

- [ ] **Step 1: Trancher, par bien**

Pour chacun des trois, décider avec Kami : soit le propriétaire réel souscrit et devient propriétaire de l'annonce, soit l'annonce est dépubliée en attendant.

| Annonce | Propriétaire réel | Décision |
|---|---|---|
| `private-beach-vila-ferma` | Avital Zion | à trancher |
| `villa-danae-makrigialos` | Vangelis Sacalis, basé en Belgique | à trancher |
| `maison-piscine-makrygialos` | Anne Abjean et Marc Kerjean | à trancher |

Un propriétaire qui souscrit doit : accepter les CGU, fournir son email, faire son onboarding Stripe Connect (le pays est désormais paramétrable, Task 3 du lot A), et coller l'iCal d'export dans son canal principal.

- [ ] **Step 2: Dépublier ce qui n'est pas régularisé**

```sql
update stay_listings set status = 'unpublished' where slug in (...);
```

Une annonce dépubliée sort de `/stays`, du sitemap, et refuse les demandes (la route filtre déjà sur `status = 'published'`).

- [ ] **Step 3: Rattacher ce qui est régularisé**

Créer la ligne `stay_owners` du vrai propriétaire, basculer `stay_listings.owner_id`, renseigner `ical_private_url`, déclencher une synchro manuelle du cron iCal, puis vérifier que `stay_availability` se remplit.

- [ ] **Step 4: Vérifier l'état final**

```bash
ssh root@89.167.115.63 "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"select l.slug, l.status, o.email, o.kyc_status, l.ical_private_url is not null as ical from stay_listings l join stay_owners o on o.id = l.owner_id order by l.id;\""
```

Expected: aucune ligne `published` sans iCal ni sans `kyc_status = 'complete'`.

- [ ] **Step 5: Consigner**

Écrire la décision par bien dans `memory/project_crete_direct.md` et une ligne `session_log.md`. Mettre à jour les fiches `clients/prospect_avital_zion.md` et `clients/prospect_villa_danae.md`, ainsi que la ligne correspondante de `MEMORY.md` si l'état de la fiche change.

---

## Task 14 : bascule campagne

- [ ] **Step 1: Vérifier que rien ne manque**

```bash
npm run check
npx vitest run src/lib/stays src/app/api/stays src/app/api/cron
npx tsc --noEmit
npm run check:da
```

Expected: tout vert.

- [ ] **Step 2: Merger et déployer**

```bash
git push origin HEAD
gh pr create --base master --title "feat(stays): autonomie proprietaire et surface de campagne" --body "Lot B"
gh pr merge --squash
gh workflow run daily-deploy.yml
```

Jamais `git push origin main`.

- [ ] **Step 3: Vérifier en production**

```bash
for u in /fr/stays /fr/stays/terms /sitemap.xml; do
  printf "%s -> " "$u"
  curl -s -o /dev/null -w "%{http_code}\n" -A "Mozilla/5.0" "https://crete.direct$u"
done
curl -s -A "Mozilla/5.0" https://crete.direct/fr/stays | grep -o 'name="robots"[^>]*'
```

Expected: 200 partout, et plus aucun `noindex` sur `/fr/stays`.

- [ ] **Step 4: Armer la mesure avant d'ouvrir la campagne**

Sans mesure, la campagne ne dira rien. Poser les événements Plausible sur les deux faces, en suivant le pattern des événements `car_*` existants :
- face propriétaire : `stays_owner_start` (ouverture de `/stays/new`), `stays_owner_published`.
- face voyageur : `stays_listing_view`, `stays_request_submit`, `stays_deposit_paid`.

Ajouter un relevé hebdomadaire dans `~/.claude/scripts/` sur le modèle de `flux-impact-weekly.mjs`, écrivant dans un `memory/stays_log.md`, tâche Windows le lundi.

- [ ] **Step 5: Ouvrir la campagne**

La campagne elle-même sort du périmètre de ce plan : elle se prépare une fois cette tâche verte, avec un état de l'outil qui tient les deux promesses, accueillir un propriétaire et encaisser un voyageur.

---

## Self-Review

**Couverture** : la Task 3 et la Task 4 ferment le risque §12 de la spec (double-booking cross-plateforme), dans les deux sens : import du flux OTA vers crete.direct, et export de crete.direct vers l'OTA rendu incontournable au onboarding et rappelé par email. Les Tasks 5 à 8 livrent le dashboard propriétaire que la spec renvoyait en Phase 2, remonté en lot B parce que la campagne recrute des propriétaires. La Task 9 comble un écart jamais tracé entre les pages (4 langues) et les emails (1 langue). La Task 10 tient la promesse d'expiration écrite dans l'accusé de réception du lot A. Les Tasks 12 et 13 sont les deux conditions de la face voyageurs.

**Balayage des placeholders** : les seuls éléments non écrits en dur sont les rédactions de copie (chaînes i18n Tasks 6 et 9, rendu du panneau Task 7, tableaux Task 11) et les décisions commerciales de la Task 13, qui appartiennent à Kami. Chaque cas précise le fichier de référence à copier, la liste exacte des clés ou des colonnes, et la contrainte DA.

**Cohérence des types** : `AvailabilityRow` et `OtaDiff` sont définis dans `ical-sync.ts` et importés par `db.ts` (Task 3), la route de publication (Task 3) et le cron (Task 4). `eachNight` vient de `availability.ts` du lot A et sert au blocage manuel (Task 6). `getOwnerByTokenHash` renvoie la même forme en Tasks 5, 6 et 7. `pickEmailLocale` (Task 9) suit la signature de `pickStaysLocale` déjà en place.

**Piège identifié pendant l'écriture** : l'`upsert` de blocage manuel (Task 6) écraserait une nuit déjà vendue. Le garde-fou est explicite dans la tâche, et la règle générale est posée une fois pour toutes dans `diffOtaNights` : `booked` et `hold` ne sont jamais pilotés par une source externe.
