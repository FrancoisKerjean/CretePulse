# Spec - Étape C du plan GTFS : assemblage + validation du flux complet

- **Date** : 2026-06-16
- **Projet** : crete.direct (cretepulse-build)
- **Branche** : `feat/gtfs-feed` (worktree `C:\Users\fkerj\cretepulse-gtfsC`, partie de `origin/master`)
- **Statut** : design validé (Kami, 16/06) → writing-plans
- **Auteur** : Kami

## 1. Pourquoi (contexte)

Le plan GTFS crete.direct produit **le premier flux GTFS ouvert de Crète** à partir des données KTEL déjà scrapées (cf `memory/project_crete_direct_lobbying.md`). C'est un asset de données non réplicable, un levier de légitimité vis-à-vis de la Région et des KTEL (« on apporte de la donnée structurée, zéro demande d'argent »), et le moteur de la vision « carte live prédictive ».

| Étape | Fichier(s) GTFS | Statut |
|-------|-----------------|--------|
| **A** | `calendar.txt` (jours de service) - logique `daysMatch` | ✅ fait, en prod (`src/lib/bus-journey.ts:62`) |
| **B** | `stops.txt` (arrêts géolocalisés) - table `gtfs_stops` | ✅ livré, en prod (`origin/master`). 219 arrêts, 157 géocodés (72%). Qualité géocodage sous la cible ≥85% → file de curation en cours (autre terminal, branche `feat/gtfs-geocoding`). |
| **C** | **`routes.txt`/`trips.txt`/`stop_times.txt`/`calendar.txt`/`agency.txt`/`feed_info.txt` + assemblage `crete.zip` + validation** | **← CE SPEC** |
| D | publication réelle (hébergement, registres, lobbying Google) | acte owner Kami (post-C) |

**Étape C = assembler le feed.** À partir du référentiel d'arrêts (étape B) et des `bus_routes`, produire les fichiers GTFS manquants, empaqueter `crete.zip`, et le **valider** avec le `gtfs-validator` officiel MobilityData jusqu'à **zéro erreur bloquante**.

## 2. Décisions de fondation (tranchées avec Kami le 16/06)

| # | Décision | Choix retenu |
|---|----------|--------------|
| 1 | `agency.txt` / éditeur | **1 agence `crete.direct`** ; pas d'`attributions.txt`. crete.direct est aussi le `feed_publisher` (`feed_info.txt`). |
| 2 | `routes.txt` : granularité + identifiant | **1 route GTFS par corridor** (fusion `net_lines`), les 2 sens = `direction_id` 0/1. `route_id` = **code `PREF-NN`** stable (`net_nomenclature`). |
| 3 | heures de passage intermédiaires | départ terminus = **réel** (`timepoint=1`) ; intermédiaires = **estimés** par profil de temps proportionnel à la distance routière OSRM (`net_timeprofile`), tous `timepoint=0` ; arrivée terminus `timepoint=1` si durée réelle, `0` si estimée. **Règle no-invention** : aucun horaire intermédiaire n'est présenté comme publié. |
| 4 | arrêts non géocodés (`needs_review`, hors `stops.txt`) | **sautés** dans la séquence `stop_times` (logué, jamais en silence) ; trip **droppé uniquement si un terminus** manque de coords ; **jamais** de `stop_id` sans lat/lon dans `stops.txt`. |
| 5 | `trips` / `calendar` | trips **explicites** (1 par heure de départ, pas `frequencies`) ; `service_id` dérivé du **masque de jours** (port Python de `daysMatch`) ; `direction_id` 0/1 depuis from→to. `calendar` : feed = **saison courante**, fenêtre **bornée** (`build_date → horizon`), **pas de dates de bascule KTEL inventées**. |
| 6 | durées manquantes | profil calé sur l'**enveloppe calibrée existante** (`durations.py` : `BASE_MIN=10` + `MIN_PER_KM=2.7`, calibrée HAUTE) appliquée aux **km routiers OSRM** ; fallback haversine si OSRM échoue. |
| 7 | publication | pipeline **produit + valide** le `crete.zip` (zéro `ERROR`). Cible d'hébergement : `media.crete.direct/gtfs/crete.zip` + page `/gtfs` + registres ouverts (Mobility Database, transit.land). Google Transit = **levier lobbying** (pas de soumission directe : exige l'autorisation opérateur). Hébergement/inscriptions réels = **acte owner Kami**. |

## 3. Objectif & critères d'acceptation

Assembler `crete.zip`, le premier flux GTFS ouvert de Crète, validé sans erreur bloquante.

1. Les 6 fichiers manquants (`agency.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`, `calendar.txt`, `feed_info.txt`) + `stops.txt` (projeté de `gtfs_stops`) sont générés et empaquetés dans `out/gtfs/crete.zip`.
2. **`gtfs-validator` MobilityData = zéro `ERROR`.** Les `WARNING`/`INFO`/`NOTICE` résiduels sont documentés (liste auditée), pas masqués.
3. **Intégrité référentielle** : tout `stop_times.stop_id ∈ stops.txt` ; tout `trips.route_id ∈ routes.txt` ; tout `trips.service_id ∈ calendar.txt` ; tout `routes.agency_id ∈ agency.txt`.
4. **Honnêteté** : tout horaire estimé porte `timepoint=0` ; le départ terminus (publié KTEL) porte `timepoint=1`. Un `feed_info` / `README` du zip mentionne explicitement que les passages intermédiaires sont estimés.
5. **Aucune troncature silencieuse** : le build loggue le nb de corridors/trips générés, droppés (terminus non géocodé), et d'arrêts intermédiaires sautés (avec la liste).
6. **Suite pytest verte** + **sanity check** vert (`check-gtfs-feed.mjs`).
7. **Déterminisme** : deux builds sur les mêmes données produisent les mêmes `route_id`/`trip_id`/`service_id` (stabilité des codes `PREF-NN` et des identifiants dérivés).
8. **Dégradation gracieuse** : si `gtfs_stops` est partielle (étape B sous cible), le feed contient les corridors entièrement géocodés et loggue les exclusions - il ne bloque jamais sur une couverture B à 100%.

## 4. Périmètre

**Dans le périmètre :**
- Modules Python purs **portés** de `feat/bus-network` (comme `net_geocode` l'a été à l'étape B) : `net_lines.py`, `net_nomenclature.py`, `net_osrm.py`, `net_timeprofile.py`.
- Modules Python **nouveaux** : `gtfs_calendar.py` (port de `daysMatch`), `gtfs_writer.py` (writers CSV purs), `gtfs_feed_build.py` (orchestration + packaging).
- Export des 6 fichiers GTFS manquants + reprojection `stops.txt` + packaging `crete.zip`.
- Sanity check Node `scripts/check-gtfs-feed.mjs`.
- Tests pytest (portés + nouveaux).
- Doc de validation (install Java / `gtfs-validator`, ou validateur web).

**Hors périmètre (YAGNI v1) :**
- `shapes.txt` (tracé carte) : OSRM sert **uniquement** aux km du profil de temps ici ; le tracé est calculé mais pas émis en v1 (enrichissement futur).
- `frequencies.txt`, `transfers.txt`, `pathways.txt`.
- Tarifs (`fare_attributes.txt`/`fare_rules.txt` dérivés de `price_eur`) - enrichissement futur.
- `attributions.txt` (Kami a tranché : crete.direct seul).
- GTFS-RT / temps réel (= la carte `/live`, autre chantier).
- Hébergement réel + inscription registres + page `/gtfs` front (actes owner Kami / chantier front séparé).
- Toute modification du front Next.js. Cette étape = **Python + données uniquement, zéro déploiement Vercel**.

## 5. Sources de données

| Source | Rôle | Localisation |
|--------|------|--------------|
| `bus_routes` (387 lignes) | **Source des lignes/horaires** : `operator_id` (`herlas` est / `ektel` ouest), `from_place`, `to_place`, `via_stops` (jsonb ordonné), `departures_by_day` (`[{days, times}]`), `departures` (flat), `duration` + `duration_estimated`, `price_eur`, `season` | table VPS Postgres |
| `gtfs_stops` (219 arrêts, 157 géocodés) | **Référentiel d'arrêts** (étape B) : `stop_id` (slug), `stop_name`, `stop_lat`, `stop_lon`, `needs_review`, `route_count`, `prefecture` | table VPS Postgres (`20260616160000_gtfs_stops.sql`) |
| OSRM (`router.project-osrm.org`) | **Distances routières** inter-arrêts (calage du profil de temps) | API publique, **injectée**, throttlée, **cachée** (`out/osrm-cache.json`) |

`departures_by_day` exemple : `[{"days":"Mon-Fri","times":["08:00","14:30"]}, {"days":"Weekend","times":["09:00"]}]`. Fallback `departures` (flat) si `departures_by_day` absent (réutilise la logique `timesForDate`/`daysMatch` de l'étape A).

## 6. Architecture & flux de données

Pipeline pur (fonctions sans I/O), I/O isolée dans le store/lecture DB et le fetch OSRM injecté. Modules sous `scripts/scrapers/buses/` :

```
bus_routes (DB) + gtfs_stops (DB, référentiel étape B)
   │  filtrer routes : saison courante (+ routes sans saison)
   │  merge_into_lines()           ← net_lines.py (PORTÉ)
   ▼  corridors {operator_id, origin, dest, stops[slug], route_ids, key}
   │  assign_codes()               ← net_nomenclature.py (PORTÉ) → route_id PREF-NN stable
   ▼
pour chaque corridor :
   │  projeter stops[] sur gtfs_stops géocodés (lat/lon non null)
   │  DROP corridor si un terminus non géocodé (logué)
   │  build_geometry(stops géocodés) ← net_osrm.py (PORTÉ) → leg_km routiers (cache+throttle, fallback haversine)
   ▼
   pour chaque route brute du corridor → chaque (days, times) → chaque heure de départ :
      │  total_minutes = parse(route.duration) sinon enveloppe(BASE_MIN + total_km·MIN_PER_KM)
      │  cumulative_profile(leg_km, total_minutes)  ← net_timeprofile.py (PORTÉ) → offsets minutes
      │  direction_id = 0 si slug(from)==origin corridor sinon 1 ; trip_headsign = dest
      │  service_id  = days_to_weekdays(days)        ← gtfs_calendar.py (NOUVEAU)
      │  trip_id     = déterministe {route_id}-{dir}-{service_id}-{HHMM}
      ▼  stop_times rows : t = départ + offset
         timepoint : départ=1 ; intermédiaires=0 ; arrivée=1 si durée réelle sinon 0
   ▼
collecter agency / routes / trips / stop_times / calendar / feed_info / stops
   │  gtfs_writer.py (NOUVEAU)  → fichiers .txt (RFC 4180, UTF-8 sans BOM, \n)
   ▼  stops.txt = projection des SEULS gtfs_stops référencés (intégrité garantie)
   │  package → out/gtfs/crete.zip
   ▼  gtfs-validator (JAR) → 0 ERROR  ;  check-gtfs-feed.mjs (sanity)
```

**Modules livrés :**

- **Portés tel quel** (purs, déjà testés ; leurs deps existent sur master) :
  - `net_lines.py` - `merge_into_lines(routes)` → corridors. Dép : `net_geocode.stop_slug` (sur master ✓).
  - `net_nomenclature.py` - `assign_codes(lines, existing)` (PREF-NN stables), `prefecture_for`, `color_for`. Dép : `prices.haversine_km` (✓).
  - `net_osrm.py` - `build_geometry(stops, fetch)` (km routiers + tracé, fetch injecté, fallback haversine). Dép : `prices.haversine_km` (✓).
  - `net_timeprofile.py` - `cumulative_profile(leg_km, total_minutes)` (gère `total_minutes=None`). Dép : `durations.BASE_MIN/MIN_PER_KM` (✓).
- **Nouveaux :**
  - `gtfs_calendar.py` - `days_to_weekdays(label)` (port fidèle de `daysMatch` TS : `Mon-Fri` plage vs `Mon-Wed-Fri` énumération via comptage de tokens ; `Weekend`/`Weekdays`/`Every Day`/`daily` ; noms complets → tokens 3 lettres ; grec résiduel hors scope, libellés KTEL en latin). `service_id_for(weekdays)` déterministe (ex `svc-1111100`). `calendar_rows(services, window)`.
  - `gtfs_writer.py` - `write_csv(path, header, rows)` pur (échappement RFC 4180 : guillemets si virgule/quote/`\n`, UTF-8 sans BOM, fin de ligne `\n`). Un helper par fichier (`agency_row`, `route_row`, `trip_row`, `stop_time_row`, `calendar_row`, `feed_info_row`, `stop_row`).
  - `gtfs_feed_build.py` - orchestration : `load_inputs(sb, season)`, `assemble_feed(routes, stops, osrm=None, window=...)` (**pure**, retourne les tables en mémoire), `write_feed(tables, out_dir)`, `package_zip(out_dir)`, point d'entrée `build_gtfs_feed(sb, osrm=None, season=None, window=None)`.

**Greek → latin** : déjà géré en amont par `stop_slug` (étape B) ; les libellés `bus_routes` sont en latin.

## 7. Fichiers GTFS produits (schéma)

| Fichier | Colonnes | Notes |
|---------|----------|-------|
| `agency.txt` | `agency_id,agency_name,agency_url,agency_timezone,agency_lang` | 1 ligne : `crete-direct`, `crete.direct`, `https://crete.direct`, `Europe/Athens`, `en`. |
| `routes.txt` | `route_id,agency_id,route_short_name,route_long_name,route_type,route_color` | `route_id`=PREF-NN ; `route_short_name`=PREF-NN ; `route_long_name`="Origine - Dest" ; `route_type=3` (bus) ; `route_color` via `net_nomenclature.color_for`. |
| `trips.txt` | `route_id,service_id,trip_id,trip_headsign,direction_id` | `direction_id` 0=origin→dest (orientation canonique corridor), 1=inverse. |
| `stop_times.txt` | `trip_id,arrival_time,departure_time,stop_id,stop_sequence,timepoint` | `HH:MM:SS` (>24:00:00 toléré si après-minuit) ; `timepoint` 0/1 selon §2.3. |
| `calendar.txt` | `service_id,monday,…,sunday,start_date,end_date` | 7 booléens (0/1) depuis le masque ; fenêtre bornée `YYYYMMDD`. |
| `feed_info.txt` | `feed_publisher_name,feed_publisher_url,feed_lang,feed_version,feed_start_date,feed_end_date` | `crete.direct`, `https://crete.direct`, `en`, `feed_version`=horodatage build, fenêtre = `calendar`. |
| `stops.txt` | `stop_id,stop_name,stop_lat,stop_lon` | **Reprojeté** des seuls `gtfs_stops` référencés par au moins un `stop_times` → intégrité référentielle garantie (réutilise `export_stops_txt` de l'étape B si importable, sinon projection locale équivalente). |

## 8. Règles d'assemblage détaillées

**Corridors & direction.** `merge_into_lines` oriente chaque corridor sur le terminus alphabétiquement premier (`origin`). Une route brute `from→to` a `direction_id=0` si `slug(from)==origin`, sinon `1`. La séquence d'arrêts d'un trip = celle de **sa route brute** (pas le superset du corridor), filtrée aux arrêts géocodés. Un corridor peut donc porter des trips de longueurs de séquence différentes (valide GTFS).

**Profil de temps (`stop_times`).** Pour une route brute géocodée à N arrêts :
1. `leg_km` = distances routières OSRM des N-1 segments (fallback haversine par segment si OSRM échoue ou arrêt non géocodé sauté).
2. `total_minutes` = `parse(route.duration)` si présent (durée réelle) ; sinon enveloppe `BASE_MIN + total_km·MIN_PER_KM` (durée estimée).
3. `offsets = cumulative_profile(leg_km, total_minutes)` (`offsets[0]=0`, `offsets[-1]=total_minutes`).
4. Pour chaque heure de départ `t0` : `stop_time[i].arrival = stop_time[i].departure = addMinutes(t0, offsets[i])`.
5. `timepoint` : `i==0` → 1 (départ publié) ; `0<i<N-1` → 0 (estimé) ; `i==N-1` → 1 si `duration` réelle, 0 si estimée.

**Arrêts non géocodés (§2.4).** Avant calcul du profil, filtrer la séquence aux arrêts présents et géocodés dans `gtfs_stops`. Si un **terminus** (premier ou dernier de la route brute) n'est pas géocodé → **drop du trip** (logué : `route_id`, terminus manquant). Les intermédiaires non géocodés sont **retirés** de la séquence (logué, comptés) ; le trip survit terminus→terminus tant qu'il reste ≥2 arrêts géocodés.

**Service & calendrier (§2.5).** `service_id` = masque déterministe des 7 jours résolu par `days_to_weekdays` (donc « Mon-Fri » et « Monday To Friday » collapsent sur le même service → moins d'entrées `calendar`). `calendar.start_date` = date de build ; `end_date` = `start_date + horizon` (paramètre, défaut fin de saison courante ou +90j). Routes filtrées à la **saison courante** (+ routes sans `season`) ; on n'émet pas de fenêtres par saison (pas de dates de bascule KTEL inventées).

**Durées manquantes (§2.6).** Gérées nativement par `total_minutes=None` dans `cumulative_profile` (enveloppe). Quand la durée est estimée, l'arrivée terminus passe `timepoint=0`.

**Déterminisme.** `assign_codes` est stable (rangs `PREF-NN` réservés, tri longueur décroissante puis key). `service_id`/`trip_id` dérivés de valeurs canoniques. Pas de `random`/horloge dans la partie pure (l'horodatage `feed_version` est injecté au point d'entrée).

## 9. Validation & vérification

**`gtfs-validator` MobilityData (canonique).** JAR Java (Java 17+). En local/VPS :
```
java -jar gtfs-validator.jar -i out/gtfs/crete.zip -o out/gtfs/validation
```
Objectif : **zéro `ERROR`**. Les `WARNING`/`NOTICE` (ex : `feed_lang` vs noms locaux, absence de `shapes.txt`) sont **listés et justifiés** dans le rapport de build. **Voie de secours** si Java indisponible : validateur web MobilityData (`gtfs-validator.mobilitydata.org`, upload du zip). Le plan précisera l'install Java sur le VPS.

**Sanity check** `scripts/check-gtfs-feed.mjs` (node, post-build, rapide, sans Java) :
- intégrité référentielle (§3.3) ;
- monotonie : `stop_times` non-décroissants par `trip_id` (ordre `stop_sequence`) ;
- chaque `trip` a ≥2 `stop_times` ;
- échos de couverture : nb corridors, trips, trips droppés, intermédiaires sautés ;
- `stops.txt` ne contient que des arrêts référencés et tous géocodés (lat/lon ∈ bbox Crète).

## 10. Tests (TDD) & fixtures

`cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q` (local Windows) / venv VPS.

**Portés** (avec leurs tests existants de `feat/bus-network`) : `test_net_lines`, `test_net_nomenclature`, `test_net_osrm`, `test_net_timeprofile`.

**Nouveaux :**
- `test_gtfs_calendar` : `days_to_weekdays` sur toutes les formes - `Mon-Fri` (plage), `Mon-Wed-Fri` (énumération, PAS lu comme plage), `Mon, Tue, Wed`, `Weekend`, `Weekdays`, `Every Day`/`daily`, `Monday To Friday` (noms complets). `service_id_for` déterministe + collapse des libellés équivalents.
- `test_gtfs_writer` : échappement CSV (virgule, guillemet, retour ligne dans `stop_name`), UTF-8 sans BOM, fin de ligne `\n`.
- `test_gtfs_feed_build` (assemblage, `osrm=None` → fallback haversine) :
  - intermédiaire non géocodé → **sauté**, trip conservé, `stop_sequence` recompacté ;
  - terminus non géocodé → trip **droppé** (et logué) ;
  - `timepoint` corrects (départ=1, interm=0, arrivée selon durée) ;
  - durée estimée → arrivée `timepoint=0` ;
  - `direction_id` correct selon orientation corridor ;
  - `service_id` collapse `Mon-Fri` ≡ `Monday To Friday` ;
  - **intégrité de sortie** : tout `stop_id` de `stop_times` ∈ `stops` ; tout `route_id`/`service_id` résolu ;
  - déterminisme : deux assemblages → identifiants identiques.

Fixtures : un mini-jeu `bus_routes` (2 corridors, 1 avec intermédiaire non géocodé, 1 avec durée absente) + mini `gtfs_stops`, sous `fixtures/`.

## 11. Alternatives considérées

- **`route` par paire from→to** (au lieu de corridor) : plus simple mais double les routes (aller/retour) et s'éloigne de la réalité voyageur. Écarté (décision 2).
- **`frequencies.txt`** au lieu de trips explicites : compacte mais perd la fidélité des grilles horaires KTEL irrégulières. Écarté (décision 5).
- **Mapper `season` à des dates fixes** : « complet » mais invente des bascules KTEL et vieillit chaque année. Écarté (décision 5b).
- **N'émettre que les 2 termini** (zéro intermédiaire) : honnêteté maximale mais tue le routage fin. Écarté (décision 3) au profit de `timepoint=0`.
- **`attributions.txt`** nommant les KTEL : proposé pour la fidélité ; Kami a tranché crete.direct seul. Non retenu.

## 12. Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| OSRM rate-limit / endpoint instable | fetch injecté + throttle + cache local `out/osrm-cache.json` + fallback haversine par segment ; build dégradé, jamais bloquant. |
| `gtfs_stops` sous cible (72% géocodé) → peu de corridors complets | dégradation gracieuse : on émet les corridors entièrement géocodés, on loggue les exclusions ; le feed s'enrichit tout seul quand l'étape B progresse (branche `feat/gtfs-geocoding`). |
| Couplage avec étape B en cours (autre terminal) | `gtfs_stops` traitée comme **interface** (schéma stable) ; lecture seule ; `stops.txt` reprojeté des mêmes rows → pas de divergence. Aucune écriture sur `gtfs_stops`. |
| Horaires estimés pris pour publiés | `timepoint=0` systématique sur estimé + mention explicite (`feed_info`/README zip) ; règle no-invention testée. |
| Java absent sur la machine de build | voie de secours validateur web ; le plan documente l'install Java VPS. |
| Trips après-minuit (`>24:00:00`) | format GTFS étendu toléré ; départs KTEL diurnes, cas rare, géré par `addMinutes` sans modulo destructif côté `stop_times`. |
| Doublons de départs entre `departures_by_day` et `departures` flat | priorité `departures_by_day` (comme `timesForDate` étape A) ; flat = fallback uniquement si groupes absents. |

## 13. Déploiement & publication (owner Kami, accès VPS)

Étape C ne touche pas le front Vercel ⇒ pas de `push master:main` pour « livrer le pipeline ». Séquence :
1. Merge `feat/gtfs-feed` → `master` (après revue + pytest vert + sanity vert).
2. Déployer les modules sur `/opt/cretepulse/buses` (modules plats, comme étape B).
3. Installer Java sur le VPS (ou utiliser le validateur web) pour `gtfs-validator`.
4. Run réel `build_gtfs_feed(sb, osrm=make_osrm())` → `out/gtfs/crete.zip` ; valider → corriger jusqu'à **0 ERROR** ; vérifier le sanity check.
5. **Publication (étape D, séparée)** : `scp crete.zip` → `media.crete.direct/gtfs/` (Caddy, comme les assets instagram) ; page `/gtfs` (chantier front) ; inscription Mobility Database + transit.land ; Google = dossier lobbying Région/KTEL.

## 14. Séquence du plan GTFS (rappel)

A ✅ jours de service (`daysMatch`) → B ✅ arrêts géolocalisés (`stops.txt`/`gtfs_stops`) → **C (ce spec) assemblage + validation du flux complet** → D publication réelle (hébergement + registres + lobbying Google).
