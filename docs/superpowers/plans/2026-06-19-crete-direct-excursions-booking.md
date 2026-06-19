# Excursions — réservation orchestrée (V1) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un voyageur sur crete.direct de commander une excursion curée ; crete.direct capte la commande, chiffre total + commission, l'opérateur valide la dispo avec le fournisseur par WhatsApp (semi-manuel) puis le client est notifié par email.

**Architecture:** Calqué sur le pattern car-rental. Données curées en const TS (`tour-catalog.ts`), validation pure (`tour-order.ts`), table Supabase `tour_orders` (service_role only), API de capture (`/api/tours/order`) + API admin de transition d'état (`/api/admin/tours/*`), annuaire + formulaire côté client, back-office opérateur côté admin. Aucun paiement en ligne, aucune API WhatsApp (lien `wa.me` prérempli déclenché par l'opérateur).

**Tech Stack:** Next.js (App Router), TypeScript, Supabase (PostgREST self-hosted), Resend (emails client), Telegram Bot API (notif opérateur), `node:test` + `node:assert/strict` (tests purs), Tailwind v4 (charte crete.direct).

**Spec:** `docs/superpowers/specs/2026-06-19-crete-direct-excursions-booking-design.md`

---

## File Structure

| Fichier | Responsabilité | Créé/Modifié |
|---|---|---|
| `src/lib/tour-catalog.ts` | Données curées (excursions + fournisseurs) + helpers purs (`getExcursion`, `listExcursions`, `computeOrder`, `zoneLabel`) | Créer |
| `src/lib/tour-catalog.test.ts` | Tests purs du catalogue | Créer |
| `src/data/tour-catalog.json` | Projection JSON versionnée (pour le VPS / `partner_report.py`) | Créer (généré) |
| `scripts/gen-tour-catalog-json.mjs` | Génère la projection JSON | Créer |
| `scripts/check-tour-catalog.mjs` | Vérifie lookups + drift JSON vs TS | Créer |
| `src/lib/tour-order.ts` | Validation pure du payload → `TourOrderRow` (union honeypot/error/ok) | Créer |
| `src/lib/tour-order.test.ts` | Tests purs de validation | Créer |
| `src/lib/tour-messaging.ts` | Builders purs : lien `wa.me` fournisseur + texte email client | Créer |
| `src/lib/tour-messaging.test.ts` | Tests purs des builders | Créer |
| `src/lib/tour-notify.ts` | Notif Telegram opérateur (nouvelle commande) | Créer |
| `supabase/migrations/20260619_tour_orders.sql` | Table `tour_orders` + index + grants | Créer |
| `src/app/api/tours/order/route.ts` | Capture : parse → validate → dedup → insert → notif | Créer |
| `src/lib/email.ts` | Ajout `sendTourCustomerEmail` (confirmation/refus/contre) | Modifier |
| `src/app/api/admin/tours/list/route.ts` | Back-office : liste des commandes (secret) | Créer |
| `src/app/api/admin/tours/[id]/route.ts` | Back-office : transition d'état + email client (secret) | Créer |
| `src/components/tours/TourOrderForm.tsx` | Formulaire client (calcul live + honeypot) | Créer |
| `src/app/[locale]/excursions/page.tsx` | Annuaire des excursions curées (charte) | Créer |
| `src/app/admin/tours/page.tsx` | Page back-office opérateur (liste + wa.me + boutons d'état) | Créer |
| `package.json` | Scripts `test:tour-*`, `gen:tour-catalog-json`, `check:tour-catalog` (+ agrégat `check`) | Modifier |

**Machine à états** (`tour_orders.status`) : `new → sent_to_supplier → confirmed | declined | counter_proposed`.

---

## Task 1: Catalogue d'excursions (`tour-catalog.ts`)

**Files:**
- Create: `src/lib/tour-catalog.ts`
- Test: `src/lib/tour-catalog.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/tour-catalog.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getExcursion, listExcursions, computeOrder, zoneLabel, EXCURSIONS } from "./tour-catalog.ts";

test("getExcursion returns an active excursion by slug, null otherwise", () => {
  const e = getExcursion("boat-chrissi-ierapetra");
  assert.ok(e);
  assert.equal(e.slug, "boat-chrissi-ierapetra");
  assert.equal(getExcursion("does-not-exist"), null);
});

test("listExcursions returns only active excursions, optionally filtered by zone", () => {
  const all = listExcursions();
  assert.ok(all.every((e) => e.active));
  const east = listExcursions({ zoneId: "lasithi-east" });
  assert.ok(east.every((e) => e.zoneId === "lasithi-east"));
});

test("computeOrder computes total, commission and supplier net with 2-decimal rounding", () => {
  const e = getExcursion("boat-chrissi-ierapetra");
  assert.ok(e);
  const r = computeOrder(e, 4);
  assert.equal(r.total, e.pricePerPerson * 4);
  assert.equal(r.commissionAmount, Math.round(e.pricePerPerson * 4 * e.supplier.commissionPct * 100) / 100);
  assert.equal(r.supplierNet, Math.round((r.total - r.commissionAmount) * 100) / 100);
  assert.equal(Math.round((r.commissionAmount + r.supplierNet) * 100) / 100, r.total);
});

test("zoneLabel resolves a known zone id, falls back to the id", () => {
  assert.equal(zoneLabel("lasithi-east"), "Lasithi & the east");
  assert.equal(zoneLabel("unknown-zone"), "unknown-zone");
});

test("catalog data is internally sane", () => {
  for (const e of EXCURSIONS) {
    assert.ok(e.slug && e.title.en && e.title.fr, `excursion ${e.slug} missing fields`);
    assert.ok(e.pricePerPerson > 0, `excursion ${e.slug} bad price`);
    assert.ok(e.supplier.commissionPct > 0 && e.supplier.commissionPct < 1, `excursion ${e.slug} bad commission`);
    assert.ok(e.supplier.whatsapp.startsWith("+"), `excursion ${e.slug} whatsapp must be E.164`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types src/lib/tour-catalog.test.ts`
Expected: FAIL (`Cannot find module './tour-catalog.ts'`).

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/tour-catalog.ts
// Catalogue d'excursions curé (source unique, pur, zéro I/O) — importable
// client/serveur/node. Projection JSON versionnée via `npm run gen:tour-catalog-json`
// (lue par le VPS / partner_report.py). NE PAS éditer le JSON à la main ;
// check-tour-catalog.mjs vérifie qu'il reste en phase avec ce fichier.
// Zones réutilisées depuis car-partners.ts (DRY).
import { CAR_ZONES } from "./car-partners.ts";

export interface ExcursionSupplier {
  name: string;
  email: string;
  whatsapp: string;          // E.164, ex "+306974147291"
  commissionPct: number;     // 0..1, ex 0.15
  leadRouting?: "relay" | "direct";
  since: string;             // ISO date
}

export interface Excursion {
  slug: string;
  title: { en: string; fr: string };
  zoneId: string;            // doit correspondre à un CAR_ZONES.id
  pricePerPerson: number;    // EUR
  maxPax?: number;
  image?: string;
  supplier: ExcursionSupplier;
  active: boolean;
}

// Seed minimal : une excursion réelle curée (étendu en Task 12).
export const EXCURSIONS: Excursion[] = [
  {
    slug: "boat-chrissi-ierapetra",
    title: { en: "Chrissi Island boat trip", fr: "Excursion en bateau à Chrissi" },
    zoneId: "lasithi-east",
    pricePerPerson: 35,
    maxPax: 8,
    supplier: {
      name: "Chrissi Cruises",
      email: "info@example-chrissi.gr",
      whatsapp: "+306900000000",
      commissionPct: 0.15,
      leadRouting: "relay",
      since: "2026-06-19",
    },
    active: true,
  },
];

export function getExcursion(slug: string): Excursion | null {
  return EXCURSIONS.find((e) => e.slug === slug && e.active) ?? null;
}

export function listExcursions(opts: { zoneId?: string } = {}): Excursion[] {
  return EXCURSIONS.filter((e) => e.active && (!opts.zoneId || e.zoneId === opts.zoneId));
}

export interface OrderAmounts {
  total: number;
  commissionAmount: number;
  supplierNet: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeOrder(excursion: Excursion, pax: number): OrderAmounts {
  const total = round2(excursion.pricePerPerson * pax);
  const commissionAmount = round2(total * excursion.supplier.commissionPct);
  const supplierNet = round2(total - commissionAmount);
  return { total, commissionAmount, supplierNet };
}

export function zoneLabel(zoneId: string): string {
  return CAR_ZONES.find((z) => z.id === zoneId)?.label ?? zoneId;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types src/lib/tour-catalog.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Add the test script and commit**

Add to `package.json` scripts: `"test:tour-catalog": "node --test --experimental-strip-types src/lib/tour-catalog.test.ts"`

```bash
git add src/lib/tour-catalog.ts src/lib/tour-catalog.test.ts package.json
git commit -m "feat(tours): curated excursion catalog + pure helpers"
```

---

## Task 2: Projection JSON + check drift

**Files:**
- Create: `scripts/gen-tour-catalog-json.mjs`
- Create: `scripts/check-tour-catalog.mjs`
- Create: `src/data/tour-catalog.json` (généré)
- Modify: `package.json`

- [ ] **Step 1: Write the generator script**

```javascript
// scripts/gen-tour-catalog-json.mjs
import { writeFileSync } from "node:fs";
import { EXCURSIONS } from "../src/lib/tour-catalog.ts";

const data = { excursions: EXCURSIONS };
const out = new URL("../src/data/tour-catalog.json", import.meta.url);
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`wrote src/data/tour-catalog.json: ${EXCURSIONS.length} excursions`);
```

- [ ] **Step 2: Generate the JSON**

Run: `node --experimental-strip-types scripts/gen-tour-catalog-json.mjs`
Expected: `wrote src/data/tour-catalog.json: 1 excursions`

- [ ] **Step 3: Write the check script**

```javascript
// scripts/check-tour-catalog.mjs
import { readFileSync } from "node:fs";
import { getExcursion, listExcursions, computeOrder, EXCURSIONS } from "../src/lib/tour-catalog.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

ok("getExcursion known slug", getExcursion("boat-chrissi-ierapetra")?.zoneId === "lasithi-east");
ok("getExcursion unknown -> null", getExcursion("nope") === null);
ok("listExcursions all active", listExcursions().every((e) => e.active));
const e = getExcursion("boat-chrissi-ierapetra");
ok("computeOrder commission+net = total", e && Math.round((computeOrder(e, 3).commissionAmount + computeOrder(e, 3).supplierNet) * 100) / 100 === computeOrder(e, 3).total);

// Anti-drift : JSON projection vs TS source
const projected = JSON.stringify({ excursions: EXCURSIONS }, null, 2) + "\n";
let committed = null;
try { committed = readFileSync(new URL("../src/data/tour-catalog.json", import.meta.url), "utf8"); } catch { }
ok("tour-catalog.json en phase avec tour-catalog.ts (sinon: npm run gen:tour-catalog-json)", committed === projected);

process.exit(fail ? 1 : 0);
```

- [ ] **Step 4: Run the check**

Run: `node --experimental-strip-types scripts/check-tour-catalog.mjs`
Expected: all `ok -`, exit 0.

- [ ] **Step 5: Wire scripts + commit**

Add to `package.json` scripts:
- `"gen:tour-catalog-json": "node --experimental-strip-types scripts/gen-tour-catalog-json.mjs"`
- `"check:tour-catalog": "node --experimental-strip-types scripts/check-tour-catalog.mjs"`
- Append `&& npm run check:tour-catalog` to the existing `"check"` script (before `tsc --noEmit`).

```bash
git add scripts/gen-tour-catalog-json.mjs scripts/check-tour-catalog.mjs src/data/tour-catalog.json package.json
git commit -m "feat(tours): JSON projection + drift check for catalog"
```

---

## Task 3: Validation pure (`tour-order.ts`)

**Files:**
- Create: `src/lib/tour-order.ts`
- Test: `src/lib/tour-order.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/tour-order.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTourOrder } from "./tour-order.ts";

const good = {
  excursion_slug: "boat-chrissi-ierapetra",
  date_requested: "2999-07-12",
  pax: 4,
  customer_name: "Jane Doe",
  customer_email: "jane@example.com",
  customer_phone: "+33123456789",
  note: "Two kids",
  locale: "en",
};

test("honeypot field short-circuits", () => {
  const r = validateTourOrder({ ...good, website: "bot" });
  assert.equal(r.kind, "honeypot");
});

test("clean payload builds a row with computed amounts", () => {
  const r = validateTourOrder(good);
  assert.equal(r.kind, "ok");
  if (r.kind === "ok") {
    assert.equal(r.row.excursion_slug, "boat-chrissi-ierapetra");
    assert.equal(r.row.pax, 4);
    assert.equal(r.row.unit_price, 35);
    assert.equal(r.row.total, 140);
    assert.equal(r.row.commission_amount, 21);
    assert.equal(r.row.status, "new");
    assert.equal(r.row.supplier_name, "Chrissi Cruises");
  }
});

test("unknown excursion -> 400", () => {
  const r = validateTourOrder({ ...good, excursion_slug: "nope" });
  assert.equal(r.kind, "error");
  if (r.kind === "error") assert.equal(r.status, 400);
});

test("past date -> 422", () => {
  const r = validateTourOrder({ ...good, date_requested: "2000-01-01" });
  assert.equal(r.kind, "error");
  if (r.kind === "error") assert.equal(r.status, 422);
});

test("pax below 1 -> 422", () => {
  assert.equal(validateTourOrder({ ...good, pax: 0 }).kind, "error");
});

test("bad email -> 422", () => {
  assert.equal(validateTourOrder({ ...good, customer_email: "nope" }).kind, "error");
});

test("missing name -> 422", () => {
  assert.equal(validateTourOrder({ ...good, customer_name: "" }).kind, "error");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types src/lib/tour-order.test.ts`
Expected: FAIL (`Cannot find module './tour-order.ts'`).

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/tour-order.ts
import { getExcursion, computeOrder, type Excursion } from "./tour-catalog.ts";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type TourOrderRow = {
  locale: string;
  excursion_slug: string;
  excursion_title: string;
  zone_id: string;
  supplier_name: string;
  supplier_email: string;
  supplier_whatsapp: string;
  date_requested: string;   // YYYY-MM-DD
  pax: number;
  unit_price: number;
  total: number;
  commission_pct: number;
  commission_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  note: string | null;
  source: string | null;
  status: string;           // "new"
};

export type TourOrderResult =
  | { kind: "honeypot" }
  | { kind: "error"; status: number; error: string }
  | { kind: "ok"; excursion: Excursion; row: TourOrderRow };

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime());
}

export function validateTourOrder(body: Record<string, unknown>): TourOrderResult {
  if (body.website && String(body.website).trim() !== "") return { kind: "honeypot" };

  const slug = String(body.excursion_slug ?? "");
  const excursion = getExcursion(slug);
  if (!excursion) return { kind: "error", status: 400, error: "Unknown excursion" };

  const date_requested = String(body.date_requested ?? "");
  if (!isValidIsoDate(date_requested)) return { kind: "error", status: 422, error: "Invalid date" };
  const todayUtc = new Date().toISOString().slice(0, 10);
  if (date_requested < todayUtc) return { kind: "error", status: 422, error: "Date is in the past" };

  const pax = Number(body.pax);
  if (!Number.isInteger(pax) || pax < 1) return { kind: "error", status: 422, error: "Invalid number of people" };
  if (excursion.maxPax && pax > excursion.maxPax) return { kind: "error", status: 422, error: "Too many people" };

  const customer_name = typeof body.customer_name === "string" ? body.customer_name.trim().slice(0, 120) : "";
  if (!customer_name) return { kind: "error", status: 422, error: "Missing name" };

  const customer_email = typeof body.customer_email === "string" ? body.customer_email.trim().toLowerCase() : "";
  if (!EMAIL_REGEX.test(customer_email)) return { kind: "error", status: 422, error: "Invalid email" };

  const customer_phone = typeof body.customer_phone === "string" && body.customer_phone.trim()
    ? body.customer_phone.trim().slice(0, 40) : null;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;
  const locale = typeof body.locale === "string" && body.locale.trim() ? body.locale.trim().slice(0, 5) : "en";
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim().slice(0, 120) : null;

  const amounts = computeOrder(excursion, pax);

  const row: TourOrderRow = {
    locale,
    excursion_slug: excursion.slug,
    excursion_title: excursion.title.en,
    zone_id: excursion.zoneId,
    supplier_name: excursion.supplier.name,
    supplier_email: excursion.supplier.email,
    supplier_whatsapp: excursion.supplier.whatsapp,
    date_requested,
    pax,
    unit_price: excursion.pricePerPerson,
    total: amounts.total,
    commission_pct: excursion.supplier.commissionPct,
    commission_amount: amounts.commissionAmount,
    customer_name,
    customer_email,
    customer_phone,
    note,
    source,
    status: "new",
  };

  return { kind: "ok", excursion, row };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types src/lib/tour-order.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Add test script + commit**

Add to `package.json` scripts: `"test:tour-order": "node --test --experimental-strip-types src/lib/tour-order.test.ts"`

```bash
git add src/lib/tour-order.ts src/lib/tour-order.test.ts package.json
git commit -m "feat(tours): pure tour-order validation -> row"
```

---

## Task 4: Migration DB `tour_orders`

**Files:**
- Create: `supabase/migrations/20260619_tour_orders.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260619_tour_orders.sql
-- Commandes d'excursions (annuaire /excursions). Acces service_role only,
-- aucun acces anon (donnees personnelles). Calque sur car_requests.
create table if not exists public.tour_orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  locale text not null default 'en',
  excursion_slug text not null,
  excursion_title text not null,
  zone_id text not null,
  supplier_name text not null,
  supplier_email text not null,
  supplier_whatsapp text not null,
  date_requested date not null,
  pax smallint not null,
  unit_price numeric not null,
  total numeric not null,
  commission_pct numeric not null,
  commission_amount numeric not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  note text,
  source text,
  status text not null default 'new',         -- new | sent_to_supplier | confirmed | declined | counter_proposed
  counter_note text,
  updated_at timestamptz not null default now()
);

create index if not exists tour_orders_created_idx on public.tour_orders (created_at desc);
create index if not exists tour_orders_status_idx on public.tour_orders (status, created_at desc);
create index if not exists tour_orders_dedup_idx on public.tour_orders (customer_email, excursion_slug, date_requested);

-- Donnees personnelles : aucun acces aux roles publics (defense en profondeur).
revoke all on public.tour_orders from anon, authenticated;
grant select, insert, update on public.tour_orders to service_role;
grant usage, select on sequence public.tour_orders_id_seq to service_role;

-- PostgREST self-hosted : recharger le cache de schema.
notify pgrst, 'reload schema';
```

- [ ] **Step 2: Apply on the prod DB (owner action)**

Run (depuis la racine du repo, après revue) :
```bash
cat supabase/migrations/20260619_tour_orders.sql | ssh kairos-vps \
  "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse"
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"notify pgrst, 'reload schema';\""
```
Expected: `CREATE TABLE`, `CREATE INDEX` ×3, `REVOKE`, `GRANT` ×2, `NOTIFY`.

Verify:
```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c '\\d tour_orders'"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260619_tour_orders.sql
git commit -m "feat(tours): tour_orders table migration"
```

---

## Task 5: Notif opérateur (`tour-notify.ts`) + API capture (`/api/tours/order`)

**Files:**
- Create: `src/lib/tour-notify.ts`
- Create: `src/app/api/tours/order/route.ts`

- [ ] **Step 1: Write the Telegram notifier**

```typescript
// src/lib/tour-notify.ts
import type { TourOrderRow } from "./tour-order.ts";

export async function notifyNewTourOrder(row: TourOrderRow): Promise<void> {
  const token = process.env.AFFILIATE_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.AFFILIATE_CHAT_ID || process.env.TG_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[tour-notify] no bot token/chat configured; skipping notification");
    return;
  }
  const text =
    `🚤 New excursion order\n` +
    `${row.excursion_title} · ${row.date_requested} · ${row.pax} pax\n` +
    `Total ${row.total}€ · commission ${row.commission_amount}€\n` +
    `${row.customer_name} · ${row.customer_email}${row.customer_phone ? " · " + row.customer_phone : ""}\n` +
    `Supplier: ${row.supplier_name}\n` +
    `→ Back-office: validate & WhatsApp the supplier`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error("[tour-notify] sendMessage failed:", e);
  }
}
```

- [ ] **Step 2: Write the capture route**

```typescript
// src/app/api/tours/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { validateTourOrder } from "@/lib/tour-order";
import { notifyNewTourOrder } from "@/lib/tour-notify";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const v = validateTourOrder(body);
  if (v.kind === "honeypot") return NextResponse.json({ ok: true });
  if (v.kind === "error") return NextResponse.json({ error: v.error }, { status: v.status });
  const { row } = v;

  // Dédup 10 min (même email + excursion + date)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: dup } = await supabase.from("tour_orders").select("id")
    .eq("customer_email", row.customer_email)
    .eq("excursion_slug", row.excursion_slug)
    .eq("date_requested", row.date_requested)
    .gte("created_at", tenMinAgo)
    .limit(1);
  if (dup && dup.length > 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("tour_orders").insert(row);
  if (error) {
    console.error("[tours/order] insert error:", error.message);
    return NextResponse.json({ error: "Could not save your request, try again" }, { status: 500 });
  }

  await notifyNewTourOrder(row);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify build + types**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Manual smoke test (after migration applied + dev server)**

Run dev: `npm run dev` (separate terminal). Then:
```bash
curl -s -X POST http://localhost:3000/api/tours/order -H "Content-Type: application/json" \
  -d '{"excursion_slug":"boat-chrissi-ierapetra","date_requested":"2999-07-12","pax":4,"customer_name":"Test","customer_email":"test@example.com","locale":"en"}'
```
Expected: `{"ok":true}` and a row in `tour_orders` (status `new`) + Telegram notif if env configured.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tour-notify.ts src/app/api/tours/order/route.ts
git commit -m "feat(tours): capture API + operator Telegram notification"
```

---

## Task 6: Builders purs (`tour-messaging.ts`)

**Files:**
- Create: `src/lib/tour-messaging.ts`
- Test: `src/lib/tour-messaging.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/tour-messaging.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSupplierWhatsappLink, buildCustomerEmail } from "./tour-messaging.ts";

const order = {
  id: 1,
  excursion_title: "Chrissi Island boat trip",
  date_requested: "2999-07-12",
  pax: 4,
  total: 140,
  commission_amount: 21,
  supplier_name: "Chrissi Cruises",
  supplier_whatsapp: "+30 690 000 0000",
  customer_name: "Jane Doe",
  customer_email: "jane@example.com",
  counter_note: null,
};

test("buildSupplierWhatsappLink builds a wa.me link with digits-only number and key figures", () => {
  const link = buildSupplierWhatsappLink(order);
  assert.ok(link.startsWith("https://wa.me/306900000000?text="));
  const text = decodeURIComponent(link.split("text=")[1]);
  assert.match(text, /Chrissi Island boat trip/);
  assert.match(text, /4 pax/);
  assert.match(text, /140/);   // total
  assert.match(text, /119/);   // supplier net = 140 - 21
  assert.match(text, /21/);    // commission
});

test("buildCustomerEmail returns subject + text for confirmed", () => {
  const m = buildCustomerEmail(order, "confirmed");
  assert.match(m.subject, /confirmed/i);
  assert.match(m.text, /Chrissi Island boat trip/);
  assert.match(m.text, /2999-07-12/);
});

test("buildCustomerEmail declined and counter variants differ", () => {
  assert.match(buildCustomerEmail(order, "declined").text, /unfortunately/i);
  const counter = buildCustomerEmail({ ...order, counter_note: "Try 13 July instead" }, "counter_proposed");
  assert.match(counter.text, /Try 13 July instead/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types src/lib/tour-messaging.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/tour-messaging.ts
export interface OrderView {
  id: number;
  excursion_title: string;
  date_requested: string;
  pax: number;
  total: number;
  commission_amount: number;
  supplier_name: string;
  supplier_whatsapp: string;
  customer_name: string;
  customer_email: string;
  counter_note: string | null;
}

export type CustomerEmailKind = "confirmed" | "declined" | "counter_proposed";

export function buildSupplierWhatsappLink(o: OrderView): string {
  const net = Math.round((o.total - o.commission_amount) * 100) / 100;
  const firstName = o.supplier_name.split(" ")[0];
  const text = [
    `Hi ${firstName}, new booking via crete.direct:`,
    `${o.excursion_title} · ${o.date_requested} · ${o.pax} pax.`,
    `Total ${o.total}€ · your part ${net}€ · crete.direct commission ${o.commission_amount}€.`,
    `Do you confirm? Reply: Yes / No / propose another date or activity.`,
  ].join("\n");
  const number = o.supplier_whatsapp.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function buildCustomerEmail(o: OrderView, kind: CustomerEmailKind): { subject: string; text: string } {
  const base = `${o.excursion_title} on ${o.date_requested} for ${o.pax} people`;
  if (kind === "confirmed") {
    return {
      subject: `Your excursion is confirmed — ${o.excursion_title}`,
      text: [
        `Hi ${o.customer_name},`,
        ``,
        `Good news: ${o.supplier_name} confirmed ${base}.`,
        `They will contact you shortly with the meeting point and details. You pay the provider directly.`,
        ``,
        `Thanks for booking with crete.direct.`,
      ].join("\n"),
    };
  }
  if (kind === "declined") {
    return {
      subject: `Update on your excursion request — ${o.excursion_title}`,
      text: [
        `Hi ${o.customer_name},`,
        ``,
        `Unfortunately ${o.supplier_name} cannot take ${base}.`,
        `Reply to this email and we'll help you find an alternative.`,
        ``,
        `crete.direct`,
      ].join("\n"),
    };
  }
  // counter_proposed
  return {
    subject: `A new proposal for your excursion — ${o.excursion_title}`,
    text: [
      `Hi ${o.customer_name},`,
      ``,
      `${o.supplier_name} proposes the following for your request (${base}):`,
      ``,
      `${o.counter_note ?? "(see details)"}`,
      ``,
      `Reply to this email to accept or decline.`,
      ``,
      `crete.direct`,
    ].join("\n"),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types src/lib/tour-messaging.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add test script + commit**

Add to `package.json` scripts: `"test:tour-messaging": "node --test --experimental-strip-types src/lib/tour-messaging.test.ts"`

```bash
git add src/lib/tour-messaging.ts src/lib/tour-messaging.test.ts package.json
git commit -m "feat(tours): pure builders for supplier WhatsApp link + customer emails"
```

---

## Task 7: Email client (`sendTourCustomerEmail` dans `email.ts`)

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Add the sender (uses the pure builder from Task 6)**

Append to `src/lib/email.ts` (the file already has `import { Resend }`, `const resend`, `const FROM_EMAIL`):

```typescript
import { buildCustomerEmail, type OrderView, type CustomerEmailKind } from "./tour-messaging";

export async function sendTourCustomerEmail(order: OrderView, kind: CustomerEmailKind) {
  const { subject, text } = buildCustomerEmail(order, kind);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customer_email,
    replyTo: "hello@crete.direct",
    subject,
    text,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}
```

> Note: if `email.ts` groups imports at the top, move the `import { buildCustomerEmail ... }` line up with the other imports rather than mid-file.

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(tours): customer confirmation/decline/counter emails via Resend"
```

---

## Task 8: API admin — liste + transitions

**Files:**
- Create: `src/app/api/admin/tours/list/route.ts`
- Create: `src/app/api/admin/tours/[id]/route.ts`

- [ ] **Step 1: Write the list route**

```typescript
// src/app/api/admin/tours/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  if (!secret || secret !== process.env.TOURS_ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data } = await supabase
    .from("tour_orders")
    .select("id, created_at, excursion_title, date_requested, pax, total, commission_amount, supplier_name, supplier_whatsapp, customer_name, customer_email, customer_phone, note, status, counter_note")
    .in("status", ["new", "sent_to_supplier", "counter_proposed"])
    .order("created_at", { ascending: false })
    .limit(100);
  return NextResponse.json({ orders: data ?? [] });
}
```

- [ ] **Step 2: Write the transition route**

```typescript
// src/app/api/admin/tours/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { sendTourCustomerEmail } from "@/lib/email";
import type { OrderView } from "@/lib/tour-messaging";

export const runtime = "nodejs";

const ACTIONS = ["sent", "confirm", "decline", "counter"] as const;
type Action = (typeof ACTIONS)[number];

const NEXT_STATUS: Record<Action, string> = {
  sent: "sent_to_supplier",
  confirm: "confirmed",
  decline: "declined",
  counter: "counter_proposed",
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  if (!secret || secret !== process.env.TOURS_ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 422 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const action = String(body.action ?? "") as Action;
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 422 });
  const counterNote = typeof body.counter_note === "string" ? body.counter_note.slice(0, 500) : null;
  if (action === "counter" && !counterNote) return NextResponse.json({ error: "counter_note required" }, { status: 422 });

  const { data: order } = await supabase.from("tour_orders").select("*").eq("id", id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = { status: NEXT_STATUS[action], updated_at: new Date().toISOString() };
  if (action === "counter") patch.counter_note = counterNote;
  const { error } = await supabase.from("tour_orders").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email client pour confirm/decline/counter (pas pour 'sent')
  if (action !== "sent") {
    const view: OrderView = {
      id: order.id,
      excursion_title: order.excursion_title,
      date_requested: order.date_requested,
      pax: order.pax,
      total: Number(order.total),
      commission_amount: Number(order.commission_amount),
      supplier_name: order.supplier_name,
      supplier_whatsapp: order.supplier_whatsapp,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      counter_note: action === "counter" ? counterNote : order.counter_note,
    };
    try {
      await sendTourCustomerEmail(view, NEXT_STATUS[action] as "confirmed" | "declined" | "counter_proposed");
    } catch (e) {
      console.error("[admin/tours] email failed:", e);
      return NextResponse.json({ ok: true, emailFailed: true });
    }
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Add env var note + commit**

Document new env var `TOURS_ADMIN_SECRET` (to set on Vercel Production). Then:
```bash
git add src/app/api/admin/tours/list/route.ts "src/app/api/admin/tours/[id]/route.ts"
git commit -m "feat(tours): admin list + state-transition API (secret-gated)"
```

---

## Task 9: Formulaire client (`TourOrderForm.tsx`)

**Files:**
- Create: `src/components/tours/TourOrderForm.tsx`

- [ ] **Step 1: Write the component (charte crete.direct)**

```tsx
// src/components/tours/TourOrderForm.tsx
"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface Props {
  excursionSlug: string;
  excursionTitle: string;
  pricePerPerson: number;
  maxPax?: number;
  locale: string;
}

export default function TourOrderForm({ excursionSlug, excursionTitle, pricePerPerson, maxPax = 12, locale }: Props) {
  const [pax, setPax] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const total = pricePerPerson * pax;
  const todayMin = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      excursion_slug: excursionSlug,
      date_requested: fd.get("date_requested"),
      pax,
      customer_name: fd.get("customer_name"),
      customer_email: fd.get("customer_email"),
      customer_phone: fd.get("customer_phone"),
      note: fd.get("note"),
      website: fd.get("website"), // honeypot
      locale,
    };
    try {
      const res = await fetch("/api/tours/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong");
      else setDone(true);
    } catch {
      setError("Network error, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[1.75rem] border border-lagoon/40 bg-white p-6 shadow-[0_12px_30px_rgba(11,94,120,.12)]">
        <h3 className="flex items-center gap-2 text-xl font-heading font-bold text-aegean mb-2">
          <CheckCircle2 className="w-5 h-5 text-ok" /> Request sent
        </h3>
        <p className="text-sm text-text">
          We&apos;ll confirm availability with the provider and email you within ~24 h. You pay the provider directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[1.75rem] border border-border bg-white p-6 space-y-4 shadow-[0_12px_30px_rgba(11,94,120,.12)]">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1">Date</label>
          <input name="date_requested" type="date" required min={todayMin}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">People</label>
          <input type="number" min={1} max={maxPax} value={pax}
            onChange={(e) => setPax(Math.max(1, Math.min(maxPax, Number(e.target.value) || 1)))}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1">Your name</label>
        <input name="customer_name" required maxLength={120}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1">Email</label>
          <input name="customer_email" type="email" required
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">WhatsApp / phone (optional)</label>
          <input name="customer_phone" type="tel"
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1">Note (optional)</label>
        <textarea name="note" maxLength={500} rows={2}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 transition-colors" />
      </div>

      <div className="flex items-center justify-between rounded-lg bg-stone px-4 py-3">
        <span className="text-sm text-text">{pax} × {pricePerPerson}€</span>
        <span className="font-heading font-bold text-aegean">Total {total}€</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting}
        className="inline-flex items-center gap-2 rounded-[17px] bg-sun text-text font-heading font-bold px-5 py-2.5 shadow-[0_10px_26px_rgba(11,94,120,.16)] hover:brightness-105 disabled:opacity-60 transition-all">
        {submitting ? "Sending…" : `Request ${excursionTitle}`}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/tours/TourOrderForm.tsx
git commit -m "feat(tours): client booking form (live total, honeypot, brand)"
```

---

## Task 10: Annuaire `/excursions`

**Files:**
- Create: `src/app/[locale]/excursions/page.tsx`

- [ ] **Step 1: Write the directory page**

```tsx
// src/app/[locale]/excursions/page.tsx
import { setRequestLocale } from "next-intl/server";
import { listExcursions, zoneLabel } from "@/lib/tour-catalog";
import { buildAlternates } from "@/lib/seo";
import TourOrderForm from "@/components/tours/TourOrderForm";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const T = {
  title: "Book a Crete excursion",
  metaDesc: "Book curated boat trips, tours and excursions across Crete. We confirm availability with local providers and you pay them directly.",
  intro: "Curated excursions run by trusted local providers. Pick one, send a request, and we confirm availability with the provider — you pay them directly.",
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return {
    title: `${T.title} | Crete Direct`,
    description: T.metaDesc,
    alternates: buildAlternates(locale, "/excursions"),
    openGraph: { title: T.title, description: T.metaDesc, url: `${BASE_URL}/${locale}/excursions`, type: "website" },
  };
}

export default async function ExcursionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const excursions = listExcursions();
  const lang = locale === "fr" ? "fr" : "en";

  return (
    <main className="min-h-screen bg-surface">
      <section className="relative pt-16 pb-20 bg-gradient-to-b from-sky via-[#8FE0EC] to-lagoon overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-4">
          <h1 className="font-heading font-extrabold text-4xl md:text-[46px] leading-[1.06] tracking-tight text-text mb-3">
            {T.title}
          </h1>
          <p className="text-base md:text-lg text-[rgba(11,57,84,.8)] max-w-2xl leading-relaxed">{T.intro}</p>
        </div>
        <svg className="absolute bottom-0 left-0 w-full h-[50px]" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden>
          <path d="M0 40 C180 0 320 70 540 42 C760 14 900 66 1130 40 C1290 22 1380 36 1440 28 L1440 70 L0 70 Z" fill="#F6FBFC" />
        </svg>
      </section>

      <div className="max-w-3xl mx-auto px-4 pb-20 space-y-8 mt-10">
        {excursions.length === 0 && (
          <p className="text-text-muted">No excursions available yet — check back soon.</p>
        )}
        {excursions.map((e) => (
          <section key={e.slug} className="card-base p-6">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h2 className="font-heading text-[22px] font-extrabold text-text m-0">{e.title[lang]}</h2>
              <span className="font-heading font-bold text-aegean whitespace-nowrap">{e.pricePerPerson}€ / person</span>
            </div>
            <p className="text-sm text-text-muted mb-4">{zoneLabel(e.zoneId)} · {e.supplier.name}</p>
            <TourOrderForm
              excursionSlug={e.slug}
              excursionTitle={e.title[lang]}
              pricePerPerson={e.pricePerPerson}
              maxPax={e.maxPax}
              locale={locale}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Manual check**

Run dev server, open `http://localhost:3000/en/excursions` and `/fr/excursions`. Expected: hero + one excursion card with the form; total updates live with the People field.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/excursions/page.tsx"
git commit -m "feat(tours): /excursions directory page with booking form"
```

---

## Task 11: Back-office opérateur (`/admin/tours`)

**Files:**
- Create: `src/app/admin/tours/page.tsx`

- [ ] **Step 1: Write the operator page (client component, secret from URL)**

```tsx
// src/app/admin/tours/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { buildSupplierWhatsappLink, type OrderView } from "@/lib/tour-messaging";

interface Order extends OrderView {
  created_at: string;
  customer_phone: string | null;
  note: string | null;
  status: string;
}

export default function AdminToursPage() {
  const [secret, setSecret] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async (s: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/tours/list?secret=${encodeURIComponent(s)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg(data.error || "Error"); return; }
    setOrders(data.orders);
    setMsg(null);
  }, []);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("secret");
    if (fromUrl) { setSecret(fromUrl); load(fromUrl); }
  }, [load]);

  async function act(id: number, action: string, counter_note?: string) {
    const res = await fetch(`/api/admin/tours/${id}?secret=${encodeURIComponent(secret)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, counter_note }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "Error"); return; }
    if (data.emailFailed) setMsg("State updated but email failed");
    await load(secret);
  }

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-2xl font-extrabold text-text mb-4">Excursion orders</h1>

        <div className="flex gap-2 mb-6">
          <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="admin secret"
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
          <button onClick={() => load(secret)} className="rounded-lg bg-aegean text-white px-4 py-2 text-sm">Load</button>
        </div>

        {loading && <p className="text-text-muted">Loading…</p>}
        {msg && <p className="text-sm text-terra mb-4">{msg}</p>}

        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card-base p-5">
              <div className="flex justify-between items-baseline gap-2">
                <h2 className="font-heading font-bold text-text">{o.excursion_title}</h2>
                <span className="text-xs rounded-full bg-stone px-2 py-1">{o.status}</span>
              </div>
              <p className="text-sm text-text-muted mt-1">
                {o.date_requested} · {o.pax} pax · total {o.total}€ · commission {o.commission_amount}€
              </p>
              <p className="text-sm text-text mt-1">
                {o.customer_name} · {o.customer_email}{o.customer_phone ? " · " + o.customer_phone : ""}
              </p>
              {o.note && <p className="text-sm text-text-muted mt-1">Note: {o.note}</p>}
              <p className="text-sm text-text-muted mt-1">Supplier: {o.supplier_name}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                <a href={buildSupplierWhatsappLink(o)} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg bg-ok text-white px-3 py-2 text-sm font-semibold">WhatsApp supplier</a>
                <button onClick={() => act(o.id, "sent")} className="rounded-lg bg-stone px-3 py-2 text-sm">Mark sent</button>
                <button onClick={() => act(o.id, "confirm")} className="rounded-lg bg-aegean text-white px-3 py-2 text-sm">Confirm</button>
                <button onClick={() => act(o.id, "decline")} className="rounded-lg border border-border px-3 py-2 text-sm">Decline</button>
                <button onClick={() => { const n = prompt("Counter-proposal to send the client:"); if (n) act(o.id, "counter", n); }}
                  className="rounded-lg border border-border px-3 py-2 text-sm">Counter</button>
              </div>
            </div>
          ))}
          {!loading && orders.length === 0 && <p className="text-text-muted">No open orders.</p>}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/tours/page.tsx
git commit -m "feat(tours): operator back-office (list, wa.me, state actions)"
```

---

## Task 12: Seed catalogue réel + vérif finale

**Files:**
- Modify: `src/lib/tour-catalog.ts` (remplacer le seed placeholder par ≥1 excursion réelle curée par Kami)
- Modify: `src/data/tour-catalog.json` (régénéré)

- [ ] **Step 1: Replace the placeholder supplier with a real curated excursion**

Edit `EXCURSIONS` in `src/lib/tour-catalog.ts`: real `title`, real `supplier.name/email/whatsapp` (E.164), `pricePerPerson`, `commissionPct`, `zoneId` matching a `CAR_ZONES.id`. Keep the test slug `boat-chrissi-ierapetra` OR update `tour-catalog.test.ts`, `tour-order.test.ts`, `check-tour-catalog.mjs` to the new slug/figures consistently.

- [ ] **Step 2: Regenerate the JSON projection**

Run: `node --experimental-strip-types scripts/gen-tour-catalog-json.mjs`

- [ ] **Step 3: Run all tours tests + checks**

Run:
```bash
node --test --experimental-strip-types src/lib/tour-catalog.test.ts
node --test --experimental-strip-types src/lib/tour-order.test.ts
node --test --experimental-strip-types src/lib/tour-messaging.test.ts
npm run check:tour-catalog
npx tsc --noEmit
```
Expected: all PASS / `ok -` / exit 0.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds, `/[locale]/excursions` and `/admin/tours` compiled.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tour-catalog.ts src/data/tour-catalog.json src/lib/tour-catalog.test.ts src/lib/tour-order.test.ts scripts/check-tour-catalog.mjs
git commit -m "feat(tours): seed real curated excursion + final checks"
```

---

## Deployment notes (post-merge, owner actions)

1. Apply migration `20260619_tour_orders.sql` on prod DB (Task 4 Step 2) — **before** merging to `main`.
2. Set Vercel Production env var `TOURS_ADMIN_SECRET` (random hex).
3. Reuse existing env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `AFFILIATE_BOT_TOKEN`/`TELEGRAM_BOT_TOKEN`, `AFFILIATE_CHAT_ID`/`TG_CHAT_ID`.
4. Merge `feat/excursions-booking` → `master` (PR), then `git push origin master:main` to deploy.
5. Smoke test prod: submit on `/en/excursions`, check Telegram notif + back-office at `/admin/tours?secret=…`, run a WhatsApp + Confirm and verify the customer email.

## V2 (out of scope — see spec)
Panier multi-activités · paiement en ligne (Stripe Connect) · WhatsApp Business API (boutons interactifs + webhook → états auto) · self-service prestataire · greffe sur `things-to-do/[city]` · extension autres catégories.
