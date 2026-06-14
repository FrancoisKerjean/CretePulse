# Réseau bus OSM — Sous-projet 1 : ingestion OpenStreetMap

**Date** : 2026-06-14
**Auteur** : Kami + Claude (brainstorming)
**Statut** : design validé, prêt pour plan d'implémentation
**Vision finale** : carte **live prédictive** de tous les cars/bus de Crète — position estimée de chaque bus en temps réel (IA prédictive). Ce sous-projet livre la **fondation topologique** dont la prédiction a besoin.

## Contexte : pourquoi OSM

Le réseau actuel (`bus_routes`, Plans 1 + 1.5) est dérivé des **titres de lignes KTEL** : il ne contient que les terminus + de rares arrêts intermédiaires, et **manque les arrêts physiques** le long des routes. Vérifié le 14/06 : `Pachia Ammos` — carrefour réel desservi sur l'axe Agios Nikolaos↔Sitia — est **absent** des données (0 mention dans `bus_routes`). Aucune curation ne peut faire apparaître un arrêt absent de la source.

**OpenStreetMap a la donnée manquante** (vérifié par spike Overpass le 14/06) :
- **1791 arrêts** `highway=bus_stop` géolocalisés en Crète (vs 186 dérivés des titres KTEL) ;
- **221 relations `route=bus`** avec **séquences d'arrêts ordonnées** + opérateur + (souvent) code officiel ;
- la ligne `Agios Nikolaos→Sitia` y a **19 arrêts ordonnés dont Pachia Ammos** (`Παχειά Άμμος`), Gournia, Kavousi, Tourloti… ;
- **142/221 lignes (64 %) ont un `ref`** officiel (`ΗΚ-ΑΡΧ`, urbain `09`…) ;
- 4 réseaux : KTEL Ηρακλείου-Λασιθίου (est/herlas), KTEL Χανίων-Ρεθύμνου (ouest/ektel), Αστικό Ηρακλείου (urbain), Αστικό Χανίων (urbain).

Licence OSM = ODbL (libre, attribution requise). Rome2rio (alternative envisagée) a la couverture mais est commercial (API payante, scraping CGU-risqué) et agrège lui-même OSM ; OSM est la source libre, pérenne et déjà complète.

## Objectif de ce sous-projet (SP1)

Peupler le réseau (`bus_stops` / `bus_lines` / `bus_line_stops`) **depuis OSM**, sur **toute la Crète**, avec : tous les arrêts physiques géolocalisés, toutes les lignes OSM avec leurs **séquences ordonnées**, les **codes officiels**, les tracés routiers OSRM et le profil de temps. Conséquence majeure : **plus de géocodage** (OSM fournit les coordonnées) — Nominatim / garde-fou / référentiel manuel deviennent inutiles pour les arrêts OSM.

**Critère de succès vérifiable** : après build, `bus_line_stops` de la ligne Agios Nikolaos↔Sitia contient Pachia Ammos entre Gournia et Kavousi, à sa vraie position.

## Décisions de cadrage (verrouillées avec Kami)

| Sujet | Décision |
|---|---|
| Articulation des sources | **OSM = topologie** (arrêts/lignes/séquences/codes) ; **KTEL = horaires** (rattachés en SP2) |
| Périmètre | **Toute la Crète** (herlas + ektel + urbains Heraklion/Chania) |
| Identifiant affiché | **Code officiel si dispo, sinon PREF-NN** crete.direct |
| Lignes KTEL absentes d'OSM | **Fallback** : KTEL comble les trous (implémenté en SP2) |
| Géométrie | **OSRM** sur la séquence OSM (le tracé OSM natif via les ways = amélioration future) |

## Périmètre des sous-projets (vision d'ensemble)

- **SP1 (ce doc)** : ingestion OSM — topologie complète en base.
- **SP2** : fusion — apparier les horaires KTEL aux lignes OSM (par from/to + opérateur) + fallback des lignes KTEL absentes d'OSM.
- **SP3** : moteur prédictif — position estimée de chaque bus à l'instant `t` (horaire de départ + profil de temps + tracé).
- **SP4** : carte live — front MapLibre animant les bus en mouvement.

## Source de données : Overpass

### Requête principale (une passe)

```
[out:json][timeout:180];
relation["route"="bus"](34.78,23.40,35.75,26.40);
out body;        // relations + members (ordre préservé)
node(r);         // nodes membres (arrêts)
out body;        // leurs lat/lng + tags
```

`relation.members[]` est **ordonné** (convention OSM Public Transport v2) ; `node(r)` résout les nodes référencés avec coordonnées et tags. Une requête séparée récupère le référentiel complet d'arrêts (`node["highway"="bus_stop"](bbox); out body;`) pour les arrêts hors relation (référentiel, sans ligne).

### Robustesse (impérative — Overpass est instable)

- **Retry** + **miroir de secours** (`overpass-api.de` → `overpass.kumi.systems`).
- **Cache disque** de la réponse JSON brute (rejouable, sert de fixture de test).
- **User-Agent** explicite (`crete.direct-bot/1.0 (+https://crete.direct)`).
- **Garde-fou** (même esprit que `store.MIN_ROUTES`) : ne JAMAIS écraser la DB si la réponse contient `< MIN_OSM_LINES` (p. ex. 50) lignes ou `< MIN_OSM_STOPS` (p. ex. 500) arrêts → conserve la donnée précédente + alerte Telegram. Jamais de réseau vide ni tronqué silencieux.

## Pipeline `osm_network.py`

Nouveau module (`scripts/scrapers/buses/osm_network.py`) + sous-modules focalisés. Étapes :

1. **Fetch** (`osm_fetch.py`) : Overpass avec retry/mirror/cache → JSON brut.
2. **Parse arrêts** (`osm_parse.py`) : pour chaque node membre → `{osm_id, name_el (grec), name (translittéré ou name:en), lat, lng, slug}`. Dédup par `osm_id`.
3. **Parse lignes** (`osm_parse.py`) : pour chaque relation → `{osm_id, ref, operator (normalisé), from, to, stops: [osm_id ordonnés, rôle stop/platform], }`. **Dédup des arrêts consécutifs identiques** (un terminus apparaît souvent en double : node `stop` + node `platform`) par proximité (< 80 m) ou nom identique.
4. **Fusion aller/retour + variantes** (`osm_lines.py`, réutilise la logique de `net_lines`) : regrouper par `(operator, frozenset(terminus_slugs))` ; garder la séquence la plus complète, orientation canonique (terminus alphabétique premier). 2 relations `A→B` / `B→A` = une ligne bidirectionnelle.
5. **Codes** (`osm_codes.py` + `net_nomenclature`) : `code_official` = `ref` OSM (nettoyé) si présent, sinon `null` ; `code` = PREF-NN via `net_nomenclature.assign_codes` (préfecture par proximité du terminus origine, stable entre builds via mapping persisté). `code` est l'identifiant interne stable (PK) ; le front affiche `code_official ?? code` (cf. « Modèle de données »).
6. **Géométrie + distances** (`net_osrm`, réutilisé) : OSRM route sur la séquence d'arrêts OSM → polyline + `leg_km`. Fallback haversine si OSRM échoue.
7. **Profil de temps** (`net_timeprofile`, réutilisé) : `cumulative_minutes` calé sur une durée **estimée** (`durations` envelope) en SP1 ; la vraie durée KTEL est branchée en SP2.
8. **Store** (`osm_store.py`) : delete+insert transactionnel des 3 tables, garde-fou `MIN_OSM_*`, `source='osm'`.

### Normalisation des noms (composant critique)

`name:en` n'existe que sur ~2 % des arrêts → **translittération grec→latin obligatoire**, via `unidecode` (ajout à `requirements.txt`). Règle par arrêt :
- `name_el` = tag `name` (grec, ex `Παχειά Άμμος`) ;
- `name` (affichage latin) = tag `name:en` si présent, sinon `unidecode(name_el)` (ex `Pacheia Ammos`) ;
- `slug` = `stop_slug(name)`.

La translittération n'est pas parfaite (ELOT 743 stricte serait mieux) mais lisible et suffisante pour le MVP ; corrigeable par une table d'exceptions.

### Normalisation des opérateurs

OSM stocke l'opérateur en grec, avec variantes. Table `OPERATOR_MAP` :

| Chaîne OSM (contient) | id interne |
|---|---|
| `Ηρακλείου-Λασιθίου` / `ΗΡΑΚΛΕΙΟΥ-ΛΑΣΙΘΙΟΥ` | `herlas` |
| `Χανίων Ρεθύμνου` / `ΧΑΝΙΩΝ ΡΕΘΥΜΝΟΥ` | `ektel` |
| `Αστικό … Ηρακλείου` | `urban-her` |
| `Αστικό … Χανίων` | `urban-cha` |
| `KTEL` / `ΚΤΕΛ` (générique) ou absent | inféré par géo du terminus (préfecture), sinon `unknown` |

`bus_operators` est étendu avec `urban-her` / `urban-cha`.

## Modèle de données

Migrations additives (les 3 tables existent déjà, Plans 1/1.5) :

```sql
-- bus_stops : origine OSM
alter table bus_stops add column if not exists osm_id bigint;
-- coords_source accepte désormais 'osm' (valeur, pas de contrainte) ; needs_review quasi tjrs false

-- bus_lines : code officiel + lien OSM + source
alter table bus_lines add column if not exists osm_id bigint;
alter table bus_lines add column if not exists code_official text;  -- ref OSM / n° urbain, affiché en priorité
alter table bus_lines add column if not exists source text not null default 'osm';  -- 'osm' | 'ktel' (SP2)
```

- `bus_lines.code` reste l'**identifiant interne stable** = PREF-NN (PK unique, jamais renuméroté). `code_official` = label terrain (`ΗΚ-ΑΡΧ`, `09`…), affiché en priorité par le front (`code_official ?? code`). Ce découplage garantit la stabilité même si une ligne gagne/perd un `ref` OSM entre deux builds.
- `bus_stops.coords_source='osm'`, `coords_confidence='high'`.
- `bus_line_stops` : inchangé (séquence + `cumulative_minutes`), mais les arrêts viennent d'OSM.

## Réconciliation avec l'existant

`osm_network.py` **remplace `build_network.py`** (titres KTEL) comme **builder primaire** des tables réseau. Concrètement :
- `buses.py` continue de peupler `bus_routes` (source brute KTEL = **horaires**, nécessaire à SP2). L'appel `build_network(sb)` ajouté en Plan 1 (Task 8) est **retiré** de `buses.py` (le réseau dérivé des titres est superseded).
- `build_network.py` et ses modules (`net_geocode`, `net_places`, `net_timeprofile`, `net_nomenclature`, `net_osrm`) sont **conservés** : `net_osrm` / `net_timeprofile` / `net_nomenclature` sont réutilisés par `osm_network` ; `build_network` (titres) reste disponible pour le **fallback SP2** (lignes KTEL absentes d'OSM).
- Le pipeline OSM a sa propre cadence (cron hebdo distinct ; OSM bouge peu).

## Non-objectifs (YAGNI pour SP1)

- Pas d'appariement des horaires KTEL (→ SP2).
- Pas de fallback des lignes KTEL absentes d'OSM (→ SP2).
- Pas de moteur de position live (→ SP3) ni de carte animée (→ SP4).
- Pas d'extraction du tracé OSM natif (ways) — OSRM sur les arrêts suffit (amélioration future).
- Pas de translittération ELOT 743 stricte — `unidecode` + table d'exceptions au besoin.
- Pas d'ingestion des arrêts orphelins (hors relation) en base de lignes ; ils peuvent peupler `bus_stops` comme référentiel mais ne portent pas de ligne.

## Limites honnêtes (assumées)

- **Complétude OSM variable** : 221 lignes mappées, mais OSM peut manquer des liaisons rurales que KTEL connaît → le fallback KTEL (SP2) les comblera ; jusque-là, le réseau = ce qu'OSM couvre.
- **79 relations sans `operator`** : opérateur inféré par géo (préfecture du terminus) ou `unknown`.
- **Translittération approximative** (`Παχειά Άμμος` → `Pacheia Ammos`), corrigeable par exceptions.
- **Fraîcheur OSM** : dépend des contributeurs ; un horaire/arrêt récent KTEL peut manquer dans OSM.
- **Durée estimée en SP1** (vraie durée KTEL en SP2) → `cumulative_minutes` provisoire.

## Stratégie de test

- **`osm_parse`** : pytest sur **fixture JSON Overpass réelle committée** (extraite au spike) — extraction des arrêts (osm_id/coords/translit), séquence ordonnée, dédup stop/platform consécutifs, parse `ref`/`from`/`to`/`operator`, normalisation opérateur. Cas réel : la ligne Agios Nikolaos→Sitia produit ≥ 17 arrêts dont `pacheia-ammos`/`pachia-ammos`.
- **`osm_lines`** (fusion) : pytest sur cas synthétiques (aller/retour → 1 ligne, variantes → séquence la plus longue, orientation canonique).
- **`osm_codes`** : `code_official` depuis `ref`, fallback PREF-NN, stabilité.
- **Translittération** : table de cas grec→latin (`unidecode`).
- **Garde-fou store** : refuse l'écriture sous `MIN_OSM_*`.
- **Sanity réseau** (`scripts/check-bus-network.mjs`, déjà écrit) : invariants post-build (séquences contiguës, `cumulative_minutes` croissant, ≥ 2 arrêts/ligne).
- **Vérif réelle** (déploiement) : Pachia Ammos présent et bien positionné ; comparer nb arrêts/lignes vs baseline.

## Risques

| Risque | Mitigation |
|---|---|
| Overpass indisponible/lent | retry + miroir + cache + garde-fou MIN (jamais d'écrasement par une réponse partielle) |
| Séquences OSM partielles/désordonnées | dédup consécutifs, rejet `< 2` arrêts, fusion conservatrice par terminus |
| Doublons stop/platform | dédup par proximité (< 80 m) ou nom identique consécutif |
| Translittération illisible sur cas tordus | table d'exceptions ; `name_el` grec toujours conservé |
| Régression (lignes KTEL non-OSM perdues) | fallback KTEL en SP2 **avant** tout déploiement ; aucun déploiement intermédiaire |
| Conflit d'écriture (build_network vs osm_network) | `build_network` retiré de `buses.py` ; OSM = builder primaire unique |
| Volume OSRM (lignes à 19+ arrêts × 221) | un appel par ligne, pré-calculé hebdo, caché ; fallback haversine |

## Réutilisation — ce qui existe déjà et sert tel quel

`net_osrm` (tracés + fallback), `net_timeprofile` (profil), `net_nomenclature` (PREF-NN + préfecture), `net_lines` (logique de fusion par terminus), `store` (pattern garde-fou), `check-bus-network.mjs` (sanity). Le pipeline OSM **branche ces briques** sur une nouvelle source d'entrée (Overpass au lieu des titres KTEL).
