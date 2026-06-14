# Réseau bus OSM — SP1 : ingestion OpenStreetMap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Peupler `bus_stops` / `bus_lines` / `bus_line_stops` depuis OpenStreetMap (toute la Crète) : tous les arrêts physiques géolocalisés, toutes les lignes OSM avec leurs séquences d'arrêts ordonnées, codes officiels, tracés OSRM et profil de temps — pour que `Agios Nikolaos↔Sitia` contienne enfin Pachia Ammos.

**Architecture:** Nouveau pipeline `osm_network.py` (+ sous-modules plats) qui remplace `build_network.py` (titres KTEL) comme builder primaire. Fetch Overpass (retry/miroir/cache) → parse (arrêts translittérés + relations dédupliquées) → fusion aller/retour → codes (officiel `ref` sinon PREF-NN) → géométrie OSRM + profil de temps (briques réutilisées de Plan 1) → store transactionnel avec garde-fou. Coordonnées fournies par OSM → **plus de géocodage**.

**Tech Stack:** Python 3 (venv `scripts/scrapers/buses/.venv`), `unidecode` (translittération grec→latin), `requests` (Overpass, lazy), Postgres/PostgREST, pytest. Réutilise `net_osrm`, `net_timeprofile`, `net_nomenclature`, `store`.

**Spec :** `docs/superpowers/specs/2026-06-14-osm-bus-network-ingestion-design.md`

**Périmètre :** SP1 = ingestion OSM seule. SP2 (horaires KTEL + fallback), SP3 (moteur live), SP4 (carte) suivent. Pas de déploiement avant SP2 (sinon régression des lignes KTEL non-OSM).

**Fixture committée :** `scripts/scrapers/buses/fixtures/osm_agnik_sitia.json` (réponse Overpass réelle : relations 12320727 Agios Nikolaos→Sitia + 12325536 retour + 59 nodes).

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `requirements.txt` | + `unidecode` |
| `supabase/migrations/20260614140000_bus_network_osm.sql` | colonnes `osm_id`, `code_official`, `source` |
| `scripts/scrapers/buses/osm_parse.py` | translittération, parse arrêts, parse relation (dédup platform/stop), normalisation opérateur |
| `scripts/scrapers/buses/osm_lines.py` | fusion des relations en lignes (aller/retour, variantes) |
| `scripts/scrapers/buses/osm_fetch.py` | fetch Overpass (retry + miroir, `fetch` injecté) |
| `scripts/scrapers/buses/osm_network.py` | assemblage (pur, OSRM injecté) + store + entrée |
| `scripts/scrapers/buses/buses.py` | retrait de l'appel `build_network` |
| `scripts/scrapers/buses/test_osm_*.py` | tests pytest |

**Conventions :** imports plats (CWD `scripts/scrapers/buses`), tests `.venv/Scripts/python -m pytest`. Git author `kerjeanfrancois29`, stage explicite, pas de push. Worktree `C:/Users/fkerj/cretepulse-bus-network` branche `feat/bus-network`.

---

## Task 1: Dépendance unidecode + migration SQL

**Files:**
- Modify: `scripts/scrapers/buses/requirements.txt`
- Create: `supabase/migrations/20260614140000_bus_network_osm.sql`

- [ ] **Step 1: Ajouter unidecode aux requirements et l'installer dans le venv**

Ajouter la ligne `unidecode` à `scripts/scrapers/buses/requirements.txt` (à la fin).
Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pip install -q unidecode && .venv/Scripts/python -c "from unidecode import unidecode; print(unidecode('Παχειά Άμμος'))"`
Expected: une chaîne ASCII non vide (p. ex. `Pacheia Ammos`). **Noter la sortie exacte** — elle sert à calibrer les tests de translittération.

- [ ] **Step 2: Écrire la migration**

Create `supabase/migrations/20260614140000_bus_network_osm.sql`:
```sql
-- Réseau bus depuis OpenStreetMap : origine OSM + code officiel + source.
alter table bus_stops add column if not exists osm_id bigint;
alter table bus_lines add column if not exists osm_id bigint;
alter table bus_lines add column if not exists code_official text;
alter table bus_lines add column if not exists source text not null default 'osm';
notify pgrst, 'reload schema';
```

Valider le parse : `cd /c/Users/fkerj/cretepulse-bus-network && scripts/scrapers/buses/.venv/Scripts/python -c "import pathlib;s=pathlib.Path('supabase/migrations/20260614140000_bus_network_osm.sql').read_text(encoding='utf-8');assert 'code_official' in s and 'osm_id' in s;print('OK')"`

- [ ] **Step 3: Commit**
```bash
git add scripts/scrapers/buses/requirements.txt supabase/migrations/20260614140000_bus_network_osm.sql
git commit -m "feat(buses): dépendance unidecode + migration colonnes OSM"
```

---

## Task 2: osm_parse.py — translittération + normalisation opérateur

**Files:**
- Create: `scripts/scrapers/buses/osm_parse.py`
- Test: `scripts/scrapers/buses/test_osm_parse.py`

- [ ] **Step 1: Écrire les tests**
```python
from osm_parse import transliterate, normalize_operator

def test_transliterate_prefers_name_en():
    assert transliterate("Παχειά Άμμος", "Pachia Ammos") == "Pachia Ammos"

def test_transliterate_falls_back_to_unidecode():
    out = transliterate("Παχειά Άμμος", None)
    assert out and out.isascii() and "Ammos" in out   # translittération latine non vide

def test_transliterate_none_when_empty():
    assert transliterate(None, None) is None

def test_normalize_operator():
    assert normalize_operator("ΚΤΕΛ ΗΡΑΚΛΕΙΟΥ-ΛΑΣΙΘΙΟΥ ΑΕ") == "herlas"
    assert normalize_operator("ΚΤΕΛ ΧΑΝΙΩΝ ΡΕΘΥΜΝΟΥ ΑΕ") == "ektel"
    assert normalize_operator("Αστικό ΚΤΕΛ Ηρακλείου") == "urban-her"
    assert normalize_operator("Αστικό Κ.Τ.Ε.Λ. Χανίων Α.Ε.") == "urban-cha"
    assert normalize_operator(None) == "unknown"
    assert normalize_operator("KTEL") == "unknown"
```

- [ ] **Step 2: Lancer, vérifier l'échec** (`ModuleNotFoundError: No module named 'osm_parse'`)
Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_osm_parse.py -q`

- [ ] **Step 3: Implémenter (première moitié de osm_parse.py)**
```python
"""Parsing Overpass : arrêts translittérés + relations (séquences dédupliquées).
Aucun I/O réseau. unidecode est importé paresseusement (réseau-free)."""
from prices import haversine_km
from net_geocode import stop_slug


def transliterate(name_el, name_en=None):
    """name:en si présent, sinon translittération grec->latin (unidecode)."""
    if name_en and name_en.strip():
        return name_en.strip()
    if not name_el:
        return None
    from unidecode import unidecode
    out = unidecode(name_el).strip()
    return out or None


def normalize_operator(op):
    """Chaîne opérateur OSM (grec, variantes) -> id interne."""
    if not op:
        return "unknown"
    o = op.lower()
    if "ηρακλειου-λασιθιου" in o or "ηρακλείου-λασιθίου" in o:
        return "herlas"
    if "χανιων ρεθυμνου" in o or "χανίων ρεθύμνου" in o:
        return "ektel"
    if "αστικ" in o and "ηρακλει" in o:
        return "urban-her"
    if "αστικ" in o and "χαν" in o:
        return "urban-cha"
    return "unknown"
```

- [ ] **Step 4: Lancer, vérifier 5 PASS**
Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_osm_parse.py -q`
> Si `test_transliterate_falls_back_to_unidecode` échoue sur `"Ammos"`, ajuster l'assertion à la sortie réelle notée en Task 1 Step 1 (garder `isascii()` + non vide).

- [ ] **Step 5: Commit**
```bash
git add scripts/scrapers/buses/osm_parse.py scripts/scrapers/buses/test_osm_parse.py
git commit -m "feat(buses): osm_parse translittération + normalisation opérateur"
```

---

## Task 3: osm_parse.py — parse_stops + parse_relation (dédup platform/stop)

**Files:**
- Modify (append): `scripts/scrapers/buses/osm_parse.py`
- Modify (append): `scripts/scrapers/buses/test_osm_parse.py`

- [ ] **Step 1: Ajouter les tests (sur la fixture réelle + cas synthétique de dédup)**
```python
import json, os
from osm_parse import parse_stops, parse_relation

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "osm_agnik_sitia.json")
def _elements():
    with open(FIX, encoding="utf-8") as f:
        return json.load(f)["elements"]

def test_parse_stops_indexes_nodes_with_coords_and_translit():
    stops = parse_stops(_elements())
    # le node Pachia Ammos (grec) est présent, géolocalisé, slug latin
    pa = [s for s in stops.values() if s["name_el"] == "Παχειά Άμμος"]
    assert pa, "Pachia Ammos node absent de la fixture parse"
    s = pa[0]
    assert s["lat"] and s["lng"] and s["slug"] and s["slug"].isascii()

def test_parse_relation_sequence_includes_pachia_ammos_ordered():
    els = _elements()
    stops = parse_stops(els)
    rel = next(e for e in els if e["type"] == "relation" and e["id"] == 12320727)
    parsed = parse_relation(rel, stops)
    assert parsed["operator"] == "herlas"
    assert "ΝΙΚΟΛΑΟΣ" in (parsed["from"] or "") and "ΣΗΤΕΙΑ" in (parsed["to"] or "")
    # séquence dédupliquée (platform+stop fusionnés) : pas le double brut
    seq_names = [stops[i]["name_el"] for i in parsed["stop_ids"]]
    assert 12 <= len(seq_names) <= 24, f"séquence anormale: {len(seq_names)}"
    assert "Παχειά Άμμος" in seq_names
    # ordre : Pachia Ammos après Gournia, avant Kavousi
    i_g = seq_names.index("ΓΟΥΡΝΙΑ"); i_p = seq_names.index("Παχειά Άμμος")
    assert i_g < i_p

def test_parse_relation_dedups_consecutive_platform_stop():
    # deux nodes quasi colocalisés (platform puis stop) = un seul arrêt
    stops = {
        1: {"osm_id": 1, "name_el": "Α", "name": "A", "lat": 35.10, "lng": 25.10, "slug": "a"},
        2: {"osm_id": 2, "name_el": "Α", "name": "A", "lat": 35.1001, "lng": 25.1001, "slug": "a"},
        3: {"osm_id": 3, "name_el": "Β", "name": "B", "lat": 35.20, "lng": 25.20, "slug": "b"},
    }
    rel = {"id": 99, "tags": {"operator": "ΚΤΕΛ ΗΡΑΚΛΕΙΟΥ-ΛΑΣΙΘΙΟΥ ΑΕ", "from": "A", "to": "B"},
           "members": [
               {"type": "node", "ref": 1, "role": "platform"},
               {"type": "node", "ref": 2, "role": "stop"},
               {"type": "node", "ref": 3, "role": "platform"},
           ]}
    parsed = parse_relation(rel, stops)
    assert parsed["stop_slugs"] == ["a", "b"]   # le doublon a/a fusionné
```

- [ ] **Step 2: Lancer, vérifier l'échec** (`ImportError: cannot import name 'parse_stops'`)

- [ ] **Step 3: Ajouter à osm_parse.py (à la fin)**
```python


def parse_stops(elements):
    """Tous les nodes Overpass -> {osm_id: {osm_id,name_el,name,lat,lng,slug}}."""
    out = {}
    for e in elements:
        if e.get("type") != "node":
            continue
        tags = e.get("tags", {})
        name_el = tags.get("name")
        name = transliterate(name_el, tags.get("name:en"))
        out[e["id"]] = {
            "osm_id": e["id"], "name_el": name_el, "name": name,
            "lat": e.get("lat"), "lng": e.get("lon"),
            "slug": stop_slug(name) if name else None,
        }
    return out


def _same_stop(a, b):
    """Deux nodes = le même arrêt physique (quai+point, ou même nom à <80 m)."""
    if a["name_el"] and a["name_el"] == b["name_el"]:
        return True
    if None not in (a["lat"], a["lng"], b["lat"], b["lng"]):
        return haversine_km((a["lat"], a["lng"]), (b["lat"], b["lng"])) * 1000 < 80
    return False


def parse_relation(rel, stops_by_id):
    """Relation route=bus -> métadonnées + séquence d'arrêts ordonnée dédupliquée.
    Les arrêts portent un rôle 'stop' ou 'platform' ; le quai (platform) prime
    quand un arrêt physique apparaît en double consécutif."""
    seq = []
    for m in rel.get("members", []):
        if m.get("type") != "node" or m.get("role") not in ("stop", "platform"):
            continue
        node = stops_by_id.get(m["ref"])
        if not node or not node["slug"]:
            continue
        if seq and _same_stop(seq[-1], node):
            if m["role"] == "platform":
                seq[-1] = node
            continue
        seq.append(node)
    tags = rel.get("tags", {})
    return {
        "osm_id": rel["id"],
        "ref": (tags.get("ref") or "").strip() or None,
        "operator": normalize_operator(tags.get("operator")),
        "from": tags.get("from"), "to": tags.get("to"),
        "stop_ids": [s["osm_id"] for s in seq],
        "stop_slugs": [s["slug"] for s in seq],
    }
```

- [ ] **Step 4: Lancer, vérifier tous les tests osm_parse PASS** (5 + 3 = 8)
Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_osm_parse.py -q`

- [ ] **Step 5: Commit**
```bash
git add scripts/scrapers/buses/osm_parse.py scripts/scrapers/buses/test_osm_parse.py
git commit -m "feat(buses): osm_parse arrêts + séquences relation (dédup platform/stop)"
```

---

## Task 4: osm_lines.py — fusion des relations en lignes

**Files:**
- Create: `scripts/scrapers/buses/osm_lines.py`
- Test: `scripts/scrapers/buses/test_osm_lines.py`

- [ ] **Step 1: Écrire les tests**
```python
from osm_lines import merge_osm_lines

def _rel(osm_id, op, slugs, ref=None):
    return {"osm_id": osm_id, "ref": ref, "operator": op, "from": None, "to": None,
            "stop_ids": list(range(len(slugs))), "stop_slugs": slugs}

def test_merge_directions_into_one_line():
    rels = [
        _rel(1, "herlas", ["agios-nikolaos", "gournia", "sitia"]),
        _rel(2, "herlas", ["sitia", "gournia", "agios-nikolaos"]),
    ]
    lines = merge_osm_lines(rels)
    assert len(lines) == 1
    assert lines[0]["origin"] == "agios-nikolaos" and lines[0]["dest"] == "sitia"
    assert lines[0]["stops"] == ["agios-nikolaos", "gournia", "sitia"]
    assert sorted(lines[0]["osm_ids"]) == [1, 2]

def test_merge_keeps_ref_when_present():
    rels = [_rel(1, "herlas", ["a", "b"], ref="ΗΚ-ΑΡΧ"), _rel(2, "herlas", ["b", "a"])]
    assert merge_osm_lines(rels)[0]["ref"] == "ΗΚ-ΑΡΧ"

def test_merge_distinct_operators_or_termini_stay_separate():
    rels = [_rel(1, "herlas", ["a", "b"]), _rel(2, "ektel", ["a", "b"]),
            _rel(3, "herlas", ["a", "c"])]
    assert len(merge_osm_lines(rels)) == 3

def test_merge_drops_too_short():
    assert merge_osm_lines([_rel(1, "herlas", ["a"])]) == []
```

- [ ] **Step 2: Lancer, vérifier l'échec**

- [ ] **Step 3: Implémenter**
```python
"""Fusion des relations OSM en lignes : regroupe par (opérateur, couple de
terminus), fusionne aller/retour et variantes en gardant la séquence la plus
complète (orientation canonique = terminus alphabétique premier)."""


def merge_osm_lines(relations):
    groups = {}
    for r in relations:
        slugs = r["stop_slugs"]
        if len(slugs) < 2:
            continue
        termini = frozenset({slugs[0], slugs[-1]})
        if len(termini) < 2:
            continue
        groups.setdefault((r["operator"], termini), []).append(r)
    lines = []
    for (operator, termini), members in groups.items():
        a, b = sorted(termini)
        oriented = []
        for r in members:
            s = r["stop_slugs"]
            oriented.append(s if s[0] == a else list(reversed(s)))
        stops = max(oriented, key=lambda s: (len(s), s))   # tie-break déterministe
        ref = next((r["ref"] for r in members if r["ref"]), None)
        lines.append({
            "operator_id": operator, "origin": a, "dest": b,
            "stops": stops, "ref": ref,
            "osm_ids": [r["osm_id"] for r in members],
            "key": f"{a}|{b}|{operator}",
        })
    lines.sort(key=lambda l: l["key"])
    return lines
```

- [ ] **Step 4: Lancer, vérifier 4 PASS**

- [ ] **Step 5: Commit**
```bash
git add scripts/scrapers/buses/osm_lines.py scripts/scrapers/buses/test_osm_lines.py
git commit -m "feat(buses): osm_lines fusion des relations en lignes"
```

---

## Task 5: osm_fetch.py — Overpass retry + miroir

**Files:**
- Create: `scripts/scrapers/buses/osm_fetch.py`
- Test: `scripts/scrapers/buses/test_osm_fetch.py`

- [ ] **Step 1: Écrire les tests** (le POST HTTP est injecté → zéro réseau)
```python
from osm_fetch import fetch_overpass, OVERPASS_QUERY, MIRRORS

def test_query_targets_crete_bus_relations():
    assert 'route"="bus' in OVERPASS_QUERY and "node(r)" in OVERPASS_QUERY

def test_fetch_returns_elements_on_success():
    calls = []
    def fake(url, q):
        calls.append(url)
        return {"elements": [{"type": "node", "id": 1}]}
    out = fetch_overpass(fetch=fake)
    assert out == [{"type": "node", "id": 1}] and len(calls) == 1

def test_fetch_falls_back_to_mirror():
    def fake(url, q):
        return None if url == MIRRORS[0] else {"elements": [{"type": "relation", "id": 9}]}
    out = fetch_overpass(fetch=fake)
    assert out == [{"type": "relation", "id": 9}]

def test_fetch_none_when_all_fail_or_empty():
    assert fetch_overpass(fetch=lambda url, q: None) is None
    assert fetch_overpass(fetch=lambda url, q: {"elements": []}) is None
```

- [ ] **Step 2: Lancer, vérifier l'échec**

- [ ] **Step 3: Implémenter**
```python
"""Fetch Overpass : requête réseau bus Crète, retry + miroir de secours.
Le POST HTTP est injecté (testable sans réseau)."""
import time

OVERPASS_QUERY = (
    '[out:json][timeout:180];'
    'relation["route"="bus"](34.78,23.40,35.75,26.40);'
    'out body;node(r);out body;'
)
MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def _http_post(url, query):
    import requests
    try:
        r = requests.post(url, data={"data": query},
                          headers={"User-Agent": "crete.direct-bot/1.0 (+https://crete.direct)"},
                          timeout=200)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


def fetch_overpass(query=OVERPASS_QUERY, fetch=None, mirrors=MIRRORS, throttle=0.0):
    """Retourne la liste `elements` (>0) ou None si tous les miroirs échouent."""
    fetch = fetch or _http_post
    for url in mirrors:
        for _ in (1, 2):
            data = fetch(url, query)
            if data and data.get("elements"):
                return data["elements"]
            if throttle:
                time.sleep(throttle)
    return None
```

- [ ] **Step 4: Lancer, vérifier 4 PASS**

- [ ] **Step 5: Commit**
```bash
git add scripts/scrapers/buses/osm_fetch.py scripts/scrapers/buses/test_osm_fetch.py
git commit -m "feat(buses): osm_fetch Overpass retry + miroir"
```

---

## Task 6: osm_network.py — assemblage + store + entrée

**Files:**
- Create: `scripts/scrapers/buses/osm_network.py`
- Test: `scripts/scrapers/buses/test_osm_network.py`

- [ ] **Step 1: Écrire les tests** (assemblage pur sur la fixture réelle ; OSRM injecté)
```python
import json, os
from osm_network import assemble_osm, should_build_osm, MIN_OSM_STOPS, MIN_OSM_LINES

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "osm_agnik_sitia.json")
def _elements():
    with open(FIX, encoding="utf-8") as f:
        return json.load(f)["elements"]

def _fake_osrm(coords):
    return {"code": "Ok", "routes": [{
        "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
        "legs": [{"distance": 5000.0} for _ in range(len(coords) - 1)]}]}

def test_assemble_builds_line_with_pachia_ammos():
    stops, lines, line_stops = assemble_osm(
        _elements(), fetch=lambda url: _fake_osrm([(0, 0)]))  # OSRM dégradé -> haversine
    assert len(lines) == 1
    line = lines[0]
    assert line["operator_id"] == "herlas"
    assert line["source"] == "osm"
    # un arrêt du réseau est Pachia Ammos, géolocalisé, source osm
    pa = [s for s in stops if s["name_el"] == "Παχειά Άμμος"]
    assert pa and pa[0]["coords_source"] == "osm" and pa[0]["lat"]
    # il est dans la séquence de la ligne (line_stops)
    slugs = [ls["stop_slug"] for ls in line_stops if ls["line_code"] == line["code"]]
    assert pa[0]["slug"] in slugs

def test_assemble_code_official_from_ref_or_prefnn():
    stops, lines, _ = assemble_osm(_elements(), fetch=lambda url: None)
    # la fixture Agios Nik<->Sitia n'a pas de ref -> code_official None, code PREF-NN
    assert lines[0]["code"].startswith(("HER-", "LAS-", "CHA-", "RET-"))
    assert lines[0]["code_official"] is None

def test_should_build_osm_guardrail():
    assert should_build_osm([{}] * MIN_OSM_STOPS, [{}] * MIN_OSM_LINES) is True
    assert should_build_osm([{}] * (MIN_OSM_STOPS - 1), [{}] * MIN_OSM_LINES) is False
```

- [ ] **Step 2: Lancer, vérifier l'échec**

- [ ] **Step 3: Implémenter**
```python
"""Pipeline OSM : assemble bus_stops/bus_lines/bus_line_stops depuis les éléments
Overpass (coords fournies par OSM, zéro géocodage). Pur hormis OSRM (fetch injecté).
Réutilise net_osrm / net_timeprofile / net_nomenclature / build_network helpers."""
from prices import haversine_km
from osm_fetch import fetch_overpass
from osm_parse import parse_stops, parse_relation
from osm_lines import merge_osm_lines
from net_osrm import build_geometry
from net_timeprofile import cumulative_profile
from net_nomenclature import assign_codes, color_for, prefecture_for
from build_network import _title, store_network

MIN_OSM_STOPS = 500   # sous ces seuils = réponse Overpass partielle, on ne touche pas la DB
MIN_OSM_LINES = 50


def should_build_osm(stops, lines):
    return len(stops) >= MIN_OSM_STOPS and len(lines) >= MIN_OSM_LINES


def _seq_length_km(seq):
    total = 0.0
    for i in range(1, len(seq)):
        a, b = seq[i - 1], seq[i]
        if a and b and a.get("lat") is not None and b.get("lat") is not None:
            total += haversine_km((a["lat"], a["lng"]), (b["lat"], b["lng"]))
    return round(total, 2)


def assemble_osm(elements, fetch=None, existing_codes=None):
    """Retourne (stops, lines, line_stops)."""
    stops_by_id = parse_stops(elements)
    relations = [parse_relation(e, stops_by_id) for e in elements
                 if e.get("type") == "relation" and e.get("tags", {}).get("route") == "bus"]
    lines_raw = merge_osm_lines(relations)

    # arrêts retenus = ceux utilisés par au moins une ligne (1 enregistrement par slug)
    used = set()
    for ln in lines_raw:
        used.update(ln["stops"])
    slug_to_stop = {}
    for s in stops_by_id.values():
        if s["slug"] in used and s["slug"] not in slug_to_stop:
            slug_to_stop[s["slug"]] = s
    stops = [{
        "slug": s["slug"], "name": s["name"], "name_el": s["name_el"],
        "lat": s["lat"], "lng": s["lng"], "prefecture": prefecture_for(s["lat"], s["lng"]),
        "coords_source": "osm", "coords_confidence": "high",
        "osm_id": s["osm_id"], "needs_review": False,
    } for s in slug_to_stop.values()]

    # nomenclature : longueur haversine provisoire pour ordonner les codes
    for ln in lines_raw:
        o = slug_to_stop.get(ln["origin"], {})
        ln["origin_lat"], ln["origin_lng"] = o.get("lat"), o.get("lng")
        ln["length_km"] = _seq_length_km([slug_to_stop.get(x) for x in ln["stops"]])
    codes = assign_codes(lines_raw, existing=existing_codes)

    lines, line_stops = [], []
    for ln in lines_raw:
        code = codes[ln["key"]]
        seq = [slug_to_stop[x] for x in ln["stops"] if x in slug_to_stop]
        geo = build_geometry(seq, fetch=fetch)
        profile = cumulative_profile(geo["leg_km"], None)   # durée estimée en SP1
        cum_km, acc = [0.0], 0.0
        for d in geo["leg_km"]:
            acc += d
            cum_km.append(round(acc, 2))
        lines.append({
            "code": code, "code_official": ln["ref"],
            "name": f"{_title(ln['origin'])} <-> {_title(ln['dest'])}",
            "prefecture": code.split("-")[0], "operator_id": ln["operator_id"],
            "geometry": geo["geometry"], "color": color_for(code),
            "length_km": geo["length_km"], "total_minutes": profile[-1] if profile else None,
            "partial_geo": geo["partial"], "osm_id": ln["osm_ids"][0], "source": "osm",
        })
        for i, x in enumerate(ln["stops"]):
            line_stops.append({
                "line_code": code, "stop_slug": x, "seq": i,
                "cumulative_km": cum_km[i] if i < len(cum_km) else cum_km[-1],
                "cumulative_minutes": profile[i] if i < len(profile) else profile[-1],
            })
    return stops, lines, line_stops


def build_osm_network(sb):
    """Entrée : fetch Overpass -> assemble -> store (garde-fou). Retourne (n_stops,n_lines,n_ls)."""
    elements = fetch_overpass()
    if not elements:
        raise RuntimeError("Overpass indisponible (tous miroirs)")
    existing = _load_existing_codes(sb)
    stops, lines, line_stops = assemble_osm(elements, existing_codes=existing)
    if not should_build_osm(stops, lines):
        raise ValueError(f"refuse build OSM: {len(stops)} stops / {len(lines)} lines")
    return store_network(sb, stops, lines, line_stops)


def _load_existing_codes(sb):
    """bus_lines existantes -> {key: code} (stabilité PREF-NN)."""
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
```

> **Note** : `store_network` (réutilisé de `build_network`) fait delete+insert des 3 tables et envoie les dicts tels quels ; les clés supplémentaires `osm_id`/`code_official`/`source` mappent aux colonnes ajoutées en Task 1. Son garde-fou interne `should_build_network` (≥20/≥5) est sous le garde-fou OSM (≥500/≥50) appliqué avant l'appel, donc jamais bloquant.

- [ ] **Step 4: Lancer les tests osm_network + suite complète**
Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_osm_network.py -q` (3 passed)
Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q` (tout vert)

- [ ] **Step 5: Commit**
```bash
git add scripts/scrapers/buses/osm_network.py scripts/scrapers/buses/test_osm_network.py
git commit -m "feat(buses): osm_network assemblage + store + entrée Overpass"
```

---

## Task 7: Basculer buses.py sur OSM (retrait build_network primaire)

**Files:**
- Modify: `scripts/scrapers/buses/buses.py`

- [ ] **Step 1: Retirer l'appel build_network du scrape KTEL**

Dans `buses.py`, supprimer l'import `from build_network import build_network` et le bloc inséré au Plan 1 (Task 8) qui appelle `build_network(sb)` (le bloc `committed = len(plan) - len(failures)` … `network build skipped`). `bus_routes` continue d'être peuplé (source horaires pour SP2) ; le réseau dérivé des titres n'est plus construit.

Ajouter un commentaire à la place du bloc retiré :
```python
    # Réseau (arrêts/lignes/séquences) : désormais construit depuis OSM par
    # osm_network.py (cron dédié), plus depuis les titres KTEL. bus_routes reste
    # la source des horaires (apparié aux lignes OSM en SP2).
```

- [ ] **Step 2: Vérifier que buses.py compile et que la suite reste verte**
Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m py_compile buses.py && echo "compile OK"`
Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q` (tout vert ; les tests de build_network restent verts — le module est conservé pour SP2)

- [ ] **Step 3: Commit**
```bash
git add scripts/scrapers/buses/buses.py
git commit -m "refactor(buses): réseau construit depuis OSM, retrait build_network du scrape"
```

---

## Task 8: Déploiement VPS + run réel (owner : sur GO Kami, accès VPS)

> Opérationnel (pas de TDD). Applique migrations, déploie, lance le build OSM réel, vérifie Pachia Ammos.

- [ ] **Step 1: Appliquer les migrations sur le VPS**
```bash
ssh kairos-vps "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse" \
  < supabase/migrations/20260614120000_bus_network.sql      # si pas déjà appliquée (Plan 1)
ssh kairos-vps "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse" \
  < supabase/migrations/20260614130000_bus_stops_needs_review.sql
ssh kairos-vps "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse" \
  < supabase/migrations/20260614140000_bus_network_osm.sql
```
Vérifier `\d bus_lines` expose `osm_id`, `code_official`, `source`.

- [ ] **Step 2: Déployer les modules + installer unidecode sur le VPS**
```bash
for f in osm_parse osm_lines osm_fetch osm_network buses; do
  git show HEAD:scripts/scrapers/buses/$f.py | ssh kairos-vps "cat > /opt/cretepulse/buses/$f.py"
done
# net_* / prices / build_network déjà déployés (Plan 1) ; sinon les pousser aussi
ssh kairos-vps "/opt/cretepulse/venv/bin/pip install -q unidecode"
```

- [ ] **Step 3: Build OSM réel + vérif Pachia Ammos**
```bash
ssh kairos-vps "cd /opt/cretepulse && venv/bin/python -c 'from supabase import create_client; import os; from dotenv import load_dotenv; load_dotenv(); sb=create_client(os.environ[\"SUPABASE_URL\"], os.environ[\"SUPABASE_SERVICE_KEY\"]); import sys; sys.path.insert(0,\"buses\"); from osm_network import build_osm_network; print(build_osm_network(sb))'"
node scripts/check-bus-network.mjs    # invariants (local, env crete.direct)
```
Expected : (n_stops ≥ ~800, n_lines ≥ ~100, n_line_stops ≥ ~2000), `OK invariants réseau`. Vérifier en DB qu'un `bus_stops` a `name_el='Παχειά Άμμος'` et qu'il est dans `bus_line_stops` d'une ligne Agios Nikolaos↔Sitia.

- [ ] **Step 4: Poser le cron OSM hebdo + logger en mémoire**
```cron
0 2 * * 0 cd /opt/cretepulse && venv/bin/python -c "..." >> /var/log/cretepulse-osm.log 2>&1
```
Ligne `session_log.md` (DEPLOY, `[FACT]` + Pachia Ammos vérifié + compteurs). Signaler à Kami que SP2 (horaires KTEL + fallback) est la prochaine étape avant tout déploiement front.

---

## Self-Review (effectuée)

**Couverture spec :**
- Fetch Overpass robuste (retry/miroir, garde-fou) → Tasks 5, 6. ✓
- Parse arrêts + translittération (name:en sinon unidecode) → Tasks 1, 2, 3. ✓
- Séquences ordonnées + dédup platform/stop → Task 3 (fixture réelle, Pachia Ammos ordonné). ✓
- Fusion aller/retour + variantes → Task 4. ✓
- Codes officiel (`ref`) sinon PREF-NN → Task 6 (`code_official` + `assign_codes`). ✓
- Géométrie OSRM + profil de temps (réutilisés) → Task 6. ✓
- Modèle de données (osm_id, code_official, source) → Task 1. ✓
- OSM remplace build_network primaire, KTEL gardé pour SP2 → Task 7. ✓
- Normalisation opérateur (4 réseaux + unknown) → Task 2. ✓
- Plus de géocodage (coords OSM) → Task 6 (`coords_source='osm'`). ✓

**Placeholders :** aucun ; code complet à chaque step. La seule calibration (sortie exacte d'`unidecode`) est explicitée Task 1 Step 1 + assertion robuste Task 2.

**Cohérence des types :** `parse_relation` produit `stop_ids`/`stop_slugs` ; `merge_osm_lines` consomme `stop_slugs` et produit `stops`/`ref`/`key` ; `assemble_osm` consomme `stops`/`ref`/`origin`/`dest`/`key` et produit des dicts compatibles `store_network` + colonnes Task 1 ; `cumulative_profile`/`build_geometry` réutilisés à l'identique. ✓

**Risque résiduel :** la qualité réelle (nb de lignes/arrêts produits, dédup sur l'ensemble du réseau, opérateurs `unknown`) se valide au build réel (Task 8) ; réversible (le réseau précédent est conservé tant que le garde-fou MIN n'est pas franchi).
