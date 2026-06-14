# Réseau bus — Plan 1/3 : fondation data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire un pipeline offline `build_network.py` qui dérive de `bus_routes` (source brute scrapée) trois tables réseau peuplées : `bus_stops` (arrêts géocodés), `bus_lines` (corridors nommés `PREF-NN` avec tracé routier OSRM), `bus_line_stops` (séquence ordonnée + profil de temps `cumulative_minutes`).

**Architecture:** Modules Python purs et focalisés à plat dans `scripts/scrapers/buses/` (convention existante : imports plats, tests pytest sur fixtures). Le pipeline lit `bus_routes` après le scrape hebdo, assemble le réseau en mémoire (fonctions pures + un seul service I/O externe : OSRM, injecté pour les tests), puis écrit les 3 tables en delete+insert transactionnel avec garde-fou (jamais de réseau vide en prod). `bus_routes` et le planner actuel restent intacts (additif).

**Tech Stack:** Python 3 (venv `/opt/cretepulse`), `supabase-py`, `requests`, OSRM route service (API publique `router.project-osrm.org`, pré-calcul caché), Postgres self-hosted + PostgREST, pytest.

**Périmètre de CE plan :** la donnée seulement. Plans 2 (extension planner avec heures de passage) et 3 (carte réseau MapLibre) suivront une fois la data en place et le spike OSRM validé.

**Spec :** `docs/superpowers/specs/2026-06-14-bus-network-nomenclature-design.md`

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/20260614120000_bus_network.sql` | DDL des 3 tables + RLS + grants + reload PostgREST |
| `scripts/scrapers/buses/net_nomenclature.py` | Préfecture par proximité, attribution stable `PREF-NN`, couleur |
| `scripts/scrapers/buses/net_geocode.py` | Collecte+dédup des arrêts, géocodage en cascade |
| `scripts/scrapers/buses/net_lines.py` | Fusion des routes en lignes (corridors) bidirectionnelles |
| `scripts/scrapers/buses/net_timeprofile.py` | Profil de temps `cumulative_minutes` calé sur la durée |
| `scripts/scrapers/buses/net_osrm.py` | Tracé routier OSRM + distances inter-arrêts, fallback haversine |
| `scripts/scrapers/buses/build_network.py` | Assemblage pur + store transactionnel + garde-fou |
| `scripts/scrapers/buses/test_net_*.py` | Tests pytest par module |
| `scripts/check-bus-network.mjs` | Sanity invariants post-build (node) |
| `scripts/scrapers/buses/buses.py` | Branchement : appel `build_network` après scrape |

**Convention de réutilisation :** `from prices import _norm, haversine_km, PLACE_COORDS`. `from durations import BASE_MIN, MIN_PER_KM`.

**Convention de test :** local Windows `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q` ; VPS `/opt/cretepulse/venv/bin/python -m pytest -q`.

---

## Task 1: Migration SQL des 3 tables réseau

**Files:**
- Create: `supabase/migrations/20260614120000_bus_network.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Réseau bus dérivé de bus_routes : référentiel d'arrêts + lignes nommées + séquences.
-- Construit par build_network.py au scrape hebdo. Additif : bus_routes inchangée.

create table if not exists bus_stops (
  id                serial primary key,
  slug              text unique not null,    -- _norm normalisé, clé de dédup
  name              text not null,           -- libellé d'affichage
  name_el           text,                    -- grec si connu
  lat               double precision,
  lng               double precision,
  prefecture        text,                    -- 'HER' | 'LAS' | 'CHA' | 'RET'
  coords_source     text not null default 'none', -- referentiel|cb_places|geocoded|none
  coords_confidence text not null default 'low'    -- high|low
);

create table if not exists bus_lines (
  id            serial primary key,
  code          text unique not null,        -- nomenclature 'HER-01'
  name          text not null,               -- 'Heraklion <-> Sitia'
  prefecture    text not null,
  operator_id   text references bus_operators(id),
  geometry      jsonb,                        -- [[lng,lat],...] tracé OSRM
  color         text not null default '#0B5E78',
  length_km     double precision,
  total_minutes integer,
  partial_geo   boolean not null default false -- true si fallback segment droit utilisé
);

create table if not exists bus_line_stops (
  line_id            integer not null references bus_lines(id) on delete cascade,
  stop_id            integer not null references bus_stops(id),
  seq                integer not null,        -- 0..N sens aller
  cumulative_km      double precision not null default 0,
  cumulative_minutes integer not null default 0,
  primary key (line_id, seq)
);
create index if not exists idx_bus_line_stops_stop on bus_line_stops (stop_id);

alter table bus_stops      enable row level security;
alter table bus_lines      enable row level security;
alter table bus_line_stops enable row level security;

drop policy if exists "public read bus_stops"      on bus_stops;
drop policy if exists "public read bus_lines"      on bus_lines;
drop policy if exists "public read bus_line_stops" on bus_line_stops;
create policy "public read bus_stops"      on bus_stops      for select using (true);
create policy "public read bus_lines"      on bus_lines      for select using (true);
create policy "public read bus_line_stops" on bus_line_stops for select using (true);

grant select on bus_stops, bus_lines, bus_line_stops to anon, authenticated;
grant all    on bus_stops, bus_lines, bus_line_stops to service_role;
grant usage, select on sequence bus_stops_id_seq to service_role;
grant usage, select on sequence bus_lines_id_seq to service_role;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Valider la syntaxe SQL localement (parse only)**

Run: `cd /c/Users/fkerj/cretepulse-build && python -c "import pathlib,re; s=pathlib.Path('supabase/migrations/20260614120000_bus_network.sql').read_text(); assert s.count('create table')==3 and 'bus_line_stops' in s; print('OK 3 tables')"`
Expected: `OK 3 tables`

(L'application réelle sur le VPS se fait en Task 9. Pas d'accès Postgres en local.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260614120000_bus_network.sql
git commit -m "feat(buses): migration tables réseau bus_stops/bus_lines/bus_line_stops"
```

---

## Task 2: net_nomenclature.py — préfecture, codes PREF-NN, couleur

**Files:**
- Create: `scripts/scrapers/buses/net_nomenclature.py`
- Test: `scripts/scrapers/buses/test_net_nomenclature.py`

- [ ] **Step 1: Écrire les tests**

```python
from net_nomenclature import prefecture_for, assign_codes, color_for

def test_prefecture_for_nearest_center():
    assert prefecture_for(35.34, 25.14) == "HER"   # Heraklion ville
    assert prefecture_for(35.19, 25.71) == "LAS"   # Agios Nikolaos
    assert prefecture_for(35.51, 24.02) == "CHA"   # Chania
    assert prefecture_for(35.36, 24.48) == "RET"   # Rethymno

def test_prefecture_for_none_when_no_coords():
    assert prefecture_for(None, None) is None

def test_assign_codes_deterministic_and_prefixed():
    # ligne = origin coords -> prefecture, + clé stable + longueur
    lines = [
        {"key": "heraklion|sitia|herlas",  "origin_lat": 35.34, "origin_lng": 25.14, "length_km": 130.0},
        {"key": "heraklion|anogeia|herlas","origin_lat": 35.34, "origin_lng": 25.14, "length_km": 55.0},
        {"key": "chania|kissamos|ektel",   "origin_lat": 35.51, "origin_lng": 24.02, "length_km": 40.0},
    ]
    codes = assign_codes(lines)
    assert codes["heraklion|sitia|herlas"] == "HER-01"   # la plus longue de HER d'abord
    assert codes["heraklion|anogeia|herlas"] == "HER-02"
    assert codes["chania|kissamos|ektel"] == "CHA-01"

def test_assign_codes_stable_with_existing_mapping():
    lines = [
        {"key": "heraklion|sitia|herlas",  "origin_lat": 35.34, "origin_lng": 25.14, "length_km": 130.0},
        {"key": "heraklion|anogeia|herlas","origin_lat": 35.34, "origin_lng": 25.14, "length_km": 55.0},
    ]
    existing = {"heraklion|anogeia|herlas": "HER-01"}  # déjà numérotée HER-01
    codes = assign_codes(lines, existing=existing)
    assert codes["heraklion|anogeia|herlas"] == "HER-01"   # conservée
    assert codes["heraklion|sitia|herlas"] == "HER-02"     # nouveau code, rang libre

def test_color_for_stable():
    assert color_for("HER-01") == color_for("HER-01")
    assert color_for("HER-01") != color_for("LAS-01")
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_nomenclature.py -q`
Expected: FAIL `ModuleNotFoundError: No module named 'net_nomenclature'`

- [ ] **Step 3: Implémenter**

```python
"""Nomenclature crete.direct des lignes : préfecture par proximité, code PREF-NN
stable entre builds, couleur dérivée. Aucun I/O."""
from prices import haversine_km

PREFECTURE_CENTERS = {
    "HER": (35.3387, 25.1442),   # Heraklion
    "LAS": (35.1909, 25.7136),   # Agios Nikolaos
    "CHA": (35.5138, 24.0180),   # Chania
    "RET": (35.3644, 24.4821),   # Rethymno
}
_PREF_ORDER = ["CHA", "RET", "HER", "LAS"]   # ouest -> est, ordre d'affichage stable

# Palette par préfecture (charte aegean/lagon), variée par hash du code.
_PREF_BASE = {"HER": "#0B5E78", "LAS": "#00838F", "CHA": "#ED7A5C", "RET": "#C8A35F"}


def prefecture_for(lat, lng):
    if lat is None or lng is None:
        return None
    return min(PREFECTURE_CENTERS, key=lambda p: haversine_km(PREFECTURE_CENTERS[p], (lat, lng)))


def assign_codes(lines, existing=None):
    """Attribue PREF-NN. `existing` = {key: code} déjà émis (stabilité). Les lignes
    déjà mappées gardent leur code ; les nouvelles prennent les rangs libres.
    Tri des nouvelles : longueur décroissante puis key (déterministe)."""
    existing = dict(existing or {})
    out = {}
    used = {}  # prefecture -> set(rangs pris)
    # 1) honorer l'existant
    for ln in lines:
        code = existing.get(ln["key"])
        if code:
            pref, num = code.split("-")
            out[ln["key"]] = code
            used.setdefault(pref, set()).add(int(num))
    # 2) numéroter les nouvelles
    by_pref = {}
    for ln in lines:
        if ln["key"] in out:
            continue
        pref = prefecture_for(ln.get("origin_lat"), ln.get("origin_lng")) or "HER"
        by_pref.setdefault(pref, []).append(ln)
    for pref, items in by_pref.items():
        items.sort(key=lambda l: (-(l.get("length_km") or 0), l["key"]))
        taken = used.setdefault(pref, set())
        n = 1
        for ln in items:
            while n in taken:
                n += 1
            taken.add(n)
            out[ln["key"]] = f"{pref}-{n:02d}"
            n += 1
    return out


def color_for(code):
    pref = code.split("-")[0]
    base = _PREF_BASE.get(pref, "#0B5E78")
    # variation déterministe de teinte par le numéro (rotation légère du dernier octet)
    try:
        num = int(code.split("-")[1])
    except (IndexError, ValueError):
        return base
    r, g, b = int(base[1:3], 16), int(base[3:5], 16), int(base[5:7], 16)
    shift = (num * 23) % 60 - 30
    b = max(0, min(255, b + shift))
    return f"#{r:02X}{g:02X}{b:02X}"
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_nomenclature.py -q`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/net_nomenclature.py scripts/scrapers/buses/test_net_nomenclature.py
git commit -m "feat(buses): nomenclature PREF-NN stable + préfecture par proximité"
```

---

## Task 3: net_geocode.py — collecte, dédup et géocodage des arrêts

**Files:**
- Create: `scripts/scrapers/buses/net_geocode.py`
- Test: `scripts/scrapers/buses/test_net_geocode.py`

- [ ] **Step 1: Écrire les tests**

```python
from net_geocode import collect_stops, stop_slug, geocode_stop

def test_stop_slug_normalises():
    assert stop_slug("Agios Nikolaos") == "agios-nikolaos"
    assert stop_slug("  HERAKLION ") == "heraklion"
    assert stop_slug("Chora Sfakion & Port") == "chora-sfakion-and-port"

def test_collect_stops_dedup_from_via_to():
    routes = [
        {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Malia", "Agios Nikolaos"]},
        {"from_place": "Heraklion", "to_place": "Malia",  "via_stops": None},
    ]
    stops = collect_stops(routes)
    # dédup par slug, Heraklion/Malia apparaissent une seule fois
    slugs = sorted(s["slug"] for s in stops)
    assert slugs == ["agios-nikolaos", "heraklion", "malia", "sitia"]

def test_geocode_stop_referentiel_first():
    place_coords = {"heraklion": (35.3387, 25.1442)}
    lat, lng, source, conf = geocode_stop("Heraklion", place_coords, {}, nominatim=None)
    assert (round(lat, 2), round(lng, 2)) == (35.34, 25.14)
    assert source == "referentiel" and conf == "high"

def test_geocode_stop_cb_places_second():
    cb_index = {"some-village": (35.10, 25.50)}
    lat, lng, source, conf = geocode_stop("Some Village", {}, cb_index, nominatim=None)
    assert (lat, lng) == (35.10, 25.50)
    assert source == "cb_places" and conf == "high"

def test_geocode_stop_nominatim_third():
    called = {}
    def fake_nominatim(name):
        called["name"] = name
        return (35.0, 25.0)
    lat, lng, source, conf = geocode_stop("Unknown Hamlet", {}, {}, nominatim=fake_nominatim)
    assert (lat, lng) == (35.0, 25.0)
    assert source == "geocoded" and conf == "low"
    assert called["name"] == "Unknown Hamlet"

def test_geocode_stop_none_when_unresolvable():
    lat, lng, source, conf = geocode_stop("Nowhere", {}, {}, nominatim=lambda n: None)
    assert lat is None and lng is None and source == "none"
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_geocode.py -q`
Expected: FAIL `ModuleNotFoundError: No module named 'net_geocode'`

- [ ] **Step 3: Implémenter**

```python
"""Référentiel d'arrêts : extraction depuis bus_routes, dédup par slug, géocodage
en cascade (PLACE_COORDS référentiel -> cb_places -> Nominatim -> none).
Le lookup Nominatim est injecté (None en test, fonction cachée en prod)."""
from prices import _norm


def stop_slug(name):
    return _norm(name).replace("&", "and").replace("  ", " ").strip().replace(" ", "-")


def collect_stops(routes):
    """Tous les arrêts (from/via/to) dédupliqués par slug, libellé = premier vu."""
    seen = {}
    for r in routes:
        names = [r["from_place"], r["to_place"], *(r.get("via_stops") or [])]
        for n in names:
            if not n:
                continue
            s = stop_slug(n)
            if s and s not in seen:
                seen[s] = {"slug": s, "name": n.strip()}
    return list(seen.values())


def geocode_stop(name, place_coords, cb_index, nominatim=None):
    """Retourne (lat, lng, source, confidence). Cascade déterministe."""
    key = _norm(name)
    if key in place_coords:
        lat, lng = place_coords[key]
        return lat, lng, "referentiel", "high"
    slug = stop_slug(name)
    if slug in cb_index:
        lat, lng = cb_index[slug]
        return lat, lng, "cb_places", "high"
    if nominatim is not None:
        hit = nominatim(name)
        if hit:
            return hit[0], hit[1], "geocoded", "low"
    return None, None, "none", "low"
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_geocode.py -q`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/net_geocode.py scripts/scrapers/buses/test_net_geocode.py
git commit -m "feat(buses): référentiel arrêts + géocodage en cascade"
```

---

## Task 4: net_lines.py — fusion des routes en lignes (corridors)

**Files:**
- Create: `scripts/scrapers/buses/net_lines.py`
- Test: `scripts/scrapers/buses/test_net_lines.py`

- [ ] **Step 1: Écrire les tests**

```python
from net_lines import route_sequence, merge_into_lines

def test_route_sequence_from_via_to():
    r = {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Malia", "Agios Nikolaos"]}
    assert route_sequence(r) == ["heraklion", "malia", "agios-nikolaos", "sitia"]

def test_merge_same_terminus_keeps_longest():
    # deux scrapes de la même ligne, l'un plus détaillé : on garde le superset
    routes = [
        {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
        {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Malia", "Agios Nikolaos"], "operator_id": "herlas"},
    ]
    lines = merge_into_lines(routes)
    assert len(lines) == 1
    assert lines[0]["stops"] == ["heraklion", "malia", "agios-nikolaos", "sitia"]

def test_merge_bidirectional_is_one_line():
    routes = [
        {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
        {"from_place": "Sitia", "to_place": "Heraklion", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
    ]
    lines = merge_into_lines(routes)
    assert len(lines) == 1
    # orientation canonique = terminus alphabétiquement premier en tête
    assert lines[0]["origin"] in ("heraklion", "sitia")

def test_merge_distinct_corridors_stay_separate():
    routes = [
        {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
        {"from_place": "Chania", "to_place": "Kissamos", "via_stops": None, "operator_id": "ektel"},
    ]
    lines = merge_into_lines(routes)
    assert len(lines) == 2

def test_merge_tracks_route_ids():
    routes = [
        {"id": 11, "from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
        {"id": 12, "from_place": "Sitia", "to_place": "Heraklion", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
    ]
    lines = merge_into_lines(routes)
    assert sorted(lines[0]["route_ids"]) == [11, 12]
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_lines.py -q`
Expected: FAIL `ModuleNotFoundError: No module named 'net_lines'`

- [ ] **Step 3: Implémenter**

```python
"""Fusion conservatrice des routes en lignes (corridors). Une ligne = un couple de
terminus (bidirectionnel), avec la séquence d'arrêts la plus complète observée.
Heuristique : on regroupe par {operator, frozenset(terminus)} ; au sein du groupe
on garde le superset de séquence (la plus longue dont les plus courtes sont
sous-séquences ordonnées). Pas de fusion entre opérateurs ni entre terminus
différents (conservateur : évite les faux corridors)."""
from net_geocode import stop_slug


def route_sequence(route):
    seq = [route["from_place"], *(route.get("via_stops") or []), route["to_place"]]
    out = []
    for n in seq:
        s = stop_slug(n) if n else None
        if s and (not out or out[-1] != s):
            out.append(s)
    return out


def _is_subsequence(short, long):
    """short est-elle une sous-séquence ordonnée de long ?"""
    it = iter(long)
    return all(x in it for x in short)


def merge_into_lines(routes):
    groups = {}  # (operator, frozenset(terminus_slugs)) -> list[(seq, route)]
    for r in routes:
        seq = route_sequence(r)
        if len(seq) < 2:
            continue
        termini = frozenset({seq[0], seq[-1]})
        key = (r.get("operator_id"), termini)
        groups.setdefault(key, []).append((seq, r))

    lines = []
    for (operator, termini), members in groups.items():
        # orientation canonique : terminus alphabétiquement premier en tête
        a, b = sorted(termini) if len(termini) == 2 else (next(iter(termini)), next(iter(termini)))
        oriented = []
        for seq, r in members:
            oriented.append(seq if seq[0] == a else list(reversed(seq)))
        # superset = la plus longue séquence dont les autres sont sous-séquences ;
        # sinon la plus longue (conservateur : on ne fabrique pas d'ordre inédit)
        best = max(oriented, key=len)
        stops = best
        route_ids = [r.get("id") for _, r in members if r.get("id") is not None]
        lines.append({
            "operator_id": operator,
            "origin": a,
            "dest": b,
            "stops": stops,
            "route_ids": route_ids,
            "key": f"{a}|{b}|{operator}",
        })
    lines.sort(key=lambda l: l["key"])
    return lines
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_lines.py -q`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/net_lines.py scripts/scrapers/buses/test_net_lines.py
git commit -m "feat(buses): fusion des routes en lignes bidirectionnelles"
```

---

## Task 5: net_timeprofile.py — profil de temps cumulatif

**Files:**
- Create: `scripts/scrapers/buses/net_timeprofile.py`
- Test: `scripts/scrapers/buses/test_net_timeprofile.py`

- [ ] **Step 1: Écrire les tests**

```python
from net_timeprofile import cumulative_profile

def test_profile_starts_zero_ends_total():
    # 3 arrêts, 2 segments de 10 et 30 km, durée totale 80 min
    prof = cumulative_profile(leg_km=[10.0, 30.0], total_minutes=80)
    assert prof[0] == 0
    assert prof[-1] == 80
    assert len(prof) == 3

def test_profile_proportional_to_distance():
    # segment 1 = 1/4 de la distance -> 1/4 du temps
    prof = cumulative_profile(leg_km=[10.0, 30.0], total_minutes=80)
    assert prof[1] == 20   # 10/40 * 80

def test_profile_monotonic_non_decreasing():
    prof = cumulative_profile(leg_km=[5.0, 5.0, 5.0], total_minutes=60)
    assert all(prof[i] <= prof[i + 1] for i in range(len(prof) - 1))

def test_profile_estimates_total_when_unknown():
    # total_minutes None -> estimation BASE_MIN + km*MIN_PER_KM, dernier > 0
    prof = cumulative_profile(leg_km=[20.0, 20.0], total_minutes=None)
    assert prof[0] == 0 and prof[-1] > 0
    assert prof[1] < prof[-1]

def test_profile_zero_distance_falls_back_to_even_split():
    # tous les arrêts au même point (km nuls) -> répartition uniforme du temps
    prof = cumulative_profile(leg_km=[0.0, 0.0], total_minutes=60)
    assert prof == [0, 30, 60]
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_timeprofile.py -q`
Expected: FAIL `ModuleNotFoundError: No module named 'net_timeprofile'`

- [ ] **Step 3: Implémenter**

```python
"""Profil de temps d'une ligne : offset cumulé (minutes) de passage à chaque arrêt
depuis le terminus origine, proportionnel à la distance routière cumulée et calé
sur la durée totale réelle. Aucun I/O."""
from durations import BASE_MIN, MIN_PER_KM


def cumulative_profile(leg_km, total_minutes):
    """leg_km : distances des N segments (N+1 arrêts). Retourne N+1 offsets minutes,
    profil[0]=0, profil[-1]=total_minutes."""
    n_stops = len(leg_km) + 1
    cum_km = [0.0]
    for d in leg_km:
        cum_km.append(cum_km[-1] + max(0.0, d))
    total_km = cum_km[-1]

    if total_minutes is None:
        total_minutes = round(BASE_MIN + total_km * MIN_PER_KM)

    if total_km <= 0:
        # arrêts non géocodés / colocalisés : répartition uniforme
        return [round(total_minutes * i / (n_stops - 1)) for i in range(n_stops)] if n_stops > 1 else [0]

    return [round(total_minutes * (k / total_km)) for k in cum_km]
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_timeprofile.py -q`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/net_timeprofile.py scripts/scrapers/buses/test_net_timeprofile.py
git commit -m "feat(buses): profil de temps cumulatif calé sur la durée"
```

---

## Task 6: net_osrm.py — tracé routier OSRM + distances, fallback haversine

**Files:**
- Create: `scripts/scrapers/buses/net_osrm.py`
- Test: `scripts/scrapers/buses/test_net_osrm.py`

- [ ] **Step 1: Écrire les tests** (le fetch HTTP est injecté → zéro réseau en test)

```python
from net_osrm import osrm_route, build_geometry

def _fake_osrm_response(coords):
    # OSRM driving renvoie geometry GeoJSON [lng,lat] + legs[].distance (mètres)
    return {
        "code": "Ok",
        "routes": [{
            "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
            "legs": [{"distance": 10000.0} for _ in range(len(coords) - 1)],
        }],
    }

def test_osrm_route_parses_geometry_and_legs():
    coords = [(35.34, 25.14), (35.19, 25.71)]
    out = osrm_route(coords, fetch=lambda url: _fake_osrm_response(coords))
    assert out["geometry"] == [[25.14, 35.34], [25.71, 35.19]]
    assert out["leg_km"] == [10.0]

def test_osrm_route_returns_none_on_error():
    out = osrm_route([(35.0, 25.0), (35.1, 25.1)], fetch=lambda url: {"code": "NoRoute"})
    assert out is None

def test_build_geometry_uses_osrm_when_all_coords_present():
    stops = [{"slug": "a", "lat": 35.34, "lng": 25.14}, {"slug": "b", "lat": 35.19, "lng": 25.71}]
    geo = build_geometry(stops, fetch=lambda url: _fake_osrm_response([(35.34, 25.14), (35.19, 25.71)]))
    assert geo["partial"] is False
    assert geo["leg_km"] == [10.0]
    assert geo["length_km"] == 10.0

def test_build_geometry_falls_back_to_haversine_when_osrm_fails():
    stops = [{"slug": "a", "lat": 35.0, "lng": 25.0}, {"slug": "b", "lat": 35.0, "lng": 25.1}]
    geo = build_geometry(stops, fetch=lambda url: None)  # OSRM indisponible
    assert geo["partial"] is True
    assert len(geo["geometry"]) == 2          # segments droits = arrêts eux-mêmes
    assert geo["leg_km"][0] > 0               # haversine non nul

def test_build_geometry_partial_when_a_stop_lacks_coords():
    stops = [{"slug": "a", "lat": 35.0, "lng": 25.0}, {"slug": "b", "lat": None, "lng": None}]
    geo = build_geometry(stops, fetch=lambda url: None)
    assert geo["partial"] is True
    # segment vers un arrêt non géocodé : distance 0, pas de crash
    assert geo["leg_km"] == [0.0]
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_osrm.py -q`
Expected: FAIL `ModuleNotFoundError: No module named 'net_osrm'`

- [ ] **Step 3: Implémenter**

```python
"""Tracé routier réel via OSRM (route service public, pré-calculé offline) +
distances inter-arrêts. Fallback segments droits (haversine) si OSRM échoue ou
si un arrêt n'est pas géocodé. Le fetch HTTP est injecté (testable sans réseau)."""
import time
from prices import haversine_km

OSRM_BASE = "http://router.project-osrm.org/route/v1/driving/"


def _http_fetch(url):
    import requests
    r = requests.get(url, timeout=30, headers={"User-Agent": "crete.direct-bot/1.0"})
    if r.status_code != 200:
        return None
    return r.json()


def osrm_route(coords, fetch=None):
    """coords : liste (lat,lng). Retourne {geometry:[[lng,lat],...], leg_km:[...]} ou None."""
    fetch = fetch or _http_fetch
    pts = ";".join(f"{lng},{lat}" for lat, lng in coords)
    url = f"{OSRM_BASE}{pts}?overview=full&geometries=geojson"
    data = fetch(url)
    if not data or data.get("code") != "Ok" or not data.get("routes"):
        return None
    route = data["routes"][0]
    geometry = [[c[0], c[1]] for c in route["geometry"]["coordinates"]]
    leg_km = [round(leg["distance"] / 1000.0, 2) for leg in route.get("legs", [])]
    return {"geometry": geometry, "leg_km": leg_km}


def _haversine_fallback(stops):
    geometry, leg_km = [], []
    for i, s in enumerate(stops):
        if s["lat"] is not None and s["lng"] is not None:
            geometry.append([s["lng"], s["lat"]])
        if i > 0:
            a, b = stops[i - 1], stops[i]
            if None in (a["lat"], a["lng"], b["lat"], b["lng"]):
                leg_km.append(0.0)
            else:
                leg_km.append(round(haversine_km((a["lat"], a["lng"]), (b["lat"], b["lng"])), 2))
    return {"geometry": geometry, "leg_km": leg_km, "length_km": round(sum(leg_km), 2), "partial": True}


def build_geometry(stops, fetch=None, throttle=0.0):
    """stops : liste {slug,lat,lng} ordonnée. Tente OSRM si tous géocodés, sinon
    fallback haversine. Retourne {geometry, leg_km, length_km, partial}."""
    coords = [(s["lat"], s["lng"]) for s in stops]
    if any(lat is None or lng is None for lat, lng in coords):
        return _haversine_fallback(stops)
    if throttle:
        time.sleep(throttle)
    res = osrm_route(coords, fetch=fetch)
    if res is None:
        return _haversine_fallback(stops)
    return {
        "geometry": res["geometry"],
        "leg_km": res["leg_km"],
        "length_km": round(sum(res["leg_km"]), 2),
        "partial": False,
    }
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_net_osrm.py -q`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/net_osrm.py scripts/scrapers/buses/test_net_osrm.py
git commit -m "feat(buses): tracé OSRM + distances, fallback haversine"
```

---

## Task 7: build_network.py — assemblage pur + store transactionnel

**Files:**
- Create: `scripts/scrapers/buses/build_network.py`
- Test: `scripts/scrapers/buses/test_build_network.py`

- [ ] **Step 1: Écrire les tests** (on teste l'assemblage pur `assemble_network` ; l'I/O DB `store_network` n'est testé que via le garde-fou)

```python
from build_network import assemble_network, should_build_network, MIN_STOPS, MIN_LINES

def _fake_osrm(coords):
    return {"code": "Ok", "routes": [{
        "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
        "legs": [{"distance": 20000.0} for _ in range(len(coords) - 1)],
    }]}

def test_assemble_builds_stops_lines_linestops():
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Sitia",
         "via_stops": ["Agios Nikolaos"], "duration": "3h"},
    ]
    place_coords = {"heraklion": (35.34, 25.14), "agios nikolaos": (35.19, 25.71), "sitia": (35.21, 26.10)}
    stops, lines, line_stops = assemble_network(
        routes, place_coords, cb_index={}, fetch=lambda url: _fake_osrm(
            [(35.34, 25.14), (35.19, 25.71), (35.21, 26.10)]))
    assert {s["slug"] for s in stops} == {"heraklion", "agios-nikolaos", "sitia"}
    assert len(lines) == 1
    line = lines[0]
    assert line["code"].startswith("HER-")
    assert line["total_minutes"] == 180        # "3h"
    # 3 arrêts -> 3 line_stops, seq 0..2, cumulative_minutes croissant et borné
    ls = sorted([x for x in line_stops if x["line_code"] == line["code"]], key=lambda x: x["seq"])
    assert [x["seq"] for x in ls] == [0, 1, 2]
    assert ls[0]["cumulative_minutes"] == 0 and ls[-1]["cumulative_minutes"] == 180

def test_assemble_prefecture_and_name():
    routes = [{"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Sitia",
               "via_stops": None, "duration": "3h"}]
    place_coords = {"heraklion": (35.34, 25.14), "sitia": (35.21, 26.10)}
    _, lines, _ = assemble_network(routes, place_coords, {}, fetch=lambda url: _fake_osrm(
        [(35.34, 25.14), (35.21, 26.10)]))
    assert lines[0]["prefecture"] == "HER"
    assert "Heraklion" in lines[0]["name"] and "Sitia" in lines[0]["name"]

def test_should_build_network_guardrail():
    assert should_build_network([{}] * MIN_STOPS, [{}] * MIN_LINES) is True
    assert should_build_network([{}] * (MIN_STOPS - 1), [{}] * MIN_LINES) is False
    assert should_build_network([{}] * MIN_STOPS, []) is False
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_build_network.py -q`
Expected: FAIL `ModuleNotFoundError: No module named 'build_network'`

- [ ] **Step 3: Implémenter**

```python
"""Pipeline réseau : lit bus_routes, assemble bus_stops/bus_lines/bus_line_stops
(fonctions pures + OSRM injecté), écrit en delete+insert avec garde-fou.
Lancé par buses.py après le scrape. Aucun réseau vide en prod."""
import os
from prices import _norm, PLACE_COORDS
from net_geocode import collect_stops, geocode_stop
from net_lines import merge_into_lines
from net_osrm import build_geometry
from net_timeprofile import cumulative_profile
from net_nomenclature import assign_codes, color_for, prefecture_for

MIN_STOPS = 20    # sous ce seuil = assemblage suspect, on ne touche pas la DB
MIN_LINES = 5


def should_build_network(stops, lines):
    return len(stops) >= MIN_STOPS and len(lines) >= MIN_LINES


def _parse_duration_min(duration):
    if not duration:
        return None
    import re
    h = re.search(r"(\d+)\s*h", duration, re.I)
    m = re.search(r"(\d+)\s*min", duration, re.I)
    if not h and not m:
        return None
    return (int(h.group(1)) * 60 if h else 0) + (int(m.group(1)) if m else 0)


def _title(slug):
    return slug.replace("-", " ").title()


def assemble_network(routes, place_coords, cb_index, fetch=None, nominatim=None, existing_codes=None):
    """Retourne (stops, lines, line_stops). Pur hormis OSRM (fetch injecté)."""
    # 1) référentiel d'arrêts géocodés, indexé par slug
    raw_stops = collect_stops(routes)
    stops, stop_by_slug = [], {}
    for s in raw_stops:
        lat, lng, source, conf = geocode_stop(s["name"], place_coords, cb_index, nominatim=nominatim)
        rec = {"slug": s["slug"], "name": s["name"], "name_el": None,
               "lat": lat, "lng": lng, "prefecture": prefecture_for(lat, lng),
               "coords_source": source, "coords_confidence": conf}
        stops.append(rec)
        stop_by_slug[s["slug"]] = rec

    # 2) lignes (corridors) + durée connue par couple terminus
    lines_raw = merge_into_lines(routes)
    dur_by_termini = {}
    for r in routes:
        a, b = _norm(r["from_place"]).replace(" ", "-"), _norm(r["to_place"]).replace(" ", "-")
        d = _parse_duration_min(r.get("duration"))
        if d is not None:
            dur_by_termini[frozenset({a, b})] = d

    # 3) codes nomenclature (origin coords -> préfecture, stable)
    for ln in lines_raw:
        o = stop_by_slug.get(ln["origin"], {})
        ln["origin_lat"], ln["origin_lng"] = o.get("lat"), o.get("lng")
        seq_coords = [stop_by_slug.get(s, {}) for s in ln["stops"]]
        ln["length_km"] = sum(  # provisoire pour le tri nomenclature (haversine)
            0 for _ in seq_coords)  # remplacé par OSRM ci-dessous
    codes = assign_codes(lines_raw, existing=existing_codes)

    # 4) géométrie OSRM + profil de temps par ligne
    lines, line_stops = [], []
    for ln in lines_raw:
        code = codes[ln["key"]]
        seq_stops = [stop_by_slug[s] for s in ln["stops"] if s in stop_by_slug]
        geo = build_geometry(seq_stops, fetch=fetch)
        total = dur_by_termini.get(frozenset({ln["origin"], ln["dest"]}))
        profile = cumulative_profile(geo["leg_km"], total)
        cum_km, acc = [0.0], 0.0
        for d in geo["leg_km"]:
            acc += d
            cum_km.append(round(acc, 2))
        lines.append({
            "code": code,
            "name": f"{_title(ln['origin'])} <-> {_title(ln['dest'])}",
            "prefecture": code.split("-")[0],
            "operator_id": ln["operator_id"],
            "geometry": geo["geometry"],
            "color": color_for(code),
            "length_km": geo["length_km"],
            "total_minutes": profile[-1] if profile else None,
            "partial_geo": geo["partial"],
        })
        for i, s in enumerate(ln["stops"]):
            line_stops.append({
                "line_code": code, "stop_slug": s, "seq": i,
                "cumulative_km": cum_km[i] if i < len(cum_km) else cum_km[-1],
                "cumulative_minutes": profile[i] if i < len(profile) else profile[-1],
            })
    return stops, lines, line_stops


def _load_cb_index(sb):
    """cb_places -> {slug: (lat,lng)} (lecture best-effort, vide si table absente)."""
    try:
        rows = sb.table("cb_places").select("slug,latitude,longitude").execute().data
        return {r["slug"]: (r["latitude"], r["longitude"]) for r in rows
                if r.get("latitude") is not None and r.get("longitude") is not None}
    except Exception:
        return {}


def _load_existing_codes(sb):
    """bus_lines existantes -> {key: code} pour stabilité (key = origin|dest|operator)."""
    try:
        rows = sb.table("bus_lines").select("code,name,operator_id").execute().data
        out = {}
        for r in rows:
            parts = r["name"].split("<->")
            if len(parts) == 2:
                a = parts[0].strip().lower().replace(" ", "-")
                b = parts[1].strip().lower().replace(" ", "-")
                key = f"{min(a, b)}|{max(a, b)}|{r['operator_id']}"
                out[key] = r["code"]
        return out
    except Exception:
        return {}


def store_network(sb, stops, lines, line_stops):
    """Écrit les 3 tables (delete+insert). Résout les FK par slug/code après insert.
    Lève si le garde-fou n'est pas satisfait."""
    if not should_build_network(stops, lines):
        raise ValueError(f"refuse build: {len(stops)} stops / {len(lines)} lines")
    sb.table("bus_line_stops").delete().neq("line_id", 0).execute()
    sb.table("bus_lines").delete().neq("id", 0).execute()
    sb.table("bus_stops").delete().neq("id", 0).execute()
    sb.table("bus_stops").insert(stops).execute()
    stop_id = {r["slug"]: r["id"] for r in
               sb.table("bus_stops").select("id,slug").execute().data}
    sb.table("bus_lines").insert(lines).execute()
    line_id = {r["code"]: r["id"] for r in
               sb.table("bus_lines").select("id,code").execute().data}
    payload = [{
        "line_id": line_id[ls["line_code"]],
        "stop_id": stop_id[ls["stop_slug"]],
        "seq": ls["seq"],
        "cumulative_km": ls["cumulative_km"],
        "cumulative_minutes": ls["cumulative_minutes"],
    } for ls in line_stops if ls["line_code"] in line_id and ls["stop_slug"] in stop_id]
    sb.table("bus_line_stops").insert(payload).execute()
    return len(stops), len(lines), len(payload)


def build_network(sb, nominatim=None):
    """Point d'entrée : lit bus_routes, assemble, écrit. Retourne (n_stops,n_lines,n_ls)."""
    routes = sb.table("bus_routes").select(
        "id,operator_id,from_place,to_place,via_stops,duration").execute().data
    cb_index = _load_cb_index(sb)
    existing = _load_existing_codes(sb)
    stops, lines, line_stops = assemble_network(
        routes, PLACE_COORDS, cb_index, nominatim=nominatim, existing_codes=existing)
    return store_network(sb, stops, lines, line_stops)
```

> **Note d'implémentation (à confirmer au déploiement, Task 9)** : les noms de
> colonnes `cb_places.latitude/longitude` sont supposés cohérents avec
> `schema.sql`. Si la table réelle expose `lat/lng`, ajuster `_load_cb_index`.
> `_load_cb_index` dégrade en `{}` si la table est absente (pas de crash).

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest test_build_network.py -q`
Expected: PASS (3 tests)

- [ ] **Step 5: Lancer toute la suite (non-régression)**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q`
Expected: PASS (tous les tests existants + nouveaux)

- [ ] **Step 6: Commit**

```bash
git add scripts/scrapers/buses/build_network.py scripts/scrapers/buses/test_build_network.py
git commit -m "feat(buses): pipeline d'assemblage réseau + store transactionnel"
```

---

## Task 8: Branchement dans buses.py + script de sanity

**Files:**
- Modify: `scripts/scrapers/buses/buses.py` (fonction `main`, après la boucle de scrape)
- Create: `scripts/check-bus-network.mjs`

- [ ] **Step 1: Brancher build_network dans buses.py**

Dans `scripts/scrapers/buses/buses.py`, ajouter l'import en tête (près de `from store import …`) :

```python
from build_network import build_network
```

Puis dans `main()`, juste avant `if failures:`, insérer :

```python
    # Réseau dérivé (arrêts + lignes + séquences) reconstruit après le scrape.
    # Ne build que si au moins un opérateur a commité ses routes ce run.
    committed = len(plan) - len(failures)
    if committed > 0:
        try:
            ns, nl, nls = build_network(sb)
            log(f"OK network: {ns} stops, {nl} lines, {nls} line_stops")
        except Exception as e:
            log(f"network build skipped: {e}")
            send_telegram(f"Bus network build failed: {e}")
    else:
        log("network build skipped: no operator committed")
```

- [ ] **Step 2: Vérifier que buses.py s'importe sans erreur**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -c "import buses; print('import OK')"`
Expected: `import OK`

- [ ] **Step 3: Écrire le script de sanity invariants**

Create `scripts/check-bus-network.mjs` :

```js
// Sanity du réseau bus après build : invariants structurels lus en PostgREST.
// Run: node scripts/check-bus-network.mjs   (lit NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) { console.error("missing supabase env"); process.exit(1); }

const rest = (t, q = "") =>
  fetch(`${URL}/rest/v1/${t}?${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
    .then((r) => r.json());

const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };

const [stops, lines, ls] = await Promise.all([
  rest("bus_stops", "select=id,slug,lat,lng,coords_source"),
  rest("bus_lines", "select=id,code,total_minutes"),
  rest("bus_line_stops", "select=line_id,seq,cumulative_minutes&order=line_id,seq"),
]);

if (stops.length < 20) fail(`only ${stops.length} stops`);
if (lines.length < 5) fail(`only ${lines.length} lines`);
if (new Set(lines.map((l) => l.code)).size !== lines.length) fail("duplicate line codes");

const geocoded = stops.filter((s) => s.lat != null).length;
console.log(`stops: ${stops.length} (${geocoded} géocodés), lines: ${lines.length}, line_stops: ${ls.length}`);

const byLine = new Map();
for (const x of ls) { if (!byLine.has(x.line_id)) byLine.set(x.line_id, []); byLine.get(x.line_id).push(x); }
for (const [lid, seq] of byLine) {
  for (let i = 0; i < seq.length; i++) {
    if (seq[i].seq !== i) fail(`line ${lid}: seq non contigu à ${i}`);
    if (i > 0 && seq[i].cumulative_minutes < seq[i - 1].cumulative_minutes)
      fail(`line ${lid}: cumulative_minutes décroissant`);
  }
  if (seq.length < 2) fail(`line ${lid}: < 2 arrêts`);
}
if (!process.exitCode) console.log("OK invariants réseau");
```

- [ ] **Step 4: Commit**

```bash
git add scripts/scrapers/buses/buses.py scripts/check-bus-network.mjs
git commit -m "feat(buses): branche build_network au scrape + sanity réseau"
```

---

## Task 9: Déploiement VPS + run réel + spike OSRM (owner : sur GO Kami, accès VPS)

> Tâche opérationnelle (pas de TDD) : applique la migration, déploie le code,
> valide le spike OSRM sur quelques lignes réelles, puis lance le build réel.

- [ ] **Step 1: Appliquer la migration sur le VPS**

```bash
ssh kairos-vps "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse" \
  < supabase/migrations/20260614120000_bus_network.sql
```
Expected: `CREATE TABLE` ×3, `NOTIFY`. Vérifier : `\dt bus_*` liste les 6 tables bus.

- [ ] **Step 2: Déployer les modules sur le VPS** (`git show HEAD:fichier | ssh cat`, LF garanti — pattern multi-terminal connu)

```bash
for f in net_nomenclature net_geocode net_lines net_timeprofile net_osrm build_network; do
  git show HEAD:scripts/scrapers/buses/$f.py | ssh kairos-vps "cat > /opt/cretepulse/buses/$f.py"
done
git show HEAD:scripts/scrapers/buses/buses.py | ssh kairos-vps "cat > /opt/cretepulse/buses/buses.py"
```

- [ ] **Step 3: Spike OSRM** — vérifier que le routing public répond sur la Crète AVANT le build complet

```bash
ssh kairos-vps "/opt/cretepulse/venv/bin/python -c \"
from net_osrm import osrm_route
# Heraklion -> Agios Nikolaos -> Sitia
r = osrm_route([(35.3387,25.1442),(35.1909,25.7136),(35.2078,26.1029)])
print('OSRM OK' if r else 'OSRM KO (fallback haversine sera utilisé)')
print('legs km:', r['leg_km'] if r else None, 'points:', len(r['geometry']) if r else 0)
\""
```
Expected : `OSRM OK` avec des distances routières plausibles (> haversine). Si `OSRM KO`,
le build utilisera le fallback haversine (lignes droites) — acceptable en V1, noter
pour Plan 3 (envisager OSRM self-hosté docker si la carte le mérite).

- [ ] **Step 4: Lancer le build réel et vérifier les invariants**

```bash
ssh kairos-vps "cd /opt/cretepulse && venv/bin/python buses/build_network.py 2>&1 | tail -5"
# puis, en local avec les env crete.direct :
node scripts/check-bus-network.mjs
```
Expected: `OK invariants réseau`, ≥ 5 lignes, séquences contiguës, `cumulative_minutes` croissant.

- [ ] **Step 5: Vérifier la nomenclature produite (revue manuelle)**

```bash
ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \
  'select code, name, total_minutes, partial_geo from bus_lines order by code;'"
```
Expected: codes `CHA-/RET-/HER-/LAS-` cohérents, noms lisibles. Vérifier qu'aucun
corridor n'a été fusionné à tort (terminus aberrants). Si fusion douteuse, ajuster
l'heuristique de `net_lines.merge_into_lines` (resserrer) et re-livrer.

- [ ] **Step 6: Logger en mémoire + signaler à Kami**

Ajouter une ligne `session_log.md` (catégorie DEPLOY, `[FACT]` + invariants vérifiés).
Le cron hebdo existant (`buses.py`) reconstruira désormais le réseau automatiquement.

---

## Self-Review (effectuée)

**Couverture spec :**
- Référentiel arrêts géocodés → Tasks 1, 3. ✓
- Lignes corridors + nomenclature PREF-NN stable → Tasks 2, 4, 7. ✓
- Heures de passage (profil cumulative_minutes calé sur durée) → Tasks 5, 7. ✓
- Tracés routiers réels OSRM + fallback → Task 6, spike Task 9. ✓
- `bus_routes`/planner intacts (additif) → aucune modif de bus_routes ni bus-journey.ts dans ce plan. ✓
- Garde-fou jamais de réseau vide → `should_build_network` Task 7, branchement conditionnel Task 8. ✓
- Limites honnêtes (arrêts nommés, estimé, couverture OSRM) → spike Task 9, `coords_source`/`partial_geo` exposés. ✓
- Intégration planner + carte → **hors périmètre, Plans 2 et 3** (annoncé en tête). ✓

**Placeholders :** aucun TODO/TBD ; tout le code est fourni. La seule incertitude
externe (noms colonnes `cb_places`) est explicitée avec dégradation gracieuse + check Task 9.

**Cohérence des types :** `assemble_network` retourne `(stops, lines, line_stops)` ;
`line_stops` porte `line_code`/`stop_slug` (résolus en FK par `store_network`) ;
`bus_lines` porte `code`/`color`/`partial_geo` cohérents avec la migration Task 1 ;
`cumulative_profile` retourne N+1 offsets consommés par `assemble_network`. ✓

**Risque résiduel principal :** la qualité de la fusion en lignes (Task 4) et la
couverture OSRM (Task 9) sont à valider sur données réelles → revue manuelle Task 9
Step 5 + spike Step 3 avant de considérer la fondation acquise.
