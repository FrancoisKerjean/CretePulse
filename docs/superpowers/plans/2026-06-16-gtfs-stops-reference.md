# Référentiel d'arrêts GTFS (étape B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire `gtfs_stops`, le référentiel canonique des arrêts de bus de Crète (slug → nom + coords + métadonnées) dérivé de `bus_routes`, et son export `stops.txt`, fondation du futur flux GTFS ouvert.

**Architecture:** Pipeline Python pur (fonctions sans I/O ; Nominatim et le client Supabase injectés) branché en post-scrape dans `buses.py`. Cascade de géocodage `PLACE_COORDS → cb_places → Nominatim` sous garde-fou de cohérence (bbox Crète + dérive < 45 km vs un arrêt sûr de la même route). Curation GTFS « garder > jeter » (on ne droppe que des artefacts structurels). Sortie : table `gtfs_stops` (delete+insert, garde-fou MIN_STOPS) + `out/gtfs/stops.txt` + `out/gtfs/build-stats.json`.

**Tech Stack:** Python 3 (stdlib + `supabase`, `requests`, `unidecode` optionnel), Postgres/PostgREST (VPS), pytest, Node (sanity check). Spec : `docs/superpowers/specs/2026-06-16-gtfs-stops-reference-design.md`.

**Convention de commit :** stage explicite (jamais `git add -A`), author `kerjeanfrancois29` (déjà configuré), messages conventionnels. Terminer chaque message par le trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**Worktree :** déjà créé — `C:\Users\fkerj\cretepulse-gtfs` sur branche `feat/gtfs-stops` (base `origin/master`). Toutes les commandes ci-dessous s'exécutent depuis ce dossier.

**Environnement de test :** les tests sont des modules purs lancés depuis `scripts/scrapers/buses/`. Le worktree n'a pas de venv → Task 1 en crée un.

---

### Task 1: Scaffold — venv, migration SQL, modules purs portés

**Files:**
- Create: `supabase/migrations/20260616160000_gtfs_stops.sql`
- Create (copie depuis `feat/bus-network`): `scripts/scrapers/buses/net_geocode.py`, `scripts/scrapers/buses/test_net_geocode.py`, `src/data/bus-places.json`

- [ ] **Step 1: Créer le venv de test + outils**

Run (git-bash) :
```bash
cd scripts/scrapers/buses && python -m venv .venv && .venv/Scripts/python -m pip install -q pytest requests unidecode supabase && cd ../../..
```
Expected: installation sans erreur. (Sous PowerShell : `.venv\Scripts\python.exe`.)

- [ ] **Step 2: Copier les modules purs réutilisés de `feat/bus-network`**

Run :
```bash
git show feat/bus-network:scripts/scrapers/buses/net_geocode.py > scripts/scrapers/buses/net_geocode.py
git show feat/bus-network:scripts/scrapers/buses/test_net_geocode.py > scripts/scrapers/buses/test_net_geocode.py
git show feat/bus-network:src/data/bus-places.json > src/data/bus-places.json
```
Expected: 3 fichiers créés. (`net_geocode` est pur et déjà testé ; on le réutilise tel quel hormis un garde unidecode au Step 3.)

- [ ] **Step 3: Ajouter un garde unidecode (translittération grecque) à `stop_slug`**

Dans `scripts/scrapers/buses/net_geocode.py`, remplacer l'en-tête + `stop_slug` :

Remplacer :
```python
from prices import _norm


def stop_slug(name):
    return _norm(name).replace("&", "and").replace("  ", " ").strip().replace(" ", "-")
```
par :
```python
from prices import _norm

try:
    from unidecode import unidecode
except ImportError:  # dégradation gracieuse si la dépendance n'est pas installée
    def unidecode(s):
        return s


def stop_slug(name):
    return unidecode(_norm(name)).replace("&", "and").replace("  ", " ").strip().replace(" ", "-")
```

- [ ] **Step 4: Ajouter un test de translittération grecque**

Ajouter à la fin de `scripts/scrapers/buses/test_net_geocode.py` :
```python
def test_stop_slug_transliterates_greek():
    # Σητεία -> siteia (latin) ; inoffensif sur les libellés déjà latins
    assert stop_slug("Σητεία") == "seteia" or stop_slug("Σητεία").isascii()
```

- [ ] **Step 5: Créer la migration `gtfs_stops`**

`supabase/migrations/20260616160000_gtfs_stops.sql` :
```sql
-- Référentiel d'arrêts GTFS (étape B) : dérivé de bus_routes par gtfs_stops_build.py.
-- Additif. N'altère pas bus_routes. Colonnes nommées GTFS (export stops.txt trivial).
create table if not exists gtfs_stops (
  stop_id            text primary key,                -- = slug canonique (stable, GTFS stop_id)
  stop_name          text not null,                   -- libellé d'affichage (latin)
  stop_name_el       text,                            -- grec si connu
  stop_lat           double precision,                -- null tant que non géocodé
  stop_lon           double precision,
  coords_source      text not null default 'none',    -- 'referentiel'|'cb_places'|'geocoded'|'none'
  coords_confidence  text not null default 'low',     -- 'high'|'low'
  needs_review       boolean not null default false,  -- true = à curer manuellement
  prefecture         text,                            -- 'HER'|'LAS'|'CHA'|'RET' (par proximité, si coords)
  route_count        integer not null default 0,      -- nb de routes (bus_routes) touchant l'arrêt
  updated_at         timestamptz not null default now()
);

alter table gtfs_stops enable row level security;
drop policy if exists "public read gtfs_stops" on gtfs_stops;
create policy "public read gtfs_stops" on gtfs_stops for select using (true);
grant select on gtfs_stops to anon, authenticated;
grant all    on gtfs_stops to service_role;
notify pgrst, 'reload schema';
```

- [ ] **Step 6: Lancer les tests portés (vérifier qu'ils passent)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_geocode.py -q && cd ../../..
```
Expected: PASS (tous les tests `net_geocode`, dont le nouveau test grec).

- [ ] **Step 7: Commit**

```bash
git add scripts/scrapers/buses/net_geocode.py scripts/scrapers/buses/test_net_geocode.py src/data/bus-places.json supabase/migrations/20260616160000_gtfs_stops.sql
git commit -m "feat(gtfs): scaffold étape B — migration gtfs_stops + net_geocode porté (unidecode)"
```

---

### Task 2: `gtfs_places.py` — curation GTFS (allowlist / stop / drop)

**Files:**
- Create: `scripts/scrapers/buses/gtfs_places.py`
- Test: `scripts/scrapers/buses/test_gtfs_places.py`

- [ ] **Step 1: Écrire les tests d'abord**

`scripts/scrapers/buses/test_gtfs_places.py` :
```python
from gtfs_places import status_of, canonical_slug, display_name


def test_allowlist_place_is_canonical():
    assert status_of("Heraklion") == "allowlist"
    assert canonical_slug("Heraklion") == "heraklion"


def test_named_hotel_or_poi_is_kept_as_stop():
    # En GTFS un arrêt est un arrêt : hôtels/POI nommés -> stop, JAMAIS drop.
    for name in ["Malia Palace", "University Gallou", "Botanical Garden", "Blue Bay", "Chania Express"]:
        assert status_of(name) == "stop", name
        assert canonical_slug(name) is not None, name


def test_structural_artifact_is_dropped():
    for name in ["A90", "90", "E75", "on the national road", "   ", ""]:
        assert status_of(name) == "drop", name
        assert canonical_slug(name) is None, name


def test_alias_typo_fixed():
    assert canonical_slug("rerhymno") == canonical_slug("Rethymno")


def test_display_name_titlecase():
    assert display_name("some village") == "Some Village"
```

- [ ] **Step 2: Lancer les tests (vérifier l'échec)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_gtfs_places.py -q ; cd ../../..
```
Expected: FAIL — `ModuleNotFoundError: No module named 'gtfs_places'`.

- [ ] **Step 3: Implémenter `gtfs_places.py`**

`scripts/scrapers/buses/gtfs_places.py` :
```python
"""Curation des arrêts pour le référentiel GTFS (adapté de net_places).

Différence clé vs net_places (SEO) : un arrêt GTFS est tout point d'embarquement
réel. On ne droppe QUE des artefacts STRUCTURELS (codes route, segments routiers,
chaînes vides), JAMAIS sur la base d'un nom. Les hôtels/resorts/POI nommés sont
gardés comme arrêts (needs_review jusqu'à validation).

Statuts : allowlist (bus-places.json) / stop (tout lieu nommé) / drop (artefact).
"""
import json
import os
import re

from prices import _norm
from net_geocode import stop_slug

_HERE = os.path.dirname(os.path.abspath(__file__))
_JSON = os.path.normpath(os.path.join(_HERE, "..", "..", "..", "src", "data", "bus-places.json"))

# Typos de scraping constatées -> orthographe DB canonique.
ALIAS_FIX = {
    "rerhymno": "Rethymno",
    "chromonastiti": "Chromonastiri",
    "manopiopoulo": "Manoliopoulo",
    "hrakleio old road": "Heraklion",
    "hrakleio": "Heraklion",
}

# Artefacts STRUCTURELS uniquement (jamais un nom de lieu).
_ARTIFACT = [
    re.compile(r"^[a-z]?\d+[a-z]?$", re.I),     # code seul : "90", "A90", "E75"
    re.compile(r"\bon the national\b", re.I),   # segment routier
    re.compile(r"^\s*$"),                       # vide / espaces
]

_allowlist_cache = None


def load_allowlist():
    global _allowlist_cache
    if _allowlist_cache is None:
        with open(_JSON, encoding="utf-8") as f:
            _allowlist_cache = json.load(f)
    return _allowlist_cache


def _fixed(name):
    return ALIAS_FIX.get(_norm(name), name)


def _is_artifact(name):
    if name is None:
        return True
    return any(p.search(name) for p in _ARTIFACT)


def status_of(name):
    fixed = _fixed(name)
    if fixed in load_allowlist():
        return "allowlist"
    if _is_artifact(name):
        return "drop"
    return "stop"


def canonical_slug(name):
    """slug canonique, ou None si artefact à dropper."""
    fixed = _fixed(name)
    al = load_allowlist()
    if fixed in al:
        return al[fixed]
    if _is_artifact(name):
        return None
    return stop_slug(fixed)


def display_name(name):
    """Nom d'affichage propre dérivé du slug canonique (title-case)."""
    slug = canonical_slug(name)
    if slug is None:
        return name
    return slug.replace("-", " ").title()
```

- [ ] **Step 4: Lancer les tests (vérifier qu'ils passent)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_gtfs_places.py -q && cd ../../..
```
Expected: PASS (5 tests). Si `test_allowlist_place_is_canonical` échoue, vérifier que `src/data/bus-places.json` contient bien la clé `"Heraklion"`.

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_places.py scripts/scrapers/buses/test_gtfs_places.py
git commit -m "feat(gtfs): curation GTFS — garder hôtels/POI, ne dropper que les artefacts"
```

---

### Task 3: `gtfs_stops_build.py` (1/4) — géo de base + curate + collect

**Files:**
- Create: `scripts/scrapers/buses/gtfs_stops_build.py`
- Test: `scripts/scrapers/buses/test_gtfs_stops_build.py`

- [ ] **Step 1: Écrire les tests d'abord**

`scripts/scrapers/buses/test_gtfs_stops_build.py` :
```python
from gtfs_stops_build import (
    haversine_km, in_crete, curate_routes, collect_stops_with_count,
    _siblings_by_slug, prefecture_for,
)


def test_in_crete_bbox():
    assert in_crete(35.34, 25.14) is True       # Heraklion
    assert in_crete(37.98, 23.72) is False      # Athènes
    assert in_crete(None, None) is False


def test_haversine_km_known_distance():
    d = haversine_km((35.3387, 25.1442), (35.5138, 24.0180))  # Heraklion<->Chania
    assert 100 < d < 140


def test_prefecture_for_nearest():
    assert prefecture_for(35.5138, 24.0180) == "CHA"   # Chania
    assert prefecture_for(35.2078, 26.1029) == "LAS"   # Sitia -> Lasithi
    assert prefecture_for(None, None) is None


def test_curate_routes_keeps_hotels_drops_codes():
    routes = [{"from_place": "Heraklion", "to_place": "Malia Palace",
               "via_stops": ["A90", "Gouves"]}]
    curated, dropped = curate_routes(routes)
    assert len(curated) == 1
    r = curated[0]
    assert r["from_place"] == "heraklion"
    assert r["to_place"] == "malia-palace"     # hôtel gardé
    assert r["via_stops"] == ["gouves"]        # A90 droppé du via
    assert "A90" in dropped


def test_curate_routes_drops_route_with_artifact_terminus():
    routes = [{"from_place": "A90", "to_place": "Heraklion", "via_stops": None}]
    curated, dropped = curate_routes(routes)
    assert curated == []
    assert "A90" in dropped


def test_collect_stops_with_count():
    routes = [
        {"from_place": "heraklion", "to_place": "sitia", "via_stops": ["malia"]},
        {"from_place": "heraklion", "to_place": "malia", "via_stops": None},
    ]
    by = {s["slug"]: s for s in collect_stops_with_count(routes)}
    assert by["heraklion"]["route_count"] == 2
    assert by["malia"]["route_count"] == 2
    assert by["sitia"]["route_count"] == 1


def test_siblings_by_slug():
    routes = [{"from_place": "a", "to_place": "b", "via_stops": ["c"]}]
    adj = _siblings_by_slug(routes)
    assert adj["a"] == {"b", "c"}
```

- [ ] **Step 2: Lancer les tests (vérifier l'échec)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_gtfs_stops_build.py -q ; cd ../../..
```
Expected: FAIL — `ModuleNotFoundError: No module named 'gtfs_stops_build'`.

- [ ] **Step 3: Implémenter le module (partie 1)**

`scripts/scrapers/buses/gtfs_stops_build.py` :
```python
"""Référentiel d'arrêts GTFS (étape B) : extrait les lieux de bus_routes,
curate (GTFS), géocode en cascade sous garde-fou de cohérence, assemble
gtfs_stops + exporte stops.txt. Lancé par buses.py après le scrape.

Pur hormis le fetch Nominatim (injecté) et le store/export (I/O isolée).
"""
import csv
import json
import math
import os
from collections import defaultdict

from prices import PLACE_COORDS, _norm
from net_geocode import coords_index_by_slug, geocode_slug
from gtfs_places import canonical_slug, display_name, load_allowlist

MIN_STOPS = 20                 # sous ce seuil = build suspect, on ne touche pas la DB
MAX_GEOCODE_DRIFT_KM = 45.0    # candidat Nominatim accepté si <45km d'un arrêt sûr de la même route
CRETE_BBOX = (34.70, 35.75, 23.40, 26.40)   # (lat_min, lat_max, lng_min, lng_max)

_HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(_HERE, "out", "gtfs")

PREFECTURE_CENTERS = {
    "CHA": (35.5138, 24.0180),   # Chania
    "RET": (35.3644, 24.4821),   # Rethymno
    "HER": (35.3387, 25.1442),   # Heraklion
    "LAS": (35.1909, 25.7136),   # Agios Nikolaos (Lasithi)
}


def haversine_km(a, b):
    """Distance grand-cercle en km entre (lat,lng) a et b."""
    lat1, lng1 = a
    lat2, lng2 = b
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def in_crete(lat, lng):
    if lat is None or lng is None:
        return False
    lat_min, lat_max, lng_min, lng_max = CRETE_BBOX
    return lat_min <= lat <= lat_max and lng_min <= lng <= lng_max


def prefecture_for(lat, lng):
    if lat is None or lng is None:
        return None
    return min(PREFECTURE_CENTERS, key=lambda p: haversine_km((lat, lng), PREFECTURE_CENTERS[p]))


def curate_routes(routes):
    """Canonise from/to/via en slugs ; jette une route dont un terminus est un
    artefact ; retire les via artefacts ; dédoublonne via slugs.
    Retourne (routes_curées, libellés_droppés)."""
    out, dropped = [], []
    for r in routes:
        a, b = canonical_slug(r["from_place"]), canonical_slug(r["to_place"])
        if a is None:
            dropped.append(r["from_place"])
        if b is None:
            dropped.append(r["to_place"])
        if a is None or b is None:
            continue
        via = []
        for v in (r.get("via_stops") or []):
            cs = canonical_slug(v)
            if cs is None:
                dropped.append(v)
            elif cs not in (a, b) and cs not in via:
                via.append(cs)
        out.append({**r, "from_place": a, "to_place": b, "via_stops": via or None})
    return out, dropped


def collect_stops_with_count(routes):
    """Arrêts (from/via/to) dédupliqués par slug (déjà canonique).
    route_count = nb de routes distinctes touchant le slug ; name = display_name."""
    seen = {}
    counts = defaultdict(int)
    for r in routes:
        slugs = {s for s in {r["from_place"], r["to_place"], *(r.get("via_stops") or [])} if s}
        for s in slugs:
            counts[s] += 1
            if s not in seen:
                seen[s] = {"slug": s, "name": display_name(s)}
    return [{**seen[s], "route_count": counts[s]} for s in seen]


def _siblings_by_slug(routes):
    """slug -> set des slugs partageant au moins une route avec lui."""
    adj = defaultdict(set)
    for r in routes:
        members = [s for s in {r["from_place"], r["to_place"], *(r.get("via_stops") or [])} if s]
        for s in members:
            adj[s].update(m for m in members if m != s)
    return adj
```

- [ ] **Step 4: Lancer les tests (vérifier qu'ils passent)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_gtfs_stops_build.py -q && cd ../../..
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_stops_build.py scripts/scrapers/buses/test_gtfs_stops_build.py
git commit -m "feat(gtfs): build 1/4 — bbox/haversine/préfecture + curate + collect"
```

---

### Task 4: `gtfs_stops_build.py` (2/4) — garde-fou de cohérence

**Files:**
- Modify: `scripts/scrapers/buses/gtfs_stops_build.py`
- Test: `scripts/scrapers/buses/test_gtfs_stops_build.py`

- [ ] **Step 1: Ajouter les tests du garde-fou**

Ajouter à `scripts/scrapers/buses/test_gtfs_stops_build.py` :
```python
from gtfs_stops_build import coherence_ok


def test_coherence_accepts_near_sibling():
    siblings = {"profitis-ilias": {"heraklion"}}
    high = {"heraklion": (35.3387, 25.1442)}
    # ~17 km de Heraklion, dans la bbox -> accepté
    assert coherence_ok("profitis-ilias", 35.20, 25.10, high, siblings) is True


def test_coherence_rejects_far_homonym():
    siblings = {"profitis-ilias": {"heraklion"}}
    high = {"heraklion": (35.3387, 25.1442)}
    # homonyme à >200 km (et hors bbox) -> rejet
    assert coherence_ok("profitis-ilias", 36.9, 22.0, high, siblings) is False


def test_coherence_rejects_outside_crete():
    siblings = {"x": {"heraklion"}}
    high = {"heraklion": (35.3387, 25.1442)}
    assert coherence_ok("x", 48.85, 2.35, high, siblings) is False   # Paris


def test_coherence_rejects_when_no_high_sibling():
    siblings = {"x": {"y"}}   # y n'a pas de coords sûres
    assert coherence_ok("x", 35.30, 25.10, {}, siblings) is False
```

- [ ] **Step 2: Lancer les tests (vérifier l'échec)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_gtfs_stops_build.py -q ; cd ../../..
```
Expected: FAIL — `ImportError: cannot import name 'coherence_ok'`.

- [ ] **Step 3: Implémenter `coherence_ok`**

Ajouter à `scripts/scrapers/buses/gtfs_stops_build.py` (après `_siblings_by_slug`) :
```python
def coherence_ok(slug, lat, lng, high_coords, siblings):
    """Vrai si (lat,lng) est dans la bbox Crète ET à < MAX_GEOCODE_DRIFT_KM d'au
    moins un arrêt high-confidence partageant une route. Valide un candidat Nominatim."""
    if not in_crete(lat, lng):
        return False
    for sib in siblings.get(slug, ()):
        ref = high_coords.get(sib)
        if ref and haversine_km((lat, lng), ref) < MAX_GEOCODE_DRIFT_KM:
            return True
    return False
```

- [ ] **Step 4: Lancer les tests (vérifier qu'ils passent)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_gtfs_stops_build.py -q && cd ../../..
```
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_stops_build.py scripts/scrapers/buses/test_gtfs_stops_build.py
git commit -m "feat(gtfs): build 2/4 — garde-fou de cohérence (bbox + drift 45km)"
```

---

### Task 5: `gtfs_stops_build.py` (3/4) — assemble_stops (cascade + garde-fou + needs_review)

**Files:**
- Modify: `scripts/scrapers/buses/gtfs_stops_build.py`
- Test: `scripts/scrapers/buses/test_gtfs_stops_build.py`

- [ ] **Step 1: Ajouter les tests d'assemblage**

Ajouter à `scripts/scrapers/buses/test_gtfs_stops_build.py` :
```python
from gtfs_stops_build import assemble_stops


def test_assemble_stops_cascade_and_guard_accepts_near():
    routes = [{"from_place": "Heraklion", "to_place": "Malia", "via_stops": ["Unknown Hamlet"]}]
    place_coords = {"heraklion": (35.3387, 25.1442), "malia": (35.2853, 25.4624)}

    def nomi(name):
        return (35.30, 25.40) if "hamlet" in name.lower() else None  # ~15km de Malia (sibling)

    stops, dropped = assemble_stops(routes, place_coords, {}, nominatim=nomi)
    by = {s["stop_id"]: s for s in stops}
    assert by["heraklion"]["coords_source"] == "referentiel"
    assert by["heraklion"]["coords_confidence"] == "high"
    assert by["heraklion"]["needs_review"] is False
    h = by["unknown-hamlet"]
    assert h["coords_source"] == "geocoded" and h["coords_confidence"] == "low"
    assert h["needs_review"] is True
    assert h["stop_lat"] is not None        # garde-fou OK (proche de Malia)
    assert h["prefecture"] in PREFECTURE_CENTERS


def test_assemble_stops_guard_rejects_far_nominatim():
    routes = [{"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Bad Match"]}]
    place_coords = {"heraklion": (35.3387, 25.1442), "sitia": (35.2078, 26.1029)}

    def nomi(name):
        return (40.0, 22.0) if "bad" in name.lower() else None   # hors Crète

    stops, _ = assemble_stops(routes, place_coords, {}, nominatim=nomi)
    bad = {s["stop_id"]: s for s in stops}["bad-match"]
    assert bad["stop_lat"] is None and bad["coords_source"] == "none"
    assert bad["needs_review"] is True
```

- [ ] **Step 2: Lancer les tests (vérifier l'échec)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_gtfs_stops_build.py -q ; cd ../../..
```
Expected: FAIL — `ImportError: cannot import name 'assemble_stops'`.

- [ ] **Step 3: Implémenter `assemble_stops`**

Ajouter à `scripts/scrapers/buses/gtfs_stops_build.py` (après `coherence_ok`) :
```python
def assemble_stops(routes, place_coords, cb_index, nominatim=None):
    """Pur (sauf nominatim injecté). Retourne (stops, dropped).
    Cascade référentiel -> cb_places -> Nominatim (sous garde-fou) -> none ; + needs_review."""
    curated, dropped = curate_routes(routes)
    raw = collect_stops_with_count(curated)
    allowlist = load_allowlist()
    names_by_slug = {s["slug"]: s["name"] for s in raw}

    # Index coords sûres par slug (référentiel + cb_places) + pont allowlist
    # (orthographe DB != slug canonique, ex "Siteia"->"sitia").
    coords_index = coords_index_by_slug(place_coords, cb_index, names_by_slug)
    for nom_db, slug in allowlist.items():
        if slug not in coords_index:
            k = _norm(nom_db)
            if k in place_coords:
                coords_index[slug] = place_coords[k]

    siblings = _siblings_by_slug(curated)
    high_coords = {s["slug"]: coords_index[s["slug"]] for s in raw if s["slug"] in coords_index}

    stops = []
    for s in raw:
        slug, disp = s["slug"], s["name"]
        lat, lng, source, conf = geocode_slug(slug, disp, coords_index, nominatim=nominatim)
        if source == "geocoded" and not coherence_ok(slug, lat, lng, high_coords, siblings):
            lat, lng, source, conf = None, None, "none", "low"
        stops.append({
            "stop_id": slug,
            "stop_name": disp,
            "stop_name_el": None,
            "stop_lat": lat,
            "stop_lon": lng,
            "coords_source": source,
            "coords_confidence": conf,
            "needs_review": conf != "high",
            "prefecture": prefecture_for(lat, lng),
            "route_count": s["route_count"],
        })
    return stops, dropped
```

- [ ] **Step 4: Lancer les tests (vérifier qu'ils passent)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_gtfs_stops_build.py -q && cd ../../..
```
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_stops_build.py scripts/scrapers/buses/test_gtfs_stops_build.py
git commit -m "feat(gtfs): build 3/4 — assemble_stops (cascade + garde-fou + needs_review)"
```

---

### Task 6: `gtfs_stops_build.py` (4/4) — export stops.txt + stats + store + entrypoint

**Files:**
- Modify: `scripts/scrapers/buses/gtfs_stops_build.py`
- Test: `scripts/scrapers/buses/test_gtfs_stops_build.py`
- Modify: `scripts/scrapers/buses/.gitignore` (créer si absent)

- [ ] **Step 1: Ajouter les tests export + store**

Ajouter à `scripts/scrapers/buses/test_gtfs_stops_build.py` :
```python
import pytest
from gtfs_stops_build import export_stops_txt, write_stats, store_stops


def _stop(stop_id, lat=None, lon=None, name=None, conf="low", source="none"):
    return {"stop_id": stop_id, "stop_name": name or stop_id.title(),
            "stop_name_el": None, "stop_lat": lat, "stop_lon": lon,
            "coords_source": source, "coords_confidence": conf,
            "needs_review": conf != "high", "prefecture": None, "route_count": 1}


def test_export_stops_txt_only_geocoded_and_escapes(tmp_path):
    stops = [
        {**_stop("a", 35.1, 25.1, name="A, town", conf="high", source="referentiel")},
        _stop("b"),   # sans coords -> exclu
    ]
    n = export_stops_txt(stops, out_dir=str(tmp_path))
    assert n == 1
    lines = (tmp_path / "stops.txt").read_text(encoding="utf-8").strip().split("\n")
    assert lines[0] == "stop_id,stop_name,stop_lat,stop_lon"
    assert lines[1] == 'a,"A, town",35.100000,25.100000'   # virgule -> quoting CSV
    assert len(lines) == 2


def test_write_stats(tmp_path):
    stops = [
        _stop("a", 35.1, 25.1, conf="high", source="referentiel"),
        _stop("b"),
    ]
    stats = write_stats(stops, dropped=["A90", "A90"], out_dir=str(tmp_path))
    assert stats["total_stops"] == 2
    assert stats["geocoded"] == 1
    assert stats["coverage_pct"] == 50.0
    assert stats["needs_review"] == 1
    assert stats["dropped_labels"] == ["A90"]   # dédupliqué


def test_store_stops_refuses_below_min():
    class _T:
        def delete(self): return self
        def neq(self, *a): return self
        def insert(self, p): return self
        def execute(self): return self

    class _SB:
        def table(self, n): return _T()

    with pytest.raises(ValueError):
        store_stops(_SB(), [_stop(f"s{i}") for i in range(5)])   # < MIN_STOPS
```

- [ ] **Step 2: Lancer les tests (vérifier l'échec)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_gtfs_stops_build.py -q ; cd ../../..
```
Expected: FAIL — `ImportError: cannot import name 'export_stops_txt'`.

- [ ] **Step 3: Implémenter export + stats + store + entrypoint + Nominatim**

Ajouter à `scripts/scrapers/buses/gtfs_stops_build.py` (après `assemble_stops`) :
```python
def export_stops_txt(stops, out_dir=OUT_DIR):
    """Écrit stops.txt (GTFS) : 1 ligne par arrêt géocodé. Retourne le nb de lignes."""
    os.makedirs(out_dir, exist_ok=True)
    geocoded = [s for s in stops if s["stop_lat"] is not None and s["stop_lon"] is not None]
    path = os.path.join(out_dir, "stops.txt")
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["stop_id", "stop_name", "stop_lat", "stop_lon"])
        for s in sorted(geocoded, key=lambda x: x["stop_id"]):
            w.writerow([s["stop_id"], s["stop_name"],
                        f"{s['stop_lat']:.6f}", f"{s['stop_lon']:.6f}"])
    return len(geocoded)


def write_stats(stops, dropped, out_dir=OUT_DIR):
    os.makedirs(out_dir, exist_ok=True)
    geocoded = sum(1 for s in stops if s["stop_lat"] is not None)
    stats = {
        "total_stops": len(stops),
        "geocoded": geocoded,
        "coverage_pct": round(100 * geocoded / len(stops), 1) if stops else 0.0,
        "needs_review": sum(1 for s in stops if s["needs_review"]),
        "dropped_count": len(dropped),
        "dropped_labels": sorted(set(dropped)),
    }
    with open(os.path.join(out_dir, "build-stats.json"), "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    return stats


def store_stops(sb, stops):
    """Remplace gtfs_stops (delete+insert). Lève si < MIN_STOPS. Retourne nb écrits."""
    if len(stops) < MIN_STOPS:
        raise ValueError(f"refuse build: only {len(stops)} stops (<{MIN_STOPS})")
    cols = ("stop_id", "stop_name", "stop_name_el", "stop_lat", "stop_lon",
            "coords_source", "coords_confidence", "needs_review", "prefecture", "route_count")
    payload = [{k: s[k] for k in cols} for s in stops]
    sb.table("gtfs_stops").delete().neq("stop_id", "").execute()
    sb.table("gtfs_stops").insert(payload).execute()
    return len(payload)


def _load_cb_index(sb):
    """cb_places -> {nom_normalisé: (lat,lng)} (best-effort, vide si absente)."""
    try:
        rows = sb.table("cb_places").select("name,latitude,longitude").execute().data
        return {_norm(r["name"]): (r["latitude"], r["longitude"]) for r in rows
                if r.get("name") and r.get("latitude") is not None and r.get("longitude") is not None}
    except Exception:
        return {}


def make_nominatim(cache_path=None, throttle_s=1.0):
    """Lookup Nominatim caché + throttlé. Retourne f(name)->(lat,lng)|None.
    Cache JSON persistant pour ne pas re-interroger l'endpoint gratuit."""
    import time
    import requests
    path = cache_path or os.path.join(OUT_DIR, "nominatim-cache.json")
    cache = {}
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            cache = {}
    state = {"last": 0.0}

    def lookup(name):
        key = _norm(name)
        if key in cache:
            v = cache[key]
            return tuple(v) if v else None
        wait = throttle_s - (time.time() - state["last"])
        if wait > 0:
            time.sleep(wait)
        state["last"] = time.time()
        hit = None
        try:
            r = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": f"{name}, Crete, Greece", "format": "json", "limit": 1},
                headers={"User-Agent": "crete.direct-bot/1.0 (+https://crete.direct)"},
                timeout=20,
            )
            if r.status_code == 200 and r.json():
                d = r.json()[0]
                hit = (float(d["lat"]), float(d["lon"]))
        except Exception:
            hit = None
        cache[key] = list(hit) if hit else None
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
        return hit

    return lookup


def build_gtfs_stops(sb, nominatim=None):
    """Point d'entrée : lit bus_routes, assemble, écrit gtfs_stops, exporte stops.txt.
    Retourne le dict de stats (+ 'written')."""
    routes = sb.table("bus_routes").select("from_place,to_place,via_stops").execute().data
    cb_index = _load_cb_index(sb)
    stops, dropped = assemble_stops(routes, PLACE_COORDS, cb_index, nominatim=nominatim)
    n = store_stops(sb, stops)
    export_stops_txt(stops)
    stats = write_stats(stops, dropped)
    return {**stats, "written": n}
```

- [ ] **Step 4: Ignorer les artefacts de build**

Créer/compléter `scripts/scrapers/buses/.gitignore` :
```
.venv/
out/
__pycache__/
```

- [ ] **Step 5: Lancer toute la suite (vérifier qu'elle passe)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q test_net_geocode.py test_gtfs_places.py test_gtfs_stops_build.py && cd ../../..
```
Expected: PASS (tous les tests des 3 modules).

- [ ] **Step 6: Commit**

```bash
git add scripts/scrapers/buses/gtfs_stops_build.py scripts/scrapers/buses/test_gtfs_stops_build.py scripts/scrapers/buses/.gitignore
git commit -m "feat(gtfs): build 4/4 — export stops.txt + stats + store + entrypoint"
```

---

### Task 7: Sanity check Node `check-gtfs-stops.mjs`

**Files:**
- Create: `scripts/check-gtfs-stops.mjs`
- Modify: `package.json` (ajouter un script `check:gtfs-stops`)

- [ ] **Step 1: Implémenter le sanity check (pur, lit les artefacts de build, zéro DB)**

`scripts/check-gtfs-stops.mjs` :
```javascript
#!/usr/bin/env node
// Sanity check du référentiel GTFS — pur, lit out/gtfs/{stops.txt,build-stats.json},
// aucune dépendance DB/secret. Run: node scripts/check-gtfs-stops.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "scrapers", "buses", "out", "gtfs");
const BBOX = { latMin: 34.70, latMax: 35.75, lngMin: 23.40, lngMax: 26.40 };

let fail = 0;
const err = (m) => { console.error("FAIL:", m); fail++; };

const stats = JSON.parse(readFileSync(join(OUT, "build-stats.json"), "utf-8"));
const txt = readFileSync(join(OUT, "stops.txt"), "utf-8").trim().split("\n");
const header = txt[0];
const rows = txt.slice(1);

if (header !== "stop_id,stop_name,stop_lat,stop_lon") err(`header inattendu: ${header}`);
if (rows.length !== stats.geocoded) err(`stops.txt ${rows.length} lignes != geocoded ${stats.geocoded}`);

for (const line of rows) {
  // lat/lon = 2 derniers champs (toujours numériques, sans virgule) ; stop_id = 1er (slug, sans virgule).
  const parts = line.split(",");
  const lon = parseFloat(parts[parts.length - 1]);
  const lat = parseFloat(parts[parts.length - 2]);
  if (!parts[0]) err(`stop_id vide: ${line}`);
  if (!(lat >= BBOX.latMin && lat <= BBOX.latMax)) err(`lat hors Crète: ${line}`);
  if (!(lon >= BBOX.lngMin && lon <= BBOX.lngMax)) err(`lng hors Crète: ${line}`);
}

console.log(
  `gtfs_stops: ${stats.total_stops} arrêts, ${stats.geocoded} géocodés ` +
  `(${stats.coverage_pct}%), ${stats.needs_review} needs_review, ${stats.dropped_count} droppés.`,
);
if (stats.coverage_pct < 60) console.warn(`WARN couverture ${stats.coverage_pct}% < 60% (référentiel à compléter)`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Ajouter le script npm (dédié, sans toucher l'agrégat `check`)**

Dans `package.json`, ajouter dans `"scripts"` une entrée :
```json
    "check:gtfs-stops": "node scripts/check-gtfs-stops.mjs",
```
(Insérer la ligne à côté des autres `check:*`. NE PAS l'ajouter à l'agrégat `check` — il dépend d'un build réel produit sur le VPS, et l'agrégat a des échecs hors-scope connus.)

- [ ] **Step 3: Vérifier le check sur une fixture locale**

Générer un mini-jeu de données puis lancer le check :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -c "import gtfs_stops_build as g; stops=[{'stop_id':f's{i}','stop_name':'S','stop_name_el':None,'stop_lat':35.1,'stop_lon':25.1,'coords_source':'referentiel','coords_confidence':'high','needs_review':False,'prefecture':'HER','route_count':1} for i in range(25)]; g.export_stops_txt(stops); g.write_stats(stops, [])" && cd ../../.. && node scripts/check-gtfs-stops.mjs
```
Expected: ligne `gtfs_stops: 25 arrêts, 25 géocodés (100.0%)...` et exit 0. (Le dossier `out/` est gitignoré : cette fixture ne sera pas committée.)

- [ ] **Step 4: Commit**

```bash
git add scripts/check-gtfs-stops.mjs package.json
git commit -m "feat(gtfs): sanity check check-gtfs-stops.mjs (pur, lit stops.txt + stats)"
```

---

### Task 8: Brancher `build_gtfs_stops` dans le scraper `buses.py`

**Files:**
- Modify: `scripts/scrapers/buses/buses.py` (fonction `main`, après la boucle de scrape)

- [ ] **Step 1: Ajouter l'appel post-scrape (dégradation gracieuse)**

Dans `scripts/scrapers/buses/buses.py`, fonction `main()`, juste avant le bloc `if failures:` final, insérer :
```python
    # Référentiel GTFS (étape B) : dérive gtfs_stops + stops.txt depuis bus_routes.
    # Non bloquant : un échec ici ne doit jamais compromettre le scrape des routes.
    try:
        from gtfs_stops_build import build_gtfs_stops, make_nominatim
        stats = build_gtfs_stops(sb, nominatim=make_nominatim())
        log(f"gtfs_stops: {stats['written']} arrêts, {stats['coverage_pct']}% géocodés, "
            f"{stats['needs_review']} needs_review, {stats['dropped_count']} droppés")
    except Exception as e:
        log(f"gtfs_stops build failed (non-bloquant): {e}")
```

- [ ] **Step 2: Vérifier que `buses.py` s'importe toujours sans erreur**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -c "import ast; ast.parse(open('buses.py',encoding='utf-8').read()); print('syntax OK')" && cd ../../..
```
Expected: `syntax OK`.

- [ ] **Step 3: Re-lancer toute la suite pytest (non-régression)**

Run :
```bash
cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q && cd ../../..
```
Expected: PASS (toute la suite buses, anciens + nouveaux tests). Si des tests pré-existants exigent des deps absentes du venv (ex `pdfplumber`), les lancer en ciblant nos 3 fichiers : `pytest -q test_net_geocode.py test_gtfs_places.py test_gtfs_stops_build.py`.

- [ ] **Step 4: Commit**

```bash
git add scripts/scrapers/buses/buses.py
git commit -m "feat(gtfs): branche build_gtfs_stops en post-scrape (non bloquant)"
```

---

### Task 9: Déploiement VPS + run réel (owner Kami — accès VPS requis)

**Files:** aucun (opérations VPS + revue). Cette étape ne touche pas le front Vercel → pas de `push master:main`.

- [ ] **Step 1: Merger la branche dans master**

```bash
git checkout master && git merge --ff-only feat/gtfs-stops && git push origin master
```
(Si non fast-forward, `git merge feat/gtfs-stops` puis résoudre, `tsc`/tests verts avant push. Le front n'est pas modifié → aucun `push master:main`.)

- [ ] **Step 2: Appliquer la migration sur le Postgres VPS**

Sur `kairos-vps`, exécuter `supabase/migrations/20260616160000_gtfs_stops.sql` contre `cretepulse-db` (psql ou pipeline migration habituel). Vérifier `\d gtfs_stops` + `notify pgrst` (schema rechargé).

- [ ] **Step 3: Déployer les modules + dépendance**

Copier sur `/opt/cretepulse` : `net_geocode.py`, `gtfs_places.py`, `gtfs_stops_build.py`, `src/data/bus-places.json`, `buses.py` (mis à jour). Installer `unidecode` dans le venv VPS : `/opt/cretepulse/venv/bin/pip install unidecode`.

- [ ] **Step 4: Run réel (Nominatim ON) + sanity**

```bash
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... /opt/cretepulse/venv/bin/python buses.py
```
Puis vérifier la couverture via le log `gtfs_stops: ...% géocodés`. Copier `out/gtfs/` localement et lancer `node scripts/check-gtfs-stops.mjs` (ou exécuter le check sur le VPS si Node dispo). **Cible : ≥ 85 % géocodés, zéro coord hors Crète.**

- [ ] **Step 5: Revue manuelle `needs_review` (boucle de curation)**

Lister les arrêts `needs_review=true` triés par `route_count desc` (les plus fréquentés d'abord). Pour chaque vrai lieu, **ajouter ses coords à `PLACE_COORDS` dans `prices.py`** (clé = nom DB en minuscules) — c'est le référentiel manuel versionné ; au prochain build il devient `referentiel`/`high`. (Ne PAS éditer les coords directement en DB : un rebuild les écraserait.) Committer les ajouts `PLACE_COORDS`.

---

## Self-Review

**1. Spec coverage** (spec `2026-06-16-gtfs-stops-reference-design.md`) :
- §3 critère 1 (tous les lieux distincts curés de from/to/via) → Task 3 `collect_stops_with_count` + `curate_routes`, Task 6 `build_gtfs_stops`. ✓
- §3 critère 2 (≥85 % géocodé, cascade) → Task 5 `assemble_stops` (cascade) + Task 9 run réel. ✓
- §3 critère 3 (zéro coord hors Crète, garde-fou) → Task 4 `coherence_ok` (+ bbox), Task 7 check. ✓
- §3 critère 4 (needs_review + route_count + log droppés) → Task 5 `needs_review`, Task 3 `route_count`, Task 6 `write_stats` (dropped_labels). ✓
- §3 critère 5 (stops.txt valide, CSV escaping) → Task 6 `export_stops_txt` (csv.writer) + test escaping. ✓
- §3 critère 6 (pytest + sanity) → Tasks 2-6 pytest, Task 7 check. ✓
- §3 critère 7 (idempotence, référentiel prime) → full delete+insert depuis PLACE_COORDS à chaque run (Task 6 `store_stops`/`build_gtfs_stops`) + Task 9 step 5 (curation via PLACE_COORDS). ✓
- §7 schéma `gtfs_stops` → Task 1 migration. ✓
- §8 curation GTFS (allowlist/stop/drop structurel) → Task 2 `gtfs_places`. ✓
- §9 cascade + garde-fou + modèle Nominatim (throttle/cache/injecté) → Tasks 4-6 (`coherence_ok`, `make_nominatim`). ✓
- §10 export stops.txt (géocodés seulement, colonnes GTFS) → Task 6. ✓
- §6 branchement post-scrape `buses.py` → Task 8. ✓
- §14 déploiement → Task 9. ✓

**2. Placeholder scan** : aucun TBD/TODO ; chaque step de code montre le code complet ; commandes + sorties attendues présentes. ✓

**3. Type consistency** : clés de l'enregistrement arrêt identiques partout (`stop_id`/`stop_name`/`stop_name_el`/`stop_lat`/`stop_lon`/`coords_source`/`coords_confidence`/`needs_review`/`prefecture`/`route_count`) entre `assemble_stops` (T5), `export_stops_txt`/`store_stops`/`write_stats` (T6), les tests (T6) et la migration (T1). `coherence_ok(slug, lat, lng, high_coords, siblings)` : même signature T4 (def) ↔ T5 (appel). `curate_routes` retourne `(out, dropped)` partout. `build-stats.json` clés (`total_stops`/`geocoded`/`coverage_pct`/`needs_review`/`dropped_count`/`dropped_labels`) cohérentes entre `write_stats` (T6) et le check Node (T7). ✓
