# Affiliate Signup Page (`/affiliate`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A self-service page where any Crete tourism business signs up in 3-5 clicks and instantly gets a trackable affiliate link (`crete.direct/go/<slug>`) + promo code; crete.direct drives traffic to them, they pay a commission (default 15%).

**Architecture:** Everything lives in the `cretepulse-build` Next.js 16 (App Router) repo. A localized landing+form (`/[locale]/affiliate`) POSTs to a server route (`/api/affiliate/register`) that validates, generates a unique slug + promo code, inserts an `affiliates` row via `supabaseAdmin` (PostgREST self-hosted Postgres), fires a best-effort Telegram notification, and returns the link. A separate unlocalized route `/go/[slug]` logs a click and 302-redirects to the partner's booking URL. Business logic (slug, code, IP hash, payload validation) is isolated in a pure module so it can be unit-tested with `node:test`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, `@supabase/supabase-js` (against self-hosted PostgREST), `lucide-react`, `next-intl`, Node 22.6+ built-in test runner (`node --test --experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-06-18-affiliate-signup-page-design.md`

---

## ⚠️ Worktree / branch note (read before Task 1)

The repo's current branch is `fix-ios-push` (another chantier, possibly another terminal). **Do NOT switch branches in the shared working tree.** Execute this plan in an **isolated git worktree** created from `master` (per `superpowers:using-git-worktrees`), on a new branch `feat/affiliate-signup`. The spec file is currently untracked in the shared tree — re-create/copy it into the worktree if absent, and commit it as part of Task 0.

Repo conventions (`cretepulse-build/CLAUDE.md`): branch off `master`; **never** commit on `main`; `git add -A` is **forbidden** (stage files explicitly); `tsc`/`next build` green before any push; git author must be `kerjeanfrancois29`.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260618_affiliates.sql` | DDL: `affiliates` + `affiliate_clicks` tables + indexes |
| `src/lib/affiliate.ts` | **Pure** logic: constants, `slugify`, `buildUniqueSlug`, `randomSuffix`, `genCodePromo`, `hashIp`, `validateRegisterPayload` |
| `src/lib/affiliate.test.ts` | `node:test` unit tests for the pure module |
| `src/lib/affiliate-store.ts` | DB layer over `supabaseAdmin`: existence checks, insert affiliate, find active by slug, insert click |
| `src/lib/affiliate-notify.ts` | Best-effort Telegram `sendMessage` on new signup |
| `src/app/api/affiliate/register/route.ts` | POST: validate → slug/code → insert → notify → JSON |
| `src/app/go/[slug]/route.ts` | GET: log click (best-effort) → 302 redirect |
| `src/app/[locale]/affiliate/page.tsx` | Landing (EN copy via `T` object) + renders the form |
| `src/app/[locale]/affiliate/SignupForm.tsx` | `"use client"` form + success screen |
| `package.json` | add `test:affiliate` script |

---

## Task 0: Worktree, branch, commit the spec

- [ ] **Step 1: Create the isolated worktree on a new branch from master**

Run (via `superpowers:using-git-worktrees`, or directly):
```bash
git worktree add ../cretepulse-affiliate-signup -b feat/affiliate-signup master
cd ../cretepulse-affiliate-signup
```
Expected: new worktree dir, branch `feat/affiliate-signup`, base = `master`. The shared `fix-ios-push` tree is untouched.

- [ ] **Step 2: Ensure the spec exists in the worktree**

If `docs/superpowers/specs/2026-06-18-affiliate-signup-page-design.md` is absent (it was untracked in the shared tree), copy it in. Verify:
```bash
ls docs/superpowers/specs/2026-06-18-affiliate-signup-page-design.md
```
Expected: file listed.

- [ ] **Step 3: Commit spec + plan**

```bash
git add docs/superpowers/specs/2026-06-18-affiliate-signup-page-design.md docs/superpowers/plans/2026-06-18-affiliate-signup-page.md
git commit -m "docs: affiliate signup page spec + plan"
```

---

## Task 1: SQL migration for `affiliates` + `affiliate_clicks`

**Files:**
- Create: `supabase/migrations/20260618_affiliates.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Affiliate self-service program (crete.direct -> partner).
-- Applied on the self-hosted Postgres behind PostgREST (DB `cretepulse`),
-- same place as affiliate_prospects. Idempotent.

create table if not exists affiliates (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  category        text not null,
  category_other  text,
  area            text,
  email           text not null,
  redirect_url    text not null,
  code_promo      text not null unique,
  commission_pct  numeric not null default 15,
  status          text not null default 'active',
  prospect_id     uuid,
  created_at      timestamptz not null default now()
);

create index if not exists idx_affiliates_email on affiliates (email);

create table if not exists affiliate_clicks (
  id            bigserial primary key,
  affiliate_id  uuid not null references affiliates(id) on delete cascade,
  ts            timestamptz not null default now(),
  referer       text,
  ua            text,
  ip_hash       text
);

create index if not exists idx_affiliate_clicks_aff_ts on affiliate_clicks (affiliate_id, ts);
```

- [ ] **Step 2: Self-check the DDL parses (dry, no DB needed)**

Visually confirm: two `create table if not exists`, unique on `slug` and `code_promo`, FK `affiliate_id` → `affiliates(id)`, `commission_pct default 15`. No syntax typos.

- [ ] **Step 3: Document the apply step (do NOT auto-run here)**

Add a comment block at top of the file is enough; the actual apply is an owner/deploy action mirroring how `affiliate_prospects` was applied:
```
# Apply (owner Kami / deploy):
#   cat supabase/migrations/20260618_affiliates.sql | ssh kairos-vps \
#     docker exec -i cretepulse-postgres psql -U postgres -d cretepulse
#   # then reload PostgREST schema cache so the new tables are exposed over REST:
#   ssh kairos-vps "docker exec cretepulse-postgrest sh -c 'kill -SIGUSR1 1' || \
#     docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"NOTIFY pgrst, 'reload schema';\""
```
(Place these as `--` SQL comments or in the plan only — keep the file valid SQL.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260618_affiliates.sql
git commit -m "feat(affiliate): add affiliates + affiliate_clicks migration"
```

---

## Task 2: Pure module skeleton + `slugify` (TDD)

**Files:**
- Create: `src/lib/affiliate.ts`
- Test: `src/lib/affiliate.test.ts`

- [ ] **Step 1: Add the `test:affiliate` script to package.json**

In `package.json` `"scripts"`, add:
```json
"test:affiliate": "node --test --experimental-strip-types src/lib/affiliate.test.ts"
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/affiliate.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, CATEGORIES, AREAS, AFFILIATE_DEFAULT_COMMISSION_PCT } from "./affiliate.ts";

test("slugify lowercases, strips diacritics, collapses to hyphens", () => {
  assert.equal(slugify("Beach Club Élafonísi!"), "beach-club-elafonisi");
  assert.equal(slugify("  Café   Crète  "), "cafe-crete");
  assert.equal(slugify("A & B / C"), "a-b-c");
});

test("slugify truncates very long names", () => {
  const s = slugify("x".repeat(120));
  assert.ok(s.length <= 60);
});

test("constants are sane", () => {
  assert.equal(AFFILIATE_DEFAULT_COMMISSION_PCT, 15);
  assert.ok(CATEGORIES.some((c) => c.id === "hotel"));
  assert.ok(CATEGORIES.some((c) => c.id === "other"));
  assert.ok(AREAS.includes("chania"));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:affiliate`
Expected: FAIL — cannot find module `./affiliate.ts` (not created yet).

- [ ] **Step 4: Write minimal implementation**

Create `src/lib/affiliate.ts`:
```ts
export const AFFILIATE_DEFAULT_COMMISSION_PCT = 15;

export const CATEGORIES = [
  { id: "hotel", label: "Hotel / accommodation" },
  { id: "tour", label: "Tour / excursion" },
  { id: "beach_club", label: "Beach club" },
  { id: "car_rental", label: "Car rental" },
  { id: "restaurant", label: "Restaurant" },
  { id: "activity", label: "Activity / experience" },
  { id: "taxi", label: "Taxi / transfer" },
  { id: "other", label: "Other" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const AREAS = ["heraklion", "chania", "rethymnon", "lassithi", "other"] as const;
export type Area = (typeof AREAS)[number];

const SLUG_MAX = 60;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:affiliate`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json src/lib/affiliate.ts src/lib/affiliate.test.ts
git commit -m "feat(affiliate): pure module skeleton + slugify"
```

---

## Task 3: `buildUniqueSlug`, `randomSuffix`, `genCodePromo`, `hashIp` (TDD)

**Files:**
- Modify: `src/lib/affiliate.ts`
- Modify: `src/lib/affiliate.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/lib/affiliate.test.ts`:
```ts
import { buildUniqueSlug, randomSuffix, genCodePromo, hashIp } from "./affiliate.ts";

test("buildUniqueSlug returns base when free", async () => {
  const s = await buildUniqueSlug("Sunset Villas", async () => false);
  assert.equal(s, "sunset-villas");
});

test("buildUniqueSlug suffixes on collision", async () => {
  const taken = new Set(["sunset-villas", "sunset-villas-2"]);
  const s = await buildUniqueSlug("Sunset Villas", async (x) => taken.has(x));
  assert.equal(s, "sunset-villas-3");
});

test("randomSuffix has the requested length and charset", () => {
  const r = randomSuffix(4);
  assert.equal(r.length, 4);
  assert.match(r, /^[0-9A-F]+$/);
});

test("genCodePromo builds an uppercase code from slug + suffix", () => {
  assert.equal(genCodePromo("beach-club-elafonisi", "AB12"), "BEACHCLUB-AB12");
});

test("hashIp is deterministic and salted", () => {
  assert.equal(hashIp("1.2.3.4", "salt"), hashIp("1.2.3.4", "salt"));
  assert.notEqual(hashIp("1.2.3.4", "salt"), hashIp("1.2.3.4", "other"));
  assert.match(hashIp("1.2.3.4", "salt"), /^[0-9a-f]{64}$/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:affiliate`
Expected: FAIL — `buildUniqueSlug`/`randomSuffix`/`genCodePromo`/`hashIp` not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/affiliate.ts`:
```ts
import { createHash, randomBytes } from "node:crypto";

const CODE_BASE_MAX = 10;

/** First free slug: base, then base-2, base-3, … `exists` is injected for testability. */
export async function buildUniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name) || "partner";
  if (!(await exists(base))) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
}

/** Uppercase hex random suffix of length n (default 4). */
export function randomSuffix(n = 4): string {
  return randomBytes(n).toString("hex").toUpperCase().slice(0, n);
}

/** Promo code: compacted uppercased slug (max 10) + "-" + suffix. */
export function genCodePromo(slug: string, suffix: string): string {
  const base = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_BASE_MAX);
  return `${base}-${suffix}`;
}

/** SHA-256 of salt+ip → hex. Never store the raw IP (GDPR). */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:affiliate`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/affiliate.ts src/lib/affiliate.test.ts
git commit -m "feat(affiliate): unique slug, promo code, ip hashing"
```

---

## Task 4: `validateRegisterPayload` (TDD)

**Files:**
- Modify: `src/lib/affiliate.ts`
- Modify: `src/lib/affiliate.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/lib/affiliate.test.ts`:
```ts
import { validateRegisterPayload } from "./affiliate.ts";

const good = {
  name: "Sunset Villas",
  category: "hotel",
  area: "chania",
  email: "info@sunset.gr",
  redirect_url: "https://sunset.gr/book",
  accept: true,
};

test("validateRegisterPayload accepts a clean payload (normalized)", () => {
  const r = validateRegisterPayload(good);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.email, "info@sunset.gr");
    assert.equal(r.data.category, "hotel");
    assert.equal(r.data.category_other, null);
  }
});

test("validateRegisterPayload requires accept=true", () => {
  const r = validateRegisterPayload({ ...good, accept: false });
  assert.equal(r.ok, false);
});

test("validateRegisterPayload rejects bad email and non-http url", () => {
  assert.equal(validateRegisterPayload({ ...good, email: "nope" }).ok, false);
  assert.equal(validateRegisterPayload({ ...good, redirect_url: "ftp://x" }).ok, false);
  assert.equal(validateRegisterPayload({ ...good, redirect_url: "not a url" }).ok, false);
});

test("validateRegisterPayload rejects unknown category/area", () => {
  assert.equal(validateRegisterPayload({ ...good, category: "spaceship" }).ok, false);
  assert.equal(validateRegisterPayload({ ...good, area: "atlantis" }).ok, false);
});

test("validateRegisterPayload keeps category_other when category=other", () => {
  const r = validateRegisterPayload({ ...good, category: "other", category_other: "Diving school" });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.data.category_other, "Diving school");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:affiliate`
Expected: FAIL — `validateRegisterPayload` not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/affiliate.ts`:
```ts
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegisterData {
  name: string;
  category: CategoryId;
  category_other: string | null;
  area: Area;
  email: string;
  redirect_url: string;
}

export type ValidationResult =
  | { ok: true; data: RegisterData }
  | { ok: false; error: string };

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateRegisterPayload(body: Record<string, unknown>): ValidationResult {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const category = String(body.category ?? "");
  const area = String(body.area ?? "");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const redirect_url = typeof body.redirect_url === "string" ? body.redirect_url.trim() : "";
  const category_other =
    typeof body.category_other === "string" && body.category_other.trim()
      ? body.category_other.trim().slice(0, 120)
      : null;

  if (body.accept !== true) return { ok: false, error: "Terms not accepted" };
  if (!name) return { ok: false, error: "Missing name" };
  if (!(CATEGORIES as readonly { id: string }[]).some((c) => c.id === category))
    return { ok: false, error: "Invalid category" };
  if (!(AREAS as readonly string[]).includes(area)) return { ok: false, error: "Invalid area" };
  if (!EMAIL_REGEX.test(email)) return { ok: false, error: "Invalid email" };
  if (!isHttpUrl(redirect_url)) return { ok: false, error: "Invalid booking URL" };

  return {
    ok: true,
    data: { name, category: category as CategoryId, category_other, area: area as Area, email, redirect_url },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:affiliate`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/affiliate.ts src/lib/affiliate.test.ts
git commit -m "feat(affiliate): register payload validation"
```

---

## Task 5: DB layer `affiliate-store.ts`

**Files:**
- Create: `src/lib/affiliate-store.ts`

No unit test (thin wrapper over `supabaseAdmin`; verified by `tsc` + the route's behavior). Mirrors `src/app/api/car-rental/submit/route.ts` usage of `supabaseAdmin`.

- [ ] **Step 1: Write the module**

Create `src/lib/affiliate-store.ts`:
```ts
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import type { RegisterData } from "@/lib/affiliate";

export async function slugExists(slug: string): Promise<boolean> {
  const { data } = await supabase.from("affiliates").select("id").eq("slug", slug).limit(1);
  return !!data && data.length > 0;
}

export async function codeExists(code: string): Promise<boolean> {
  const { data } = await supabase.from("affiliates").select("id").eq("code_promo", code).limit(1);
  return !!data && data.length > 0;
}

export async function emailExists(email: string): Promise<boolean> {
  const { data } = await supabase.from("affiliates").select("id").eq("email", email).limit(1);
  return !!data && data.length > 0;
}

export interface NewAffiliate extends RegisterData {
  slug: string;
  code_promo: string;
  commission_pct: number;
}

export async function insertAffiliate(row: NewAffiliate): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("affiliates")
    .insert({ ...row, status: "active" })
    .select("id")
    .single();
  if (error) {
    console.error("[affiliate-store] insert error:", error.message);
    return null;
  }
  return data as { id: string };
}

export async function findActiveBySlug(
  slug: string,
): Promise<{ id: string; redirect_url: string } | null> {
  const { data } = await supabase
    .from("affiliates")
    .select("id, redirect_url")
    .eq("slug", slug)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return (data as { id: string; redirect_url: string } | null) ?? null;
}

export async function insertClick(click: {
  affiliate_id: string;
  referer: string | null;
  ua: string | null;
  ip_hash: string | null;
}): Promise<void> {
  const { error } = await supabase.from("affiliate_clicks").insert(click);
  if (error) console.error("[affiliate-store] click insert error:", error.message);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `affiliate-store.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/affiliate-store.ts
git commit -m "feat(affiliate): supabase store layer"
```

---

## Task 6: Telegram notify `affiliate-notify.ts`

**Files:**
- Create: `src/lib/affiliate-notify.ts`

Best-effort outbound `sendMessage` (NO `getUpdates` → no 409 conflict with `crete-alert-gate`). No-op when env missing.

- [ ] **Step 1: Write the module**

Create `src/lib/affiliate-notify.ts`:
```ts
// Best-effort Telegram ping on a new affiliate signup. Outbound sendMessage only.
// Falls back silently if no bot token/chat is configured (signup still succeeds).

export interface SignupNotice {
  name: string;
  category: string;
  area: string | null;
  email: string;
  link: string;
}

export async function notifyNewAffiliate(n: SignupNotice): Promise<void> {
  const token = process.env.AFFILIATE_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.AFFILIATE_CHAT_ID || process.env.TG_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[affiliate-notify] no bot token/chat configured; skipping notification");
    return;
  }
  const text =
    `🤝 New affiliate signup\n` +
    `${n.name} · ${n.category}${n.area ? " · " + n.area : ""}\n` +
    `${n.email}\n${n.link}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error("[affiliate-notify] sendMessage failed:", e);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/affiliate-notify.ts
git commit -m "feat(affiliate): best-effort telegram signup notification"
```

---

## Task 7: Register API route `POST /api/affiliate/register`

**Files:**
- Create: `src/app/api/affiliate/register/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/affiliate/register/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import {
  validateRegisterPayload,
  buildUniqueSlug,
  genCodePromo,
  randomSuffix,
  AFFILIATE_DEFAULT_COMMISSION_PCT,
} from "@/lib/affiliate";
import { slugExists, codeExists, emailExists, insertAffiliate } from "@/lib/affiliate-store";
import { notifyNewAffiliate } from "@/lib/affiliate-notify";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: bots fill hidden "website" field.
  if (body.website && String(body.website).trim() !== "") {
    return NextResponse.json({ ok: true, link: SITE_URL });
  }

  const v = validateRegisterPayload(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });

  if (await emailExists(v.data.email)) {
    return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
  }

  const slug = await buildUniqueSlug(v.data.name, slugExists);

  let code = genCodePromo(slug, randomSuffix(4));
  for (let i = 0; i < 5 && (await codeExists(code)); i++) code = genCodePromo(slug, randomSuffix(4));

  const inserted = await insertAffiliate({
    ...v.data,
    slug,
    code_promo: code,
    commission_pct: AFFILIATE_DEFAULT_COMMISSION_PCT,
  });
  if (!inserted) return NextResponse.json({ error: "Could not register, try again" }, { status: 500 });

  const link = `${SITE_URL}/go/${slug}`;
  await notifyNewAffiliate({
    name: v.data.name,
    category: v.data.category,
    area: v.data.area,
    email: v.data.email,
    link,
  });

  return NextResponse.json({
    ok: true,
    slug,
    link,
    code,
    commission_pct: AFFILIATE_DEFAULT_COMMISSION_PCT,
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke (optional, requires dev server + DB applied)**

If `npm run dev` is running and the migration is applied:
```bash
curl -s -X POST http://localhost:3000/api/affiliate/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Villas","category":"hotel","area":"chania","email":"t@test.gr","redirect_url":"https://example.com/book","accept":true}'
```
Expected: JSON `{ ok:true, slug, link, code, commission_pct:15 }`. (Skip if DB not applied; covered by typecheck + unit tests.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/affiliate/register/route.ts
git commit -m "feat(affiliate): register API route"
```

---

## Task 8: Tracked redirect `GET /go/[slug]`

**Files:**
- Create: `src/app/go/[slug]/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/go/[slug]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { findActiveBySlug, insertClick } from "@/lib/affiliate-store";
import { hashIp } from "@/lib/affiliate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const IP_SALT = process.env.AFFILIATE_IP_SALT || "";

export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const affiliate = await findActiveBySlug(slug);
  if (!affiliate) {
    return NextResponse.redirect(SITE_URL, 302);
  }

  // Best-effort click log; never block the redirect.
  try {
    const ipRaw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    await insertClick({
      affiliate_id: affiliate.id,
      referer: request.headers.get("referer"),
      ua: request.headers.get("user-agent"),
      ip_hash: ipRaw ? hashIp(ipRaw, IP_SALT) : null,
    });
  } catch (e) {
    console.error("[go] click log failed:", e);
  }

  return NextResponse.redirect(affiliate.redirect_url, 302);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/go/[slug]/route.ts
git commit -m "feat(affiliate): tracked /go/[slug] redirect"
```

---

## Task 9: Signup form (client component)

**Files:**
- Create: `src/app/[locale]/affiliate/SignupForm.tsx`

- [ ] **Step 1: Write the form**

Create `src/app/[locale]/affiliate/SignupForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { CATEGORIES, AREAS } from "@/lib/affiliate";

interface Success {
  link: string;
  code: string;
  commission_pct: number;
}

const AREA_LABELS: Record<string, string> = {
  heraklion: "Heraklion",
  chania: "Chania",
  rethymnon: "Rethymnon",
  lassithi: "Lassithi",
  other: "Other / island-wide",
};

export default function SignupForm({ commissionPct }: { commissionPct: number }) {
  const [category, setCategory] = useState("hotel");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      category: fd.get("category"),
      category_other: fd.get("category_other"),
      area: fd.get("area"),
      email: fd.get("email"),
      redirect_url: fd.get("redirect_url"),
      website: fd.get("website"), // honeypot
      accept: fd.get("accept") === "on",
    };
    try {
      const res = await fetch("/api/affiliate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setSuccess({ link: data.link, code: data.code, commission_pct: data.commission_pct });
      }
    } catch {
      setError("Network error, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-aegean/30 bg-white p-6">
        <h3 className="flex items-center gap-2 text-xl font-semibold text-aegean mb-3">
          <CheckCircle2 className="w-5 h-5" /> Your affiliate link is ready
        </h3>
        <p className="text-sm text-text mb-2">Share-ready link (already live):</p>
        <div className="flex items-center gap-2 mb-4">
          <code className="flex-1 rounded bg-surface px-3 py-2 text-sm break-all">{success.link}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(success.link);
              setCopied(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-aegean text-white px-3 py-2 text-sm hover:opacity-90"
          >
            <Copy className="w-4 h-4" /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-sm text-text mb-1">
          Promo code: <strong>{success.code}</strong>
        </p>
        <p className="text-sm text-text">
          Commission: <strong>{success.commission_pct}%</strong> on bookings we send you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-white p-6 space-y-4">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div>
        <label className="block text-sm font-medium text-text mb-1">Business name</label>
        <input name="name" required maxLength={120}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1">Category</label>
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm">
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Area</label>
          <select name="area" className="w-full rounded-lg border border-border px-3 py-2 text-sm">
            {AREAS.map((a) => (
              <option key={a} value={a}>{AREA_LABELS[a]}</option>
            ))}
          </select>
        </div>
      </div>

      {category === "other" && (
        <div>
          <label className="block text-sm font-medium text-text mb-1">Tell us your activity</label>
          <input name="category_other" maxLength={120}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-1">Contact email</label>
        <input name="email" type="email" required
          className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1">Your booking URL</label>
        <input name="redirect_url" type="url" required placeholder="https://…"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>

      <label className="flex items-start gap-2 text-sm text-text">
        <input name="accept" type="checkbox" required className="mt-1" />
        <span>I agree to a {commissionPct}% commission on bookings referred by crete.direct.</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-aegean text-white font-semibold px-5 py-2.5 hover:opacity-90 disabled:opacity-60">
        {submitting ? "Creating your link…" : "Get my affiliate link"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/affiliate/SignupForm.tsx"
git commit -m "feat(affiliate): signup form + success screen"
```

---

## Task 10: Landing page `/[locale]/affiliate`

**Files:**
- Create: `src/app/[locale]/affiliate/page.tsx`

Mirrors `src/app/[locale]/partners/page.tsx` (the `T` object pattern, `setRequestLocale`, `buildAlternates`, charte classes). EN copy filled; structure ready for fr/de/el later (fallback EN via `pickUiLoc`).

- [ ] **Step 1: Write the page**

Create `src/app/[locale]/affiliate/page.tsx`:
```tsx
import { setRequestLocale } from "next-intl/server";
import { Megaphone, LinkIcon, Coins } from "lucide-react";
import { buildAlternates } from "@/lib/seo";
import { AFFILIATE_DEFAULT_COMMISSION_PCT } from "@/lib/affiliate";
import SignupForm from "./SignupForm";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const T = {
  title: "Affiliate program · turn crete.direct traffic into bookings",
  metaDesc:
    "Join the crete.direct affiliate program. Sign up in under a minute, get your tracked link instantly, and pay a commission only on the bookings we send you.",
  pitch:
    "crete.direct reaches travellers planning their trip to Crete · live guides, beaches, buses and the /explore directory, in several languages. We point that audience to your business. You pay a commission only on the bookings we refer.",
  steps: [
    { icon: "megaphone", text: "Sign up in 3-5 clicks · tell us your business and booking page." },
    { icon: "link", text: "Get your tracked link crete.direct/go/your-name instantly · it goes live right away." },
    { icon: "coins", text: "We send you visitors. You pay an agreed commission on the bookings they make." },
  ],
  dealTitle: "The deal",
  deal: [
    `${AFFILIATE_DEFAULT_COMMISSION_PCT}% commission on referred bookings (agreed up front).`,
    "Transparent click reporting · we reconcile bookings with you, no hidden numbers.",
    "No setup fee, no lock-in. Cancel whenever you want.",
  ],
  formTitle: "Become an affiliate",
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return {
    title: `${T.title} | Crete Direct`,
    description: T.metaDesc,
    alternates: buildAlternates(locale, "/affiliate"),
    openGraph: { title: T.title, description: T.metaDesc, url: `${BASE_URL}/${locale}/affiliate`, type: "website" },
  };
}

const ICONS = { megaphone: Megaphone, link: LinkIcon, coins: Coins } as const;

export default async function AffiliatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean mb-4">{T.title}</h1>
        <p className="text-text mb-8">{T.pitch}</p>

        <ol className="space-y-3 mb-10 list-none p-0">
          {T.steps.map((s, i) => {
            const Icon = ICONS[s.icon as keyof typeof ICONS];
            return (
              <li key={i} className="flex items-start gap-3 text-sm text-text">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aegean/10 text-aegean">
                  <Icon className="w-4 h-4" />
                </span>
                {s.text}
              </li>
            );
          })}
        </ol>

        <h2 className="text-xl font-semibold text-text mb-3">{T.dealTitle}</h2>
        <ul className="space-y-2 mb-10 list-disc pl-5">
          {T.deal.map((d, i) => (
            <li key={i} className="text-sm text-text">{d}</li>
          ))}
        </ul>

        <h2 className="text-xl font-semibold text-text mb-4">{T.formTitle}</h2>
        <SignupForm commissionPct={AFFILIATE_DEFAULT_COMMISSION_PCT} />
      </div>
    </main>
  );
}
```

> **Note:** confirm `LinkIcon` is exported by the installed `lucide-react` (v1). If not, swap for `Link2` or `Link`. Adjust the import + `ICONS` map accordingly.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If `buildAlternates`/`@/lib/seo` signature differs, match `partners/page.tsx` exactly.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds; `/[locale]/affiliate`, `/api/affiliate/register`, `/go/[slug]` appear in the route list.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/affiliate/page.tsx"
git commit -m "feat(affiliate): landing page /affiliate"
```

---

## Task 11: Final verification + finish branch

- [ ] **Step 1: Full test + typecheck + build green**

Run:
```bash
npm run test:affiliate
npx tsc --noEmit
npm run build
```
Expected: tests PASS, no type errors, build OK.

- [ ] **Step 2: Manual smoke (if DB applied + dev running)**

- Visit `/en/affiliate` → form renders, 3-5 click flow works, success screen shows link/code/15%.
- `GET /go/<slug>` → 302 to the booking URL; a row appears in `affiliate_clicks`.
- Unknown slug → redirect to home.

- [ ] **Step 3: Finish the branch**

Use `superpowers:finishing-a-development-branch`. Do NOT auto-deploy: production deploy is the conscious `git push origin master:main` after merge to `master`. Surface remaining owner-Kami actions:
- Apply `supabase/migrations/20260618_affiliates.sql` on the `cretepulse` DB + reload PostgREST schema.
- Confirm/ set env on Vercel `cretepulse-build`: `AFFILIATE_BOT_TOKEN`+`AFFILIATE_CHAT_ID` (or rely on existing `TELEGRAM_BOT_TOKEN`/`TG_CHAT_ID` if present), `AFFILIATE_IP_SALT`. `NEXT_PUBLIC_SITE_URL` + `SUPABASE_*` already in prod.

---

## Self-Review

**Spec coverage:**
- §3 architecture (page + register API + /go redirect) → Tasks 7, 8, 9, 10. ✔
- §4 data model (`affiliates` + `affiliate_clicks`, ip_hash, commission default 15) → Task 1. ✔
- §5.1 landing → Task 10. §5.2 form 3-5 clicks + honeypot → Task 9. §5.3 register (slug, code, insert, notify, 409 dup) → Tasks 4/5/6/7. §5.4 /go redirect + best-effort click → Task 8. ✔
- §6 active-immediate + Telegram garde-fou → status `'active'` (Task 5 insert), notify (Task 6). Manual disable = `status='disabled'`, honored by `findActiveBySlug` (Task 8). ✔
- §7 RGPD: ip hashed never raw → `hashIp` (Task 3) used in Task 8; `supabaseAdmin` server-only → store/notify server modules. ✔
- §8 config (15%, Telegram bot, ip salt) → constants Task 2, env reads Tasks 6/8, finish notes Task 11. ✔
- EN default + i18n-ready `T` → Task 10. ✔

**Placeholder scan:** no TBD/TODO; every code step has full code. The only conditional note is the `lucide-react` icon name check (explicit fallback given). ✔

**Type consistency:** `RegisterData` (Task 4) is reused by `NewAffiliate` (Task 5) and the route (Task 7). `findActiveBySlug` returns `{id, redirect_url}` consumed identically in Task 8. `genCodePromo(slug, suffix)` / `randomSuffix(n)` / `buildUniqueSlug(name, exists)` / `hashIp(ip, salt)` signatures match every call site. ✔
