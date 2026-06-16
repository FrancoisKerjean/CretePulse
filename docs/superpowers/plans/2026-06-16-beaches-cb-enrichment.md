# Enrichissement des pages plages avec cb_places — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher les données riches de `cb_places` (note, photos, attributs terrain) sur les pages de la table `beaches`, via un lien figé `cb_slug`, sans fusion physique ni changement d'URL.

**Architecture:** Une colonne `cb_slug` (+ `cb_match_m`) est ajoutée à `beaches` et remplie une fois par un script de matching déterministe (logique pure testée). Les pages lisent ce lien figé au lieu de recalculer la proximité GPS à chaque requête. L'affichage (galerie, note, bouton carte) réutilise la couche de traduction et le deep-link explorer déjà en place.

**Tech Stack:** Next.js (App Router, RSC) · TypeScript · Supabase (PostgREST self-hosted, client anon) · Vitest · Tailwind v4.

---

## Contexte technique (vérifié dans le repo)

- **Tests :** Vitest. Config `vitest.config.ts` → `include: ["src/**/*.test.ts"]`. Tests dans `src/lib/__tests__/`. Import `import { describe, it, expect } from "vitest"`. Lancer un test : `npm test -- <fichier>.test.ts`.
- **Scripts :** exécutés via `node --experimental-strip-types scripts/<nom>.ts`. Connexion Supabase par `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)`. **Pas de clé service_role** → un script ne peut pas écrire en base ; il produit du SQL que Kami applique (comme les migrations).
- **Migrations :** `supabase/migrations/YYYYMMDDHHMMSS_<nom>.sql`. Format additif `alter table ... add column if not exists ...;` + `notify pgrst, 'reload schema';`. Appliquées manuellement sur le VPS (acte conscient Kami).
- **Type `Beach`** (`src/lib/types.ts`) : possède déjà `id, slug, name_{en,fr,de,el}, latitude, longitude, region, type, length_m, parking, sunbeds, taverna, snorkeling, kids_friendly, description_{en,fr,de,el}, wind_exposure, image_url, image_credit`.
- **Type `CbBeachAttrs`** (`src/lib/cb-beach-match.ts`) : `{ slug, rating, sea_surface, sand_type, depth, crowds, facilities, accessibility, water_color, photos }`.
- **Deep-link explorer :** `ExploreView.tsx` lit `?place=slug` au montage et appelle `selectPlace(slug)`, qui ouvre le drawer **ET** recentre la carte (`mapRef.current.flyTo`). Donc un simple lien `/explore?place=<cb_slug>` suffit, aucun travail carte additionnel.
- **Pages liste** (`beaches/page.tsx`, `best-for/[activity]/page.tsx`, `near/[village]/page.tsx`) : toutes appellent `getAllBeaches()` et rendent des cartes basées sur `beach.image_url`. Enrichir `getAllBeaches()` les sert toutes les trois.

## Structure des fichiers

| Fichier | Rôle | Action |
|---|---|---|
| `supabase/migrations/20260616180000_beaches_cb_link.sql` | Colonnes `cb_slug`, `cb_match_m` | Créer |
| `src/lib/cb-link.ts` | Logique pure de matching (haversine m, classification confiance, merge) | Créer |
| `src/lib/__tests__/cb-link.test.ts` | Tests de la logique pure | Créer |
| `scripts/match-beaches-cb.ts` | Script one-shot : lit beaches+cb_places, produit SQL + rapports | Créer |
| `src/lib/types.ts` | Ajout `cb_slug`, `cb_match_m`, `cb_rating?`, `cb_photo?` à `Beach` | Modifier |
| `src/lib/cb-beach-match.ts` | Ajout `getCbBySlug` + `matchCbBySlug` | Modifier |
| `src/lib/beaches.ts` | `getAllBeaches` enrichit avec `cb_rating`/`cb_photo` | Modifier |
| `src/components/BeachGallery.tsx` | Carrousel photos (client) | Créer |
| `src/app/[locale]/beaches/[slug]/page.tsx` | Lien figé + galerie + bouton « Voir sur la carte » | Modifier |
| `src/app/[locale]/beaches/page.tsx` | Note ★ + photo cb sur les cartes | Modifier |
| `src/app/[locale]/beaches/best-for/[activity]/page.tsx` | Note ★ + photo cb sur les cartes | Modifier |
| `src/app/[locale]/beaches/near/[village]/page.tsx` | Note ★ + photo cb sur les cartes | Modifier |
| `src/lib/swim-today.ts` | Match via `cb_slug` figé au lieu du GPS | Modifier |

**Note TDD honnête :** la logique pure (matching, classification, merge) est faite en TDD strict (Tasks 2 & 4). Les composants UI et les pages RSC ne sont pas unit-testés (le repo ne teste pas l'UI) : on les valide par `npx tsc --noEmit` + `npm run build`. Le script (Task 3) réutilise la logique testée de Task 2 et se valide par un run réel en lecture seule.

---

## Task 1 : Migration des colonnes de lien

**Files:**
- Create: `supabase/migrations/20260616180000_beaches_cb_link.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Lien figé beaches -> cb_places (enrichissement plages, validé Kami 16/06/2026).
-- Additif. cb_slug pointe (logiquement) vers cb_places.slug ; pas de FK dure car
-- cb_places est re-scrapé indépendamment. Rempli une fois par scripts/match-beaches-cb.ts.
alter table beaches
  add column if not exists cb_slug   text,
  add column if not exists cb_match_m integer;

-- PostgREST self-hosted : recharger le cache de schema
notify pgrst, 'reload schema';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260616180000_beaches_cb_link.sql
git commit -m "feat(db): colonnes cb_slug/cb_match_m sur beaches (lien cb_places)"
```

> **Application en prod = acte Kami** (push `.sql` sur le VPS + exécution). Le reste du plan fonctionne en dégradation gracieuse tant que les colonnes sont vides (`cb_slug` NULL → comportement actuel).

---

## Task 2 : Logique pure de matching (`cb-link.ts`)

**Files:**
- Create: `src/lib/cb-link.ts`
- Test: `src/lib/__tests__/cb-link.test.ts`

- [ ] **Step 1: Écrire les tests d'abord**

```typescript
import { describe, it, expect } from "vitest";
import { haversineM, classifyMatch, matchBeachToCb } from "../cb-link";

describe("haversineM", () => {
  it("renvoie ~0 pour le même point", () => {
    expect(haversineM(35, 25, 35, 25)).toBeLessThan(1);
  });
  it("mesure une distance connue (~1 km)", () => {
    // 0.009° de latitude ≈ 1 km
    const d = haversineM(35.0, 25.0, 35.009, 25.0);
    expect(d).toBeGreaterThan(950);
    expect(d).toBeLessThan(1050);
  });
});

describe("classifyMatch", () => {
  it("high: candidat unique proche (<=400m, pas de second)", () => {
    expect(classifyMatch(120, null)).toBe("high");
  });
  it("high: second très loin (> 2x best)", () => {
    expect(classifyMatch(150, 900)).toBe("high");
  });
  it("review: best entre 400 et 1500m", () => {
    expect(classifyMatch(700, null)).toBe("review");
  });
  it("review: deux candidats proches (second <= 2x best)", () => {
    expect(classifyMatch(200, 300)).toBe("review");
  });
  it("none: aucun candidat (best null)", () => {
    expect(classifyMatch(null, null)).toBe("none");
  });
});

describe("matchBeachToCb", () => {
  const beach = { slug: "b1", latitude: 35.0, longitude: 25.0 };
  it("retourne high + le bon slug quand un seul candidat proche", () => {
    const r = matchBeachToCb(beach, [
      { slug: "cb-near", latitude: 35.001, longitude: 25.0 },
      { slug: "cb-far", latitude: 35.05, longitude: 25.0 },
    ]);
    expect(r.confidence).toBe("high");
    expect(r.cbSlug).toBe("cb-near");
    expect(r.distanceM).toBeGreaterThan(0);
  });
  it("retourne none quand aucun candidat dans 1500m", () => {
    const r = matchBeachToCb(beach, [{ slug: "cb-far", latitude: 35.2, longitude: 25.0 }]);
    expect(r.confidence).toBe("none");
    expect(r.cbSlug).toBeNull();
  });
  it("ignore les candidats sans coordonnées", () => {
    const r = matchBeachToCb(beach, [{ slug: "cb-nogeo", latitude: null, longitude: null }]);
    expect(r.confidence).toBe("none");
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test -- cb-link.test.ts`
Expected: FAIL (`Cannot find module '../cb-link'`).

- [ ] **Step 3: Écrire l'implémentation minimale**

```typescript
// Logique pure de mise en correspondance beaches <-> cb_places.
// Aucune I/O : testable et réutilisée par le script de matching.

const R_EARTH_M = 6_371_000;
const HIGH_M = 400;      // candidat évident
const MAX_M = 1500;      // au-delà : pas de match
const RATIO = 2;         // second > RATIO x best => best non ambigu

export function haversineM(latA: number, lngA: number, latB: number, lngB: number): number {
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((latA * Math.PI) / 180) * Math.cos((latB * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_M * Math.asin(Math.sqrt(a));
}

export type Confidence = "high" | "review" | "none";

export function classifyMatch(bestM: number | null, secondM: number | null): Confidence {
  if (bestM == null || bestM > MAX_M) return "none";
  const unique = secondM == null || secondM > RATIO * bestM;
  if (bestM <= HIGH_M && unique) return "high";
  return "review";
}

export interface GeoPoint { slug: string; latitude: number | null; longitude: number | null; }
export interface MatchResult {
  beachSlug: string;
  cbSlug: string | null;
  distanceM: number | null;
  secondM: number | null;
  confidence: Confidence;
}

export function matchBeachToCb(
  beach: { slug: string; latitude: number | null; longitude: number | null },
  candidates: GeoPoint[],
): MatchResult {
  let best: { slug: string; m: number } | null = null;
  let second: { slug: string; m: number } | null = null;

  if (beach.latitude != null && beach.longitude != null) {
    for (const c of candidates) {
      if (c.latitude == null || c.longitude == null) continue;
      const m = haversineM(beach.latitude, beach.longitude, c.latitude, c.longitude);
      if (best == null || m < best.m) {
        second = best;
        best = { slug: c.slug, m };
      } else if (second == null || m < second.m) {
        second = { slug: c.slug, m };
      }
    }
  }

  const confidence = classifyMatch(best?.m ?? null, second?.m ?? null);
  return {
    beachSlug: beach.slug,
    cbSlug: confidence === "none" ? null : (best?.slug ?? null),
    distanceM: best ? Math.round(best.m) : null,
    secondM: second ? Math.round(second.m) : null,
    confidence,
  };
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npm test -- cb-link.test.ts`
Expected: PASS (tous les cas verts).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cb-link.ts src/lib/__tests__/cb-link.test.ts
git commit -m "feat: logique pure de matching beaches/cb_places (TDD)"
```

---

## Task 3 : Script de matching one-shot

**Files:**
- Create: `scripts/match-beaches-cb.ts`

Ce script lit `beaches` + `cb_places` (anon, lecture seule), applique `cb-link.ts`, et écrit 3 fichiers dans `scripts/out/`. Il **n'écrit pas** en base (pas de service_role) : il produit le SQL que Kami appliquera.

- [ ] **Step 1: Écrire le script**

```typescript
// Apparie beaches <-> cb_places et produit le SQL + les rapports de revue.
// Run (PowerShell, depuis la racine du repo, avec .env.local présent) :
//   node --experimental-strip-types scripts/match-beaches-cb.ts
// Lecture seule en base. Sorties dans scripts/out/.
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { matchBeachToCb, type GeoPoint } from "../src/lib/cb-link.ts";

// Charge .env.local si les variables ne sont pas déjà dans l'environnement.
function loadEnvLocal() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) throw new Error("Missing Supabase env vars");
const supabase = createClient(URL, KEY);

interface BeachRow { slug: string; name_en: string; latitude: number | null; longitude: number | null; }
interface CbRow extends GeoPoint { name: string; }

async function main() {
  const { data: beaches, error: be } = await supabase
    .from("beaches")
    .select("slug, name_en, latitude, longitude")
    .order("name_en");
  if (be) throw be;

  // cb_places peut dépasser 1000 lignes de plages : pagination.
  const cb: CbRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("cb_places")
      .select("slug, name, latitude, longitude")
      .eq("place_type", "beach")
      .not("latitude", "is", null)
      .order("slug")
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data as CbRow[]) || [];
    cb.push(...batch);
    if (batch.length < 1000) break;
  }

  const cbName = new Map(cb.map((c) => [c.slug, c.name]));
  const high: string[] = [];
  const review: string[] = [];
  const none: string[] = [];

  for (const b of (beaches as BeachRow[]) || []) {
    // préfiltre bbox ~±2km pour limiter le coût haversine
    const cands = cb.filter(
      (c) =>
        c.latitude != null && c.longitude != null && b.latitude != null && b.longitude != null &&
        Math.abs(c.latitude - b.latitude) < 0.02 && Math.abs(c.longitude - b.longitude) < 0.02,
    );
    const r = matchBeachToCb(b, cands);
    if (r.confidence === "high" && r.cbSlug) {
      high.push(`UPDATE beaches SET cb_slug='${r.cbSlug}', cb_match_m=${r.distanceM} WHERE slug='${b.slug}';`);
    } else if (r.confidence === "review") {
      const near = cands
        .map((c) => ({ slug: c.slug, name: cbName.get(c.slug) ?? c.slug,
          m: Math.round(matchBeachToCb(b, [c]).distanceM ?? 0) }))
        .filter((c) => c.m > 0 && c.m <= 1500)
        .sort((a, c) => a.m - c.m)
        .slice(0, 4)
        .map((c) => `\`${c.slug}\` (${c.name}, ${c.m} m)`)
        .join(" · ");
      review.push(`| ${b.slug} | ${b.name_en} | ${near || "—"} |`);
    } else {
      none.push(`- ${b.slug} (${b.name_en})`);
    }
  }

  const outDir = path.join(process.cwd(), "scripts", "out");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "match-beaches-cb.high.sql"),
    `-- ${high.length} liens auto (confiance haute). Appliquer sur le VPS.\n` +
      high.join("\n") + "\nnotify pgrst, 'reload schema';\n",
  );
  fs.writeFileSync(
    path.join(outDir, "match-beaches-cb.review.md"),
    `# Cas à valider (${review.length})\n\nChoisis le bon cb_slug (ou raye la ligne si aucun).\n\n` +
      `| beach_slug | nom | candidats (slug, nom, distance) |\n|---|---|---|\n` +
      review.join("\n") + "\n",
  );
  fs.writeFileSync(
    path.join(outDir, "match-beaches-cb.none.md"),
    `# Sans candidat à <=1500m (${none.length})\n\n` + none.join("\n") + "\n",
  );

  console.log(`high=${high.length} review=${review.length} none=${none.length} -> scripts/out/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run réel (lecture seule) pour vérifier**

Run: `node --experimental-strip-types scripts/match-beaches-cb.ts`
Expected: affiche `high=… review=… none=…` (high ~165-175, review ~5-15, none ~2-5) et crée les 3 fichiers dans `scripts/out/`. Vérifier à l'œil `scripts/out/match-beaches-cb.review.md`.

- [ ] **Step 3: Commit (script seulement, pas les sorties)**

```bash
git add scripts/match-beaches-cb.ts
git commit -m "feat: script de matching beaches/cb_places (produit SQL + rapports de revue)"
```

> `scripts/out/` n'est pas committé (artefacts de run). Les `.high.sql` + choix de revue de Kami seront appliqués en base par Kami.

---

## Task 4 : Type + lecture du lien figé + enrichissement des listes

**Files:**
- Modify: `src/lib/types.ts` (type `Beach`)
- Modify: `src/lib/cb-beach-match.ts` (ajout `getCbBySlug`, `matchCbBySlug`)
- Modify: `src/lib/beaches.ts` (`getAllBeaches` enrichi + helper `mergeCbIntoBeaches`)
- Test: `src/lib/__tests__/beaches-merge.test.ts`

- [ ] **Step 1: Étendre le type `Beach`**

Dans `src/lib/types.ts`, à la fin de l'interface `Beach` (après `image_credit`), ajouter :

```typescript
  // Lien figé vers cb_places (colonnes DB, migration 20260616180000)
  cb_slug?: string | null;
  cb_match_m?: number | null;
  // Champs dérivés (jointure cb_places, peuplés par getAllBeaches)
  cb_rating?: number | null;
  cb_photo?: string | null;
```

- [ ] **Step 2: Écrire le test du merge d'abord**

Create `src/lib/__tests__/beaches-merge.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { mergeCbIntoBeaches } from "../beaches";

describe("mergeCbIntoBeaches", () => {
  const beaches = [
    { slug: "a", cb_slug: "cb-a", image_url: "wiki-a.jpg" },
    { slug: "b", cb_slug: null, image_url: "wiki-b.jpg" },
  ] as never[];

  it("ajoute cb_rating et cb_photo depuis la ligne cb correspondante", () => {
    const r = mergeCbIntoBeaches(beaches, [
      { slug: "cb-a", rating: 4.2, photos: ["p1.jpg", "p2.jpg"] },
    ]);
    expect(r[0].cb_rating).toBe(4.2);
    expect(r[0].cb_photo).toBe("p1.jpg");
  });

  it("laisse cb_rating/cb_photo à null quand cb_slug est null", () => {
    const r = mergeCbIntoBeaches(beaches, []);
    expect(r[1].cb_rating).toBeNull();
    expect(r[1].cb_photo).toBeNull();
  });

  it("gère une ligne cb sans photos", () => {
    const r = mergeCbIntoBeaches(beaches, [{ slug: "cb-a", rating: 3, photos: null }]);
    expect(r[0].cb_photo).toBeNull();
    expect(r[0].cb_rating).toBe(3);
  });
});
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npm test -- beaches-merge.test.ts`
Expected: FAIL (`mergeCbIntoBeaches` non exporté).

- [ ] **Step 4: Implémenter dans `src/lib/beaches.ts`**

Ajouter en haut le type et le helper, et modifier `getAllBeaches` :

```typescript
// Ligne cb_places allégée pour l'enrichissement des listes.
interface CbLite { slug: string; rating: number | null; photos: string[] | null; }

/** Reporte rating + 1re photo de cb_places sur chaque plage via cb_slug (pur, testable). */
export function mergeCbIntoBeaches(beaches: Beach[], cbRows: CbLite[]): Beach[] {
  const bySlug = new Map(cbRows.map((c) => [c.slug, c]));
  return beaches.map((b) => {
    const cb = b.cb_slug ? bySlug.get(b.cb_slug) : undefined;
    return {
      ...b,
      cb_rating: cb?.rating ?? null,
      cb_photo: cb?.photos?.[0] ?? null,
    };
  });
}
```

Puis modifier `getAllBeaches` pour (a) sélectionner `cb_slug`, (b) faire une requête batch et fusionner :

```typescript
export async function getAllBeaches(): Promise<Beach[]> {
  const { data, error } = await supabase
    .from("beaches")
    .select("slug, name_en, name_fr, name_de, name_el, image_url, region, type, parking, snorkeling, kids_friendly, latitude, longitude, cb_slug")
    .order("name_en");

  if (error) throw error;
  const beaches = ((data as Beach[]) || [])
    .filter((b) => isSwimmableBeach(b.slug))
    .map(sanitizeBeach);

  const cbSlugs = beaches.map((b) => b.cb_slug).filter((s): s is string => Boolean(s));
  if (cbSlugs.length === 0) return beaches;

  const { data: cb } = await supabase
    .from("cb_places")
    .select("slug, rating, photos")
    .in("slug", cbSlugs);

  return mergeCbIntoBeaches(beaches, (cb as CbLite[]) || []);
}
```

- [ ] **Step 5: Ajouter `getCbBySlug` et `matchCbBySlug` dans `src/lib/cb-beach-match.ts`**

Après `getCbBeachNear`, ajouter :

```typescript
/** Attributs cb_places d'une plage par son slug figé (lien cb_slug). */
export async function getCbBySlug(slug: string): Promise<CbBeachAttrs | null> {
  try {
    const { data, error } = await supabase
      .from("cb_places")
      .select("slug, rating, sea_surface, sand_type, depth, crowds, facilities, accessibility, water_color, photos")
      .eq("slug", slug)
      .single();
    if (error || !data) return null;
    return data as unknown as CbBeachAttrs;
  } catch {
    return null;
  }
}

/** Mappe beach.slug -> attributs cb via le lien figé cb_slug (fallback GPS si absent). */
export function matchCbBySlug(beaches: Beach[], cbRows: CbRow[]): Map<string, CbBeachAttrs> {
  const byCbSlug = new Map(cbRows.map((c) => [c.slug, c]));
  const out = new Map<string, CbBeachAttrs>();
  const noLink: Beach[] = [];
  for (const b of beaches) {
    if (b.cb_slug && byCbSlug.has(b.cb_slug)) out.set(b.slug, byCbSlug.get(b.cb_slug)!);
    else noLink.push(b);
  }
  // plages sans lien figé : on retombe sur l'appariement GPS existant
  if (noLink.length) {
    const gps = matchCbBeaches(noLink, cbRows);
    for (const [k, v] of gps) out.set(k, v);
  }
  return out;
}
```

- [ ] **Step 6: Vérifier les tests + types**

Run: `npm test -- beaches-merge.test.ts cb-link.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/beaches.ts src/lib/cb-beach-match.ts src/lib/__tests__/beaches-merge.test.ts
git commit -m "feat: lecture du lien cb figé + enrichissement des listes (rating/photo)"
```

---

## Task 5 : Composant galerie photos

**Files:**
- Create: `src/components/BeachGallery.tsx`

Carrousel client minimal, calqué sur le carrousel de `ExploreView.tsx` (L823-841).

- [ ] **Step 1: Écrire le composant**

```tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function BeachGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  if (!photos || photos.length === 0) return null;
  const prev = () => setIdx((idx - 1 + photos.length) % photos.length);
  const next = () => setIdx((idx + 1) % photos.length);

  return (
    <div className="relative h-56 md:h-72 rounded-xl overflow-hidden bg-aegean/5 mb-8">
      <img src={photos[idx]} alt={alt} className="w-full h-full object-cover" loading="lazy" decoding="async" />
      {photos.length > 1 && (
        <>
          <button onClick={prev} aria-label="Précédent"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} aria-label="Suivant"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 right-2 text-xs bg-black/55 text-white px-2 py-0.5 rounded">
            {idx + 1}/{photos.length}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/BeachGallery.tsx
git commit -m "feat: composant BeachGallery (carrousel photos cb_places)"
```

---

## Task 6 : Fiche détail — lien figé + galerie + bouton carte

**Files:**
- Modify: `src/app/[locale]/beaches/[slug]/page.tsx`

- [ ] **Step 1: Lire le cb via le lien figé**

Remplacer le bloc de récupération (L264-267) :

```typescript
const [nearby, cb] = await Promise.all([
  getNearbyBeaches(beach.latitude, beach.longitude, beach.slug),
  getCbBeachNear(beach.latitude, beach.longitude),
]);
```

par :

```typescript
const [nearby, cb] = await Promise.all([
  getNearbyBeaches(beach.latitude, beach.longitude, beach.slug),
  beach.cb_slug ? getCbBySlug(beach.cb_slug) : getCbBeachNear(beach.latitude, beach.longitude),
]);
```

Et ajouter `getCbBySlug` à l'import existant depuis `@/lib/cb-beach-match` (à côté de `getCbBeachNear`). Ajouter `Map` à l'import `lucide-react` existant.

- [ ] **Step 2: Calculer l'image de tête et insérer la galerie**

Juste avant le `return (`, ajouter :

```typescript
const cbPhotos: string[] = cb?.photos ?? [];
const heroImage = cbPhotos[0] ?? beach.image_url;
```

Dans le hero (L416-435), remplacer la condition `beach.image_url &&` par `heroImage &&` et `src={beach.image_url}` par `src={heroImage}`. Remplacer aussi la condition `{!beach.image_url && (` (L445) par `{!heroImage && (`.

Puis, dans le container `<div className="max-w-4xl mx-auto px-4 py-8">`, juste après le lien retour « All beaches » (après L443), insérer la galerie :

```tsx
{cbPhotos.length > 1 && (
  <BeachGallery photos={cbPhotos} alt={`${name}, ${beach.region} Crete`} />
)}
```

Ajouter l'import en tête : `import { BeachGallery } from "@/components/BeachGallery";`

- [ ] **Step 3: Ajouter le bouton « Voir sur la carte »**

Juste après le bloc « Map link » (le `<a ... openInMaps>` qui finit L523), insérer :

```tsx
{beach.cb_slug && (
  <a
    href={`/${locale}/explore?place=${beach.cb_slug}`}
    className="inline-flex items-center gap-2 px-4 py-2 ml-2 bg-white border border-aegean text-aegean rounded-lg text-sm font-medium hover:bg-aegean-faint transition-colors mb-12"
  >
    <Map className="w-4 h-4" />
    {loc === "fr" ? "Voir sur la carte" : loc === "de" ? "Auf der Karte ansehen" : loc === "el" ? "Δείτε στον χάρτη" : "View on map"}
  </a>
)}
```

- [ ] **Step 4: Vérifier types + build**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/beaches/[slug]/page.tsx"
git commit -m "feat: fiche plage lit le lien figé + galerie cb + bouton Voir sur la carte"
```

---

## Task 7 : Note ★ + photo cb sur les pages liste

**Files:**
- Modify: `src/app/[locale]/beaches/page.tsx`
- Modify: `src/app/[locale]/beaches/best-for/[activity]/page.tsx`
- Modify: `src/app/[locale]/beaches/near/[village]/page.tsx`

Pattern commun : photo de tête = `beach.cb_photo ?? beach.image_url` ; badge ★ si `beach.cb_rating`.

- [ ] **Step 1: `beaches/page.tsx`**

Dans la carte (L116-162), remplacer `src={beach.image_url}` du `<BeachImage>` par `src={beach.cb_photo ?? beach.image_url}`. Puis, dans le `<div className="p-4">`, juste après le `<h2>` du nom, ajouter le badge note :

```tsx
{beach.cb_rating != null && beach.cb_rating > 0 && (
  <div className="inline-flex items-center gap-1 text-xs text-amber-700 mt-1">★ {beach.cb_rating.toFixed(1)}</div>
)}
```

- [ ] **Step 2: `best-for/[activity]/page.tsx`**

La carte (L284-326) rend l'image dans un bloc conditionné `beach.image_url &&`. Remplacer par un calcul d'image de tête : juste avant le `return (` de `beaches.map(beach => {`, ajouter `const img = beach.cb_photo ?? beach.image_url;`. Remplacer la condition `{beach.image_url && (` par `{img && (` et `src={beach.image_url}` par `src={img}`. Dans le bloc titre (après le `<h2>` nom, L307), ajouter :

```tsx
{beach.cb_rating != null && beach.cb_rating > 0 && (
  <div className="text-xs text-amber-700 mt-0.5">★ {beach.cb_rating.toFixed(1)}</div>
)}
```

- [ ] **Step 3: `near/[village]/page.tsx`**

La carte (L117-142) conditionne l'image sur `beach.image_url &&` avec un `<img src={beach.image_url}>`. Remplacer la condition par `{(beach.cb_photo ?? beach.image_url) && (` et `src={beach.image_url}` par `src={beach.cb_photo ?? beach.image_url}`. Après le `<h2>` du nom (L129-131), ajouter :

```tsx
{beach.cb_rating != null && beach.cb_rating > 0 && (
  <div className="text-xs text-amber-700 mt-0.5">★ {beach.cb_rating.toFixed(1)}</div>
)}
```

> `near` enrichit chaque beach par spread (`...b`) dans `nearbyBeaches`, donc `cb_rating`/`cb_photo` sont conservés.

- [ ] **Step 4: Vérifier types + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build OK (0 erreur). En l'absence de `.env.local` dans le worktree, un échec `supabaseUrl required` sur `opengraph-image` est pré-existant et hors périmètre — vérifier alors uniquement `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/beaches/page.tsx" "src/app/[locale]/beaches/best-for/[activity]/page.tsx" "src/app/[locale]/beaches/near/[village]/page.tsx"
git commit -m "feat: note cb + photo cb sur les listes (beaches, best-for, near)"
```

---

## Task 8 : swim-today via le lien figé

**Files:**
- Modify: `src/lib/swim-today.ts`

- [ ] **Step 1: Basculer le match sur cb_slug**

Dans `src/lib/swim-today.ts`, remplacer l'import `matchCbBeaches` par `matchCbBySlug` :

```typescript
import {
  fetchCbBeaches,
  matchCbBySlug,
  shelterFactor,
  type CbBeachAttrs,
} from "./cb-beach-match";
```

Puis dans `buildSwimToday`, remplacer la ligne :

```typescript
const cbMatch = matchCbBeaches(beaches, cbRows);
```

par :

```typescript
const cbMatch = matchCbBySlug(beaches, cbRows);
```

> `matchCbBySlug` utilise le lien figé quand il existe et retombe sur l'appariement GPS sinon : aucune régression pour les plages non encore appariées.

- [ ] **Step 2: Vérifier types + tests**

Run: `npx tsc --noEmit && npm test`
Expected: 0 erreur TS, tous les tests verts.

- [ ] **Step 3: Commit**

```bash
git add src/lib/swim-today.ts
git commit -m "feat: swim-today utilise le lien cb figé (fallback GPS)"
```

---

## Clôture

- [ ] **Vérification finale**

Run: `npx tsc --noEmit && npm test`
Expected: 0 erreur, tous les tests verts.

- [ ] **Livraison à Kami (hors code, owner Kami)**
  1. Appliquer la migration `20260616180000_beaches_cb_link.sql` sur le VPS.
  2. Lancer `scripts/match-beaches-cb.ts`, relire `scripts/out/match-beaches-cb.review.md`, compléter/élaguer.
  3. Appliquer `match-beaches-cb.high.sql` + les choix de revue sur le VPS, puis `notify pgrst, 'reload schema'`.
  4. Merge `feat/beaches-cb-enrichment` → `master` → `main` (déploiement conscient).

> Tant que les `cb_slug` ne sont pas remplis en base, le site fonctionne à l'identique (dégradation gracieuse). L'enrichissement s'active plage par plage à mesure du remplissage.
