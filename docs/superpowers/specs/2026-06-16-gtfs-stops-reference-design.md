# Spec — Étape B du plan GTFS : référentiel d'arrêts géolocalisés (`stops.txt`)

- **Date** : 2026-06-16
- **Projet** : crete.direct (cretepulse-build)
- **Branche** : `feat/gtfs-stops` (worktree `C:\Users\fkerj\cretepulse-gtfs`, partie de `origin/master`)
- **Statut** : design à valider (Kami) → writing-plans
- **Auteur** : Kami

## 1. Pourquoi (contexte)

La recherche lobbying/investissement a établi un constat dur et chiffré : **il n'existe aucun flux GTFS pour la Crète**, donc Google Maps ne route pas le bus interurbain, et personne ne couple « flux de visiteurs ↔ capacité transport » (cf `memory/project_crete_direct_lobbying.md`, volet investissement privé du 15/06). Produire **le premier GTFS ouvert de Crète** à partir des données KTEL que crete.direct scrape déjà est :

- un **asset de données non réplicable** (comme le snapshot Airbnb) ;
- un **levier de légitimité** vis-à-vis de la Région et des KTEL (on apporte de la donnée structurée, zéro demande d'argent) ;
- le **moteur** de la vision « carte live prédictive » (un GTFS = arrêts + lignes + horaires normalisés).

Un flux GTFS se décompose en fichiers (`stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`, `calendar.txt`…). Le plan GTFS crete.direct suit cette décomposition :

| Étape | Fichier GTFS visé | Statut |
|-------|-------------------|--------|
| **A** | `calendar.txt` (jours de service) | ✅ **fait, en prod** — `daysMatch` corrigé (`origin/master` 21d0d3b, 16/06) : lit « Mon-Wed-Fri » comme énumération + gère « Weekdays ». Logique canonique dans `src/lib/bus-journey.ts:62`. |
| **B** | **`stops.txt` (arrêts géolocalisés)** | **← CE SPEC** |
| C+ | `routes.txt` / `trips.txt` / `stop_times.txt` + assemblage & publication du flux | à venir |

**Étape B = construire le référentiel d'arrêts** : extraire, normaliser, dédupliquer et géocoder tous les lieux des routes bus. Aujourd'hui ~62 % des lieux distincts n'ont pas de coordonnées sur master (seul `PLACE_COORDS` dans `prices.py`, ~101 noms, géocode partiellement). C'est le verrou que cette étape lève.

## 2. Décision de fondation (tranchée avec Kami le 16/06)

**Option retenue : pipeline léger sur `master`, dédié GTFS.** On part des `bus_routes` (master/prod, là où vit l'étape A), on **porte les bonnes idées** déjà éprouvées sur la branche non mergée `feat/bus-network` (cascade de géocodage, allowlist, dédup par slug, garde-fou de cohérence) — **mais la curation est adaptée GTFS** (cf §8 : on ne jette plus les hôtels/POI nommés) — **sans tirer** la complexité de cette branche (ingestion OSM, carte MapLibre `/live`, web push). Livrable : une table `gtfs_stops` propre + un export `stops.txt`, indépendant et shippable vite.

Options écartées (cf section 11) : finaliser/merger `feat/bus-network` (embarque trop de dette/surface) ; basculer sur OSM comme source (dépend de l'appariement OSM↔KTEL non stabilisé).

**Sous-décisions confirmées (Kami, 16/06)** : (1) **curation GTFS** — un arrêt est un arrêt, les hôtels/resorts/POI nommés sont gardés, on ne jette que les vrais artefacts (cf §8) ; (2) **Nominatim ON sous garde-fou** (bbox + drift 45 km) ; (3) table **`gtfs_stops` colonnes GTFS-natives** ; (4) `stops.txt` = **artefact de build interne** (pas de flux public en étape B).

## 3. Objectif & critères d'acceptation

Construire `gtfs_stops`, le référentiel canonique des arrêts de bus de Crète, et son export `stops.txt`.

**Critères d'acceptation mesurables :**

1. `gtfs_stops` peuplée avec **tous les lieux distincts curés** issus de `from_place` + `to_place` + `via_stops` de toutes les lignes de `bus_routes` (île entière, est + ouest). Count-agnostic (le scrape master varie ~80-300 lignes selon saison ; le pipeline traite toutes les lignes présentes).
2. **Couverture géocodage** : ≥ **85 %** des arrêts curés ont des coordonnées de confiance `high` (référentiel/cb_places) ou `low` validée par garde-fou. (Baseline référence : 39 % référentiel-exact seul ≈ les « 62 % sans coords » ; `feat/bus-network` a atteint 79 % en référentiel seul.)
3. **Zéro coordonnée hors Crète** : toute coord stockée est dans la bbox Crète `lat ∈ [34.70, 35.75]`, `lng ∈ [23.40, 26.40]`. Les homonymes mal placés (ex « Prof. Ilias » 128 km, « Palaia Roumata » 226 km vus le 14/06) sont rejetés par le garde-fou.
4. Les arrêts non géocodés ou douteux sont **flaggés `needs_review`** et **triables par `route_count`** (popularité) pour une curation manuelle ciblée à fort impact. **Aucune troncature silencieuse** : le pipeline loggue le nombre d'arrêts gardés / `needs_review` / artefacts droppés (avec la liste des droppés).
5. `stops.txt` **structurellement valide** (colonnes GTFS, 1 ligne par arrêt géocodé, lat/lon présents et dans la bbox, échappement CSV correct).
6. **Suite pytest verte** + **sanity check** vert (`check-gtfs-stops.mjs`).
7. **Idempotence** : relancer le build n'introduit pas de doublons ; le référentiel manuel (`PLACE_COORDS`) prime toujours sur un géocodage Nominatim antérieur.

## 4. Périmètre

**Dans le périmètre :**
- Migration SQL additive `gtfs_stops` (+ RLS lecture publique, écriture service_role).
- Modules Python purs (portés/étendus depuis `feat/bus-network`) : extraction, normalisation/slug, curation, géocodage en cascade, garde-fou de cohérence, assemblage, store transactionnel.
- Export `stops.txt` (GTFS) depuis `gtfs_stops`.
- Branchement post-scrape dans `buses.py` (build offline, zéro dépendance runtime).
- Tests pytest + sanity check Node.

**Hors périmètre (YAGNI) :**
- `routes.txt` / `trips.txt` / `stop_times.txt` / `calendar.txt` et **publication d'un flux GTFS public** (étapes C+). `stops.txt` seul n'est pas un flux valide → ici c'est un **artefact de build interne**, pas une route publique servie.
- Ingestion OpenStreetMap, carte MapLibre `/live`, web push (restent sur `feat/bus-network`).
- `parent_station`, `transfers.txt`, `pathways.txt` (interurbain mono-opérateur par arrêt : inutile en v1).
- Toute modification du front Next.js. Cette étape = **Python + migration uniquement**.

## 5. Sources de données

| Source | Rôle | Localisation |
|--------|------|--------------|
| `bus_routes` (`from_place`, `to_place`, `via_stops` jsonb) | **Source brute des lieux** | table VPS Postgres, migration `20260521120000_buses.sql` + `20260613100000_bus_routes_via_stops.sql` |
| `PLACE_COORDS` (~101 noms → lat/lng) | **Référentiel manuel prioritaire** (confiance `high`) | `scripts/scrapers/buses/prices.py:73` |
| `cb_places` (table, ~800+ lieux/plages) | **Appoint géocodage** par nom (confiance `high`) | table VPS Postgres (best-effort, vide si absente) |
| `src/data/bus-places.json` (72 lieux) | **Allowlist** des localités canoniques à confiance haute (mapping nom DB → slug). N'est PAS la liste exhaustive des arrêts : les autres lieux nommés sont aussi des arrêts (cf §8). | à copier depuis `feat/bus-network` |
| Nominatim (OSM) | **Fallback géocodage** (confiance `low`, sous garde-fou) | API publique, injectée, throttlée, cachée |

`via_stops` = array JSON de noms texte bruts (ex `["Georgioupolis","Kavros","Rethymno","Bali"]`), non géocodés. Les arrêts intermédiaires sont donc inclus dans le référentiel.

## 6. Architecture & flux de données

Pipeline pur (fonctions sans I/O), I/O isolée dans le store et le fetch Nominatim injecté. Modules sous `scripts/scrapers/buses/` :

```
bus_routes (DB)
   │  collect_stops()                      ← gtfs_stops_build.py (porté de net_geocode.collect_stops)
   ▼
[ {slug, name, route_count} ... ]          dédup par slug, route_count = nb de routes (bus_routes) touchant l'arrêt
   │  curate()                             ← gtfs_places.py (allowlist / stop / drop — curation GTFS)
   ▼
arrêts curés (vrais artefacts droppés+logués) alias typos ; hôtels/POI nommés GARDÉS
   │  geocode_stop() en cascade            ← net_geocode.py (porté)
   ▼   référentiel → cb_places → Nominatim → none
candidats avec (lat,lng,source,confidence)
   │  coherence_guard()                    ← gtfs_stops_build.py (NOUVEAU, concept porté de build_network)
   ▼   bbox Crète + drift < 45 km d'un arrêt high-confidence de la même route
arrêts validés (sinon coords rejetées, needs_review=true)
   │  assign_prefecture()  [optionnel, si coords]   ← net_nomenclature.prefecture_for (porté, léger)
   ▼
lignes gtfs_stops          → store_stops() (delete+insert transactionnel, garde-fou MIN_STOPS)
   │
   └→ export_stops_txt()   → out/gtfs/stops.txt (projection des arrêts géocodés)
```

**Modules livrés :**

- `gtfs_stops_build.py` (NOUVEAU, orchestration) : `collect_stops()`, `coherence_guard()`, `assemble_stops()` (pure), `store_stops()` (transactionnel, garde-fou `MIN_STOPS`), `export_stops_txt()`, point d'entrée `build_gtfs_stops(sb, nominatim=None)`.
- `net_geocode.py` (PORTÉ tel quel) : `stop_slug()`, `collect_stops()`, `geocode_stop()`, `coords_index_by_slug()`. Importe `prices._norm`.
- `gtfs_places.py` (PORTÉ de `net_places` mais **curation adaptée GTFS**) : `status_of()`, `canonical_slug()`, `display_name()`, `ALIAS_FIX`. Lit `src/data/bus-places.json` (allowlist). **Le filtre de bruit est paré et purement structurel** : on ne droppe QUE des artefacts (codes route `^A\d+`, « on the national », chaînes vides/footnotes), **jamais sur la base d'un nom** ; les hôtels/resorts/POI nommés (et un éventuel « Chania Express ») sont **gardés** comme arrêts (cf §8). La `DENYLIST_POI` SEO d'origine (Malia Palace, University Gallou, Botanical Garden…) est **abandonnée** ici car ce sont de vrais arrêts.
- `net_nomenclature.py` (PORTÉ, on n'utilise que `prefecture_for()` + `PREFECTURE_CENTERS`). Optionnel.
- `src/data/bus-places.json` (COPIÉ depuis `feat/bus-network`).
- `buses.py` (master) : ajout d'un appel `build_gtfs_stops(sb)` **après** le scrape herlas/ektel (comme l'était `build_network`), dégradation gracieuse si échec (log, n'avorte pas le scrape).

**Greek → latin** : `stop_slug` passe par `unidecode` pour translittérer tout libellé grec résiduel (les horaires KTEL sont surtout en latin, mais garde-fou). Dépendance `unidecode` à ajouter au `requirements.txt` du scraper si absente.

## 7. Schéma `gtfs_stops` (migration additive)

Colonnes **nommées GTFS** pour que `stops.txt` soit une projection triviale et que les tables sœurs futures (`gtfs_routes`, `gtfs_trips`, `gtfs_stop_times`, `gtfs_calendar`) restent cohérentes.

```sql
-- supabase/migrations/20260616xxxxxx_gtfs_stops.sql
create table if not exists gtfs_stops (
  stop_id            text primary key,        -- = slug canonique (stable, = GTFS stop_id)
  stop_name          text not null,           -- libellé d'affichage (latin)
  stop_name_el       text,                    -- grec si connu (sinon null)
  stop_lat           double precision,        -- null tant que non géocodé
  stop_lon           double precision,
  coords_source      text not null default 'none',   -- 'referentiel'|'cb_places'|'geocoded'|'none'
  coords_confidence  text not null default 'low',     -- 'high'|'low'
  needs_review       boolean not null default false,  -- true = à curer manuellement
  prefecture         text,                    -- 'HER'|'LAS'|'CHA'|'RET' (par proximité, si coords)
  route_count        integer not null default 0,      -- nb de routes (bus_routes) touchant l'arrêt (priorisation curation)
  updated_at         timestamptz not null default now()
);

alter table gtfs_stops enable row level security;
drop policy if exists "public read gtfs_stops" on gtfs_stops;
create policy "public read gtfs_stops" on gtfs_stops for select using (true);
grant select on gtfs_stops to anon, authenticated;
grant all    on gtfs_stops to service_role;
notify pgrst, 'reload schema';
```

Additive, n'altère pas `bus_routes` ni quoi que ce soit en prod. **N'entre pas en collision** avec la table `bus_stops` de `feat/bus-network` (nom + nommage de colonnes différents).

## 8. Règles de normalisation, dédup & curation (adaptées GTFS)

- **Slug** (`stop_slug`) : `unidecode` → minuscules → `&`→`and` → espaces→`-`. Clé de dédup et `stop_id`.
- **Dédup** : par slug ; `name` = premier libellé vu ; `route_count` = nb de routes distinctes (`bus_routes`) touchant le slug.
- **Alias typos** (`ALIAS_FIX`) : `rerhymno`→Rethymno, `hrakleio`→Heraklion, etc.

**Curation 3 statuts — révisée pour GTFS** (décision Kami 16/06 : « y'a vraiment des arrêts aux hôtels »). En GTFS un arrêt est tout point d'embarquement réel : on ne supprime que les artefacts de parsing, **jamais un lieu nommé**.

- `allowlist` → présent dans `bus-places.json` → slug canonique sûr, confiance haute.
- `drop` → **uniquement des artefacts structurels, jamais un nom de lieu** : codes route (`^A\d+`), « on the national road »/segments routiers, chaînes vides/espaces, notes de bas de page. **Aucun drop fondé sur un nom** : un « Chania Express » ou un hôtel passe donc en `stop`/`needs_review`, jamais droppé (on ne parie pas sur « est-ce un service ou un lieu », le garde-fou + `needs_review` protègent). **Exclu + loggué** (liste auditée à chaque build, jamais de troncature silencieuse).
- `stop` → **tout lieu nommé, hôtels/resorts/supermarchés/POI inclus** (Malia Palace, Blue Bay, University Gallou, Botanical Garden, Cretaquarium…). **Gardé comme arrêt**, géocodé, `needs_review=true` jusqu'à validation manuelle.

**Principe « garder > jeter »** : au moindre doute on garde (l'arrêt part en `needs_review`, jamais supprimé en silence) — jeter perd de la donnée, garder est réversible. C'est le garde-fou de cohérence (§9) qui place correctement un hôtel homonyme près de sa route. La frontière `drop`/`stop` étant subjective, **la liste des `drop` est imprimée à chaque build pour audit Kami** : un faux positif se rattrape en le retirant des patterns.

## 9. Géocodage en cascade + garde-fou de cohérence

**Cascade** (`geocode_stop`, déterministe) :
1. `PLACE_COORDS` (nom normalisé) → `referentiel`, `high`.
2. `cb_places` (par slug/nom) → `cb_places`, `high`.
3. Nominatim (si injecté) → `geocoded`, `low`.
4. sinon → `none`, `needs_review=true`.

**Garde-fou de cohérence** (`coherence_guard`, NOUVEAU — concept porté de `build_network` 14/06) appliqué **uniquement aux candidats `geocoded`/`low`** (le référentiel manuel est réputé sûr) :
- coord **dans la bbox Crète** (sinon rejet) ;
- coord à **< `MAX_GEOCODE_DRIFT_KM` = 45 km** (haversine) d'**au moins un arrêt `high`-confidence partageant une route** (même ligne de `bus_routes`) avec cet arrêt (sinon rejet : homonyme probable).
- Rejet ⇒ `coords_source='none'`, `coords_confidence='low'`, `needs_review=true` (on garde l'arrêt, on jette juste la coord douteuse).

**Modèle d'exécution Nominatim** : offline, au scrape hebdo. Throttle 1 req/s, `User-Agent` explicite, **cache local JSON** (`out/nominatim-cache.json`) pour ne pas re-interroger l'endpoint gratuit. Résultats persistés dans `gtfs_stops` ⇒ **zéro dépendance runtime**. Nominatim **injecté** (les tests passent `None`).

## 10. Export `stops.txt`

`export_stops_txt(stops)` → `out/gtfs/stops.txt` (chemin de build, non servi publiquement en étape B).

- Colonnes : `stop_id,stop_name,stop_lat,stop_lon` (+ `stop_code` = code préfecture optionnel plus tard).
- **N'inclut que les arrêts géocodés** (`stop_lat`/`stop_lon` non null) — GTFS exige lat/lon pour `location_type=0`. Les arrêts `needs_review` sans coord restent dans la table mais sont exclus de l'export.
- Échappement CSV RFC 4180 (guillemets si virgule/quote dans `stop_name`). UTF-8 sans BOM, fin de ligne `\n`.

## 11. Alternatives considérées

- **Finaliser/merger `feat/bus-network`** : capitalise les 79 % déjà géocodés mais embarque OSM SP1/SP2, MapLibre `/live`, web push, ~100 fichiers et la dette de la branche. Écarté pour livrer vite et propre. La duplication des modules purs (`net_geocode`/`gtfs_places`/`bus-places.json`) est assumée : ils sont purs et testés ; si `feat/bus-network` est un jour repris, on réconcilie (ou on retire `bus_stops` au profit de `gtfs_stops`).
- **Source OSM** (~1791 arrêts déjà géolocalisés) : coords gratuites mais dépend de l'appariement OSM↔KTEL (SP2 non stabilisé) et de la couverture OSM réelle des lignes interurbaines. Écarté pour l'étape B ; reste une **piste d'enrichissement** futur des arrêts `needs_review`.

## 12. Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Nominatim rate-limit / endpoint instable | throttle 1 req/s + cache local + injection (build dégradé, pas bloquant) ; les arrêts non résolus tombent en `needs_review`, jamais d'aberration. |
| Homonymes grecs (plusieurs « Agios Nikolaos », « Profitis Ilias »), hôtels homonymes | garde-fou bbox + drift 45 km vs arrêt `high` de la même route → place chaque hôtel/POI près de sa ville. |
| Hôtels/POI = vrais arrêts mais durs à géocoder précisément | gardés en `stop` + `needs_review` ; Nominatim gère bien les POI nommés ; le non-résolu est trié manuellement par `route_count`. Aucun lieu nommé n'est droppé. |
| Faux positif de la frontière `drop`/`stop` | liste des `drop` imprimée à chaque build (audit) ; patterns ajustables ; principe « garder > jeter ». |
| Contention VPS↔Vercel pendant build (vu le 10/06) | build hors fenêtre de déploiement ; étape B ne déclenche aucun deploy Vercel. |
| Dérive vs `feat/bus-network` | nommage `gtfs_*` distinct + section relationship documentée ici. |

## 13. Tests (TDD) & vérification

`cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q` (local Windows) / venv VPS.

Cas (portés + nouveaux) :
- `stop_slug` : translittération grecque, `&`, espaces multiples, typos via `ALIAS_FIX`.
- `collect_stops` : dédup par slug, `route_count` correct, via_stops inclus, libellé = premier vu.
- `status_of` / `canonical_slug` : allowlist ; `drop` UNIQUEMENT sur artefacts structurels (`A90`, « on the national », vide) ; un hôtel/POI nommé (Malia Palace, University Gallou, Botanical Garden) **ou un libellé ambigu (« Chania Express »)** est classé **`stop` (gardé)**, jamais droppé sur la base du nom.
- `geocode_stop` : ordre de cascade strict (référentiel > cb_places > nominatim > none) ; confiances correctes.
- `coherence_guard` : accepte coord dans bbox + à < 45 km d'un sibling high ; **rejette** hors bbox ; **rejette** homonyme à 128/226 km (fixtures réelles 14/06).
- `assemble_stops` : idempotence (référentiel prime sur géocodage antérieur) ; garde-fou `MIN_STOPS` (refus d'écrire un référentiel quasi vide).
- `export_stops_txt` : n'exporte que les géocodés ; colonnes GTFS ; échappement CSV (nom avec virgule).

**Sanity check** : `scripts/check-gtfs-stops.mjs` (node, post-build) — chaque row a `stop_id`+`stop_name` ; toute coord ∈ bbox ; loggue couverture % + nb `needs_review` ; `stops.txt` row count == nb géocodés.

## 14. Déploiement (owner Kami, accès VPS)

Étape B ne touche pas le front Vercel ⇒ pas de `push master:main` pour « livrer ». Séquence :
1. Merge `feat/gtfs-stops` → `master` (après revue).
2. Appliquer la migration `gtfs_stops` sur le Postgres VPS.
3. Déployer les modules sur `/opt/cretepulse` + `pip install unidecode` (venv VPS).
4. Run réel `build_gtfs_stops` (Nominatim ON) → mesurer couverture, vérifier sanity check.
5. Revue manuelle de la liste `needs_review` triée par `route_count` (top-up coords des arrêts à fort trafic).

## 15. Séquence du plan GTFS (rappel)

A ✅ jours de service (`daysMatch`) → **B (ce spec) arrêts géolocalisés** → C `routes.txt`/`trips.txt`/`stop_times.txt` (corridors + séquences + heures de passage estimées via profil de temps) → D assemblage + validation `gtfs-validator` + publication du flux ouvert.
