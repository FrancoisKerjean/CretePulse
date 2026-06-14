# Refonte page `/explore/[slug]` — Bento par famille — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le rendu prose pleine page de `/[locale]/explore/[slug]` par une grille bento quasi-zéro-texte (cellules data/photos/carte), avec layout choisi par **famille** de `place_type`, le texte long replié dans un accordéon, et les tuiles dérivées enrichies par LLM stockées en base.

**Architecture:** Un composant routeur `ExploreBento` choisit une des 5 variantes de layout selon `familyOf(place.place_type)` (beach / heritage / nature / village / default). Chaque variante compose des cellules partagées (`HeroCell`, `Tile`, `MapCell`, `PhotoCell`, `NearbyCell`, `DetailCell`). Les valeurs de tuiles dérivées (siècle, date frescoes, longueur, difficulté…) sont extraites par un script LLM (Claude Haiku) et stockées dans une colonne `cb_places.bento_tiles JSONB`. Le texte source nettoyé reste dans le DOM via un `<details>` natif (`ReadMoreAccordion`), SEO-safe.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, Tailwind CSS v4 (tokens `@theme` dans `globals.css`), Supabase (self-hosted, REST via `@supabase/supabase-js`), next/image, Claude Haiku (`claude-haiku-4-5-20251001`) via le helper `askClaude()` (sous-processus Python), Vitest (ajouté pour les helpers purs).

---

## Faits de cadrage (vérifiés le 2026-06-14)

Ces faits ont été vérifiés contre la base réelle et le code — ils corrigent plusieurs hypothèses du spec. **Les lire avant de coder.**

1. **`cb_places` = 2296 lignes, PAS 24K.** Les « 24K pages » = 2296 lieux × 22 langues + autres pages. Source : `SELECT count(*)` live sur `https://kairos-n8n.duckdns.org/cretepulse-db`.
2. **Distribution `place_type`** (desc) : `monastery` 641, `beach` 475, `gorge` 173, `archaeological-site` 137, `fort` 116, `museum` 104, `cave` 103, `town` 77, `activity` 76, `tradition` 76, `flora` 51, `fauna` 42, `lake` 36, `plateau` 32, `waterfall` 28, `forest` 27, `mountain` 27, `river` 22, `island` 16, `geological` 15, `lighthouse` 13, `mythology` 7, `other` 2.
3. **0 ligne `church`** (agia-pelagia est typé `monastery`) et **0 type `food/restaurant/cafe`** dans `cb_places`. → Les layouts `FoodBento` et « Churches » du spec sont **supprimés**. (Les restaurants vivent dans une table séparée `food_places`, hors périmètre de cette page.)
4. **Qualité données** : `rating > 0` sur 2183/2296 (95 %), `photos` sur 2287/2296 (99,6 %), `meta_description` 100 %. → Les tuiles note + photo + hero sont fiables sur tout le catalogue.
5. **L'URL Supabase est dans `.env.local`** (`NEXT_PUBLIC_SUPABASE_URL=https://kairos-n8n.duckdns.org/cretepulse-db`). Les scripts existants `enrich-descriptions.mjs` et `enrich-food-descriptions.mjs` contiennent une **URL périmée codée en dur** (`fzofxinjsuexjoxlwrhg.supabase.co`) — NE PAS la copier ; charger depuis `.env.local`.
6. **`fetch` Node est instable sur cet environnement Windows** pour les appels sortants. Le pattern prouvé (`enrich-food-descriptions.mjs`) délègue l'appel API à un sous-processus Python (`urllib`). On réutilise ce pattern pour l'appel LLM. (NB : `fetch` vers Supabase duckdns fonctionne ; l'instabilité concerne surtout `api.anthropic.com`.) **⚠️ `python` n'est PAS sur le PATH** (stub Microsoft Store inopérant, vérifié) : seul **`py`** fonctionne (Python 3.14). Le script détecte l'interpréteur au runtime. `~/.kairos-keys` existe et contient bien `ANTHROPIC_API_KEY` (vérifié).
7. **`cb_places` n'est PAS dans `supabase/schema.sql`** (le schéma ne contient que beaches/villages/hikes/food_places/events/news/newsletter_subscribers/weather_cache). La table a été créée hors de ce fichier (import scraper). → La migration `bento_tiles` s'applique **directement sur la base** (SQL Studio self-hosted), pas via `schema.sql`.
8. **La fiche `/explore/[slug]` n'utilise PAS next-intl** : elle a un dict `T` inline (en/fr/de/el + fallback EN), comme `src/lib/cb-type-labels.ts`. On suit ce pattern établi (voir Déviation D1).

## Mapping famille → `place_type` (validé Kami 2026-06-14)

| Famille | `place_type` couverts | Total | Tuiles signature |
|---|---|---|---|
| `beach` | beach | 475 | sable · eau · profondeur · mer · affluence · accès · note · distance ville |
| `heritage` | monastery, church, historical-site, archaeological-site, fort, museum, mythology, tradition | 1081 | siècle · date frescoes · marche · spécificité · note · distance ville |
| `nature` | gorge, cave, lake, waterfall, forest, mountain, river, plateau, island, geological, natural-park, nature | 479 | longueur · dénivelé · difficulté · durée · saison · note · distance ville |
| `village` | town | 77 | population · altitude · spécialité · note · distance grandes villes |
| `default` | flora, fauna, activity, lighthouse, other (+ tout type inconnu) | 184 | note · distance ville · photos · nearby (sans tuile enrichie obligatoire) |

Couverture « riche » (hors default) = 2112 / 2296 = **92 %**. `DefaultBento` est le fail-safe : il fonctionne **sans** `bento_tiles` (hero + note + distance + photos + nearby), donc aucune page n'est jamais cassée.

## Déviations assumées vs spec (à valider à l'exécution)

- **D1 — i18n par dictionnaire TS, pas next-intl.** Le spec demande un namespace `bento` dans les 22 `messages/*.json`. On suit plutôt le pattern établi `cb-type-labels.ts` : un module `src/lib/bento-labels.ts` (en/fr/de/el complets + fallback EN). Raison : (a) la fiche utilise déjà ce pattern inline, (b) éviter d'écrire 18 locales en placeholder anglais dans 22 fichiers, (c) le vocabulaire des tuiles est un petit ensemble fermé. Réversible. **Conséquence assumée** : sur les 18 autres locales (ar, cs, da, fi, hu, it, ja, ko, nl, no, pl, pt, ro, ru, es, sv, tr, zh), les labels de tuiles s'affichent en EN (fallback) — même comportement que le dict `T` actuel. À compléter pour les locales à fort trafic si besoin.
- **D6 — JSON-LD : aucun à préserver (le spec se trompe).** Le spec §106 affirme « le JSON-LD Place reste server-rendered comme actuellement » ; VÉRIFIÉ : la page actuelle n'a AUCUN JSON-LD (0 occurrence dans tout `explore/`). Il n'y a donc pas de régression. Un schema `TouristAttraction` serait un GAIN SEO réel sur 2296 fiches — ajouté en option (Task 5.5), à trancher par Kami.
- **D2 — Layouts par famille, pas par type littéral.** Voir faits 2-3 et mapping. Validé Kami.
- **D3 — Coût enrichissement ~$12 (2296 lieux), enrichissement par famille gaté qualité, pas de priorisation GSC.** Validé Kami.
- **D4 — MapCell = SVG Next dédié.** `CreteMiniMap.tsx` (Remotion) vit sur le VPS et dépend du runtime Remotion ; on écrit un SVG statique + projection lat/lng dédiée. Validé Kami.
- **D5 — Stockage `bento_tiles JSONB` (EN), dictionnaire d'unités côté front.** Conforme spec §i18n.

## ⛔ Pré-requis bloquants (owner Kami) — AVANT toute exécution de la Phase 1

La relecture adversariale (2026-06-14) a confirmé **en live** deux blocages durs. **Aucun run d'enrichissement de la Phase 1 ne peut tourner tant qu'ils ne sont pas levés :**

1. **Colonne `bento_tiles` (DDL).** `cb_places` n'est pas dans `schema.sql` et l'anon key ne peut pas exécuter de DDL. Kami crée la colonne sur la base self-hosted (Supabase Studio de `kairos-n8n.duckdns.org`, ou psql sur le VPS) : `ALTER TABLE cb_places ADD COLUMN IF NOT EXISTS bento_tiles JSONB;`
2. **Clé d'écriture self-hosted.** VÉRIFIÉ : l'anon key (seule dans `.env.local`) reçoit `permission denied for table cb_places` (RLS, code 42501). Il n'existe **aucune** clé write pour la base cretepulse sur la machine — la `SUPABASE_SERVICE_ROLE_KEY` de `~/.kairos-keys` appartient à un **autre projet** (`duupvqvnjvbshbpryejw`), et `~/.kairos-keys` n'a qu'un `KMCP_CRETEPULSE_ANON_KEY`. Kami fournit une clé write (service_role ou rôle dédié) de la base self-hosted, ajoutée à `.env.local` sous **`CRETEPULSE_SERVICE_ROLE_KEY`**.

Tant que (1) et (2) ne sont pas faits : les helpers purs (Tasks 1.1-1.3, testables hors-ligne), tout le socle UI (Phase 2+) et le script lui-même peuvent être écrits — mais **le run d'enrichissement (Task 1.5 Step 6+) reste bloqué**.

## File Structure

**Créés :**
- `src/lib/bento-tiles.ts` — type `BentoTiles`, `BentoFamily`, `familyOf()`.
- `src/lib/crete-geo.ts` — `CRETE_BBOX`, `projectCreteLatLng()`, `toRoman()`.
- `src/lib/crete-towns.ts` — `CRETE_TOWNS`, `nearestKnownTown()`.
- `src/lib/bento-labels.ts` — labels/unités localisés des tuiles + libellé accordéon.
- `src/components/explore/bento/ExploreBento.tsx` — routeur famille (RSC).
- `src/components/explore/bento/BeachBento.tsx`
- `src/components/explore/bento/HeritageBento.tsx`
- `src/components/explore/bento/NatureBento.tsx`
- `src/components/explore/bento/VillageBento.tsx`
- `src/components/explore/bento/DefaultBento.tsx`
- `src/components/explore/bento/shared/HeroCell.tsx`
- `src/components/explore/bento/shared/Tile.tsx`
- `src/components/explore/bento/shared/MapCell.tsx`
- `src/components/explore/bento/shared/PhotoCell.tsx`
- `src/components/explore/bento/shared/NearbyCell.tsx`
- `src/components/explore/bento/shared/DetailCell.tsx`
- `src/components/explore/bento/shared/ReadMoreAccordion.tsx`
- `scripts/enrich-bento-tiles.mjs` — enrichissement LLM par famille.
- `vitest.config.ts` + `src/lib/__tests__/*.test.ts`.

**Modifiés :**
- `src/lib/cb-places.ts` — ajouter `bento_tiles` à l'interface `CbPlace`.
- `src/app/[locale]/explore/[slug]/page.tsx` — remplacer le rendu prose par `<ExploreBento>` + `<ReadMoreAccordion>`.
- `package.json` — devDep `vitest` + script `test`.

**Base (hors repo) :** `cb_places.bento_tiles JSONB` via SQL Studio self-hosted.

---

## PHASE 0 — Préparation branche + outillage test

### Task 0.1 : Branche de travail

**Files:** aucun (git).

- [ ] **Step 1 : Créer la branche depuis `master`**

```bash
git fetch origin
git checkout -B feat/explore-bento-foundation origin/master
```

- [ ] **Step 2 : Vérifier le point de départ**

Run: `git log --oneline -1`
Expected: le HEAD pointe sur le dernier commit de `origin/master`.

### Task 0.2 : Installer Vitest (TDD des helpers purs)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1 : Ajouter la dépendance**

Run: `npm install -D vitest`

- [ ] **Step 2 : Ajouter le script `test`**

Dans `package.json`, section `scripts`, ajouter après `"lint": "eslint"` :

```json
    "lint": "eslint",
    "test": "vitest run"
```

- [ ] **Step 3 : Créer `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4 : Vérifier que le runner démarre (0 test)**

Run: `npx vitest run`
Expected: « No test files found » (ou exit 0). Le runner est opérationnel.

- [ ] **Step 5 : Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for bento helper unit tests"
```

---

## PHASE 1 — Données : helpers purs, migration, enrichissement pilote (monastery)

Phase data AVANT toute UI (contrainte CLAUDE.md). On valide la qualité des tuiles dérivées sur la famille `heritage` (pilote `monastery`, 641 lieux) avant de coder les layouts.

### Task 1.1 : Type `BentoTiles` + `familyOf()`

**Files:**
- Create: `src/lib/bento-tiles.ts`
- Test: `src/lib/__tests__/bento-tiles.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/__tests__/bento-tiles.test.ts
import { describe, it, expect } from "vitest";
import { familyOf } from "../bento-tiles";

describe("familyOf", () => {
  it("maps beach to beach", () => expect(familyOf("beach")).toBe("beach"));
  it("maps monastery and museum to heritage", () => {
    expect(familyOf("monastery")).toBe("heritage");
    expect(familyOf("museum")).toBe("heritage");
    expect(familyOf("archaeological-site")).toBe("heritage");
    expect(familyOf("tradition")).toBe("heritage");
  });
  it("maps gorge/cave/waterfall to nature", () => {
    expect(familyOf("gorge")).toBe("nature");
    expect(familyOf("cave")).toBe("nature");
    expect(familyOf("waterfall")).toBe("nature");
  });
  it("maps town to village", () => expect(familyOf("town")).toBe("village"));
  it("maps unknown/flora/lighthouse to default", () => {
    expect(familyOf("flora")).toBe("default");
    expect(familyOf("lighthouse")).toBe("default");
    expect(familyOf("totally-unknown-type")).toBe("default");
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `npx vitest run src/lib/__tests__/bento-tiles.test.ts`
Expected: FAIL — `familyOf is not a function` (module absent).

- [ ] **Step 3 : Implémenter**

```ts
// src/lib/bento-tiles.ts
// Tuiles dérivées par LLM (stockées en EN dans cb_places.bento_tiles JSONB).
// Champs tous optionnels : chaque famille n'en remplit qu'un sous-ensemble.

export type BentoFamily = "beach" | "heritage" | "nature" | "village" | "default";

export interface BentoTiles {
  // heritage
  century?: number | null;          // 14 -> rendu "XIV"
  frescoes_date?: string | null;    // "1360"
  walking_minutes?: number | null;  // 5
  unique_feature?: string | null;   // phrase courte EN, ex "Sinners painted near the entrance"
  // nature
  length_km?: number | null;
  elevation_m?: number | null;
  difficulty?: "easy" | "moderate" | "hard" | null;
  duration_minutes?: number | null;
  season?: string | null;           // EN, ex "May–Oct"
  // village
  population?: number | null;
  altitude_m?: number | null;
  specialty?: string | null;        // EN court, ex "Famous for chestnuts"
  // commun / fallback
  access_note?: string | null;      // EN court, ex "Reached on foot via village alleys"
}

const HERITAGE = new Set([
  "monastery", "church", "historical-site", "archaeological-site",
  "fort", "museum", "mythology", "tradition",
]);
const NATURE = new Set([
  "gorge", "cave", "lake", "waterfall", "forest", "mountain",
  "river", "plateau", "island", "geological", "natural-park", "nature",
]);

export function familyOf(placeType: string | null | undefined): BentoFamily {
  if (placeType === "beach") return "beach";
  if (placeType === "town") return "village";
  if (placeType && HERITAGE.has(placeType)) return "heritage";
  if (placeType && NATURE.has(placeType)) return "nature";
  return "default";
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `npx vitest run src/lib/__tests__/bento-tiles.test.ts`
Expected: PASS (5 tests verts).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/bento-tiles.ts src/lib/__tests__/bento-tiles.test.ts
git commit -m "feat(bento): BentoTiles type + familyOf place_type mapping"
```

### Task 1.2 : Projection Crète + chiffres romains

**Files:**
- Create: `src/lib/crete-geo.ts`
- Test: `src/lib/__tests__/crete-geo.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/__tests__/crete-geo.test.ts
import { describe, it, expect } from "vitest";
import { projectCreteLatLng, toRoman } from "../crete-geo";

describe("projectCreteLatLng", () => {
  it("places Heraklion (35.34, 25.14) in the north-central band", () => {
    const { x, y } = projectCreteLatLng(35.3387, 25.1442);
    expect(x).toBeGreaterThan(50);   // est-central
    expect(x).toBeLessThan(65);
    expect(y).toBeLessThan(45);      // nord => haut
  });
  it("places agia-pelagia (35.05, 25.41) east-central and lower", () => {
    const { x, y } = projectCreteLatLng(35.0546, 25.4094);
    expect(x).toBeGreaterThan(60);
    expect(y).toBeGreaterThan(60);   // sud => bas
  });
  it("clamps out-of-box coords into [0,100]", () => {
    const { x, y } = projectCreteLatLng(10, 10);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(100);
  });
});

describe("toRoman", () => {
  it("converts centuries", () => {
    expect(toRoman(14)).toBe("XIV");
    expect(toRoman(4)).toBe("IV");
    expect(toRoman(19)).toBe("XIX");
  });
  it("returns empty for non-positive", () => expect(toRoman(0)).toBe(""));
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/__tests__/crete-geo.test.ts`
Expected: FAIL (module absent).

- [ ] **Step 3 : Implémenter**

```ts
// src/lib/crete-geo.ts
// Projection lat/lng -> coords % sur une mini-carte de Crète (origine en haut-gauche,
// y inversé pour que le nord soit en haut). BBOX = enveloppe approx. de la Crète.

export const CRETE_BBOX = { west: 23.45, east: 26.35, south: 34.80, north: 35.70 };

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function projectCreteLatLng(lat: number, lng: number): { x: number; y: number } {
  const { west, east, south, north } = CRETE_BBOX;
  const x = ((lng - west) / (east - west)) * 100;
  const y = ((north - lat) / (north - south)) * 100;
  return { x: clamp(x), y: clamp(y) };
}

export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  const table: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"],
    [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"],
    [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let rest = Math.floor(n);
  for (const [val, sym] of table) {
    while (rest >= val) { out += sym; rest -= val; }
  }
  return out;
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `npx vitest run src/lib/__tests__/crete-geo.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/crete-geo.ts src/lib/__tests__/crete-geo.test.ts
git commit -m "feat(bento): Crete lat/lng projection + toRoman helper"
```

### Task 1.3 : `nearestKnownTown()`

**Files:**
- Create: `src/lib/crete-towns.ts`
- Test: `src/lib/__tests__/crete-towns.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// src/lib/__tests__/crete-towns.test.ts
import { describe, it, expect } from "vitest";
import { nearestKnownTown } from "../crete-towns";

describe("nearestKnownTown", () => {
  it("returns Ierapetra for a south-east coast point near it", () => {
    const r = nearestKnownTown(35.01, 25.74);
    expect(r?.name).toBe("Ierapetra");
    expect(r?.km).toBeLessThan(3);
  });
  it("returns Heraklion for a point in the capital", () => {
    expect(nearestKnownTown(35.3387, 25.1442)?.name).toBe("Heraklion");
  });
  it("returns Ano Viannos for the pilot monastery (35.0546, 25.4094)", () => {
    const r = nearestKnownTown(35.0546, 25.4094);
    expect(r?.name).toBe("Ano Viannos");
    expect(r?.km).toBeLessThan(2);
  });
  it("returns null when coords are missing", () => {
    expect(nearestKnownTown(null, 25)).toBeNull();
    expect(nearestKnownTown(35, null)).toBeNull();
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/__tests__/crete-towns.test.ts`
Expected: FAIL.

- [ ] **Step 3 : Implémenter**

```ts
// src/lib/crete-towns.ts
// Villes/bourgs de référence pour la tuile "distance ville". Liste curée (les
// principales agglomérations de Crète) : on veut "12 km d'Ierapetra", pas la
// distance à un hameau anonyme. Coords WGS84.
import { haversineKm } from "./geo";

export const CRETE_TOWNS: Array<{ name: string; lat: number; lon: number }> = [
  { name: "Heraklion", lat: 35.3387, lon: 25.1442 },
  { name: "Chania", lat: 35.5138, lon: 24.018 },
  { name: "Rethymno", lat: 35.3662, lon: 24.4777 },
  { name: "Agios Nikolaos", lat: 35.1894, lon: 25.7156 },
  { name: "Ierapetra", lat: 35.0107, lon: 25.7355 },
  { name: "Sitia", lat: 35.208, lon: 26.1027 },
  { name: "Hersonissos", lat: 35.3217, lon: 25.3853 },
  { name: "Malia", lat: 35.287, lon: 25.459 },
  { name: "Elounda", lat: 35.2603, lon: 25.7228 },
  { name: "Paleochora", lat: 35.228, lon: 23.684 },
  { name: "Kissamos", lat: 35.4942, lon: 23.6558 },
  { name: "Tympaki", lat: 35.07, lon: 24.766 },
  { name: "Mires", lat: 35.053, lon: 24.9 },
  { name: "Ano Viannos", lat: 35.057, lon: 25.412 },
  { name: "Arvi", lat: 34.992, lon: 25.456 },
  { name: "Spili", lat: 35.214, lon: 24.533 },
  { name: "Anogeia", lat: 35.288, lon: 24.884 },
  { name: "Zaros", lat: 35.13, lon: 24.905 },
];

export function nearestKnownTown(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { name: string; km: number } | null {
  if (lat == null || lng == null) return null;
  let best: { name: string; km: number } | null = null;
  for (const t of CRETE_TOWNS) {
    const km = haversineKm([t.lat, t.lon], [lat, lng]);
    if (!best || km < best.km) best = { name: t.name, km };
  }
  return best;
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `npx vitest run src/lib/__tests__/crete-towns.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/crete-towns.ts src/lib/__tests__/crete-towns.test.ts
git commit -m "feat(bento): nearestKnownTown helper over curated Crete towns"
```

### Task 1.4 : Migration `bento_tiles JSONB`

**Files:**
- Modify: `src/lib/cb-places.ts` (interface `CbPlace`)
- Base : `cb_places.bento_tiles` (SQL hors repo)

- [ ] **Step 1 : Appliquer la migration sur la base**

⚠️ DDL — nécessite l'accès SQL élevé (Supabase Studio self-hosted sur `https://kairos-n8n.duckdns.org`, ou psql sur le VPS). À exécuter par Kami (ou avec le service_role) :

```sql
ALTER TABLE cb_places ADD COLUMN IF NOT EXISTS bento_tiles JSONB;
```

- [ ] **Step 2 : Vérifier que la colonne existe et est lisible en anon**

Créer un script jetable `scripts/_verify_bento_col.mjs` :

```js
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = {};
for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data, error } = await sb.from("cb_places").select("slug, bento_tiles").limit(1);
console.log(error ? "ERROR: " + error.message : "OK column readable:", data);
```

Run: `node scripts/_verify_bento_col.mjs` (réseau requis ; si le sandbox bloque, exécuter hors sandbox).
Expected: `OK column readable: [ { slug: '...', bento_tiles: null } ]` (et non une erreur « column does not exist »).

- [ ] **Step 3 : Tester l'écriture (RLS) — GATE BLOQUANTE**

⚠️ VÉRIFIÉ LIVE : l'anon key reçoit `permission denied for table cb_places` (RLS, code 42501). L'écriture exige `CRETEPULSE_SERVICE_ROLE_KEY` (voir Pré-requis bloquants). Modifier le script de vérif pour l'utiliser, puis :

```js
const wsb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.CRETEPULSE_SERVICE_ROLE_KEY);
const probe = await wsb.from("cb_places").update({ bento_tiles: { _probe: true } }).eq("slug", "agia-pelagia-church-at-ano-viannos").select("slug");
console.log("write probe:", probe.error ? "BLOCKED: " + probe.error.message : "OK");
await wsb.from("cb_places").update({ bento_tiles: null }).eq("slug", "agia-pelagia-church-at-ano-viannos");
```

Run: `node scripts/_verify_bento_col.mjs`
Expected: `write probe: OK`. **Tant que ce probe n'est pas OK, NE PAS lancer Task 1.5** (l'enrichissement échouerait à 100 % et consommerait des tokens Claude pour rien).

- [ ] **Step 4 : Ajouter `bento_tiles` à l'interface `CbPlace`**

Dans `src/lib/cb-places.ts`, ajouter l'import et le champ :

```ts
import { supabase } from "./supabase";
import type { BentoTiles } from "./bento-tiles";
```

Et dans l'interface `CbPlace extends CbPlaceListItem` (après `source_url`) :

```ts
export interface CbPlace extends CbPlaceListItem {
  meta_description: string | null;
  description: string | null;
  other_info: string | null;
  source_url: string | null;
  bento_tiles: BentoTiles | null;
}
```

(`getCbPlaceBySlug` fait déjà `select("*")` → `bento_tiles` est retourné automatiquement.)

- [ ] **Step 5 : Typecheck + nettoyage + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
rm -f scripts/_verify_bento_col.mjs
git add src/lib/cb-places.ts
git commit -m "feat(bento): add bento_tiles JSONB to CbPlace (migration applied)"
```

### Task 1.5 : Script d'enrichissement LLM par famille (`scripts/enrich-bento-tiles.mjs`)

**Files:**
- Create: `scripts/enrich-bento-tiles.mjs`
- Test: `src/lib/__tests__/bento-extract.test.ts` (parser de réponse pur)
- Create: `src/lib/bento-extract.ts` (parser pur réutilisé par le script + testé)

- [ ] **Step 1 : Test du parser de réponse Claude (pur)**

```ts
// src/lib/__tests__/bento-extract.test.ts
import { describe, it, expect } from "vitest";
import { parseClaudeJsonArray } from "../bento-extract";

describe("parseClaudeJsonArray", () => {
  it("parses a bare JSON array", () => {
    const r = parseClaudeJsonArray('[{"slug":"a","tiles":{"century":14}}]');
    expect(r[0].tiles.century).toBe(14);
  });
  it("strips markdown fences", () => {
    const r = parseClaudeJsonArray('```json\n[{"slug":"b","tiles":{}}]\n```');
    expect(r[0].slug).toBe("b");
  });
  it("throws on non-array", () => {
    expect(() => parseClaudeJsonArray('{"slug":"x"}')).toThrow();
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/__tests__/bento-extract.test.ts`
Expected: FAIL.

- [ ] **Step 3 : Implémenter le parser pur**

```ts
// src/lib/bento-extract.ts
import type { BentoTiles } from "./bento-tiles";

export interface EnrichRow { slug: string; tiles: BentoTiles }

export function parseClaudeJsonArray(raw: string): EnrichRow[] {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("Claude response is not a JSON array");
  return parsed as EnrichRow[];
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `npx vitest run src/lib/__tests__/bento-extract.test.ts`
Expected: PASS.

- [ ] **Step 5 : Écrire le script d'enrichissement**

```js
// scripts/enrich-bento-tiles.mjs
/**
 * Enrichit cb_places.bento_tiles par famille via Claude Haiku.
 * Usage : node scripts/enrich-bento-tiles.mjs --family heritage [--limit 50] [--force]
 * Familles : heritage | nature | village | beach
 * Idempotent : skip les lieux dont bento_tiles IS NOT NULL (sauf --force).
 * Charge l'URL+clé Supabase depuis .env.local (PAS d'URL codée en dur).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

// --- args ---
const args = process.argv.slice(2);
const getArg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const FAMILY = getArg("--family", "heritage");
const TYPE = getArg("--type", null); // pilote sur 1 SEUL place_type (ex monastery) ; sinon toute la famille
const LIMIT = parseInt(getArg("--limit", "50"), 10);
const FORCE = args.includes("--force");
const BATCH = 10;
const DELAY_MS = 3000;

// --- supabase depuis .env.local ---
const env = {};
for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
// Clé WRITE de la base cretepulse self-hosted. L'anon reçoit "permission denied"
// (RLS) sur cb_places (vérifié). NE PAS réutiliser SUPABASE_SERVICE_ROLE_KEY de
// ~/.kairos-keys : elle appartient à un AUTRE projet. Kami fournit cette clé dédiée.
const SUPA_KEY = env.CRETEPULSE_SERVICE_ROLE_KEY;
if (!SUPA_KEY) {
  console.error("ABORT: CRETEPULSE_SERVICE_ROLE_KEY absente de .env.local — clé write self-hosted requise (l'anon est bloquée par RLS). Voir Pré-requis bloquants.");
  process.exit(1);
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, SUPA_KEY);

// `python` est un stub Microsoft Store inopérant sur cet env ; seul `py` marche.
const PY = (() => { try { execSync("py --version", { stdio: "ignore" }); return "py"; } catch { return "python"; } })();

// --- familles -> types + schéma de prompt ---
const FAMILY_TYPES = {
  heritage: ["monastery", "church", "historical-site", "archaeological-site", "fort", "museum", "mythology", "tradition"],
  nature: ["gorge", "cave", "lake", "waterfall", "forest", "mountain", "river", "plateau", "island", "geological", "natural-park", "nature"],
  village: ["town"],
  beach: ["beach"],
};
const FAMILY_SCHEMA = {
  heritage: `{ "century": number|null (siècle de construction, ex 14), "frescoes_date": string|null (année des fresques, ex "1360"), "walking_minutes": number|null (minutes de marche pour y accéder), "unique_feature": string|null (UNE phrase courte EN sur un détail rare), "access_note": string|null (EN court) }`,
  nature: `{ "length_km": number|null, "elevation_m": number|null, "difficulty": "easy"|"moderate"|"hard"|null, "duration_minutes": number|null, "season": string|null (EN, ex "May–Oct"), "access_note": string|null }`,
  village: `{ "population": number|null, "altitude_m": number|null, "specialty": string|null (EN court), "access_note": string|null }`,
  beach: `{ "access_note": string|null (EN court), "unique_feature": string|null (EN court) }`,
};

const types = FAMILY_TYPES[FAMILY];
if (!types) { console.error("Famille inconnue:", FAMILY); process.exit(1); }

// --- appel Claude via Python (fetch Node instable sur ce Windows) ---
function askClaude(prompt) {
  const body = JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  const payloadFile = join(homedir(), ".claude-payload.json");
  const responseFile = join(homedir(), ".claude-response.json");
  const pyFile = join(homedir(), ".claude-api-call.py");
  writeFileSync(payloadFile, body, "utf8");
  const pyScript = `
import urllib.request, ssl, os, sys
ctx = ssl.create_default_context()
api_key = ""
with open(os.path.expanduser("~/.kairos-keys")) as f:
    for line in f:
        if line.startswith("ANTHROPIC_API_KEY="):
            api_key = line.split("=",1)[1].strip()
with open(os.path.expanduser("~/.claude-payload.json"), "rb") as f:
    data = f.read()
req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=data,
    headers={"Content-Type":"application/json","x-api-key":api_key,"anthropic-version":"2023-06-01"}, method="POST")
resp = urllib.request.urlopen(req, timeout=120, context=ctx)
with open(os.path.expanduser("~/.claude-response.json"), "wb") as f:
    f.write(resp.read())
`;
  writeFileSync(pyFile, pyScript, "utf8");
  try {
    execSync(`${PY} "${pyFile}"`, { timeout: 150000, stdio: ["pipe", "pipe", "inherit"] });
  } catch (e) {
    throw new Error("Python API call failed: " + (e.stderr?.toString() || "").slice(0, 500));
  }
  const raw = readFileSync(responseFile, "utf8");
  try { unlinkSync(payloadFile); unlinkSync(responseFile); unlinkSync(pyFile); } catch {}
  const data = JSON.parse(raw);
  if (data.error) throw new Error(data.error.message || "Claude API error");
  return data.content?.[0]?.text || "";
}

function parseClaudeJsonArray(raw) {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("not a JSON array");
  return parsed;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log(`--- enrich-bento-tiles family=${FAMILY} type=${TYPE ?? "*"} limit=${LIMIT} force=${FORCE} py=${PY} ---`);
  let q = supabase.from("cb_places")
    .select("slug, name, place_type, description")
    .order("slug")
    .limit(LIMIT);
  q = TYPE ? q.eq("place_type", TYPE) : q.in("place_type", types);
  if (!FORCE) q = q.is("bento_tiles", null);
  const { data: places, error } = await q;
  if (error) { console.error("fetch error:", error.message); process.exit(1); }
  if (!places?.length) { console.log("Rien à enrichir."); return; }
  console.log(`${places.length} lieux à traiter`);

  let updated = 0, errors = 0;
  for (let b = 0; b < Math.ceil(places.length / BATCH); b++) {
    const batch = places.slice(b * BATCH, (b + 1) * BATCH);
    const list = batch.map((p) => `- slug: ${p.slug} | name: "${p.name}" | type: ${p.place_type}\n  description: ${(p.description || "").slice(0, 900)}`).join("\n");
    const prompt = `Extract structured tile data for these Crete places from their description.
For each place return an object { "slug": string, "tiles": ${FAMILY_SCHEMA[FAMILY]} }.
Rules: use ONLY facts present in the description; put null when a field is absent; keep text fields in ENGLISH and very short (max ~8 words); numbers as raw numbers (no units).
Return ONLY a valid JSON array, no markdown fences, no commentary.

Places:
${list}`;
    let rows;
    try {
      console.log(`Batch ${b + 1}: appel Claude (${batch.length})...`);
      rows = parseClaudeJsonArray(askClaude(prompt));
    } catch (e) {
      console.error(`  batch ${b + 1} erreur:`, e.message); errors += batch.length;
      if (b < Math.ceil(places.length / BATCH) - 1) await sleep(DELAY_MS);
      continue;
    }
    for (const row of rows) {
      if (!row.slug || !row.tiles) { errors++; continue; }
      const { error: uErr } = await supabase.from("cb_places").update({ bento_tiles: row.tiles }).eq("slug", row.slug);
      if (uErr) { console.error(`  update ${row.slug}: ${uErr.message}`); errors++; }
      else { console.log(`  OK ${row.slug}`); updated++; }
    }
    if (b < Math.ceil(places.length / BATCH) - 1) await sleep(DELAY_MS);
  }
  console.log(`--- Done. updated=${updated} errors=${errors} ---`);
}
run().catch(console.error);
```

- [ ] **Step 6 : Run pilote sur 10 monastères**

⚠️ Pré-requis : colonne `bento_tiles` créée (Task 1.4 Step 1) + `CRETEPULSE_SERVICE_ROLE_KEY` dans `.env.local` (sinon le script abort AVANT de consommer des tokens Claude).

Run: `node scripts/enrich-bento-tiles.mjs --type monastery --limit 10` (réseau requis ; hors sandbox si besoin). Le flag `--type monastery` cible **10 vrais monastères** ; sans lui, `--family heritage --limit 10` mélangerait 8 types (mythology/tradition/fort…).
Expected: `updated=10 errors=0` (ou proche). Inspecter 2-3 lieux : vérifier que `agia-pelagia-church-at-ano-viannos` a `{ century: 14, frescoes_date: "1360", walking_minutes: ~5, unique_feature: "...sinners near the entrance" }`.

- [ ] **Step 7 : GATE QUALITÉ (validation Kami)**

Présenter à Kami 5 lieux enrichis (slug + tiles). **Ne rien dérouler** tant que la qualité n'est pas validée. Si OK → enrichir toute la famille heritage (**1081 lieux**, pas 641). PostgREST plafonne chaque requête à 1000 lignes : relancer `node scripts/enrich-bento-tiles.mjs --family heritage --limit 1000` en boucle jusqu'à « Rien à enrichir » (l'idempotence `.is("bento_tiles", null)` fait avancer le curseur à chaque run).

- [ ] **Step 8 : Commit**

```bash
git add scripts/enrich-bento-tiles.mjs src/lib/bento-extract.ts src/lib/__tests__/bento-extract.test.ts
git commit -m "feat(bento): LLM enrichment script (per-family) + pure JSON parser"
```

---

## PHASE 2 — UI socle : cellules partagées + routeur + HeritageBento (pilote)

Branche : continuer sur `feat/explore-bento-foundation` (ou nouvelle `feat/explore-bento-heritage` depuis master selon préférence Kami ; le plan suppose une seule branche socle qui part en preview).

### Task 2.1 : `bento-labels.ts`

**Files:**
- Create: `src/lib/bento-labels.ts`

- [ ] **Step 1 : Implémenter le dictionnaire (en/fr/de/el + fallback EN)**

```ts
// src/lib/bento-labels.ts
// Labels/unités localisés des tuiles bento + libellé accordéon.
// Pattern aligné sur cb-type-labels.ts (en/fr/de/el complets, fallback EN).

type Dict = Record<string, Record<string, string>>;

const LABELS: Dict = {
  rating:        { en: "rating", fr: "note", de: "Bewertung", el: "βαθμός" },
  century:       { en: "century", fr: "siècle", de: "Jahrh.", el: "αιώνας" },
  frescoes:      { en: "frescoes", fr: "fresques", de: "Fresken", el: "τοιχογ." },
  distanceTown:  { en: "from town", fr: "de la ville", de: "vom Ort", el: "από πόλη" },
  walk:          { en: "on foot", fr: "à pied", de: "zu Fuß", el: "με τα πόδια" },
  length:        { en: "length", fr: "longueur", de: "Länge", el: "μήκος" },
  elevation:     { en: "elevation", fr: "dénivelé", de: "Höhe", el: "υψόμετρο" },
  difficulty:    { en: "difficulty", fr: "difficulté", de: "Schwierigkeit", el: "δυσκολία" },
  duration:      { en: "duration", fr: "durée", de: "Dauer", el: "διάρκεια" },
  season:        { en: "season", fr: "saison", de: "Saison", el: "εποχή" },
  population:    { en: "people", fr: "habitants", de: "Einwohner", el: "κάτοικοι" },
  altitude:      { en: "altitude", fr: "altitude", de: "Höhe", el: "υψόμετρο" },
  sand:          { en: "sand", fr: "sable", de: "Sand", el: "άμμος" },
  water:         { en: "water", fr: "eau", de: "Wasser", el: "νερό" },
  depth:         { en: "depth", fr: "profondeur", de: "Tiefe", el: "βάθος" },
  sea:           { en: "sea", fr: "mer", de: "Meer", el: "θάλασσα" },
  crowds:        { en: "crowds", fr: "affluence", de: "Andrang", el: "κόσμος" },
  access:        { en: "access", fr: "accès", de: "Zugang", el: "πρόσβαση" },
  rare:          { en: "Rare", fr: "Rare", de: "Selten", el: "Σπάνιο" },
  nearby:        { en: "nearby", fr: "à proximité", de: "in der Nähe", el: "κοντά" },
};

const DIFFICULTY: Dict = {
  easy:     { en: "Easy", fr: "Facile", de: "Leicht", el: "Εύκολο" },
  moderate: { en: "Moderate", fr: "Modéré", de: "Mittel", el: "Μέτριο" },
  hard:     { en: "Hard", fr: "Difficile", de: "Schwer", el: "Δύσκολο" },
};

const READ_MORE: Record<string, string> = {
  en: "Read the story", fr: "Lire l'histoire", de: "Die Geschichte lesen",
  el: "Διαβάστε την ιστορία", it: "Leggi la storia", es: "Leer la historia",
  nl: "Lees het verhaal", pt: "Ler a história",
};

export function bentoLabel(key: string, locale: string): string {
  return LABELS[key]?.[locale] || LABELS[key]?.en || key;
}
export function difficultyLabel(value: string, locale: string): string {
  return DIFFICULTY[value]?.[locale] || DIFFICULTY[value]?.en || value;
}
export function readMoreLabel(locale: string): string {
  return READ_MORE[locale] || READ_MORE.en;
}
export function nearbyCountLabel(n: number, locale: string): string {
  const word = bentoLabel("nearby", locale);
  return `${n} ${word}`;
}
```

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/lib/bento-labels.ts
git commit -m "feat(bento): localized tile labels dictionary"
```

### Task 2.2 : `Tile.tsx` (cellule data sémantique)

**Files:**
- Create: `src/components/explore/bento/shared/Tile.tsx`

- [ ] **Step 1 : Implémenter**

```tsx
// src/components/explore/bento/shared/Tile.tsx
import type { ReactNode } from "react";

export type TileVariant = "sand" | "terra" | "sun" | "lagoon" | "aegean";

const VARIANT: Record<TileVariant, string> = {
  sand: "bg-sand text-aegean border-sand-warm",
  terra: "bg-terra text-white border-terra",
  sun: "bg-sun text-night border-sun",
  lagoon: "bg-lagoon text-white border-lagoon",
  aegean: "bg-aegean text-white border-aegean",
};

export function Tile({
  icon, big, label, variant = "sand", className = "",
}: {
  icon?: ReactNode;
  big: ReactNode;
  label: string;
  variant?: TileVariant;
  className?: string;
}) {
  return (
    <dl
      className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center ${VARIANT[variant]} ${className}`}
    >
      {icon != null && (
        <span aria-hidden className="order-1 mb-1 text-lg leading-none">{icon}</span>
      )}
      {/* DOM : <dt> (terme) avant <dd> (définition) pour la sémantique ; ordre VISUEL (grande valeur au-dessus) via flex `order` */}
      <dt className="order-3 mt-1 text-[9px] uppercase tracking-wide opacity-80">{label}</dt>
      <dd className="order-2 m-0 font-heading text-xl font-bold leading-none">{big}</dd>
    </dl>
  );
}
```

NB : la classe utilitaire `font-heading` existe (définie via `@theme` dans `globals.css`, police **Baloo 2** chargée par `next/font` dans `layout.tsx`) et est utilisée dans ~38 fichiers. Pas de style inline nécessaire.

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/components/explore/bento/shared/Tile.tsx
git commit -m "feat(bento): Tile cell (semantic dl/dd, brand variants)"
```

### Task 2.3 : `HeroCell.tsx`

**Files:**
- Create: `src/components/explore/bento/shared/HeroCell.tsx`

- [ ] **Step 1 : Implémenter**

```tsx
// src/components/explore/bento/shared/HeroCell.tsx
import Image from "next/image";

export function HeroCell({
  name, tag, photo, className = "",
}: {
  name: string;
  tag: string;
  photo?: string | null;
  className?: string;
}) {
  return (
    <div className={`relative flex flex-col justify-end overflow-hidden rounded-2xl bg-aegean p-4 ${className}`}>
      {photo ? (
        <Image src={photo} alt={name} fill priority sizes="(max-width:768px) 100vw, 66vw" className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-aegean to-aegean-light" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
      <div className="relative z-10">
        <span className="mb-1.5 inline-block rounded-full bg-aegean/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          {tag}
        </span>
        <h1 className="font-heading text-2xl font-bold leading-tight text-white md:text-3xl">
          {name}
        </h1>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/components/explore/bento/shared/HeroCell.tsx
git commit -m "feat(bento): HeroCell (photo + tag + h1)"
```

### Task 2.4 : `MapCell.tsx` (SVG Crète + pin)

**Files:**
- Create: `src/components/explore/bento/shared/MapCell.tsx`

- [ ] **Step 1 : Implémenter**

```tsx
// src/components/explore/bento/shared/MapCell.tsx
import { projectCreteLatLng } from "@/lib/crete-geo";

// Silhouette stylisée de la Crète (viewBox 0 0 400 200), reprise du mockup colonne C.
const CRETE_PATH =
  "M30 110 Q70 80 120 95 Q170 100 210 85 Q260 70 310 95 Q360 110 380 100 L390 130 Q360 145 310 135 Q260 130 210 145 Q170 150 120 140 Q70 145 30 130 Z";

export function MapCell({
  lat, lng, label, className = "",
}: {
  lat: number | null;
  lng: number | null;
  label?: string | null;
  className?: string;
}) {
  const pin = lat != null && lng != null ? projectCreteLatLng(lat, lng) : null;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-aegean-faint to-stone ${className}`}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={CRETE_PATH} fill="#F2E7CE" stroke="#7C9A53" strokeWidth="1.5" opacity="0.85" />
      </svg>
      {pin && (
        <span
          className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-full rounded-full border-2 border-white bg-terra shadow-md"
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        />
      )}
      {label && (
        <span className="absolute bottom-2 left-3 z-10 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold text-aegean">
          {label}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/components/explore/bento/shared/MapCell.tsx
git commit -m "feat(bento): MapCell (inline Crete SVG + projected pin)"
```

### Task 2.5 : `PhotoCell.tsx`

**Files:**
- Create: `src/components/explore/bento/shared/PhotoCell.tsx`

- [ ] **Step 1 : Implémenter**

```tsx
// src/components/explore/bento/shared/PhotoCell.tsx
import Image from "next/image";

export function PhotoCell({
  src, alt, className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-sand-warm ${className}`}>
      <Image src={src} alt={alt} fill loading="lazy" sizes="(max-width:768px) 50vw, 33vw" className="object-cover" />
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/components/explore/bento/shared/PhotoCell.tsx
git commit -m "feat(bento): PhotoCell (lazy next/image, no caption)"
```

### Task 2.6 : `NearbyCell.tsx`

**Files:**
- Create: `src/components/explore/bento/shared/NearbyCell.tsx`

- [ ] **Step 1 : Implémenter**

```tsx
// src/components/explore/bento/shared/NearbyCell.tsx
import type { NearbyPlace } from "@/lib/cb-place-helpers";
import { nearbyCountLabel } from "@/lib/bento-labels";

export function NearbyCell({
  nearby, locale, className = "",
}: {
  nearby: NearbyPlace[];
  locale: string;
  className?: string;
}) {
  if (nearby.length === 0) return null;
  const names = nearby.slice(0, 3).map((n) => n.name).join(", ");
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-stone to-aegean-faint p-3 ${className}`}>
      <div
        className="h-16 w-16 flex-shrink-0 rounded-xl bg-aegean-faint"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 35%, #0B5E78 0 3px, transparent 4px), radial-gradient(circle at 60% 55%, #0B5E78 0 3px, transparent 4px), radial-gradient(circle at 50% 50%, #ED7A5C 0 4px, transparent 5px)",
        }}
      />
      <p className="font-heading text-sm font-bold leading-tight text-aegean">
        {nearbyCountLabel(nearby.length, locale)}
        <span className="mt-1 block text-[11px] font-normal text-text-muted">{names}</span>
      </p>
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/components/explore/bento/shared/NearbyCell.tsx
git commit -m "feat(bento): NearbyCell (count + first names + dotted mini-map)"
```

### Task 2.7 : `DetailCell.tsx`

**Files:**
- Create: `src/components/explore/bento/shared/DetailCell.tsx`

- [ ] **Step 1 : Implémenter**

```tsx
// src/components/explore/bento/shared/DetailCell.tsx
export function DetailCell({
  eyebrow, text, className = "",
}: {
  eyebrow: string;
  text: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col justify-center rounded-2xl bg-night p-4 text-white ${className}`}>
      <span className="mb-1.5 text-[9px] uppercase tracking-widest text-terra-light">{eyebrow}</span>
      <p className="font-heading text-sm font-bold leading-snug">{text}</p>
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/components/explore/bento/shared/DetailCell.tsx
git commit -m "feat(bento): DetailCell (night bg, eyebrow + one phrase)"
```

### Task 2.8 : `ReadMoreAccordion.tsx`

**Files:**
- Create: `src/components/explore/bento/shared/ReadMoreAccordion.tsx`

- [ ] **Step 1 : Implémenter (zéro-JS, `<details>` natif, texte indexable)**

```tsx
// src/components/explore/bento/shared/ReadMoreAccordion.tsx
import { ChevronDown } from "lucide-react";
import { readMoreLabel } from "@/lib/bento-labels";

export function ReadMoreAccordion({
  paragraphs, locale,
}: {
  paragraphs: string[];
  locale: string;
}) {
  if (paragraphs.length === 0) return null;
  return (
    <details className="group mt-4 rounded-2xl border border-border bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-heading text-sm font-bold text-aegean">
        {readMoreLabel(locale)}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-4 text-[15px] leading-7 text-text">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </details>
  );
}
```

NB SEO : le contenu est dans le DOM server-rendered (replié par le navigateur, pas `display:none`) → indexable. Vérifié contre l'acceptance criterion « innerText.length > 200 » (le texte du `<details>` compte dans `innerText`).

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/components/explore/bento/shared/ReadMoreAccordion.tsx
git commit -m "feat(bento): ReadMoreAccordion (native details, SEO-safe)"
```

### Task 2.9 : `HeritageBento.tsx`

**Files:**
- Create: `src/components/explore/bento/HeritageBento.tsx`

- [ ] **Step 1 : Implémenter**

```tsx
// src/components/explore/bento/HeritageBento.tsx
import type { CbPlace } from "@/lib/cb-places";
import type { NearbyPlace } from "@/lib/cb-place-helpers";
import { typeLabel } from "@/lib/cb-type-labels";
import { toRoman } from "@/lib/crete-geo";
import { nearestKnownTown } from "@/lib/crete-towns";
import { bentoLabel } from "@/lib/bento-labels";
import { HeroCell } from "./shared/HeroCell";
import { Tile } from "./shared/Tile";
import { MapCell } from "./shared/MapCell";
import { PhotoCell } from "./shared/PhotoCell";
import { NearbyCell } from "./shared/NearbyCell";
import { DetailCell } from "./shared/DetailCell";

export function HeritageBento({
  place, nearby, locale,
}: {
  place: CbPlace;
  nearby: NearbyPlace[];
  locale: string;
}) {
  const t = place.bento_tiles ?? {};
  const photos = place.photos ?? [];
  const town = nearestKnownTown(place.latitude, place.longitude);
  const tag = `${typeLabel(place.place_type, locale)}${place.prefecture ? ` · ${place.prefecture}` : ""}`;

  return (
    <section className="grid grid-cols-4 gap-2 md:grid-cols-6">
      <HeroCell name={place.name} tag={tag} photo={photos[0]} className="col-span-4 row-span-2 min-h-[220px] md:col-span-4" />

      {place.rating != null && place.rating > 0 && (
        <Tile variant="sun" icon="★" big={place.rating.toFixed(1)} label={bentoLabel("rating", locale)} className="col-span-2 md:col-span-1" />
      )}
      {t.century != null && (
        <Tile variant="aegean" icon="⛪" big={toRoman(t.century)} label={bentoLabel("century", locale)} className="col-span-2 md:col-span-1" />
      )}
      {t.frescoes_date && (
        <Tile variant="terra" icon="🎨" big={t.frescoes_date} label={bentoLabel("frescoes", locale)} className="col-span-2 md:col-span-1" />
      )}
      {town && (
        <Tile big={town.km < 10 ? town.km.toFixed(1) : Math.round(town.km)} label={`km · ${town.name}`} className="col-span-2 md:col-span-1" />
      )}
      {t.walking_minutes != null && (
        <Tile variant="lagoon" icon="🚶" big={`${t.walking_minutes}'`} label={bentoLabel("walk", locale)} className="col-span-2 md:col-span-1" />
      )}

      <MapCell lat={place.latitude} lng={place.longitude} label={town ? `${town.name}` : null} className="col-span-4 h-40 md:col-span-6" />

      {photos[1] && <PhotoCell src={photos[1]} alt={`${place.name} 2`} className="col-span-2 h-36" />}
      {t.unique_feature ? (
        <DetailCell eyebrow={bentoLabel("rare", locale)} text={t.unique_feature} className="col-span-2 h-36" />
      ) : (
        photos[2] && <PhotoCell src={photos[2]} alt={`${place.name} 3`} className="col-span-2 h-36" />
      )}

      <NearbyCell nearby={nearby} locale={locale} className="col-span-4 md:col-span-6" />
    </section>
  );
}
```

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/components/explore/bento/HeritageBento.tsx
git commit -m "feat(bento): HeritageBento layout"
```

### Task 2.10 : `DefaultBento.tsx` (fail-safe, sans tuiles enrichies)

**Files:**
- Create: `src/components/explore/bento/DefaultBento.tsx`

- [ ] **Step 1 : Implémenter**

```tsx
// src/components/explore/bento/DefaultBento.tsx
import type { CbPlace } from "@/lib/cb-places";
import type { NearbyPlace } from "@/lib/cb-place-helpers";
import { typeLabel } from "@/lib/cb-type-labels";
import { nearestKnownTown } from "@/lib/crete-towns";
import { bentoLabel } from "@/lib/bento-labels";
import { HeroCell } from "./shared/HeroCell";
import { Tile } from "./shared/Tile";
import { MapCell } from "./shared/MapCell";
import { PhotoCell } from "./shared/PhotoCell";
import { NearbyCell } from "./shared/NearbyCell";

export function DefaultBento({
  place, nearby, locale,
}: {
  place: CbPlace;
  nearby: NearbyPlace[];
  locale: string;
}) {
  const photos = place.photos ?? [];
  const town = nearestKnownTown(place.latitude, place.longitude);
  const tag = `${typeLabel(place.place_type, locale)}${place.prefecture ? ` · ${place.prefecture}` : ""}`;

  return (
    <section className="grid grid-cols-4 gap-2 md:grid-cols-6">
      <HeroCell name={place.name} tag={tag} photo={photos[0]} className="col-span-4 row-span-2 min-h-[220px] md:col-span-4" />
      {place.rating != null && place.rating > 0 && (
        <Tile variant="sun" icon="★" big={place.rating.toFixed(1)} label={bentoLabel("rating", locale)} className="col-span-2 md:col-span-1" />
      )}
      {town && (
        <Tile big={town.km < 10 ? town.km.toFixed(1) : Math.round(town.km)} label={`km · ${town.name}`} className="col-span-2 md:col-span-1" />
      )}
      <MapCell lat={place.latitude} lng={place.longitude} label={town ? town.name : null} className="col-span-4 h-40 md:col-span-6" />
      {photos[1] && <PhotoCell src={photos[1]} alt={`${place.name} 2`} className="col-span-2 h-36" />}
      {photos[2] && <PhotoCell src={photos[2]} alt={`${place.name} 3`} className="col-span-2 h-36" />}
      <NearbyCell nearby={nearby} locale={locale} className="col-span-4 md:col-span-6" />
    </section>
  );
}
```

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/components/explore/bento/DefaultBento.tsx
git commit -m "feat(bento): DefaultBento fail-safe layout (no enriched tiles needed)"
```

### Task 2.11 : `ExploreBento.tsx` (routeur)

**Files:**
- Create: `src/components/explore/bento/ExploreBento.tsx`

- [ ] **Step 1 : Implémenter (router minimal Phase 2 : heritage + default, autres → default jusqu'aux phases suivantes)**

```tsx
// src/components/explore/bento/ExploreBento.tsx
import type { CbPlace } from "@/lib/cb-places";
import { cleanCbDescription } from "@/lib/cb-place-helpers";
import { familyOf } from "@/lib/bento-tiles";
import { HeritageBento } from "./HeritageBento";
import { DefaultBento } from "./DefaultBento";

export function ExploreBento({ place, locale }: { place: CbPlace; locale: string }) {
  const { nearby } = cleanCbDescription(place.description);
  switch (familyOf(place.place_type)) {
    case "heritage":
      return <HeritageBento place={place} nearby={nearby} locale={locale} />;
    // beach/nature/village ajoutés en Phases 3-4 ; fallback fail-safe en attendant.
    default:
      return <DefaultBento place={place} nearby={nearby} locale={locale} />;
  }
}
```

- [ ] **Step 2 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/components/explore/bento/ExploreBento.tsx
git commit -m "feat(bento): ExploreBento router (heritage + default fail-safe)"
```

### Task 2.12 : Brancher `page.tsx` sur le bento

**Files:**
- Modify: `src/app/[locale]/explore/[slug]/page.tsx`

- [ ] **Step 1 : Remplacer le corps de rendu**

Remplacer tout le bloc `return (...)` de `CbPlaceFichePage` (lignes ~134-262, du `<main>` au `</main>`) par :

```tsx
  const { paragraphs } = cleanCbDescription(place.description);

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href={`/${locale}/explore?place=${place.slug}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-aegean hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> {t.backToMap}
        </Link>

        <ExploreBento place={place} locale={locale} />

        <CbPlaceActions
          slug={place.slug}
          name={place.name}
          latitude={place.latitude}
          longitude={place.longitude}
          locale={locale}
          showSheetLink={false}
        />

        <ReadMoreAccordion paragraphs={paragraphs} locale={locale} />

        {place.source_url && (
          <p className="mt-8 text-xs text-text-muted">
            <a href={place.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t.moreSource} →
            </a>
          </p>
        )}
      </div>
    </main>
  );
```

- [ ] **Step 2 : Ajuster les imports en tête de fichier**

Retirer les imports devenus inutiles (`Image`, `Star`, `MapPin` ne sont plus utilisés directement dans le rendu ; `typeLabel` non plus s'il ne sert plus dans le corps — vérifier qu'il reste utilisé par `generateMetadata`, où il EST utilisé → le garder). Ajouter :

```ts
import { ExploreBento } from "@/components/explore/bento/ExploreBento";
import { ReadMoreAccordion } from "@/components/explore/bento/shared/ReadMoreAccordion";
```

Garder : `setRequestLocale`, `Link`, `notFound`, `ChevronLeft`, `getCbPlaceBySlug`, `typeLabel` (metadata), `cleanCbDescription`, `CbPlaceActions`, `buildAlternates`. Le dict `T` reste utilisé pour `backToMap`/`moreSource`. Les `attrs`/`photos`/`hero`/`nearby` locaux du corps sont supprimés (gérés par le bento).

- [ ] **Step 3 : Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/[locale]/explore/[slug]/page.tsx`
Expected: exit 0, aucun import inutilisé.

- [ ] **Step 4 : Build local**

Run: `npm run build`
Expected: build réussi (la route `/[locale]/explore/[slug]` compile).

- [ ] **Step 5 : Commit + push preview**

```bash
git add "src/app/[locale]/explore/[slug]/page.tsx"
git commit -m "feat(bento): wire ExploreBento + ReadMoreAccordion into place page"
git push -u origin feat/explore-bento-foundation
```

- [ ] **Step 6 : Validation preview Vercel (Kami)**

Ouvrir l'URL preview Vercel sur `/fr/explore/agia-pelagia-church-at-ano-viannos`. Vérifier vs colonne C du mockup : hero + tuiles (note 5.0, XIV, frescoes 1360, distance ville, marche), mini-carte avec pin bien placé (sud-est central), photos sans légende, DetailCell « sinners », nearby, accordéon « Lire l'histoire » replié. **GATE : validation Kami avant Phase 3.**

---

## PHASE 3 — `BeachBento`

### Task 3.1 : `BeachBento.tsx` (utilise les attributs structurés existants)

**Files:**
- Create: `src/components/explore/bento/BeachBento.tsx`
- Modify: `src/components/explore/bento/ExploreBento.tsx` (ajouter le case)

- [ ] **Step 1 : Implémenter `BeachBento`**

```tsx
// src/components/explore/bento/BeachBento.tsx
import type { CbPlace } from "@/lib/cb-places";
import type { NearbyPlace } from "@/lib/cb-place-helpers";
import { typeLabel } from "@/lib/cb-type-labels";
import { nearestKnownTown } from "@/lib/crete-towns";
import { bentoLabel } from "@/lib/bento-labels";
import { HeroCell } from "./shared/HeroCell";
import { Tile } from "./shared/Tile";
import { MapCell } from "./shared/MapCell";
import { PhotoCell } from "./shared/PhotoCell";
import { NearbyCell } from "./shared/NearbyCell";

export function BeachBento({
  place, nearby, locale,
}: {
  place: CbPlace;
  nearby: NearbyPlace[];
  locale: string;
}) {
  const photos = place.photos ?? [];
  const town = nearestKnownTown(place.latitude, place.longitude);
  const tag = `${typeLabel(place.place_type, locale)}${place.prefecture ? ` · ${place.prefecture}` : ""}`;

  // Attributs structurés déjà en base (colonnes cb_places).
  // 6 attributs structurés déjà en base (couverture vérifiée : water 452 / sand 453 /
  // depth 453 / sea_surface 453 / crowds 451 / accessibility 450 sur 475 plages).
  const attrTiles: Array<{ big: string; label: string; variant?: "lagoon" | "sand" | "terra" | "aegean" }> = [];
  if (place.water_color) attrTiles.push({ big: place.water_color, label: bentoLabel("water", locale), variant: "lagoon" });
  if (place.sand_type) attrTiles.push({ big: place.sand_type, label: bentoLabel("sand", locale), variant: "sand" });
  if (place.depth) attrTiles.push({ big: place.depth, label: bentoLabel("depth", locale), variant: "terra" });
  if (place.sea_surface) attrTiles.push({ big: place.sea_surface, label: bentoLabel("sea", locale), variant: "aegean" });
  if (place.crowds) attrTiles.push({ big: place.crowds, label: bentoLabel("crowds", locale) });
  if (place.accessibility) attrTiles.push({ big: place.accessibility, label: bentoLabel("access", locale) });

  return (
    <section className="grid grid-cols-4 gap-2 md:grid-cols-6">
      <HeroCell name={place.name} tag={tag} photo={photos[0]} className="col-span-4 row-span-2 min-h-[220px] md:col-span-4" />
      {place.rating != null && place.rating > 0 && (
        <Tile variant="sun" icon="★" big={place.rating.toFixed(1)} label={bentoLabel("rating", locale)} className="col-span-2 md:col-span-1" />
      )}
      {town && (
        <Tile big={town.km < 10 ? town.km.toFixed(1) : Math.round(town.km)} label={`km · ${town.name}`} className="col-span-2 md:col-span-1" />
      )}
      {attrTiles.map((a, i) => (
        <Tile key={i} big={a.big} label={a.label} variant={a.variant} className="col-span-2 md:col-span-2" />
      ))}
      <MapCell lat={place.latitude} lng={place.longitude} label={town ? town.name : null} className="col-span-4 h-40 md:col-span-6" />
      {photos[1] && <PhotoCell src={photos[1]} alt={`${place.name} 2`} className="col-span-2 h-36" />}
      {photos[2] && <PhotoCell src={photos[2]} alt={`${place.name} 3`} className="col-span-2 h-36" />}
      <NearbyCell nearby={nearby} locale={locale} className="col-span-4 md:col-span-6" />
    </section>
  );
}
```

- [ ] **Step 2 : Ajouter le case dans `ExploreBento`**

Dans `src/components/explore/bento/ExploreBento.tsx`, importer `BeachBento` et ajouter avant `case "heritage"` :

```tsx
    case "beach":
      return <BeachBento place={place} nearby={nearby} locale={locale} />;
```

- [ ] **Step 3 : Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0, build OK.

- [ ] **Step 4 : Commit + push preview**

```bash
git add src/components/explore/bento/BeachBento.tsx src/components/explore/bento/ExploreBento.tsx
git commit -m "feat(bento): BeachBento layout + router case"
git push
```

- [ ] **Step 5 : Validation preview (Kami)** sur une plage réellement présente en base (slugs vérifiés live : `matala-beach`, `zakros-beach`, `agia-pelagia-beach` — ⚠️ PAS `balos-beach`, absent de `cb_places`) : jusqu'à 6 attributs structurés (water/sand/depth/sea/crowds/access selon disponibilité) + note + distance ville. GATE Kami.

---

## PHASE 4 — `NatureBento` + `VillageBento`

### Task 4.1 : Enrichir la famille `nature`

- [ ] **Step 1 : Run enrichissement nature (gaté qualité)**

Run: `node scripts/enrich-bento-tiles.mjs --family nature --limit 10`
Inspecter 3 gorges (ex `samaria-gorge`) : `length_km`, `difficulty`, `duration_minutes` cohérents.

- [ ] **Step 2 : GATE qualité Kami, puis dérouler**

Si OK : `node scripts/enrich-bento-tiles.mjs --family nature --limit 500`.

### Task 4.2 : `NatureBento.tsx`

**Files:**
- Create: `src/components/explore/bento/NatureBento.tsx`
- Modify: `src/components/explore/bento/ExploreBento.tsx`

- [ ] **Step 1 : Implémenter**

```tsx
// src/components/explore/bento/NatureBento.tsx
import type { CbPlace } from "@/lib/cb-places";
import type { NearbyPlace } from "@/lib/cb-place-helpers";
import { typeLabel } from "@/lib/cb-type-labels";
import { nearestKnownTown } from "@/lib/crete-towns";
import { bentoLabel, difficultyLabel } from "@/lib/bento-labels";
import { HeroCell } from "./shared/HeroCell";
import { Tile } from "./shared/Tile";
import { MapCell } from "./shared/MapCell";
import { PhotoCell } from "./shared/PhotoCell";
import { NearbyCell } from "./shared/NearbyCell";

export function NatureBento({
  place, nearby, locale,
}: {
  place: CbPlace;
  nearby: NearbyPlace[];
  locale: string;
}) {
  const t = place.bento_tiles ?? {};
  const photos = place.photos ?? [];
  const town = nearestKnownTown(place.latitude, place.longitude);
  const tag = `${typeLabel(place.place_type, locale)}${place.prefecture ? ` · ${place.prefecture}` : ""}`;

  return (
    <section className="grid grid-cols-4 gap-2 md:grid-cols-6">
      <HeroCell name={place.name} tag={tag} photo={photos[0]} className="col-span-4 row-span-2 min-h-[220px] md:col-span-4" />
      {place.rating != null && place.rating > 0 && (
        <Tile variant="sun" icon="★" big={place.rating.toFixed(1)} label={bentoLabel("rating", locale)} className="col-span-2 md:col-span-1" />
      )}
      {t.length_km != null && (
        <Tile variant="lagoon" icon="📏" big={`${t.length_km}`} label={`km · ${bentoLabel("length", locale)}`} className="col-span-2 md:col-span-1" />
      )}
      {t.difficulty && (
        <Tile variant="terra" icon="⛰️" big={difficultyLabel(t.difficulty, locale)} label={bentoLabel("difficulty", locale)} className="col-span-2 md:col-span-1" />
      )}
      {t.duration_minutes != null && (
        <Tile icon="⏱️" big={t.duration_minutes < 60 ? `${t.duration_minutes}'` : `${Math.floor(t.duration_minutes / 60)}h${t.duration_minutes % 60 ? `${t.duration_minutes % 60}'` : ""}`} label={bentoLabel("duration", locale)} className="col-span-2 md:col-span-1" />
      )}
      {town && (
        <Tile big={town.km < 10 ? town.km.toFixed(1) : Math.round(town.km)} label={`km · ${town.name}`} className="col-span-2 md:col-span-1" />
      )}
      <MapCell lat={place.latitude} lng={place.longitude} label={town ? town.name : null} className="col-span-4 h-40 md:col-span-6" />
      {photos[1] && <PhotoCell src={photos[1]} alt={`${place.name} 2`} className="col-span-2 h-36" />}
      {photos[2] && <PhotoCell src={photos[2]} alt={`${place.name} 3`} className="col-span-2 h-36" />}
      <NearbyCell nearby={nearby} locale={locale} className="col-span-4 md:col-span-6" />
    </section>
  );
}
```

- [ ] **Step 2 : Ajouter le case `nature` dans `ExploreBento`** (import + `case "nature": return <NatureBento ... />`).

- [ ] **Step 3 : Typecheck + build + commit + push**

Run: `npx tsc --noEmit && npm run build`

```bash
git add src/components/explore/bento/NatureBento.tsx src/components/explore/bento/ExploreBento.tsx
git commit -m "feat(bento): NatureBento layout + router case"
git push
```

### Task 4.3 : Enrichir `village` + `VillageBento.tsx`

**Files:**
- Create: `src/components/explore/bento/VillageBento.tsx`
- Modify: `src/components/explore/bento/ExploreBento.tsx`

- [ ] **Step 1 : Enrichir town**

Run: `node scripts/enrich-bento-tiles.mjs --family village --limit 80` (77 lieux). GATE qualité Kami sur 3 villages.

- [ ] **Step 2 : Implémenter `VillageBento`**

```tsx
// src/components/explore/bento/VillageBento.tsx
import type { CbPlace } from "@/lib/cb-places";
import type { NearbyPlace } from "@/lib/cb-place-helpers";
import { typeLabel } from "@/lib/cb-type-labels";
import { nearestKnownTown } from "@/lib/crete-towns";
import { bentoLabel } from "@/lib/bento-labels";
import { HeroCell } from "./shared/HeroCell";
import { Tile } from "./shared/Tile";
import { MapCell } from "./shared/MapCell";
import { PhotoCell } from "./shared/PhotoCell";
import { NearbyCell } from "./shared/NearbyCell";
import { DetailCell } from "./shared/DetailCell";

export function VillageBento({
  place, nearby, locale,
}: {
  place: CbPlace;
  nearby: NearbyPlace[];
  locale: string;
}) {
  const t = place.bento_tiles ?? {};
  const photos = place.photos ?? [];
  const town = nearestKnownTown(place.latitude, place.longitude);
  const tag = `${typeLabel(place.place_type, locale)}${place.prefecture ? ` · ${place.prefecture}` : ""}`;

  return (
    <section className="grid grid-cols-4 gap-2 md:grid-cols-6">
      <HeroCell name={place.name} tag={tag} photo={photos[0]} className="col-span-4 row-span-2 min-h-[220px] md:col-span-4" />
      {place.rating != null && place.rating > 0 && (
        <Tile variant="sun" icon="★" big={place.rating.toFixed(1)} label={bentoLabel("rating", locale)} className="col-span-2 md:col-span-1" />
      )}
      {t.population != null && (
        <Tile variant="aegean" icon="🏘️" big={t.population.toLocaleString(locale)} label={bentoLabel("population", locale)} className="col-span-2 md:col-span-1" />
      )}
      {t.altitude_m != null && (
        <Tile variant="lagoon" icon="⛰️" big={`${t.altitude_m}m`} label={bentoLabel("altitude", locale)} className="col-span-2 md:col-span-1" />
      )}
      {town && (
        <Tile big={town.km < 10 ? town.km.toFixed(1) : Math.round(town.km)} label={`km · ${town.name}`} className="col-span-2 md:col-span-1" />
      )}
      <MapCell lat={place.latitude} lng={place.longitude} label={town ? town.name : null} className="col-span-4 h-40 md:col-span-6" />
      {photos[1] && <PhotoCell src={photos[1]} alt={`${place.name} 2`} className="col-span-2 h-36" />}
      {t.specialty ? (
        <DetailCell eyebrow={bentoLabel("rare", locale)} text={t.specialty} className="col-span-2 h-36" />
      ) : (
        photos[2] && <PhotoCell src={photos[2]} alt={`${place.name} 3`} className="col-span-2 h-36" />
      )}
      <NearbyCell nearby={nearby} locale={locale} className="col-span-4 md:col-span-6" />
    </section>
  );
}
```

- [ ] **Step 3 : Ajouter le case `village`** dans `ExploreBento`.

- [ ] **Step 4 : Typecheck + build + commit + push**

```bash
git add src/components/explore/bento/VillageBento.tsx src/components/explore/bento/ExploreBento.tsx
git commit -m "feat(bento): VillageBento layout + router case"
git push
```

- [ ] **Step 5 : Validation preview Kami** sur une gorge, un village. GATE.

---

## PHASE 5 — Finalisation enrichissement + cleanup + déploiement prod

### Task 5.1 : Compléter l'enrichissement de toutes les familles

- [ ] **Step 1 :** Relancer jusqu'à « Rien à enrichir » pour chaque famille (cap PostgREST 1000/run, idempotent) :
  - heritage (**1081**) : `node scripts/enrich-bento-tiles.mjs --family heritage --limit 1000` ×2
  - nature (479), village (77), beach (475, tuiles dérivées access/unique_feature)
  Vérifier `updated` cumulé heritage ≈ 1081.

### Task 5.2 : Vérification acceptance criteria

- [ ] **Step 1 : SEO innerText** — sur la preview, en console : `document.body.innerText.length` doit être > 200 (le texte de l'accordéon compte). Vérifier sur agia-pelagia.
- [ ] **Step 2 : Lighthouse mobile** — comparer LCP/CLS preview vs prod actuelle ; pas de régression > 5 points. Le hero `priority` + photos `lazy` doivent tenir le LCP.
- [ ] **Step 3 : Responsive** — vérifier 360px → 1440px : HeroCell pleine largeur, tuiles reflow 2-col mobile / 6-col desktop, pas de débordement.
- [ ] **Step 4 : 5 layouts** — 1 URL preview par famille (heritage, beach, nature, village, default via un slug `flora`/`lighthouse`).

### Task 5.3 : Déploiement prod

- [ ] **Step 1 : Merge dans master** (intégration partagée)

```bash
git fetch origin
git checkout master && git pull
git merge --no-ff feat/explore-bento-foundation
npx tsc --noEmit && npm run build
git push origin master
```

- [ ] **Step 2 : Garde anti-course + déploiement prod (acte conscient, validation Kami)**

```bash
git merge-base --is-ancestor origin/main origin/master && echo "FF safe"
git push origin master:main
```

- [ ] **Step 3 : Vérifier le build PROD spécifique** (leçon déploiement : un commit a 2 builds Vercel preview+prod ; vérifier le déploiement `main`/prod success, pas le cache edge). Puis probe `https://crete.direct/fr/explore/agia-pelagia-church-at-ano-viannos`.

### Task 5.4 : Cleanup (Non-goal §138 spec)

- [ ] **Step 1 :** Confirmer qu'il ne reste aucune référence à l'ancien rendu prose dans `page.tsx` (le `<article className="prose">`, la `<dl>` attributs, la galerie `<img>`, la liste nearby texte sont supprimés — déjà fait Task 2.12). `grep -n "prose\|<dl" src/app/[locale]/explore/[slug]/page.tsx` → aucune occurrence du rendu lieu.
- [ ] **Step 2 :** Mettre à jour `memory/dev_state.md` + `MEMORY.md` (ligne) avec l'état « bento /explore livré prod ».

### Task 5.5 : (Optionnel, gain SEO) JSON-LD `TouristAttraction`

Le spec §106 supposait un JSON-LD existant ; il n'y en a aucun aujourd'hui (cf D6). En ajouter un est un gain net sur 2296 fiches (pas une régression). **À faire seulement si Kami veut le gain SEO maintenant.**

**Files:** Modify `src/app/[locale]/explore/[slug]/page.tsx`

- [ ] **Step 1 :** Vérifier la signature exacte des helpers exportés par `src/lib/schema.ts` (la page sœur `beaches/[slug]` importe `beachSchema`/`breadcrumbSchema`) :

Run: `npx grep -n "export" src/lib/schema.ts` (ou Read le fichier).

- [ ] **Step 2 :** Générer un objet `TouristAttraction`/`Place` (name, image=`photos[0]`, `geo` lat/lng, `address` region=`prefecture`) en calquant le helper existant, et l'injecter dans le `<main>` de `page.tsx` :

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }} />
```

- [ ] **Step 3 :** `npx tsc --noEmit && npm run build` ; valider le JSON-LD via le Rich Results Test. Commit `feat(bento): TouristAttraction JSON-LD on place page`.

---

## Acceptance Criteria (repris du spec §156)

- [ ] Agia Pelagia : rendu = colonne C du mockup (palette, structure cellules, accordéon plié).
- [ ] Plage représentative : `BeachBento` affiche attributs structurés + note + distance ville.
- [ ] Lighthouse mobile : pas de régression > 5 pts LCP/CLS.
- [ ] SEO : `document.body.innerText.length` > 200 (texte description dans le DOM via `<details>`).
- [ ] Les 5 layouts validés via 1 URL preview chacun.

## Couverture du spec (self-review)

| Section spec | Tâche(s) |
|---|---|
| Layouts dédiés par type | Mapping famille + Tasks 2.9, 2.10, 3.1, 4.2, 4.3 (D2) |
| Composant racine `ExploreBento` | Task 2.11 |
| Cellules partagées | Tasks 2.2-2.8 |
| Page après refonte | Task 2.12 |
| Origine données / helpers | Tasks 1.2 (projection), 1.3 (nearestKnownTown), 1.5 (enrichissement) |
| Script enrichissement | Task 1.5 |
| Texte source `ReadMoreAccordion` | Task 2.8 |
| SEO | Tasks 2.8, 5.2 |
| Responsive | Layouts (grilles `grid-cols-4 md:grid-cols-6`) + Task 5.2 |
| i18n | Task 2.1 `bento-labels.ts` (D1) |
| Performance (SVG, lazy) | Tasks 2.4, 2.5 |
| Migration / phasage | Task 1.4 + Phases 1-5 |
| Fail-safe Default | Task 2.10 |
| Non-goals | Respectés (pas de touche au drawer /explore, aux listings, pas de scrolly) |

## Ce qui reste owner Kami (décisions/accès)

- **Pré-requis bloquants** (voir section dédiée) : créer la colonne `bento_tiles` (DDL Studio self-hosted) ET fournir `CRETEPULSE_SERVICE_ROLE_KEY` (clé write de la base cretepulse — l'anon est bloquée par RLS, vérifié).
- **Gate qualité** après chaque run d'enrichissement pilote (heritage, nature, village).
- **Validation preview** à chaque phase avant la suivante.
- **`git push origin master:main`** = acte conscient de déploiement prod (Task 5.3).
- Confirmer la déviation **D1** (dictionnaire TS vs next-intl) — sinon basculer sur namespace `bento` dans les 22 `messages/*.json`.
