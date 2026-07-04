# Back-office Car Rental Direct (`/admin/car-rental`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une page privée `/admin/car-rental` (deux vues : Demandes / Partenaires) pour suivre le cycle d'appel d'offres, saisir l'issue post-accepted (loué/perdu, montant final, commission encaissée) et gérer le registre `car_partners`.

**Architecture:** Page Next.js server-rendered hors arbre `[locale]` (layout propre avec `<html>`), auth par secret (`?key=` → cookie httpOnly via route handler), lectures via `supabaseAdmin`, écritures via server actions + forms natifs (zéro client component). Logique pure (commissions, agrégats, stats, message WhatsApp) dans `src/lib/car-admin.ts`, testée par `scripts/check-car-admin.mjs` (pattern maison).

**Tech Stack:** Next.js 16 App Router (RSC + server actions), Tailwind v4 (tokens DA existants), Supabase self-host (PostgREST service_role), node `--experimental-strip-types` pour les checks.

**Spec:** `docs/superpowers/specs/2026-07-04-car-rental-admin-design.md`

**Contexte repo (à lire avant de commencer) :**
- Branche de travail : `feat/car-admin` (rebasée sur `origin/main`, qui porte le lot appel d'offres — master local est EN RETARD, ne pas rebaser sur master).
- Règles repo : jamais `git add -A` (stage explicite), jamais push sur `main`, build vert avant push.
- `SUPABASE_SERVICE_KEY` n'existe PAS en local : la page ne peut être testée de bout en bout que sur la preview Vercel. En local on vérifie le gate 404 + `npm run check` + `next build`.
- Cycle auto existant de `car_requests.status` : `sent → quoted → accepted` (+ `email_failed`). Tables : `car_requests`, `car_partners`, `car_quote_invites` (migrations `supabase/migrations/20260612_car_requests.sql`, `20260704_car_partners_registry.sql`, `20260704_car_quote_flow.sql`).

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `supabase/migrations/20260705_car_admin.sql` | Create | colonnes d'issue sur `car_requests` |
| `src/lib/car-admin.ts` | Create | logique pure : commissions, agrégats, stats, validations, message WhatsApp |
| `scripts/check-car-admin.mjs` | Create | tests de la logique pure |
| `package.json` | Modify | script `check:car-admin` + ajout à `check` |
| `src/lib/email.ts` | Modify | le bloc WhatsApp relais inline appelle `buildCarWaMessage`/`waHref` (dédup) |
| `src/lib/car-admin-auth.ts` | Create | vérif secret query/cookie (server-only) |
| `src/app/admin/car-rental/auth/route.ts` | Create | pose du cookie + redirect |
| `src/middleware.ts` | Modify | exclure `admin` du routing i18n |
| `src/app/admin/car-rental/layout.tsx` | Create | `<html>/<body>` + fonts + globals.css + robots noindex |
| `src/app/admin/car-rental/page.tsx` | Create | auth, fetch (3 requêtes), bandeau, onglets |
| `src/app/admin/car-rental/actions.ts` | Create | server actions (guard + validation pure + update) |
| `src/app/admin/car-rental/requests-table.tsx` | Create | vue Demandes (server component + forms) |
| `src/app/admin/car-rental/partners-table.tsx` | Create | vue Partenaires (server component + forms) |

---

### Task 1: Migration SQL — colonnes d'issue

**Files:**
- Create: `supabase/migrations/20260705_car_admin.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Back-office /admin/car-rental : suivi de l'ISSUE d'une demande après le
-- cycle automatique sent → quoted → accepted (appel d'offres). Saisie
-- manuelle par Kami : la location a-t-elle eu lieu, pour quel montant,
-- la commission a-t-elle été encaissée.
--   outcome            : 'rented' (location effectuée) | 'lost' | null
--   final_amount_eur   : montant final réel (pré-rempli au quoted_price côté UI)
--   commission_paid_at : null = commission due, non-null = encaissée
alter table public.car_requests
  add column if not exists outcome            text,
  add column if not exists outcome_at         timestamptz,
  add column if not exists final_amount_eur   numeric,
  add column if not exists commission_paid_at timestamptz,
  add column if not exists admin_note         text;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260705_car_admin.sql
git commit -m "feat(car-admin): migration issue post-accepted (outcome, montant, commission)"
```

Note : l'EXÉCUTION de la migration se fait sur le VPS au moment du déploiement (Task 6) — pas maintenant.

---

### Task 2: Logique pure `src/lib/car-admin.ts` (TDD)

**Files:**
- Create: `scripts/check-car-admin.mjs`
- Create: `src/lib/car-admin.ts`
- Modify: `package.json` (bloc scripts)

- [ ] **Step 1: Écrire le check qui échoue**

Créer `scripts/check-car-admin.mjs` :

```js
// node --experimental-strip-types scripts/check-car-admin.mjs
// Logique PURE du back-office /admin/car-rental (src/lib/car-admin.ts) :
// commissions, agrégats, stats partenaires, validations, message WhatsApp.
import {
  commissionEur, requestCommission, requestsSummary, partnerStats,
  canSetOutcome, validatePartnerUpdate, buildCarWaMessage, waHref, ZONE_IDS,
} from "../src/lib/car-admin.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

// --- commission ---
ok("commissionEur arrondi au centime", commissionEur(333.33, 0.1) === 33.33);
ok("commissionEur taux partenaire (pas 10% en dur)", commissionEur(200, 0.15) === 30);

const partner = { id: 1, name: "Auto Smart Car Rental", email: "a@b.c", phone: "+306974147291",
  whatsapp: "+306974147291", zone_ids: ["chania-west"], commission: 0.1, lead_routing: "direct",
  active: true, created_at: "2026-07-04" };
const byId = new Map([[1, partner]]);
const base = { id: 10, created_at: "2026-07-04", status: "accepted", locale: "en",
  pickup_slug: "chania", zone_id: "chania-west", date_from: "2026-07-10", time_from: "10:00",
  date_to: "2026-07-17", time_to: null, flight_no: "A3 123", car_type: "compact", pax: 2,
  insurance: null, payment_method: null, customer_name: "Jane Doe", customer_email: "j@d.com",
  customer_phone: "+30 555", note: null, quoted_price: 300, quoted_at: "2026-07-04",
  accepted_at: "2026-07-04", quoted_by_partner_id: 1 };

ok("requestCommission rented + montant + partenaire", requestCommission({ ...base, outcome: "rented", final_amount_eur: 300 }, byId) === 30);
ok("requestCommission lost -> null", requestCommission({ ...base, outcome: "lost", final_amount_eur: 300 }, byId) === null);
ok("requestCommission sans montant -> null", requestCommission({ ...base, outcome: "rented", final_amount_eur: null }, byId) === null);
ok("requestCommission partenaire inconnu -> null", requestCommission({ ...base, outcome: "rented", final_amount_eur: 300, quoted_by_partner_id: 99 }, byId) === null);
ok("requestCommission colonnes admin absentes (pré-migration) -> null", requestCommission(base, byId) === null);

// --- agrégats ---
const reqs = [
  { ...base, id: 1, status: "sent" },
  { ...base, id: 2, status: "quoted" },
  { ...base, id: 3, outcome: "rented", final_amount_eur: 300 },                                  // due 30
  { ...base, id: 4, outcome: "rented", final_amount_eur: 100, commission_paid_at: "2026-07-01" }, // encaissée 10
  { ...base, id: 5, outcome: "lost" },
];
const s = requestsSummary(reqs, byId);
ok("summary byStatus", s.byStatus.sent === 1 && s.byStatus.quoted === 1 && s.byStatus.accepted === 3);
ok("summary issues", s.rented === 2 && s.lost === 1);
ok("summary commission due", s.commissionDueEur === 30);
ok("summary commission encaissée", s.commissionPaidEur === 10);

// --- stats partenaire ---
const st = partnerStats(1, reqs, new Map([[1, 5]]), byId);
ok("partnerStats invites", st.invites === 5);
ok("partnerStats devis gagnés (quoted_by)", st.won === 5);
ok("partnerStats rented", st.rented === 2);
ok("partnerStats commission générée (due + encaissée)", st.commissionEur === 40);

// --- transitions / validations ---
ok("canSetOutcome quoted", canSetOutcome({ ...base, status: "quoted" }) === true);
ok("canSetOutcome accepted", canSetOutcome(base) === true);
ok("canSetOutcome sent -> non", canSetOutcome({ ...base, status: "sent" }) === false);

ok("ZONE_IDS = les 4 zones de car-partners.ts", ZONE_IDS.length === 4 && ZONE_IDS.includes("lasithi-east"));
ok("update partenaire valide", validatePartnerUpdate({ zone_ids: ["chania-west"], commission: 0.12 }) === null);
ok("update zone inconnue rejeté", validatePartnerUpdate({ zone_ids: ["mars"], commission: 0.1 }) !== null);
ok("update zéro zone rejeté", validatePartnerUpdate({ zone_ids: [], commission: 0.1 }) !== null);
ok("update commission hors bornes rejeté", validatePartnerUpdate({ zone_ids: ["rethymno"], commission: 0.6 }) !== null);

// --- message WhatsApp : MÊME format que l'email relais legacy (email.ts) ---
const wa = buildCarWaMessage({ partnerFirstName: "Auto", pickupLabel: "Chania",
  dateFrom: "2026-07-10", timeFrom: "10:00", flightNo: "A3 123",
  dateTo: "2026-07-17", timeTo: null, carTypeLabel: "Compact", pax: 2,
  customerName: "Jane Doe", customerContact: "+30 555" });
ok("wa message format exact", wa === [
  "Hi Auto, new rental request:",
  "Chania, 2026-07-10 10:00 (flight A3 123) to 2026-07-17",
  "Compact, 2 people",
  "Guest: Jane Doe, +30 555",
].join("\n"));
ok("wa message champs optionnels absents", buildCarWaMessage({ partnerFirstName: "A", pickupLabel: "Sitia",
  dateFrom: "2026-08-01", dateTo: "2026-08-05", carTypeLabel: "SUV",
  customerName: "Bob", customerContact: "b@c.d" }) === [
  "Hi A, new rental request:",
  "Sitia, 2026-08-01 to 2026-08-05",
  "SUV, ? people",
  "Guest: Bob, b@c.d",
].join("\n"));
ok("waHref strip non-digits + encode", waHref("+30 697 414-7291", "a b\nc") === "https://wa.me/306974147291?text=a%20b%0Ac");

process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Vérifier que le check échoue**

Run: `node --experimental-strip-types scripts/check-car-admin.mjs`
Expected: FAIL (module `../src/lib/car-admin.ts` introuvable)

- [ ] **Step 3: Implémenter `src/lib/car-admin.ts`**

```ts
// Logique PURE du back-office /admin/car-rental, zéro I/O (pattern
// car-lead.ts) : commissions au taux du partenaire, agrégats des bandeaux,
// stats par loueur, validation des écritures, message WhatsApp relais
// (partagé avec email.ts — source unique du format). Node-safe : importable
// par scripts/check-car-admin.mjs. Les lectures/écritures Supabase vivent
// dans la page et les server actions.
import { CAR_ZONES } from "./car-partners.ts";

export interface AdminRequest {
  id: number;
  created_at: string;
  status: string; // sent | quoted | accepted | email_failed (cycle auto)
  locale: string;
  pickup_slug: string;
  zone_id: string;
  date_from: string;
  time_from: string | null;
  date_to: string;
  time_to: string | null;
  flight_no: string | null;
  car_type: string;
  pax: number | null;
  insurance: string | null;
  payment_method: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  note: string | null;
  quoted_price: number | null;
  quoted_at: string | null;
  accepted_at: string | null;
  quoted_by_partner_id: number | null;
  // Colonnes admin (migration 20260705_car_admin.sql) : optionnelles pour
  // tolérer une prod pas encore migrée (select * sans crash).
  outcome?: string | null; // 'rented' | 'lost' | null
  outcome_at?: string | null;
  final_amount_eur?: number | null;
  commission_paid_at?: string | null;
  admin_note?: string | null;
}

export interface AdminPartner {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  zone_ids: string[];
  commission: number;
  lead_routing: "direct" | "relay";
  active: boolean;
  created_at: string;
  // Colonne recrutement ajoutée en SQL direct sur le VPS (non versionnée) :
  // affichée si présente, ignorée sinon.
  outreach_status?: string | null;
}

export const OUTCOMES = ["rented", "lost"] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Commission en euros, arrondie au centime. */
export const commissionEur = (amountEur: number, rate: number): number =>
  Math.round(amountEur * rate * 100) / 100;

/** Commission d'une demande : location effectuée + montant final + loueur
 *  gagnant connus, au taux DU partenaire (pas 10 % en dur). Sinon null. */
export function requestCommission(
  req: AdminRequest,
  partnersById: Map<number, AdminPartner>,
): number | null {
  if (req.outcome !== "rented" || req.final_amount_eur == null || req.quoted_by_partner_id == null) return null;
  const p = partnersById.get(req.quoted_by_partner_id);
  return p ? commissionEur(req.final_amount_eur, p.commission) : null;
}

export interface RequestsSummary {
  byStatus: Record<string, number>;
  rented: number;
  lost: number;
  commissionDueEur: number;   // rented, commission_paid_at NULL
  commissionPaidEur: number;  // rented, commission_paid_at NOT NULL
}

export function requestsSummary(
  reqs: AdminRequest[],
  partnersById: Map<number, AdminPartner>,
): RequestsSummary {
  const s: RequestsSummary = { byStatus: {}, rented: 0, lost: 0, commissionDueEur: 0, commissionPaidEur: 0 };
  for (const r of reqs) {
    s.byStatus[r.status] = (s.byStatus[r.status] ?? 0) + 1;
    if (r.outcome === "rented") s.rented++;
    else if (r.outcome === "lost") s.lost++;
    const c = requestCommission(r, partnersById);
    if (c == null) continue;
    if (r.commission_paid_at) s.commissionPaidEur += c;
    else s.commissionDueEur += c;
  }
  s.commissionDueEur = Math.round(s.commissionDueEur * 100) / 100;
  s.commissionPaidEur = Math.round(s.commissionPaidEur * 100) / 100;
  return s;
}

export interface PartnerStats {
  invites: number;       // invitations reçues (car_quote_invites)
  won: number;           // devis gagnés (quoted_by_partner_id)
  rented: number;        // locations effectuées
  commissionEur: number; // commission totale générée (due + encaissée)
}

export function partnerStats(
  partnerId: number,
  reqs: AdminRequest[],
  invitesByPartner: Map<number, number>,
  partnersById: Map<number, AdminPartner>,
): PartnerStats {
  const st: PartnerStats = { invites: invitesByPartner.get(partnerId) ?? 0, won: 0, rented: 0, commissionEur: 0 };
  for (const r of reqs) {
    if (r.quoted_by_partner_id !== partnerId) continue;
    st.won++;
    if (r.outcome === "rented") st.rented++;
    const c = requestCommission(r, partnersById);
    if (c != null) st.commissionEur += c;
  }
  st.commissionEur = Math.round(st.commissionEur * 100) / 100;
  return st;
}

/** L'issue se saisit dès qu'un prix existe : `accepted` (cas normal) ou
 *  `quoted` (client muet → `lost`). Constat a posteriori : re-cliquer
 *  l'autre issue écrase, pas de machine à états rigide. */
export const canSetOutcome = (req: Pick<AdminRequest, "status">): boolean =>
  req.status === "quoted" || req.status === "accepted";

export const ZONE_IDS: string[] = CAR_ZONES.map((z) => z.id);

/** null = OK, sinon message d'erreur (server action l'affiche inline). */
export function validatePartnerUpdate(u: { zone_ids: string[]; commission: number }): string | null {
  if (!Array.isArray(u.zone_ids) || u.zone_ids.length === 0) return "At least one zone required";
  if (u.zone_ids.some((z) => !ZONE_IDS.includes(z))) return "Unknown zone";
  if (typeof u.commission !== "number" || Number.isNaN(u.commission) || u.commission < 0 || u.commission > 0.5) {
    return "Commission out of range (0-0.5)";
  }
  return null;
}

export interface WaLeadFields {
  partnerFirstName: string;
  pickupLabel: string;
  dateFrom: string;
  timeFrom?: string | null;
  flightNo?: string | null;
  dateTo: string;
  timeTo?: string | null;
  carTypeLabel: string;
  pax?: number | null;
  customerName: string;
  customerContact: string; // téléphone sinon email
}

/** Message WhatsApp relais (champs convenus avec l'agence) — source UNIQUE
 *  du format, consommée par email.ts (mode relay) et la page admin. */
export function buildCarWaMessage(f: WaLeadFields): string {
  return [
    `Hi ${f.partnerFirstName}, new rental request:`,
    `${f.pickupLabel}, ${f.dateFrom}${f.timeFrom ? ` ${f.timeFrom}` : ""}${f.flightNo ? ` (flight ${f.flightNo})` : ""} to ${f.dateTo}${f.timeTo ? ` ${f.timeTo}` : ""}`,
    `${f.carTypeLabel}, ${f.pax ?? "?"} people`,
    `Guest: ${f.customerName}, ${f.customerContact}`,
  ].join("\n");
}

export const waHref = (phoneOrWhatsapp: string, message: string): string =>
  `https://wa.me/${phoneOrWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
```

- [ ] **Step 4: Vérifier que le check passe**

Run: `node --experimental-strip-types scripts/check-car-admin.mjs`
Expected: toutes les lignes `ok - ...`, exit 0

- [ ] **Step 5: Brancher dans package.json**

Dans le bloc `"scripts"` de `package.json`, ajouter après `"check:car-lead"` :

```json
    "check:car-admin": "node --experimental-strip-types scripts/check-car-admin.mjs",
```

et dans la chaîne `"check"`, insérer `npm run check:car-admin && ` juste après `npm run check:car-lead && `.

- [ ] **Step 6: Vérifier la chaîne complète**

Run: `npm run check:car-admin`
Expected: exit 0

- [ ] **Step 7: Commit**

```bash
git add src/lib/car-admin.ts scripts/check-car-admin.mjs package.json
git commit -m "feat(car-admin): logique pure commissions/agrégats/stats + check"
```

---

### Task 3: Dédupliquer le message WhatsApp dans `email.ts`

**Files:**
- Modify: `src/lib/email.ts` (~lignes 262-296, fonction `sendCarLeadEmail`, branche `relay`)

- [ ] **Step 1: Remplacer le bloc inline par la source unique**

Dans `sendCarLeadEmail`, la branche `if (relay) {` construit `wa` et l'URL inline. Remplacer :

```ts
    const wa = [
      `Hi ${first}, new rental request:`,
      `${lead.pickupLabel}, ${lead.dateFrom}${lead.timeFrom ? ` ${lead.timeFrom}` : ""}${lead.flightNo ? ` (flight ${lead.flightNo})` : ""} to ${lead.dateTo}${lead.timeTo ? ` ${lead.timeTo}` : ""}`,
      `${lead.carTypeLabel}, ${lead.pax ?? "?"} people`,
      `Guest: ${lead.customerName}, ${lead.customerPhone ?? lead.customerEmail}`,
    ].join("\n");
    const waNumber = (partner.whatsapp ?? partner.phone).replace(/\D/g, "");
```

par :

```ts
    const wa = buildCarWaMessage({
      partnerFirstName: first,
      pickupLabel: lead.pickupLabel,
      dateFrom: lead.dateFrom, timeFrom: lead.timeFrom, flightNo: lead.flightNo,
      dateTo: lead.dateTo, timeTo: lead.timeTo,
      carTypeLabel: lead.carTypeLabel, pax: lead.pax,
      customerName: lead.customerName,
      customerContact: lead.customerPhone ?? lead.customerEmail,
    });
```

et plus bas dans `lines`, remplacer la ligne :

```ts
      `https://wa.me/${waNumber}?text=${encodeURIComponent(wa)}`,
```

par :

```ts
      waHref(partner.whatsapp ?? partner.phone, wa),
```

Ajouter l'import en tête d'`email.ts` (à côté des imports existants) :

```ts
import { buildCarWaMessage, waHref } from "./car-admin";
```

- [ ] **Step 2: Vérifier types + checks existants**

Run: `npx tsc --noEmit && npm run check:car-lead && npm run check:car-admin`
Expected: exit 0 (le format du message est verrouillé par le check de Task 2)

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "refactor(car-admin): email relais consomme buildCarWaMessage (source unique du format)"
```

---

### Task 4: Auth (secret → cookie) + middleware

**Files:**
- Create: `src/lib/car-admin-auth.ts`
- Create: `src/app/admin/car-rental/auth/route.ts`
- Modify: `src/middleware.ts:12` (matcher)

- [ ] **Step 1: Helper d'auth server-only**

Créer `src/lib/car-admin-auth.ts` :

```ts
// Auth du back-office /admin/car-rental : secret unique CAR_ADMIN_SECRET
// (env Vercel), accepté en query (?key=) pour l'entrée, puis porté par un
// cookie httpOnly posé par la route auth/. Server-only (next/headers).
// Sans secret configuré → toujours refusé (la page 404, pas de page de login).
import { cookies } from "next/headers";

export const CAR_ADMIN_COOKIE = "car_admin";
export const CAR_ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export async function isCarAdmin(queryKey?: string | null): Promise<boolean> {
  const secret = process.env.CAR_ADMIN_SECRET;
  if (!secret) return false;
  if (queryKey && queryKey === secret) return true;
  const jar = await cookies();
  return jar.get(CAR_ADMIN_COOKIE)?.value === secret;
}
```

- [ ] **Step 2: Route qui pose le cookie**

Créer `src/app/admin/car-rental/auth/route.ts` :

```ts
// Entrée du back-office : /admin/car-rental/auth?key=<CAR_ADMIN_SECRET>
// → cookie httpOnly 30 j + redirect vers la page. Mauvaise clé → 404
// (on ne révèle pas l'existence de l'admin). La page redirige ici quand
// elle reçoit ?key= valide, pour sortir la clé de l'URL courante.
import { NextRequest, NextResponse } from "next/server";
import { CAR_ADMIN_COOKIE, CAR_ADMIN_COOKIE_MAX_AGE } from "@/lib/car-admin-auth";

export async function GET(request: NextRequest) {
  const secret = process.env.CAR_ADMIN_SECRET;
  const key = request.nextUrl.searchParams.get("key");
  if (!secret || key !== secret) return new NextResponse(null, { status: 404 });
  const res = NextResponse.redirect(new URL("/admin/car-rental", request.url));
  res.cookies.set(CAR_ADMIN_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CAR_ADMIN_COOKIE_MAX_AGE,
    path: "/admin",
  });
  return res;
}
```

- [ ] **Step 3: Exclure `/admin` du routing i18n**

Dans `src/middleware.ts`, le matcher actuel :

```ts
    "/((?!api|_next|_vercel|sitemap\\.xml|sitemap/|robots\\.txt|feed\\.xml|manifest|favicon\\.ico|icon|.*\\..*).*)",
```

devient :

```ts
    "/((?!api|admin|_next|_vercel|sitemap\\.xml|sitemap/|robots\\.txt|feed\\.xml|manifest|favicon\\.ico|icon|.*\\..*).*)",
```

- [ ] **Step 4: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-admin-auth.ts src/app/admin/car-rental/auth/route.ts src/middleware.ts
git commit -m "feat(car-admin): auth secret->cookie httpOnly + exclusion /admin du middleware i18n"
```

---

### Task 5: Page admin (layout, page, actions, deux vues)

**Files:**
- Create: `src/app/admin/car-rental/layout.tsx`
- Create: `src/app/admin/car-rental/actions.ts`
- Create: `src/app/admin/car-rental/page.tsx`
- Create: `src/app/admin/car-rental/requests-table.tsx`
- Create: `src/app/admin/car-rental/partners-table.tsx`

- [ ] **Step 1: Layout hors-locale**

Le root layout (`src/app/layout.tsx`) ne rend que `children` ; le `<html>` vit
dans `[locale]/layout.tsx`. La page admin étant hors `[locale]`, son layout
rend son propre `<html>` (même pattern que `src/app/not-found.tsx`). Les
fonts sont déjà exportées par le root layout.

Créer `src/app/admin/car-rental/layout.tsx` :

```tsx
import type { ReactNode } from "react";
import type { Metadata } from "next";
import "../../globals.css";
import { geist, baloo, comfortaa } from "../../layout";

export const metadata: Metadata = {
  title: "CRD Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${baloo.variable} ${comfortaa.variable}`}>
      <body className="min-h-screen bg-surface font-sans text-text antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Server actions**

Créer `src/app/admin/car-rental/actions.ts` :

```ts
"use server";
// Écritures du back-office. Chaque action revalide le cookie (guard) puis
// valide via la logique pure avant l'update. Erreur → throw : Next affiche
// l'erreur, les données restent intactes (constat a posteriori, pas de
// machine à états à réparer).
import { revalidatePath } from "next/cache";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { isCarAdmin } from "@/lib/car-admin-auth";
import { OUTCOMES, validatePartnerUpdate, ZONE_IDS } from "@/lib/car-admin";

const PATH = "/admin/car-rental";

async function guard() {
  if (!(await isCarAdmin())) throw new Error("Forbidden");
}

const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Issue d'une demande : bouton rented (avec montant) ou lost. */
export async function setOutcome(id: number, formData: FormData) {
  await guard();
  const outcome = String(formData.get("outcome") ?? "");
  if (!(OUTCOMES as readonly string[]).includes(outcome)) throw new Error("Invalid outcome");
  const finalAmount = outcome === "rented" ? num(formData.get("amount")) : null;
  const { error } = await supabase.from("car_requests").update({
    outcome,
    outcome_at: new Date().toISOString(),
    final_amount_eur: finalAmount,
    // une demande reperdue n'a plus de commission encaissable
    ...(outcome === "lost" ? { commission_paid_at: null } : {}),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

/** Bascule commission encaissée / due. */
export async function setCommissionPaid(id: number, paid: boolean) {
  await guard();
  const { error } = await supabase.from("car_requests")
    .update({ commission_paid_at: paid ? new Date().toISOString() : null })
    .eq("id", id).eq("outcome", "rented");
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function saveNote(id: number, formData: FormData) {
  await guard();
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  const { error } = await supabase.from("car_requests").update({ admin_note: note }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function togglePartnerActive(id: number, active: boolean) {
  await guard();
  const { error } = await supabase.from("car_partners").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

/** Zones (cases cochées) + taux de commission d'un partenaire. */
export async function updatePartner(id: number, formData: FormData) {
  await guard();
  const zone_ids = ZONE_IDS.filter((z) => formData.get(`zone-${z}`) === "on");
  const pct = num(formData.get("commissionPct"));
  const commission = pct == null ? NaN : Math.round(pct * 100) / 10000; // "12" -> 0.12
  const err = validatePartnerUpdate({ zone_ids, commission });
  if (err) throw new Error(err);
  const { error } = await supabase.from("car_partners").update({ zone_ids, commission }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}
```

- [ ] **Step 3: Page (auth, fetch, bandeau, onglets)**

Créer `src/app/admin/car-rental/page.tsx` :

```tsx
// Back-office Car Rental Direct. Server component : auth (query/cookie),
// 3 lectures service_role, jointures en mémoire, deux vues par onglet.
// Spec : docs/superpowers/specs/2026-07-04-car-rental-admin-design.md
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { isCarAdmin } from "@/lib/car-admin-auth";
import {
  requestsSummary, type AdminPartner, type AdminRequest,
} from "@/lib/car-admin";
import { RequestsTable } from "./requests-table";
import { PartnersTable } from "./partners-table";

export const dynamic = "force-dynamic";

export default async function CarAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; tab?: string; status?: string; partner?: string; page?: string }>;
}) {
  const sp = await searchParams;

  // ?key= valide → on passe par la route auth/ qui pose le cookie et
  // redirige, pour sortir la clé de l'URL. Sinon cookie obligatoire, sinon 404.
  if (sp.key) {
    if (await isCarAdmin(sp.key)) redirect(`/admin/car-rental/auth?key=${encodeURIComponent(sp.key)}`);
    notFound();
  }
  if (!(await isCarAdmin())) notFound();

  const [reqRes, partRes, invRes] = await Promise.all([
    supabase.from("car_requests").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("car_partners").select("*").order("id"),
    supabase.from("car_quote_invites").select("request_id, partner_id"),
  ]);
  const loadError = reqRes.error?.message ?? partRes.error?.message ?? invRes.error?.message ?? null;
  const requests = (reqRes.data ?? []) as AdminRequest[];
  const partners = (partRes.data ?? []) as AdminPartner[];
  const invites = (invRes.data ?? []) as { request_id: number; partner_id: number }[];

  const partnersById = new Map(partners.map((p) => [p.id, p]));
  const invitesByRequest = new Map<number, number>();
  const invitesByPartner = new Map<number, number>();
  for (const i of invites) {
    invitesByRequest.set(i.request_id, (invitesByRequest.get(i.request_id) ?? 0) + 1);
    invitesByPartner.set(i.partner_id, (invitesByPartner.get(i.partner_id) ?? 0) + 1);
  }

  const s = requestsSummary(requests, partnersById);
  const tab = sp.tab === "partners" ? "partners" : "requests";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-heading text-2xl font-extrabold">Car Rental Direct · admin</h1>

      {loadError ? (
        <p className="mt-4 rounded-xl border border-terracotta bg-terracotta-faint p-4 text-sm">
          Erreur de lecture : {loadError} (migration 20260705 appliquée ? DB joignable ?)
        </p>
      ) : null}

      {/* Bandeau de synthèse */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(["sent", "quoted", "accepted", "email_failed"] as const).map((st) => (
          <div key={st} className={`rounded-xl border border-border bg-white p-3 ${st === "email_failed" && (s.byStatus[st] ?? 0) > 0 ? "border-terracotta" : ""}`}>
            <div className="text-xs text-text-muted">{st}</div>
            <div className="font-data text-xl font-bold">{s.byStatus[st] ?? 0}</div>
          </div>
        ))}
        <div className="rounded-xl border border-border bg-white p-3">
          <div className="text-xs text-text-muted">rented / lost</div>
          <div className="font-data text-xl font-bold">{s.rented} / {s.lost}</div>
        </div>
        <div className="rounded-xl border border-sun bg-white p-3">
          <div className="text-xs text-text-muted">commission due</div>
          <div className="font-data text-xl font-bold">{s.commissionDueEur.toFixed(2)} €</div>
        </div>
        <div className="rounded-xl border border-ok bg-white p-3">
          <div className="text-xs text-text-muted">commission encaissée</div>
          <div className="font-data text-xl font-bold">{s.commissionPaidEur.toFixed(2)} €</div>
        </div>
      </section>

      {/* Onglets */}
      <nav className="mt-6 flex gap-2">
        <a href="/admin/car-rental" className={`rounded-full px-4 py-1.5 text-sm font-bold no-underline ${tab === "requests" ? "bg-sea text-white" : "border border-border bg-white text-text"}`}>
          Demandes ({requests.length})
        </a>
        <a href="/admin/car-rental?tab=partners" className={`rounded-full px-4 py-1.5 text-sm font-bold no-underline ${tab === "partners" ? "bg-sea text-white" : "border border-border bg-white text-text"}`}>
          Partenaires ({partners.length})
        </a>
      </nav>

      {tab === "requests" ? (
        <RequestsTable
          requests={requests}
          partnersById={partnersById}
          invitesByRequest={invitesByRequest}
          statusFilter={sp.status ?? ""}
          partnerFilter={sp.partner ?? ""}
          page={Math.max(1, Number(sp.page) || 1)}
        />
      ) : (
        <PartnersTable partners={partners} requests={requests} invitesByPartner={invitesByPartner} partnersById={partnersById} />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Vue Demandes**

Créer `src/app/admin/car-rental/requests-table.tsx` :

```tsx
// Vue Demandes : tableau desktop / cartes mobile, filtres par query string,
// écritures par forms natifs bindés aux server actions (zéro client JS).
import {
  canSetOutcome, requestCommission, buildCarWaMessage, waHref,
  type AdminPartner, type AdminRequest,
} from "@/lib/car-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { setOutcome, setCommissionPaid, saveNote } from "./actions";

const PAGE_SIZE = 50;

const carTypeLabel = (id: string): string =>
  CAR_TYPES_DATA.find((c) => c.id === id)?.labels.en ?? id;

function statusBadge(st: string) {
  const cls: Record<string, string> = {
    sent: "bg-sky text-night",
    quoted: "bg-sun text-night",
    accepted: "bg-ok text-white",
    email_failed: "bg-terracotta text-white",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls[st] ?? "bg-border"}`}>{st}</span>;
}

function outcomeBadge(o?: string | null) {
  if (!o) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${o === "rented" ? "bg-olive text-white" : "bg-text-light text-white"}`}>
      {o}
    </span>
  );
}

/** Lien wa.me legacy pour un partenaire en mode relay. */
function relayWaLink(r: AdminRequest, p: AdminPartner | undefined) {
  if (!p || p.lead_routing !== "relay") return null;
  const msg = buildCarWaMessage({
    partnerFirstName: p.name.split(" ")[0],
    pickupLabel: carPickupLabel(r.pickup_slug),
    dateFrom: r.date_from, timeFrom: r.time_from, flightNo: r.flight_no,
    dateTo: r.date_to, timeTo: r.time_to,
    carTypeLabel: carTypeLabel(r.car_type), pax: r.pax,
    customerName: r.customer_name,
    customerContact: r.customer_phone ?? r.customer_email,
  });
  return (
    <a href={waHref(p.whatsapp ?? p.phone ?? "", msg)} target="_blank" rel="noopener noreferrer"
       className="text-sm font-bold text-sea underline">
      WhatsApp → {p.name}
    </a>
  );
}

export function RequestsTable({
  requests, partnersById, invitesByRequest, statusFilter, partnerFilter, page,
}: {
  requests: AdminRequest[];
  partnersById: Map<number, AdminPartner>;
  invitesByRequest: Map<number, number>;
  statusFilter: string;
  partnerFilter: string;
  page: number;
}) {
  let rows = requests;
  if (statusFilter) {
    rows = statusFilter === "rented" || statusFilter === "lost"
      ? rows.filter((r) => r.outcome === statusFilter)
      : rows.filter((r) => r.status === statusFilter);
  }
  if (partnerFilter) rows = rows.filter((r) => String(r.quoted_by_partner_id ?? "") === partnerFilter);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    if (partnerFilter) p.set("partner", partnerFilter);
    for (const [k, v] of Object.entries(over)) v === "" ? p.delete(k) : p.set(k, String(v));
    const s = p.toString();
    return `/admin/car-rental${s ? `?${s}` : ""}`;
  };

  return (
    <section className="mt-5">
      {/* Filtres (liens, pas de JS) */}
      <div className="flex flex-wrap gap-1.5 text-sm">
        {["", "sent", "quoted", "accepted", "email_failed", "rented", "lost"].map((f) => (
          <a key={f || "all"} href={qs({ status: f, page: "" })}
             className={`rounded-full border px-3 py-1 no-underline ${statusFilter === f ? "border-sea bg-sea text-white" : "border-border bg-white text-text"}`}>
            {f || "tous"}
          </a>
        ))}
        {[...partnersById.values()].map((p) => (
          <a key={p.id} href={qs({ partner: partnerFilter === String(p.id) ? "" : p.id, page: "" })}
             className={`rounded-full border px-3 py-1 no-underline ${partnerFilter === String(p.id) ? "border-sea bg-sea text-white" : "border-border bg-white text-text"}`}>
            {p.name}
          </a>
        ))}
      </div>

      <ul className="mt-4 space-y-3">
        {pageRows.map((r) => {
          const winner = r.quoted_by_partner_id != null ? partnersById.get(r.quoted_by_partner_id) : undefined;
          const commission = requestCommission(r, partnersById);
          return (
            <li key={r.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-data text-xs text-text-light">#{r.id} · {new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                {statusBadge(r.status)}
                {outcomeBadge(r.outcome)}
                {r.commission_paid_at ? <span className="rounded-full bg-ok px-2 py-0.5 text-xs font-bold text-white">commission encaissée</span> : null}
                <span className="ml-auto text-xs text-text-muted">{invitesByRequest.get(r.id) ?? 0} loueur(s) invité(s)</span>
              </div>

              <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <span className="font-bold">{carPickupLabel(r.pickup_slug)}</span>
                  {" · "}{r.date_from}{r.time_from ? ` ${r.time_from}` : ""}{r.flight_no ? ` (vol ${r.flight_no})` : ""} → {r.date_to}{r.time_to ? ` ${r.time_to}` : ""}
                  <br />
                  {carTypeLabel(r.car_type)}, {r.pax ?? "?"} pax
                  {r.insurance ? ` · assurance ${r.insurance}` : ""}{r.payment_method ? ` · ${r.payment_method}` : ""}
                  {r.note ? <div className="text-text-muted">Note client : {r.note}</div> : null}
                </div>
                <div>
                  {r.customer_name} · <a href={`mailto:${r.customer_email}`} className="text-sea">{r.customer_email}</a>
                  {r.customer_phone ? <> · {r.customer_phone}</> : null}
                  <br />
                  {winner ? <>Gagnant : <span className="font-bold">{winner.name}</span></> : <span className="text-text-muted">Pas encore de devis</span>}
                  {r.quoted_price != null ? <> · devis <span className="font-data font-bold">{r.quoted_price} €</span></> : null}
                  {r.final_amount_eur != null ? <> · final <span className="font-data font-bold">{r.final_amount_eur} €</span></> : null}
                  {commission != null ? <> · commission <span className="font-data font-bold">{commission.toFixed(2)} €</span></> : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {canSetOutcome(r) ? (
                  <>
                    <form action={setOutcome.bind(null, r.id)} className="flex items-center gap-1.5">
                      <input type="hidden" name="outcome" value="rented" />
                      <input name="amount" inputMode="decimal" defaultValue={r.final_amount_eur ?? r.quoted_price ?? ""}
                             placeholder="€" className="w-20 rounded-lg border border-border px-2 py-1 text-sm" aria-label="Montant final (€)" />
                      <button className="rounded-full bg-olive px-3 py-1 text-sm font-bold text-white">Loué</button>
                    </form>
                    <form action={setOutcome.bind(null, r.id)}>
                      <input type="hidden" name="outcome" value="lost" />
                      <button className="rounded-full border border-border bg-white px-3 py-1 text-sm font-bold">Perdu</button>
                    </form>
                  </>
                ) : null}
                {r.outcome === "rented" ? (
                  <form action={setCommissionPaid.bind(null, r.id, !r.commission_paid_at)}>
                    <button className={`rounded-full px-3 py-1 text-sm font-bold ${r.commission_paid_at ? "border border-border bg-white" : "bg-sun text-night"}`}>
                      {r.commission_paid_at ? "Repasser en due" : "Commission encaissée"}
                    </button>
                  </form>
                ) : null}
                {relayWaLink(r, winner ?? [...partnersById.values()].find((p) => p.lead_routing === "relay" && p.zone_ids.includes(r.zone_id)))}
                <form action={saveNote.bind(null, r.id)} className="flex min-w-56 flex-1 items-center gap-1.5">
                  <input name="note" defaultValue={r.admin_note ?? ""} placeholder="Note admin…"
                         className="w-full flex-1 rounded-lg border border-border px-2 py-1 text-sm" />
                  <button className="rounded-full border border-border bg-white px-3 py-1 text-sm font-bold">OK</button>
                </form>
              </div>
            </li>
          );
        })}
        {pageRows.length === 0 ? <li className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-text-muted">Aucune demande.</li> : null}
      </ul>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 ? <a href={qs({ page: page - 1 })} className="font-bold text-sea">← Précédent</a> : null}
          <span className="text-text-muted">page {page} / {totalPages}</span>
          {page < totalPages ? <a href={qs({ page: page + 1 })} className="font-bold text-sea">Suivant →</a> : null}
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 5: Vue Partenaires**

Créer `src/app/admin/car-rental/partners-table.tsx` :

```tsx
// Vue Partenaires : registre car_partners + stats calculées. Écritures :
// toggle active + zones/commission (forms natifs → server actions).
// Pas de création ici : l'auto-enroll signup + INSERT SQL couvrent l'onboarding.
import { partnerStats, ZONE_IDS, type AdminPartner, type AdminRequest } from "@/lib/car-admin";
import { togglePartnerActive, updatePartner } from "./actions";

export function PartnersTable({
  partners, requests, invitesByPartner, partnersById,
}: {
  partners: AdminPartner[];
  requests: AdminRequest[];
  invitesByPartner: Map<number, number>;
  partnersById: Map<number, AdminPartner>;
}) {
  return (
    <section className="mt-5 space-y-3">
      {partners.map((p) => {
        const st = partnerStats(p.id, requests, invitesByPartner, partnersById);
        return (
          <div key={p.id} className={`rounded-2xl border bg-white p-4 ${p.active ? "border-border" : "border-terracotta opacity-70"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-lg font-bold">{p.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.active ? "bg-ok text-white" : "bg-terracotta text-white"}`}>
                {p.active ? "actif" : "inactif"}
              </span>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs">{p.lead_routing}</span>
              {p.outreach_status ? <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-bold text-night">{p.outreach_status}</span> : null}
              <form action={togglePartnerActive.bind(null, p.id, !p.active)} className="ml-auto">
                <button className="rounded-full border border-border bg-white px-3 py-1 text-sm font-bold">
                  {p.active ? "Désactiver" : "Activer"}
                </button>
              </form>
            </div>

            <div className="mt-1 text-sm text-text-muted">
              <a href={`mailto:${p.email}`} className="text-sea">{p.email}</a>
              {p.phone ? <> · {p.phone}</> : null}
              {p.whatsapp && p.whatsapp !== p.phone ? <> · WA {p.whatsapp}</> : null}
              {" · depuis "}{new Date(p.created_at).toLocaleDateString("fr-FR")}
            </div>

            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <span>{st.invites} invitation(s)</span>
              <span>{st.won} devis gagné(s)</span>
              <span>{st.rented} location(s)</span>
              <span className="font-data font-bold">{st.commissionEur.toFixed(2)} € de commission générée</span>
            </div>

            <form action={updatePartner.bind(null, p.id)} className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
              {ZONE_IDS.map((z) => (
                <label key={z} className="flex items-center gap-1.5">
                  <input type="checkbox" name={`zone-${z}`} defaultChecked={p.zone_ids.includes(z)} />
                  {z}
                </label>
              ))}
              <label className="flex items-center gap-1.5">
                commission
                <input name="commissionPct" inputMode="decimal" defaultValue={Math.round(p.commission * 10000) / 100}
                       className="w-16 rounded-lg border border-border px-2 py-1" aria-label="Commission (%)" />
                %
              </label>
              <button className="rounded-full bg-sea px-3 py-1 font-bold text-white">Enregistrer</button>
            </form>
          </div>
        );
      })}
      {partners.length === 0 ? <div className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-text-muted">Aucun partenaire en base.</div> : null}
    </section>
  );
}
```

- [ ] **Step 6: Types + checks**

Run: `npx tsc --noEmit && npm run check:car-admin && npm run check:car-lead`
Expected: exit 0. (Si `CAR_TYPES_DATA`/`carPickupLabel` posent un souci d'import : les deux sont des modules purs déjà importés par le wizard, vérifier les chemins.)

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/car-rental/layout.tsx src/app/admin/car-rental/page.tsx src/app/admin/car-rental/actions.ts src/app/admin/car-rental/requests-table.tsx src/app/admin/car-rental/partners-table.tsx
git commit -m "feat(car-admin): page /admin/car-rental (demandes + partenaires, forms server actions)"
```

---

### Task 6: Vérification complète + gate d'accès + preview

- [ ] **Step 1: Chaîne de checks complète**

Run: `npm run check`
Expected: exit 0 (tous les check-*.mjs dont car-admin, + `tsc --noEmit`)

- [ ] **Step 2: Build production**

Run: `npm run build`
Expected: build vert. Attention : ne PAS lancer si un autre terminal builde (règle multi-terminal : `tasklist | findstr node` d'abord en cas de doute).

- [ ] **Step 3: Gate d'accès en local (sans service key, le gate se teste quand même)**

```bash
CAR_ADMIN_SECRET=testsecret npm run dev -- --port 3100 &
# attendre le ready, puis :
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/admin/car-rental          # attendu: 404
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3100/admin/car-rental?key=nope"   # attendu: 404
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3100/admin/car-rental/auth?key=testsecret"  # attendu: 307 + set-cookie car_admin
```

(Sous PowerShell : `$env:CAR_ADMIN_SECRET="testsecret"; npm run dev -- --port 3100`.)
La page authentifiée plantera ensuite sur le fetch Supabase en local (pas de `SUPABASE_SERVICE_KEY`) : c'est attendu, la vérif complète se fait sur la preview Vercel.

- [ ] **Step 4: Push branche → preview Vercel**

```bash
git push -u origin feat/car-admin
```

Expected: Vercel génère une URL preview. **NE PAS pousser sur main.**

- [ ] **Step 5: Actions de déploiement (à faire AVANT le merge prod, coordonnées avec Kami)**

1. Vercel : ajouter l'env `CAR_ADMIN_SECRET` (valeur générée, ex. `openssl rand -hex 24`), scopes Production + Preview.
2. VPS : appliquer la migration :
   `ssh kairos-vps "docker exec -i cretepulse-db-postgres-1 psql -U postgres -d postgres" < supabase/migrations/20260705_car_admin.sql`
   (adapter le nom du conteneur : `docker ps | grep cretepulse` ; le `notify pgrst` est dans le fichier).
3. Vérifier sur la PREVIEW : `/admin/car-rental?key=<secret>` → cookie → page complète, saisir une issue de test sur une demande réelle puis la remettre à zéro.
4. GO Kami → merge/push prod (`git push origin master:main` après merge dans master).
5. Transmettre à Kami en privé : URL `https://crete.direct/admin/car-rental?key=<secret>`.

---

## Self-review (fait à l'écriture du plan)

- **Spec coverage** : §1 accès (Task 4 + page Step 3) ; §2 migration (Task 1) + tolérance pré-migration (types optionnels Task 2, message d'erreur page Step 3) ; §3 vues/bandeau/filtres/wa.me relay (Task 5) ; §4 logique pure + actions (Tasks 2, 5) ; §5 checks (Task 2) + gate curl (Task 6 — la spec est mise à jour en conséquence, le repo n'a pas d'infra Playwright configurée) ; §6 livraison (Task 6).
- **Types** : `AdminRequest`/`AdminPartner` définis en Task 2, consommés Tasks 5 ; noms d'actions cohérents (`setOutcome`, `setCommissionPaid`, `saveNote`, `togglePartnerActive`, `updatePartner`).
- **Pas de placeholder** : chaque étape porte son code complet.
