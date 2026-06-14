# Réseau bus — Sous-projet 2 : appariement KTEL ↔ OSM + fallback

**Date** : 2026-06-14
**Auteur** : Kami + Claude (brainstorming)
**Statut** : design validé, prêt pour plan d'implémentation
**Prédécesseur** : SP1 (`2026-06-14-osm-bus-network-ingestion-design.md`) — déployé en prod le 14/06, 489 stops / 78 lignes / 835 line_stops, source='osm'.
**Vision finale** : carte live prédictive de tous les bus de Crète. SP2 = la fondation horaires : tous les départs KTEL rattachés à une ligne du réseau (OSM principalement, KTEL-fallback pour les liaisons rurales absentes d'OSM).

## Contexte

SP1 a peuplé `bus_stops` / `bus_lines` / `bus_line_stops` depuis OSM (78 lignes, séquences ordonnées, codes officiels). Mais le réseau OSM **n'a pas les horaires** : ils vivent dans `bus_routes` (scrape KTEL quotidien — 383 routes herlas+ektel, 207 paires distinctes origin↔dest avec `departures` JSONB).

Deux problèmes à résoudre :
1. **Appariement horaires** : pour chaque route KTEL, identifier la ligne OSM correspondante (par couple origin/dest + opérateur).
2. **Fallback** : ~26 % des paires KTEL n'ont aucun équivalent dans OSM (lignes rurales mal mappées). Sans fallback, ces routes restent muettes dans le réseau.

Difficulté centrale : les **noms divergent systématiquement** entre KTEL (anglais usuel : Chania, Heraklion, Rethymno) et OSM (translittération `unidecode` du grec : Khania, Iraklio, Rethumno). Différences récurrentes `ch↔kh`, `y↔u`, plus des traductions sémantiques (`Botanical Garden` ↔ `Botaniko Parko`). **Aucun match string direct.**

## Objectif de SP2

- **Apparier** ≥ 70 % des paires KTEL distinctes (>= 145/207) à une ligne du réseau (OSM ou fallback).
- **Persister le lien** via `bus_routes.line_id` (FK vers `bus_lines`) — chaque route KTEL pointe vers la ligne qu'elle dessert.
- **Reconstruire un fallback minimal** pour les paires KTEL absentes d'OSM : 2 arrêts terminus + géométrie OSRM directe + horaires KTEL.
- **Critère de succès vérifiable** : après run, `LAS-02 Agios Nikolaos↔Sitia` a ≥ 1 route KTEL rattachée ; `Heraklion↔Matala` (absente d'OSM aujourd'hui) génère une `bus_lines` source='ktel' avec ses 4 routes KTEL `line_id` peuplées.

## Décisions de cadrage (verrouillées avec Kami)

| Sujet | Décision |
|---|---|
| Scope | Horaires sur OSM + fallback minimal (2 terminus, OSRM, source='ktel'). Pas de séquence intermédiaire en SP2. |
| Réconciliation noms | Cascade : exact → alias manuel (`ktel_to_osm.json`) → coords (PLACE_COORDS, < 5 km). Restant = log explicite. |
| Lien horaires ↔ ligne | FK `bus_routes.line_id` vers `bus_lines(id)`, `ON DELETE SET NULL` pour survivre aux rebuilds OSM. |
| Politique de matching | Strict : terminus = terminus (`frozenset(origin_slug, dest_slug)` + opérateur). Pas d'appariement partiel sur arrêts intermédiaires. |
| Architecture | Module séparé `ktel_apparier.py` + wrapper cron `run_apparier.py` (miroir SP1). |
| Cron | Quotidien 04:30 Athens après `buses.py`, et chaîné après `run_osm_build.py` le dimanche pour repeupler post-rebuild OSM. |
| Fallback géométrie | OSRM entre les 2 terminus (haversine en backup). `partial_geo=true` marque l'absence de séquence intermédiaire. |

## Architecture & modules

Nouveau pipeline `ktel_apparier.py` + sous-modules focalisés. Réutilise les briques existantes (`net_osrm`, `net_nomenclature`, `prices`).

| Fichier | Responsabilité |
|---|---|
| `scripts/scrapers/buses/ktel_alias.py` | Lecture + lookup du JSON d'alias manuel |
| `scripts/scrapers/buses/ktel_to_osm.json` | Alias manuel commit-é (~30 hubs au seed) |
| `scripts/scrapers/buses/ktel_resolve.py` | Cascade exact → alias → coords |
| `scripts/scrapers/buses/ktel_match.py` | Match strict (operator, frozenset(termini)) |
| `scripts/scrapers/buses/ktel_fallback.py` | Construction de lignes source='ktel' depuis les paires orphelines (OSRM injecté) |
| `scripts/scrapers/buses/ktel_apparier.py` | Orchestration : assemble + store (transactionnel) |
| `scripts/scrapers/buses/run_apparier.py` | Entrée cron + alerte Telegram |
| `supabase/migrations/20260614160000_bus_routes_line_id.sql` | Migration FK `bus_routes.line_id` |
| `scripts/scrapers/buses/fixtures/ktel_routes_sample.json` | Fixture réelle ~50 routes pour tests |

## Schéma de données

Migration additive unique :

```sql
-- bus_routes lie au réseau résolu (OSM ou KTEL-fallback).
alter table bus_routes add column if not exists line_id integer references bus_lines(id) on delete set null;
create index if not exists idx_bus_routes_line_id on bus_routes (line_id);
notify pgrst, 'reload schema';
```

`ON DELETE SET NULL` : quand SP1 rebuild `bus_lines` (delete+insert hebdo), les `line_id` de `bus_routes` deviennent NULL au lieu de violer la FK. Le run SP2 enchaîné derrière repeuple.

Aucune autre modif schema. `bus_stops`/`bus_lines`/`bus_line_stops` accueillent les enregistrements `source='ktel'` via les colonnes ajoutées en SP1.

## Pipeline `ktel_apparier.py`

1. **Charge** : `bus_routes` (KTEL, par operator), `bus_lines` (OSM, par operator+termini), `bus_stops` (par slug), `ktel_to_osm.json` (alias).
2. **Résout** : pour chaque route KTEL, `resolve(from_place, operator)` et `resolve(to_place, operator)` → `(from_slug, to_slug)` ou None.
3. **Match strict** : si les 2 slugs résolus correspondent à `(operator, frozenset(termini))` d'une `bus_lines` existante → on associe.
4. **Aggrège les gaps** : routes non matchées groupées par `(operator, frozenset(a, b))`.
5. **Fallback** : pour chaque paire orpheline ayant 2 terminus résolvables (au moins via PLACE_COORDS), `build_fallback_line` crée la `bus_lines` source='ktel'. Géométrie OSRM(origin→dest), 2 `bus_line_stops` (seq 0 et 1), `total_minutes` = moyenne arithmétique des durées KTEL parses (`_parse_duration_min` de `build_network.py`).
6. **Store transactionnel** :
   - INSERT des nouveaux `bus_stops` (slug pas déjà présent) avec `coords_source='ktel'`, `coords_confidence='medium'`, `osm_id=NULL`, `needs_review=false`.
   - INSERT des nouvelles `bus_lines` source='ktel'.
   - INSERT des `bus_line_stops` correspondants.
   - UPDATE `bus_routes.line_id` pour TOUTES les routes appariées (OSM-match OU KTEL-fallback).
   - Garde-fou : refuse de tourner si `bus_lines` est vide (rebuild OSM en cours / planté).

### Réconciliation des noms — détail de la cascade

`ktel_resolve.resolve(name, operator, stops_by_slug, aliases, place_coords) → osm_slug | None` :

```
1. exact     : stop_slug(name) ∈ stops_by_slug                              → return it
2. alias     : aliases[stop_slug(name)] ∈ stops_by_slug                     → return aliased
3. coords    : place_coords[_norm(name)] = (lat, lng)
               nearest stop in stops_by_slug.values() with dist < 5 km      → return that slug
4. none      : log (kept for audit, used by manual ktel_to_osm.json curation)
```

`stop_slug` est la fonction de `net_geocode` (`_norm + replace(" ", "-")`).
La seed initiale de `ktel_to_osm.json` (~30 entrées) couvre les hubs sûrs :

```json
{
  "chania": "khania",
  "heraklion": "iraklio",
  "rethymno": "rethumno",
  "agios-nikolaos": "agios-nikolaos",
  "palaiochora": "palaiokhora",
  "almirida": "almurida",
  "botanical-garden": "botaniko-parko",
  ...
}
```

Le fichier est versionné dans le repo. Chaque non-match observable dans le log de run est candidat à un ajout. Pas de génération auto.

### Fallback `ktel_fallback.build_fallback_lines(gaps, stops_by_slug, place_coords, existing_codes, fetch=None)`

Pour chaque `(operator, frozenset(a, b), routes_KTEL)` non matché :
1. Résoudre `a` et `b` via `resolve(...)`. Si l'un des deux est None **et** ni `PLACE_COORDS` ni `stops_by_slug` ne fournit ses coordonnées → skip + log.
2. Si stops manquants (a ou b pas dans `stops_by_slug`) → créer 2 dicts arrêts à insérer (slug, name=title-case, name_el=NULL, coords=PLACE_COORDS, prefecture, `coords_source='ktel'`, `coords_confidence='medium'`).
3. `build_geometry([a, b], fetch=...)` (réutilise `net_osrm`).
4. Durée = `mean(parse_duration_min(r.duration) for r in routes_KTEL if r.duration)` ; sinon profil enveloppe `durations.BASE_MIN + length_km * MIN_PER_KM`.
5. Construire le dict ligne : `code` via `assign_codes` (réutilise `net_nomenclature`, en passant `existing_codes` pour la stabilité), `code_official=NULL`, **`source='ktel'`**, `osm_id=NULL`.

### Garde-fou et invariants

- `MIN_BUS_LINES_FOR_APPARIER = 50` : si `bus_lines` < 50 lignes à l'ouverture, abort + log (signe que SP1 OSM est cassé, ne pas écraser).
- Le store est transactionnel : INSERTs nouveaux stops + lignes + line_stops + UPDATEs `line_id` dans une transaction Postgres.
- Aucun delete : SP2 est **additif** sur `bus_stops/bus_lines/bus_line_stops` (n'écrit que des nouveaux records source='ktel'). Les rebuilds OSM passent par `store_network` qui delete+insert tout — `ON DELETE SET NULL` puis ré-exécution SP2 reconstruit les fallback KTEL.

## Tests (TDD)

| Test | Couvre |
|---|---|
| `test_ktel_alias.py` | load JSON, lookup, fichier absent (alias vide) |
| `test_ktel_resolve.py` | cascade complète (exact, alias, coords, none) avec stops/place_coords mockés |
| `test_ktel_match.py` | match strict op+termini sur fixture réelle bus_routes + bus_lines |
| `test_ktel_fallback.py` | build_fallback_line sur 1 paire orpheline ; OSRM injecté → haversine fallback |
| `test_ktel_apparier.py` | pipeline complet sur fixture réelle → asserts (1) Pachia route Sitia→Agios Nikolaos line_id pointe sur LAS-02 ; (2) paire Heraklion↔Matala absente d'OSM produit une ligne source='ktel' |

Fixture `ktel_routes_sample.json` : extrait de ~50 routes représentatives de `bus_routes` (toutes prefectures, mix appariables/orphelines), commité.

## Cron & ordonnancement

```cron
# Existant
0  3 * * *   /opt/cretepulse-db/backup.sh
0  4 * * *   cd /opt/cretepulse && venv/bin/python buses/buses.py >> /var/log/cretepulse-buses.log 2>&1
30 4 * * *   cd /opt/cretepulse && venv/bin/python buses/alerts.py >> /var/log/cretepulse-buses.log 2>&1
0  2 * * 0   cd /opt/cretepulse && venv/bin/python buses/run_osm_build.py >> /var/log/cretepulse-osm.log 2>&1

# Nouveau (SP2)
45 4 * * *   cd /opt/cretepulse && venv/bin/python buses/run_apparier.py >> /var/log/cretepulse-osm.log 2>&1
15 2 * * 0   cd /opt/cretepulse && venv/bin/python buses/run_apparier.py >> /var/log/cretepulse-osm.log 2>&1
```

- 04:45 quotidien après alerts.py (qui finit ~04:35).
- 02:15 dimanche, 15 min après run_osm_build.py (qui prend ~14 s en run réel actuel — marge suffisante).
- Alerte Telegram via `kairos_telegram.send(Bot.PLUME)` sur `RuntimeError`/`Exception` (pattern SP1).

## Non-objectifs (YAGNI pour SP2)

- Pas de moteur de position live (→ SP3).
- Pas de carte (→ SP4).
- Pas de matching tolérant (terminus dans séquence) — strict suffit pour l'objectif 70 % et reste auditable.
- Pas de fuzzy match (Levenshtein) — alias manuel + coords couvrent les cas réels.
- Pas de reconstitution de la séquence d'arrêts intermédiaires pour les KTEL fallback — `via_stops` du scrape KTEL est quasi-vide en pratique ; viendra plus tard si besoin.

## Limites honnêtes (assumées)

- **Qualité du fallback** : KTEL fallback = ligne droite OSRM origin↔dest sans escales intermédiaires. Pour `Heraklion↔Matala` (75 km), c'est une approximation du trajet réel (que KTEL fait via Mires). Utile pour l'existence de la ligne et son ETA grossier ; mauvais pour une carte précise.
- **Maintenance de `ktel_to_osm.json`** : alias manuel à enrichir au fil des runs. 30 seeds + log curation = ~1 h/mois d'entretien manuel (estimation).
- **Taux d'appariement initial** : 70 % cible réaliste. Le reste = noms exotiques absents du référentiel, lignes courtes mal cataloguées OSM, doublons KTEL bruit.
- **Pas de réconciliation `bus_routes` ↔ vraie séquence** : on apparie route → ligne, mais on n'utilise pas la séquence détaillée OSM pour deviner les arrêts intermédiaires desservis par cette route KTEL. Ça viendra avec SP3/SP4 si besoin métier.

## Stratégie de test

- **TDD pur** sur chaque module (5 tests fixtures, OSRM injecté).
- **Sanity post-run** (objectif d'audit, non bloquant — le seul garde-fou bloquant est `MIN_BUS_LINES_FOR_APPARIER`) :
  - Au moins 70 % des paires KTEL distinctes ont un `bus_routes.line_id` non NULL.
  - Aucun `line_id` orphelin (pointe vers un id existant — garanti par FK).
  - Toutes les `bus_lines` source='ktel' ont 2 `bus_line_stops` (FK + seq 0 + seq 1).
  - Pas de `bus_lines` doublon entre source='osm' et source='ktel' (couple operator+frozenset(a,b) unique).
- **Vérif Pachia Ammos** : la route KTEL `Agios Nikolaos → Sitia` (si elle existe) a `line_id` = id de LAS-02. Le run shell exemple :
  ```sql
  SELECT br.from_place, br.to_place, bl.code, bl.source
  FROM bus_routes br JOIN bus_lines bl ON bl.id = br.line_id
  WHERE br.operator_id = 'herlas' AND lower(br.from_place) LIKE '%agios%'
  ORDER BY br.from_place;
  ```

## Risques

| Risque | Mitigation |
|---|---|
| Noms KTEL exotiques absents du référentiel | Alias manuel + audit log + coords PLACE_COORDS en filet |
| OSM rebuild casse les FK | `ON DELETE SET NULL` + cron SP2 enchaîné à 02:15 dimanche |
| KTEL scrape produit du bruit (POI hôtel, supermarchés) | Réutilise la curation `net_places` pré-existante (denylist POI), strict terminus ignore les noms bruit |
| OSRM down sur le fallback | `build_geometry` fallback haversine déjà en place + `partial_geo=true` |
| Doublon entre une ligne OSM et un fallback KTEL nouveau-créé (matching naïf entre runs) | `existing_codes` + frozenset(termini) check avant INSERT KTEL ; si la même paire reapparaît côté OSM au run suivant, le KTEL devient "orphelin" mais non écrasé (manuel) |
| Migration appliquée avant que SP1 ait tourné | Garde-fou `MIN_BUS_LINES_FOR_APPARIER = 50` |

## Réutilisation — briques existantes

- `net_osrm.build_geometry(stops, fetch=None)` : géométrie + length_km + leg_km.
- `net_timeprofile.cumulative_profile(leg_km, total_minutes)` : profil de temps.
- `net_nomenclature.assign_codes(lines, existing=None)` / `prefecture_for(lat, lng)` / `color_for(code)` : nomenclature stable.
- `net_geocode.stop_slug(name)` : normalisation slug.
- `prices._norm(s)` / `haversine_km(a, b)` / `PLACE_COORDS` : référentiel de coords manuel.
- `build_network._parse_duration_min(s)` / `_title(slug)` : helpers (reuse via import).
- `kairos_telegram.send(Bot.PLUME, ...)` : alertes (pattern `run_osm_build.py`).
