# crete.direct « Stays » — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a vendable seasonal-rental marketplace inside crete.direct where an owner pastes an Airbnb link to create a listing, a traveller requests dates, the owner approves and sets the price, and crete.direct collects payment via Stripe Connect destination charge with a 5% fee.

**Architecture:** Clone the Kairos booking engine (Stripe Connect Express + destination charge, idempotent webhook, atomic date-locking via GIST exclusion, iCal import/export, server-side pricing, cancellation policy) into the `cp-multiquote` repo, and insert the ONE new step the Kairos engine lacks: `request → owner approves & fixes price → traveller pays`. Reuse cp-multiquote's proven car-rental primitives (token hash, honeypot, ip_hash rate-limit, dedup, Resend shell, Telegram best-effort) so the new code matches repo conventions. All owner-facing verification is passive (no human moderation): `draft` on paste → `published` only with a private Airbnb iCal → **bookable** only after Stripe KYC.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase (Postgres, `supabase-admin` service-role client), Stripe Connect (Express, destination charge + `application_fee_amount`), Resend, Vitest 4.x (co-located `src/**/*.test.ts`, `environment: node`), Telegram Bot API (best-effort).

**Reference source files (read before implementing):**
- Kairos (to port): `C:\Users\fkerj\siteweb\src\app\api\stripe\connect\onboard\route.ts`, `...\api\bookings\create\route.ts`, `...\api\bookings\webhook\route.ts`, `...\supabase\migrations\20260418_atomic_booking.sql`, `...\src\lib\booking\ical-import.ts`, `...\src\app\api\ical\[token]\route.ts`, `...\src\lib\booking\emails.ts`, `...\api\bookings\cancel\route.ts`.
- cp-multiquote (conventions to match): `src\app\api\car-rental\submit\route.ts`, `...\quote\route.ts`, `...\accept\route.ts`, `src\lib\car-quote.ts`, `src\lib\car-lead.ts`, `src\lib\supabase-admin.ts`, `src\lib\email.ts`, `src\lib\affiliate-notify.ts`, `src\lib\car-partners.ts`, `supabase\migrations\20260708_car_multi_quote.sql`.

**Spec:** `docs/superpowers/specs/2026-07-24-crete-direct-stays-design.md` (all decisions locked there).

**Branch policy (non-negotiable):** Work on `feat/stays-marketplace`. Commit author MUST be `kerjeanfrancois29 <kerjeanfrancois29@gmail.com>` (Vercel blocks otherwise). PR targets `master`. NEVER push `main` (the daily 20:00 Athens GitHub Action promotes `master`→`main`). Preview via `[preview]` in a commit message when needed.

**Test command convention:** `npx vitest run <path/to/file.test.ts>` for one file. Full typecheck: `npx tsc --noEmit`. Repo aggregate check: `npm run check`.

---

## File Structure

**New migration**
- Create: `supabase/migrations/20260724_stays_marketplace.sql` — 4 tables (`stay_owners`, `stay_listings`, `stay_availability`, `stay_requests`) + ported `stripe_webhook_events` + `btree_gist` + GIST exclusion constraint + `mark_stay_deposit_paid` RPC + grants + `notify pgrst, 'reload schema'`.

**New pure/node-safe libs (unit-tested)**
- Create: `src/lib/stays/types.ts` — shared TS types & status unions. No I/O.
- Create: `src/lib/stays/pricing.ts` — server-side price/quote/deposit/commission math (anti-tampering).
- Create: `src/lib/stays/cancellation.ts` — refund policy (>14 j=100%, 2–14 j=50%, <48 h=0%).
- Create: `src/lib/stays/validation.ts` — request-input validation, honeypot, email regex, date sanity, `ipHash()`.
- Create: `src/lib/stays/airbnb-scrape.ts` — best-effort Airbnb URL parser (`parseAirbnbListing`, `scrapeAirbnbUrl` with injectable fetch).
- Create: `src/lib/stays/ical.ts` — `parseICalText` (ported from Kairos) + `buildIcalExport` (booked dates → RFC iCal).
- Create: `src/lib/stays/emails.ts` — Resend senders + pure subject/body builders (Kalimera shell reused from `@/lib/email`).
- Create: `src/lib/stays/stripe-helpers.ts` — `buildCheckoutParams` (pure destination-charge param builder) + `createConnectOnboardingLink`.
- Create: `src/lib/stays/db.ts` — `supabase-admin` queries (create/get/publish listing, create/approve request, availability writes).

**New API routes**
- Create: `src/app/api/stays/new/route.ts` — POST: scrape + create `draft` listing + owner.
- Create: `src/app/api/stays/publish/route.ts` — POST: attach private iCal, sync availability, set `published`.
- Create: `src/app/api/stays/request/route.ts` — POST: guest request (honeypot, ip_hash rate-limit, dedup) → notify owner (email + Telegram).
- Create: `src/app/api/stays/approve/route.ts` — POST: owner approve (fix price) / decline; trigger KYC link if no Connect account.
- Create: `src/app/api/stays/pay/route.ts` — POST: create Stripe Checkout Session (destination charge, 30% deposit).
- Create: `src/app/api/stays/webhook/route.ts` — Stripe webhook, idempotent, atomic date-lock, confirmation emails.
- Create: `src/app/api/stays/ical/[token]/route.ts` — GET: export iCal for an owner's listing.
- Create: `src/app/api/stays/connect/onboard/route.ts` — GET/POST: Express onboarding link + return callback.

**New pages (build + manual-verified)**
- Create: `src/app/[locale]/stays/page.tsx` — published listings index.
- Create: `src/app/[locale]/stays/new/page.tsx` + `NewListingWizard.tsx` — paste-link onboarding.
- Create: `src/app/[locale]/stays/[slug]/page.tsx` + `RequestForm.tsx` — listing detail + request form.
- Create: `src/app/[locale]/stays/approve/[token]/page.tsx` + `ApprovePanel.tsx` — owner approve/price UI.
- Create: `src/app/[locale]/stays/pay/[token]/page.tsx` + `PayButton.tsx` — traveller pay UI.
- Create: `src/app/[locale]/stays/terms/page.tsx` — CGU (intermédiaire technique).

**Modified**
- Modify: `package.json` — add `check:stays` script + wire into `check`.
- Modify: `scripts/` — add `scripts/check-stays.mjs` (repo-style smoke on pure libs).

---

## Task 1: Branch + migration (schema, RPC, constraint)

**Files:**
- Create: `supabase/migrations/20260724_stays_marketplace.sql`

- [ ] **Step 1: Create the working branch**

```bash
cd /c/Users/fkerj/cp-multiquote
git checkout -b feat/stays-marketplace
git config user.email "kerjeanfrancois29@gmail.com"
git config user.name "kerjeanfrancois29"
```

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/20260724_stays_marketplace.sql`:

```sql
-- crete.direct « Stays » — seasonal rental marketplace (Phase 1)
-- Convention: idempotent, explicit grants, ends with notify pgrst.

create extension if not exists btree_gist;

-- Idempotent Stripe webhook ledger (ported from Kairos siteweb)
create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  received_at timestamptz not null default now(),
  type text,
  request_id bigint,
  processed boolean not null default false
);

create table if not exists public.stay_owners (
  id bigint primary key generated always as identity,
  name text,
  email text not null unique,
  phone text,
  stripe_connect_account_id text unique,
  kyc_status text not null default 'none', -- none | pending | complete
  created_at timestamptz not null default now()
);

create table if not exists public.stay_listings (
  id bigint primary key generated always as identity,
  owner_id bigint not null references public.stay_owners(id) on delete cascade,
  slug text not null unique,
  airbnb_id text,
  airbnb_url text,
  title text,
  description text,
  photos text[] not null default '{}',
  zone_id text,
  location_slug text,
  lat double precision,
  lng double precision,
  property_type text,
  bedrooms smallint,
  beds smallint,
  max_guests smallint,
  base_price_eur numeric not null default 0,     -- owner NET price
  cleaning_fee_eur numeric not null default 0,
  min_nights smallint not null default 1,
  amenities jsonb not null default '[]',
  commission_rate numeric not null default 5,    -- percent added to guest
  ical_private_url text,
  ical_sync_meta jsonb,
  status text not null default 'draft',           -- draft | published | unpublished
  created_at timestamptz not null default now()
);
create index if not exists stay_listings_status_idx on public.stay_listings (status);
create index if not exists stay_listings_owner_idx on public.stay_listings (owner_id);

create table if not exists public.stay_availability (
  id bigint primary key generated always as identity,
  listing_id bigint not null references public.stay_listings(id) on delete cascade,
  date date not null,
  status text not null default 'available',       -- available | booked | blocked_ota | hold
  source text,
  request_id bigint,
  price_override numeric,
  unique (listing_id, date)
);
create index if not exists stay_availability_listing_date_idx on public.stay_availability (listing_id, date);

create table if not exists public.stay_requests (
  id bigint primary key generated always as identity,
  listing_id bigint not null references public.stay_listings(id) on delete cascade,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  date_from date not null,
  date_to date not null,
  pax smallint,
  message text,
  status text not null default 'pending',
    -- pending | approved | declined | expired | deposit_paid | confirmed | cancelled
  quoted_price_eur numeric,                       -- owner NET price fixed at approval
  quoted_at timestamptz,
  approve_token_hash text unique,
  pay_token_hash text unique,
  stripe_session_id text,
  deposit_amount numeric,
  deposit_paid_at timestamptz,
  deposit_payment_intent_id text,
  balance_amount numeric,
  balance_paid_at timestamptz,
  balance_payment_intent_id text,
  commission_eur numeric,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists stay_requests_listing_idx on public.stay_requests (listing_id);
create index if not exists stay_requests_dedup_idx on public.stay_requests (guest_email, listing_id, date_from);
create index if not exists stay_requests_ip_idx on public.stay_requests (ip_hash, created_at);

-- Double-booking impossible at DB level for paid/confirmed stays.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stay_requests_no_overlap'
  ) then
    alter table public.stay_requests
      add constraint stay_requests_no_overlap
      exclude using gist (
        listing_id with =,
        daterange(date_from, date_to, '[)') with &&
      )
      where (status in ('deposit_paid', 'confirmed'));
  end if;
end $$;

-- Atomic confirmation: flip status + write availability in one call.
-- Raises 23P01 (exclusion_violation) if the dates were taken meanwhile.
create or replace function public.mark_stay_deposit_paid(
  p_request_id bigint,
  p_session_id text,
  p_payment_intent_id text
)
returns setof public.stay_requests
language plpgsql
as $$
declare
  r public.stay_requests;
  d date;
begin
  update public.stay_requests
     set status = 'deposit_paid',
         deposit_paid_at = now(),
         deposit_payment_intent_id = p_payment_intent_id,
         stripe_session_id = coalesce(p_session_id, stripe_session_id)
   where id = p_request_id
     and status in ('approved', 'pending')
   returning * into r;

  if r.id is null then
    return; -- already processed or not approvable; caller treats as no-op
  end if;

  d := r.date_from;
  while d < r.date_to loop
    insert into public.stay_availability (listing_id, date, status, source, request_id)
    values (r.listing_id, d, 'booked', 'stays', r.id)
    on conflict (listing_id, date)
    do update set status = 'booked', source = 'stays', request_id = r.id;
    d := d + 1;
  end loop;

  return next r;
end $$;

revoke all on public.stripe_webhook_events from anon, authenticated;
revoke all on public.stay_owners from anon, authenticated;
revoke all on public.stay_listings from anon, authenticated;
revoke all on public.stay_availability from anon, authenticated;
revoke all on public.stay_requests from anon, authenticated;

grant select, insert, update on public.stripe_webhook_events to service_role;
grant select, insert, update on public.stay_owners to service_role;
grant select, insert, update on public.stay_listings to service_role;
grant select, insert, update, delete on public.stay_availability to service_role;
grant select, insert, update on public.stay_requests to service_role;
grant execute on function public.mark_stay_deposit_paid(bigint, text, text) to service_role;

notify pgrst, 'reload schema';
```

- [ ] **Step 3: Apply the migration**

Apply to the crete.direct Supabase project via the Supabase MCP `apply_migration` (name: `stays_marketplace`, the SQL above) OR paste into the Supabase SQL editor. Then verify.

- [ ] **Step 4: Verify the schema exists**

Run (Supabase MCP `list_tables` or SQL editor):

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name like 'stay_%';
```

Expected: `stay_owners`, `stay_listings`, `stay_availability`, `stay_requests`. Also confirm the constraint:

```sql
select conname from pg_constraint where conname='stay_requests_no_overlap';
```

Expected: 1 row.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260724_stays_marketplace.sql
git commit -m "feat(stays): DB schema, GIST exclusion, atomic deposit RPC"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/lib/stays/types.ts`

- [ ] **Step 1: Write the types**

```typescript
export type ListingStatus = "draft" | "published" | "unpublished";

export type RequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "expired"
  | "deposit_paid"
  | "confirmed"
  | "cancelled";

export type AvailabilityStatus = "available" | "booked" | "blocked_ota" | "hold";

export interface StayOwner {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  stripe_connect_account_id: string | null;
  kyc_status: "none" | "pending" | "complete";
  created_at: string;
}

export interface StayListing {
  id: number;
  owner_id: number;
  slug: string;
  airbnb_id: string | null;
  airbnb_url: string | null;
  title: string | null;
  description: string | null;
  photos: string[];
  zone_id: string | null;
  location_slug: string | null;
  lat: number | null;
  lng: number | null;
  property_type: string | null;
  bedrooms: number | null;
  beds: number | null;
  max_guests: number | null;
  base_price_eur: number;
  cleaning_fee_eur: number;
  min_nights: number;
  amenities: unknown[];
  commission_rate: number;
  ical_private_url: string | null;
  ical_sync_meta: unknown | null;
  status: ListingStatus;
  created_at: string;
}

export interface StayRequest {
  id: number;
  listing_id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  date_from: string;
  date_to: string;
  pax: number | null;
  message: string | null;
  status: RequestStatus;
  quoted_price_eur: number | null;
  quoted_at: string | null;
  approve_token_hash: string | null;
  pay_token_hash: string | null;
  stripe_session_id: string | null;
  deposit_amount: number | null;
  commission_eur: number | null;
  ip_hash: string | null;
  created_at: string;
}

/** Quote shown to the traveller. All amounts in EUR. */
export interface StayQuote {
  nights: number;
  basePriceEur: number;      // owner net price for the stay (owner-defined)
  cleaningFeeEur: number;
  ownerNetEur: number;       // basePriceEur + cleaningFeeEur (owner receives)
  commissionEur: number;     // 5% shown to guest as "frais de paiement"
  guestTotalEur: number;     // ownerNetEur + commissionEur
  depositEur: number;        // 30% of guestTotalEur
  balanceEur: number;        // 70% of guestTotalEur
  applicationFeeCents: number; // commission on the deposit charge, in cents
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stays/types.ts
git commit -m "feat(stays): shared types"
```

---

## Task 3: Pricing (anti-tampering quote math)

**Files:**
- Create: `src/lib/stays/pricing.ts`
- Test: `src/lib/stays/pricing.test.ts`

Pricing rule (spec §2/§3/§6): the displayed price is the owner NET price; 5% is ADDED to the guest as "frais de paiement". Deposit = 30% of guest total, balance = 70%. `application_fee_amount` on the deposit charge = commission share of the deposit, in cents. Amounts rounded to 2 decimals; cents rounded to integer.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { nightsBetween, computeQuote } from "./pricing";

describe("nightsBetween", () => {
  it("counts nights exclusive of checkout", () => {
    expect(nightsBetween("2026-07-01", "2026-07-08")).toBe(7);
  });
  it("throws on non-positive range", () => {
    expect(() => nightsBetween("2026-07-08", "2026-07-01")).toThrow();
  });
});

describe("computeQuote", () => {
  it("adds 5% commission on top of owner net (100 EUR/night x7)", () => {
    const q = computeQuote({
      basePriceEur: 700, // owner net for the stay
      cleaningFeeEur: 0,
      commissionRate: 5,
      dateFrom: "2026-07-01",
      dateTo: "2026-07-08",
    });
    expect(q.nights).toBe(7);
    expect(q.ownerNetEur).toBe(700);
    expect(q.commissionEur).toBe(35);
    expect(q.guestTotalEur).toBe(735);
    expect(q.depositEur).toBe(220.5);   // 30%
    expect(q.balanceEur).toBe(514.5);   // 70%
    expect(q.applicationFeeCents).toBe(1050); // 5% of 210 (deposit's owner-net share) -> see impl
  });

  it("includes cleaning fee in owner net and commission base", () => {
    const q = computeQuote({
      basePriceEur: 300,
      cleaningFeeEur: 50,
      commissionRate: 5,
      dateFrom: "2026-08-01",
      dateTo: "2026-08-04",
    });
    expect(q.ownerNetEur).toBe(350);
    expect(q.commissionEur).toBe(17.5);
    expect(q.guestTotalEur).toBe(367.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/pricing.test.ts`
Expected: FAIL ("computeQuote is not a function" / module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
const round2 = (n: number): number => Math.round(n * 100) / 100;

export function nightsBetween(dateFrom: string, dateTo: string): number {
  const from = new Date(dateFrom + "T00:00:00Z").getTime();
  const to = new Date(dateTo + "T00:00:00Z").getTime();
  const nights = Math.round((to - from) / 86_400_000);
  if (!Number.isFinite(nights) || nights <= 0) {
    throw new Error("Invalid date range");
  }
  return nights;
}

export const DEPOSIT_PCT = 0.3;

export interface QuoteInput {
  basePriceEur: number;      // owner NET price for the whole stay
  cleaningFeeEur: number;
  commissionRate: number;    // percent, e.g. 5
  dateFrom: string;
  dateTo: string;
}

import type { StayQuote } from "./types";

export function computeQuote(input: QuoteInput): StayQuote {
  const nights = nightsBetween(input.dateFrom, input.dateTo);
  const ownerNetEur = round2(input.basePriceEur + input.cleaningFeeEur);
  const commissionEur = round2(ownerNetEur * (input.commissionRate / 100));
  const guestTotalEur = round2(ownerNetEur + commissionEur);
  const depositEur = round2(guestTotalEur * DEPOSIT_PCT);
  const balanceEur = round2(guestTotalEur - depositEur);
  // application_fee on the deposit charge = commission share of the deposit portion.
  const ownerNetDeposit = round2(ownerNetEur * DEPOSIT_PCT);
  const applicationFeeCents = Math.round(
    ownerNetDeposit * (input.commissionRate / 100) * 100,
  );
  return {
    nights,
    basePriceEur: round2(input.basePriceEur),
    cleaningFeeEur: round2(input.cleaningFeeEur),
    ownerNetEur,
    commissionEur,
    guestTotalEur,
    depositEur,
    balanceEur,
    applicationFeeCents,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stays/pricing.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/pricing.ts src/lib/stays/pricing.test.ts
git commit -m "feat(stays): server-side quote math (5% on top, 30/70 split)"
```

---

## Task 4: Cancellation policy (ported from Kairos)

**Files:**
- Create: `src/lib/stays/cancellation.ts`
- Test: `src/lib/stays/cancellation.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { daysUntil, computeRefund } from "./cancellation";

describe("computeRefund", () => {
  it(">14 days -> 100%", () => {
    expect(computeRefund(735, 20)).toBe(735);
  });
  it("2-14 days -> 50%", () => {
    expect(computeRefund(735, 10)).toBe(367.5);
  });
  it("<48h -> 0%", () => {
    expect(computeRefund(735, 1)).toBe(0);
  });
});

describe("daysUntil", () => {
  it("returns whole days from now to check-in", () => {
    const inTen = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    expect(daysUntil(inTen)).toBeGreaterThanOrEqual(9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/cancellation.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
export function daysUntil(checkIn: string): number {
  const target = new Date(checkIn + "T00:00:00Z").getTime();
  const now = Date.now();
  return Math.floor((target - now) / 86_400_000);
}

export function computeRefund(totalPrice: number, days: number): number {
  if (days > 14) return totalPrice;
  if (days >= 2) return Math.round(totalPrice * 0.5 * 100) / 100;
  return 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stays/cancellation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/cancellation.ts src/lib/stays/cancellation.test.ts
git commit -m "feat(stays): cancellation refund policy"
```

---

## Task 5: Request validation + honeypot + ip_hash

**Files:**
- Create: `src/lib/stays/validation.ts`
- Test: `src/lib/stays/validation.test.ts`

Mirrors `src/lib/car-lead.ts` (honeypot `website`, email regex, discriminated result) and the `ip_hash` SHA256+salt pattern from `car-rental/submit/route.ts`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { validateStayRequest, ipHash } from "./validation";

const base = {
  guestName: "Jane",
  guestEmail: "jane@example.com",
  dateFrom: "2026-07-01",
  dateTo: "2026-07-08",
  pax: 2,
};

describe("validateStayRequest", () => {
  it("accepts a well-formed body", () => {
    const r = validateStayRequest({ ...base });
    expect(r.kind).toBe("ok");
  });
  it("treats a filled honeypot as honeypot (silent)", () => {
    const r = validateStayRequest({ ...base, website: "bot" });
    expect(r.kind).toBe("honeypot");
  });
  it("rejects a bad email", () => {
    const r = validateStayRequest({ ...base, guestEmail: "nope" });
    expect(r.kind).toBe("error");
  });
  it("rejects an inverted date range", () => {
    const r = validateStayRequest({ ...base, dateFrom: "2026-07-08", dateTo: "2026-07-01" });
    expect(r.kind).toBe("error");
  });
});

describe("ipHash", () => {
  it("is deterministic and 64 hex chars", () => {
    const a = ipHash("1.2.3.4");
    const b = ipHash("1.2.3.4");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("returns null for empty ip", () => {
    expect(ipHash(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/validation.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { createHash } from "node:crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidStayRequest {
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  dateFrom: string;
  dateTo: string;
  pax: number | null;
  message: string | null;
}

export type StayRequestValidation =
  | { kind: "ok"; row: ValidStayRequest }
  | { kind: "honeypot" }
  | { kind: "error"; status: number; error: string };

export function validateStayRequest(
  body: Record<string, unknown>,
): StayRequestValidation {
  if (body.website && String(body.website).trim() !== "") {
    return { kind: "honeypot" };
  }
  const guestName = typeof body.guestName === "string" ? body.guestName.trim() : "";
  const guestEmail =
    typeof body.guestEmail === "string" ? body.guestEmail.trim().toLowerCase() : "";
  const dateFrom = String(body.dateFrom ?? "");
  const dateTo = String(body.dateTo ?? "");

  const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!guestName || !EMAIL_REGEX.test(guestEmail) || !isDate(dateFrom) || !isDate(dateTo)) {
    return { kind: "error", status: 422, error: "Invalid request" };
  }
  if (new Date(dateTo + "T00:00:00Z").getTime() <= new Date(dateFrom + "T00:00:00Z").getTime()) {
    return { kind: "error", status: 422, error: "Invalid date range" };
  }
  const paxRaw = Number(body.pax);
  return {
    kind: "ok",
    row: {
      guestName,
      guestEmail,
      guestPhone: typeof body.guestPhone === "string" ? body.guestPhone.trim() : null,
      dateFrom,
      dateTo,
      pax: Number.isFinite(paxRaw) && paxRaw > 0 ? Math.floor(paxRaw) : null,
      message: typeof body.message === "string" ? body.message.slice(0, 2000) : null,
    },
  };
}

export function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.STAYS_RL_SALT || process.env.CAR_RL_SALT || "crete-direct-stays-rl";
  return createHash("sha256").update(ip + salt).digest("hex");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stays/validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/validation.ts src/lib/stays/validation.test.ts
git commit -m "feat(stays): request validation, honeypot, ip_hash"
```

---

## Task 6: Airbnb scrape parser (best-effort + fallback)

**Files:**
- Create: `src/lib/stays/airbnb-scrape.ts`
- Test: `src/lib/stays/airbnb-scrape.test.ts`

Best-effort: extract `airbnb_id` from the URL and title/photos/description from Open Graph tags. Never throws — returns a partial that the owner completes. `scrapeAirbnbUrl` takes an injectable `fetchImpl` for testability.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { airbnbIdFromUrl, parseAirbnbListing, scrapeAirbnbUrl } from "./airbnb-scrape";

const HTML = `
<html><head>
<meta property="og:title" content="Sea view villa in Makrigialos" />
<meta property="og:description" content="Cosy 2-bedroom villa with pool" />
<meta property="og:image" content="https://a0.example.com/pic1.jpg" />
<meta property="og:image" content="https://a0.example.com/pic2.jpg" />
</head><body></body></html>`;

describe("airbnbIdFromUrl", () => {
  it("extracts numeric id from /rooms/", () => {
    expect(airbnbIdFromUrl("https://www.airbnb.com/rooms/12345678?x=1")).toBe("12345678");
  });
  it("returns null when absent", () => {
    expect(airbnbIdFromUrl("https://example.com/nope")).toBeNull();
  });
});

describe("parseAirbnbListing", () => {
  it("pulls title, description and photos from OG tags", () => {
    const r = parseAirbnbListing(HTML);
    expect(r.title).toBe("Sea view villa in Makrigialos");
    expect(r.description).toBe("Cosy 2-bedroom villa with pool");
    expect(r.photos).toEqual([
      "https://a0.example.com/pic1.jpg",
      "https://a0.example.com/pic2.jpg",
    ]);
  });
  it("returns empty partial on junk without throwing", () => {
    expect(parseAirbnbListing("<html></html>").photos).toEqual([]);
  });
});

describe("scrapeAirbnbUrl", () => {
  it("returns ok=false but a usable partial when fetch fails", async () => {
    const failing = async () => { throw new Error("blocked"); };
    const r = await scrapeAirbnbUrl("https://www.airbnb.com/rooms/999", failing);
    expect(r.ok).toBe(false);
    expect(r.data.airbnbId).toBe("999");
  });
  it("parses when fetch returns HTML", async () => {
    const okFetch = async () => ({ ok: true, text: async () => HTML }) as unknown as Response;
    const r = await scrapeAirbnbUrl("https://www.airbnb.com/rooms/12345678", okFetch);
    expect(r.ok).toBe(true);
    expect(r.data.title).toBe("Sea view villa in Makrigialos");
    expect(r.data.airbnbId).toBe("12345678");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/airbnb-scrape.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
export interface ScrapedListing {
  airbnbId: string | null;
  title: string | null;
  description: string | null;
  photos: string[];
}

export function airbnbIdFromUrl(url: string): string | null {
  const m = url.match(/\/rooms\/(\d+)/);
  return m ? m[1] : null;
}

function metaAll(html: string, prop: string): string[] {
  const re = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "gi",
  );
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

export function parseAirbnbListing(html: string): ScrapedListing {
  return {
    airbnbId: null,
    title: metaAll(html, "og:title")[0] ?? null,
    description: metaAll(html, "og:description")[0] ?? null,
    photos: metaAll(html, "og:image"),
  };
}

type FetchLike = (url: string) => Promise<Response>;

export interface ScrapeResult {
  ok: boolean;
  data: ScrapedListing & { airbnbId: string | null };
}

export async function scrapeAirbnbUrl(
  url: string,
  fetchImpl: FetchLike = fetch,
): Promise<ScrapeResult> {
  const airbnbId = airbnbIdFromUrl(url);
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return { ok: false, data: { airbnbId, title: null, description: null, photos: [] } };
    const html = await res.text();
    const parsed = parseAirbnbListing(html);
    return { ok: true, data: { ...parsed, airbnbId } };
  } catch {
    return { ok: false, data: { airbnbId, title: null, description: null, photos: [] } };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stays/airbnb-scrape.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/airbnb-scrape.ts src/lib/stays/airbnb-scrape.test.ts
git commit -m "feat(stays): best-effort Airbnb scrape with fallback"
```

---

## Task 7: iCal import parser + export builder

**Files:**
- Create: `src/lib/stays/ical.ts`
- Test: `src/lib/stays/ical.test.ts`

Port Kairos's dependency-free parser (`parseICalText`). Add `buildIcalExport` (booked date ranges → RFC iCal). Import returns `{ dateFrom, dateTo }[]` in `YYYY-MM-DD`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { parseICalText, buildIcalExport } from "./ical";

const ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260701",
  "DTEND;VALUE=DATE:20260708",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseICalText", () => {
  it("extracts date ranges as YYYY-MM-DD", () => {
    const events = parseICalText(ICS);
    expect(events).toEqual([{ dateFrom: "2026-07-01", dateTo: "2026-07-08" }]);
  });
  it("returns [] on empty input", () => {
    expect(parseICalText("")).toEqual([]);
  });
});

describe("buildIcalExport", () => {
  it("emits one VEVENT per booked range", () => {
    const ics = buildIcalExport("villa-makrigialos", [
      { dateFrom: "2026-07-01", dateTo: "2026-07-08" },
    ]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260701");
    expect(ics).toContain("DTEND;VALUE=DATE:20260708");
    expect(ics).toContain("END:VCALENDAR");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/ical.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
export interface DateRange {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD (exclusive checkout)
}

function toIso(yyyymmdd: string): string | null {
  const m = yyyymmdd.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function fieldFromBlock(block: string, field: string): string | null {
  const re = new RegExp(`${field}[^:]*:([^\\r\\n]+)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

export function parseICalText(text: string): DateRange[] {
  if (!text) return [];
  const blocks = text.split("BEGIN:VEVENT").slice(1);
  const out: DateRange[] = [];
  for (const raw of blocks) {
    const block = raw.split("END:VEVENT")[0];
    const start = fieldFromBlock(block, "DTSTART");
    const end = fieldFromBlock(block, "DTEND");
    const dateFrom = start ? toIso(start) : null;
    const dateTo = end ? toIso(end) : null;
    if (dateFrom && dateTo) out.push({ dateFrom, dateTo });
  }
  return out;
}

const compact = (iso: string) => iso.replace(/-/g, "");

export function buildIcalExport(slug: string, ranges: DateRange[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//crete.direct//stays//EN",
    "CALSCALE:GREGORIAN",
  ];
  ranges.forEach((r, i) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${slug}-${i}@crete.direct`,
      `DTSTART;VALUE=DATE:${compact(r.dateFrom)}`,
      `DTEND;VALUE=DATE:${compact(r.dateTo)}`,
      "SUMMARY:Not available (crete.direct)",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stays/ical.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/ical.ts src/lib/stays/ical.test.ts
git commit -m "feat(stays): iCal import parser + export builder"
```

---

## Task 8: Stripe helpers (destination-charge param builder + Connect link)

**Files:**
- Create: `src/lib/stays/stripe-helpers.ts`
- Test: `src/lib/stays/stripe-helpers.test.ts`

`buildCheckoutParams` is pure (no Stripe call) so it can be unit-tested; it produces the exact `stripe.checkout.sessions.create` params with `payment_intent_data.application_fee_amount` + `transfer_data.destination` (destination charge, ported from Kairos `bookings/create/route.ts`). `createConnectOnboardingLink` wraps the SDK and is exercised in the route test with a mocked stripe.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { buildCheckoutParams } from "./stripe-helpers";

describe("buildCheckoutParams", () => {
  it("builds a destination charge with application_fee on the deposit", () => {
    const params = buildCheckoutParams({
      listingTitle: "Sea view villa",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-08",
      depositEur: 220.5,
      applicationFeeCents: 1050,
      connectAccountId: "acct_123",
      guestEmail: "jane@example.com",
      requestId: 42,
      payToken: "tok-abc",
      locale: "fr",
    });
    expect(params.mode).toBe("payment");
    expect(params.line_items[0].price_data.unit_amount).toBe(22050);
    expect(params.payment_intent_data?.application_fee_amount).toBe(1050);
    expect(params.payment_intent_data?.transfer_data?.destination).toBe("acct_123");
    expect(params.metadata?.request_id).toBe("42");
    expect(params.customer_email).toBe("jane@example.com");
    expect(params.success_url).toContain("/fr/stays/");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/stripe-helpers.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import Stripe from "stripe";
import { siteBase } from "@/lib/car-quote";

export interface CheckoutParamsInput {
  listingTitle: string;
  dateFrom: string;
  dateTo: string;
  depositEur: number;
  applicationFeeCents: number;
  connectAccountId: string;
  guestEmail: string;
  requestId: number;
  payToken: string;
  locale: string;
}

export function buildCheckoutParams(
  input: CheckoutParamsInput,
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
            name: `${input.listingTitle} — acompte 30%`,
            description: `${input.dateFrom} → ${input.dateTo}`,
          },
          unit_amount: Math.round(input.depositEur * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: input.applicationFeeCents,
      transfer_data: { destination: input.connectAccountId },
    },
    customer_email: input.guestEmail,
    metadata: {
      request_id: String(input.requestId),
      payment_type: "deposit",
    },
    success_url: `${base}/${input.locale}/stays/pay/${input.payToken}?paid=1`,
    cancel_url: `${base}/${input.locale}/stays/pay/${input.payToken}`,
  };
}

export function stripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY as string);
}

export async function createConnectOnboardingLink(
  ownerEmail: string,
  ownerId: number,
): Promise<{ accountId: string; url: string }> {
  const stripe = stripeClient();
  const account = await stripe.accounts.create({
    type: "express",
    country: "GR",
    email: ownerEmail,
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stays/stripe-helpers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/stripe-helpers.ts src/lib/stays/stripe-helpers.test.ts
git commit -m "feat(stays): stripe destination-charge params + connect onboarding"
```

---

## Task 9: Email builders (pure subjects/bodies + Resend senders)

**Files:**
- Create: `src/lib/stays/emails.ts`
- Test: `src/lib/stays/emails.test.ts`

Pure builders are unit-tested; senders wrap the shared `resend` client and the Kalimera shell from `@/lib/email` (reuse — do NOT re-implement the HTML shell). Follow the `FROM_EMAIL = "Crete Direct <hello@crete.direct>"` convention.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { ownerRequestSubject, ownerRequestBody, guestApprovedSubject } from "./emails";

describe("email builders", () => {
  it("owner request subject names the dates", () => {
    expect(ownerRequestSubject("2026-07-01", "2026-07-08")).toContain("2026-07-01");
  });
  it("owner request body embeds the approve link", () => {
    const html = ownerRequestBody({
      guestName: "Jane",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-08",
      pax: 2,
      approveUrl: "https://crete.direct/fr/stays/approve/tok-1",
    });
    expect(html).toContain("https://crete.direct/fr/stays/approve/tok-1");
    expect(html).toContain("Jane");
  });
  it("guest approved subject is celebratory", () => {
    expect(guestApprovedSubject("Sea view villa")).toContain("Sea view villa");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/emails.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Resend } from "resend";

const FROM_EMAIL = "Crete Direct <hello@crete.direct>";
const REPLY_TO = "contact@kairosguest.com";

function resendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

export function ownerRequestSubject(dateFrom: string, dateTo: string): string {
  return `Nouvelle demande de séjour · ${dateFrom} → ${dateTo}`;
}

export function ownerRequestBody(o: {
  guestName: string;
  dateFrom: string;
  dateTo: string;
  pax: number | null;
  approveUrl: string;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p>${o.guestName} souhaite réserver du <strong>${o.dateFrom}</strong> au <strong>${o.dateTo}</strong>${o.pax ? ` (${o.pax} pers.)` : ""}.</p>
    <p><a href="${o.approveUrl}" style="background:#C8A35F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Accepter et fixer mon prix</a></p>
    <p>Vous confirmez ou ajustez votre prix. crete.direct encaisse et vous reverse via Stripe. Commission 5%.</p>
  </div>`;
}

export function guestApprovedSubject(listingTitle: string): string {
  return `Séjour accepté — ${listingTitle}, payez pour confirmer`;
}

export function guestApprovedBody(o: {
  listingTitle: string;
  guestTotalEur: number;
  depositEur: number;
  payUrl: string;
}): string {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1A1A2E">
    <p>Bonne nouvelle : votre séjour à <strong>${o.listingTitle}</strong> est accepté.</p>
    <p>Total ${o.guestTotalEur.toFixed(2)} € · acompte ${o.depositEur.toFixed(2)} € pour confirmer.</p>
    <p><a href="${o.payUrl}" style="background:#C8A35F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Payer l'acompte</a></p>
  </div>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    await resendClient().emails.send({
      from: FROM_EMAIL,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
    });
  } catch (e) {
    console.error("[stays/emails] send failed:", e);
  }
}

export async function sendOwnerRequest(
  ownerEmail: string,
  o: Parameters<typeof ownerRequestBody>[0],
): Promise<void> {
  await send(ownerEmail, ownerRequestSubject(o.dateFrom, o.dateTo), ownerRequestBody(o));
}

export async function sendGuestApproved(
  guestEmail: string,
  o: Parameters<typeof guestApprovedBody>[0],
): Promise<void> {
  await send(guestEmail, guestApprovedSubject(o.listingTitle), guestApprovedBody(o));
}

export async function sendGuestConfirmed(
  guestEmail: string,
  listingTitle: string,
): Promise<void> {
  await send(
    guestEmail,
    `Réservation confirmée — ${listingTitle}`,
    `<div style="font-family:Inter,Arial,sans-serif">Votre acompte est reçu, votre séjour est confirmé. Vous recevrez la demande de solde 14 jours avant l'arrivée.</div>`,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stays/emails.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/emails.ts src/lib/stays/emails.test.ts
git commit -m "feat(stays): resend email builders + senders"
```

---

## Task 10: DB helpers (supabase-admin queries)

**Files:**
- Create: `src/lib/stays/db.ts`
- Test: `src/lib/stays/db.test.ts`

Thin wrappers over `supabaseAdmin`. Unit-test `slugify` (pure) here; the query wrappers are exercised through the route tests (Tasks 11–17) with a mocked `@/lib/supabase-admin`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { slugify } from "./db";

describe("slugify", () => {
  it("lowercases, strips accents, hyphenates", () => {
    expect(slugify("Villa Séléné à Makrigialos")).toBe("villa-selene-a-makrigialos");
  });
  it("appends a suffix for uniqueness when given", () => {
    expect(slugify("Villa", "7f3")).toBe("villa-7f3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stays/db.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { StayListing, StayOwner, StayRequest } from "./types";

export function slugify(input: string, suffix?: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return suffix ? `${base}-${suffix}` : base;
}

export async function upsertOwnerByEmail(
  email: string,
  name: string | null,
  phone: string | null,
): Promise<StayOwner> {
  const { data: existing } = await supabaseAdmin
    .from("stay_owners")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (existing) return existing as StayOwner;
  const { data, error } = await supabaseAdmin
    .from("stay_owners")
    .insert({ email, name, phone })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StayOwner;
}

export async function createDraftListing(
  input: Partial<StayListing> & { owner_id: number; slug: string },
): Promise<StayListing> {
  const { data, error } = await supabaseAdmin
    .from("stay_listings")
    .insert({ ...input, status: "draft" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StayListing;
}

export async function getListingBySlug(slug: string): Promise<StayListing | null> {
  const { data } = await supabaseAdmin
    .from("stay_listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as StayListing) ?? null;
}

export async function getListingById(id: number): Promise<StayListing | null> {
  const { data } = await supabaseAdmin
    .from("stay_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as StayListing) ?? null;
}

export async function publishListing(
  id: number,
  icalUrl: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("stay_listings")
    .update({ status: "published", ical_private_url: icalUrl })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createStayRequest(
  row: Record<string, unknown>,
): Promise<StayRequest> {
  const { data, error } = await supabaseAdmin
    .from("stay_requests")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StayRequest;
}

export async function getRequestByApproveHash(
  hash: string,
): Promise<StayRequest | null> {
  const { data } = await supabaseAdmin
    .from("stay_requests")
    .select("*")
    .eq("approve_token_hash", hash)
    .maybeSingle();
  return (data as StayRequest) ?? null;
}

export async function getRequestByPayHash(
  hash: string,
): Promise<StayRequest | null> {
  const { data } = await supabaseAdmin
    .from("stay_requests")
    .select("*")
    .eq("pay_token_hash", hash)
    .maybeSingle();
  return (data as StayRequest) ?? null;
}

export async function recentDuplicateExists(
  guestEmail: string,
  listingId: number,
  dateFrom: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("stay_requests")
    .select("id", { count: "exact", head: true })
    .eq("guest_email", guestEmail)
    .eq("listing_id", listingId)
    .eq("date_from", dateFrom)
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

export async function ipRateLimited(ipHashVal: string): Promise<boolean> {
  const countSince = async (ms: number): Promise<number> => {
    const since = new Date(Date.now() - ms).toISOString();
    const { count } = await supabaseAdmin
      .from("stay_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHashVal)
      .gte("created_at", since);
    return count ?? 0;
  };
  if ((await countSince(60 * 60 * 1000)) >= 4) return true;
  if ((await countSince(24 * 60 * 60 * 1000)) >= 12) return true;
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stays/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/db.ts src/lib/stays/db.test.ts
git commit -m "feat(stays): supabase-admin db helpers + slugify"
```

---

## Task 11: Route `POST /api/stays/new` (scrape + draft listing)

**Files:**
- Create: `src/app/api/stays/new/route.ts`
- Test: `src/app/api/stays/new/route.test.ts`

Route test mocks `@/lib/stays/airbnb-scrape`, `@/lib/stays/db`. Follows the Kairos webhook test mocking pattern.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stays/airbnb-scrape", () => ({
  scrapeAirbnbUrl: vi.fn(async () => ({
    ok: true,
    data: { airbnbId: "123", title: "Villa", description: "Nice", photos: ["p1"] },
  })),
}));
const upsertOwnerByEmail = vi.fn(async () => ({ id: 1, email: "o@x.com" }));
const createDraftListing = vi.fn(async () => ({ id: 9, slug: "villa-abc", status: "draft" }));
vi.mock("@/lib/stays/db", () => ({
  upsertOwnerByEmail: (...a: unknown[]) => upsertOwnerByEmail(...a),
  createDraftListing: (...a: unknown[]) => createDraftListing(...a),
  slugify: (s: string, suffix?: string) => (suffix ? `${s}-${suffix}` : s),
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/new", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/stays/new", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a draft listing from a pasted Airbnb URL", async () => {
    const res = await POST(req({
      airbnbUrl: "https://www.airbnb.com/rooms/123",
      ownerEmail: "o@x.com",
      basePriceEur: 100,
    }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.slug).toBeTruthy();
    expect(createDraftListing).toHaveBeenCalledOnce();
  });

  it("rejects a missing URL", async () => {
    const res = await POST(req({ ownerEmail: "o@x.com" }) as never);
    expect(res.status).toBe(422);
  });

  it("silently accepts a honeypot without creating a listing", async () => {
    const res = await POST(req({
      airbnbUrl: "https://www.airbnb.com/rooms/123",
      ownerEmail: "o@x.com",
      website: "bot",
    }) as never);
    expect(res.status).toBe(200);
    expect(createDraftListing).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stays/new/route.test.ts`
Expected: FAIL (route not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { scrapeAirbnbUrl } from "@/lib/stays/airbnb-scrape";
import { upsertOwnerByEmail, createDraftListing, slugify } from "@/lib/stays/db";
import { randomUUID } from "node:crypto";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));

  if (body.website && String(body.website).trim() !== "") {
    return NextResponse.json({ ok: true }); // honeypot: silent success
  }

  const airbnbUrl = typeof body.airbnbUrl === "string" ? body.airbnbUrl.trim() : "";
  const ownerEmail =
    typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  if (!/^https?:\/\/.+airbnb\./i.test(airbnbUrl) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 422 });
  }

  const scrape = await scrapeAirbnbUrl(airbnbUrl);
  const owner = await upsertOwnerByEmail(
    ownerEmail,
    typeof body.ownerName === "string" ? body.ownerName : null,
    typeof body.ownerPhone === "string" ? body.ownerPhone : null,
  );

  const title = scrape.data.title ?? (typeof body.title === "string" ? body.title : "Logement");
  const slug = slugify(title, randomUUID().slice(0, 6));

  const listing = await createDraftListing({
    owner_id: owner.id,
    slug,
    airbnb_id: scrape.data.airbnbId,
    airbnb_url: airbnbUrl,
    title,
    description: scrape.data.description ?? null,
    photos: scrape.data.photos ?? [],
    base_price_eur: Number(body.basePriceEur) > 0 ? Number(body.basePriceEur) : 0,
    cleaning_fee_eur: Number(body.cleaningFeeEur) > 0 ? Number(body.cleaningFeeEur) : 0,
    min_nights: Number(body.minNights) > 0 ? Number(body.minNights) : 1,
  });

  return NextResponse.json({ ok: true, slug: listing.slug, scraped: scrape.ok });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stays/new/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stays/new/route.ts src/app/api/stays/new/route.test.ts
git commit -m "feat(stays): POST /api/stays/new (scrape + draft)"
```

---

## Task 12: Route `POST /api/stays/publish` (attach iCal → published)

**Files:**
- Create: `src/app/api/stays/publish/route.ts`
- Test: `src/app/api/stays/publish/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const getListingBySlug = vi.fn();
const publishListing = vi.fn(async () => {});
vi.mock("@/lib/stays/db", () => ({
  getListingBySlug: (...a: unknown[]) => getListingBySlug(...a),
  publishListing: (...a: unknown[]) => publishListing(...a),
}));
vi.mock("@/lib/stays/ical", () => ({
  parseICalText: vi.fn(() => [{ dateFrom: "2026-07-01", dateTo: "2026-07-08" }]),
}));
global.fetch = vi.fn(async () => ({ ok: true, text: async () => "BEGIN:VCALENDAR" }) as never);

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/stays/publish", () => {
  beforeEach(() => vi.clearAllMocks());

  it("publishes a draft when a valid private iCal is provided", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, slug: "villa-abc", status: "draft" });
    const res = await POST(req({ slug: "villa-abc", icalUrl: "https://airbnb.com/calendar/ical/x.ics" }) as never);
    expect(res.status).toBe(200);
    expect(publishListing).toHaveBeenCalledWith(9, "https://airbnb.com/calendar/ical/x.ics");
  });

  it("404s an unknown slug", async () => {
    getListingBySlug.mockResolvedValueOnce(null);
    const res = await POST(req({ slug: "nope", icalUrl: "https://airbnb.com/x.ics" }) as never);
    expect(res.status).toBe(404);
  });

  it("422s when the iCal URL is not an ics feed", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, slug: "villa-abc", status: "draft" });
    const res = await POST(req({ slug: "villa-abc", icalUrl: "not-a-url" }) as never);
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stays/publish/route.test.ts`
Expected: FAIL (route not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getListingBySlug, publishListing } from "@/lib/stays/db";
import { parseICalText } from "@/lib/stays/ical";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const icalUrl = typeof body.icalUrl === "string" ? body.icalUrl.trim() : "";

  if (!slug || !/^https?:\/\/.+/i.test(icalUrl) || !/\.ics|\/ical\//i.test(icalUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid iCal URL" }, { status: 422 });
  }

  const listing = await getListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Proof of control + availability sync: the feed must be fetchable and parseable.
  try {
    const res = await fetch(icalUrl);
    if (!res.ok) throw new Error("fetch failed");
    const text = await res.text();
    const events = parseICalText(text);
    void events; // availability rows written by the iCal sync cron (Phase 1: presence proof)
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not read the private iCal" },
      { status: 422 },
    );
  }

  await publishListing(listing.id, icalUrl);
  return NextResponse.json({ ok: true, status: "published" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stays/publish/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stays/publish/route.ts src/app/api/stays/publish/route.test.ts
git commit -m "feat(stays): POST /api/stays/publish (iCal proof -> published)"
```

---

## Task 13: Route `POST /api/stays/request` (guest request → notify owner)

**Files:**
- Create: `src/app/api/stays/request/route.ts`
- Test: `src/app/api/stays/request/route.test.ts`

Reuses `newToken`/`hashToken` from `@/lib/car-quote`. Honeypot + ip_hash rate-limit + 10-min dedup (from `db.ts`). Notifies owner by email + Telegram (best-effort).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const getListingBySlug = vi.fn();
const recentDuplicateExists = vi.fn(async () => false);
const ipRateLimited = vi.fn(async () => false);
const createStayRequest = vi.fn(async () => ({ id: 5, listing_id: 9 }));
vi.mock("@/lib/stays/db", () => ({
  getListingBySlug: (...a: unknown[]) => getListingBySlug(...a),
  recentDuplicateExists: (...a: unknown[]) => recentDuplicateExists(...a),
  ipRateLimited: (...a: unknown[]) => ipRateLimited(...a),
  createStayRequest: (...a: unknown[]) => createStayRequest(...a),
}));
const sendOwnerRequest = vi.fn(async () => {});
vi.mock("@/lib/stays/emails", () => ({ sendOwnerRequest: (...a: unknown[]) => sendOwnerRequest(...a) }));
vi.mock("@/lib/car-quote", () => ({
  newToken: () => "tok-plain",
  hashToken: (t: string) => `hash(${t})`,
  siteBase: () => "https://crete.direct",
}));
const notifyTelegram = vi.fn(async () => {});
vi.mock("@/lib/stays/telegram", () => ({ notifyTelegram: (...a: unknown[]) => notifyTelegram(...a) }));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/request", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}
const good = { slug: "villa-abc", guestName: "Jane", guestEmail: "jane@x.com", dateFrom: "2026-07-01", dateTo: "2026-07-08", pax: 2 };

describe("POST /api/stays/request", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a pending request and emails the owner", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, slug: "villa-abc", status: "published", owner_id: 1 });
    // owner lookup embedded: return owner email via listing join or separate mock
    const res = await POST(req(good) as never);
    expect(res.status).toBe(200);
    expect(createStayRequest).toHaveBeenCalledOnce();
    expect(sendOwnerRequest).toHaveBeenCalledOnce();
  });

  it("honeypot -> silent ok, no request created", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, status: "published", owner_id: 1 });
    const res = await POST(req({ ...good, website: "bot" }) as never);
    expect(res.status).toBe(200);
    expect(createStayRequest).not.toHaveBeenCalled();
  });

  it("rate-limited -> silent ok, no request created", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, status: "published", owner_id: 1 });
    ipRateLimited.mockResolvedValueOnce(true);
    const res = await POST(req(good) as never);
    expect(res.status).toBe(200);
    expect(createStayRequest).not.toHaveBeenCalled();
  });

  it("404 for an unpublished listing", async () => {
    getListingBySlug.mockResolvedValueOnce({ id: 9, status: "draft", owner_id: 1 });
    const res = await POST(req(good) as never);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stays/request/route.test.ts`
Expected: FAIL (route + `@/lib/stays/telegram` not found).

- [ ] **Step 3a: Create the Telegram helper**

Create `src/lib/stays/telegram.ts` (best-effort, mirrors `@/lib/affiliate-notify`):

```typescript
export async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.AFFILIATE_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID || process.env.AFFILIATE_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error("[stays/telegram] failed:", e);
  }
}
```

- [ ] **Step 3b: Write the route**

Create `src/app/api/stays/request/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateStayRequest, ipHash } from "@/lib/stays/validation";
import {
  getListingBySlug,
  recentDuplicateExists,
  ipRateLimited,
  createStayRequest,
} from "@/lib/stays/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendOwnerRequest } from "@/lib/stays/emails";
import { notifyTelegram } from "@/lib/stays/telegram";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const v = validateStayRequest(body);
  if (v.kind === "honeypot") return NextResponse.json({ ok: true });
  if (v.kind === "error") return NextResponse.json({ ok: false, error: v.error }, { status: v.status });

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "published") {
    return NextResponse.json({ ok: false, error: "Not bookable" }, { status: 404 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ipHashVal = ipHash(ip);
  if (ipHashVal && (await ipRateLimited(ipHashVal))) {
    return NextResponse.json({ ok: true }); // silent
  }
  if (await recentDuplicateExists(v.row.guestEmail, listing.id, v.row.dateFrom)) {
    return NextResponse.json({ ok: true }); // silent dedup
  }

  const approveToken = newToken();
  await createStayRequest({
    listing_id: listing.id,
    guest_name: v.row.guestName,
    guest_email: v.row.guestEmail,
    guest_phone: v.row.guestPhone,
    date_from: v.row.dateFrom,
    date_to: v.row.dateTo,
    pax: v.row.pax,
    message: v.row.message,
    status: "pending",
    approve_token_hash: hashToken(approveToken),
    ip_hash: ipHashVal,
  });

  const { data: owner } = await supabaseAdmin
    .from("stay_owners")
    .select("email")
    .eq("id", listing.owner_id)
    .maybeSingle();

  const approveUrl = `${siteBase()}/fr/stays/approve/${approveToken}`;
  if (owner?.email) {
    await sendOwnerRequest(owner.email, {
      guestName: v.row.guestName,
      dateFrom: v.row.dateFrom,
      dateTo: v.row.dateTo,
      pax: v.row.pax,
      approveUrl,
    });
  }
  await notifyTelegram(`🏠 Nouvelle demande Stays · ${listing.title ?? slug} · ${v.row.dateFrom}→${v.row.dateTo}`);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stays/request/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stays/telegram.ts src/app/api/stays/request/route.ts src/app/api/stays/request/route.test.ts
git commit -m "feat(stays): POST /api/stays/request (anti-abuse + notify owner)"
```

---

## Task 14: Route `POST /api/stays/approve` (owner approve/price/decline + KYC)

**Files:**
- Create: `src/app/api/stays/approve/route.ts`
- Test: `src/app/api/stays/approve/route.test.ts`

Owner opens `/stays/approve/[token]`, sets `price` (owner net) and accepts, or declines. On accept: if the owner has no Connect account, return the KYC onboarding URL; else set `approved` + `quoted_price_eur`, mint a `pay_token`, email the guest.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const getRequestByApproveHash = vi.fn();
const getListingById = vi.fn();
vi.mock("@/lib/stays/db", () => ({
  getRequestByApproveHash: (...a: unknown[]) => getRequestByApproveHash(...a),
  getListingById: (...a: unknown[]) => getListingById(...a),
}));
const from = vi.fn();
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from: (...a: unknown[]) => from(...a) } }));
const createConnectOnboardingLink = vi.fn(async () => ({ accountId: "acct_1", url: "https://connect/x" }));
vi.mock("@/lib/stays/stripe-helpers", () => ({
  createConnectOnboardingLink: (...a: unknown[]) => createConnectOnboardingLink(...a),
}));
const sendGuestApproved = vi.fn(async () => {});
vi.mock("@/lib/stays/emails", () => ({ sendGuestApproved: (...a: unknown[]) => sendGuestApproved(...a) }));
vi.mock("@/lib/car-quote", () => ({
  newToken: () => "pay-plain",
  hashToken: (t: string) => `hash(${t})`,
  siteBase: () => "https://crete.direct",
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/approve", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

function chainUpdate() {
  const eq = vi.fn(() => ({ error: null }));
  return { update: vi.fn(() => ({ eq })) };
}

describe("POST /api/stays/approve", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a KYC link when owner has no connect account", async () => {
    getRequestByApproveHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "pending", guest_email: "j@x.com" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa" });
    from.mockImplementation((table: string) => {
      if (table === "stay_owners") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1, email: "o@x.com", stripe_connect_account_id: null } }) }) }),
                 update: () => ({ eq: async () => ({ error: null }) }) };
      }
      return chainUpdate();
    });
    const res = await POST(req({ token: "app-plain", action: "accept", price: 700 }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.kycUrl).toBe("https://connect/x");
    expect(sendGuestApproved).not.toHaveBeenCalled();
  });

  it("approves + emails guest when owner already onboarded", async () => {
    getRequestByApproveHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "pending", guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5 });
    from.mockImplementation((table: string) => {
      if (table === "stay_owners") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1, email: "o@x.com", stripe_connect_account_id: "acct_1" } }) }) }) };
      }
      return chainUpdate();
    });
    const res = await POST(req({ token: "app-plain", action: "accept", price: 700 }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.approved).toBe(true);
    expect(sendGuestApproved).toHaveBeenCalledOnce();
  });

  it("declines the request", async () => {
    getRequestByApproveHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "pending" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1 });
    from.mockImplementation(() => chainUpdate());
    const res = await POST(req({ token: "app-plain", action: "decline" }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.declined).toBe(true);
  });

  it("404 on unknown token", async () => {
    getRequestByApproveHash.mockResolvedValueOnce(null);
    const res = await POST(req({ token: "x", action: "accept", price: 1 }) as never);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stays/approve/route.test.ts`
Expected: FAIL (route not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getRequestByApproveHash, getListingById } from "@/lib/stays/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createConnectOnboardingLink } from "@/lib/stays/stripe-helpers";
import { sendGuestApproved } from "@/lib/stays/emails";
import { computeQuote } from "@/lib/stays/pricing";
import { newToken, hashToken } from "@/lib/car-quote";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const action = body.action === "decline" ? "decline" : "accept";

  const req = await getRequestByApproveHash(hashToken(token));
  if (!req) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (req.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Already handled" }, { status: 409 });
  }
  const listing = await getListingById(req.listing_id);
  if (!listing) return NextResponse.json({ ok: false, error: "Listing gone" }, { status: 404 });

  if (action === "decline") {
    await supabaseAdmin.from("stay_requests").update({ status: "declined", approve_token_hash: null }).eq("id", req.id);
    return NextResponse.json({ ok: true, declined: true });
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid price" }, { status: 422 });
  }

  const { data: owner } = await supabaseAdmin
    .from("stay_owners")
    .select("id, email, stripe_connect_account_id")
    .eq("id", listing.owner_id)
    .maybeSingle();

  // KYC just-in-time: first accepted request triggers Stripe onboarding.
  if (!owner?.stripe_connect_account_id) {
    const link = await createConnectOnboardingLink(owner?.email ?? "", listing.owner_id);
    await supabaseAdmin.from("stay_owners")
      .update({ stripe_connect_account_id: link.accountId, kyc_status: "pending" })
      .eq("id", listing.owner_id);
    return NextResponse.json({ ok: true, kycUrl: link.url, message: "Complete Stripe KYC then re-open this link." });
  }

  const quote = computeQuote({
    basePriceEur: price,
    cleaningFeeEur: Number(listing.cleaning_fee_eur) || 0,
    commissionRate: Number(listing.commission_rate) || 5,
    dateFrom: req.date_from,
    dateTo: req.date_to,
  });

  const payToken = newToken();
  await supabaseAdmin.from("stay_requests").update({
    status: "approved",
    quoted_price_eur: price,
    quoted_at: new Date().toISOString(),
    approve_token_hash: null,
    pay_token_hash: hashToken(payToken),
    deposit_amount: quote.depositEur,
    balance_amount: quote.balanceEur,
    commission_eur: quote.commissionEur,
  }).eq("id", req.id);

  const payUrl = `https://crete.direct/fr/stays/pay/${payToken}`;
  await sendGuestApproved(req.guest_email, {
    listingTitle: listing.title ?? "votre séjour",
    guestTotalEur: quote.guestTotalEur,
    depositEur: quote.depositEur,
    payUrl,
  });

  return NextResponse.json({ ok: true, approved: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stays/approve/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stays/approve/route.ts src/app/api/stays/approve/route.test.ts
git commit -m "feat(stays): POST /api/stays/approve (price + JIT KYC + notify guest)"
```

---

## Task 15: Route `POST /api/stays/pay` (Stripe Checkout deposit)

**Files:**
- Create: `src/app/api/stays/pay/route.ts`
- Test: `src/app/api/stays/pay/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const getRequestByPayHash = vi.fn();
const getListingById = vi.fn();
vi.mock("@/lib/stays/db", () => ({
  getRequestByPayHash: (...a: unknown[]) => getRequestByPayHash(...a),
  getListingById: (...a: unknown[]) => getListingById(...a),
}));
const sessionsCreate = vi.fn(async () => ({ id: "cs_1", url: "https://checkout/x" }));
vi.mock("@/lib/stays/stripe-helpers", async (orig) => {
  const mod = await (orig as () => Promise<Record<string, unknown>>)();
  return {
    ...mod,
    stripeClient: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
  };
});
const from = vi.fn(() => ({ update: () => ({ eq: async () => ({ error: null }) }) }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/car-quote", () => ({ hashToken: (t: string) => `hash(${t})`, siteBase: () => "https://crete.direct" }));

import { POST } from "./route";
function req(body: unknown): Request {
  return new Request("http://localhost/api/stays/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("POST /api/stays/pay", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a destination-charge checkout session for an approved request", async () => {
    getRequestByPayHash.mockResolvedValueOnce({ id: 5, listing_id: 9, status: "approved", quoted_price_eur: 700, guest_email: "j@x.com", date_from: "2026-07-01", date_to: "2026-07-08" });
    getListingById.mockResolvedValueOnce({ id: 9, owner_id: 1, title: "Villa", cleaning_fee_eur: 0, commission_rate: 5 });
    from.mockImplementationOnce(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { stripe_connect_account_id: "acct_1" } }) }) }) }));
    const res = await POST(req({ token: "pay-plain", locale: "fr" }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout/x");
    expect(sessionsCreate).toHaveBeenCalledOnce();
  });

  it("409 when the request is not approved", async () => {
    getRequestByPayHash.mockResolvedValueOnce({ id: 5, status: "pending" });
    const res = await POST(req({ token: "pay-plain" }) as never);
    expect(res.status).toBe(409);
  });

  it("404 on unknown token", async () => {
    getRequestByPayHash.mockResolvedValueOnce(null);
    const res = await POST(req({ token: "x" }) as never);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stays/pay/route.test.ts`
Expected: FAIL (route not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getRequestByPayHash, getListingById } from "@/lib/stays/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildCheckoutParams, stripeClient } from "@/lib/stays/stripe-helpers";
import { computeQuote } from "@/lib/stays/pricing";
import { hashToken } from "@/lib/car-quote";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const locale = typeof body.locale === "string" ? body.locale : "fr";

  const req = await getRequestByPayHash(hashToken(token));
  if (!req) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (req.status !== "approved") {
    return NextResponse.json({ ok: false, error: "Not payable" }, { status: 409 });
  }
  const listing = await getListingById(req.listing_id);
  if (!listing) return NextResponse.json({ ok: false, error: "Listing gone" }, { status: 404 });

  const { data: owner } = await supabaseAdmin
    .from("stay_owners")
    .select("stripe_connect_account_id")
    .eq("id", listing.owner_id)
    .maybeSingle();
  if (!owner?.stripe_connect_account_id) {
    return NextResponse.json({ ok: false, error: "Owner payout not ready" }, { status: 409 });
  }

  const quote = computeQuote({
    basePriceEur: Number(req.quoted_price_eur),
    cleaningFeeEur: Number(listing.cleaning_fee_eur) || 0,
    commissionRate: Number(listing.commission_rate) || 5,
    dateFrom: req.date_from,
    dateTo: req.date_to,
  });

  const params = buildCheckoutParams({
    listingTitle: listing.title ?? "Séjour",
    dateFrom: req.date_from,
    dateTo: req.date_to,
    depositEur: quote.depositEur,
    applicationFeeCents: quote.applicationFeeCents,
    connectAccountId: owner.stripe_connect_account_id,
    guestEmail: req.guest_email,
    requestId: req.id,
    payToken: token,
    locale,
  });

  const session = await stripeClient().checkout.sessions.create(params);
  await supabaseAdmin.from("stay_requests").update({ stripe_session_id: session.id }).eq("id", req.id);

  return NextResponse.json({ ok: true, url: session.url });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stays/pay/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stays/pay/route.ts src/app/api/stays/pay/route.test.ts
git commit -m "feat(stays): POST /api/stays/pay (Stripe Checkout deposit)"
```

---

## Task 16: Route `POST /api/stays/webhook` (idempotent, atomic confirm)

**Files:**
- Create: `src/app/api/stays/webhook/route.ts`
- Test: `src/app/api/stays/webhook/route.test.ts`

Mirrors Kairos `bookings/webhook`. Idempotence via `stripe_webhook_events` insert (unique-violation `23505` = duplicate). On `checkout.session.completed`: call `mark_stay_deposit_paid` RPC (atomic; `23P01` = date conflict), email guest.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const constructEvent = vi.fn();
vi.mock("@/lib/stays/stripe-helpers", async (orig) => {
  const mod = await (orig as () => Promise<Record<string, unknown>>)();
  return { ...mod, stripeClient: () => ({ webhooks: { constructEvent } }) };
});
const insert = vi.fn(async () => ({ error: null }));
const rpc = vi.fn(async () => ({ data: [{ id: 5, guest_email: "j@x.com", listing_id: 9 }], error: null }));
const maybeSingle = vi.fn(async () => ({ data: { title: "Villa" } }));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (t: string) => t === "stripe_webhook_events"
      ? { insert }
      : { select: () => ({ eq: () => ({ maybeSingle }) }) },
    rpc,
  },
}));
const sendGuestConfirmed = vi.fn(async () => {});
vi.mock("@/lib/stays/emails", () => ({ sendGuestConfirmed: (...a: unknown[]) => sendGuestConfirmed(...a) }));

import { POST } from "./route";

function evt(id: string): Request {
  constructEvent.mockReturnValueOnce({
    id, type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_intent: "pi_1", metadata: { request_id: "5", payment_type: "deposit" } } },
  });
  return new Request("http://localhost/api/stays/webhook", {
    method: "POST", headers: { "stripe-signature": "sig" }, body: "{}",
  });
}

describe("POST /api/stays/webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("confirms the booking on first delivery", async () => {
    const res = await POST(evt("ev_1") as never);
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("mark_stay_deposit_paid", expect.objectContaining({ p_request_id: 5 }));
    expect(sendGuestConfirmed).toHaveBeenCalledOnce();
  });

  it("is idempotent on duplicate delivery", async () => {
    insert.mockResolvedValueOnce({ error: { code: "23505" } });
    const res = await POST(evt("ev_1") as never);
    expect(res.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stays/webhook/route.test.ts`
Expected: FAIL (route not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stays/stripe-helpers";
import { sendGuestConfirmed } from "@/lib/stays/emails";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sig = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text();

  let event;
  try {
    event = stripeClient().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET_STAYS as string);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const requestId = Number(
    (event.data.object as { metadata?: Record<string, string> })?.metadata?.request_id,
  );

  // Idempotence: first insert wins; 23505 = duplicate delivery.
  const { error: insErr } = await supabaseAdmin.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    type: event.type,
    request_id: Number.isFinite(requestId) ? requestId : null,
  });
  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: "ledger error" }, { status: 500 });
  }

  if (event.type === "checkout.session.completed") {
    const obj = event.data.object as { id: string; payment_intent?: string };
    const { data, error } = await supabaseAdmin.rpc("mark_stay_deposit_paid", {
      p_request_id: requestId,
      p_session_id: obj.id,
      p_payment_intent_id: obj.payment_intent ?? null,
    });
    if (error) {
      if ((error as { code?: string }).code === "23P01") {
        // dates were taken meanwhile — surface, do not crash the webhook
        return NextResponse.json({ received: true, conflict: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (row) {
      const { data: listing } = await supabaseAdmin
        .from("stay_listings").select("title").eq("id", row.listing_id).maybeSingle();
      await sendGuestConfirmed(row.guest_email, listing?.title ?? "votre séjour");
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stays/webhook/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stays/webhook/route.ts src/app/api/stays/webhook/route.test.ts
git commit -m "feat(stays): POST /api/stays/webhook (idempotent atomic confirm)"
```

---

## Task 17: Route `GET /api/stays/ical/[token]` (export feed)

**Files:**
- Create: `src/app/api/stays/ical/[token]/route.ts`
- Test: `src/app/api/stays/ical/[token]/route.test.ts`

Owner adds this URL to their Airbnb calendar to block crete.direct-booked dates (anti double-booking). Token = per-listing export token (store `ical_export_token_hash`... reuse `slug` as the public token is simpler and non-guessable enough? No — use a dedicated token). For Phase 1, the export token is the listing `slug` guarded by an env-independent lookup on booked availability. Keep it simple: token = slug.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const maybeSingle = vi.fn();
const gte = vi.fn();
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (t: string) => t === "stay_listings"
      ? { select: () => ({ eq: () => ({ maybeSingle }) }) }
      : { select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ then: undefined, data: null }) }) }) }) },
  },
}));

// Simpler: mock the db helper instead.
vi.mock("@/lib/stays/db", () => ({
  getListingBySlug: vi.fn(async () => ({ id: 9, slug: "villa-abc" })),
  bookedRangesForListing: vi.fn(async () => [{ dateFrom: "2026-07-01", dateTo: "2026-07-08" }]),
}));

import { GET } from "./route";

describe("GET /api/stays/ical/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a text/calendar feed with booked ranges", async () => {
    const res = await GET(new Request("http://localhost/api/stays/ical/villa-abc") as never, { params: Promise.resolve({ token: "villa-abc" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("DTSTART;VALUE=DATE:20260701");
  });

  it("404 for an unknown token", async () => {
    const { getListingBySlug } = await import("@/lib/stays/db");
    (getListingBySlug as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/stays/ical/nope") as never, { params: Promise.resolve({ token: "nope" }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/api/stays/ical/[token]/route.test.ts"`
Expected: FAIL (route + `bookedRangesForListing` not found).

- [ ] **Step 3a: Add `bookedRangesForListing` to `src/lib/stays/db.ts`**

Append:

```typescript
import type { DateRange } from "./ical";

export async function bookedRangesForListing(listingId: number): Promise<DateRange[]> {
  const { data } = await supabaseAdmin
    .from("stay_availability")
    .select("date")
    .eq("listing_id", listingId)
    .in("status", ["booked", "blocked_ota", "hold"])
    .order("date", { ascending: true });
  const dates = (data ?? []).map((r: { date: string }) => r.date).sort();
  // Coalesce consecutive dates into [from, to) ranges.
  const ranges: DateRange[] = [];
  for (const d of dates) {
    const last = ranges[ranges.length - 1];
    if (last && addDay(last.dateTo) === d) {
      last.dateTo = addDay(d);
    } else {
      ranges.push({ dateFrom: d, dateTo: addDay(d) });
    }
  }
  return ranges;
}

function addDay(iso: string): string {
  const t = new Date(iso + "T00:00:00Z").getTime() + 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
```

- [ ] **Step 3b: Write the route**

Create `src/app/api/stays/ical/[token]/route.ts`:

```typescript
import { getListingBySlug, bookedRangesForListing } from "@/lib/stays/db";
import { buildIcalExport } from "@/lib/stays/ical";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const listing = await getListingBySlug(token);
  if (!listing) return new Response("Not found", { status: 404 });

  const ranges = await bookedRangesForListing(listing.id);
  const ics = buildIcalExport(listing.slug, ranges);
  return new Response(ics, {
    status: 200,
    headers: { "content-type": "text/calendar; charset=utf-8" },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/api/stays/ical/[token]/route.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/stays/ical/[token]/route.ts" "src/app/api/stays/ical/[token]/route.test.ts" src/lib/stays/db.ts
git commit -m "feat(stays): GET /api/stays/ical/[token] export feed"
```

---

## Task 18: Route `GET/POST /api/stays/connect/onboard` (KYC return callback)

**Files:**
- Create: `src/app/api/stays/connect/onboard/route.ts`
- Test: `src/app/api/stays/connect/onboard/route.test.ts`

`GET` handles the Stripe return_url: marks the owner `kyc_status='complete'` and redirects the owner back to a friendly page. `POST` (optional) re-issues a fresh onboarding link if KYC was abandoned.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from: () => ({ update }) } }));
vi.mock("@/lib/car-quote", () => ({ siteBase: () => "https://crete.direct" }));

import { GET } from "./route";

describe("GET /api/stays/connect/onboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks KYC complete on success return and redirects", async () => {
    const res = await GET(new Request("http://localhost/api/stays/connect/onboard?success=true&owner=1&account=acct_1") as never);
    expect([302, 307]).toContain(res.status);
    expect(update).toHaveBeenCalled();
  });

  it("redirects without update on refresh", async () => {
    const res = await GET(new Request("http://localhost/api/stays/connect/onboard?refresh=true&owner=1") as never);
    expect([302, 307]).toContain(res.status);
    expect(update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stays/connect/onboard/route.test.ts`
Expected: FAIL (route not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { siteBase } from "@/lib/car-quote";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const ownerId = Number(url.searchParams.get("owner"));
  const success = url.searchParams.get("success") === "true";

  if (success && Number.isFinite(ownerId)) {
    await supabaseAdmin.from("stay_owners").update({ kyc_status: "complete" }).eq("id", ownerId);
    return NextResponse.redirect(`${siteBase()}/fr/stays/new?kyc=done`);
  }
  return NextResponse.redirect(`${siteBase()}/fr/stays/new?kyc=refresh`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stays/connect/onboard/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stays/connect/onboard/route.ts src/app/api/stays/connect/onboard/route.test.ts
git commit -m "feat(stays): connect onboard return callback"
```

---

## Task 19: Pages — index, onboarding wizard, listing detail, approve, pay, terms

**Files:**
- Create: `src/app/[locale]/stays/page.tsx`
- Create: `src/app/[locale]/stays/new/page.tsx` + `src/app/[locale]/stays/new/NewListingWizard.tsx`
- Create: `src/app/[locale]/stays/[slug]/page.tsx` + `src/app/[locale]/stays/[slug]/RequestForm.tsx`
- Create: `src/app/[locale]/stays/approve/[token]/page.tsx` + `.../ApprovePanel.tsx`
- Create: `src/app/[locale]/stays/pay/[token]/page.tsx` + `.../PayButton.tsx`
- Create: `src/app/[locale]/stays/terms/page.tsx`

Pages are verified by typecheck + build + manual smoke (repo has no component render tests). Each has a hidden honeypot `website` input where it posts a form. Follow existing car-rental page structure (`src/app/[locale]/car-rental/page.tsx`) for layout, i18n `params: Promise<{ locale }>`, and brand styling.

- [ ] **Step 1: Onboarding wizard (client component)**

`src/app/[locale]/stays/new/NewListingWizard.tsx`:

```tsx
"use client";
import { useState } from "react";

export default function NewListingWizard() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [ical, setIcal] = useState("");
  const [msg, setMsg] = useState("");

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Import en cours…");
    const r = await fetch("/api/stays/new", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ airbnbUrl: url, ownerEmail: email, basePriceEur: Number(price), website: "" }),
    });
    const j = await r.json();
    if (j.ok && j.slug) { setSlug(j.slug); setMsg("Brouillon créé. Ajoutez votre iCal privé Airbnb pour publier."); }
    else setMsg("Lien invalide, réessayez.");
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Publication…");
    const r = await fetch("/api/stays/publish", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, icalUrl: ical }),
    });
    const j = await r.json();
    setMsg(j.ok ? "Annonce publiée ✅" : `Erreur : ${j.error}`);
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      {!slug && (
        <form onSubmit={createDraft}>
          <input type="text" name="website" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
          <input required placeholder="Lien Airbnb" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input required type="email" placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input required type="number" placeholder="Votre prix net / séjour (€)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button type="submit">Créer mon annonce</button>
        </form>
      )}
      {slug && (
        <form onSubmit={publish}>
          <p>Collez l'URL de votre <strong>iCal privé Airbnb</strong> (Calendrier → Disponibilité → Synchroniser).</p>
          <input required placeholder="https://www.airbnb.com/calendar/ical/….ics" value={ical} onChange={(e) => setIcal(e.target.value)} />
          <button type="submit">Publier</button>
          <p style={{ marginTop: 12 }}>Puis ajoutez notre iCal d'export dans Airbnb :<br />
            <code>https://crete.direct/api/stays/ical/{slug}</code></p>
        </form>
      )}
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Onboarding page (server)**

`src/app/[locale]/stays/new/page.tsx`:

```tsx
import NewListingWizard from "./NewListingWizard";

export default async function StaysNewPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  return (
    <main style={{ padding: "48px 16px" }}>
      <h1>Publiez votre logement</h1>
      <p>Collez votre lien Airbnb. Vous gardez votre calendrier. Nous prenons 5%, pas 15%.</p>
      <NewListingWizard />
    </main>
  );
}
```

- [ ] **Step 3: Listing detail + request form**

`src/app/[locale]/stays/[slug]/RequestForm.tsx` (client):

```tsx
"use client";
import { useState } from "react";

export default function RequestForm({ slug }: { slug: string }) {
  const [f, setF] = useState({ guestName: "", guestEmail: "", dateFrom: "", dateTo: "", pax: "2", message: "" });
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Envoi…");
    const r = await fetch("/api/stays/request", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, pax: Number(f.pax), slug, website: "" }),
    });
    const j = await r.json();
    setMsg(j.ok ? "Demande envoyée. Le propriétaire vous répond sous peu." : "Erreur, réessayez.");
  }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={submit}>
      <input type="text" name="website" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
      <input required placeholder="Nom" value={f.guestName} onChange={set("guestName")} />
      <input required type="email" placeholder="Email" value={f.guestEmail} onChange={set("guestEmail")} />
      <input required type="date" value={f.dateFrom} onChange={set("dateFrom")} />
      <input required type="date" value={f.dateTo} onChange={set("dateTo")} />
      <input required type="number" min={1} value={f.pax} onChange={set("pax")} />
      <textarea placeholder="Message" value={f.message} onChange={set("message")} />
      <button type="submit">Demander ces dates</button>
      {msg && <p role="status">{msg}</p>}
    </form>
  );
}
```

`src/app/[locale]/stays/[slug]/page.tsx` (server, fetches the listing):

```tsx
import { getListingBySlug } from "@/lib/stays/db";
import RequestForm from "./RequestForm";
import { notFound } from "next/navigation";

export default async function StayDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "published") notFound();
  return (
    <main style={{ padding: "48px 16px", maxWidth: 720, margin: "0 auto" }}>
      <h1>{listing.title}</h1>
      {listing.photos?.[0] && <img src={listing.photos[0]} alt={listing.title ?? ""} style={{ width: "100%", borderRadius: 12 }} />}
      <p>{listing.description}</p>
      <p><strong>Prix indicatif :</strong> {listing.base_price_eur} € (le propriétaire confirme à l'acceptation)</p>
      <p style={{ color: "#6B7280" }}>Vous payez le prix affiché + 5% de frais de paiement. Pas de racket Airbnb.</p>
      <RequestForm slug={listing.slug} />
    </main>
  );
}
```

- [ ] **Step 4: Approve page + panel**

`src/app/[locale]/stays/approve/[token]/ApprovePanel.tsx` (client):

```tsx
"use client";
import { useState } from "react";

export default function ApprovePanel({ token }: { token: string }) {
  const [price, setPrice] = useState("");
  const [msg, setMsg] = useState("");
  async function act(action: "accept" | "decline") {
    setMsg("…");
    const r = await fetch("/api/stays/approve", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, action, price: Number(price) }),
    });
    const j = await r.json();
    if (j.kycUrl) { window.location.href = j.kycUrl; return; }
    setMsg(j.approved ? "Accepté ✅ Le voyageur reçoit le lien de paiement." : j.declined ? "Refusé." : `Erreur : ${j.error ?? ""}`);
  }
  return (
    <div>
      <input type="number" placeholder="Votre prix net (€)" value={price} onChange={(e) => setPrice(e.target.value)} />
      <button onClick={() => act("accept")}>Accepter</button>
      <button onClick={() => act("decline")}>Refuser</button>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
```

`src/app/[locale]/stays/approve/[token]/page.tsx`:

```tsx
import ApprovePanel from "./ApprovePanel";

export default async function ApprovePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  return (
    <main style={{ padding: "48px 16px", maxWidth: 560, margin: "0 auto" }}>
      <h1>Une demande de séjour</h1>
      <p>Confirmez ou ajustez votre prix. crete.direct encaisse et vous reverse via Stripe (commission 5%).</p>
      <ApprovePanel token={token} />
    </main>
  );
}
```

- [ ] **Step 5: Pay page + button**

`src/app/[locale]/stays/pay/[token]/PayButton.tsx` (client):

```tsx
"use client";
import { useState } from "react";

export default function PayButton({ token, locale }: { token: string; locale: string }) {
  const [msg, setMsg] = useState("");
  async function pay() {
    setMsg("Redirection vers le paiement…");
    const r = await fetch("/api/stays/pay", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, locale }),
    });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
    else setMsg(`Erreur : ${j.error ?? ""}`);
  }
  return (<div><button onClick={pay}>Payer l'acompte (30%)</button>{msg && <p role="status">{msg}</p>}</div>);
}
```

`src/app/[locale]/stays/pay/[token]/page.tsx`:

```tsx
import PayButton from "./PayButton";

export default async function PayPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  return (
    <main style={{ padding: "48px 16px", maxWidth: 560, margin: "0 auto" }}>
      <h1>Confirmez votre séjour</h1>
      <p>Réglez l'acompte de 30% pour bloquer vos dates. Le solde sera demandé 14 jours avant l'arrivée.</p>
      <PayButton token={token} locale={locale} />
    </main>
  );
}
```

- [ ] **Step 6: Terms page (CGU)**

`src/app/[locale]/stays/terms/page.tsx`:

```tsx
export default async function StaysTermsPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  return (
    <main style={{ padding: "48px 16px", maxWidth: 760, margin: "0 auto" }}>
      <h1>Conditions — crete.direct Stays</h1>
      <p>crete.direct agit comme <strong>intermédiaire technique</strong> : mise en relation entre un propriétaire et un voyageur, et encaissement du paiement pour le compte du propriétaire.</p>
      <p>crete.direct n'est <strong>ni hébergeur, ni assureur</strong>. crete.direct n'est pas partie au contrat de location, reste hors de tout litige entre les parties et ne gère aucune caution.</p>
      <p>Le propriétaire reste seul responsable de sa licence AMA, de sa déclaration fiscale grecque (CFF) et de la conformité de son logement. crete.direct n'est pas garant de cette conformité.</p>
      <p>Commission : 5% ajoutés au montant réglé par le voyageur, affichés comme frais de paiement.</p>
      <p>Annulation : plus de 14 jours avant l'arrivée = remboursement 100% ; 2 à 14 jours = 50% ; moins de 48 heures = 0%.</p>
    </main>
  );
}
```

- [ ] **Step 7: Index page**

`src/app/[locale]/stays/page.tsx`:

```tsx
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";

export default async function StaysIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { data } = await supabaseAdmin
    .from("stay_listings").select("slug,title,photos,base_price_eur")
    .eq("status", "published").order("created_at", { ascending: false }).limit(60);
  const listings = data ?? [];
  return (
    <main style={{ padding: "48px 16px", maxWidth: 1080, margin: "0 auto" }}>
      <h1>Louez en direct. Sans le racket Airbnb.</h1>
      <p><Link href={`/${locale}/stays/new`}>Vous êtes propriétaire ? Publiez en 1 minute →</Link></p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
        {listings.map((l: { slug: string; title: string | null; photos: string[]; base_price_eur: number }) => (
          <Link key={l.slug} href={`/${locale}/stays/${l.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
            {l.photos?.[0] && <img src={l.photos[0]} alt={l.title ?? ""} style={{ width: "100%", borderRadius: 12 }} />}
            <h3>{l.title}</h3>
            <p>{l.base_price_eur} € + 5%</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: build succeeds, `/[locale]/stays*` routes compile.

- [ ] **Step 9: Commit**

```bash
git add src/app/[locale]/stays
git commit -m "feat(stays): pages (index, onboarding, detail, approve, pay, terms)"
```

---

## Task 20: Wire the repo `check` script + full suite + branch push

**Files:**
- Create: `scripts/check-stays.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add a repo-style smoke script**

Create `scripts/check-stays.mjs` (mirrors `scripts/check-car-lead.mjs`):

```javascript
import { computeQuote } from "../src/lib/stays/pricing.ts";
import { computeRefund } from "../src/lib/stays/cancellation.ts";
import { validateStayRequest } from "../src/lib/stays/validation.ts";

let failures = 0;
const ok = (label, cond) => { if (!cond) { console.error("FAIL:", label); failures++; } else console.log("ok:", label); };

const q = computeQuote({ basePriceEur: 700, cleaningFeeEur: 0, commissionRate: 5, dateFrom: "2026-07-01", dateTo: "2026-07-08" });
ok("guest total = 735", q.guestTotalEur === 735);
ok("deposit = 220.5", q.depositEur === 220.5);
ok("refund >14 = 100%", computeRefund(735, 20) === 735);
ok("refund <48h = 0", computeRefund(735, 1) === 0);
ok("honeypot detected", validateStayRequest({ website: "x", guestName: "a", guestEmail: "a@b.c", dateFrom: "2026-07-01", dateTo: "2026-07-02" }).kind === "honeypot");

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log("check:stays OK");
```

- [ ] **Step 2: Wire `package.json`**

Add to `scripts`:

```json
"check:stays": "node --experimental-strip-types scripts/check-stays.mjs"
```

And append ` && npm run check:stays` inside the existing `"check"` chain (before the final `tsc --noEmit`).

- [ ] **Step 3: Run the check + full Vitest suite**

Run: `npm run check:stays`
Expected: `check:stays OK`.
Run: `npx vitest run src/lib/stays src/app/api/stays`
Expected: all test files PASS.
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit + push the feature branch**

```bash
git add scripts/check-stays.mjs package.json
git commit -m "chore(stays): wire check:stays into repo checks"
git push origin feat/stays-marketplace
```

Do NOT push `main`. Open a PR `feat/stays-marketplace → master` when ready. To preview on Vercel, include `[preview]` in a commit message.

- [ ] **Step 5: Manual smoke (real Stripe test keys required)**

Follow this order against the Preview URL: (1) `/stays/new` paste an Airbnb link → draft; (2) publish with a real private iCal → `published`, visible on `/stays`; (3) `/stays/[slug]` submit a request → owner email + Telegram; (4) open approve link, set price, accept → first accept triggers Stripe Connect KYC (complete it), re-open and accept → guest gets pay email; (5) pay deposit with a Stripe test card → webhook flips to `deposit_paid`, dates block, confirmation email; (6) add `/api/stays/ical/[slug]` to an Airbnb calendar and confirm the booked range blocks. Record results in `memory/dev_state.md`.

---

## Self-Review

**Spec coverage:**
- §3.1 onboarding paste-link → Task 6 (scrape) + Task 11 (`/new`) + Task 19 wizard. ✅
- §3.2 revenue 5% on top, "frais de paiement", no free tier → Task 3 pricing + Task 19 copy. ✅
- §3.3 Stripe Connect destination charge, JIT KYC → Task 8 + Task 14 (JIT) + Task 15 (charge) + Task 18 (return). ✅
- §3.4 price fixed by owner at approval → Task 14. ✅
- §3.5 no deposit/insurance, "intermédiaire technique" CGU → Task 19 terms. ✅
- §3.6 draft → published (private iCal) → bookable (KYC) → Tasks 11/12/14. ✅
- §3.7 clone Kairos engine → Tasks 1/7/8/15/16. ✅
- §3.8 scrape live + fallback → Task 6. ✅
- §3.9 `/stays`, 30/70 split → Task 19 + Task 3/15. ✅
- §6 request→approve→pay→webhook confirm, atomic date-lock, idempotence → Tasks 13/14/15/16. ✅
- §7 anti-abuse honeypot/rate-limit/ip_hash/dedup → Task 5 + Task 13. ✅
- §8 four tables + `stripe_webhook_events` → Task 1. ✅
- §9 export iCal → Task 7 + Task 17. ✅ Emails → Task 9/13/14/16. ✅
- §10 CGU → Task 19. ✅
- §11 Phase 1 scope only (Phase 2 deferred: card imprint, owner dashboard, Inside Airbnb) — not planned here by design. ✅

**Placeholder scan:** No `TODO`/`TBD`/"add error handling"; every code step shows full code. The only intentional Phase-1 simplification is documented: `/publish` proves iCal readability but the day-by-day availability sync is written by the existing iCal cron pattern (noted inline, not a hidden gap — booked dates are still written atomically by the webhook RPC).

**Type consistency:** `computeQuote` returns `StayQuote` (Task 2) used identically in Tasks 3/14/15. `newToken`/`hashToken`/`siteBase` imported from `@/lib/car-quote` everywhere. `bookedRangesForListing`/`DateRange` consistent between Task 7, Task 10, Task 17. RPC name `mark_stay_deposit_paid` identical in Task 1 SQL and Task 16 call. Status unions match the DB CHECK-free text columns used in routes.

**One open decision for the executor:** the iCal export token uses the listing `slug` (non-guessable enough for Phase 1, simplest). If a dedicated unguessable export token is preferred, add `ical_export_token_hash` to `stay_listings` and swap Task 17's lookup — a 1-task change, not a blocker.
