# Catalogue d'exemples d'activités — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher sur les 3 niveaux de pages /activities des exemples réels d'activités (scrapés, anonymisés, fourchette de prix) qui pré-remplissent le wizard, pour lever la friction de conversion.

**Architecture:** Table Supabase `activity_catalog_items` (sources internes jamais exposées) + lib pure `activity-catalog.ts` (localisation/sélection, testable Node) + lib I/O `activity-catalog-db.ts` (colonnes explicites sans source_*) + composant serveur `ActivityCatalogSection` + seed script idempotent depuis `data/activity-catalog-seed.json`. Cartes = liens `.../{category}/{city}#wizard` (le wizard y est pré-rempli via props existantes).

**Tech Stack:** Next.js App Router (ISR 3600 déjà en place), Supabase service_role (VPS cretepulse-postgres), scripts `node --experimental-strip-types`, contenu 22 locales.

**Spec:** `docs/superpowers/specs/2026-07-09-activities-catalog-design.md`

**Branche:** `feat/activities-catalog` (déjà créée depuis master à jour). Git author kerjeanfrancois29. `git add` explicite fichier par fichier, JAMAIS `-A`.

---

### Task 1: Migration SQL `activity_catalog_items`

**Files:**
- Create: `supabase/migrations/20260710_activity_catalog.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Catalogue d'exemples d'activités affichés sur /activities (spec 2026-07-09).
-- Items réels scrapés de prestataires ciblés, ANONYMISÉS côté front :
-- source_url/source_name sont internes (prospection + règle anti-invention)
-- et ne doivent JAMAIS être SELECT par la lib de lecture front.
-- Mêmes conventions que 20260709_activities_multi_quote.sql :
-- service_role only, grants explicites, notify pgrst.

create table if not exists public.activity_catalog_items (
  id             bigint generated always as identity primary key,
  category       text not null references public.activity_categories(slug),
  city           text not null,              -- chania|rethymno|heraklion|agios-nikolaos|ierapetra
  title          text not null,              -- EN, reformulé (jamais copié verbatim du site source)
  summary        text not null,              -- EN, 1-2 phrases, reformulé
  duration_label text,                       -- forme numérique universelle uniquement : '~3h', '6-7h'
  price_from_eur integer,                    -- prix public constaté arrondi ; NULL = pas de prix affiché
  price_seen_at  date,                       -- date de constat du prix public (règle source datée)
  translations   jsonb not null default '{}'::jsonb, -- { fr: {title, summary}, de: {...}, ... } 21 locales
  source_url     text not null,              -- INTERNE uniquement, jamais renvoyé au front
  source_name    text not null,              -- INTERNE uniquement
  partner_id     bigint references public.activity_partners(id), -- lié à la signature du prestataire
  active         boolean not null default true,
  display_order  integer not null default 0, -- tri au sein d'un combo
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (source_url, title)                 -- clé d'upsert idempotent du seed
);
create index if not exists activity_catalog_combo_idx
  on public.activity_catalog_items (category, city, active);

revoke all on public.activity_catalog_items from anon, authenticated;
grant select, insert, update on public.activity_catalog_items to service_role;
grant usage, select on sequence public.activity_catalog_items_id_seq to service_role;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Appliquer sur le VPS (stdin psql, comme les migrations activités précédentes)**

Run (Bash tool, pas PowerShell) :
```bash
ssh kairos-vps "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse" < supabase/migrations/20260710_activity_catalog.sql
```
Expected: `CREATE TABLE`, `CREATE INDEX`, `REVOKE`, `GRANT` ×2, `NOTIFY` — 0 ERROR.

- [ ] **Step 3: Vérifier la table**

Run :
```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"select column_name from information_schema.columns where table_name='activity_catalog_items' order by ordinal_position;\""
```
Expected: 16 lignes (id ... updated_at).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260710_activity_catalog.sql
git commit -m "feat(activities): migration table activity_catalog_items (catalogue exemples, sources internes)"
```

---

### Task 2: Lib pure `activity-catalog.ts` (TDD)

**Files:**
- Create: `src/lib/activity-catalog.ts`
- Create: `scripts/check-activity-catalog.mjs`
- Modify: `package.json` (script npm `check:activity-catalog`)

- [ ] **Step 1: Écrire le check script AVANT la lib (il doit FAIL d'abord)**

`scripts/check-activity-catalog.mjs` :
```js
// node --experimental-strip-types scripts/check-activity-catalog.mjs
// Tests de la logique pure du catalogue + gardes anti-exposition et seed JSON.
import { readFileSync, existsSync } from "node:fs";
import {
  localizeItem,
  sortCatalogRows,
  pickHighlights,
  mixByCity,
} from "../src/lib/activity-catalog.ts";
import { isCategorySlug, isCitySlug } from "../src/lib/activity-taxonomy.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

const row = (over = {}) => ({
  id: 1, category: "food-tours", city: "chania",
  title: "Old town food walk", summary: "Tastings across the market.",
  duration_label: "~3h", price_from_eur: 45,
  translations: { fr: { title: "Balade gourmande", summary: "Dégustations au marché." } },
  display_order: 0, ...over,
});

// localizeItem
const fr = localizeItem(row(), "fr");
ok("localizeItem fr : title traduit", fr.title === "Balade gourmande");
ok("localizeItem fr : summary traduit", fr.summary === "Dégustations au marché.");
const pt = localizeItem(row(), "pt");
ok("localizeItem locale absente : fallback EN", pt.title === "Old town food walk");
const partial = localizeItem(row({ translations: { fr: { title: "Titre seul" } } }), "fr");
ok("localizeItem traduction partielle : summary retombe EN", partial.summary === "Tastings across the market.");
ok("localizeItem ne renvoie pas translations", !("translations" in fr));

// sortCatalogRows : display_order puis id
const sorted = sortCatalogRows([row({ id: 2, display_order: 1 }), row({ id: 3 }), row({ id: 1 })]);
ok("sortCatalogRows : display_order asc puis id asc", sorted.map((r) => r.id).join(",") === "1,3,2");

// pickHighlights : round-robin sur les catégories
const rows6 = [
  row({ id: 1 }), row({ id: 2 }),
  row({ id: 3, category: "boat-trips" }), row({ id: 4, category: "boat-trips" }),
  row({ id: 5, category: "hiking" }), row({ id: 6, category: "hiking" }),
];
const hl = pickHighlights(rows6, 6);
ok("pickHighlights limit 6 : 6 items", hl.length === 6);
ok("pickHighlights : 3 catégories représentées dans les 3 premiers",
  new Set(hl.slice(0, 3).map((r) => r.category)).size === 3);
ok("pickHighlights limit 2 : 2 items de 2 catégories différentes",
  new Set(pickHighlights(rows6, 2).map((r) => r.category)).size === 2);

// mixByCity : au plus N par ville
const rowsCities = [
  row({ id: 1 }), row({ id: 2 }), row({ id: 3 }),
  row({ id: 4, city: "rethymno" }), row({ id: 5, city: "rethymno" }),
];
const mix = mixByCity(rowsCities, 2);
ok("mixByCity cap 2/ville", mix.filter((r) => r.city === "chania").length === 2);
ok("mixByCity garde les autres villes", mix.filter((r) => r.city === "rethymno").length === 2);

// Garde anti-exposition : la lib db ne SELECT jamais source_url/source_name
const dbSrc = readFileSync("src/lib/activity-catalog-db.ts", "utf8");
ok("activity-catalog-db.ts ne mentionne pas source_url", !dbSrc.includes("source_url"));
ok("activity-catalog-db.ts ne mentionne pas source_name", !dbSrc.includes("source_name"));
ok("activity-catalog-db.ts sans select *", !/select\(\s*["'`]\s*\*/.test(dbSrc));

// Garde seed JSON (si présent) : slugs valides, champs requis, pas de contact
if (existsSync("data/activity-catalog-seed.json")) {
  const seed = JSON.parse(readFileSync("data/activity-catalog-seed.json", "utf8"));
  ok("seed : tableau non vide", Array.isArray(seed) && seed.length > 0);
  ok("seed : slugs catégorie valides", seed.every((i) => isCategorySlug(i.category)));
  ok("seed : slugs ville valides", seed.every((i) => isCitySlug(i.city)));
  ok("seed : title+summary+source_url+source_name présents",
    seed.every((i) => i.title && i.summary && i.source_url && i.source_name));
  ok("seed : prix entier > 0 ou null",
    seed.every((i) => i.price_from_eur === null || (Number.isInteger(i.price_from_eur) && i.price_from_eur > 0)));
  ok("seed : prix daté si présent", seed.every((i) => i.price_from_eur === null || !!i.price_seen_at));
  ok("seed : aucun champ contact (prospection = fichier séparé non versionné)",
    seed.every((i) => !("contact" in i) && !("email" in i) && !("phone" in i)));
  ok("seed : duration_label numérique sans mots",
    seed.every((i) => i.duration_label == null || /^[~0-9hHmin\-\s.]+$/.test(i.duration_label)));
} else {
  console.log("skip - data/activity-catalog-seed.json absent (Task 7)");
}

console.log(fail ? `\n${fail} FAIL` : "\nAll passed");
process.exit(fail ? 1 : 0);
```

Ajouter dans `package.json` (bloc scripts, à côté de `check:activity-taxonomy`) :
```json
"check:activity-catalog": "node --experimental-strip-types scripts/check-activity-catalog.mjs",
```

- [ ] **Step 2: Vérifier que ça FAIL**

Run: `npm run check:activity-catalog`
Expected: FAIL / ERR_MODULE_NOT_FOUND (activity-catalog.ts n'existe pas encore).

- [ ] **Step 3: Implémenter `src/lib/activity-catalog.ts`**

```ts
// Logique pure du catalogue d'exemples d'activités (spec 2026-07-09).
// Node-safe (importable par check-activity-catalog.mjs), zéro I/O.
// La lecture Supabase vit dans activity-catalog-db.ts ; ici : localisation
// (fallback en), tri et sélections pour les 3 niveaux de pages.

/** Item localisé, prêt à afficher. Jamais de source_url/source_name ici. */
export interface CatalogItem {
  id: number;
  category: string;
  city: string;
  title: string;
  summary: string;
  duration_label: string | null;
  price_from_eur: number | null;
}

/** Row brute renvoyée par la db (title/summary = EN source). */
export interface CatalogRow extends CatalogItem {
  translations: Record<string, { title?: string; summary?: string }>;
  display_order: number;
}

/** Applique la traduction de la locale (champ par champ, fallback EN). */
export function localizeItem(row: CatalogRow, locale: string): CatalogItem {
  const tr = row.translations?.[locale];
  return {
    id: row.id,
    category: row.category,
    city: row.city,
    title: tr?.title || row.title,
    summary: tr?.summary || row.summary,
    duration_label: row.duration_label,
    price_from_eur: row.price_from_eur,
  };
}

/** Tri stable : display_order asc puis id asc. */
export function sortCatalogRows(rows: CatalogRow[]): CatalogRow[] {
  return [...rows].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
}

/** Vitrine page mère : round-robin sur les catégories pour représenter chacune. */
export function pickHighlights(rows: CatalogRow[], limit: number): CatalogRow[] {
  const sorted = sortCatalogRows(rows);
  const byCat = new Map<string, CatalogRow[]>();
  for (const r of sorted) {
    const list = byCat.get(r.category) ?? [];
    list.push(r);
    byCat.set(r.category, list);
  }
  const queues = [...byCat.values()];
  const out: CatalogRow[] = [];
  let idx = 0;
  while (out.length < limit && queues.some((q) => q.length)) {
    const q = queues[idx % queues.length];
    const item = q.shift();
    if (item) out.push(item);
    idx++;
  }
  return out;
}

/** Page catégorie : au plus `perCity` items par ville (ordre trié). */
export function mixByCity(rows: CatalogRow[], perCity: number): CatalogRow[] {
  const sorted = sortCatalogRows(rows);
  const count = new Map<string, number>();
  const out: CatalogRow[] = [];
  for (const r of sorted) {
    const n = count.get(r.city) ?? 0;
    if (n < perCity) { out.push(r); count.set(r.city, n + 1); }
  }
  return out;
}
```

- [ ] **Step 4: Créer un `activity-catalog-db.ts` minimal pour que la garde du check passe** (le vrai contenu = Task 3, mais le check lit le fichier ; créer le fichier vide avec le commentaire d'en-tête suffit à ce stade — voir Task 3 Step 1 pour le contenu complet ; si Task 3 est exécutée dans la foulée, écrire directement le contenu complet de Task 3 ici et sauter Task 3 Step 1)

- [ ] **Step 5: Vérifier que ça PASSE**

Run: `npm run check:activity-catalog`
Expected: `All passed` (les checks seed affichent `skip`).

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 6: Commit**

```bash
git add src/lib/activity-catalog.ts src/lib/activity-catalog-db.ts scripts/check-activity-catalog.mjs package.json
git commit -m "feat(activities): lib pure catalogue (localisation, tri, sélections) + check script"
```

---

### Task 3: Lib I/O `activity-catalog-db.ts`

**Files:**
- Create/Modify: `src/lib/activity-catalog-db.ts`

- [ ] **Step 1: Implémenter la lib (colonnes explicites, jamais les colonnes sources)**

```ts
// Accès lecture au catalogue d'exemples d'activités (table activity_catalog_items).
// Server-only (supabase admin), consommé par les pages ISR /activities.
// RÈGLE ANTI-EXPOSITION : les colonnes internes de provenance ne sont JAMAIS
// sélectionnées ici (COLS explicite, pas d'étoile) ; check-activity-catalog.mjs
// vérifie ce fichier en texte. Pattern identique à activity-partners-db.ts.
import { supabaseAdmin as supabase } from "./supabase-admin";
import type { CatalogRow } from "./activity-catalog";

const COLS = "id, category, city, title, summary, duration_label, price_from_eur, translations, display_order";

/** Items actifs d'un combo catégorie × ville. */
export async function catalogRowsFor(categorySlug: string, city: string): Promise<CatalogRow[]> {
  try {
    const { data, error } = await supabase.from("activity_catalog_items")
      .select(COLS).eq("active", true).eq("category", categorySlug).eq("city", city);
    if (error) { console.error("[activity-catalog-db] catalogRowsFor:", error.message); return []; }
    return (data ?? []) as unknown as CatalogRow[];
  } catch (e) {
    console.error("[activity-catalog-db] catalogRowsFor (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Items actifs d'une catégorie (toutes villes). */
export async function catalogRowsForCategory(categorySlug: string): Promise<CatalogRow[]> {
  try {
    const { data, error } = await supabase.from("activity_catalog_items")
      .select(COLS).eq("active", true).eq("category", categorySlug);
    if (error) { console.error("[activity-catalog-db] catalogRowsForCategory:", error.message); return []; }
    return (data ?? []) as unknown as CatalogRow[];
  } catch (e) {
    console.error("[activity-catalog-db] catalogRowsForCategory (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Tous les items actifs (vitrine page mère). */
export async function allCatalogRows(): Promise<CatalogRow[]> {
  try {
    const { data, error } = await supabase.from("activity_catalog_items")
      .select(COLS).eq("active", true);
    if (error) { console.error("[activity-catalog-db] allCatalogRows:", error.message); return []; }
    return (data ?? []) as unknown as CatalogRow[];
  } catch (e) {
    console.error("[activity-catalog-db] allCatalogRows (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}
```

- [ ] **Step 2: Vérifier**

Run: `npm run check:activity-catalog` → `All passed`.
Run: `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/activity-catalog-db.ts
git commit -m "feat(activities): lib lecture catalogue (colonnes explicites, sources jamais exposées)"
```

---

### Task 4: Strings 22 locales dans `content.ts`

**Files:**
- Modify: `src/app/[locale]/activities/content.ts`

- [ ] **Step 1: Étendre le type `ActivityPageStrings`**

Ajouter 4 clés à la fin du type existant (ligne ~18) :
```ts
  catalogTitle: string;    // « Exemples d'activités »
  catalogNote: string;     // mention honnête sous la section
  catalogFrom: string;     // template « à partir de ~{price}€/pers » ({price} obligatoire)
  catalogCta: string;      // « Demander un devis » (libellé au pied de carte)
```

- [ ] **Step 2: Renseigner les 4 locales source (en/fr/de/el), voix crete.direct (honnête, concret, zéro superlatif, zéro em dash)**

```ts
// en
catalogTitle: "Example activities",
catalogNote: "Real activities offered in the area, shown as examples. The exact price and availability come from the providers' quotes for your group.",
catalogFrom: "from ~{price}€ / person",
catalogCta: "Request a quote",
// fr
catalogTitle: "Exemples d'activités",
catalogNote: "Activités réellement proposées dans la région, montrées à titre d'exemple. Le prix exact et la disponibilité viennent des devis des prestataires pour votre groupe.",
catalogFrom: "à partir de ~{price}€ / pers",
catalogCta: "Demander un devis",
// de
catalogTitle: "Beispiel-Aktivitäten",
catalogNote: "Aktivitäten, die in der Region tatsächlich angeboten werden, als Beispiele gezeigt. Der genaue Preis und die Verfügbarkeit kommen aus den Angeboten der Anbieter für Ihre Gruppe.",
catalogFrom: "ab ~{price}€ / Person",
catalogCta: "Angebot anfordern",
// el
catalogTitle: "Παραδείγματα δραστηριοτήτων",
catalogNote: "Δραστηριότητες που πραγματικά προσφέρονται στην περιοχή, ως παραδείγματα. Η ακριβής τιμή και η διαθεσιμότητα προκύπτουν από τις προσφορές των παρόχων για την παρέα σας.",
catalogFrom: "από ~{price}€ / άτομο",
catalogCta: "Ζητήστε προσφορά",
```

- [ ] **Step 3: Renseigner les 18 autres locales (it/nl/pl/es/pt/ru/ja/ko/zh/tr/sv/da/no/fi/cs/hu/ro/ar)**

Même exigence que la task 12b de la verticale : traductions natives soignées des 4 clés, scripts natifs corrects (cyrillique/kana/hangul/CJK/arabe/diacritiques), placeholder `{price}` intact dans chaque `catalogFrom`, zéro em dash. Traduire depuis la version EN ci-dessus.

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit` → 0 erreur (le type impose les 4 clés sur les 22 locales : toute locale oubliée casse tsc).
Vérif rapide : `grep -c "catalogFrom" src/app/[locale]/activities/content.ts` → 22.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/activities/content.ts"
git commit -m "feat(activities): strings catalogue 22 locales (titre, note honnête, template prix, CTA)"
```

---

### Task 5: Composant `ActivityCatalogSection`

**Files:**
- Create: `src/components/activities/ActivityCatalogSection.tsx`

- [ ] **Step 1: Implémenter (server component, zéro use client)**

```tsx
// Section « Exemples d'activités » des pages /activities (spec 2026-07-09).
// Server component : reçoit des items DÉJÀ localisés (localizeItem côté page).
// Chaque carte est un lien vers la page combo + ancre #wizard : le catalogue
// nourrit le wizard (conversion), il ne crée aucune sortie externe.
// Aucun nom de prestataire ni lien source ici (anonymisation, commission 15%).
import Link from "next/link";
import type { CatalogItem } from "@/lib/activity-catalog";
import { cityLabel } from "@/lib/activity-taxonomy";

export type ActivityCatalogSectionProps = {
  locale: string;
  items: CatalogItem[];
  title: string;
  note: string;
  fromTpl: string;        // « from ~{price}€ / person »
  cta: string;
  showCity?: boolean;     // pages mère + catégorie : afficher la ville sur la carte
  /** Combo de la page courante : ses items pointent sur #wizard (même page). */
  currentCombo?: { category: string; city: string };
};

export function ActivityCatalogSection({
  locale, items, title, note, fromTpl, cta, showCity, currentCombo,
}: ActivityCatalogSectionProps) {
  if (items.length === 0) return null;

  const hrefFor = (it: CatalogItem) =>
    currentCombo && it.category === currentCombo.category && it.city === currentCombo.city
      ? "#wizard"
      : `/${locale}/activities/${it.category}/${it.city}#wizard`;

  return (
    <section className="mt-12">
      <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Link
            key={it.id}
            href={hrefFor(it)}
            className="card-base flex flex-col gap-2 p-5 no-underline transition-transform hover:-translate-y-0.5"
          >
            <span className="font-heading text-[16px] font-bold text-text leading-snug">
              {it.title}
            </span>
            <span className="text-[13.5px] text-text-muted leading-relaxed">
              {it.summary}
            </span>
            <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[12.5px] font-semibold text-text-muted">
              {showCity && <span>{cityLabel(it.city, locale)}</span>}
              {it.duration_label && <span>{it.duration_label}</span>}
              {it.price_from_eur != null && (
                <span className="text-text">
                  {fromTpl.replace("{price}", String(it.price_from_eur))}
                </span>
              )}
              <span className="ml-auto shrink-0 rounded-full bg-sun px-3 py-1 text-[12px] font-bold text-text">
                {cta}
              </span>
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-text-muted leading-relaxed">{note}</p>
    </section>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit` → 0 erreur. Vérifier l'absence de `"use client"` dans le fichier.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivityCatalogSection.tsx
git commit -m "feat(activities): composant section catalogue (cartes anonymisées vers #wizard)"
```

---

### Task 6: Intégration dans les 3 pages + ancre `#wizard`

**Files:**
- Modify: `src/app/[locale]/activities/page.tsx`
- Modify: `src/app/[locale]/activities/[category]/page.tsx`
- Modify: `src/app/[locale]/activities/[category]/[city]/page.tsx`

- [ ] **Step 1: Page mère — vitrine 6 items**

Dans `page.tsx` : ajouter les imports
```ts
import { ActivityCatalogSection } from "@/components/activities/ActivityCatalogSection";
import { allCatalogRows } from "@/lib/activity-catalog-db";
import { localizeItem, pickHighlights } from "@/lib/activity-catalog";
```
Dans le composant, après `const combos = await servedCombos();` :
```ts
const catalogItems = pickHighlights(await allCatalogRows(), 6).map((r) => localizeItem(r, locale));
```
Envelopper le wizard existant avec l'ancre (remplace le `<Suspense>` nu) :
```tsx
<div id="wizard" className="scroll-mt-6">
  <Suspense fallback={null}>
    <ActivityWizard locale={locale} servedCombos={combos} />
  </Suspense>
</div>
```
Insérer la section catalogue ENTRE le wizard et la section « Cartes catégories » :
```tsx
<ActivityCatalogSection
  locale={locale}
  items={catalogItems}
  title={t.catalogTitle}
  note={t.catalogNote}
  fromTpl={t.catalogFrom}
  cta={t.catalogCta}
  showCity
/>
```

- [ ] **Step 2: Page catégorie — mix des villes (cap 2/ville, ~8 max)**

Dans `[category]/page.tsx` : mêmes imports, mais `catalogRowsForCategory` et `mixByCity` :
```ts
import { ActivityCatalogSection } from "@/components/activities/ActivityCatalogSection";
import { catalogRowsForCategory } from "@/lib/activity-catalog-db";
import { localizeItem, mixByCity } from "@/lib/activity-catalog";
```
```ts
const catalogItems = mixByCity(await catalogRowsForCategory(category), 2).map((r) => localizeItem(r, locale));
```
Même enveloppe `<div id="wizard" className="scroll-mt-6">` autour du Suspense wizard. Section insérée ENTRE le wizard et « Liens vers les 5 hubs villes », avec `showCity`.

- [ ] **Step 3: Page combo — items du combo, liens `#wizard` même page**

Dans `[category]/[city]/page.tsx` :
```ts
import { ActivityCatalogSection } from "@/components/activities/ActivityCatalogSection";
import { catalogRowsFor } from "@/lib/activity-catalog-db";
import { localizeItem, sortCatalogRows } from "@/lib/activity-catalog";
```
```ts
const catalogItems = sortCatalogRows(await catalogRowsFor(category, city)).slice(0, 4).map((r) => localizeItem(r, locale));
```
Même enveloppe ancre. Section insérée ENTRE le wizard et « Comment ça marche » :
```tsx
<ActivityCatalogSection
  locale={locale}
  items={catalogItems}
  title={t.catalogTitle}
  note={t.catalogNote}
  fromTpl={t.catalogFrom}
  cta={t.catalogCta}
  currentCombo={{ category, city }}
/>
```
(pas de `showCity` : la ville est celle de la page). Combo sans items → `items.length === 0` → le composant rend `null`, section invisible.

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit` → 0 erreur.
Run: `npm run build` → build OK (la table vide/inaccessible en local → libs renvoient [] → sections masquées, aucune casse, pattern build-safe supabase-admin).

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/activities/page.tsx" "src/app/[locale]/activities/[category]/page.tsx" "src/app/[locale]/activities/[category]/[city]/page.tsx"
git commit -m "feat(activities): section catalogue sur les 3 niveaux de pages + ancre #wizard"
```

---

### Task 7: Sourcing des activités réelles → `data/activity-catalog-seed.json`

**Files:**
- Create: `data/activity-catalog-seed.json` (versionné, SANS contacts)
- Create: `data/activity-catalog-prospects.local.json` (NON versionné : contacts prospection)
- Modify: `.gitignore` (ajouter `data/activity-catalog-prospects.local.json`)

Tâche de collecte exécutée par Claude (WebFetch/Playwright), pas du code. Critères stricts :

- [ ] **Step 1: Sourcer les prestataires réels par combo**

Pour chacun des 15 combos (food-tours/boat-trips/hiking × chania/rethymno/heraklion/agios-nikolaos/ierapetra), trouver 1-3 prestataires locaux réels avec site public listant leurs activités. Point de départ obligatoire : Bonnie & Clyde Urban Tours (food-tours chania, site public). Sources = sites officiels des prestataires (PAS les fiches GetYourGuide/Viator, qui sont des OTA — remonter au site du prestataire).

- [ ] **Step 2: Extraire 2-4 activités par combo, reformulées**

Format d'un item du JSON (tableau plat) :
```json
{
  "category": "food-tours",
  "city": "chania",
  "title": "Old town market food walk",
  "summary": "A guided walk through the market and back streets with local tastings along the way.",
  "duration_label": "~3h",
  "price_from_eur": 45,
  "price_seen_at": "2026-07-09",
  "source_url": "https://exemple-prestataire.gr/tours/food-walk",
  "source_name": "Nom Prestataire",
  "display_order": 0,
  "translations": {}
}
```
Règles NON NÉGOCIABLES :
- `title`/`summary` REFORMULÉS en anglais (jamais de copie verbatim du site source) et ANONYMES (aucun nom de marque/prestataire dedans).
- `price_from_eur` = prix public réellement constaté, arrondi à l'entier ; si introuvable → `null` et `price_seen_at` null.
- `duration_label` numérique uniquement (`~3h`, `6-7h`, `45min`), jamais de mots.
- Chaque item DOIT avoir `source_url` réelle et fonctionnelle (règle anti-invention : zéro item sans URL source).
- Aucune donnée de contact dans ce fichier.
- Cible : 30-50 items. Si un combo n'a pas de prestataire trouvable (probable pour certains combos ierapetra/rethymno) : le laisser vide plutôt qu'inventer, le noter dans le récap final.

- [ ] **Step 3: Contacts de prospection dans le fichier séparé NON versionné**

`data/activity-catalog-prospects.local.json` : `[{ "source_name": ..., "source_url": ..., "email": ..., "phone": ..., "combo": ..., "notes": ... }]` — double usage prospection pour Kami. Ajouter la ligne `data/activity-catalog-prospects.local.json` dans `.gitignore`.

- [ ] **Step 4: Valider**

Run: `npm run check:activity-catalog`
Expected: `All passed` — les gardes seed (slugs, champs, prix datés, zéro contact) passent.

- [ ] **Step 5: Commit**

```bash
git add data/activity-catalog-seed.json .gitignore
git commit -m "feat(activities): seed catalogue — activités réelles sourcées, anonymisées, prix datés"
```

---

### Task 8: Traductions 21 locales des items

**Files:**
- Modify: `data/activity-catalog-seed.json` (remplir `translations`)

- [ ] **Step 1: Générer les traductions**

Pour chaque item, remplir `translations` avec les 21 locales hors EN (fr, de, el, it, nl, pl, es, pt, ru, ja, ko, zh, tr, sv, da, no, fi, cs, hu, ro, ar) : `{ "fr": { "title": ..., "summary": ... }, ... }`. Génération par Claude, locale par locale (batch par langue, pas par item, pour la cohérence terminologique). Exigences : orthographe irréprochable, scripts natifs corrects, zéro em dash, ton crete.direct.

- [ ] **Step 2: Vérifier la complétude**

Run :
```bash
node -e "const s=require('./data/activity-catalog-seed.json');const L=['fr','de','el','it','nl','pl','es','pt','ru','ja','ko','zh','tr','sv','da','no','fi','cs','hu','ro','ar'];const bad=s.filter(i=>L.some(l=>!i.translations[l]?.title||!i.translations[l]?.summary));console.log(bad.length?'INCOMPLET '+bad.length:'OK 21 locales x '+s.length+' items');process.exit(bad.length?1:0)"
```
Expected: `OK 21 locales x N items`.

Run: `npm run check:activity-catalog` → `All passed`.

- [ ] **Step 3: Commit**

```bash
git add data/activity-catalog-seed.json
git commit -m "feat(activities): traductions 21 locales des items du catalogue"
```

---

### Task 9: Script de seed + insertion prod

**Files:**
- Create: `scripts/seed-activity-catalog.mjs`
- Modify: `package.json` (script npm `seed:activity-catalog`)

- [ ] **Step 1: Écrire le script (upsert idempotent sur (source_url, title))**

```js
// scripts/seed-activity-catalog.mjs
// Seed/MAJ du catalogue d'exemples d'activités depuis data/activity-catalog-seed.json.
// Idempotent : upsert sur (source_url, title). Re-runnable après MAJ du JSON.
// Run: node scripts/seed-activity-catalog.mjs   (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY requis)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import "dotenv/config";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const items = JSON.parse(readFileSync("data/activity-catalog-seed.json", "utf8"));
const rows = items.map((i) => ({
  category: i.category,
  city: i.city,
  title: i.title,
  summary: i.summary,
  duration_label: i.duration_label ?? null,
  price_from_eur: i.price_from_eur ?? null,
  price_seen_at: i.price_seen_at ?? null,
  translations: i.translations ?? {},
  source_url: i.source_url,
  source_name: i.source_name,
  display_order: i.display_order ?? 0,
  updated_at: new Date().toISOString(),
}));

const { error } = await sb.from("activity_catalog_items")
  .upsert(rows, { onConflict: "source_url,title" });
if (error) { console.error("[seed-activity-catalog] ERROR", error); process.exit(1); }
console.log(`[seed-activity-catalog] upserted ${rows.length} items`);
```

Ajouter dans `package.json` : `"seed:activity-catalog": "node scripts/seed-activity-catalog.mjs",`

- [ ] **Step 2: Lancer le seed (clés service dans l'environnement — cf. .env.local / VPS, ne jamais les logger)**

Run: `npm run seed:activity-catalog`
Expected: `[seed-activity-catalog] upserted N items`.

- [ ] **Step 3: Vérifier en base**

Run :
```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"select category, city, count(*) from activity_catalog_items where active group by 1,2 order by 1,2;\""
```
Expected: les combos couverts avec leurs comptes ; total = N du seed.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-activity-catalog.mjs package.json
git commit -m "feat(activities): script seed catalogue idempotent + insertion prod"
```

---

### Task 10: Mockup, QA visuelle, preview, validation Kami

- [ ] **Step 1: Mockup local AVANT push (règle feedback_mockup_avant_deploy)**

Run: `npm run dev` puis capture Playwright de `http://localhost:3000/en/activities` et `http://localhost:3000/en/activities/food-tours/chania` (section catalogue visible). Ouvrir les captures à l'écran (`Start-Process <fichier>.png`, règle feedback_ouvrir_visuels).

- [ ] **Step 2: Vert avant push**

Run: `npx tsc --noEmit` → 0 erreur. `npm run build` → OK. `npm run check:activity-catalog` + les 4 `check:activity-*` existants → tous PASS.

- [ ] **Step 3: Push branche → preview Vercel**

```bash
git push -u origin feat/activities-catalog
```
Récupérer l'URL preview Vercel, l'ouvrir dans le navigateur (règle feedback_open_preview_urls), vérifier : cartes affichées, clic carte page mère → page combo wizard pré-rempli, clic carte page combo → scroll #wizard, combos vides → section absente, 2-3 locales échantillon (fr, el, ja).

- [ ] **Step 4: Validation Kami sur la preview — GATE avant prod**

Ne pas merger sans son retour visuel.

- [ ] **Step 5 (post-validation): Merge prod**

```bash
git checkout master && git pull --ff-only origin master
git merge --no-ff feat/activities-catalog -m "feat(activities): catalogue exemples d'activités (scraping anonymisé, fourchettes prix)"
git push origin master
git push origin master:main
```
Vérifier le déploiement Vercel LIVE (curl avec User-Agent, règle feedback_vercel_curl_user_agent) puis MAJ mémoire (project_crete_direct_activities.md + session_log + MEMORY.md index sync).

---

## Self-review du plan (fait à l'écriture)

- Spec coverage : table+index+grants (T1), lib pure+db anti-exposition (T2-T3), strings 22 locales (T4), composant+3 pages+ancre (T5-T6), sourcing anonymisé prix datés (T7), traductions (T8), seed idempotent (T9), mockup/preview/gate Kami (T10). Hors périmètre spec (cron, photos, UI partenaires nommés) : absent du plan, conforme.
- Placeholders : aucun TBD ; T7/T8 sont des tâches de contenu avec critères mesurables et gardes automatisées (check script).
- Cohérence types : `CatalogRow`/`CatalogItem` définis T2, consommés T3/T5/T6 avec les mêmes noms ; `catalogRowsFor/catalogRowsForCategory/allCatalogRows` identiques T3/T6 ; clés content `catalogTitle/catalogNote/catalogFrom/catalogCta` identiques T4/T6.
