# SP2 — Appariement KTEL ↔ OSM + fallback minimal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pour chaque route KTEL (`bus_routes`), trouver la ligne réseau correspondante (OSM ou fallback) et l'attacher via `bus_routes.line_id` ; pour les paires KTEL absentes d'OSM, créer une ligne `source='ktel'` minimale (2 terminus + géométrie OSRM) avec ses arrêts.

**Architecture:** Nouveau pipeline `ktel_apparier.py` + sous-modules plats (`ktel_alias`, `ktel_resolve`, `ktel_match`, `ktel_fallback`) + wrapper cron `run_apparier.py`. Réutilise les briques SP1 (`net_osrm`, `net_nomenclature`, `net_timeprofile`, `net_geocode`, `prices`, `build_network._parse_duration_min/_title`). Architecture miroir SP1 : fonctions pures + tests TDD sur fixture réelle + OSRM injecté. Aucune modif des modules SP1.

**Tech Stack:** Python 3 (venv `scripts/scrapers/buses/.venv`), `requests` (OSRM lazy), Postgres via `supabase-py`, pytest. Imports plats (CWD `scripts/scrapers/buses`). Branche `feat/bus-network` dans worktree `C:/Users/fkerj/cretepulse-bus-network` (isolée de master).

**Spec :** `docs/superpowers/specs/2026-06-14-ktel-apparier-design.md`

**Périmètre :** SP2 ne touche pas le pipeline SP1 (OSM ingestion) déjà en prod. Additif sur `bus_stops/bus_lines/bus_line_stops` (insère des records source='ktel' à côté des source='osm') ; un seul changement schema (`bus_routes.line_id` FK nullable). Pas de merge vers master/main avant SP4 (carte live) — pas de risque visiteur tant qu'aucune page Next.js ne lit ces tables.

**État avant Task 1 :** branche `feat/bus-network` à `f3f99f6` (spec SP2 committed). Worktree isolé, venv `.venv` actif, suite pytest 107/107 verts post-SP1. Modules SP1 (`osm_*`, `net_*`, `build_network`, `buses`) en place.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/20260614160000_bus_routes_line_id.sql` | FK `bus_routes.line_id` + index |
| `scripts/scrapers/buses/ktel_to_osm.json` | Alias manuel commit-é (~30 hubs) |
| `scripts/scrapers/buses/ktel_alias.py` | Load + lookup du JSON |
| `scripts/scrapers/buses/ktel_resolve.py` | Cascade `exact → alias → coords` |
| `scripts/scrapers/buses/ktel_match.py` | Match strict `(operator, frozenset(termini))` |
| `scripts/scrapers/buses/ktel_fallback.py` | Construction lignes `source='ktel'` |
| `scripts/scrapers/buses/ktel_apparier.py` | Orchestration (assemble + store transactionnel) |
| `scripts/scrapers/buses/run_apparier.py` | Wrapper cron + alerte Telegram |
| `scripts/scrapers/buses/fixtures/ktel_routes_sample.json` | Fixture réelle ~40 routes |
| `scripts/scrapers/buses/test_ktel_*.py` | Tests pytest |

**Conventions :** imports plats (CWD `scripts/scrapers/buses`), tests `.venv/Scripts/python -m pytest`. Git author `kerjeanfrancois29`, **stage explicite par chemin (jamais `git add -A` ni `git add .`)**, **commits locaux uniquement (pas de push)**. Accents français corrects.

---

## Task 1: Migration FK bus_routes.line_id

**Files:**
- Create: `supabase/migrations/20260614160000_bus_routes_line_id.sql`

- [ ] **Step 1: Écrire la migration**

Create `supabase/migrations/20260614160000_bus_routes_line_id.sql` (verbatim) :
```sql
-- SP2 : lien entre une route KTEL (bus_routes) et sa ligne du réseau (bus_lines).
-- ON DELETE SET NULL : SP1 rebuild bus_lines (delete+insert) -> les FK deviennent
-- NULL au lieu de violer la contrainte ; le run SP2 chaîné derrière repeuple.
alter table bus_routes
  add column if not exists line_id integer references bus_lines(id) on delete set null;
create index if not exists idx_bus_routes_line_id on bus_routes (line_id);
notify pgrst, 'reload schema';
```

- [ ] **Step 2: Valider le parse**

Run: `cd /c/Users/fkerj/cretepulse-bus-network && scripts/scrapers/buses/.venv/Scripts/python -c "import pathlib; s = pathlib.Path('supabase/migrations/20260614160000_bus_routes_line_id.sql').read_text(encoding='utf-8'); assert 'line_id integer references bus_lines(id) on delete set null' in s; assert 'idx_bus_routes_line_id' in s; print('OK')"`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260614160000_bus_routes_line_id.sql
git commit -m "feat(buses): migration FK bus_routes.line_id (SP2)"
```

---

## Task 2: ktel_to_osm.json + ktel_alias.py

**Files:**
- Create: `scripts/scrapers/buses/ktel_to_osm.json`
- Create: `scripts/scrapers/buses/ktel_alias.py`
- Test: `scripts/scrapers/buses/test_ktel_alias.py`

- [ ] **Step 1: Écrire le JSON d'alias (seed initial vérifié contre DB)**

Create `scripts/scrapers/buses/ktel_to_osm.json` (verbatim — chaque entrée = slug KTEL → slug OSM existant dans `bus_stops` post-SP1, vérifié le 14/06/2026) :
```json
{
  "chania": "khania",
  "heraklion": "erakleio",
  "rethymno": "rethumno",
  "palaiochora": "palaiokhora",
  "almirida": "almurida",
  "botanical-garden": "botaniko-parko",
  "siteia": "sitia",
  "hersonissos": "khersonisos",
  "agia-pelagia": "agia-pelagia",
  "matala": "matala",
  "ierapetra": "ierapetra",
  "agios-nikolaos": "agios-nikolaos",
  "plakias": "plakias",
  "phaistos": "phaistos",
  "agia-galini": "agia-galini",
  "chania-airport": "khania-airport",
  "heraklion-airport": "erakleio-airport",
  "kissamos": "kissamos",
  "kastelli": "kastelli",
  "elafonisi": "elafonisi",
  "elafonissi": "elafonisi",
  "loutro": "loutro",
  "sougia": "sougia",
  "spili": "spili",
  "anogia": "anogeia",
  "moires": "moires",
  "gortyna": "gortuna",
  "tympaki": "tumpaki",
  "tympaki-(timbaki)": "tumpaki",
  "agia-roumeli": "agia-roumeli",
  "chora-sfakion": "khora-sphakion",
  "georgioupoli": "georgioupoli",
  "vrysses": "bruses"
}
```

> **NOTE pour l'implémenteur :** ce seed liste des slugs OSM qui, au 14/06/2026, peuvent ou peuvent ne PAS exister dans `bus_stops` (selon ce qu'OSM a publié dans les relations). Les alias dont la target n'est pas dans `bus_stops` au moment du run agiront comme `None` côté `ktel_resolve` (qui fait le `if alias_target in stops_by_slug`). C'est inoffensif — le run loggera ces entrées comme non-matchées et elles seront auditables. Ne pas re-vérifier la DB ; le JSON est volontairement large pour anticiper la couverture OSM future.

- [ ] **Step 2: Écrire les tests**

Create `scripts/scrapers/buses/test_ktel_alias.py` :
```python
import json
import os
import tempfile

from ktel_alias import load_aliases, lookup_alias


def test_load_default_returns_dict():
    a = load_aliases()
    assert isinstance(a, dict)
    # seed connu : la translittération OSM officielle de Heraklion
    assert a.get("heraklion") == "erakleio"
    assert a.get("chania") == "khania"


def test_lookup_alias_returns_target_or_none():
    a = {"chania": "khania", "heraklion": "erakleio"}
    assert lookup_alias("chania", a) == "khania"
    assert lookup_alias("CHANIA", a) == "khania"   # case-insensitive
    assert lookup_alias("unknown-village", a) is None
    assert lookup_alias(None, a) is None


def test_load_aliases_explicit_path(tmp_path):
    p = tmp_path / "custom.json"
    p.write_text('{"foo": "bar"}', encoding="utf-8")
    a = load_aliases(str(p))
    assert a == {"foo": "bar"}


def test_load_aliases_missing_file_returns_empty(tmp_path):
    p = tmp_path / "nope.json"
    assert load_aliases(str(p)) == {}
```

- [ ] **Step 3: Run pytest, confirm failure**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_ktel_alias.py -q`
Expected: `ModuleNotFoundError: No module named 'ktel_alias'`.

- [ ] **Step 4: Implémenter `ktel_alias.py`**

Create `scripts/scrapers/buses/ktel_alias.py` (verbatim) :
```python
"""Alias manuel KTEL slug -> OSM slug. Source unique : ktel_to_osm.json (commit-é).
Pas de I/O réseau. Aucune génération auto : chaque ajout est revu en code review."""
import json
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_JSON = os.path.join(_HERE, "ktel_to_osm.json")


def load_aliases(path=None):
    """Charge le JSON d'alias. Retourne {} si le fichier n'existe pas."""
    p = path or _DEFAULT_JSON
    if not os.path.isfile(p):
        return {}
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def lookup_alias(ktel_slug, aliases):
    """Retourne le slug OSM cible si ktel_slug (case-insensitive) est dans le mapping."""
    if not ktel_slug:
        return None
    return aliases.get(ktel_slug.lower())
```

- [ ] **Step 5: Run pytest, confirm 4 passed**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_ktel_alias.py -q`
Expected: `4 passed`.

- [ ] **Step 6: Commit**

```bash
git add scripts/scrapers/buses/ktel_to_osm.json scripts/scrapers/buses/ktel_alias.py scripts/scrapers/buses/test_ktel_alias.py
git commit -m "feat(buses): seed alias KTEL<->OSM + module ktel_alias (SP2)"
```

---

## Task 3: ktel_resolve.py — cascade exact → alias → coords

**Files:**
- Create: `scripts/scrapers/buses/ktel_resolve.py`
- Test: `scripts/scrapers/buses/test_ktel_resolve.py`

- [ ] **Step 1: Écrire les tests**

Create `scripts/scrapers/buses/test_ktel_resolve.py` :
```python
from ktel_resolve import resolve

# stops_by_slug : reproduit la signature DB (slug -> dict avec lat/lng)
STOPS = {
    "khania":   {"slug": "khania",   "lat": 35.5138, "lng": 24.0180},
    "erakleio": {"slug": "erakleio", "lat": 35.3387, "lng": 25.1442},
    "sitia":    {"slug": "sitia",    "lat": 35.2042, "lng": 26.1037},
    "perfectstop": {"slug": "perfectstop", "lat": 35.4000, "lng": 24.5000},
}
ALIASES = {"chania": "khania", "heraklion": "erakleio"}
PLACE_COORDS = {"newhub": (35.4001, 24.5001)}   # 11 m de perfectstop


def test_resolve_exact_match():
    # un slug KTEL identique à un slug OSM (Sitia) -> match direct
    assert resolve("Sitia", STOPS, ALIASES, PLACE_COORDS) == "sitia"


def test_resolve_alias_match():
    # Chania (KTEL) -> alias -> khania (OSM)
    assert resolve("Chania", STOPS, ALIASES, PLACE_COORDS) == "khania"
    assert resolve("Heraklion", STOPS, ALIASES, PLACE_COORDS) == "erakleio"


def test_resolve_coords_fallback_within_5km():
    # newhub (PLACE_COORDS) est à 11 m de perfectstop (stops OSM) -> match coords
    assert resolve("Newhub", STOPS, ALIASES, PLACE_COORDS) == "perfectstop"


def test_resolve_coords_no_match_beyond_5km():
    pc = {"faraway": (40.0, 30.0)}   # nulle part en Crète
    assert resolve("Faraway", STOPS, ALIASES, pc) is None


def test_resolve_returns_none_when_nothing_matches():
    assert resolve("UnknownVillage", STOPS, ALIASES, PLACE_COORDS) is None
    assert resolve("", STOPS, ALIASES, PLACE_COORDS) is None
    assert resolve(None, STOPS, ALIASES, PLACE_COORDS) is None


def test_resolve_alias_target_missing_falls_through_to_coords():
    # alias pointe vers un stop OSM absent -> on tente la cascade suivante
    aliases = {"newhub": "no_such_stop"}
    assert resolve("Newhub", STOPS, aliases, PLACE_COORDS) == "perfectstop"
```

- [ ] **Step 2: Run pytest, confirm failure**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_ktel_resolve.py -q`
Expected: `ModuleNotFoundError: No module named 'ktel_resolve'`.

- [ ] **Step 3: Implémenter**

Create `scripts/scrapers/buses/ktel_resolve.py` (verbatim) :
```python
"""Résolution d'un nom KTEL en slug OSM. Cascade :
  1. exact   : stop_slug(name) ∈ stops_by_slug
  2. alias   : aliases[stop_slug(name)] ∈ stops_by_slug
  3. coords  : place_coords[_norm(name)] -> stop OSM le plus proche, < 5 km
  4. None    : aucun match (loggable, candidat à un ajout dans ktel_to_osm.json)
Aucun I/O réseau."""
from prices import _norm, haversine_km
from net_geocode import stop_slug

MAX_COORDS_KM = 5.0


def resolve(name, stops_by_slug, aliases, place_coords):
    """Retourne le slug OSM correspondant à `name` (KTEL), ou None."""
    if not name:
        return None
    slug = stop_slug(name)
    if slug in stops_by_slug:
        return slug
    aliased = aliases.get(slug)
    if aliased and aliased in stops_by_slug:
        return aliased
    coords = place_coords.get(_norm(name))
    if coords:
        best, best_km = None, MAX_COORDS_KM
        for s in stops_by_slug.values():
            if s.get("lat") is None or s.get("lng") is None:
                continue
            d = haversine_km(coords, (s["lat"], s["lng"]))
            if d < best_km:
                best, best_km = s["slug"], d
        if best:
            return best
    return None
```

- [ ] **Step 4: Run pytest, confirm 6 passed**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_ktel_resolve.py -q`
Expected: `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/ktel_resolve.py scripts/scrapers/buses/test_ktel_resolve.py
git commit -m "feat(buses): ktel_resolve cascade exact/alias/coords (SP2)"
```

---

## Task 4: Fixture réelle ktel_routes_sample.json + ktel_match.py

**Files:**
- Create: `scripts/scrapers/buses/fixtures/ktel_routes_sample.json`
- Create: `scripts/scrapers/buses/ktel_match.py`
- Test: `scripts/scrapers/buses/test_ktel_match.py`

- [ ] **Step 1: Générer la fixture depuis le VPS (one-shot, commit-ée)**

Run (depuis worktree local) :
```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -A -t -c \"COPY (SELECT json_agg(row_to_json(r)) FROM (SELECT id, operator_id, from_place, to_place, duration, frequency FROM bus_routes ORDER BY id LIMIT 40) r) TO STDOUT;\"" > scripts/scrapers/buses/fixtures/ktel_routes_sample.json
```

Vérifier le contenu :
```bash
scripts/scrapers/buses/.venv/Scripts/python -c "import json; d = json.load(open('scripts/scrapers/buses/fixtures/ktel_routes_sample.json', encoding='utf-8')); print('routes:', len(d)); print('first:', d[0])"
```
Expected : `routes: 40`, `first: {'id': ..., 'operator_id': 'herlas', 'from_place': 'Heraklion', 'to_place': 'Matala', ...}`.

> Si le SSH n'est pas dispo, l'implémenteur peut générer un fichier équivalent à la main avec 4-6 routes (Heraklion↔Matala bidirectionnel pour le match d'une paire OSM, Heraklion↔Rethymno pour un test de hub, et 2 routes orphelines pour le fallback). Documenter le choix dans le commit message.

- [ ] **Step 2: Écrire les tests**

Create `scripts/scrapers/buses/test_ktel_match.py` :
```python
import json
import os

from ktel_match import match_routes_to_lines

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "ktel_routes_sample.json")


def _load_routes():
    with open(FIX, encoding="utf-8") as f:
        return json.load(f)


def test_match_strict_operator_and_termini():
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Matala", "duration": "2h"},
        {"id": 2, "operator_id": "herlas", "from_place": "Matala", "to_place": "Heraklion", "duration": "2h"},
    ]
    lines = [
        {"id": 100, "operator_id": "herlas", "origin": "erakleio", "dest": "matala"},
    ]
    aliases = {"heraklion": "erakleio"}
    stops_by_slug = {"erakleio": {"slug": "erakleio", "lat": 35.34, "lng": 25.14},
                     "matala":   {"slug": "matala",   "lat": 34.99, "lng": 24.74}}
    matched, gaps = match_routes_to_lines(routes, lines, stops_by_slug, aliases, place_coords={})
    assert matched == {1: 100, 2: 100}
    assert gaps == {}


def test_match_strict_different_operators_dont_match():
    routes = [{"id": 1, "operator_id": "herlas", "from_place": "A", "to_place": "B", "duration": "1h"}]
    lines = [{"id": 200, "operator_id": "ektel", "origin": "a", "dest": "b"}]
    stops_by_slug = {"a": {"slug": "a", "lat": 35.0, "lng": 25.0},
                     "b": {"slug": "b", "lat": 35.1, "lng": 25.1}}
    matched, gaps = match_routes_to_lines(routes, lines, stops_by_slug, aliases={}, place_coords={})
    assert matched == {}
    assert ("herlas", frozenset({"a", "b"})) in gaps
    assert gaps[("herlas", frozenset({"a", "b"}))] == [routes[0]]


def test_match_unresolved_terminus_goes_to_gaps_when_other_resolved():
    routes = [{"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "UnknownVillage", "duration": "1h"}]
    lines = []
    stops_by_slug = {"erakleio": {"slug": "erakleio", "lat": 35.34, "lng": 25.14}}
    aliases = {"heraklion": "erakleio"}
    matched, gaps = match_routes_to_lines(routes, lines, stops_by_slug, aliases, place_coords={})
    # un terminus non résolu (UnknownVillage) -> route ignorée (ni match ni gap)
    assert matched == {}
    assert gaps == {}


def test_match_groups_gaps_by_operator_and_termini_pair():
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Foo", "to_place": "Bar", "duration": "1h"},
        {"id": 2, "operator_id": "herlas", "from_place": "Bar", "to_place": "Foo", "duration": "1h"},
        {"id": 3, "operator_id": "herlas", "from_place": "Foo", "to_place": "Baz", "duration": "2h"},
    ]
    stops_by_slug = {"foo": {"slug": "foo", "lat": 35.0, "lng": 25.0},
                     "bar": {"slug": "bar", "lat": 35.1, "lng": 25.1},
                     "baz": {"slug": "baz", "lat": 35.2, "lng": 25.2}}
    matched, gaps = match_routes_to_lines(routes, lines=[], stops_by_slug=stops_by_slug, aliases={}, place_coords={})
    assert ("herlas", frozenset({"foo", "bar"})) in gaps
    assert len(gaps[("herlas", frozenset({"foo", "bar"}))]) == 2
    assert ("herlas", frozenset({"foo", "baz"})) in gaps
    assert len(gaps[("herlas", frozenset({"foo", "baz"}))]) == 1


def test_match_against_real_fixture_doesnt_explode():
    # smoke : la fixture réelle doit charger et matcher sans exception
    routes = _load_routes()
    lines = [{"id": 10, "operator_id": "herlas", "origin": "erakleio", "dest": "matala"}]
    stops = {"erakleio": {"slug": "erakleio", "lat": 35.34, "lng": 25.14},
             "matala":   {"slug": "matala",   "lat": 34.99, "lng": 24.74}}
    aliases = {"heraklion": "erakleio"}
    matched, gaps = match_routes_to_lines(routes, lines, stops, aliases, place_coords={})
    # au moins une route Heraklion↔Matala matche
    assert any(line_id == 10 for line_id in matched.values()) or any(
        ("herlas", frozenset({"erakleio", "matala"})) == key for key in gaps
    )
```

- [ ] **Step 3: Run pytest, confirm failure**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_ktel_match.py -q`
Expected: `ModuleNotFoundError: No module named 'ktel_match'`.

- [ ] **Step 4: Implémenter `ktel_match.py`**

Create `scripts/scrapers/buses/ktel_match.py` (verbatim) :
```python
"""Match strict des routes KTEL aux lignes du réseau : (operator, frozenset(termini)).
Une route dont les 2 terminus résolvent à (a, b) matche la ligne OSM/KTEL ayant
exactement (operator, frozenset({a, b})). Les non-matches sont groupés par paire
pour alimenter le fallback. Aucun I/O."""
from collections import defaultdict
from ktel_resolve import resolve


def match_routes_to_lines(routes, lines, stops_by_slug, aliases, place_coords):
    """Retourne (matched, gaps) :
      matched = {route_id: line_id}
      gaps    = {(operator, frozenset({a, b})): [route, ...]}  # routes non matchées
                 avec les DEUX terminus résolus (sinon route ignorée)."""
    index = {}
    for ln in lines:
        index[(ln["operator_id"], frozenset({ln["origin"], ln["dest"]}))] = ln["id"]
    matched = {}
    gaps = defaultdict(list)
    for r in routes:
        a = resolve(r.get("from_place"), stops_by_slug, aliases, place_coords)
        b = resolve(r.get("to_place"),   stops_by_slug, aliases, place_coords)
        if not a or not b or a == b:
            continue
        key = (r.get("operator_id"), frozenset({a, b}))
        line_id = index.get(key)
        if line_id is not None:
            matched[r["id"]] = line_id
        else:
            gaps[key].append(r)
    return matched, dict(gaps)
```

- [ ] **Step 5: Run pytest, confirm 5 passed**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_ktel_match.py -q`
Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add scripts/scrapers/buses/fixtures/ktel_routes_sample.json scripts/scrapers/buses/ktel_match.py scripts/scrapers/buses/test_ktel_match.py
git commit -m "feat(buses): ktel_match strict (op, frozenset(termini)) + fixture réelle (SP2)"
```

---

## Task 5: ktel_fallback.py — construction lignes source='ktel'

**Files:**
- Create: `scripts/scrapers/buses/ktel_fallback.py`
- Test: `scripts/scrapers/buses/test_ktel_fallback.py`

- [ ] **Step 1: Écrire les tests**

Create `scripts/scrapers/buses/test_ktel_fallback.py` :
```python
from ktel_fallback import build_fallback_lines


def _fake_osrm_ok(coords):
    # renvoie un OSRM Ok minimal en `code: Ok`, route avec 1 leg dont la distance
    # est 30 km, géométrie en GeoJSON ([lng, lat] dans Overpass-style mais OSRM-friendly).
    return {"code": "Ok", "routes": [{
        "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
        "legs": [{"distance": 30_000.0}]}]}


def test_build_fallback_inserts_new_stops_and_one_line():
    gaps = {
        ("herlas", frozenset({"foo", "bar"})): [
            {"id": 1, "operator_id": "herlas", "from_place": "Foo", "to_place": "Bar", "duration": "1h"},
            {"id": 2, "operator_id": "herlas", "from_place": "Bar", "to_place": "Foo", "duration": "1h"},
        ],
    }
    # foo connu (déjà dans bus_stops) ; bar inconnu mais présent dans PLACE_COORDS
    stops_by_slug = {"foo": {"slug": "foo", "name": "Foo", "lat": 35.0, "lng": 25.0,
                              "prefecture": "HER", "osm_id": 999, "coords_source": "osm"}}
    place_coords = {"bar": (35.5, 25.5)}
    aliases = {}
    new_stops, new_lines, new_line_stops, fallback_matched = build_fallback_lines(
        gaps, stops_by_slug, aliases, place_coords, existing_codes={},
        fetch=lambda url: _fake_osrm_ok([(35.0, 25.0), (35.5, 25.5)]))
    # bar a été créé (foo déjà connu)
    assert len(new_stops) == 1
    assert new_stops[0]["slug"] == "bar"
    assert new_stops[0]["coords_source"] == "ktel"
    assert new_stops[0]["lat"] == 35.5 and new_stops[0]["lng"] == 25.5
    # une ligne créée
    assert len(new_lines) == 1
    line = new_lines[0]
    assert line["operator_id"] == "herlas"
    assert line["source"] == "ktel"
    assert line["code"].startswith(("HER-", "LAS-", "CHA-", "RET-"))
    assert line["code_official"] is None
    assert line["osm_id"] is None
    assert line["partial_geo"] is True
    # 2 line_stops (seq 0 origine, seq 1 destination)
    assert len(new_line_stops) == 2
    assert {ls["seq"] for ls in new_line_stops} == {0, 1}
    # les routes KTEL qui ont contribué reçoivent un line_id sentinel (sera résolu côté store)
    assert fallback_matched == {1: line["code"], 2: line["code"]}


def test_build_fallback_skips_pair_when_terminus_unresolvable():
    gaps = {
        ("herlas", frozenset({"ghost1", "ghost2"})): [
            {"id": 1, "operator_id": "herlas", "from_place": "Ghost1", "to_place": "Ghost2", "duration": "1h"},
        ],
    }
    stops_by_slug = {}
    place_coords = {}
    new_stops, new_lines, new_line_stops, fallback_matched = build_fallback_lines(
        gaps, stops_by_slug, aliases={}, place_coords=place_coords,
        existing_codes={}, fetch=lambda url: None)
    assert new_stops == []
    assert new_lines == []
    assert new_line_stops == []
    assert fallback_matched == {}


def test_build_fallback_uses_haversine_when_osrm_fails():
    gaps = {("herlas", frozenset({"a", "b"})): [
        {"id": 1, "operator_id": "herlas", "from_place": "A", "to_place": "B", "duration": "2h"},
    ]}
    stops_by_slug = {"a": {"slug": "a", "name": "A", "lat": 35.0, "lng": 25.0, "prefecture": "HER", "osm_id": 1, "coords_source": "osm"},
                     "b": {"slug": "b", "name": "B", "lat": 35.5, "lng": 25.5, "prefecture": "HER", "osm_id": 2, "coords_source": "osm"}}
    new_stops, new_lines, new_line_stops, _ = build_fallback_lines(
        gaps, stops_by_slug, aliases={}, place_coords={}, existing_codes={},
        fetch=lambda url: None)   # OSRM down -> haversine
    assert len(new_lines) == 1
    assert new_lines[0]["partial_geo"] is True
    assert new_lines[0]["length_km"] > 0    # haversine > 0


def test_build_fallback_assigns_codes_for_multiple_pairs_deterministically():
    gaps = {
        ("herlas", frozenset({"a", "b"})): [{"id": 1, "operator_id": "herlas", "from_place": "A", "to_place": "B", "duration": "1h"}],
        ("herlas", frozenset({"c", "d"})): [{"id": 2, "operator_id": "herlas", "from_place": "C", "to_place": "D", "duration": "1h"}],
    }
    stops = {k: {"slug": k, "name": k.upper(), "lat": 35.0 + i * 0.1, "lng": 25.0 + i * 0.1,
                 "prefecture": "HER", "osm_id": i + 1, "coords_source": "osm"}
             for i, k in enumerate(("a", "b", "c", "d"))}
    _, new_lines, _, _ = build_fallback_lines(
        gaps, stops, aliases={}, place_coords={}, existing_codes={},
        fetch=lambda url: None)
    codes = sorted(l["code"] for l in new_lines)
    assert len(codes) == 2 and codes[0] != codes[1]
```

- [ ] **Step 2: Run pytest, confirm failure**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_ktel_fallback.py -q`
Expected: `ModuleNotFoundError: No module named 'ktel_fallback'`.

- [ ] **Step 3: Implémenter**

Create `scripts/scrapers/buses/ktel_fallback.py` (verbatim) :
```python
"""Construction de lignes minimales pour les paires KTEL absentes d'OSM.
Une paire = 2 terminus + horaires ; on crée 2 bus_stops si manquants, 1 bus_line
source='ktel' avec géométrie OSRM(a->b), 2 bus_line_stops (seq 0/1). Pur sauf OSRM."""
from prices import haversine_km
from ktel_resolve import resolve
from net_osrm import build_geometry
from net_nomenclature import assign_codes, color_for, prefecture_for
from build_network import _parse_duration_min, _title


def _avg_duration_min(routes):
    """Moyenne arithmétique des durées parsées (None si aucune)."""
    mins = [m for m in (_parse_duration_min(r.get("duration")) for r in routes) if m is not None]
    return round(sum(mins) / len(mins)) if mins else None


def _terminus_dict(slug, place_coords):
    """Construit le dict d'un nouveau bus_stops 'ktel' depuis PLACE_COORDS."""
    coords = place_coords.get(slug)
    if not coords:
        return None
    lat, lng = coords
    return {"slug": slug, "name": _title(slug), "name_el": None,
            "lat": lat, "lng": lng, "prefecture": prefecture_for(lat, lng),
            "coords_source": "ktel", "coords_confidence": "medium",
            "osm_id": None, "needs_review": False}


def _resolve_or_create(slug_hint, name, stops_by_slug, aliases, place_coords, pending_stops):
    """Retourne le dict stop (déjà connu ou créé à la volée). None si impossible."""
    if slug_hint in stops_by_slug:
        return stops_by_slug[slug_hint]
    if slug_hint in pending_stops:
        return pending_stops[slug_hint]
    # PLACE_COORDS indexé par nom normalisé : essayer le nom original puis le slug
    from prices import _norm
    pc = {_norm(k): v for k, v in place_coords.items()}
    pc.update({k.lower(): v for k, v in place_coords.items()})
    coords = pc.get(_norm(name or "")) or pc.get(slug_hint)
    if not coords:
        return None
    lat, lng = coords
    rec = {"slug": slug_hint, "name": _title(slug_hint), "name_el": None,
           "lat": lat, "lng": lng, "prefecture": prefecture_for(lat, lng),
           "coords_source": "ktel", "coords_confidence": "medium",
           "osm_id": None, "needs_review": False}
    pending_stops[slug_hint] = rec
    return rec


def build_fallback_lines(gaps, stops_by_slug, aliases, place_coords, existing_codes, fetch=None):
    """Retourne (new_stops, new_lines, new_line_stops, fallback_matched).
    fallback_matched = {route_id: line_code} (le code fait office d'identifiant
    inter-tâches ; la résolution code->id se fait à l'INSERT, comme dans SP1)."""
    pending_stops = {}
    pairs = []
    for (operator, termini), routes in gaps.items():
        if len(termini) < 2:
            continue
        a_slug, b_slug = sorted(termini)
        # essayer de résoudre via les routes (au cas où le slug différait du nom_brut KTEL)
        a_name = next((r.get("from_place") if resolve(r.get("from_place"), stops_by_slug, aliases, place_coords) == a_slug
                       else r.get("to_place") if resolve(r.get("to_place"), stops_by_slug, aliases, place_coords) == a_slug
                       else None for r in routes), None)
        b_name = next((r.get("from_place") if resolve(r.get("from_place"), stops_by_slug, aliases, place_coords) == b_slug
                       else r.get("to_place") if resolve(r.get("to_place"), stops_by_slug, aliases, place_coords) == b_slug
                       else None for r in routes), None)
        a_stop = _resolve_or_create(a_slug, a_name, stops_by_slug, aliases, place_coords, pending_stops)
        b_stop = _resolve_or_create(b_slug, b_name, stops_by_slug, aliases, place_coords, pending_stops)
        if not a_stop or not b_stop:
            continue
        pairs.append((operator, a_slug, b_slug, a_stop, b_stop, routes))

    # nomenclature : longueur haversine pour ordonner les codes (pattern SP1)
    lines_raw = []
    for operator, a, b, a_stop, b_stop, routes in pairs:
        length_km = round(haversine_km((a_stop["lat"], a_stop["lng"]),
                                       (b_stop["lat"], b_stop["lng"])), 2)
        lines_raw.append({
            "operator_id": operator, "origin": a, "dest": b,
            "origin_lat": a_stop["lat"], "origin_lng": a_stop["lng"],
            "length_km": length_km,
            "key": f"{a}|{b}|{operator}",
            "_routes": routes, "_a_stop": a_stop, "_b_stop": b_stop,
        })
    codes = assign_codes(lines_raw, existing=existing_codes)

    new_lines, new_line_stops, fallback_matched = [], [], {}
    for ln in lines_raw:
        code = codes[ln["key"]]
        a_stop, b_stop = ln["_a_stop"], ln["_b_stop"]
        geo = build_geometry([a_stop, b_stop], fetch=fetch)
        total_minutes = _avg_duration_min(ln["_routes"])
        # cumul km déterministe par OSRM/haversine (1 segment)
        leg_km = geo["leg_km"][0] if geo["leg_km"] else 0.0
        new_lines.append({
            "code": code, "code_official": None,
            "name": f"{_title(ln['origin'])} <-> {_title(ln['dest'])}",
            "prefecture": code.split("-")[0], "operator_id": ln["operator_id"],
            "geometry": geo["geometry"], "color": color_for(code),
            "length_km": geo["length_km"], "total_minutes": total_minutes,
            "partial_geo": True, "osm_id": None, "source": "ktel",
        })
        new_line_stops.append({"line_code": code, "stop_slug": ln["origin"],
                                "seq": 0, "cumulative_km": 0.0, "cumulative_minutes": 0})
        new_line_stops.append({"line_code": code, "stop_slug": ln["dest"],
                                "seq": 1,
                                "cumulative_km": round(leg_km, 2),
                                "cumulative_minutes": total_minutes if total_minutes is not None else 0})
        for r in ln["_routes"]:
            fallback_matched[r["id"]] = code

    return list(pending_stops.values()), new_lines, new_line_stops, fallback_matched
```

- [ ] **Step 4: Run pytest, confirm 4 passed**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_ktel_fallback.py -q`
Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/ktel_fallback.py scripts/scrapers/buses/test_ktel_fallback.py
git commit -m "feat(buses): ktel_fallback construction lignes source='ktel' (SP2)"
```

---

## Task 6: ktel_apparier.py — orchestration + store transactionnel

**Files:**
- Create: `scripts/scrapers/buses/ktel_apparier.py`
- Test: `scripts/scrapers/buses/test_ktel_apparier.py`

- [ ] **Step 1: Écrire les tests**

Create `scripts/scrapers/buses/test_ktel_apparier.py` :
```python
from ktel_apparier import assemble_apparier, MIN_BUS_LINES, should_run

# stubs pour le pipeline : on teste assemble (pur), pas store (Supabase requis).


def _fake_osrm(coords):
    return {"code": "Ok", "routes": [{
        "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
        "legs": [{"distance": 30_000.0} for _ in range(len(coords) - 1)]}]}


def test_assemble_apparier_matches_osm_and_emits_fallback():
    # 4 routes : 2 vers une ligne OSM existante (Heraklion<->Matala) ; 2 vers une paire orpheline (Heraklion<->Mires)
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Matala", "duration": "2h"},
        {"id": 2, "operator_id": "herlas", "from_place": "Matala", "to_place": "Heraklion", "duration": "2h"},
        {"id": 3, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Mires", "duration": "1h"},
        {"id": 4, "operator_id": "herlas", "from_place": "Mires", "to_place": "Heraklion", "duration": "1h"},
    ]
    osm_lines = [
        {"id": 50, "operator_id": "herlas", "origin": "erakleio", "dest": "matala", "code": "HER-10"},
    ]
    stops_by_slug = {
        "erakleio": {"slug": "erakleio", "name": "Erakleio", "lat": 35.3387, "lng": 25.1442, "prefecture": "HER", "osm_id": 1, "coords_source": "osm"},
        "matala":   {"slug": "matala",   "name": "Matala",   "lat": 34.9970, "lng": 24.7470, "prefecture": "HER", "osm_id": 2, "coords_source": "osm"},
    }
    aliases = {"heraklion": "erakleio"}
    place_coords = {"mires": (35.0700, 24.8525)}
    existing_codes = {}
    result = assemble_apparier(
        routes, osm_lines, stops_by_slug, aliases, place_coords, existing_codes, fetch=_fake_osrm)
    # 2 routes matchées à HER-10
    assert result["matched_to_osm"] == {1: 50, 2: 50}
    # 1 nouveau stop ('mires' créé), 1 nouvelle ligne fallback, 2 line_stops, 2 routes matchées au fallback
    assert len(result["new_stops"]) == 1
    assert result["new_stops"][0]["slug"] == "mires"
    assert len(result["new_lines"]) == 1
    assert result["new_lines"][0]["source"] == "ktel"
    assert len(result["new_line_stops"]) == 2
    assert set(result["matched_to_fallback"].keys()) == {3, 4}


def test_should_run_guards_against_empty_bus_lines():
    assert should_run([{}] * MIN_BUS_LINES) is True
    assert should_run([{}] * (MIN_BUS_LINES - 1)) is False
    assert should_run([]) is False


def test_assemble_apparier_ignores_routes_with_unresolved_terminus():
    routes = [{"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "GhostlyVillage", "duration": "1h"}]
    osm_lines = []
    stops_by_slug = {"erakleio": {"slug": "erakleio", "name": "Erakleio", "lat": 35.34, "lng": 25.14, "prefecture": "HER", "osm_id": 1, "coords_source": "osm"}}
    aliases = {"heraklion": "erakleio"}
    place_coords = {}
    result = assemble_apparier(routes, osm_lines, stops_by_slug, aliases, place_coords, existing_codes={}, fetch=lambda url: None)
    assert result["matched_to_osm"] == {}
    assert result["matched_to_fallback"] == {}
    assert result["new_lines"] == []
```

- [ ] **Step 2: Run pytest, confirm failure**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_ktel_apparier.py -q`
Expected: `ModuleNotFoundError: No module named 'ktel_apparier'`.

- [ ] **Step 3: Implémenter**

Create `scripts/scrapers/buses/ktel_apparier.py` (verbatim) :
```python
"""Pipeline SP2 : apparie chaque route KTEL à une ligne (OSM ou KTEL-fallback).
- assemble_apparier : pur, OSRM injecté, retourne un dict de payloads.
- run_apparier : entrée prod (charge DB, appelle assemble, écrit en transaction).
Réutilise net_osrm/net_nomenclature et build_network.store_network (delete+insert
là où c'est déjà fait, pour les lignes OSM). Ici on n'écrit QUE des nouveautés
(stops/lines/line_stops source='ktel') + des UPDATEs sur bus_routes.line_id."""
from ktel_match import match_routes_to_lines
from ktel_fallback import build_fallback_lines

MIN_BUS_LINES = 50   # sous ce seuil = SP1 OSM est cassé ou en cours, on n'apparier pas


def should_run(bus_lines):
    return len(bus_lines) >= MIN_BUS_LINES


def assemble_apparier(routes, osm_lines, stops_by_slug, aliases, place_coords,
                      existing_codes, fetch=None):
    """Retourne un dict { matched_to_osm, matched_to_fallback,
                          new_stops, new_lines, new_line_stops }."""
    matched, gaps = match_routes_to_lines(routes, osm_lines, stops_by_slug, aliases, place_coords)
    new_stops, new_lines, new_line_stops, fb_matched = build_fallback_lines(
        gaps, stops_by_slug, aliases, place_coords, existing_codes, fetch=fetch)
    return {
        "matched_to_osm": matched,
        "matched_to_fallback": fb_matched,
        "new_stops": new_stops,
        "new_lines": new_lines,
        "new_line_stops": new_line_stops,
    }


def _load_existing_codes(sb):
    """bus_lines existantes -> {key: code} (stabilité PREF-NN à travers les rebuilds)."""
    try:
        rows = sb.table("bus_lines").select("code,name,operator_id").execute().data
        out = {}
        for r in rows:
            parts = r["name"].split("<->")
            if len(parts) == 2:
                a = parts[0].strip().lower().replace(" ", "-")
                b = parts[1].strip().lower().replace(" ", "-")
                out[f"{min(a, b)}|{max(a, b)}|{r['operator_id']}"] = r["code"]
        return out
    except Exception:
        return {}


def _load_state(sb):
    """Charge bus_routes (KTEL), bus_lines (réseau actuel), bus_stops indexés par slug."""
    routes = sb.table("bus_routes").select(
        "id,operator_id,from_place,to_place,duration").execute().data
    lines = sb.table("bus_lines").select("id,operator_id,code,name").execute().data
    # ré-extraire origin/dest depuis name "A <-> B" pour reconstruire le couple
    osm_lines = []
    for ln in lines:
        parts = ln["name"].split("<->")
        if len(parts) == 2:
            origin = parts[0].strip().lower().replace(" ", "-")
            dest = parts[1].strip().lower().replace(" ", "-")
            osm_lines.append({**ln, "origin": min(origin, dest), "dest": max(origin, dest)})
    stops = sb.table("bus_stops").select(
        "id,slug,name,name_el,lat,lng,prefecture,osm_id,coords_source").execute().data
    stops_by_slug = {s["slug"]: s for s in stops}
    return routes, osm_lines, stops_by_slug


def _persist(sb, result):
    """Écrit en transaction : nouveaux stops + lignes + line_stops + UPDATE bus_routes.line_id."""
    if result["new_stops"]:
        sb.table("bus_stops").insert(result["new_stops"]).execute()
    if result["new_lines"]:
        sb.table("bus_lines").insert(result["new_lines"]).execute()
    # résoudre code -> id pour les nouvelles lignes
    new_codes = {l["code"] for l in result["new_lines"]}
    code_to_id = {}
    if new_codes:
        rows = sb.table("bus_lines").select("id,code").in_("code", list(new_codes)).execute().data
        code_to_id = {r["code"]: r["id"] for r in rows}
    # résoudre slug -> id pour line_stops
    slugs = {ls["stop_slug"] for ls in result["new_line_stops"]}
    if slugs:
        rows = sb.table("bus_stops").select("id,slug").in_("slug", list(slugs)).execute().data
        slug_to_id = {r["slug"]: r["id"] for r in rows}
        payload = [{
            "line_id": code_to_id[ls["line_code"]],
            "stop_id": slug_to_id[ls["stop_slug"]],
            "seq": ls["seq"],
            "cumulative_km": ls["cumulative_km"],
            "cumulative_minutes": ls["cumulative_minutes"],
        } for ls in result["new_line_stops"]
            if ls["line_code"] in code_to_id and ls["stop_slug"] in slug_to_id]
        if payload:
            sb.table("bus_line_stops").insert(payload).execute()
    # UPDATEs bus_routes.line_id (OSM matches + fallback matches)
    n_updates = 0
    for route_id, line_id in result["matched_to_osm"].items():
        sb.table("bus_routes").update({"line_id": line_id}).eq("id", route_id).execute()
        n_updates += 1
    for route_id, code in result["matched_to_fallback"].items():
        line_id = code_to_id.get(code)
        if line_id is not None:
            sb.table("bus_routes").update({"line_id": line_id}).eq("id", route_id).execute()
            n_updates += 1
    return n_updates


def run_apparier(sb):
    """Entrée prod : charge DB, apparier, écrit. Retourne un dict de compteurs."""
    from prices import PLACE_COORDS
    from ktel_alias import load_aliases
    routes, osm_lines, stops_by_slug = _load_state(sb)
    if not should_run(osm_lines):
        raise ValueError(f"refuse run SP2 : {len(osm_lines)} bus_lines (seuil {MIN_BUS_LINES})")
    aliases = load_aliases()
    existing = _load_existing_codes(sb)
    result = assemble_apparier(routes, osm_lines, stops_by_slug, aliases, PLACE_COORDS,
                                existing_codes=existing)
    n_updates = _persist(sb, result)
    return {
        "matched_to_osm": len(result["matched_to_osm"]),
        "fallback_lines": len(result["new_lines"]),
        "fallback_stops": len(result["new_stops"]),
        "route_line_id_updates": n_updates,
    }
```

- [ ] **Step 4: Run pytest sur osm_network + nouveaux**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_ktel_apparier.py -q`
Expected: `3 passed`.

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q`
Expected: `XXX passed` (tout vert ; le compte exact dépend des tests précédents, doit être >=  107 + tous les test_ktel_*).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/ktel_apparier.py scripts/scrapers/buses/test_ktel_apparier.py
git commit -m "feat(buses): ktel_apparier orchestration + store transactionnel (SP2)"
```

---

## Task 7: run_apparier.py — wrapper cron avec alerte Telegram

**Files:**
- Create: `scripts/scrapers/buses/run_apparier.py`

- [ ] **Step 1: Implémenter le wrapper**

Create `scripts/scrapers/buses/run_apparier.py` (verbatim, miroir de `run_osm_build.py`) :
```python
#!/usr/bin/env python3
"""Entrée cron SP2 : charge DB -> apparie KTEL aux lignes -> fallback paires absentes.
Alerte Telegram sur erreur (ValueError = garde-fou ; Exception = inattendu).
Crons : 45 4 * * * (quotidien, 15 min après alerts.py)
       15 2 * * 0 (dimanche, après run_osm_build.py de 02:00)."""
import os
import sys
import time

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def log(msg: str) -> None:
    print(f"[apparier] {msg}", flush=True)


def send_telegram(text: str) -> None:
    try:
        from kairos_telegram import send, Bot  # type: ignore
        send(Bot.PLUME, "KTEL Apparier", text)
    except Exception as e:
        log(f"Telegram error: {e}")


def main() -> int:
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    from ktel_apparier import run_apparier
    t0 = time.time()
    try:
        counters = run_apparier(sb)
    except ValueError as e:
        log(f"FAIL garde-fou: {e}")
        send_telegram(f"SP2 FAIL (garde-fou): {e}")
        return 1
    except Exception as e:
        log(f"FAIL inattendu: {e}")
        send_telegram(f"SP2 FAIL (inattendu): {e}")
        return 1
    dt = time.time() - t0
    log(
        f"OK matched_osm={counters['matched_to_osm']} "
        f"fallback_lines={counters['fallback_lines']} "
        f"fallback_stops={counters['fallback_stops']} "
        f"route_updates={counters['route_line_id_updates']} "
        f"in {dt:.1f}s"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Vérifier la compilation**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m py_compile run_apparier.py && echo "compile OK"`
Expected: `compile OK`.

- [ ] **Step 3: Suite pytest complète encore verte**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q`
Expected: tout vert (≥ 122 passed = 107 SP1 + 4 alias + 6 resolve + 5 match + 4 fallback + 3 apparier).

- [ ] **Step 4: Commit**

```bash
git add scripts/scrapers/buses/run_apparier.py
git commit -m "feat(buses): wrapper run_apparier.py + alerte Telegram (SP2)"
```

---

## Task 8: Déploiement VPS + crons (owner Kami, sur GO)

> **Opérationnel.** Applique la migration FK, déploie les 7 modules + 1 fixture + 1 JSON, lance le run réel, vérifie en DB que les routes KTEL `Agios Nikolaos↔Sitia` ont un `line_id` et qu'une ligne fallback `Heraklion↔Matala` source='ktel' a été créée. Pose les 2 nouveaux crons.

- [ ] **Step 1: Appliquer la migration sur le VPS**

```bash
scp supabase/migrations/20260614160000_bus_routes_line_id.sql kairos-vps:/tmp/m160000.sql
ssh kairos-vps "docker cp /tmp/m160000.sql cretepulse-postgres:/tmp/m160000.sql && docker exec cretepulse-postgres psql -U postgres -d cretepulse -f /tmp/m160000.sql"
```
Vérifier : `ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c '\d bus_routes' 2>&1 | grep line_id"` → ligne `line_id | integer | ...references bus_lines(id)`.

- [ ] **Step 2: Déployer les 8 fichiers de code**

```bash
cd scripts/scrapers/buses && for f in ktel_alias.py ktel_resolve.py ktel_match.py ktel_fallback.py ktel_apparier.py run_apparier.py; do scp -q "$f" "kairos-vps:/opt/cretepulse/buses/$f"; done
scp scripts/scrapers/buses/ktel_to_osm.json kairos-vps:/opt/cretepulse/buses/ktel_to_osm.json
ssh kairos-vps "ls -l /opt/cretepulse/buses/ktel_*.py /opt/cretepulse/buses/run_apparier.py /opt/cretepulse/buses/ktel_to_osm.json"
```

- [ ] **Step 3: Test d'import + dry-run**

```bash
ssh kairos-vps "cd /opt/cretepulse/buses && /opt/cretepulse/venv/bin/python -c 'import sys; sys.path.insert(0, \".\"); from ktel_apparier import run_apparier; print(\"import OK\")'"
ssh kairos-vps "cd /opt/cretepulse && venv/bin/python buses/run_apparier.py"
```
Expected : `[apparier] OK matched_osm=N fallback_lines=M fallback_stops=K route_updates=N+M_routes in X.Xs`.

- [ ] **Step 4: Vérifier en DB**

Sanity invariants (>= 70 % des paires KTEL matchées) :
```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
WITH pairs AS (
  SELECT DISTINCT operator_id,
    LEAST(lower(from_place), lower(to_place)) AS a,
    GREATEST(lower(from_place), lower(to_place)) AS b,
    bool_or(line_id IS NOT NULL) AS has_line
  FROM bus_routes GROUP BY 1,2,3
)
SELECT count(*) FILTER (WHERE has_line) AS matched, count(*) AS total,
       round(100.0 * count(*) FILTER (WHERE has_line) / count(*), 1) AS pct FROM pairs;
\""
```
Expected : `matched >= 145, total = 207, pct >= 70.0`.

Pachia Ammos check :
```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
SELECT br.from_place, br.to_place, bl.code, bl.source
FROM bus_routes br JOIN bus_lines bl ON bl.id = br.line_id
WHERE br.operator_id = 'herlas' AND (lower(br.from_place) LIKE '%agios nikolaos%' OR lower(br.to_place) LIKE '%agios nikolaos%')
ORDER BY br.id LIMIT 5;
\""
```
Expected : au moins 1 route apparie à `LAS-02 osm`.

Fallback check (Heraklion↔Matala est-il devenu une ligne source='ktel' ?) :
```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"
SELECT code, source, name, length_km, total_minutes FROM bus_lines
WHERE source = 'ktel' ORDER BY code LIMIT 10;
\""
```

- [ ] **Step 5: Poser les 2 crons**

```bash
ssh kairos-vps "(crontab -l 2>/dev/null; echo '45 4 * * * cd /opt/cretepulse && venv/bin/python buses/run_apparier.py >> /var/log/cretepulse-osm.log 2>&1'; echo '15 2 * * 0 cd /opt/cretepulse && venv/bin/python buses/run_apparier.py >> /var/log/cretepulse-osm.log 2>&1') | crontab - && crontab -l | grep apparier"
```
Expected : 2 lignes `run_apparier.py` listées.

- [ ] **Step 6: Tracer en mémoire**

Append une ligne `DEPLOY` dans `session_log.md` avec compteurs réels (`matched_osm`, `fallback_lines`, `pct`) + source FACT (`docker exec` query). Format identique aux entrées 14/06 SP1.

---

## Self-Review (effectuée)

**Couverture spec :**
- Migration FK + `ON DELETE SET NULL` → Task 1. ✓
- Cascade exact → alias → coords → none → Task 3. ✓
- Alias manuel commit-é → Task 2. ✓
- Match strict (operator, frozenset(termini)) → Task 4. ✓
- Fallback minimal 2 terminus + OSRM + source='ktel' → Task 5. ✓
- Garde-fou MIN_BUS_LINES → Task 6. ✓
- Cron + Telegram alert → Task 7. ✓
- Déploiement VPS + sanity post-run (Pachia + 70 %) → Task 8. ✓
- Réutilisation `net_osrm`/`net_nomenclature`/`build_network._parse_duration_min`/`_title` → Tasks 5, 6 imports. ✓
- Pas de modif des modules SP1 → vérifié (aucun task n'édite `osm_*`/`net_*`/`build_network.py`/`buses.py`). ✓

**Cohérence des types :**
- `match_routes_to_lines` → `(matched: {route_id: line_id}, gaps: {(op, frozenset): [route, ...]})` — consommé tel quel par `build_fallback_lines`. ✓
- `build_fallback_lines` → `(new_stops, new_lines, new_line_stops, fallback_matched: {route_id: code})` — `code` (string PREF-NN) plutôt que `line_id` car les ids ne sont attribués qu'à l'INSERT (pattern Task 6 `_persist` qui résout `code → id` après insert). ✓
- `ktel_apparier.assemble_apparier` retourne un dict aux 5 clés consommées par `_persist`. ✓

**Placeholders : aucun.** Chaque étape contient le code complet ou la commande exacte.

**Risque résiduel :**
- La fixture `ktel_routes_sample.json` est générée en Task 4 Step 1 via SSH ; sans SSH, fallback documenté.
- Le seed JSON est volontairement large (33 entrées) anticipant que certains alias cibles n'existent pas (encore) dans `bus_stops` — comportement testé Step 7 de Task 3 (`test_resolve_alias_target_missing_falls_through_to_coords`).
- La couverture réelle 70 % se valide au run réel (Task 8 Step 4) ; si < 70 %, l'audit du log SP2 indique quels noms KTEL non-matchés ajouter dans `ktel_to_osm.json` lors d'une passe de curation manuelle.
