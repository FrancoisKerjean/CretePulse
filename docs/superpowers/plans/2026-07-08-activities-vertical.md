# Verticale /activities — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cloner le système car-rental direct (multi-devis, commission déclarative, zéro paiement en ligne) en verticale `/activities` : 3 catégories × 5 villes, wizard, fan-out partenaires, pages devis/offres, crons de relance, admin cockpit.

**Architecture:** Clone strict du système car (mêmes noms de colonnes, mêmes patterns : tokens SHA256 rotatifs, rate-limit IP silencieux, validateurs purs, server-first admin). Spec de référence : `docs/superpowers/specs/2026-07-08-activities-vertical-design.md`. Les deltas produit : catégorie+ville (remplace zone/pickup), date unique + créneau, adultes/enfants, langue de guide.

**Tech Stack:** Next.js 16 App Router, PostgREST self-hosted (supabaseAdmin), Resend, tests purs `node --experimental-strip-types scripts/check-*.mjs`.

**Convention de clonage :** quand une étape dit « CLONE de `<fichier car>` avec la table de transformation », l'implémenteur DOIT lire le fichier car source (chemin exact donné), le copier, et appliquer UNIQUEMENT les transformations listées. Ne rien improviser d'autre. Le code complètement nouveau est donné inline.

**Repo :** `C:\Users\fkerj\cretepulse-build`. Branche de travail : `feat/activities-vertical` (créée depuis `master` à jour). Commits fréquents, jamais de push direct sur `main`.

---

### Task 0 : Branche de travail

- [ ] **Step 0.1 : Créer la branche depuis master à jour**

```bash
cd C:/Users/fkerj/cretepulse-build
git fetch origin
git checkout master && git pull --ff-only origin master
git checkout -b feat/activities-vertical
```

Expected : branche `feat/activities-vertical` active, working tree propre (les untracked `detect_replies.py`, `docs/outreach/`, mockups n'appartiennent pas à ce chantier : ne PAS les committer).

---

### Task 1 : Migration SQL

**Files:**
- Create: `supabase/migrations/20260709_activities_multi_quote.sql`

- [ ] **Step 1.1 : Écrire la migration**

```sql
-- Verticale activités (clone du modèle car-rental multi-devis) :
-- demandes clients (activity_requests), registre prestataires
-- (activity_partners), invites multi-devis (activity_quote_invites),
-- référentiel catégories (activity_categories).
-- Mêmes conventions que car_* : service_role only, tokens hashés,
-- grants explicites, notify pgrst.

create table if not exists public.activity_categories (
  slug       text primary key,          -- food-tours | boat-trips | hiking
  name_en    text not null,
  sort_order smallint not null default 0,
  active     boolean not null default true
);
insert into public.activity_categories (slug, name_en, sort_order) values
  ('food-tours', 'Food & wine tours', 1),
  ('boat-trips', 'Boat trips', 2),
  ('hiking',     'Hiking & nature', 3)
on conflict (slug) do nothing;

create table if not exists public.activity_partners (
  id            bigint generated always as identity primary key,
  name          text not null,
  email         text not null unique,
  phone         text,
  whatsapp      text,
  category_slug text not null references public.activity_categories(slug),
  cities        text[] not null default '{}',  -- chania|rethymno|heraklion|agios-nikolaos|ierapetra
  languages     text[] not null default '{en}',
  commission    numeric not null default 0.10,
  lead_routing  text not null default 'direct', -- 'direct' | 'relay'
  active        boolean not null default true,
  outreach_status text not null default 'new',  -- 'new' | 'inbound' (car: colonne hors-repo, ici migrée proprement)
  created_at    timestamptz not null default now()
);
create index if not exists activity_partners_cities_idx on public.activity_partners using gin (cities);

create table if not exists public.activity_requests (
  id                   bigint generated always as identity primary key,
  created_at           timestamptz not null default now(),
  locale               text not null default 'en',
  category_slug        text not null references public.activity_categories(slug),
  city                 text not null,
  activity_date        date not null,
  timeslot             text,               -- morning | afternoon | evening | flexible
  adults               smallint not null default 2,
  children             smallint not null default 0,
  preferred_language   text,               -- en | fr | de | el | it
  customer_name        text not null,
  customer_email       text not null,
  customer_phone       text,
  note                 text,
  source               text,
  status               text not null default 'sent', -- sent | quoted | accepted | declined_by_client | email_failed
  ip_hash              text,
  -- tokens client (rotatifs, hash SHA256, jamais en clair)
  accept_token_hash    text,
  -- snapshot du devis choisi (noms identiques car_requests)
  quoted_by_partner_id bigint references public.activity_partners(id),
  quoted_price         numeric,
  quoted_currency      text default 'EUR',
  quoted_details       text,               -- équivalent quoted_car_model : titre de l'offre
  quoted_inclusions    jsonb,
  quoted_at            timestamptz,
  accepted_at          timestamptz,
  partner_name         text,
  partner_email        text,
  -- relances client (clone car multi-devis)
  client_relanced_at   timestamptz,
  client_relance_count int not null default 0,
  no_quote_notified_at timestamptz,
  -- back-office commissions (clone 20260705_car_admin.sql)
  outcome              text,               -- 'done' (activité effectuée) | 'lost' | null
  outcome_at           timestamptz,
  final_amount_eur     numeric,
  commission_eur       numeric,
  commission_paid_at   timestamptz,
  admin_note           text
);
create index if not exists activity_requests_created_idx on public.activity_requests (created_at desc);
create index if not exists activity_requests_dedup_idx on public.activity_requests (customer_email, category_slug, city, activity_date);
create index if not exists idx_activity_requests_ip_hash_created on public.activity_requests (ip_hash, created_at);
create unique index if not exists activity_requests_accept_token_idx
  on public.activity_requests (accept_token_hash) where accept_token_hash is not null;

create table if not exists public.activity_quote_invites (
  id               bigint generated always as identity primary key,
  request_id       bigint not null references public.activity_requests(id) on delete cascade,
  partner_id       bigint not null references public.activity_partners(id),
  quote_token_hash text not null,
  status           text not null default 'invited', -- invited|quoted|declined|chosen|not_chosen
  quote_price      numeric,
  quote_currency   text,
  quote_details    text,
  quote_inclusions jsonb,
  quoted_at        timestamptz,
  declined_at      timestamptz,
  relanced_at      timestamptz,
  created_at       timestamptz not null default now()
);
create unique index if not exists activity_quote_invites_token_idx on public.activity_quote_invites (quote_token_hash);
create index if not exists activity_quote_invites_request_idx on public.activity_quote_invites (request_id);

-- Données personnelles : aucun accès aux rôles publics.
revoke all on public.activity_categories from anon, authenticated;
revoke all on public.activity_partners from anon, authenticated;
revoke all on public.activity_requests from anon, authenticated;
revoke all on public.activity_quote_invites from anon, authenticated;
grant select on public.activity_categories to service_role;
grant select, insert, update on public.activity_partners to service_role;
grant select, insert, update on public.activity_requests to service_role;
grant select, insert, update, delete on public.activity_quote_invites to service_role;
grant usage, select on sequence public.activity_partners_id_seq to service_role;
grant usage, select on sequence public.activity_requests_id_seq to service_role;
grant usage, select on sequence public.activity_quote_invites_id_seq to service_role;

notify pgrst, 'reload schema';
```

- [ ] **Step 1.2 : Appliquer sur le VPS**

```bash
ssh kairos-vps "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse" < supabase/migrations/20260709_activities_multi_quote.sql
```

Expected : `CREATE TABLE` ×4, `INSERT 0 3`, aucun ERROR.

- [ ] **Step 1.3 : Vérifier via PostgREST**

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
s.from('activity_categories').select('slug').then(r => console.log(r.data, r.error));
" # variables : mêmes que le projet (env local ou copier depuis Vercel)
```

Expected : `[{slug:'food-tours'},{slug:'boat-trips'},{slug:'hiking'}] null`. Si erreur `relation does not exist` : le reload PostgREST n'a pas suivi, relancer `notify pgrst, 'reload schema';` via psql.

- [ ] **Step 1.4 : Commit**

```bash
git add supabase/migrations/20260709_activities_multi_quote.sql
git commit -m "feat(activities): migration tables multi-devis (clone car_*)"
```

---

### Task 2 : Taxonomie statique (catégories, villes, créneaux, langues)

**Files:**
- Create: `src/lib/activity-taxonomy.ts`
- Test: `scripts/check-activity-taxonomy.mjs`

- [ ] **Step 2.1 : Écrire le module (node-safe, zéro I/O)**

```typescript
// Référentiel statique de la verticale activités : catégories (miroir des
// rows activity_categories), villes, créneaux, langues de guide. Node-safe
// (importable par les check-*.mjs), zéro I/O. Les labels 4 langues servent
// wizard + emails ; les 18 autres locales vivent dans les content.ts de pages.
export const ACTIVITY_CATEGORIES = [
  { slug: "food-tours", labels: { en: "Food & wine tours", fr: "Tours gastronomiques", de: "Kulinarische Touren", el: "Γαστρονομικές περιηγήσεις" } },
  { slug: "boat-trips", labels: { en: "Boat trips", fr: "Sorties en bateau", de: "Bootsausflüge", el: "Εκδρομές με σκάφος" } },
  { slug: "hiking", labels: { en: "Hiking & nature", fr: "Randonnée & nature", de: "Wandern & Natur", el: "Πεζοπορία & φύση" } },
] as const;
export type ActivityCategorySlug = (typeof ACTIVITY_CATEGORIES)[number]["slug"];

export const ACTIVITY_CITIES = [
  { slug: "chania", labels: { en: "Chania", fr: "La Canée", de: "Chania", el: "Χανιά" } },
  { slug: "rethymno", labels: { en: "Rethymno", fr: "Réthymnon", de: "Rethymno", el: "Ρέθυμνο" } },
  { slug: "heraklion", labels: { en: "Heraklion", fr: "Héraklion", de: "Heraklion", el: "Ηράκλειο" } },
  { slug: "agios-nikolaos", labels: { en: "Agios Nikolaos", fr: "Agios Nikolaos", de: "Agios Nikolaos", el: "Άγιος Νικόλαος" } },
  { slug: "ierapetra", labels: { en: "Ierapetra", fr: "Iérapétra", de: "Ierapetra", el: "Ιεράπετρα" } },
] as const;
export type ActivityCitySlug = (typeof ACTIVITY_CITIES)[number]["slug"];

export const ACTIVITY_TIMESLOTS = ["morning", "afternoon", "evening", "flexible"] as const;
export type ActivityTimeslot = (typeof ACTIVITY_TIMESLOTS)[number];

export const GUIDE_LANGUAGES = ["en", "fr", "de", "el", "it"] as const;
export type GuideLanguage = (typeof GUIDE_LANGUAGES)[number];

export const isCategorySlug = (v: unknown): v is ActivityCategorySlug =>
  typeof v === "string" && ACTIVITY_CATEGORIES.some((c) => c.slug === v);
export const isCitySlug = (v: unknown): v is ActivityCitySlug =>
  typeof v === "string" && ACTIVITY_CITIES.some((c) => c.slug === v);
export const isTimeslot = (v: unknown): v is ActivityTimeslot =>
  typeof v === "string" && (ACTIVITY_TIMESLOTS as readonly string[]).includes(v);
export const isGuideLanguage = (v: unknown): v is GuideLanguage =>
  typeof v === "string" && (GUIDE_LANGUAGES as readonly string[]).includes(v);

export function categoryLabel(slug: string, locale: string): string {
  const c = ACTIVITY_CATEGORIES.find((x) => x.slug === slug);
  if (!c) return slug;
  return (c.labels as Record<string, string>)[locale] ?? c.labels.en;
}
export function cityLabel(slug: string, locale: string): string {
  const c = ACTIVITY_CITIES.find((x) => x.slug === slug);
  if (!c) return slug;
  return (c.labels as Record<string, string>)[locale] ?? c.labels.en;
}
```

- [ ] **Step 2.2 : Écrire le test (pattern des check-*.mjs existants : lire `scripts/check-car-quotes.mjs` pour le harnais assert/compteur, le copier)**

Cas à couvrir (un `check(name, cond)` par cas) : 3 catégories, 5 villes, `isCategorySlug("food-tours")` true, `isCategorySlug("car")` false, `isCitySlug("chania")` true, `isTimeslot("morning")` true / `isTimeslot("night")` false, `isGuideLanguage("it")` true / `("es")` false, `categoryLabel("hiking","fr")` = "Randonnée & nature", `categoryLabel("hiking","pt")` retombe sur EN, `cityLabel("inconnu","en")` = "inconnu".

- [ ] **Step 2.3 : Câbler et lancer**

Ajouter dans `package.json` scripts : `"check:activity-taxonomy": "node --experimental-strip-types scripts/check-activity-taxonomy.mjs"`.
Run : `npm run check:activity-taxonomy` — Expected : tous les checks PASS, exit 0.

- [ ] **Step 2.4 : Commit** — `git add -A && git commit -m "feat(activities): taxonomie statique + tests"`

---

### Task 3 : Logique pure multi-devis + inclusions

**Files:**
- Create: `src/lib/activity-quotes.ts` — CLONE de `src/lib/car-quotes.ts`
- Create: `src/lib/activity-inclusions.ts` — CLONE de `src/lib/car-inclusions.ts`
- Test: `scripts/check-activity-quotes.mjs` — CLONE de `scripts/check-car-quotes.mjs`

- [ ] **Step 3.1 : Cloner `car-quotes.ts` → `activity-quotes.ts`**

Table de transformation (RIEN d'autre ne change, les fonctions `sortQuotesByPrice`, `canPartnerQuote`, `findChosenInvite`, `partnerNeedsRelance`, `clientNeedsRelance` sont identiques) :
| car | activity |
|---|---|
| `quote_car_model` | `quote_details` |
| commentaire d'en-tête « car-lead.ts / car-admin.ts » | « activity-lead.ts / activity-admin.ts » |

- [ ] **Step 3.2 : Cloner `car-inclusions.ts` → `activity-inclusions.ts`**

Remplacer les clés et les 4 maps de labels par :

```typescript
export const ACTIVITY_INCLUSION_KEYS = ["meals", "drinks", "transport", "guide", "gear"] as const;
```

Labels : en `{ meals: "Meals included", drinks: "Drinks included", transport: "Hotel pick-up / transport", guide: "Licensed guide", gear: "Equipment provided" }` ; fr `{ meals: "Repas inclus", drinks: "Boissons incluses", transport: "Transfert hôtel / transport", guide: "Guide diplômé", gear: "Matériel fourni" }` ; de `{ meals: "Mahlzeiten inklusive", drinks: "Getränke inklusive", transport: "Hotelabholung / Transport", guide: "Lizenzierter Guide", gear: "Ausrüstung gestellt" }` ; el `{ meals: "Γεύματα", drinks: "Ποτά", transport: "Μεταφορά από ξενοδοχείο", guide: "Πιστοποιημένος ξεναγός", gear: "Εξοπλισμός" }`. Renommer `isInclusionKey` → `isActivityInclusionKey` (évite la collision d'import avec la version car), idem `inclusionLabels` → `activityInclusionLabels`.

- [ ] **Step 3.3 : Cloner le test `check-car-quotes.mjs` → `check-activity-quotes.mjs`** (mêmes cas, imports pointés sur `activity-quotes.ts` / `activity-inclusions.ts`, cas `quote_details` au lieu de `quote_car_model`, + 2 cas inclusions : `isActivityInclusionKey("meals")` true, `("unlimited_km")` false).

- [ ] **Step 3.4 : Câbler `"check:activity-quotes"` dans package.json, lancer** — Expected : PASS.

- [ ] **Step 3.5 : Commit** — `git commit -m "feat(activities): logique pure multi-devis + inclusions (clone car-quotes)"`

---

### Task 4 : Validateur de lead (pur, TDD)

**Files:**
- Create: `src/lib/activity-lead.ts`
- Test: `scripts/check-activity-lead.mjs` — harnais cloné de `scripts/check-car-lead.mjs`

- [ ] **Step 4.1 : Écrire le test d'abord** (harnais du check-car-lead.mjs). Cas :

```
honeypot rempli → kind "honeypot"
catégorie inconnue → error 422
ville inconnue → error 422
date malformée ("2026/08/01") → error 422
date passée (hier) → error 422
adults 0 → error 422 ; adults 21 → error 422
children -1 → error 422
email invalide → error 422
nom vide → error 422
timeslot invalide ("night") → null dans row (toléré, pas bloquant)
preferred_language invalide ("es") → null dans row
lead valide complet → kind "ok", row.status "sent", note tronquée à 500, email lowercasé
children absent → row.children = 0
```

Run : `npm run check:activity-lead` — Expected : FAIL (`Cannot find module`).

- [ ] **Step 4.2 : Implémenter**

```typescript
// Validation + construction de la demande d'activité, PURE (zéro I/O),
// pattern car-lead.ts. La route ne garde que l'orchestration I/O.
import { isCategorySlug, isCitySlug, isTimeslot, isGuideLanguage } from "./activity-taxonomy.ts";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ActivityRequestRow = {
  locale: string;
  category_slug: string;
  city: string;
  activity_date: string;
  timeslot: string | null;
  adults: number;
  children: number;
  preferred_language: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  note: string | null;
  source: string | null;
  status: string;
};

export type ActivityLeadResult =
  | { kind: "honeypot" }
  | { kind: "error"; status: number; error: string }
  | { kind: "ok"; row: ActivityRequestRow };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** todayIso injectable pour les tests (défaut : date du jour UTC). */
export function validateActivityLead(
  body: Record<string, unknown>,
  todayIso: string = new Date().toISOString().slice(0, 10),
): ActivityLeadResult {
  if (body.website && String(body.website).trim() !== "") return { kind: "honeypot" };

  const category = String(body.category ?? "");
  const city = String(body.city ?? "");
  const date = String(body.date ?? "");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const adults = Number(body.adults);
  const children = body.children == null || body.children === "" ? 0 : Number(body.children);

  if (!isCategorySlug(category) || !isCitySlug(city) || !name || !EMAIL_REGEX.test(email)) {
    return { kind: "error", status: 422, error: "Invalid request" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayIso) {
    return { kind: "error", status: 422, error: "Invalid date" };
  }
  if (!Number.isInteger(adults) || adults < 1 || adults > 20) {
    return { kind: "error", status: 422, error: "Invalid participants" };
  }
  if (!Number.isInteger(children) || children < 0 || children > 20) {
    return { kind: "error", status: 422, error: "Invalid participants" };
  }

  const row: ActivityRequestRow = {
    locale: typeof body.locale === "string" ? body.locale : "en",
    category_slug: category,
    city,
    activity_date: date,
    timeslot: isTimeslot(body.timeslot) ? body.timeslot : null,
    adults,
    children,
    preferred_language: isGuideLanguage(body.language) ? body.language : null,
    customer_name: name,
    customer_email: email,
    customer_phone: str(body.phone),
    note: str(body.note)?.slice(0, 500) ?? null,
    source: str(body.source),
    status: "sent",
  };
  return { kind: "ok", row };
}
```

- [ ] **Step 4.3 : Run** `npm run check:activity-lead` — Expected : PASS.
- [ ] **Step 4.4 : Commit** — `git commit -m "feat(activities): validateur de lead pur + tests"`

---

### Task 5 : Accès base (partners + quotes)

**Files:**
- Create: `src/lib/activity-partners-db.ts` — CLONE de `src/lib/car-partners-db.ts`
- Create: `src/lib/activity-quotes-db.ts` — CLONE de `src/lib/car-quotes-db.ts`

- [ ] **Step 5.1 : Cloner `car-partners-db.ts`**

Transformations : table `activity_partners` ; `DbPartner` gagne `category_slug: string`, `cities: string[]`, `languages: string[]` et perd `zone_ids` ; `COLS` = `"id, name, email, phone, whatsapp, category_slug, cities, languages, commission, lead_routing, active"` ; `partnersForZone(zoneId)` devient :

```typescript
/** Prestataires actifs couvrant catégorie + ville : tous invités (multi-devis). */
export async function partnersForCategoryCity(categorySlug: string, city: string): Promise<DbActivityPartner[]> {
  try {
    const { data, error } = await supabase.from("activity_partners")
      .select(COLS).eq("active", true).eq("category_slug", categorySlug).contains("cities", [city]);
    if (error) { console.error("[activity-partners-db] partnersForCategoryCity:", error.message); return []; }
    return (data ?? []) as DbActivityPartner[];
  } catch (e) {
    console.error("[activity-partners-db] partnersForCategoryCity (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}
```

`servedZoneIds()` devient `servedCombos(): Promise<Array<{ category_slug: string; city: string }>>` (select `category_slug, cities` des actifs, produit cartésien slug×city dédupliqué). Le type s'appelle `DbActivityPartner` (pas de collision avec `DbPartner` car).

- [ ] **Step 5.2 : Cloner `car-quotes-db.ts`**

Transformations : tables `activity_quote_invites`/`activity_requests`/`activity_partners` ; import type depuis `activity-quotes.ts` ; `quote_car_model` → `quote_details` ; le select de `requestByClientToken` devient `"id, status, locale, category_slug, city, activity_date, timeslot, adults, children, preferred_language, customer_name, customer_email, customer_phone"` ; `hashToken` reste importé de `@/lib/car-quote` (helpers génériques, DRY, ne PAS dupliquer).

- [ ] **Step 5.3 : `npx tsc --noEmit`** — Expected : 0 erreur sur les nouveaux fichiers.
- [ ] **Step 5.4 : Commit** — `git commit -m "feat(activities): accès base partners + quotes (clone car-*-db)"`

---

### Task 6 : Emails (senders dans email.ts)

**Files:**
- Modify: `src/lib/email.ts` (ajouts en fin de fichier, section commentée `// ── Activities Direct ──`)

- [ ] **Step 6.1 : Lire les senders car dans `src/lib/email.ts`** (`sendAgencyQuoteRequest`, `sendCustomerRequestReceived`, `sendCustomerNewOffer`, `sendCustomerRelance`, `sendCustomerNoQuoteYet`, `sendPartnerRelance`, `sendPartnerNotChosen`, `sendConnectionEmails`, `sendLeadKamiSummary`) pour copier exactement leur structure (maps `Record<locale,…>` 4 langues client, EN pur partenaire, FR résumé Kami).

- [ ] **Step 6.2 : Ajouter le type et les 9 senders activités**

```typescript
export interface ActivityLead {
  categoryLabel: string;   // EN pour les partenaires, localisé pour le client
  cityLabel: string;
  date: string;            // YYYY-MM-DD
  timeslot?: string;       // clé brute morning|afternoon|evening|flexible
  adults: number;
  children: number;
  preferredLanguage?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  note?: string;
}
```

Senders à créer, clone 1:1 du sender car correspondant (même signature adaptée, même structure de map de langues, mêmes gardes d'erreur Resend) :
| Sender activité | Clone de | Langues | Delta contenu |
|---|---|---|---|
| `sendActivityQuoteRequest(partner, lead, quoteUrl)` | `sendAgencyQuoteRequest` | EN | corps AVEUGLE (aucune coordonnée client) : catégorie, ville, date, créneau, adultes/enfants, langue souhaitée, note ; CTA « Send your price for the whole group » |
| `sendActivityCustomerRequestReceived({email, locale, customerName, request, noProvider})` | `sendCustomerRequestReceived` | 4 | `noProvider` remplace `noAgency` (« nous cherchons un prestataire pour vous ») |
| `sendActivityCustomerNewOffer({email, locale, customerName, offersUrl, categoryLabel, cityLabel})` | `sendCustomerNewOffer` | 4 | — |
| `sendActivityCustomerRelance({email, locale, customerName, offersUrl})` | `sendCustomerRelance` | 4 | — |
| `sendActivityCustomerNoQuoteYet({email, locale, customerName})` | `sendCustomerNoQuoteYet` | 4 | — |
| `sendActivityPartnerRelance(email, name, quoteUrl)` | `sendPartnerRelance` | EN | — |
| `sendActivityPartnerNotChosen(email, name)` | `sendPartnerNotChosen` | EN | — |
| `sendActivityConnectionEmails({partner, customer, quote})` | `sendConnectionEmails` | 4 client / EN partenaire | `quote` porte categoryLabel/cityLabel/date/price/currency/partnerName/details/inclusions/groupe |
| `sendActivityLeadKamiSummary(lead, sentNames)` | `sendLeadKamiSummary` | FR | — |
| `sendActivitiesDirectWelcome(name, email)` | `sendCarRentalDirectWelcome` (dans `car-rental-signup.ts`) | EN | texte : « Activities Direct », « the quote is for the whole group », « 10% commission only on the bookings we bring you » — PAS de « First to reply wins » (multi-devis : le client compare) |

Règle de traduction : pour chaque sender 4 langues, écrire EN d'abord puis traduire fr/de/el soi-même dans la map, en copiant le TON des maps car existantes du même sender. Diacritiques grecs/allemands complets. Aucun placeholder, aucune langue laissée en anglais dans une map fr/de/el.

- [ ] **Step 6.3 : `npx tsc --noEmit`** — Expected : 0 erreur.
- [ ] **Step 6.4 : Commit** — `git commit -m "feat(activities): 10 senders email (clone structure car, client 4 langues, partenaire EN)"`

---

### Task 7 : API submit

**Files:**
- Create: `src/app/api/activities/submit/route.ts` — CLONE de `src/app/api/car-rental/submit/route.ts`

- [ ] **Step 7.1 : Cloner la route submit.** Transformations exactes sur le fichier car (structure et ordre des blocs conservés : honeypot/validation → rate-limit → couverture → dédup → insert → fan-out → acks) :

| car | activity |
|---|---|
| `validateCarLead` | `validateActivityLead` (plus de `zone`/`carType` retournés : seulement `row`) |
| table `car_requests` | `activity_requests` |
| sel `CAR_RL_SALT` / fallback `"crete-direct-car-rl"` | inchangé : MÊME sel réutilisé volontairement (décision spec), le comptage rate-limit se fait sur `activity_requests` |
| `partnersForZone(zone.id)` | `partnersForCategoryCity(row.category_slug, row.city)` |
| dédup `.eq("pickup_slug",…).eq("date_from",…)` | `.eq("category_slug", row.category_slug).eq("city", row.city).eq("activity_date", row.activity_date)` |
| `CarLead` / labels pickup + carType | `ActivityLead` construit avec `categoryLabel(row.category_slug,"en")` + `cityLabel(row.city,"en")` (EN : lu par les partenaires et Kami) |
| `sendAgencyQuoteRequest` / lien `/en/car-quote/${token}` | `sendActivityQuoteRequest` / `/en/activity-quote/${token}` |
| invites `car_quote_invites` | `activity_quote_invites` |
| relay : `sendCarLeadEmail` | relay : `sendActivityLeadKamiSummary(lead, [p.name])` adressé à Kami avec les coordonnées du partenaire relay dans le corps (le sender relay car est spécifique voiture ; ici le relai passe par le résumé Kami, pattern minimal) |
| acks `sendCustomerRequestReceived` / `noAgency` | `sendActivityCustomerRequestReceived` / `noProvider` |
| `sendLeadKamiSummary` | `sendActivityLeadKamiSummary` |

Le rate-limit (`clientIpHash`, `ipRateLimited`, constantes 4/12) est copié tel quel avec la table changée.

- [ ] **Step 7.2 : Test manuel local** (`npm run dev`, puis :)

```bash
curl -s -X POST http://localhost:3000/api/activities/submit -H "Content-Type: application/json" \
  -d '{"category":"food-tours","city":"chania","date":"2026-09-01","timeslot":"evening","adults":2,"children":0,"language":"en","name":"Test Local","email":"test@example.com","locale":"en"}'
```

Expected : sans `SUPABASE_SERVICE_KEY` locale, erreur propre 500 « Could not save request » (la clé n'existe qu'en Production) ; avec clé : `{"ok":true}` ou `{"error":"No partner in this area yet"}` (aucun partenaire seedé → ce dernier). Honeypot : ajouter `"website":"x"` → `{"ok":true}` sans insert.

- [ ] **Step 7.3 : Commit** — `git commit -m "feat(activities): API submit (rate-limit IP, dédup, fan-out multi-devis)"`

---

### Task 8 : API quote + accept

**Files:**
- Create: `src/app/api/activities/quote/route.ts` — CLONE de `src/app/api/car-rental/quote/route.ts`
- Create: `src/app/api/activities/accept/route.ts` — CLONE de `src/app/api/car-rental/accept/route.ts`

- [ ] **Step 8.1 : Cloner quote.** Transformations : tables `activity_*` ; `isInclusionKey` → `isActivityInclusionKey` ; `body.carModel` → `body.details` (champ « offer title », mêmes bornes trim 120) ; colonnes `quote_details` ; select req = `"id, status, locale, category_slug, city, customer_name, customer_email"` ; notification client `sendActivityCustomerNewOffer` avec `offersUrl = ${siteBase()}/${locale}/activity-offer/${clientToken}` + `categoryLabel(req.category_slug, locale)` / `cityLabel(req.city, locale)`. La rotation du token client et le passage `sent→quoted` sont copiés tels quels.

- [ ] **Step 8.2 : Cloner accept.** Transformations : tables/fonctions activity ; expiry `isOfferExpired(chosen.quoted_at, row.activity_date as string, Date.now())` (réutilise `car-offer-expiry.ts` tel quel, ne PAS le dupliquer) ; snapshot identique avec `quoted_details: chosen.quote_details ?? null` ; suppression du bloc `CAR_TYPES_DATA`/`days` (delta produit : pas de durée en jours) ; `sendActivityConnectionEmails` reçoit `{categoryLabel, cityLabel, date: row.activity_date, adults, children, price, currency, partnerName, details, inclusions}` ; perdants → `sendActivityPartnerNotChosen`. Le décline global client (status `declined_by_client`, pas d'email perdants) est copié tel quel.

- [ ] **Step 8.3 : `npx tsc --noEmit`** — Expected : 0 erreur.
- [ ] **Step 8.4 : Commit** — `git commit -m "feat(activities): API quote + accept (multi-devis, snapshot commissions)"`

---

### Task 9 : Crons + vercel.json

**Files:**
- Create: `src/app/api/cron/activity-relance/route.ts` — CLONE de `src/app/api/cron/car-relance/route.ts`
- Create: `src/app/api/cron/activity-no-quote/route.ts` — CLONE de `src/app/api/cron/car-no-quote/route.ts`
- Modify: `vercel.json` (bloc `crons`)

- [ ] **Step 9.1 : Cloner les 2 crons.** Transformations : tables `activity_*` ; `car_requests(status, date_from)` dans le select embed → `activity_requests(status, activity_date)` ; `startInFuture(reqRow.activity_date)` ; senders `sendActivityPartnerRelance` / `sendActivityCustomerRelance` / `sendActivityCustomerNoQuoteYet` ; liens `/en/activity-quote/` et `/${locale}/activity-offer/`. Les gardes (1× partenaire via `relanced_at` posé AVANT envoi + rotation token, 2× client, ≥1 invite chiffrée, `startInFuture`) sont copiées telles quelles — la garde « invite chiffrée » reste (coût nul, protège des états incohérents).

- [ ] **Step 9.2 : Ajouter les crons à `vercel.json`**

```json
{ "path": "/api/cron/activity-no-quote", "schedule": "30 * * * *" },
{ "path": "/api/cron/activity-relance", "schedule": "10 9 * * *" }
```

(Décalés de :30/:10 pour ne pas empiler sur les crons car à :00.)

- [ ] **Step 9.3 : Commit** — `git commit -m "feat(activities): crons relance + no-quote (clone gardes car)"`

---

### Task 10 : Inscription partenaires (interception affiliate)

**Files:**
- Create: `src/lib/activity-signup.ts` — CLONE de `src/lib/car-rental-signup.ts`
- Modify: `src/app/api/affiliate/register/route.ts`
- Modify: `src/app/[locale]/affiliate/SignupForm.tsx`
- Modify: `src/lib/affiliate.ts` (validation du sous-champ)

- [ ] **Step 10.1 : Cloner `car-rental-signup.ts` → `activity-signup.ts`.** Transformations : table `activity_partners` ; insert `{ name, email, category_slug: subCategory, cities: ALL_CITY_SLUGS, languages: ["en"], commission: 0.10, lead_routing: "direct", active: true, outreach_status: "inbound" }` où `ALL_CITY_SLUGS = ACTIVITY_CITIES.map(c => c.slug)` ; la fonction prend `(data: RegisterData, subCategory: string)` ; welcome = `sendActivitiesDirectWelcome` (texte défini Task 6). Exporter aussi `activityPartnerEmailExists`.

- [ ] **Step 10.2 : Étendre la validation `affiliate.ts`.** Dans `validateRegisterPayload` (lire `src/lib/affiliate.ts:110-133`), accepter un champ optionnel `sub_category` (string parmi `food_tours|boat_trips|hiking|other`) et l'exposer dans `RegisterData`. Mapping slug DB : `food_tours→food-tours`, `boat_trips→boat-trips`, `hiking→hiking`.

- [ ] **Step 10.3 : Brancher la route register.** Après la branche `car_rental` existante, ajouter :

```typescript
// Activities Direct : les catégories affiliate 'activity' et 'tour' basculent
// dans le circuit devis (pattern car_rental). 'other' reste dans le circuit /go/.
if ((v.data.category === "activity" || v.data.category === "tour")
    && v.data.sub_category && v.data.sub_category !== "other") {
  const slug = ({ food_tours: "food-tours", boat_trips: "boat-trips", hiking: "hiking" } as Record<string, string>)[v.data.sub_category];
  if (await activityPartnerEmailExists(v.data.email)) {
    return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
  }
  const partner = await insertActivityPartner(v.data, slug);
  if (!partner) return NextResponse.json({ error: "Could not register" }, { status: 500 });
  try { await notifyNewAffiliate({ name: v.data.name, category: v.data.category, area: v.data.area, email: v.data.email, link: `${SITE_URL}/activities` }); } catch (e) { console.error("[affiliate-register] activities notify failed:", e); }
  try { await sendActivitiesDirectWelcome(v.data.name, v.data.email); } catch (e) { console.error("[affiliate-register] activities welcome failed:", e); }
  return NextResponse.json({ ok: true, activitiesDirect: true });
}
```

(Adapter les noms exacts d'import/appel de `notifyNewAffiliate` à ce que fait la branche car_rental juste au-dessus — même séquence, même gestion d'erreur.)

- [ ] **Step 10.4 : SignupForm.** Dans `SignupForm.tsx`, quand la catégorie sélectionnée est `activity` ou `tour`, afficher un `<select name="sub_category">` requis avec les 4 options (Food & wine tours / Boat trips / Hiking & nature / Other) et l'inclure au payload. Suivre le style de champ existant du formulaire.

- [ ] **Step 10.5 : `npx tsc --noEmit` + test manuel du formulaire en dev** (soumission `activity` + `food_tours` → 500 sans clé locale = OK attendu localement ; vérifier juste que le payload part avec `sub_category`).
- [ ] **Step 10.6 : Commit** — `git commit -m "feat(activities): inscription prestataires via interception affiliate activity/tour"`

---

### Task 11 : Wizard client

**Files:**
- Create: `src/components/activities/ActivityWizard.tsx` — CLONE structurel de `src/components/car-rental/CarRentalWizard.tsx`

- [ ] **Step 11.1 : Lire `CarRentalWizard.tsx` en entier** (état, navigation, cartes, écran succès/échec, scroll top, POST submit). Le cloner en gardant : le pattern grosses cartes cliquables, la barre de progression x/4, l'écran de confirmation, la gestion d'erreur réseau, les classes CSS/DA existantes.

- [ ] **Step 11.2 : Adapter les 4 étapes et le skip.** Props : `{ locale: string; strings: WizardStrings; initialCategory?: string; initialCity?: string; servedCombos: Array<{category_slug: string; city: string}> }`.

Étapes : 1 = catégorie (3 cartes depuis `ACTIVITY_CATEGORIES`) ; 2 = ville (5 cartes, une carte est grisée-mais-cliquable si `servedCombos` ne contient pas le combo — badge « on request » ; le submit reste possible, parcours noProvider) ; 3 = date (input date min=today) + créneau (4 cartes) + steppers adultes (1-20, défaut 2) / enfants (0-20, défaut 0) ; 4 = contact (nom, email, tél optionnel, select langue de guide prérempli depuis `locale` si ∈ GUIDE_LANGUAGES sinon `en`, textarea note avec hint « no personal contact details here »).

Skip initial (code NOUVEAU, le car ne saute qu'un niveau) :

```typescript
const validCategory = initialCategory && isCategorySlug(initialCategory) ? initialCategory : undefined;
const validCity = validCategory && initialCity && isCitySlug(initialCity) ? initialCity : undefined;
const [category, setCategory] = useState<string | undefined>(validCategory);
const [city, setCity] = useState<string | undefined>(validCity);
const [step, setStep] = useState(validCity ? 3 : validCategory ? 2 : 1);
```

Payload POST `/api/activities/submit` : `{ category, city, date, timeslot, adults, children, language, name, email, phone, note, locale, source, website }` (`website` = honeypot caché, copié du car).

- [ ] **Step 11.3 : Vérifier le double skip en dev** : `/en/activities` ouvre étape 1 ; hub catégorie (Task 12) ouvre étape 2 ; hub complet ouvre étape 3 ; un slug invalide en URL retombe étape 1 sans crash.
- [ ] **Step 11.4 : Commit** — `git commit -m "feat(activities): wizard 4 étapes, double skip hub, combos non couverts grisés"`

---

### Task 12 : Pages visiteur (19 pages + content 22 locales)

**Files:**
- Create: `src/app/[locale]/activities/content.ts`
- Create: `src/app/[locale]/activities/page.tsx`
- Create: `src/app/[locale]/activities/[category]/page.tsx`
- Create: `src/app/[locale]/activities/[category]/[city]/page.tsx`
- Create: `scripts/gen-activity-content.mjs` (jetable)

- [ ] **Step 12.1 : Lire `src/app/[locale]/car-rental/content.ts` + `page.tsx` + `[location]/page.tsx`** pour copier : le type `PageStrings`, la structure META/STRINGS par locale, `generateStaticParams`, `generateMetadata` (canonical + hreflang), le JSON-LD FAQ, le rendu (H1, intro, sections, FAQ, breadcrumb, wizard intégré).

- [ ] **Step 12.2 : Écrire `content.ts` en 4 langues source (en/fr/de/el).** Structure : `META` (title/desc par locale), `PAGE_STRINGS` (h1, intro, whyTitle, why[3], faqTitle, faq[4], breadcrumbs, wizardStrings), plus des fragments par catégorie (`CATEGORY_STRINGS[slug]`) et un template ville (`h1` du hub = « {Category} in {City} » localisé, intro paramétrée). Contenu : honnête, concret, voix crete.direct (locale, sans intermédiaire de paiement, « you pay the provider directly ») ; JAMAIS de superlatif inventé ni de garantie. FAQ type : « How does it work? », « Do I pay online? » (non : devis, paiement au prestataire), « Is the price per person? » (non : pour le groupe), « What if nobody replies? » (relance + email sous 24h).

- [ ] **Step 12.3 : Écrire les 3 pages.** Server components. `page.tsx` mère : présentation 3 catégories (cartes liens vers `/activities/[category]`) + `<ActivityWizard servedCombos={await servedCombos()} />`. `[category]/page.tsx` : `generateStaticParams` sur les 3 slugs, 404 (`notFound()`) si slug inconnu, wizard `initialCategory`. `[category]/[city]/page.tsx` : params 3×5, 404 si invalide, wizard `initialCategory + initialCity`, contenu hub SEO (H1 localisé, intro ville, FAQ, JSON-LD). Breadcrumbs : Home → Activities → Category → City.

- [ ] **Step 12.4 : Générer les 18 locales restantes.** Écrire `scripts/gen-activity-content.mjs` (jetable) qui prend les 4 langues source dans `content.ts` et les 18 codes locales du site (les lire dans `src/i18n/routing.ts` ou équivalent — même liste que car), et émet les blocs à traduire. La traduction est faite PAR L'IMPLÉMENTEUR (subagent LLM) locale par locale, puis vérification adversariale par un 2ᵉ passage : diacritiques, aucun anglais résiduel, exactitude (« paiement au prestataire », « prix pour le groupe »). Assembler dans `content.ts` final comme le car.

- [ ] **Step 12.5 : Vérifier** : `npm run build` — Expected : 0 erreur, les 19 pages × locales générées. Puis en dev, ouvrir `/en/activities`, `/fr/activities/food-tours`, `/de/activities/hiking/chania` : contenu localisé, wizard à la bonne étape.
- [ ] **Step 12.6 : Commit** — `git commit -m "feat(activities): 19 pages visiteur + content 22 locales + wizard intégré"`

---

### Task 13 : Pages devis partenaire + offres client

**Files:**
- Create: `src/app/[locale]/activity-quote/[token]/page.tsx` (+ composants colocalisés) — CLONE de `src/app/[locale]/car-quote/[token]/`
- Create: `src/app/[locale]/activity-offer/[token]/page.tsx` (+ composants) — CLONE de `src/app/[locale]/car-offer/[token]/`

- [ ] **Step 13.1 : Cloner le dossier `car-quote/[token]` entier.** Transformations : lookup sur `activity_quote_invites.quote_token_hash` ; le select de la demande NE CONTIENT AUCUNE coordonnée client (copier la liste de colonnes de la page car et remplacer par `category_slug, city, activity_date, timeslot, adults, children, preferred_language, note`) ; affichage groupe « 2 adults, 1 child » ; form devis : prix (label « Total price for the whole group »), devise EUR fixe, champ `details` (offer title, optionnel), checkboxes `ACTIVITY_INCLUSION_KEYS` (labels EN partenaire), bouton décliner (POST `?decline=1`). POST vers `/api/activities/quote`.

- [ ] **Step 13.2 : Cloner le dossier `car-offer/[token]` entier.** Transformations : `requestByClientToken` version activity ; cartes d'offres triées par `sortQuotesByPrice` ; affichage `quote_details`, inclusions localisées via `activityInclusionLabels(keys, locale)`, expiry badge via `isOfferExpired(quoted_at, activity_date, now)` ; boutons accepter (POST invite_id) / tout décliner. POST vers `/api/activities/accept`.

- [ ] **Step 13.3 : `npm run build`** — Expected : 0 erreur.
- [ ] **Step 13.4 : Commit** — `git commit -m "feat(activities): pages devis partenaire + comparaison offres client"`

---

### Task 14 : Sitemap

**Files:**
- Modify: `src/app/sitemap.xml/route.ts`

- [ ] **Step 14.1 : Ajouter les entrées.** Dans `STATIC_PAGES`, ajouter `/activities` (weekly, 0.8, à côté de `/car-rental` ligne ~51). Près de la boucle `CAR_LOCATION_SLUGS` (ligne ~232), ajouter :

```typescript
for (const c of ACTIVITY_CATEGORIES) {
  push(`/activities/${c.slug}`, "monthly", 0.8);
  for (const city of ACTIVITY_CITIES) push(`/activities/${c.slug}/${city.slug}`, "monthly", 0.8);
}
```

(Imports depuis `@/lib/activity-taxonomy`. Le mécanisme hreflang 22 locales est déjà porté par `push`.)

- [ ] **Step 14.2 : Vérifier** : `curl -s localhost:3000/sitemap.xml | grep -c "activities"` — Expected : ≥ 19.
- [ ] **Step 14.3 : Commit** — `git commit -m "feat(activities): sitemap +19 entrées hreflang"`

---

### Task 15 : Admin cockpit + monitoring

**Files:**
- Create: `src/lib/activity-admin-auth.ts` — CLONE de `src/lib/car-admin-auth.ts`
- Create: `src/lib/activity-monitoring.ts` — CLONE de `src/lib/car-monitoring.ts`
- Create: `src/lib/activity-admin.ts` — CLONE de `src/lib/car-admin.ts`
- Create: `src/app/admin/activities/` (layout, page, auth/, actions.ts, kpi-band.tsx, requests-table.tsx, partners-table.tsx) — CLONE du dossier `src/app/admin/car-rental/`
- Test: `scripts/check-activity-monitoring.mjs` — CLONE de `scripts/check-car-monitoring.mjs`

- [ ] **Step 15.1 : Cloner `car-admin-auth.ts`.** Transformations : MÊME env `CAR_ADMIN_SECRET` (décision spec : un seul admin), cookie `activity_admin`, label HMAC `activity-admin-cookie-v1`, exports `ACTIVITY_ADMIN_COOKIE` / `isActivityAdmin`. Le commentaire de convention (« chaque page DOIT appeler isActivityAdmin() ») est conservé.

- [ ] **Step 15.2 : Cloner `car-monitoring.ts` + `car-admin.ts`.** Transformations : tables `activity_*`, types importés de `activity-quotes.ts`, `quoted_car_model`→`quoted_details`, champs demande (category/city/date/groupe) dans les projections. Les KPIs (requests 7j/30j, taux devis, taux choix, délai médian 1er devis, commissions dues/encaissées) et le calcul `commission_eur = final_amount_eur × commission du partenaire au jour de la saisie` sont identiques.

- [ ] **Step 15.3 : Cloner le test monitoring** (48 checks car → adapter les fixtures aux champs activity, même couverture), câbler `"check:activity-monitoring"`, run — Expected : PASS.

- [ ] **Step 15.4 : Cloner le dossier admin.** Transformations : imports activity, colonnes affichées (catégorie, ville, date, groupe au lieu de pickup/dates/car_type), filtres identiques (silent/awaiting/declined), édition outcome/final_amount/commission_paid identique. Zéro `use client` (vérifier : `grep -r "use client" src/app/admin/activities/` → vide).

- [ ] **Step 15.5 : Vérifier en dev** : `/admin/activities?key=<CAR_ADMIN_SECRET local>` → redirect auth → cockpit vide (0 requests). Sans clé → refus.
- [ ] **Step 15.6 : Commit** — `git commit -m "feat(activities): admin cockpit server-first + monitoring + tests"`

---

### Task 16 : QA bout en bout + déploiement

- [ ] **Step 16.1 : Seed un partenaire de test sur le VPS**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"insert into activity_partners (name, email, category_slug, cities, languages) values ('QA Test Partner', 'kairos.guest.management@gmail.com', 'food-tours', array['chania'], array['en','fr']) on conflict (email) do nothing;\""
```

- [ ] **Step 16.2 : Parcours complet en Preview.** Push la branche (`git push -u origin feat/activities-vertical`) → Vercel Preview. ⚠️ `SUPABASE_SERVICE_KEY` n'existe qu'en scope Production : si le Preview ne peut pas écrire en base, exécuter le parcours en Production APRÈS le deploy (Step 16.5) avec le même partenaire QA, puis nettoyer. Parcours : submit food-tours/chania → email reçu sur kairos.guest.management@gmail.com → ouvrir `/activity-quote/<token>` → deviser 120 EUR → email client « new offer » → `/activity-offer/<token>` → accepter → emails de mise en relation croisés → vérifier en admin : request `accepted`, snapshot complet, saisir outcome `done` 120 € → commission 12 € due.
- [ ] **Step 16.3 : Relances.** Déclencher à la main les 2 crons (`curl -H "Authorization: Bearer $CRON_SECRET" <url>/api/cron/activity-relance` et `activity-no-quote`) — Expected : `{ok:true, …}` et aucune relance intempestive sur la request acceptée.
- [ ] **Step 16.4 : Suite de tests complète** : `npm run check:activity-taxonomy && npm run check:activity-lead && npm run check:activity-quotes && npm run check:activity-monitoring && npx tsc --noEmit && npm run build` — Expected : tout PASS.
- [ ] **Step 16.5 : Déploiement production, convention repo** (jamais branche→main direct) :

```bash
git checkout master && git pull --ff-only origin master
git merge --no-ff feat/activities-vertical -m "feat: verticale /activities (Activities Direct, clone car-rental)"
git push origin master
git push origin master:main   # main = Production sur Vercel (cretepulse)
```

- [ ] **Step 16.6 : Vérifier le prod LIVE** (règle feedback_verify_prod_deploy_live) : `curl -A "Mozilla/5.0" -s https://crete.direct/en/activities | grep -o "<h1[^>]*>[^<]*"` — Expected : le H1 de la page. Nettoyer les données QA (request de test : `update activity_requests set admin_note='QA test' …` ou delete via psql).
- [ ] **Step 16.7 : Mémoire.** Créer `memory/project_crete_direct_activities.md` (fiche projet : statut, tables, routes, partenaire QA, reste à faire commercial Stelios) + ligne MEMORY.md + ligne session_log.md + MAJ `project_crete_direct.md`.

---

## Hors plan (suite commerciale, owner Kami + moi)

Réponse à Stelios (Bonnie & Clyde) avec `/en/activities/food-tours/chania` LIVE comme preuve — brouillon déjà esquissé en session 08/07, à reprendre après le deploy.
