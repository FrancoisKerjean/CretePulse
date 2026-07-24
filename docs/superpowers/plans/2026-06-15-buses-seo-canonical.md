# SEO Bus — Indexation + On-page (Phase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer les ~40 pages-trajet bus DIGNES de « Discovered – not indexed » à indexées + pousser le striking-distance on-page, sans toucher au refactor `bus-pairs.ts` en cours.

**Architecture:** Tous les helpers SEO nouveaux vivent dans un fichier neuf `src/lib/bus-seo.ts` (importe `bus-pairs.ts`, ne le modifie pas → zéro collision avec `feat/bus-network`). La « qualité » d'une paire = au moins un sens avec `departures` publiés. Les pairs non-qualité sont retirées du sitemap ET passées en `noindex`. On-page : H1 keyword via i18n, purge des caractères flèche, ItemList avec URLs, metadata fi/nl, encart bus sur `compare`.

**Tech Stack:** Next.js 16 App Router, next-intl (22 locales), Supabase/PostgREST, TypeScript. Vérif repo : `node --experimental-strip-types scripts/check-*.ts` + `npx tsc --noEmit` + `npm run build` + curl/Playwright (via `crete-direct-instagram/node_modules`). PAS de vitest/jest dans ce repo.

**Scope:** Phase 1 = déployable et mesurable par Gate A (indexation). Les redirects 301 `getting-around` (spec §4.5) sont un **plan de suite** écrit APRÈS Gate A (cf §8 du spec : rediriger seulement une fois la cible indexée). Ce plan ne les contient pas.

**Coordination bus-network (pas un blocage) :** `feat/bus-network` (refactor `bus-pairs.ts`) est une branche LOCALE d'un autre terminal (PAS sur origin au 15/06). Ce plan ne MODIFIE PAS `bus-pairs.ts` (tout est dans `bus-seo.ts` neuf) → la seule collision possible = un renommage des helpers importés (`eligiblePairs`, `pairRoutes`, `pairSlug`, `slugifyPlace`), capté par `tsc`. Exécutable contre `origin/master` maintenant ; re-vérifier les imports (Task 0 Step 2) au moment où bus-network mergera.

**Spec source :** `docs/superpowers/specs/2026-06-15-buses-seo-canonical-design.md`

---

### Task 0: Worktree, coordination bus-network, baseline GSC

**Files:** aucun (setup).

- [ ] **Step 1: Noter l'état de `feat/bus-network` (coordination, pas un blocage)**

Run: `git -C C:\Users\fkerj\cretepulse-build branch -a | Select-String "bus-network"`
Note: bus-network est local sur un autre terminal (pas sur origin au 15/06). Ce plan ne touche PAS `bus-pairs.ts` (tout dans `bus-seo.ts` neuf) → on PROCÈDE contre `origin/master`. Quand bus-network mergera : re-lancer Step 2 (vérif imports) + `tsc` ; adapter `bus-seo.ts` seulement si un helper importé a été renommé.

- [ ] **Step 2: Re-vérifier les signatures référencées dans `bus-pairs.ts`**

Run: `node -e "const m=require('child_process'); " ; ouvrir `src/lib/bus-pairs.ts` et confirmer que ces exports existent toujours après le refactor : `eligiblePairs(routes): BusPair[]`, `pairRoutes(routes, slug): {pair, outbound, inbound} | null`, `pairSlug(a,b): string|null`, `slugifyPlace(place): string|null`, type `BusPair { slug, placeA, placeB }`.
Expected: tous présents. Si `BUS_PLACE_SLUGS` est devenu un import généré (refactor bus-network), c'est OK — on ne l'utilise pas directement. Si une signature a changé, adapter `bus-seo.ts` (Task 1) en conséquence.

- [ ] **Step 3: Créer le worktree isolé**

Run:
```powershell
git -C C:\Users\fkerj\cretepulse-build worktree add C:\Users\fkerj\cretepulse-seo feat/seo-buses origin/master
```
Puis jonction `node_modules` (pattern repo, idem autres worktrees) :
```powershell
cmd /c mklink /J C:\Users\fkerj\cretepulse-seo\node_modules C:\Users\fkerj\cretepulse-build\node_modules
```
Copier `.env.local` depuis le checkout principal (secret, ne pas committer).
Expected: worktree créé sur `feat/seo-buses`, `tsc` lance.

- [ ] **Step 4: Snapshot GSC baseline (Gate A point de départ)**

Run le pull GSC (credentials `~/.kairos-keys`) : URL Inspection sur 5 vrais slugs de pairs DIGNES (ex `agios-nikolaos-to-heraklion`, `heraklion-to-malia`, `chania-to-rethymno`, `agia-galini-to-heraklion`, `chania-to-kissamos`) + impressions des pages `/buses/<slug>` (28j).
Expected: documenter l'état (attendu : « Discovered – currently not indexed », 0 impression). C'est le point 0 de Gate A (§9 spec). Sauver dans `docs/superpowers/plans/2026-06-15-buses-seo-gate-a-baseline.txt`.

- [ ] **Step 5: Commit du marqueur de baseline**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add docs/superpowers/plans/2026-06-15-buses-seo-gate-a-baseline.txt
git -C C:\Users\fkerj\cretepulse-seo commit -m "chore(seo-buses): GSC baseline snapshot for Gate A"
```

---

### Task 1: `bus-seo.ts` — prédicat qualité + lastmod + mapping compare (pur, testé)

**Files:**
- Create: `src/lib/bus-seo.ts`
- Test: `scripts/check-bus-seo.ts`

- [ ] **Step 1: Écrire le check-script qui échoue (test d'abord)**

Create `scripts/check-bus-seo.ts`:
```ts
// Vérifie les helpers SEO purs. Run: node --experimental-strip-types scripts/check-bus-seo.ts
import { pairHasTimetable, qualityPairSlugs, pairLastmod, compareToPairSlug } from "../src/lib/bus-seo.ts";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { failed++; console.error(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
  else console.log(`ok   ${name}`);
}

const routes = [
  { from_place: "Heraklion", to_place: "Malia", departures: ["08:00", "09:30"], scraped_at: "2026-06-10T00:00:00Z" },
  { from_place: "Malia", to_place: "Heraklion", departures: [], scraped_at: "2026-06-12T00:00:00Z" },
  // paire sans aucun horaire (les 2 sens vides) = NON qualité
  { from_place: "Myrtos", to_place: "Ierapetra", departures: [], scraped_at: "2026-06-01T00:00:00Z" },
  { from_place: "Chania", to_place: "Rethymno", departures: ["07:00"], scraped_at: "2026-06-11T00:00:00Z" },
];

eq("pairHasTimetable heraklion-malia", pairHasTimetable(routes, "heraklion-to-malia"), true);
eq("pairHasTimetable myrtos-ierapetra (vide)", pairHasTimetable(routes, "ierapetra-to-myrtos"), false);
eq("qualityPairSlugs", qualityPairSlugs(routes), ["chania-to-rethymno", "heraklion-to-malia"]);
eq("pairLastmod = max scraped_at de la paire", pairLastmod(routes, "heraklion-to-malia"), "2026-06-12T00:00:00Z");
eq("compareToPairSlug existe", compareToPairSlug(routes, "Heraklion", "Malia"), "heraklion-to-malia");
eq("compareToPairSlug paire inexistante", compareToPairSlug(routes, "Heraklion", "Sitia"), null);
eq("compareToPairSlug island (non mappé)", compareToPairSlug(routes, "Crete", "Santorini"), null);

if (failed) { console.error(`\n${failed} FAIL`); process.exit(1); }
console.log("\nall ok");
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `node --experimental-strip-types scripts/check-bus-seo.ts`
Expected: FAIL (`Cannot find module '../src/lib/bus-seo.ts'`).

- [ ] **Step 3: Écrire `src/lib/bus-seo.ts`**

Create `src/lib/bus-seo.ts`:
```ts
// Helpers SEO pour les pages /buses/[pair]. Pur, zéro I/O.
// Isolé de bus-pairs.ts (refactoré par feat/bus-network) : importe seulement
// ses helpers stables. Spec : docs/superpowers/specs/2026-06-15-buses-seo-canonical-design.md
import { eligiblePairs, pairRoutes, type PairRouteLike } from "./bus-pairs";

/** Route minimale + champs SEO (departures pour la qualité, scraped_at pour lastmod). */
export type SeoRoute = PairRouteLike & {
  departures?: unknown[] | null;
  scraped_at?: string | null;
};

function hasDepartures(rs: SeoRoute[]): boolean {
  return rs.some((r) => Array.isArray(r.departures) && r.departures.length > 0);
}

/** Une paire est DIGNE d'indexation si au moins un sens a des horaires publiés. */
export function pairHasTimetable(routes: SeoRoute[], slug: string): boolean {
  const pr = pairRoutes(routes, slug);
  if (!pr) return false;
  return hasDepartures(pr.outbound) || hasDepartures(pr.inbound);
}

/** Slugs des paires dignes (triés), pour le sitemap et les liens internes. */
export function qualityPairSlugs(routes: SeoRoute[]): string[] {
  return eligiblePairs(routes)
    .map((p) => p.slug)
    .filter((slug) => pairHasTimetable(routes, slug))
    .sort((a, b) => a.localeCompare(b));
}

/** lastmod honnête = max(scraped_at) des routes de la paire, ou null. */
export function pairLastmod(routes: SeoRoute[], slug: string): string | null {
  const pr = pairRoutes(routes, slug);
  if (!pr) return null;
  const dates = [...pr.outbound, ...pr.inbound]
    .map((r) => r.scraped_at)
    .filter((d): d is string => typeof d === "string");
  if (dates.length === 0) return null;
  return dates.reduce((max, d) => (d > max ? d : max));
}

// Noms de villes de la page compare -> slug bus. Seules les villes qui ONT des
// pages-trajet (grandes villes desservies). Les comparaisons island/beach -> null.
const COMPARE_CITY_SLUG: Record<string, string> = {
  Heraklion: "heraklion",
  Chania: "chania",
  Rethymno: "rethymno",
  "Agios Nikolaos": "agios-nikolaos",
  Ierapetra: "ierapetra",
  Sitia: "sitia",
  Malia: "malia",
  Hersonissos: "hersonissos",
  Elounda: "elounda",
};

/** Slug de page-trajet correspondant à une comparaison de 2 villes, si la paire existe. */
export function compareToPairSlug(routes: SeoRoute[], a: string, b: string): string | null {
  const sa = COMPARE_CITY_SLUG[a];
  const sb = COMPARE_CITY_SLUG[b];
  if (!sa || !sb || sa === sb) return null;
  const slug = sa < sb ? `${sa}-to-${sb}` : `${sb}-to-${sa}`;
  return eligiblePairs(routes).some((p) => p.slug === slug) ? slug : null;
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `node --experimental-strip-types scripts/check-bus-seo.ts`
Expected: `all ok` (7 ok, 0 FAIL).

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add src/lib/bus-seo.ts scripts/check-bus-seo.ts
git -C C:\Users\fkerj\cretepulse-seo commit -m "feat(seo-buses): bus-seo helpers (quality predicate, lastmod, compare mapping) + check"
```

---

### Task 2: Élagage + lastmod honnête dans le sitemap

**Files:**
- Modify: `src/app/sitemap.xml/route.ts` (bloc bus routes, ~L189-192)

- [ ] **Step 1: Lire le bloc bus actuel du sitemap**

Run: ouvrir `src/app/sitemap.xml/route.ts`, repérer le `select("from_place,to_place")` sur `bus_routes` et la boucle `for (const p of eligiblePairs(...)) push(\`/buses/${p.slug}\`, "weekly", 0.7)`.

- [ ] **Step 2: Étendre le select + filtrer par qualité + lastmod par paire**

Modifier le bloc bus :
```ts
// AVANT : const { data: busPairRoutes } = await supabase.from("bus_routes").select("from_place,to_place");
const { data: busPairRoutes } = await supabase
  .from("bus_routes")
  .select("from_place,to_place,departures,scraped_at");
const seoRoutes = (busPairRoutes ?? []) as import("@/lib/bus-seo").SeoRoute[];
for (const slug of qualityPairSlugs(seoRoutes)) {
  push(`/buses/${slug}`, "weekly", 0.7, pairLastmod(seoRoutes, slug) ?? undefined);
}
```
Ajouter l'import en tête : `import { qualityPairSlugs, pairLastmod } from "@/lib/bus-seo";`
(Vérifier la signature de `push` : si elle n'accepte pas de 4e arg lastmod, l'ajouter — cf news/guides qui passent déjà un lastmod. Sinon adapter `urlEntry`.)

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit`
Expected: 0 erreur sur `route.ts` (erreurs baseline préexistantes ailleurs tolérées).

- [ ] **Step 4: Vérifier le sitemap rendu en local**

Run: `npm run build` puis démarrer + `curl http://localhost:3000/sitemap.xml | Select-String "/buses/"` (ou inspecter le fichier généré).
Expected: nombre de `/buses/<slug>` RÉDUIT (les paires sans horaires disparues), chaque entrée pair a un `<lastmod>` = sa date de scrape (pas la date de build).

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add src/app/sitemap.xml/route.ts
git -C C:\Users\fkerj\cretepulse-seo commit -m "feat(seo-buses): sitemap = quality pairs only + honest per-route lastmod"
```

---

### Task 3: `noindex` des pairs sans horaires (page-trajet)

**Files:**
- Modify: `src/app/[locale]/buses/[pair]/page.tsx` (`generateMetadata`)

- [ ] **Step 1: Charger les routes dans generateMetadata et décider robots**

Dans `generateMetadata` de `[pair]/page.tsx`, après avoir résolu `pair`/les routes, ajouter :
```ts
import { pairHasTimetable, type SeoRoute } from "@/lib/bus-seo";
// ... routes déjà chargées via getBusRoutes() (réutiliser, ne pas re-fetch si dispo)
const indexable = pairHasTimetable(routes as SeoRoute[], pair);
return {
  // ... title, description, alternates existants ...
  robots: indexable ? undefined : { index: false, follow: true },
};
```
(Si `generateMetadata` n'a pas déjà les routes, les charger via `getBusRoutes()` comme la page le fait. La page rend toujours — seul le `robots` change.)

- [ ] **Step 2: tsc**

Run: `npx tsc --noEmit`
Expected: 0 erreur sur le fichier.

- [ ] **Step 3: Vérifier le rendu (curl) sur une paire SANS horaire**

Run: build + `curl http://localhost:3000/en/buses/<slug-sans-horaire> | Select-String "noindex"`
Expected: `<meta name="robots" content="noindex...">` présent sur une paire sans horaire ; ABSENT sur une paire avec horaires (ex `agios-nikolaos-to-heraklion`).

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add "src/app/[locale]/buses/[pair]/page.tsx"
git -C C:\Users\fkerj\cretepulse-seo commit -m "feat(seo-buses): noindex pair pages without published timetables"
```

---

### Task 4: Encart « Bus entre X et Y » sur les pages compare

**Files:**
- Modify: `src/app/[locale]/compare/[slug]/page.tsx`
- Test: étendre `scripts/check-bus-seo.ts` (déjà couvert `compareToPairSlug` en Task 1)

- [ ] **Step 1: Résoudre le slug de paire dans la page compare**

Dans `compare/[slug]/page.tsx` (server component), charger les routes et calculer le slug bus :
```ts
import { getBusRoutes } from "@/lib/buses";
import { compareToPairSlug, type SeoRoute } from "@/lib/bus-seo";
import { Link } from "@/i18n/navigation";
// ... data = COMPARISON_DATA[slug] (contient les 2 noms de villes data.a / data.b)
const routes = (await getBusRoutes()) as SeoRoute[];
const busPair = compareToPairSlug(routes, data.a, data.b); // string | null
```

- [ ] **Step 2: Rendre l'encart si la paire existe (ancre NEUTRE, sans densifier « bus » sur compare)**

Avant le RentalCTA, ajouter (libellés en/fr/de/el via le dict T existant de la page) :
```tsx
{busPair && (
  <Link
    href={`/buses/${busPair}`}
    className="block rounded-2xl border border-ink/10 p-4 hover:bg-ink/5"
  >
    {T.getBetween /* "Se déplacer entre {a} et {b}" / "Getting between {a} and {b}" */}
  </Link>
)}
```
Le libellé NE contient PAS « bus » (le mot « bus » reste seulement la destination `/buses/...`), pour ne pas re-densifier l'intention bus sur compare (finding review M1).

- [ ] **Step 3: tsc + curl**

Run: `npx tsc --noEmit` puis build + `curl http://localhost:3000/en/compare/heraklion-vs-rethymno | Select-String "buses/"`
Expected: 0 erreur tsc ; l'encart lie vers `/en/buses/heraklion-to-rethymno` sur une compare de 2 villes desservies ; ABSENT sur `crete-vs-santorini` (island).

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add "src/app/[locale]/compare/[slug]/page.tsx"
git -C C:\Users\fkerj\cretepulse-seo commit -m "feat(seo-buses): bus link box on compare pages (neutral anchor, mapped pairs only)"
```

---

### Task 5: H1 keyword sur l'index `/buses` via i18n + fix en-dash

**Files:**
- Modify: `src/app/[locale]/buses/BusesClient.tsx` (H1 ~L424, dict `T.title` ~L33-38)

- [ ] **Step 1: Corriger l'en-dash dans `T.title`**

Dans le dict `T` (L33-38), remplacer le caractère `–` (en-dash) par `:` ou un tiret simple `-` dans les 4 langues. Ex EN : `"KTEL Bus Schedules – Crete"` -> `"KTEL Bus Timetables in Crete 2026"`. FR : `"Horaires de Bus KTEL en Crète 2026"`. DE/EL idem (frontload KTEL/timetable/2026). Zéro `–`/`—` ([[feedback_no_emdash]]).

- [ ] **Step 2: Brancher le H1 sur `t("title")` au lieu du hardcode EN/FR**

Remplacer `<h1>{locale === "fr" ? "Bus en Crète" : "Bus in Crete"}</h1>` (L424) par `<h1>{t("title")}</h1>` (ou `{T.title}` selon le mécanisme local). Le H1 couvre alors en/fr/de/el d'un coup.

- [ ] **Step 3: tsc + curl**

Run: `npx tsc --noEmit` puis build + `curl http://localhost:3000/en/buses | Select-String "<h1"` et `/fr/buses`, `/de/buses`.
Expected: H1 = la string keyword par langue ; aucun `–`/`—` ; aucun « Bus in Crete » nu.

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add "src/app/[locale]/buses/BusesClient.tsx"
git -C C:\Users\fkerj\cretepulse-seo commit -m "feat(seo-buses): keyword H1 on /buses index via i18n, remove en-dash"
```

---

### Task 6: Purge des caractères flèche sur les pages-trajet (3 emplacements)

**Files:**
- Modify: `src/app/[locale]/buses/[pair]/page.tsx` (H1 ~L281, breadcrumb JSON-LD ~L248, `T.title` meta ~L30-33)

- [ ] **Step 1: H1 keyword sans flèche**

Remplacer le H1 `{placeA} ⇄ {placeB}` (L281, span `⇄` aria-hidden) par un H1 textuel keyword : `Bus {placeA} to {placeB}` (en) / `Bus {placeA} {placeB}` localisé. Supprimer le `<span>⇄</span>`.

- [ ] **Step 2: Breadcrumb schema sans flèche**

Dans le `BreadcrumbList` inline (L248), remplacer `name: \`${placeA} ↔ ${placeB}\`` par `name: \`${placeA} to ${placeB}\`` (ou « {placeA} {placeB} » localisé).

- [ ] **Step 3: `T.title` meta sans flèche**

Dans le dict de titres (L30-33), remplacer `↔` par `to`/`-` dans les 4 langues. Ex EN : `Bus ${a} to ${b}: Timetable & Prices`.

- [ ] **Step 4: tsc + curl + grep anti-flèche**

Run: `npx tsc --noEmit` puis build + `curl http://localhost:3000/en/buses/agios-nikolaos-to-heraklion | Select-String "⇄|↔|→"`
Expected: 0 match (aucun caractère flèche rendu) ; H1 et `<title>` portent « Bus … to … » ([[feedback_zero_fleches]]).

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add "src/app/[locale]/buses/[pair]/page.tsx"
git -C C:\Users\fkerj\cretepulse-seo commit -m "feat(seo-buses): keyword H1 + purge arrow chars (H1, breadcrumb, title) on pair pages"
```

---

### Task 7: Metadata fi/nl pour l'index `/buses` (gisement pos 8-9)

**Files:**
- Modify: `src/app/[locale]/buses/page.tsx` (objet META par locale)

- [ ] **Step 1: Ajouter les entrées fi et nl à l'objet META**

Dans l'objet META (aujourd'hui en/fr/de/el), ajouter :
```ts
fi: {
  title: "Kreetan bussiaikataulut 2026 – KTEL-reitit ja hinnat",
  description: "Kaikki KTEL-bussiaikataulut Kreetalla 2026: Heraklion–Chania, Heraklion–Agios Nikolaos, lentokenttäyhteydet, matka-ajat ja ilmainen reittiopas.",
},
nl: {
  title: "Bus dienstregeling Kreta 2026 – KTEL routes en prijzen",
  description: "Alle KTEL busdienstregelingen op Kreta 2026: Heraklion–Chania, Heraklion–Agios Nikolaos, luchthavenverbindingen, reistijden en gratis routeplanner.",
},
```
(Vérifier qu'il n'y a pas d'en-dash `–` interdit côté contenu UI ; ici dans des titres SEO de langue, le `–` est un séparateur toléré par convention META mais pour cohérence brand utiliser `-`/`:`. Choisir `-`.)

- [ ] **Step 2: tsc + curl**

Run: `npx tsc --noEmit` puis build + `curl http://localhost:3000/fi/buses | Select-String "<title>"` et `/nl/buses`.
Expected: `<title>` localisé fi et nl (plus de fallback EN sur le title de l'index).

- [ ] **Step 3: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add "src/app/[locale]/buses/page.tsx"
git -C C:\Users\fkerj\cretepulse-seo commit -m "feat(seo-buses): fi/nl metadata for /buses index (striking-distance gisement)"
```

---

### Task 8: `url` dans l'ItemList du schema index

**Files:**
- Modify: `src/lib/schema.ts` (`busesPageSchema`, ItemList ~L619-628)
- Modify: `src/app/[locale]/buses/page.tsx` (l'appel qui alimente `routes`)

- [ ] **Step 1: Passer les slugs de paires dignes au schema**

Dans `buses/page.tsx`, au lieu de passer `routes.map(r => ({from, to}))`, calculer les paires dignes + leurs slugs :
```ts
import { qualityPairSlugs } from "@/lib/bus-seo";
import { eligiblePairs } from "@/lib/bus-pairs";
const slugs = new Set(qualityPairSlugs(seoRoutes));
const pairsForSchema = eligiblePairs(seoRoutes)
  .filter((p) => slugs.has(p.slug))
  .map((p) => ({ from: p.placeA, to: p.placeB, slug: p.slug }));
// passer pairsForSchema à busesPageSchema
```

- [ ] **Step 2: Émettre `url` par item dans `busesPageSchema`**

Dans `schema.ts`, étendre la signature `routes: Array<{from, to, slug}>` et l'`itemListElement` :
```ts
itemListElement: routes.map((r, i) => ({
  "@type": "ListItem",
  position: i + 1,
  name: `${r.from} to ${r.to} by bus`,
  url: `${BASE_URL}/${locale}/buses/${r.slug}`,
})),
```

- [ ] **Step 3: tsc + curl (valider le JSON-LD)**

Run: `npx tsc --noEmit` puis build + `curl http://localhost:3000/en/buses | Select-String "ListItem"`
Expected: chaque `ListItem` a un `url` vers une page-trajet DIGNE existante (pas de paire sans horaire).

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add src/lib/schema.ts "src/app/[locale]/buses/page.tsx"
git -C C:\Users\fkerj\cretepulse-seo commit -m "feat(seo-buses): ItemList url per quality pair in buses index schema"
```

---

### Task 9: Profondeur de contenu data-driven sur les pages-trajet

**Files:**
- Modify: `src/app/[locale]/buses/[pair]/page.tsx` (corps de la page, section direction)

- [ ] **Step 1: Ajouter une phrase d'intro data-driven unique par trajet (zéro invention)**

Sous le H1, ajouter un paragraphe construit UNIQUEMENT à partir de la donnée (jamais de fait inventé, [[feedback_marketing_facts]]) :
```tsx
{firstRoute && (
  <p className="text-ink/70">
    {/* en : "KTEL runs {n} bus departures between {A} and {B}. First {first}, last {last}. Journey {duration}, ticket {price}." */}
    {introLine(locale, { a: placeA, b: placeB, count, first, last, duration, price })}
  </p>
)}
```
`introLine` = helper local pur qui n'écrit QUE des valeurs présentes (omet « ticket {price} » si `price_estimated` ou null). Pas de superlatif, pas de fait non sourcé.

- [ ] **Step 2: tsc + curl (unicité)**

Run: `npx tsc --noEmit` puis build + curl 2 paires différentes, vérifier que le paragraphe diffère (villes/horaires/prix réels) et n'apparaît PAS sur une paire sans horaire.
Expected: contenu unique par trajet, omission propre des champs absents.

- [ ] **Step 3: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add "src/app/[locale]/buses/[pair]/page.tsx"
git -C C:\Users\fkerj\cretepulse-seo commit -m "feat(seo-buses): data-driven intro line per pair page (no fabrication)"
```

---

### Task 10: Maillage interne entrant vers les pages-trajet dignes

**Files:**
- Modify: `src/app/[locale]/things-to-do/[city]/page.tsx` (et/ou `where-to-stay`, `/beaches/[slug]`)

> Note coordination : la cliquabilité du `DepBoard` accueil est traitée par un AUTRE chantier (`feat/home-depboard-clickable`, plan `2026-06-15-home-depboard-clickable-rows.md`). NE PAS la dupliquer ici. Ce Task ajoute les liens depuis les pages de DESTINATION.

- [ ] **Step 1: Sur une page destination, lier vers les pages-trajet dignes desservant la ville**

Dans `things-to-do/[city]/page.tsx` (server), si la ville est un lieu bus desservi, lister 3-5 liens « Bus vers {city} depuis {origin} » vers les pages-trajet dignes :
```ts
import { getBusRoutes } from "@/lib/buses";
import { qualityPairSlugs } from "@/lib/bus-seo";
import { slugifyPlace } from "@/lib/bus-pairs";
const routes = await getBusRoutes();
const citySlug = /* slug de la ville courante */;
const links = qualityPairSlugs(routes).filter((s) => s.includes(citySlug)).slice(0, 5);
```
Rendre une petite section « Y aller en bus » avec ces liens (ancre « Bus {origin} {city} »).

- [ ] **Step 2: tsc + curl**

Run: `npx tsc --noEmit` puis build + curl une page `things-to-do` d'une ville desservie.
Expected: section « Y aller en bus » avec liens vers pages-trajet dignes ; absente si la ville n'est pas un lieu bus.

- [ ] **Step 3: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add "src/app/[locale]/things-to-do/[city]/page.tsx"
git -C C:\Users\fkerj\cretepulse-seo commit -m "feat(seo-buses): internal links from destination pages to quality bus pairs"
```

---

### Task 11: Diagnostic + fix `sitemap-news.xml` (432 erreurs)

**Files:**
- Modify: `src/app/sitemap-news.xml/route.ts` (ou équivalent)

- [ ] **Step 1: Diagnostiquer les 432 erreurs via GSC**

Run le pull GSC `sitemaps` (credentials `~/.kairos-keys`) sur `sitemap-news.xml` + inspecter 3 URLs qu'il déclare.
Expected: identifier la cause (URLs invalides ? format News absent `<news:news>` ? dates hors fenêtre 48h News ? articles supprimés ?). Documenter.

- [ ] **Step 2: Corriger selon la cause**

Cas probable (News exige des articles < 48h) : ne lister QUE les articles publiés dans les dernières 48h, avec le namespace `<news:news>` + `<news:publication_date>` valides. Sinon retirer les URLs mortes.

- [ ] **Step 3: tsc + curl + validation**

Run: `npx tsc --noEmit` puis build + `curl http://localhost:3000/sitemap-news.xml` et valider le XML (namespace news, dates < 48h).
Expected: sitemap-news valide, plus d'URLs en erreur.

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-seo add "src/app/sitemap-news.xml/route.ts"
git -C C:\Users\fkerj\cretepulse-seo commit -m "fix(seo): repair sitemap-news.xml (432 errors) — valid news format/freshness"
```

---

### Task 12: Vert, preview, déploiement, Gate A

**Files:** aucun (build/deploy).

- [ ] **Step 1: Vert complet**

Run: `npx tsc --noEmit` (0 erreur sur mes fichiers) ; `node --experimental-strip-types scripts/check-bus-seo.ts` (all ok) ; `npm run build` (succès).
Expected: tout vert.

- [ ] **Step 2: Preview Vercel**

```powershell
git -C C:\Users\fkerj\cretepulse-seo push origin feat/seo-buses
```
Expected: URL preview Vercel générée. Valider visuellement : `/buses` (H1 keyword), une page-trajet digne (H1 « Bus X to Y », pas de flèche), une page sans horaire (noindex), `/compare/heraklion-vs-rethymno` (encart bus), `/sitemap.xml` (pairs réduites + lastmod).

- [ ] **Step 3: GATE Kami (validation visuelle preview)**

Envoyer captures à Kami. Attendre GO.

- [ ] **Step 4: Déploiement prod (acte conscient)**

Run (après GO) : `git -C C:\Users\fkerj\cretepulse-seo fetch origin` ; comparer `master..origin/main` (FF only, [[feedback_fetch_before_push_main]]) ; `git push origin feat/seo-buses:master` puis `git push origin master:main`.
Expected: prod déployée. Vérifier LIVE via `vercel ls --prod` + curl domaine ([[feedback_verify_prod_deploy_live]]).

- [ ] **Step 5: Soumettre IndexNow + GSC sur les pairs dignes (amorcer le crawl)**

Run : IndexNow ping des ~40 slugs dignes (Bing BWT à réparer côté Kami si 403) + dans GSC, « Request indexing » sur 5-10 pairs dignes prioritaires (ou laisser le sitemap+lastmod faire son travail).

- [ ] **Step 6: Planifier la mesure Gate A (J+30) et le plan de suite**

Documenter : Gate A = re-inspecter les pairs dignes à J+30 (passage « Discovered » -> « Indexed » + 1re impression). Si Gate A ✅ -> écrire le **plan de suite redirects** (`getting-around` 301, spec §4.4-4.5, après check hreflang §6). C'est ce qui sauve le checkpoint Phase 10 « noindex 25/07 » (Gate A, pas le ranking).

```powershell
git -C C:\Users\fkerj\cretepulse-build worktree remove C:\Users\fkerj\cretepulse-seo
```
(après merge confirmé)

---

## Plan de suite (NON inclus ici — écrire après Gate A)

**Phase 2 — Cannibalisation / redirects** (spec §4.4-4.5, §6) : 301 `getting-around/{4 slugs}` -> `buses/[pair]`, cleanup `ROUTES`/`RELATED{}`/set `GETTING_AROUND`, re-index sous-ensemble aéroport/ferry, check hreflang 200-partout. **Gated** : seulement une fois les pages-trajet dignes confirmées indexées (Gate A), pour ne pas rediriger vers des cibles non-indexées (finding review H2).

---

## Self-review (couverture spec)

- §4.1 élagage near-duplicate -> Task 2 (sitemap) + Task 3 (noindex). ✅
- §4.2 lastmod honnête -> Task 2 + helper Task 1 (`pairLastmod`, hash de fraîcheur = via scraped_at réel). ✅
- §4.3 maillage entrant -> Task 10 (+ DepBoard coordonné, noté). ✅
- §4.4-4.5 redirects getting-around -> **Plan de suite** (gated Gate A). ✅ (scope explicite)
- §4.6 encart compare ancre neutre + mapping -> Task 4 + helper Task 1 (`compareToPairSlug`). ✅
- §4.7 H1 index via t() + en-dash -> Task 5. ✅
- §4.8 fi/nl metadata -> Task 7. ✅
- §4.9 purge flèches 3 emplacements -> Task 6. ✅
- §4.10 profondeur data-driven -> Task 9. ✅
- §4.11 schema : BusTrip abandonné (Google ne le rend pas) -> non-tâche assumée ; FAQ/breadcrumb conservés. ✅
- §4.12 ItemList url -> Task 8. ✅
- §4.13 sitemap-news 432 -> Task 11. ✅
- §6 hreflang 200-check -> dans le **plan de suite** (avant les redirects). ✅
- §9 Gate A/B -> Task 0 (baseline) + Task 12 (mesure). ✅
- Coordination bus-network -> Task 0. ✅

Types cohérents : `SeoRoute` (Task 1) utilisé identiquement Tasks 2/3/8/10 ; `qualityPairSlugs`/`pairHasTimetable`/`pairLastmod`/`compareToPairSlug` signatures stables. Aucun placeholder : chaque step montre le code ou la commande + l'attendu.
