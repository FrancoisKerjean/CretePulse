# GTFS Tracés routiers OSM / shapes.txt (Plan 2 de la fusion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les lignes du flux GTFS suivent les vraies routes (au lieu de lignes droites) en réutilisant les tracés OSM `bus_lines.geometry` pour les 189 routes KTEL matchées, via `shapes.txt`.

**Architecture:** Nouveau module pur `osm_feed.py` (charge `bus_lines` et projette une géométrie en points GTFS). On ajoute un paramètre `osm` à `assemble_feed` : une route dont la `line_id` a une géométrie OSM reçoit un `shape_id` (et la géométrie va dans `shapes.txt`) ; les autres routes restent sans tracé (ligne droite, inchangé). Rétrocompatible : `osm=None` = comportement actuel. Aucune écriture DB.

**Tech Stack:** Python 3 (pytest), Node (sanity check). Réutilise `gtfs_writer.write_csv`.

**Spec :** `docs/superpowers/specs/2026-06-16-gtfs-osm-fusion-design.md`.

**Décision de périmètre v1 (transparence vs spec) :** le spec décrit la fusion complète (arrêts OSM + timing OSM + tracés OSM). Ce Plan 2 ne fait QUE les **tracés** (`shapes.txt`) - le plus gros gain visuel - en gardant les arrêts/timing KTEL (déjà sur terre via Plan 1 garde-fou). Le basculement arrêts/timing sur OSM (séquences `bus_line_stops` + `cumulative_minutes`) est un raffinement reporté (Plan 3, moins urgent post-Plan 1). HORS périmètre aussi : tracés OSRM pour les 198 routes non matchées (restent droites) ; amélioration du matching 49 %→90 %.

**Contexte branche :** worktree `C:\Users\fkerj\cretepulse-gtfsC`, branche `feat/gtfs-feed` (porte `assemble_feed`, le garde-fou coastline, `gtfs_writer`). Environnement : `cd scripts/scrapers/buses && py -m pytest` (pytest 9.0.2, pas de .venv). Stager explicitement. Commits avec `git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29`.

**Données vérifiées (16/06, prod) :** `bus_lines` (158, colonnes `id,code,color,geometry,...`) ; `geometry` = `[[lng,lat],...]` (tracé routier réel) ; **94 lignes OSM** référencées par les 189 routes KTEL avec `line_id` non-null ; toutes ont une géométrie.

---

## Task 1: `osm_feed.py` - chargement lignes OSM + projection géométrie

Module pur. `load_osm(sb)` lit `bus_lines` et retourne `{line_id: line}` (seulement les lignes avec géométrie). `line_shape(line)` convertit `geometry` (`[[lng,lat],...]`) en `[(lat, lng), ...]` (ordre GTFS). `shape_id_for(line_id)` produit un id stable.

**Files:**
- Create: `scripts/scrapers/buses/osm_feed.py`
- Test: `scripts/scrapers/buses/test_osm_feed.py`

- [ ] **Step 1: Écrire les tests qui échouent**

```python
# scripts/scrapers/buses/test_osm_feed.py
from osm_feed import line_shape, shape_id_for

def test_line_shape_swaps_lng_lat():
    line = {"geometry": [[25.14, 35.34], [25.39, 35.31]]}   # [lng, lat]
    assert line_shape(line) == [(35.34, 25.14), (35.31, 25.39)]

def test_line_shape_empty_when_no_geometry():
    assert line_shape({"geometry": None}) == []
    assert line_shape({}) == []

def test_shape_id_for_stable():
    assert shape_id_for(42) == "shp-42"
    assert shape_id_for(42) == shape_id_for(42)
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `py -m pytest test_osm_feed.py -v`
Expected: FAIL (`ModuleNotFoundError: No module named 'osm_feed'`).

- [ ] **Step 3: Écrire l'implémentation**

```python
# scripts/scrapers/buses/osm_feed.py
"""Sous-flux OSM pour la fusion GTFS : charge les lignes OSM (bus_lines) et
projette leur géométrie routière en points GTFS pour shapes.txt. Lecture seule.
Pur hormis load_osm (lecture DB)."""


def load_osm(sb):
    """{line_id: line} pour les lignes OSM ayant une géométrie. Lecture seule."""
    rows = sb.table("bus_lines").select("id,code,color,geometry").execute().data
    return {r["id"]: r for r in rows if r.get("geometry") and len(r["geometry"]) >= 2}


def line_shape(line):
    """geometry [[lng, lat], ...] -> [(lat, lng), ...] (ordre GTFS). [] si vide."""
    geom = line.get("geometry") or []
    return [(c[1], c[0]) for c in geom]


def shape_id_for(line_id):
    """Identifiant de shape stable depuis l'id de ligne OSM."""
    return f"shp-{line_id}"
```

- [ ] **Step 4: Lancer pour vérifier que ça passe**

Run: `py -m pytest test_osm_feed.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/osm_feed.py scripts/scrapers/buses/test_osm_feed.py
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): osm_feed.py - chargement lignes OSM + projection géométrie shapes"
```

---

## Task 2: `shape_id` sur les trips + table `shapes` dans `assemble_feed`

On ajoute un paramètre `osm` à `assemble_feed`. Si fourni, une route dont la `line_id` est dans `osm` reçoit un `shape_id` sur ses trips, et la géométrie de la ligne est enregistrée dans la table `shapes`. Les routes non matchées ont un `shape_id` vide (pas de tracé). `trips.txt` gagne une colonne `shape_id`. Le feed gagne une clé `shapes` = `(header, rows)`. Rétrocompatible (`osm=None` => tous les `shape_id` vides, `shapes` vide).

**Files:**
- Modify: `scripts/scrapers/buses/gtfs_feed_build.py`
- Test: `scripts/scrapers/buses/test_gtfs_feed_build.py` (ajout)

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `test_gtfs_feed_build.py` :

```python
import osm_feed as _osm_mod

def test_matched_route_gets_shape_id_and_shape():
    routes = [{
        "id": 1, "line_id": 7, "operator_id": "herlas", "from_place": "Heraklion",
        "to_place": "Agios Nikolaos", "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    osm = {7: {"id": 7, "code": "HER-01", "color": "#0B5E78",
               "geometry": [[25.14, 35.34], [25.39, 35.31], [25.71, 35.19]]}}
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None, osm=osm)
    trips = _tbl(feed, "trips")
    assert trips[0]["shape_id"] == "shp-7"
    shp = _tbl(feed, "shapes")
    assert {r["shape_id"] for r in shp} == {"shp-7"}
    # géométrie projetée (lat,lon) dans l'ordre, séquence croissante
    pts = [(float(r["shape_pt_lat"]), float(r["shape_pt_lon"]), int(r["shape_pt_sequence"])) for r in shp]
    assert pts[0] == (35.34, 25.14, 0)
    assert pts[-1] == (35.19, 25.71, 2)

def test_unmatched_route_has_empty_shape_id():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion",
        "to_place": "Agios Nikolaos", "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None, osm={})
    trips = _tbl(feed, "trips")
    assert trips[0]["shape_id"] == ""
    assert feed["shapes"][1] == []        # aucune shape

def test_osm_none_no_shapes_backcompat():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion",
        "to_place": "Agios Nikolaos", "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    assert "shapes" in feed and feed["shapes"][1] == []
    trips = _tbl(feed, "trips")
    assert trips[0]["shape_id"] == ""
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `py -m pytest test_gtfs_feed_build.py -k "shape or backcompat" -v`
Expected: FAIL (`unexpected keyword argument 'osm'` ou `KeyError: 'shapes'`).

- [ ] **Step 3: Implémenter dans `gtfs_feed_build.py`**

Ajouter l'import en tête (avec les autres imports de modules) :
```python
import osm_feed
```

Modifier la signature de `assemble_feed` :
`def assemble_feed(routes, stops_by_id, window, feed_version, osrm=None, seasons=None, on_land=None):`
→
`def assemble_feed(routes, stops_by_id, window, feed_version, osrm=None, seasons=None, on_land=None, osm=None):`

Dans la boucle `for r in curated:`, APRÈS la ligne `route_id = codes[key]` (où le `route_id` du trip est connu) et AVANT la boucle des départs `for days_label, t0 in _route_departures(r):`, déterminer le `shape_id` de la route et enregistrer la shape. Insérer :
```python
        shape_id = ""
        if osm:
            lid = r.get("line_id")
            if lid is not None and lid in osm:
                shape_id = osm_feed.shape_id_for(lid)
                if shape_id not in shapes_pts:
                    shapes_pts[shape_id] = osm_feed.line_shape(osm[lid])
```

Initialiser `shapes_pts = {}` près des autres accumulateurs (à côté de `trips_rows, st_rows = [], []`). Ajouter `shapes_pts = {}` sur cette zone d'init.

Modifier la création de la ligne de trip pour inclure `shape_id`. Remplacer :
```python
            trips_rows.append([route_id, service_id, trip_id, headsign, direction_id])
```
par :
```python
            trips_rows.append([route_id, service_id, trip_id, headsign, direction_id, shape_id])
```

Modifier l'en-tête de `trips_tbl` pour ajouter `shape_id`. Remplacer :
```python
    trips_tbl = (["route_id", "service_id", "trip_id", "trip_headsign", "direction_id"], trips_rows)
```
par :
```python
    trips_tbl = (["route_id", "service_id", "trip_id", "trip_headsign", "direction_id", "shape_id"], trips_rows)
```

Construire la table `shapes` (après la construction de `stops_tbl`, avant le `stats`). Insérer :
```python
    shapes_rows = []
    for shape_id in sorted(shapes_pts):
        for seq, (lat, lng) in enumerate(shapes_pts[shape_id]):
            shapes_rows.append([shape_id, f"{lat:.6f}", f"{lng:.6f}", seq])
    shapes_tbl = (["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"], shapes_rows)
```

Ajouter `shapes` au dict retourné. Remplacer la ligne `return {...}` finale :
```python
    return {"agency": agency, "routes": routes_tbl, "trips": trips_tbl, "stop_times": st_tbl,
            "calendar": cal_tbl, "feed_info": feed_tbl, "stops": stops_tbl, "stats": stats}
```
par :
```python
    return {"agency": agency, "routes": routes_tbl, "trips": trips_tbl, "stop_times": st_tbl,
            "calendar": cal_tbl, "feed_info": feed_tbl, "stops": stops_tbl, "shapes": shapes_tbl,
            "stats": stats}
```

- [ ] **Step 4: Lancer pour vérifier que ça passe**

Run: `py -m pytest test_gtfs_feed_build.py -v`
Expected: PASS (tous, dont les 3 nouveaux). Les anciens tests (osm absent) voient `shape_id=""` et `shapes` vide - vérifier qu'aucun n'asserte la longueur de la ligne de trip de façon incompatible ; si un ancien test comparait une ligne de trip entière, l'ajuster pour inclure `""`.

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_feed_build.py scripts/scrapers/buses/test_gtfs_feed_build.py
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): shape_id sur trips + table shapes (tracés OSM des routes matchées)"
```

---

## Task 3: Écrire `shapes.txt` + le wiring DB (`build_gtfs_feed`)

`write_feed` doit écrire `shapes.txt` ; `GTFS_FILES` doit l'inclure (packaging + sanity). `build_gtfs_feed` charge les lignes OSM et les passe à `assemble_feed`, et `load_routes` doit sélectionner `line_id`.

**Files:**
- Modify: `scripts/scrapers/buses/gtfs_feed_build.py`
- Test: `scripts/scrapers/buses/test_gtfs_feed_build.py` (ajout)

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à la fin de `test_gtfs_feed_build.py` :

```python
def test_write_feed_writes_shapes_txt(tmp_path):
    routes = [{
        "id": 1, "line_id": 7, "operator_id": "herlas", "from_place": "Heraklion",
        "to_place": "Agios Nikolaos", "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    osm = {7: {"id": 7, "code": "HER-01", "color": "#0B5E78",
               "geometry": [[25.14, 35.34], [25.71, 35.19]]}}
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None, osm=osm)
    write_feed(feed, str(tmp_path))
    assert (tmp_path / "shapes.txt").exists()
    assert "shapes.txt" in GTFS_FILES
    content = (tmp_path / "shapes.txt").read_text(encoding="utf-8")
    assert content.startswith("shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\n")
    assert "shp-7," in content
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `py -m pytest test_gtfs_feed_build.py -k "shapes_txt" -v`
Expected: FAIL (`shapes.txt` absent / pas dans `GTFS_FILES`).

- [ ] **Step 3: Implémenter**

Dans `gtfs_feed_build.py`, ajouter `"shapes.txt"` au tuple `GTFS_FILES` et au dict `_TABLE_FILE`. Remplacer :
```python
GTFS_FILES = ("agency.txt", "routes.txt", "trips.txt", "stop_times.txt",
              "calendar.txt", "feed_info.txt", "stops.txt", "NOTICE.txt")
_TABLE_FILE = {"agency": "agency.txt", "routes": "routes.txt", "trips": "trips.txt",
               "stop_times": "stop_times.txt", "calendar": "calendar.txt",
               "feed_info": "feed_info.txt", "stops": "stops.txt"}
```
par :
```python
GTFS_FILES = ("agency.txt", "routes.txt", "trips.txt", "stop_times.txt",
              "calendar.txt", "feed_info.txt", "stops.txt", "shapes.txt", "NOTICE.txt")
_TABLE_FILE = {"agency": "agency.txt", "routes": "routes.txt", "trips": "trips.txt",
               "stop_times": "stop_times.txt", "calendar": "calendar.txt",
               "feed_info": "feed_info.txt", "stops": "stops.txt", "shapes": "shapes.txt"}
```
(`write_feed` itère `_TABLE_FILE`, donc `shapes.txt` sera écrit automatiquement. `package_zip` itère `GTFS_FILES`, donc il sera empaqueté.)

Dans `load_routes`, ajouter `line_id` au select. Remplacer :
```python
    return sb.table("bus_routes").select(
        "id,operator_id,from_place,to_place,via_stops,"
        "departures_by_day,departures,duration,season").execute().data
```
par :
```python
    return sb.table("bus_routes").select(
        "id,line_id,operator_id,from_place,to_place,via_stops,"
        "departures_by_day,departures,duration,season").execute().data
```

Dans `build_gtfs_feed`, charger l'OSM et le passer. Modifier la signature :
`def build_gtfs_feed(sb, window, feed_version, osrm=None, seasons=None, out_dir=OUT_DIR, on_land=coastline.on_land):`
→
`def build_gtfs_feed(sb, window, feed_version, osrm=None, seasons=None, out_dir=OUT_DIR, on_land=coastline.on_land, osm=None):`
Et dans le corps, AVANT l'appel à `assemble_feed`, ajouter :
```python
    if osm is None:
        osm = osm_feed.load_osm(sb)
```
puis remplacer l'appel :
```python
    feed = assemble_feed(routes, stops_by_id, window, feed_version, osrm=osrm, seasons=seasons, on_land=on_land)
```
par :
```python
    feed = assemble_feed(routes, stops_by_id, window, feed_version, osrm=osrm, seasons=seasons, on_land=on_land, osm=osm)
```

- [ ] **Step 4: Lancer la suite du module + suite complète**

Run: `py -m pytest test_gtfs_feed_build.py -v`
Expected: PASS.
Run: `py -m pytest -q`
Expected: PASS (aucune régression).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_feed_build.py scripts/scrapers/buses/test_gtfs_feed_build.py
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): écrit shapes.txt + charge bus_lines OSM dans build_gtfs_feed"
```

---

## Task 4: Sanity check étendu (`shape_id` référencé)

`check-gtfs-feed.mjs` doit vérifier que tout `trips.shape_id` non vide existe dans `shapes.txt`, et afficher le nombre de shapes.

**Files:**
- Modify: `scripts/check-gtfs-feed.mjs`

- [ ] **Step 1: Étendre le sanity check**

Dans `scripts/check-gtfs-feed.mjs`, ajouter la lecture de `shapes.txt` et la vérification référentielle. Après la ligne qui parse `stopTimes` (`const stopTimes = parseCsv("stop_times.txt");`), ajouter :
```js
let shapes = [];
try { shapes = parseCsv("shapes.txt"); } catch { shapes = []; }
const shapeIds = new Set(shapes.map((s) => s.shape_id));
```
Après la boucle d'intégrité référentielle des trips (la boucle `for (const t of trips) { ... }`), ajouter à l'intérieur ou juste après une vérification du `shape_id` :
```js
for (const t of trips) {
  if (t.shape_id && t.shape_id.length > 0 && !shapeIds.has(t.shape_id))
    errors.push(`trip ${t.trip_id}: shape_id inconnu ${t.shape_id}`);
}
```
Modifier la ligne de stats finale pour inclure les shapes. Remplacer :
```js
console.log(`stops=${stops.length} routes=${routes.length} trips=${trips.length} ` +
            `services=${calendar.length} stop_times=${stopTimes.length}`);
```
par :
```js
console.log(`stops=${stops.length} routes=${routes.length} trips=${trips.length} ` +
            `services=${calendar.length} stop_times=${stopTimes.length} shapes=${shapeIds.size}`);
```

- [ ] **Step 2: Smoke-test contre un mini-flux avec shape**

Run :
```
cd C:/Users/fkerj/cretepulse-gtfsC/scripts/scrapers/buses && py -c "import gtfs_feed_build as m; STOPS={'heraklion':{'stop_id':'heraklion','stop_name':'Heraklion','stop_lat':35.34,'stop_lon':25.14},'agios-nikolaos':{'stop_id':'agios-nikolaos','stop_name':'Agios Nikolaos','stop_lat':35.19,'stop_lon':25.71}}; routes=[{'id':1,'line_id':7,'operator_id':'herlas','from_place':'Heraklion','to_place':'Agios Nikolaos','via_stops':[],'duration':'1h','departures_by_day':[{'days':'Mon-Fri','times':['08:00']}],'season':None}]; osm={7:{'id':7,'code':'HER-01','color':'#0B5E78','geometry':[[25.14,35.34],[25.71,35.19]]}}; feed=m.assemble_feed(routes,STOPS,('20260601','20260831'),'20260616',osrm=None,osm=osm); m.write_feed(feed,'out/gtfs-shapetest'); print('ok')"
```
Puis : `cd C:/Users/fkerj/cretepulse-gtfsC && node scripts/check-gtfs-feed.mjs scripts/scrapers/buses/out/gtfs-shapetest`
Expected: ligne de stats avec `shapes=1` puis `OK: ...`, exit 0. Nettoyer : `rm -rf C:/Users/fkerj/cretepulse-gtfsC/scripts/scrapers/buses/out/gtfs-shapetest` (ne pas commiter `out/`).

- [ ] **Step 3: Commit**

```bash
git add scripts/check-gtfs-feed.mjs
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): sanity check vérifie les shape_id + compte les shapes"
```

---

## Task 5: Run réel + carte (vérification, owner Claude)

Vérification visuelle : produire le flux réel avec shapes, confirmer que les lignes matchées suivent les routes, re-render et montrer à Kami. Lecture seule sur la prod, sortie dans `out/` (gitignoré).

**Files:**
- Use (throwaway non commité) : `scripts/scrapers/buses/_render_proof.py`

- [ ] **Step 1: Produire le flux réel avec shapes + mesurer**

Adapter `_render_proof.py` (inline, non commité) : charger aussi les lignes OSM (`osm_feed.load_osm` via le client PostgREST, ou un fetch `bus_lines` direct), passer `osm=...` à `assemble_feed`, et tracer le `shapes` (un polyline par `shape_id` depuis `feed['shapes']`) au lieu des séquences droites pour les routes matchées. Mesurer : nb de shapes émises, nb de trips avec `shape_id`.

- [ ] **Step 2: Re-render + screenshot**

Régénérer `out/proof/map.html` avec les tracés (shapes pour matchées, droites pour le reste), screenshoter (Playwright depuis `~/crete-direct-instagram`, cf méthode établie). Attendu visuel : les 94 lignes matchées suivent les routes (comme l'aperçu `osm-preview.html`), les non matchées restent droites.

- [ ] **Step 3: Montrer à Kami + nettoyer**

Présenter le screenshot (avant lignes droites / après tracés routiers). Nettoyer les scripts inline et `out/`. Aucune nouvelle entrée git.

---

## Self-review checklist (passée à la rédaction)

- **Couverture spec (partie tracés)** : `shapes.txt` depuis `bus_lines.geometry` pour matchées (§4.2, §4.4, §7.4) → Tasks 1-3 ; `shape_id` sur trips → Task 2 ; sanity `shape_id` (§9) → Task 4 ; honnêteté/timepoint inchangés (pas touchés). Arrêts OSM + timing OSM + tracés OSRM des non matchées = explicitement reportés (cf périmètre v1).
- **Pas de placeholder** : tout le code est fourni.
- **Cohérence signatures** : `load_osm(sb)`, `line_shape(line)`, `shape_id_for(line_id)` (Task 1) ; `assemble_feed(..., osm=None)` ajoute `shape_id` aux trips + clé `shapes` (Task 2) ; `GTFS_FILES`/`_TABLE_FILE` incluent `shapes.txt`, `load_routes` sélectionne `line_id`, `build_gtfs_feed(..., osm=None)` (Task 3) ; sanity lit `shapes.txt` (Task 4). Cohérent.
- **Rétrocompat** : `osm=None`/`osm={}` → `shape_id=""`, `shapes` vide ; les tests existants restent verts (ajuster un éventuel test comparant une ligne de trip entière pour inclure le `""` final - noté en Task 2 Step 4).
- **Périmètre** : focalisé (tracés), livre le gain visuel (lignes suivent les routes), testable et vérifiable.
