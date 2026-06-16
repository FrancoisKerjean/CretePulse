# GTFS Garde-fou terre/mer (Plan 1 de la fusion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer du flux GTFS tout arrêt tombé dans la mer, via un test point-in-polygon contre le contour de la Crète.

**Architecture:** Module pur `coastline.py` (charge un GeoJSON du contour Crète déjà récupéré, expose `on_land(lat, lng, tol_m)` en ray-casting + buffer hors-contour). On le branche dans l'assembleur GTFS de l'étape C (`assemble_feed`) en filtrant `stops_by_id` : un arrêt en mer disparaît, donc la logique existante le saute (intermédiaire) ou droppe le trip (terminus). Aucune écriture DB.

**Tech Stack:** Python 3 (pytest, json, math). Pas de dépendance géo (ray-casting maison).

**Spec :** `docs/superpowers/specs/2026-06-16-gtfs-osm-fusion-design.md` (ce plan = la partie « garde-fou terre/mer » ; le Plan 2 fera la fusion OSM).

**Contexte branche :** worktree `C:\Users\fkerj\cretepulse-gtfsC`, branche `feat/gtfs-feed` (porte l'assembleur étape C `gtfs_feed_build.py`). Le contour `scripts/scrapers/buses/data/crete-coastline.geojson` est **déjà présent** dans le worktree (récupéré le 16/06 depuis OSM relation 453129 via Nominatim : MultiPolygon, 2 anneaux, ~49k points ; vérifié Heraklion/Chania/AgNik = terre, points mer nord/sud = eau). Il sera commité par la Task 1.

**Environnement pytest :** `cd scripts/scrapers/buses && py -m pytest` (pytest 9.0.2 global, pas de .venv). Stager les fichiers explicitement (jamais `git add -A`). Commits avec `git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29`.

---

## Task 1: `coastline.py` - test terre/mer point-in-polygon

Module pur. `load_polygon()` lit le GeoJSON et renvoie les anneaux extérieurs. `on_land(lat, lng, tol_m=150)` : True si le point est dans un anneau ; sinon True s'il est à < `tol_m` du contour (buffer appliqué **hors-contour seulement**, via 8 points décalés en boussole - un arrêt côtier réel est déjà dedans, donc non concerné). Ray-casting maison, aucune dépendance géo.

**Files:**
- Commit (déjà présent) : `scripts/scrapers/buses/data/crete-coastline.geojson`
- Create: `scripts/scrapers/buses/coastline.py`
- Test: `scripts/scrapers/buses/test_coastline.py`

- [ ] **Step 1: Vérifier que le GeoJSON est présent et bien formé**

Run: `cd scripts/scrapers/buses && py -c "import json; g=json.load(open('data/crete-coastline.geojson',encoding='utf-8')); print(g['type'], g['geometry']['type'])"`
Expected: `Feature MultiPolygon`. (Si absent, le re-récupérer via Nominatim lookup `osm_ids=R453129&polygon_geojson=1`, champ `geojson`.)

- [ ] **Step 2: Écrire les tests qui échouent**

```python
# scripts/scrapers/buses/test_coastline.py
from coastline import load_polygon, on_land

def test_polygon_loads_rings():
    rings = load_polygon()
    assert isinstance(rings, list) and len(rings) >= 1
    assert all(len(r) >= 4 for r in rings)        # un anneau = >=4 sommets
    assert all(len(p) == 2 for p in rings[0][:5]) # (lng, lat)

def test_inland_cities_on_land():
    assert on_land(35.3387, 25.1442) is True   # Heraklion
    assert on_land(35.1909, 25.7136) is True   # Agios Nikolaos
    assert on_land(35.5138, 24.0180) is True   # Chania
    assert on_land(35.3644, 24.4821) is True   # Rethymno

def test_open_sea_not_on_land():
    assert on_land(35.62, 25.30) is False      # mer au nord d'Heraklion
    assert on_land(34.85, 25.10) is False      # mer au sud
    assert on_land(35.90, 25.50) is False      # large nord

def test_none_coords_not_on_land():
    assert on_land(None, 25.0) is False
    assert on_land(35.0, None) is False

def test_tolerance_buffer_rescues_near_shore_point():
    # un point en mer mais a < 150m d'un point terrestre connu doit etre rescapé
    # par le buffer ; un point a ~1km au large ne doit PAS l'etre.
    # On teste le mecanisme : buffer large rescue, buffer nul non.
    # Point legerement au sud de la cote d'Ierapetra (approx, en mer proche).
    lat, lng = 35.005, 25.742
    far = on_land(lat - 0.02, lng, tol_m=150)      # ~2.2km au large => False
    assert far is False
    # tolerance 0 vs tolerance large sur un point juste hors contour : la
    # tolerance ne peut que faire passer de False a True, jamais l'inverse.
    p = (35.005, 25.742)
    assert on_land(*p, tol_m=0) in (True, False)
    if on_land(*p, tol_m=0) is False:
        # si hors contour a tol 0, un gros buffer (2km) doit le rattraper s'il est cotier
        assert on_land(*p, tol_m=2000) is True
```

- [ ] **Step 3: Lancer pour vérifier l'échec**

Run: `py -m pytest test_coastline.py -v`
Expected: FAIL (`ModuleNotFoundError: No module named 'coastline'`).

- [ ] **Step 4: Écrire l'implémentation**

```python
# scripts/scrapers/buses/coastline.py
"""Test terre/mer : point-in-polygon (ray-casting) contre le contour de la Crète.
Le contour vient d'OSM (relation 453129) via data/crete-coastline.geojson.
Buffer de tolérance appliqué HORS-contour seulement (un arrêt côtier réel est
déjà dans le polygone). Aucune dépendance géo. Aucun I/O hormis le chargement
du GeoJSON (caché)."""
import json
import math
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_GEOJSON = os.path.join(_HERE, "data", "crete-coastline.geojson")
_rings_cache = None


def load_polygon(path=_GEOJSON):
    """Anneaux extérieurs du contour : liste de [(lng, lat), ...]. Caché."""
    global _rings_cache
    if _rings_cache is not None:
        return _rings_cache
    with open(path, encoding="utf-8") as f:
        gj = json.load(f)
    geom = gj.get("geometry", gj)
    rings = []
    if geom["type"] == "Polygon":
        rings.append([(c[0], c[1]) for c in geom["coordinates"][0]])
    elif geom["type"] == "MultiPolygon":
        for poly in geom["coordinates"]:
            rings.append([(c[0], c[1]) for c in poly[0]])
    _rings_cache = rings
    return rings


def _point_in_ring(lng, lat, ring):
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _inside_any(lng, lat, rings):
    return any(_point_in_ring(lng, lat, r) for r in rings)


def on_land(lat, lng, tol_m=150, rings=None):
    """True si (lat,lng) est sur terre (dans un anneau), ou à < tol_m du contour.
    Le buffer ne peut que faire passer un point hors-contour à True."""
    if lat is None or lng is None:
        return False
    rings = rings if rings is not None else load_polygon()
    if _inside_any(lng, lat, rings):
        return True
    if tol_m <= 0:
        return False
    # buffer : 8 points décalés de tol_m en boussole ; si l'un tombe dans la terre,
    # le point est à < tol_m du contour.
    dlat = tol_m / 111320.0
    dlng = tol_m / (111320.0 * max(0.1, math.cos(math.radians(lat))))
    for dla in (-dlat, 0.0, dlat):
        for dln in (-dlng, 0.0, dlng):
            if dla == 0.0 and dln == 0.0:
                continue
            if _inside_any(lng + dln, lat + dla, rings):
                return True
    return False
```

- [ ] **Step 5: Lancer pour vérifier que ça passe**

Run: `py -m pytest test_coastline.py -v`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit (inclut le GeoJSON)**

```bash
git add scripts/scrapers/buses/coastline.py scripts/scrapers/buses/test_coastline.py scripts/scrapers/buses/data/crete-coastline.geojson
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): coastline.py - test terre/mer point-in-polygon (contour Crète OSM)"
```

---

## Task 2: Brancher le garde-fou dans l'assembleur GTFS

On ajoute un paramètre `on_land` à `assemble_feed`. S'il est fourni, on **filtre `stops_by_id`** en tête : tout arrêt dont la coord n'est pas sur terre est retiré. La logique existante fait le reste (un intermédiaire absent est sauté ; un terminus absent droppe le trip). `build_gtfs_feed` câble le vrai `coastline.on_land` par défaut. Rétrocompatible : `on_land=None` = aucun filtre (les tests étape C restent verts).

**Files:**
- Modify: `scripts/scrapers/buses/gtfs_feed_build.py`
- Test: `scripts/scrapers/buses/test_gtfs_feed_build.py` (ajout)

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `test_gtfs_feed_build.py` :

```python
def test_stop_in_water_is_excluded_from_feed():
    # 'hersonissos' simulé EN MER via un on_land factice ; il doit disparaître
    # de stops.txt et être sauté dans la séquence (intermédiaire).
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Hersonissos"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    fake_on_land = lambda lat, lng: not (abs(lat - 35.31) < 1e-6 and abs(lng - 25.39) < 1e-6)
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None, on_land=fake_on_land)
    st = _tbl(feed, "stop_times")
    stop_ids = {r[0] for r in feed["stops"][1]}
    assert "hersonissos" not in stop_ids                      # exclu de stops.txt
    assert [r["stop_id"] for r in st] == ["heraklion", "agios-nikolaos"]  # sauté

def test_terminus_in_water_drops_trip():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    # Agios Nikolaos (terminus) simulé en mer => trip droppé
    fake_on_land = lambda lat, lng: not (abs(lat - 35.19) < 1e-6 and abs(lng - 25.71) < 1e-6)
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None, on_land=fake_on_land)
    assert _tbl(feed, "trips") == []
    assert len(feed["stats"]["dropped_trips"]) == 1

def test_on_land_none_keeps_all_stops():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Hersonissos"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)  # pas de filtre
    assert len(feed["stop_times"][1]) == 3                    # rien retiré
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `py -m pytest test_gtfs_feed_build.py -k "in_water or none_keeps" -v`
Expected: FAIL (`assemble_feed() got an unexpected keyword argument 'on_land'`).

- [ ] **Step 3: Implémenter le filtre dans `assemble_feed`**

Dans `gtfs_feed_build.py`, modifier la signature de `assemble_feed` et ajouter le filtre en tête. Remplacer la ligne de définition :

```python
def assemble_feed(routes, stops_by_id, window, feed_version, osrm=None, seasons=None):
```
par :
```python
def assemble_feed(routes, stops_by_id, window, feed_version, osrm=None, seasons=None, on_land=None):
```

Puis, juste après la docstring de `assemble_feed` (avant `start_date, end_date = window`), insérer :

```python
    if on_land is not None:
        stops_by_id = {sid: s for sid, s in stops_by_id.items()
                       if on_land(s["stop_lat"], s["stop_lon"])}
```

- [ ] **Step 4: Câbler `coastline.on_land` dans `build_gtfs_feed`**

Ajouter l'import en tête de `gtfs_feed_build.py` (avec les autres imports de modules) :
```python
import coastline
```

Modifier la signature de `build_gtfs_feed` :
```python
def build_gtfs_feed(sb, window, feed_version, osrm=None, seasons=None, out_dir=OUT_DIR):
```
par :
```python
def build_gtfs_feed(sb, window, feed_version, osrm=None, seasons=None, out_dir=OUT_DIR, on_land=coastline.on_land):
```

Et dans le corps de `build_gtfs_feed`, passer `on_land` à `assemble_feed`. Remplacer :
```python
    feed = assemble_feed(routes, stops_by_id, window, feed_version, osrm=osrm, seasons=seasons)
```
par :
```python
    feed = assemble_feed(routes, stops_by_id, window, feed_version, osrm=osrm, seasons=seasons, on_land=on_land)
```

- [ ] **Step 5: Lancer toute la suite du module + la suite complète**

Run: `py -m pytest test_gtfs_feed_build.py -v`
Expected: PASS (tous, dont les 3 nouveaux).

Run: `py -m pytest -q`
Expected: PASS (aucune régression sur la suite du dossier buses).

- [ ] **Step 6: Commit**

```bash
git add scripts/scrapers/buses/gtfs_feed_build.py scripts/scrapers/buses/test_gtfs_feed_build.py
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): garde-fou terre/mer dans assemble_feed (filtre stops on_land)"
```

---

## Task 3: Mesure réelle + carte avant/après (vérification, owner Claude)

Tâche de vérification visuelle, pas de code de prod. On produit le flux réel AVANT (sans filtre) et APRÈS (avec filtre), on compte les arrêts retirés, et on re-rend la carte pour montrer à Kami que les points sortent de l'eau. Lecture seule sur la prod (anon PostgREST), sortie dans `out/` (gitignoré).

**Files:**
- Use (déjà présent, throwaway non commité) : `scripts/scrapers/buses/_render_proof.py`

- [ ] **Step 1: Re-render APRÈS (avec garde-fou) et compter**

Le runner `_render_proof.py` appelle `assemble_feed(..., osrm=None, seasons=None)` sans `on_land`. En créer une variante de mesure (inline, non commitée) qui appelle deux fois - sans puis avec `coastline.on_land` - et compare `stats['stops_referenced']` + le nombre d'arrêts géocodés retenus. Commande :

```
cd C:/Users/fkerj/cretepulse-gtfsC/scripts/scrapers/buses && py -c "
import gtfs_feed_build as m, coastline, json, os, requests
ENV=os.path.expanduser('~/cretepulse-build/.env.local')
def env():
    u=k=None
    for l in open(ENV,encoding='utf-8'):
        l=l.strip()
        if l.startswith('NEXT_PUBLIC_SUPABASE_URL='): u=l.split('=',1)[1].strip().strip('\"')
        elif l.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='): k=l.split('=',1)[1].strip().strip('\"')
    return u,k
u,k=env(); H={'apikey':k,'Authorization':'Bearer '+k}
def fetch(t,s): return requests.get(u+'/rest/v1/'+t,params={'select':s},headers=H,timeout=60).json()
routes=fetch('bus_routes','id,operator_id,from_place,to_place,via_stops,departures_by_day,departures,duration,season')
stops=fetch('gtfs_stops','stop_id,stop_name,stop_lat,stop_lon')
sbi={s['stop_id']:s for s in stops if s['stop_lat'] is not None}
W=('20260601','20260930')
a=m.assemble_feed(routes,sbi,W,'before',osrm=None,seasons=None)
b=m.assemble_feed(routes,sbi,W,'after',osrm=None,seasons=None,on_land=coastline.on_land)
inwater=[sid for sid,s in sbi.items() if not coastline.on_land(s['stop_lat'],s['stop_lon'])]
print('arrets geocodes:',len(sbi))
print('arrets EN MER (retires):',len(inwater),inwater[:20])
print('stops_referenced avant/apres:',a['stats']['stops_referenced'],b['stats']['stops_referenced'])
print('trips avant/apres:',a['stats']['trips'],b['stats']['trips'])
"
```
Expected: une liste d'arrêts en mer (>0), et `stops_referenced` qui baisse du nombre d'arrêts en mer effectivement référencés. Noter les noms (utile pour la curation manuelle ultérieure).

- [ ] **Step 2: Re-render la carte APRÈS**

Adapter `_render_proof.py` (inline, non commité) pour passer `on_land=coastline.on_land` à `assemble_feed`, régénérer `out/proof/map.html`, et screenshoter (Playwright depuis `~/crete-direct-instagram`, cf méthode du 16/06). Comparer visuellement à la carte précédente : les points en mer doivent avoir disparu.

- [ ] **Step 3: Montrer à Kami + nettoyer**

Présenter le screenshot avant/après + le compte d'arrêts retirés. Nettoyer les éventuels scripts de mesure inline et `out/` (gitignoré, non commité). Aucune nouvelle entrée git.

---

## Self-review checklist (déjà passée à la rédaction)

- **Couverture spec (partie garde-fou)** : détection point-in-polygon (§7.5, §8) → Task 1 ; intégration filtre stops + drop terminus (§4.1, §4.3) → Task 2 ; tolérance 150m hors-contour (§8) → Task 1 `on_land` ; calibrage données réelles (§8) → Task 3. La fusion OSM (matched path, shapes.txt) est **hors de ce plan** (Plan 2).
- **Pas de placeholder** : tout le code est fourni.
- **Cohérence des signatures** : `on_land(lat, lng, tol_m=150, rings=None)` ; `assemble_feed(..., on_land=None)` ; `build_gtfs_feed(..., on_land=coastline.on_land)`. Cohérent entre tasks.
- **Périmètre** : focalisé (garde-fou seul), produit un flux sans arrêt en mer, testable et vérifiable indépendamment.
