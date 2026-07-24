# Spec : swim-near — meilleure plage PAR POSITION (NowPanel v2)

Date : 2026-07-10 · Chantier : app compagnon, suite du lot 2 · Branche : `feat/app-companion`

## Problème

Le NowPanel (/explore, « Near me ») affiche la « meilleure plage du moment » à partir
de `/api/swim-now`, qui renvoie le top 3 PAR RÉGION (west/central/east/south). Depuis
Heraklion centre, la meilleure plage régionale peut être à 40+ km. Le client borne à
25 km avec repli sur la plus proche, mais il ne voit que ~12 plages (3 × 4 régions)
sur 182 : le vrai meilleur spot local est presque toujours absent de l'échantillon.

## Objectif

Un classement de baignade PAR POSITION : les 3 meilleures plages dans un rayon de
25 km autour du visiteur, avec le score conditions du moment (même moteur que
swim-today). Le NowPanel consomme ce classement à la place de swim-now.

## Approche retenue (vs brief initial)

Le brief suggérait « plages triées par distance puis scorées via la logique
swim-today ». Constat après lecture du code : `buildSwimToday()` score DÉJÀ les 182
plages à chaque appel (`st.scored`, trié par score) et le scoring est du CPU pur
trivial ; la donnée coûteuse (météo 10 villes) vient de `weather_cache` Supabase.
On réutilise donc `buildSwimToday()` tel quel et on filtre/re-trie sa sortie —
zéro duplication du moteur de scoring, zéro appel `beach-conditions` unitaire.

Dans le rayon de 25 km, le tri est par score pur (pas de pondération distance :
tout est déjà « près »). La pondération `weighted()` du NowPanel disparaît.

## Composants

### 1. Lib pure : `src/lib/swim-near.ts`

```ts
export interface SwimNearItem { lat: number; lng: number; score: number }
export function pickSwimNear<T extends SwimNearItem>(
  items: T[],
  pos: GeoPos,
  opts?: { radiusKm?: number; fallbackCount?: number; limit?: number },
): Array<T & { km: number }>
```

- Calcule `km` via `haversineKm` (`src/lib/geo.ts`), exclut coords invalides.
- Garde les items à `km <= radiusKm` (défaut 25), trie par score décroissant,
  renvoie les `limit` premiers (défaut 3). Égalité de score : le plus proche d'abord.
- Si AUCUN item dans le rayon (milieu des montagnes, bord du géofence) : repli sur
  les `fallbackCount` (défaut 5) plus proches, re-triés par score, top `limit`.
- `km` arrondi au dixième. Zéro I/O, importable par le check script node.

### 2. Endpoint : `src/app/api/swim-near/route.ts`

`GET /api/swim-near?lat=..&lng=..&locale=..`

- Validation bornes Crète élargie comme `nearest-stop` : lat 34–36.2, lng 23–27,
  sinon `422 { beaches: [] }`.
- `buildSwimToday()` → si null, `503 { error: "no_weather" }` (pattern swim-now).
- Mappe `st.scored` en items `{ slug, name (getLocalizedField), score, rating,
  lat: beach.latitude, lng: beach.longitude }`, applique `pickSwimNear`.
- Réponse `{ beaches: [{ slug, name, score, rating, km, lat, lng }] }` (top 3).
- `Cache-Control: public, s-maxage=1800, stale-while-revalidate=3600` (comme
  swim-now). La cacheabilité par position vient de l'ARRONDI CÔTÉ CLIENT (§3) :
  le CDN cache par URL, donc c'est l'URL qui doit être quantifiée.
- `export const dynamic = "force-dynamic"`.

### 3. NowPanel v2 : `src/components/explore/NowPanel.tsx`

- Remplace le fetch `swim-now` par
  `/api/swim-near?lat=${qLat}&lng=${qLng}&locale=${locale}` où `qLat/qLng` =
  position arrondie à 0.05° (`(Math.round(v / 0.05) * 0.05).toFixed(2)`), soit
  ~3–5 km de quantification : URL stable → cache CDN efficace, position exacte
  jamais envoyée au serveur.
- Recalcule `km` EXACT côté client avec `haversineKm` et la vraie position (le
  `km` serveur est basé sur la position arrondie ; l'affichage doit être juste).
- Supprime `weighted()` et le repli client « plus proche tout court » (le repli
  vit désormais dans l'API). Si fetch KO ou `beaches` vide : pas de bloc plage
  (comportement actuel en cas d'échec swim-now).
- Affichage : plage #1 = carte actuelle inchangée (nom, km, score, lien fiche).
  Plages #2 et #3 : lignes compactes sous la #1 (nom tronqué · km · badge score),
  mêmes liens `/{locale}/beaches/{slug}`. AUCUNE nouvelle string UI (pas de
  libellé pour les alternatives) → pas de chantier i18n 22 locales.
- Events Plausible INCHANGÉS : `now_panel_shown` tel quel, `now_panel_click`
  avec `props.target = "beach"` pour les 3 liens plage (la mesure lot 0 du 17/07
  tourne dessus, on ne segmente pas).

### 4. Tests : `scripts/check-swim-near.mjs` + câblage

- Pattern `check-nearest-stop.mjs` (assert node, import `.ts` via
  `--experimental-strip-types`). Cas couverts :
  - top 3 par score dans le rayon (une plage mieux notée à 40 km ne gagne pas) ;
  - égalité de score → plus proche d'abord ;
  - rayon vide → repli 5 plus proches re-triées par score ;
  - moins de 3 plages dans le rayon → renvoie ce qu'il y a ;
  - coords invalides ignorées sans crash ; liste vide → `[]` ;
  - `km` arrondi au dixième.
- `package.json` : `check:swim-near` ajouté et enchaîné dans `npm run check`.

## Ce qui ne change PAS

- `/api/swim-now` et le hub /beaches : intacts (consommateurs existants).
- `buildSwimToday()` : aucun changement de signature ni de scoring.
- Slugs `beaches` ≠ slugs `cb_places` : on reste sur les coords, aucune jointure.

## Vérification avant push prod

1. `npm run check` (inclut tsc, check:da, check:i18n) + `next build` verts.
2. e2e Playwright émulation iPhone 13, géoloc simulée 35.339/25.133 (Heraklion),
   attendre l'hydratation ~5 s avant de cliquer « Near me ».
3. Captures avant/après ouvertes à l'écran (`Start-Process`) → GO Kami.
4. Push prod : `git push origin feat/app-companion:main` (+ `:master`) APRÈS GO.
