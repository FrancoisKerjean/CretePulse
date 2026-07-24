# Réseau bus — Couche moteur : position estimée (lib pure partagée)

**Date** : 2026-06-15
**Auteur** : Kami + Claude (brainstorming)
**Statut** : design validé (arbitrage worktree tranché par Kami le 15/06), prêt pour plan d'implémentation
**Prédécesseurs** :
- SP1 (`2026-06-14-osm-bus-network-ingestion-design.md`) : réseau OSM en prod (489 stops / 78 lignes / 835 line_stops, `geometry` + `bus_line_stops.cumulative_km/minutes`).
- SP2 (`2026-06-14-ktel-apparier-design.md`) : horaires KTEL appariés aux tracés, **déployé en prod le 15/06** (`bus_routes.line_id` peuplé = 196 routes / ~48 % des paires + 78 lignes fallback `source='ktel'`).

**Arbitrage worktree (Kami, 15/06)** : ce qui était deux chantiers parallèles (SP3 moteur en worktree `cretepulse-sp3` + SP4 carte en worktree `cretepulse-live`) est **fusionné en un seul** : le moteur **et** la carte vivent dans le **même worktree `cretepulse-live`** (branche `feat/bus-live-map`), sur une seule branche, **sans endpoint serveur** (YAGNI : SP4 calcule dans le navigateur). Le worktree `cretepulse-sp3` est **abandonné** (aucun code à perdre, ce spec y était seul ; il est rapatrié ici comme doc de référence). Le découpage moteur / carte reste une **frontière de couches** (headless vs rendu), plus une frontière de terminaux. Voir le spec carte `2026-06-15-sp4-live-map-design.md`.

## Vision

À l'instant `t`, calculer la **position estimée de chaque bus en circulation** sur le réseau crétois — sans GPS, à partir de l'horaire de départ KTEL + le profil de temps + le tracé. C'est le cœur algorithmique de la carte live, et la fondation sur laquelle le GPS réel se branchera plus tard. Sortie **déterministe** (heure injectée) → testable, et identique en preview/prod.

## Objectif

Livrer une **lib pure** `src/lib/bus-live/` exposant `busesAt(now, network) -> LiveBus[]` : pour chaque départ KTEL en cours aujourd'hui, un bus positionné en `lat/lng` interpolés sur le tracé OSRM, avec prochain arrêt, ETA, % de course parcouru, cap et destination. Plus le chargement du réseau (`loadLiveNetwork()`). **Zéro endpoint, zéro infra temps réel** : la carte l'importe et calcule dans le navigateur.

**Critères de succès vérifiables** (tests sur fixture réelle) :
- **LAS-02** `Agios Nikolaos→Sitia` : un départ à `H`, à `H+30 min` le bus est entre Mistral Mare et Gournia, au bon point du tracé.
- **LAS-07** `Agios Nikolaos↔Elounda` (profil arrêts 0/1/22/30/37 min) : départ 09:00, à 09:22 le bus est entre Ellinika (22 min) et l'arrêt suivant.
- Sens **arrière** : une route `B→A` positionne le bus du bon côté du tracé (pas en miroir inversé).
- `activeDepartures` : 0 bus avant le 1er départ du jour et après le dernier ; respect du jour de semaine.

## Décisions de cadrage (verrouillées avec Kami au brainstorming)

| Sujet | Décision |
|---|---|
| Forme de livraison | **Lib pure partagée** `src/lib/bus-live/` (moteur + loader + types). **Pas d'endpoint serveur** (`/api/buses/live` du brief initial abandonné : zéro infra, un endpoint serait inutilisé — YAGNI). |
| Worktree | **Un seul** : `cretepulse-live` (moteur + carte). `cretepulse-sp3` abandonné. |
| Frontière moteur / carte | La couche moteur possède tout le **headless** (moteur pur **et** chargement données). La carte = rendu MapLibre uniquement, importe `@/lib/bus-live`. |
| Méthode d'interpolation | **Arc-length sur la polyline OSRM** `geometry` : temps→distance via le profil `cumulative_minutes`/`cumulative_km` (piecewise linéaire), puis distance→point en parcourant la polyline. Réaliste, déterministe, coût négligeable (géométrie déjà en DB). |
| Modèle de temps | `bus_lines.total_minutes` + profil `cumulative_minutes` par arrêt comme source unique de la durée et de la fenêtre `H ≤ now ≤ H+total`. (`bus_routes.duration` texte ignoré : 2 sources = risque d'incohérence avec le profil/géométrie.) |
| Sens de parcours | Déterminé **par route** (terminus `from` ≈ `seq 0` → avant ; ≈ `seq N` → arrière). Sens arrière = profil + distance **miroités** sur la même géométrie. |
| Lignes KTEL-fallback (`source='ktel'`) | **Incluses**, marquées `degraded:true`/`partialGeo`. Interpolation linéaire sur le segment droit. **Décision Kami 15/06** : la carte les **affiche marquées « tracé approximatif »** (densité visible dès la v1). |
| Périmètre des bus | Uniquement les routes avec `line_id` non-NULL dont la ligne a géométrie + ≥ 2 arrêts + `total_minutes`. Lignes sans horaire = invisibles (cohérent carte). |
| Fuseau | **Europe/Athens** (heure injectée via `athensNow()` ; les `departures` KTEL sont en heure locale Crète). |
| Heure | **Injectée** (`busesAt(now, …)`) → moteur déterministe, testable, et paramétrable pour un instant `t` arbitraire (tests, futur). |

## Frontière moteur / carte (même worktree)

| Possédé par | Fichiers |
|---|---|
| **Couche moteur** (ce spec) | `src/lib/bus-live/types.ts` (contrat `LiveNetwork`, `LiveBus`), `src/lib/bus-live/network.ts` (loader I/O via `supabase` anon), `src/lib/bus-live/position.ts` (moteur pur), `src/lib/bus-live/index.ts` (ré-export), `scripts/check-bus-live.mjs` (TDD) |
| **Couche carte** (spec `sp4-live-map`) | `src/components/live/LiveMap.tsx`, `LiveBusLayer.tsx`, `src/app/[locale]/live/page.tsx` — importent `busesAt`/`loadLiveNetwork`/`LiveBus` depuis `@/lib/bus-live` |

## Architecture & modules

Nouveau dossier `src/lib/bus-live/`. Style identique aux libs existantes (`bus-journey.ts`) : fonctions pures, `import type` uniquement dans `position.ts`, testées par `scripts/check-*.mjs` (node ≥ 23 type-stripping).

| Fichier | Responsabilité |
|---|---|
| `src/lib/bus-live/types.ts` | `LiveStop` (`seq, slug, name, lat, lng, cumKm, cumMin`), `LiveLine` (`id, code, codeOfficial, source, totalMinutes, lengthKm, partialGeo, geometry [[lng,lat]], stops: LiveStop[]`), `LiveNetwork` (`{ lines: Map<number, LiveLine>; routes: BusRoute[] }` — les routes **réutilisent le type `BusRoute`** de `buses.ts` étendu avec `line_id`, pour passer directement à `timesForDate` sans remapper), `LiveBus` (sortie). **Pas de `LiveRoute` distinct.** |
| `src/lib/bus-live/network.ts` | `loadLiveNetwork(): Promise<LiveNetwork>` — requêtes `supabase` anon, assemblage lignes+arrêts+routes, filtre les lignes inexploitables, indexe par `line_id`. **Seul module avec I/O.** |
| `src/lib/bus-live/position.ts` | **Moteur pur** : `orientRoute`, `activeDepartures`, `elapsedToKm`, `kmToPoint`, `busesAt`. Zéro I/O. |
| `src/lib/bus-live/index.ts` | Ré-export `busesAt`, `loadLiveNetwork`, types `LiveBus`/`LiveNetwork` (point d'import unique `@/lib/bus-live` pour la carte). |
| `scripts/check-bus-live.mjs` | Assertions sur fixture réelle (LAS-02, LAS-07, KTEL-fallback) + cas synthétiques (sens arrière, bornes horaires). |

## Le moteur (cœur pur, déterministe)

`busesAt(now, network) -> LiveBus[]`, où `now = { iso: "YYYY-MM-DD", minutes: number }` (Athens, forme exacte renvoyée par `athensNow()`) :

1. **Itérer les routes** ayant une ligne exploitable (`line_id` → ligne avec géométrie + ≥ 2 arrêts + `total_minutes > 0`).
2. **`orientRoute(route, line)`** : choisir, des **deux** terminus de la ligne (`seq 0` vs `seq N`), celui le plus proche de `route.from_place` par une similarité tolérante (normalisation locale `lower` + retrait accents/diacritiques + non-alphanum→espace, puis chevauchement de tokens/caractères). Choix entre 2 candidats distincts → robuste malgré la divergence KTEL/OSM (Chania/Khania). `from ≈ seq 0` → avant ; `≈ seq N` → arrière. Égalité/ambiguïté → avant par défaut + compteur. Construit le profil orienté `(profMin[], profKm[])` (cf. « Sens »).
3. **`activeDepartures(route, now)`** : `timesForDate(route, now.iso)` (réutilise `bus-journey.ts` — gère `departures_by_day` "Mon-Fri"/"Weekend"/"Every Day"), garder ceux où `toMin(H) ≤ now.minutes ≤ toMin(H) + line.totalMinutes`.
4. Par départ : `elapsed = now.minutes − toMin(H)`.
   - **`elapsedToKm(elapsed, profMin, profKm)`** : trouver `i` tel que `profMin[i] ≤ elapsed ≤ profMin[i+1]`, fraction `f`, `km = profKm[i] + f·(profKm[i+1]−profKm[i])` → **distance depuis le départ géométrique** (`seq 0`).
   - **`kmToPoint(geometry, km)`** : parcourir la polyline en cumulant la longueur haversine des segments jusqu'à `km` → `{lat, lng}` + `segBearing` (cap du segment courant dans le sens `seq 0→N`).
5. **Émettre** `LiveBus` : `bearing = reversed ? (segBearing+180)%360 : segBearing` ; `progress = clamp(elapsed/total, 0..1)` ; `nextStop`/`etaMinNext` = prochain arrêt dans l'ordre de parcours ; `headsign = route.to_place` ; `degraded = line.source==='ktel' || line.partialGeo`.
6. **Dédoublonnage** par `(lineId, reversed, H)` : la ligne Chania–Rethymno–Heraklion est publiée par les deux KTEL → un seul bus par (ligne, sens, heure).

Fonctions pures isolées et testées séparément : `orientRoute()`, `activeDepartures()`, `elapsedToKm()`, `kmToPoint()`, `busesAt()`.

## Gestion du sens (le vrai risque d'exactitude)

`geometry` et `seq` sont stockés dans **une seule orientation** (terminus alphabétique premier, SP1). Profil avant depuis `bus_line_stops` trié par `seq` : `m[i]=cumulative_minutes`, `c[i]=cumulative_km`, `i=0..N`, `L=c[N]≈length_km`.

- **Avant** (`route.from ≈ seq 0`) : `profMin=m`, `profKm=c`. `elapsedToKm` donne directement `km` depuis `seq 0`.
- **Arrière** (`route.from ≈ seq N`) : profil miroité — `profMin[k]=m[N]−m[N−k]`, `profKm[k]=L−c[N−k]` (k=0..N). `elapsedToKm` donne `dEnd` = distance depuis `seq N` ; la **distance géométrique** = `L − dEnd` (même polyline, parcourue à l'envers). Cap réel = `segBearing + 180°`.
- **Ordre des arrêts** pour `nextStop` suit le sens de parcours (croissant en avant, décroissant en arrière).
- Une ligne **bidirectionnelle** (routes aller **et** retour) génère des bus dans les deux sens — correct.
- Hypothèse assumée : temps de parcours symétrique entre les deux sens (le profil OSM est une estimation ; suffisant pour de l'estimatif, l'affinage IA viendra plus tard).

## Type `LiveBus` (contrat avec la carte)

```ts
interface LiveBus {
  lineId: number;
  code: string;              // PREF-NN interne stable
  codeOfficial: string | null; // ref OSM / n° urbain (affichage prioritaire)
  lat: number;
  lng: number;
  bearing: number;           // cap 0..360, sens de marche réel
  progress: number;          // 0..1, fraction de la course (temps)
  nextStop: string | null;   // nom du prochain arrêt dans l'ordre de parcours
  etaMinNext: number | null; // minutes jusqu'au prochain arrêt
  headsign: string;          // destination (route.to_place)
  direction: 'fwd' | 'rev';
  degraded: boolean;         // ligne KTEL-fallback / géométrie partielle
}
```

Union des champs attendus par la carte (`lineId, code, lat, lng, bearing, nextStop, etaMinNext, headsign`) et du moteur (`progress` = % course parcouru). La carte stylise `degraded`/`direction` librement.

## Lignes KTEL-fallback (`source='ktel'`, 2 arrêts, géométrie droite)

**Incluses**, `degraded:true`. Profil = 2 points (`seq 0` à 0 min/0 km, `seq 1` à `total_minutes`/`length_km`), interpolation linéaire sur le segment. Si `geometry` est NULL (OSRM échoué au fallback), construire un segment droit `[stop0, stop1]` à partir des coordonnées des 2 arrêts. **Décision Kami 15/06** : la carte les affiche marquées « tracé approximatif ».

## Schéma de données & requêtes

Aucune migration. Lecture seule via le client `supabase` **anon** (RLS public read déjà en place sur toutes les `bus_*`). `loadLiveNetwork()` lit :

- `bus_lines` : `id, code, code_official, source, geometry, total_minutes, length_km, partial_geo, operator_id, name`.
- `bus_line_stops` : `line_id, stop_id, seq, cumulative_km, cumulative_minutes` (trié par `line_id, seq`).
- `bus_stops` : `id, slug, name, lat, lng`.
- `bus_routes` : `line_id, from_place, to_place, operator_id, departures, departures_by_day` (le type `BusRoute` de `buses.ts` est **étendu** avec `line_id: number | null`).

Le loader joint en mémoire (lignes ← arrêts ← coords ; routes groupées par `line_id`), écarte les lignes sans géométrie / < 2 arrêts / `total_minutes` nul, et renvoie un `LiveNetwork` prêt pour le moteur.

## Réutilisation — briques existantes (vérifiées dans le worktree `cretepulse-live`)

- `src/lib/bus-journey.ts` : `timesForDate(route, dateISO)`, `dayToken`, `parseDurationMin`, `addMinutes` **exportés**. ⚠️ `daysMatch` est **privé** → passer par `timesForDate` (qui l'encapsule), ne pas l'appeler directement.
- `src/lib/athens-time.ts` : `athensNow()` → `{ iso, minutes }`, `toMin(hhmm)` → minutes. (forme `now` du moteur, raccord exact.)
- `src/lib/geo.ts` : `haversineKm(a, b)` (pur, ordre des arguments **`[lat, lng]`**) — **réutilisé** dans `kmToPoint`. ⚠️ `geometry` est en **`[lng, lat]`** (GeoJSON) → **swap** `[lng,lat]→[lat,lng]` avant l'appel.
- **Convention d'import (vérifiée sur `bus-departures.ts`)** : `position.ts` importe les *valeurs* cross-module en **chemin relatif + extension `.ts`** : `import { haversineKm } from "../geo.ts"`, `{ timesForDate } from "../bus-journey.ts"`, `{ toMin } from "../athens-time.ts"`. **Jamais l'alias `@/`** (le loader node de `check-bus-live.mjs` ne le résout pas ; `allowImportingTsExtensions: true` rend `tsc` OK avec l'extension). Les `type` s'importent sans extension (`import type { BusRoute } from "../buses"`). Le module I/O `network.ts` (non testé en pur) peut, lui, utiliser `@/lib/supabase` comme `buses.ts`.
- `src/lib/supabase.ts` : client anon (`@/lib/supabase`).
- `src/lib/buses.ts` : type `BusRoute` (à étendre avec `line_id: number | null`) + `getBusRoutes` (`select("*")` ramènera `line_id` une fois la colonne en base).
- Convention test `scripts/check-bus-*.mjs` (node type-stripping, `node:assert/strict`, fixtures réelles committées) — modèle : `scripts/check-bus-journey.mjs`.

## Tests (TDD) — `scripts/check-bus-live.mjs`

| Test | Couvre |
|---|---|
| `elapsedToKm` | profil LAS-07 (0/1/22/30/37 min ; 0/0.4/5.9/8.0/10.0 km), `elapsed=22` → km entre Ellinika et l'arrêt suivant ; bornes (`elapsed=0`→0, `elapsed=total`→L). |
| `kmToPoint` | polyline connue + km → point attendu sur le bon segment + cap (vérifie le swap `[lng,lat]→[lat,lng]`). |
| `orientRoute` | `from`=terminus seq 0 → `reversed=false` ; `from`=terminus seq N → `reversed=true` ; profil miroité correct. |
| `activeDepartures` | 0 bus avant le 1er départ / après le dernier ; mardi vs dimanche selon `departures_by_day`. |
| `busesAt` (avant) | **LAS-02** réelle, départ + 30 min → bus entre Mistral Mare et Gournia. |
| `busesAt` (arrière) | route retour → bus du bon côté du tracé (pas en miroir). |
| `busesAt` (fallback) | ligne `source='ktel'` 2 arrêts → bus positionné, `degraded:true`. |

Fixture réelle `fixtures/bus_live_sample.json` : 2-3 lignes représentatives (1 OSM longue type LAS-02, 1 OSM courte LAS-07, 1 KTEL-fallback) avec géométrie + profil + routes, extraite via l'API REST anon (PostgREST public) et committée. Cas synthétiques pour les bornes et le sens.

## Non-objectifs (YAGNI)

- Pas d'endpoint serveur, pas de WebSocket, pas de stockage, pas de cron.
- Pas de carte ni de rendu (→ couche carte).
- Pas de GPS réel ni de sonde passager (→ futur).
- Pas d'IA d'affinage des retards (le profil OSM/KTEL suffit pour de l'estimatif).
- Pas de reconstruction des arrêts intermédiaires des routes KTEL-fallback (segment droit assumé dégradé).

## Limites honnêtes (assumées)

- **Estimatif, pas réel** : position dérivée de l'horaire théorique ; un bus en retard/avance n'est pas reflété. Badge « selon l'horaire » (côté carte).
- **Profil OSM approximatif** : `cumulative_minutes` calé sur une durée estimée → ETA grossier.
- **Symétrie des sens** : même profil de temps aller/retour (approximation).
- **Couverture ~48 %** des paires KTEL (lignes sans `line_id` invisibles) ; monte avec la curation des alias SP2.
- **KTEL-fallback** : trajet en ligne droite entre terminus, sans escales → position grossière (`degraded`).
- **Double publication** : ligne commune ouest/est dédoublonnée par `(lineId, sens, heure)`, mais un horaire divergent entre opérateurs pourrait laisser 2 bus proches (rare).

## Risques

| Risque | Mitigation |
|---|---|
| Sens inversé (bus à l'envers du tracé) | `orientRoute` + profil miroité, testé explicitement (route retour). |
| Ordre `[lng,lat]` vs `[lat,lng]` dans haversine | Swap explicite dans `kmToPoint`, couvert par un test `kmToPoint` à point attendu connu. |
| Ligne sans géométrie / profil incomplet | Loader écarte les lignes inexploitables ; garde-fou ≥ 2 arrêts + `total_minutes>0`. |
| Double implémentation du moteur | **Évitée** : un seul moteur, une seule lib `@/lib/bus-live`, importée par la carte (même worktree). |
| `geometry` très longue (485 points LAS-07) × N bus | `kmToPoint` O(points) par bus, négligeable (qq centaines de points, qq dizaines de bus). |
| Heure mal fusée (visiteur hors Crète) | Heure de référence **Athens** injectée via `athensNow()`. |
| Position estimée prise pour du réel | Hors-scope moteur ; badge honnête côté carte. |
