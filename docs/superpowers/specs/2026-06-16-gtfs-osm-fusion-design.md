# Spec - GTFS fusion OSM/KTEL + garde-fou terre/mer

- **Date** : 2026-06-16
- **Projet** : crete.direct (cretepulse-build)
- **Branche** : `feat/gtfs-fusion` (depuis `feat/gtfs-feed` qui porte l'assembleur étape C, ou depuis `master` une fois l'étape C mergée)
- **Statut** : design validé (Kami, 16/06 « ok go ») → writing-plans
- **Auteur** : Kami

## 1. Pitch (en clair)

On a **deux cartes** du même réseau de bus crétois :
- **KTEL** (`bus_routes`) connaît les **horaires** (départs, jours, prix) mais a des **arrêts mal placés** (certains dans la mer) et des **lignes droites**.
- **OSM** (`bus_lines`/`bus_stops`, ce que `/live` utilise déjà) a des **arrêts précis sur terre** et des **tracés qui suivent les routes**, mais **pas les horaires** et ne couvre que **la moitié** des lignes.

La fusion prend le meilleur de chaque : **horaires KTEL** + **dessin OSM là où on l'a** (49 % du réseau) + un **« videur » terre/mer** pour jeter les arrêts en mer sur l'autre moitié. Résultat : carte propre, vrais tracés routiers sur la moitié du réseau tout de suite, **zéro duplication** (on réutilise le travail `/live`).

## 2. Pourquoi (contexte)

L'étape C a produit un flux GTFS valide depuis les seules données KTEL. Le rendu réel (carte de preuve, 16/06) a révélé deux défauts de **crédibilité** : (a) des **arrêts dans l'eau** (géocodage Nominatim qui tombe au large), (b) des **lignes droites** qui ne suivent pas les routes. Un flux avec ces défauts dessert l'angle lobbying (« on apporte de la vraie donnée ») et ne peut pas être mis en avant sur le site.

Constat décisif (diagnostic 16/06, données prod) : `/live` repose sur un jeu OSM qui **résout déjà ces deux problèmes** pour une partie du réseau. Reconstruire une version parallèle (ce que fait l'étape C pour 100 % des routes) duplique l'effort et donne une qualité inférieure là où OSM existe. Décision Kami (16/06) : **fusionner** plutôt que patcher KTEL seul.

## 3. État des données (vérifié le 16/06, PostgREST anon prod)

| Table | Rôle | Faits |
|-------|------|-------|
| `bus_routes` (387, KTEL) | **horaires** + appariement | `departures_by_day`, `departures`, `duration`, `season`, `from_place`/`to_place`/`via_stops`, **`line_id`** (FK → `bus_lines`, **189 non-null = 49 %**) |
| `bus_lines` (158, OSM) | **tracé + identité ligne** | `code` (PREF-NN), `geometry` (`[[lng,lat],…]` route réelle), `color`, `total_minutes`, `length_km`, `partial_geo`, `operator_id`. **94 lignes référencées par des routes KTEL, toutes avec geometry**. |
| `bus_line_stops` (995, OSM) | **séquence d'arrêts + timing** | `line_id`, `stop_id`, `seq`, `cumulative_km`, **`cumulative_minutes` (995/995 remplis)** |
| `bus_stops` (513, OSM) | **arrêts sur terre** | `id`, `slug`, `name`, `name_el`, `lat`, `lng`, `prefecture`, `osm_id` |
| `gtfs_stops` (219, KTEL) | arrêts KTEL (étape B) | `stop_id`, `stop_name`, `stop_lat`, `stop_lon`, `coords_source`, `coords_confidence`, `needs_review`, `route_count` (problème arrêts en mer ici) |

**Couverture fusion :** 189/387 routes (49 %) → 94 lignes OSM de qualité ; 198/387 (51 %) restent en chemin KTEL.

## 4. Objectif & critères d'acceptation

Produire un flux GTFS **crédible visuellement** : zéro arrêt en mer, tracés routiers là où disponibles, en réutilisant les données OSM de `/live`.

1. **Zéro arrêt en mer** dans `stops.txt` : tout arrêt émis est sur terre (OSM par construction, ou KTEL validé par le garde-fou terre/mer).
2. **Routes matchées (189)** : leur tracé suit la route (`shapes.txt` depuis `bus_lines.geometry`), leurs arrêts sont les arrêts OSM sur terre, leur timing intermédiaire vient de `cumulative_minutes`.
3. **Routes non matchées (198)** : conservées (horaires KTEL), arrêts KTEL **filtrés par le garde-fou terre/mer** (un arrêt en mer perd sa coord → `needs_review`, exclu du flux), tracé OSRM (ou ligne droite en dernier recours).
4. **`shapes.txt`** présent et référencé par les trips.
5. **Honnêteté inchangée** : départ terminus `timepoint=1` (heure publiée), intermédiaires estimés `timepoint=0`, `NOTICE.txt` conservé.
6. **Validation** : `gtfs-validator` 0 `ERROR` ; sanity check étendu (intégrité réf + `shape_id` valides + arrêts on-land) vert ; **suite pytest verte**.
7. **Déterminisme** : deux builds identiques sur mêmes données.
8. **Aucune écriture DB** : lecture seule de `bus_*` et `gtfs_stops`. Aucune mutation de `/live`.

## 5. Périmètre

**Dans le périmètre :**
- `coastline.py` (NOUVEAU, pur) : contour Crète (GeoJSON embarqué `data/`) + `on_land(lat, lng, tol_m)`.
- Garde-fou terre/mer branché dans le chemin KTEL non matché (sur `gtfs_stops`).
- Aiguillage matché/non-matché dans le constructeur GTFS : lecture de `bus_lines`/`bus_line_stops`/`bus_stops`, construction des trips matchés depuis OSM.
- `shapes.txt` (writer + intégration), `shape_id` sur les trips.
- Sanity check étendu + tests pytest.

**Hors périmètre (YAGNI) :**
- Améliorer le matching OSM↔KTEL (49 %→90 %) : chantier séparé (l'`apparier`), le plus dur.
- Refonte de `/live` (il consomme déjà ces données ; ici on ne touche pas le front).
- Dédup spatiale exhaustive OSM↔KTEL des arrêts (quelques quasi-doublons résiduels tolérés en v1, cf §7).
- Curation manuelle exhaustive des `needs_review` (chantier données continu).
- Déploiement front Vercel (Python + données uniquement).

## 6. Architecture & flux

Le constructeur GTFS (`gtfs_feed_build`) gagne un **aiguillage par route** :

```
pour chaque route KTEL r :
  ├─ si r.line_id != null ET la ligne OSM L a geometry + bus_line_stops :
  │     CHEMIN MATCHÉ (OSM)
  │     · séquence = bus_line_stops[L] triée par seq → bus_stops (coords sur terre, name)
  │     · orientation : si from_place(r) plus proche de seq[0] → sens direct ; sinon reverse
  │       (séquence inversée + cumulative_minutes miroir = total - cumul)
  │     · timing intermédiaire = cumulative_minutes (offset depuis l'heure de départ)
  │     · shape = bus_lines.geometry[L] → shapes.txt (shape_id = shp-{code})
  │     · route_id = bus_lines.code (PREF-NN OSM) ; horaires = r.departures_by_day
  │
  └─ sinon : CHEMIN KTEL (fallback, = assemble_feed étape C)
        · séquence = gtfs_stops (curate_routes) FILTRÉE par coastline.on_land
          (arrêt en mer → retiré ; terminus en mer → trip droppé, logué)
        · timing = profil enveloppe / OSRM (net_timeprofile)
        · shape = net_osrm.build_geometry (tracé routier) → shapes.txt ; sinon ligne droite
        · route_id = PREF-NN via net_nomenclature.assign_codes(existing = codes OSM matchés)
  ▼
union stops.txt (OSM matchés + KTEL non matchés validés on-land)
+ routes.txt + trips.txt + stop_times.txt + calendar.txt + agency.txt + feed_info.txt
+ shapes.txt + NOTICE.txt → crete.zip → gtfs-validator (0 ERROR)
```

**Modules :**
- `coastline.py` (NOUVEAU) : `load_polygon()` (lit `data/crete-coastline.geojson`), `on_land(lat, lng, tol_m=300)` (point-in-polygon ray-casting + buffer tolérance, pur).
- `osm_feed.py` (NOUVEAU) : lecture + transformation des données OSM en sous-flux. `load_osm(sb)` → `{lines_by_id, stops_by_id, line_stops_by_line}`. `matched_trip_stops(route, osm)` → séquence orientée `[{stop_id, name, lat, lng, offset_min}]` ou `None` si données incomplètes. `line_shape(line)` → points `[[lat,lng]…]`.
- `gtfs_writer.py` (MODIF) : `shapes.txt` reste de simples lignes CSV (write_csv générique suffit).
- `gtfs_feed_build.py` (MODIF) : `assemble_feed` gagne l'aiguillage ; lit `coastline` (fallback) et `osm` (matché). `build_gtfs_feed` charge en plus `load_osm(sb)`.
- `data/crete-coastline.geojson` (NOUVEAU) : contour Crète (Natural Earth ou OSM `admin_level` île, simplifié ; mainland + grandes îles desservies si besoin).

## 7. Décisions de design (tranchées avec Kami, 16/06)

1. **`route_id` unifié `PREF-NN`** : matchés → `bus_lines.code` (déjà PREF-NN, cohérent avec `/live`) ; non matchés → `assign_codes(existing = {codes OSM})` pour éviter toute collision.
2. **`stop_id` : deux espaces de noms** (OSM `bus_stops.slug` pour les matchés, `gtfs_stops.stop_id` pour les non matchés). Un même lieu desservi des deux côtés peut apparaître **deux fois** ; on **préfère la coord OSM** quand un arrêt KTEL est à < 300 m d'un arrêt OSM déjà émis (map vers l'`stop_id` OSM). Quasi-doublons résiduels tolérés (warning validateur, pas erreur), notés.
3. **Honnêteté `timepoint`** : départ terminus = 1 (heure KTEL publiée) ; intermédiaires = 0 (estimés, y compris les `cumulative_minutes` OSM qui sont calculés) ; arrivée terminus = 1 si `duration` KTEL réelle (on cale alors la dernière heure sur `départ + duration`), sinon 0. `NOTICE.txt` conservé.
4. **`shapes.txt`** : matchés depuis `bus_lines.geometry` ; non matchés depuis `net_osrm.build_geometry` (tracé routier OSRM, caché/throttlé) ; ligne droite en dernier recours (loggué `partial`).
5. **Garde-fou terre/mer** : appliqué aux candidats du chemin KTEL (low-confidence en priorité). Audit (log, pas de rejet auto) sur les coords `referentiel` high-confidence pour repérer une erreur du référentiel sans casser de la donnée sûre.
6. **Orientation des trips matchés** : déterminée par proximité spatiale de `from_place(r)` (coord `gtfs_stops`) aux deux terminus de la ligne OSM ; reverse de la séquence + miroir des `cumulative_minutes` si sens inverse.

## 8. Garde-fou terre/mer (détail)

`on_land(lat, lng, tol_m=300)` : ray-casting point-in-polygon contre le contour Crète. `tol_m` = buffer (un arrêt portuaire collé à l'eau, à < 300 m du trait de côte, compte comme à terre → pas de faux positif). Pur, déterministe, hors-ligne, testable.

Intégration (chemin KTEL) : un arrêt `gtfs_stops` géocodé low-confidence dont la coord échoue `on_land` → coord rejetée (`needs_review`, exclu de `stops.txt`). Un **terminus** en mer → trip droppé (logué `dropped_trips`). Cohérent avec le garde-fou existant (bbox + dérive 45 km).

**Source du contour :** Natural Earth (10m, polygone Crète) ou export OSM de l'île, **simplifié** (Douglas-Peucker, ~quelques centaines de points) et committé en `data/crete-coastline.geojson`. Le fichier est petit et statique.

## 9. Tests (TDD)

`cd scripts/scrapers/buses && py -m pytest -q`.

- `coastline` : point clairement à terre (Heraklion centre) → `True` ; point en pleine mer (large de la côte) → `False` ; point côtier dans la tolérance (port) → `True` ; polygone chargé une fois (cache).
- `osm_feed` : `matched_trip_stops` oriente correctement (sens direct vs reverse + miroir cumulative) ; renvoie `None` si `bus_line_stops` vide ou ligne sans geometry ; `line_shape` mappe `geometry` [lng,lat] → [lat,lng] attendu.
- `gtfs_feed_build` (aiguillage, fixtures synthétiques OSM+KTEL) : une route matchée produit des stop_times depuis les arrêts OSM + offsets `cumulative_minutes` + un `shape_id` ; une route non matchée passe par le fallback KTEL ; un arrêt KTEL en mer est exclu (coastline) ; intégrité référentielle (`stop_id ∈ stops`, `shape_id ∈ shapes`, `route_id ∈ routes`) ; déterminisme.
- `shapes.txt` : colonnes GTFS (`shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence`), séquence croissante.

**Sanity check** `check-gtfs-feed.mjs` (étendu) : tout `trips.shape_id ∈ shapes.txt` ; tout arrêt `stops.txt` on-land (bbox + cohérent) ; échos couverture (routes matchées vs fallback, trips droppés, arrêts en mer écartés).

## 10. Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Orientation matché inversée (sens) | proximité spatiale `from_place` ↔ terminus OSM + test dédié ; en cas d'ambiguïté, log + sens direct par défaut. |
| Quasi-doublons d'arrêts (OSM + KTEL pour un même lieu) | préférence OSM < 300 m ; résiduel = warning validateur, pas erreur ; documenté. |
| Contour Crète imparfait (île au trait de côte grossier) | tolérance 300 m + audit log ; un faux positif se corrige en ajustant le polygone (statique). |
| OSRM (shapes non matchés) lent/instable | fetch injecté + cache + fallback ligne droite ; build dégradé, jamais bloquant. |
| Couplage GTFS ↔ tables OSM (étape B/C les évitaient) | lecture seule, assumé : c'est la décision de fusion. Aucune écriture sur `/live`. |
| `cumulative_minutes` OSM = estimés (pas horaires KTEL réels) | marqués `timepoint=0` (intermédiaires) ; honnêteté préservée. |

## 11. Déploiement (owner Kami, accès VPS)

Python + données ⇒ **pas de Vercel**. Séquence : merge `feat/gtfs-fusion` → master (après l'étape C) ; rsync modules + `data/crete-coastline.geojson` → `/opt/cretepulse/buses/` ; run réel `build_gtfs_feed` (lit prod en lecture seule, OSM + KTEL) → `crete.zip` ; valider `gtfs-validator` 0 ERROR ; re-render la carte de preuve (avant/après) pour validation visuelle Kami ; étape D publication.

## 12. Séquence du plan GTFS (rappel)

A ✅ jours de service → B ✅ arrêts géolocalisés → C ✅ assemblage + validation (KTEL seul) → **fusion (ce spec) : qualité OSM là où matché + garde-fou terre/mer + shapes.txt** → D publication réelle. (Chantier ultérieur possible : améliorer le matching 49 %→90 %.)
