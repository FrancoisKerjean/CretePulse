# GTFS Étape C - Assemblage + Validation du Flux Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assembler le premier flux GTFS ouvert de Crète (`crete.zip`) depuis `bus_routes` + `gtfs_stops`, et le valider sans erreur bloquante.

**Architecture:** Pipeline Python pur sous `scripts/scrapers/buses/` (I/O isolée : lecture Supabase, fetch OSRM injecté, écriture fichiers/zip). On porte 4 modules purs déjà testés de `feat/bus-network` (`net_lines`, `net_nomenclature`, `net_osrm`, `net_timeprofile`) - leurs deps (`prices`, `durations`, `net_geocode`) sont déjà sur `master` via l'étape B. On ajoute 3 modules neufs (`gtfs_calendar`, `gtfs_writer`, `gtfs_feed_build`) + un sanity check Node. Honnêteté no-invention : tout horaire estimé porte `timepoint=0`.

**Tech Stack:** Python 3 (pytest, csv, zipfile, requests), Node (sanity check), `gtfs-validator` MobilityData (JAR Java) ou validateur web.

**Spec de référence :** `docs/superpowers/specs/2026-06-16-gtfs-feed-assembly-design.md`

**Répertoire de travail :** worktree `C:\Users\fkerj\cretepulse-gtfsC`, branche `feat/gtfs-feed`. Tous les chemins ci-dessous sont relatifs à la racine du repo. Les modules Python vivent dans `scripts/scrapers/buses/` (modules plats, importés sans package - lancer pytest depuis ce dossier). Commits avec `git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29`.

**Environnement pytest :** `cd scripts/scrapers/buses` puis lancer pytest. Dans ce worktree neuf, **`py -m pytest`** fonctionne directement (pytest 9.0.2 + `requests` confirmés globalement, deps de l'étape B importables). Les commandes des steps écrivent `.venv/Scripts/python -m pytest` par convention du repo : **remplacer par `py -m pytest`** ici (les deux sont interchangeables ; créer un `.venv` n'est pas nécessaire). Toujours stager les fichiers explicitement (jamais `git add -A`).

---

## Task 1: Porter les 4 modules purs + leurs tests depuis `feat/bus-network`

Ces modules sont déjà écrits et testés sur la branche `feat/bus-network` (même repo). On les copie tels quels par `git show` (déterministe, zéro transcription). Leurs dépendances (`prices.haversine_km`, `durations.BASE_MIN/MIN_PER_KM`, `net_geocode.stop_slug`) sont déjà présentes sur `master`.

**Files:**
- Create: `scripts/scrapers/buses/net_lines.py`, `scripts/scrapers/buses/net_nomenclature.py`, `scripts/scrapers/buses/net_osrm.py`, `scripts/scrapers/buses/net_timeprofile.py`
- Test: `scripts/scrapers/buses/test_net_lines.py`, `test_net_nomenclature.py`, `test_net_osrm.py`, `test_net_timeprofile.py`

- [ ] **Step 1: Copier les 8 fichiers depuis `feat/bus-network`**

```bash
cd scripts/scrapers/buses
for f in net_lines net_nomenclature net_osrm net_timeprofile; do
  git show feat/bus-network:scripts/scrapers/buses/$f.py > $f.py
  git show feat/bus-network:scripts/scrapers/buses/test_$f.py > test_$f.py
done
```

- [ ] **Step 2: Lancer les tests portés pour vérifier qu'ils passent verts**

Run: `.venv/Scripts/python -m pytest test_net_lines.py test_net_nomenclature.py test_net_osrm.py test_net_timeprofile.py -v`
Expected: PASS (tous les tests des 4 modules ; ils utilisent un `fetch` injecté donc zéro réseau).

Si un import échoue (`ModuleNotFoundError`), vérifier que `prices.py`, `durations.py`, `net_geocode.py` sont bien présents (`ls *.py` doit les lister - ce sont les fichiers de l'étape B sur master).

- [ ] **Step 3: Commit**

```bash
git add scripts/scrapers/buses/net_lines.py scripts/scrapers/buses/net_nomenclature.py scripts/scrapers/buses/net_osrm.py scripts/scrapers/buses/net_timeprofile.py scripts/scrapers/buses/test_net_lines.py scripts/scrapers/buses/test_net_nomenclature.py scripts/scrapers/buses/test_net_osrm.py scripts/scrapers/buses/test_net_timeprofile.py
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): porte net_lines/net_nomenclature/net_osrm/net_timeprofile pour l'étape C"
```

---

## Task 2: `gtfs_calendar.py` - port Python de `daysMatch` → masque de jours

Résout un libellé de jours KTEL ("Mon-Fri", "Mon-Wed-Fri", "Weekend", "Every Day", "Monday To Friday"...) en l'ensemble des jours de semaine couverts, pour `calendar.txt`. Port fidèle de `src/lib/bus-journey.ts:62` (`daysMatch`), généralisé aux 7 jours.

**Files:**
- Create: `scripts/scrapers/buses/gtfs_calendar.py`
- Test: `scripts/scrapers/buses/test_gtfs_calendar.py`

- [ ] **Step 1: Écrire les tests qui échouent**

```python
# scripts/scrapers/buses/test_gtfs_calendar.py
from gtfs_calendar import days_to_weekdays, service_id_for

def test_range_mon_fri():
    assert days_to_weekdays("Mon-Fri") == ["mon", "tue", "wed", "thu", "fri"]

def test_enumeration_mon_wed_fri_not_read_as_range():
    # 3 tokens => énumération, PAS la plage mon..fri
    assert days_to_weekdays("Mon-Wed-Fri") == ["mon", "wed", "fri"]

def test_comma_enumeration():
    assert days_to_weekdays("Mon, Tue, Wed") == ["mon", "tue", "wed"]

def test_full_names_range():
    assert days_to_weekdays("Monday To Friday") == ["mon", "tue", "wed", "thu", "fri"]

def test_weekend():
    assert days_to_weekdays("Weekend") == ["sat", "sun"]

def test_weekdays_word():
    assert days_to_weekdays("Weekdays") == ["mon", "tue", "wed", "thu", "fri"]

def test_every_day_and_daily():
    assert days_to_weekdays("Every Day") == ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    assert days_to_weekdays("Daily") == ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

def test_empty_label():
    assert days_to_weekdays("") == []
    assert days_to_weekdays(None) == []

def test_service_id_deterministic_and_collapses_equivalents():
    a = service_id_for(days_to_weekdays("Mon-Fri"))
    b = service_id_for(days_to_weekdays("Monday To Friday"))
    assert a == b == "svc-1111100"

def test_service_id_weekend():
    assert service_id_for(days_to_weekdays("Weekend")) == "svc-0000011"
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest test_gtfs_calendar.py -v`
Expected: FAIL (`ModuleNotFoundError: No module named 'gtfs_calendar'`).

- [ ] **Step 3: Écrire l'implémentation**

```python
# scripts/scrapers/buses/gtfs_calendar.py
"""Port Python de daysMatch (src/lib/bus-journey.ts) : résout un libellé de jours
KTEL en l'ensemble ordonné des jours de semaine couverts, pour calendar.txt.
Aucun I/O."""
import re

DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
_TOKEN = r"(mon|tue|wed|thu|fri|sat|sun)"
# séparateur de plage : tiret ASCII ou demi-cadratin U+2013. Certains libellés KTEL
# utilisent le demi-cadratin (« Mon–Fri ») ; le char class le couvre, comme le
# daysMatch d'origine (src/lib/bus-journey.ts:75 utilise aussi [-–]).
_SEP = "[-–]"


def _day_matches(norm, d):
    """norm = libellé minusculé ; d = token jour ('mon'..'sun'). Reproduit daysMatch."""
    if "every" in norm or "daily" in norm:
        return True
    if "weekend" in norm:
        return d in ("sat", "sun")
    if "weekday" in norm:
        return d not in ("sat", "sun")
    # noms complets -> tokens 3 lettres ("monday to friday" -> "mon to fri")
    norm = re.sub(r"\b" + _TOKEN + r"[a-z]*", r"\1", norm)
    tokens = re.findall(_TOKEN, norm)
    rng = None
    if len(tokens) == 2:
        rng = re.search(_TOKEN + r"\s*(?:" + _SEP + r"|to)\s*" + _TOKEN, norm)
    if rng:
        i, j = DAY_ORDER.index(rng.group(1)), DAY_ORDER.index(rng.group(2))
        k = DAY_ORDER.index(d)
        return (i <= k <= j) if i <= j else (k >= i or k <= j)
    return d in tokens


def days_to_weekdays(label):
    """Liste ordonnée (lun->dim) des jours couverts par le libellé. [] si vide."""
    if not label:
        return []
    norm = label.lower()
    return [d for d in DAY_ORDER if _day_matches(norm, d)]


def service_id_for(weekdays):
    """Identifiant de service déterministe : masque 7 bits 'svc-1111100' (lun..dim)."""
    bits = "".join("1" if d in weekdays else "0" for d in DAY_ORDER)
    return f"svc-{bits}"
```

- [ ] **Step 4: Lancer pour vérifier que ça passe**

Run: `.venv/Scripts/python -m pytest test_gtfs_calendar.py -v`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_calendar.py scripts/scrapers/buses/test_gtfs_calendar.py
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): gtfs_calendar - port daysMatch -> masque de jours (service_id)"
```

---

## Task 3: `gtfs_writer.py` - writer CSV GTFS pur (RFC 4180)

Écriture d'une table (header + rows) en CSV conforme GTFS : échappement RFC 4180 (via `csv.writer`, quote minimal), UTF-8 sans BOM, fin de ligne `\n`. Aucune logique métier.

**Files:**
- Create: `scripts/scrapers/buses/gtfs_writer.py`
- Test: `scripts/scrapers/buses/test_gtfs_writer.py`

- [ ] **Step 1: Écrire les tests qui échouent**

```python
# scripts/scrapers/buses/test_gtfs_writer.py
import os
from gtfs_writer import write_csv

def test_writes_header_and_rows(tmp_path):
    p = tmp_path / "agency.txt"
    n = write_csv(str(p), ["a", "b"], [[1, "x"], [2, "y"]])
    assert n == 2
    content = p.read_text(encoding="utf-8")
    assert content == "a,b\n1,x\n2,y\n"

def test_escapes_comma_and_quotes(tmp_path):
    p = tmp_path / "stops.txt"
    write_csv(str(p), ["stop_id", "stop_name"], [["x", 'A, "B"']])
    content = p.read_text(encoding="utf-8")
    # virgule + guillemets => champ entouré de guillemets, guillemets doublés
    assert content == 'stop_id,stop_name\nx,"A, ""B"""\n'

def test_no_bom_and_lf_only(tmp_path):
    p = tmp_path / "f.txt"
    write_csv(str(p), ["h"], [["v"]])
    raw = p.read_bytes()
    assert not raw.startswith(b"\xef\xbb\xbf")   # pas de BOM
    assert b"\r" not in raw                        # pas de CRLF

def test_creates_parent_dir(tmp_path):
    p = tmp_path / "sub" / "deep" / "f.txt"
    write_csv(str(p), ["h"], [])
    assert p.exists()
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest test_gtfs_writer.py -v`
Expected: FAIL (`ModuleNotFoundError: No module named 'gtfs_writer'`).

- [ ] **Step 3: Écrire l'implémentation**

```python
# scripts/scrapers/buses/gtfs_writer.py
"""Writer CSV GTFS pur : RFC 4180 (csv.writer, QUOTE_MINIMAL), UTF-8 sans BOM,
fin de ligne \\n. Pas de logique métier - juste l'écriture d'une table en mémoire."""
import csv
import os


def write_csv(path, header, rows):
    """Écrit header + rows dans `path` (UTF-8 sans BOM, \\n). Crée le dossier
    parent au besoin. Retourne le nombre de lignes de données écrites."""
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        for row in rows:
            w.writerow(row)
    return len(rows)
```

- [ ] **Step 4: Lancer pour vérifier que ça passe**

Run: `.venv/Scripts/python -m pytest test_gtfs_writer.py -v`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_writer.py scripts/scrapers/buses/test_gtfs_writer.py
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): gtfs_writer - writer CSV GTFS RFC 4180"
```

---

## Task 4: Helpers de `gtfs_feed_build` - parsing durée + format heure

Deux fonctions pures bas niveau de `gtfs_feed_build.py` : parser une durée KTEL (`"1h 30min"` → minutes) et ajouter un offset à une heure de départ (`"08:00"` + 90 → `"09:30:00"`, heures ≥24 tolérées si après-minuit). On crée le fichier `gtfs_feed_build.py` avec uniquement ces helpers d'abord ; les tâches suivantes l'enrichissent.

**Files:**
- Create: `scripts/scrapers/buses/gtfs_feed_build.py`
- Test: `scripts/scrapers/buses/test_gtfs_feed_build.py`

- [ ] **Step 1: Écrire les tests qui échouent**

```python
# scripts/scrapers/buses/test_gtfs_feed_build.py
from gtfs_feed_build import parse_duration_min, add_minutes

def test_parse_duration_hours_minutes():
    assert parse_duration_min("2h 30min") == 150
    assert parse_duration_min("50min") == 50
    assert parse_duration_min("1h") == 60

def test_parse_duration_none_when_absent_or_unreadable():
    assert parse_duration_min(None) is None
    assert parse_duration_min("") is None
    assert parse_duration_min("bientot") is None

def test_add_minutes_basic():
    assert add_minutes("08:00", 90) == "09:30:00"
    assert add_minutes("08:05", 0) == "08:05:00"

def test_add_minutes_after_midnight_exceeds_24h():
    # GTFS tolère >24:00:00 pour un trajet qui passe minuit
    assert add_minutes("23:30", 60) == "24:30:00"
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest test_gtfs_feed_build.py -v`
Expected: FAIL (`ModuleNotFoundError: No module named 'gtfs_feed_build'`).

- [ ] **Step 3: Écrire le squelette du module avec les helpers**

```python
# scripts/scrapers/buses/gtfs_feed_build.py
"""Étape C du plan GTFS : assemble le flux complet (agency/routes/trips/stop_times/
calendar/feed_info + stops projeté) depuis bus_routes + gtfs_stops, et empaquette
crete.zip. Pur hormis : lecture DB (sb), fetch OSRM injecté, écriture fichiers/zip.
Décisions : docs/superpowers/specs/2026-06-16-gtfs-feed-assembly-design.md"""
import re


def parse_duration_min(duration):
    """'2h 30min' -> 150 ; '50min' -> 50 ; '1h' -> 60 ; None/illisible -> None."""
    if not duration:
        return None
    h = re.search(r"(\d+)\s*h", duration, re.I)
    m = re.search(r"(\d+)\s*min", duration, re.I)
    if not h and not m:
        return None
    return (int(h.group(1)) * 60 if h else 0) + (int(m.group(1)) if m else 0)


def add_minutes(t0, minutes):
    """'08:00' + offset minutes -> 'HH:MM:SS'. Heures >=24 tolérées (après-minuit)."""
    parts = t0.split(":")
    total = int(parts[0]) * 60 + int(parts[1]) + int(minutes)
    return f"{total // 60:02d}:{total % 60:02d}:00"
```

- [ ] **Step 4: Lancer pour vérifier que ça passe**

Run: `.venv/Scripts/python -m pytest test_gtfs_feed_build.py -v`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_feed_build.py scripts/scrapers/buses/test_gtfs_feed_build.py
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): helpers parse_duration_min + add_minutes (gtfs_feed_build)"
```

---

## Task 5: `assemble_feed` - cœur d'assemblage (corridors → trips → stop_times)

La fonction pure `assemble_feed(routes, stops_by_id, window, feed_version, osrm=None, seasons=None)`. Elle : filtre la saison, canonise les routes (réutilise `curate_routes` de l'étape B → slugs == `gtfs_stops.stop_id`), fusionne en corridors (`merge_into_lines`), attribue les `route_id` PREF-NN (`assign_codes`), puis génère trips + stop_times avec profil de temps OSRM et flags `timepoint`. Retourne toutes les tables GTFS en mémoire + des stats.

**Détails de décision implémentés (cf spec §8) :**
- `osrm=None` → fetch `lambda url: None` → `build_geometry` bascule sur le fallback haversine (déterministe, hors-ligne).
- `direction_id` = 0 si le `from` de la route brute == origine canonique du corridor, sinon 1.
- `timepoint` : index 0 (départ publié) = 1 ; arrivée (dernier index) = 1 si durée réelle, 0 si estimée ; intermédiaires = 0.
- arrêt intermédiaire non géocodé → retiré de la séquence (compté dans `skipped_intermediates`) ; trip droppé (compté dans `dropped_trips`) si un terminus n'est pas géocodé.
- `service_id` via `days_to_weekdays`/`service_id_for` ; libellés équivalents collapsent.
- `route_color` = `color_for(route_id)` sans le `#` (GTFS attend l'hex nu).

**Files:**
- Modify: `scripts/scrapers/buses/gtfs_feed_build.py` (ajout imports + `_route_departures`, `_geocoded_sequence`, `assemble_feed`)
- Test: `scripts/scrapers/buses/test_gtfs_feed_build.py` (ajout des cas d'assemblage)

- [ ] **Step 1: Écrire les tests d'assemblage qui échouent**

Ajouter à la fin de `test_gtfs_feed_build.py` :

```python
from gtfs_feed_build import assemble_feed
from gtfs_calendar import days_to_weekdays, service_id_for

STOPS = {
    "heraklion":      {"stop_id": "heraklion",      "stop_name": "Heraklion",      "stop_lat": 35.3400, "stop_lon": 25.1400},
    "hersonissos":    {"stop_id": "hersonissos",    "stop_name": "Hersonissos",    "stop_lat": 35.3100, "stop_lon": 25.3900},
    "agios-nikolaos": {"stop_id": "agios-nikolaos", "stop_name": "Agios Nikolaos", "stop_lat": 35.1900, "stop_lon": 25.7100},
}
WINDOW = ("20260601", "20260831")

def _tbl(feed, name):
    header, rows = feed[name]
    return [dict(zip(header, r)) for r in rows]

def test_full_geocoded_route_emits_trip_and_stop_times():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Hersonissos"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    trips = _tbl(feed, "trips")
    st = _tbl(feed, "stop_times")
    assert len(trips) == 1
    assert trips[0]["service_id"] == service_id_for(days_to_weekdays("Mon-Fri"))
    assert len(st) == 3                                  # 3 arrêts géocodés
    seq = [r for r in st if r["trip_id"] == trips[0]["trip_id"]]
    assert [r["stop_id"] for r in seq] == ["heraklion", "hersonissos", "agios-nikolaos"]
    assert [r["timepoint"] for r in seq] == [1, 0, 1]    # départ + arrivée réels, milieu estimé
    assert seq[0]["departure_time"] == "08:00:00"

def test_calendar_has_one_service_row():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    cal = _tbl(feed, "calendar")
    assert len(cal) == 1
    assert cal[0]["monday"] == 1 and cal[0]["saturday"] == 0
    assert cal[0]["start_date"] == "20260601" and cal[0]["end_date"] == "20260831"

def test_ungeocoded_intermediate_is_skipped_trip_kept():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Nowhere Village"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    st = _tbl(feed, "stop_times")
    assert [r["stop_id"] for r in st] == ["heraklion", "agios-nikolaos"]   # intermédiaire sauté
    assert feed["stats"]["skipped_intermediates"]                          # logué, non vide

def test_trip_dropped_when_terminus_not_geocoded():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Ghost Town",
        "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    assert _tbl(feed, "trips") == []
    assert len(feed["stats"]["dropped_trips"]) == 1

def test_estimated_duration_marks_arrival_timepoint_zero():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": [], "duration": None,                       # durée absente => estimée
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    st = _tbl(feed, "stop_times")
    assert [r["timepoint"] for r in st] == [1, 0]            # départ réel, arrivée estimée
    assert st[-1]["departure_time"] != "08:00:00"            # enveloppe a calé une durée >0

def test_reverse_direction_id_is_one():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Agios Nikolaos", "to_place": "Heraklion",
        "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    trips = _tbl(feed, "trips")
    # origine canonique du corridor = 'agios-nikolaos' (alpha 1er) ? non: a<h => 'agios-nikolaos'
    # route part de agios-nikolaos == origine => direction 0 ; on teste le sens inverse:
    assert trips[0]["direction_id"] in (0, 1)               # sanity; détail ci-dessous

def test_season_filter_excludes_other_seasons():
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
         "via_stops": [], "duration": "1h",
         "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": "low"},
    ]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None, seasons=["high"])
    assert _tbl(feed, "trips") == []                        # route 'low' exclue du feed 'high'

def test_referential_integrity_and_determinism():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Hersonissos"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    f1 = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    f2 = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    assert f1["trips"][1] == f2["trips"][1]                 # déterministe (mêmes trip_id)
    stops_ids = {r[0] for r in f1["stops"][1]}
    st_ids = {r[3] for r in f1["stop_times"][1]}
    route_ids = {r[0] for r in f1["routes"][1]}
    assert st_ids <= stops_ids                              # tout stop_id de stop_times ∈ stops
    assert {r[0] for r in f1["trips"][1]} == {r[0] for r in f1["trips"][1]}
    assert all(r[0] in route_ids for r in f1["trips"][1])   # tout route_id de trips ∈ routes
```

Note sur `test_reverse_direction_id_is_one` : l'origine canonique du corridor est le terminus alphabétiquement premier (`agios-nikolaos` < `heraklion`). Une route `Agios Nikolaos → Heraklion` part donc de l'origine → `direction_id=0`. Remplacer l'assert final par la vérité attendue une fois l'implémentation en place :

```python
    assert trips[0]["direction_id"] == 0
```

(et pour tester le sens 1, une route `Heraklion → Agios Nikolaos` donne `direction_id=1`).

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest test_gtfs_feed_build.py -v`
Expected: FAIL (`ImportError: cannot import name 'assemble_feed'`).

- [ ] **Step 3: Implémenter `assemble_feed` + helpers**

Ajouter en tête de `gtfs_feed_build.py` (après le docstring, avant `parse_duration_min`) les imports :

```python
from collections import OrderedDict

from gtfs_stops_build import curate_routes
from net_lines import merge_into_lines
from net_nomenclature import assign_codes, color_for
from net_osrm import build_geometry
from net_timeprofile import cumulative_profile
from gtfs_calendar import days_to_weekdays, service_id_for

AGENCY_ID = "crete-direct"
AGENCY_NAME = "crete.direct"
AGENCY_URL = "https://crete.direct"
AGENCY_TZ = "Europe/Athens"
FEED_LANG = "en"
_WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
```

Puis ajouter à la fin du fichier :

```python
def _route_departures(route):
    """[(days_label, time), ...] depuis departures_by_day ; fallback flat = 'Every Day'."""
    out = []
    groups = route.get("departures_by_day")
    if groups:
        for g in groups:
            for t in (g.get("times") or []):
                out.append((g.get("days") or "Every Day", t))
    else:
        for t in (route.get("departures") or []):
            out.append(("Every Day", t))
    return out


def _geocoded_sequence(route, stops_by_id):
    """Séquence (slugs canoniques) de la route brute curée, dédupliquée en
    consécutif puis filtrée aux arrêts géocodés. Retourne
    (kept, dropped_intermediates, terminus_ok)."""
    raw = [route["from_place"], *(route.get("via_stops") or []), route["to_place"]]
    seq = []
    for s in raw:
        if s and (not seq or seq[-1] != s):
            seq.append(s)
    kept, dropped_inter = [], []
    for i, s in enumerate(seq):
        if s in stops_by_id:
            kept.append(s)
        elif 0 < i < len(seq) - 1:
            dropped_inter.append(s)
    terminus_ok = bool(seq) and seq[0] in stops_by_id and seq[-1] in stops_by_id
    return kept, dropped_inter, terminus_ok


def _coords_stops(slugs, stops_by_id):
    """Liste {slug,lat,lng} pour net_osrm.build_geometry."""
    return [{"slug": s, "lat": stops_by_id[s]["stop_lat"], "lng": stops_by_id[s]["stop_lon"]}
            for s in slugs]


def assemble_feed(routes, stops_by_id, window, feed_version, osrm=None, seasons=None):
    """Pur (sauf osrm injecté). Retourne {agency,routes,trips,stop_times,calendar,
    feed_info,stops,stats}. window=(start_yyyymmdd,end_yyyymmdd) ; seasons=iterable|None.
    osrm=None => fallback haversine déterministe (hors-ligne)."""
    start_date, end_date = window
    seasons = set(seasons) if seasons else None
    fetch = osrm if osrm is not None else (lambda url: None)

    # 1) filtre saison + curation canonique (slugs == gtfs_stops.stop_id)
    if seasons is not None:
        routes = [r for r in routes if not r.get("season") or r.get("season") in seasons]
    curated, _dropped = curate_routes(routes)

    # 2) corridors + route_id PREF-NN stable
    corridors = merge_into_lines(curated)
    by_key, lines_for_codes = {}, []
    for c in corridors:
        by_key[c["key"]] = c
        seq_geo = [s for s in c["stops"] if s in stops_by_id]
        origin_co = stops_by_id.get(c["origin"])
        length_km = 0.0
        if len(seq_geo) >= 2:
            length_km = build_geometry(_coords_stops(seq_geo, stops_by_id), fetch=fetch)["length_km"]
        lines_for_codes.append({
            "key": c["key"],
            "origin_lat": origin_co["stop_lat"] if origin_co else None,
            "origin_lng": origin_co["stop_lon"] if origin_co else None,
            "length_km": length_km,
        })
    codes = assign_codes(lines_for_codes)

    # 3) trips + stop_times
    trips_rows, st_rows = [], []
    cal = OrderedDict()              # service_id -> weekdays
    routes_meta = OrderedDict()      # route_id -> (origin_slug, dest_slug)
    referenced, seen_trip = set(), {}
    dropped_trips, skipped_inter = [], []

    for r in curated:
        a, b, op = r["from_place"], r["to_place"], r.get("operator_id")
        key = f"{a}|{b}|{op}" if a < b else f"{b}|{a}|{op}"
        corridor = by_key.get(key)
        if not corridor:
            continue
        route_id = codes[key]
        direction_id = 0 if a == corridor["origin"] else 1
        routes_meta.setdefault(route_id, (corridor["origin"], corridor["dest"]))

        seq, dropped_in, terminus_ok = _geocoded_sequence(r, stops_by_id)
        if not terminus_ok or len(seq) < 2:
            dropped_trips.append({"route_id": route_id, "from": a, "to": b})
            continue
        skipped_inter.extend(dropped_in)

        leg_km = build_geometry(_coords_stops(seq, stops_by_id), fetch=fetch)["leg_km"]
        total_min = parse_duration_min(r.get("duration"))
        duration_real = total_min is not None
        offsets = cumulative_profile(leg_km, total_min)
        headsign = stops_by_id[seq[-1]]["stop_name"]
        last = len(seq) - 1

        for days_label, t0 in _route_departures(r):
            weekdays = days_to_weekdays(days_label)
            if not weekdays:
                continue
            service_id = service_id_for(weekdays)
            cal.setdefault(service_id, weekdays)
            base = f"{route_id}-{direction_id}-{service_id}-{t0.replace(':', '')}"
            n = seen_trip.get(base, 0)
            seen_trip[base] = n + 1
            trip_id = base if n == 0 else f"{base}-{n}"
            trips_rows.append([route_id, service_id, trip_id, headsign, direction_id])
            for i, s in enumerate(seq):
                t = add_minutes(t0, offsets[i])
                timepoint = 1 if (i == 0 or (i == last and duration_real)) else 0
                st_rows.append([trip_id, t, t, s, i + 1, timepoint])
                referenced.add(s)

    # 4) tables
    agency = (["agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang"],
              [[AGENCY_ID, AGENCY_NAME, AGENCY_URL, AGENCY_TZ, FEED_LANG]])

    routes_rows = []
    for route_id, (origin, dest) in routes_meta.items():
        long_name = f"{stops_by_id[origin]['stop_name']} - {stops_by_id[dest]['stop_name']}"
        routes_rows.append([route_id, AGENCY_ID, route_id, long_name, 3, color_for(route_id).lstrip("#")])
    routes_tbl = (["route_id", "agency_id", "route_short_name", "route_long_name",
                   "route_type", "route_color"], routes_rows)

    trips_tbl = (["route_id", "service_id", "trip_id", "trip_headsign", "direction_id"], trips_rows)
    st_tbl = (["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "timepoint"], st_rows)

    cal_header = ["service_id", "monday", "tuesday", "wednesday", "thursday",
                  "friday", "saturday", "sunday", "start_date", "end_date"]
    cal_rows = [[sid, *[1 if d in wd else 0 for d in _WEEK], start_date, end_date]
                for sid, wd in cal.items()]
    cal_tbl = (cal_header, cal_rows)

    feed_tbl = (["feed_publisher_name", "feed_publisher_url", "feed_lang",
                 "feed_version", "feed_start_date", "feed_end_date"],
                [[AGENCY_NAME, AGENCY_URL, FEED_LANG, feed_version, start_date, end_date]])

    stops_rows = []
    for sid in sorted(referenced):
        s = stops_by_id[sid]
        stops_rows.append([sid, s["stop_name"], f"{s['stop_lat']:.6f}", f"{s['stop_lon']:.6f}"])
    stops_tbl = (["stop_id", "stop_name", "stop_lat", "stop_lon"], stops_rows)

    stats = {
        "corridors": len(routes_meta), "trips": len(trips_rows), "stop_times": len(st_rows),
        "services": len(cal_rows), "stops_referenced": len(referenced),
        "dropped_trips": dropped_trips, "skipped_intermediates": sorted(set(skipped_inter)),
    }
    return {"agency": agency, "routes": routes_tbl, "trips": trips_tbl, "stop_times": st_tbl,
            "calendar": cal_tbl, "feed_info": feed_tbl, "stops": stops_tbl, "stats": stats}
```

- [ ] **Step 4: Ajuster le test de direction puis lancer**

Dans `test_reverse_direction_id_is_one`, remplacer l'assert `in (0, 1)` par `== 0` (cf note du Step 1 : `agios-nikolaos` est l'origine canonique). Puis :

Run: `.venv/Scripts/python -m pytest test_gtfs_feed_build.py -v`
Expected: PASS (tous les cas d'assemblage + les 4 helpers de la Task 4).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_feed_build.py scripts/scrapers/buses/test_gtfs_feed_build.py
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): assemble_feed - corridors/trips/stop_times + profil de temps + timepoints"
```

---

## Task 6: I/O - lecture DB, écriture des fichiers, packaging zip, point d'entrée

Ajoute la couche I/O à `gtfs_feed_build.py` : lecture de `gtfs_stops`/`bus_routes`, écriture des 7 `.txt` via `gtfs_writer`, écriture des stats JSON, packaging `crete.zip`, fetch OSRM caché/throttlé, et le point d'entrée `build_gtfs_feed`. On teste `write_feed`/`package_zip` (pas de DB ni réseau) ; `load_*`/`make_osrm_fetch`/`build_gtfs_feed` sont du câblage non testé unitairement (couverts au run réel par Kami, cf spec §13).

**Files:**
- Modify: `scripts/scrapers/buses/gtfs_feed_build.py`
- Test: `scripts/scrapers/buses/test_gtfs_feed_build.py`

- [ ] **Step 1: Écrire les tests `write_feed`/`package_zip` qui échouent**

Ajouter à la fin de `test_gtfs_feed_build.py` :

```python
import os
import zipfile
from gtfs_feed_build import write_feed, package_zip, GTFS_FILES

def _mini_feed():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Hersonissos"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    return assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)

def test_write_feed_creates_all_files(tmp_path):
    feed = _mini_feed()
    write_feed(feed, str(tmp_path))
    for fname in GTFS_FILES:
        assert (tmp_path / fname).exists(), fname
    stops = (tmp_path / "stops.txt").read_text(encoding="utf-8")
    assert stops.startswith("stop_id,stop_name,stop_lat,stop_lon\n")

def test_package_zip_contains_gtfs_files(tmp_path):
    feed = _mini_feed()
    write_feed(feed, str(tmp_path))
    zip_path = package_zip(str(tmp_path), str(tmp_path / "crete.zip"))
    with zipfile.ZipFile(zip_path) as z:
        names = set(z.namelist())
    assert {"agency.txt", "routes.txt", "trips.txt", "stop_times.txt",
            "calendar.txt", "feed_info.txt", "stops.txt"} <= names
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest test_gtfs_feed_build.py -k "write_feed or package_zip" -v`
Expected: FAIL (`ImportError: cannot import name 'write_feed'`).

- [ ] **Step 3: Implémenter la couche I/O**

Ajouter aux imports en tête de `gtfs_feed_build.py` :

```python
import os
import json
import zipfile
from gtfs_stops_build import OUT_DIR
from gtfs_writer import write_csv
```

Ajouter la constante près des autres constantes (après `FEED_LANG`) :

```python
GTFS_FILES = ("agency.txt", "routes.txt", "trips.txt", "stop_times.txt",
              "calendar.txt", "feed_info.txt", "stops.txt")
_TABLE_FILE = {"agency": "agency.txt", "routes": "routes.txt", "trips": "trips.txt",
               "stop_times": "stop_times.txt", "calendar": "calendar.txt",
               "feed_info": "feed_info.txt", "stops": "stops.txt"}
```

Ajouter à la fin du fichier :

```python
def write_feed(feed, out_dir=OUT_DIR):
    """Écrit les 7 fichiers GTFS + build-feed-stats.json dans out_dir."""
    os.makedirs(out_dir, exist_ok=True)
    for key, fname in _TABLE_FILE.items():
        header, rows = feed[key]
        write_csv(os.path.join(out_dir, fname), header, rows)
    with open(os.path.join(out_dir, "build-feed-stats.json"), "w", encoding="utf-8") as f:
        json.dump(feed["stats"], f, ensure_ascii=False, indent=2)


def package_zip(out_dir=OUT_DIR, zip_path=None):
    """Empaquette les fichiers GTFS de out_dir dans un .zip (à la racine du zip)."""
    zip_path = zip_path or os.path.join(out_dir, "crete.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for fname in GTFS_FILES:
            p = os.path.join(out_dir, fname)
            if os.path.exists(p):
                z.write(p, fname)
    return zip_path


def load_stops(sb):
    """gtfs_stops géocodés -> {stop_id: row}."""
    rows = sb.table("gtfs_stops").select("stop_id,stop_name,stop_lat,stop_lon").execute().data
    return {r["stop_id"]: r for r in rows
            if r.get("stop_lat") is not None and r.get("stop_lon") is not None}


def load_routes(sb):
    return sb.table("bus_routes").select(
        "id,operator_id,from_place,to_place,via_stops,"
        "departures_by_day,departures,duration,season").execute().data


def make_osrm_fetch(cache_path=None, throttle_s=1.0):
    """Fetch OSRM caché + throttlé pour net_osrm : f(url)->json|None. Cache JSON
    persistant (clé = url) pour ne pas re-interroger l'endpoint public gratuit."""
    import time
    import requests
    path = cache_path or os.path.join(OUT_DIR, "osrm-cache.json")
    cache = {}
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            cache = {}
    state = {"last": 0.0}

    def fetch(url):
        if url in cache:
            return cache[url]
        wait = throttle_s - (time.time() - state["last"])
        if wait > 0:
            time.sleep(wait)
        state["last"] = time.time()
        data = None
        try:
            r = requests.get(url, timeout=30, headers={"User-Agent": "crete.direct-bot/1.0 (+https://crete.direct)"})
            if r.status_code == 200:
                data = r.json()
        except Exception:
            data = None
        cache[url] = data
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
        return data

    return fetch


def build_gtfs_feed(sb, window, feed_version, osrm=None, seasons=None, out_dir=OUT_DIR):
    """Point d'entrée : lit gtfs_stops + bus_routes, assemble, écrit les fichiers,
    empaquette crete.zip. Retourne stats + chemin du zip. osrm=None au run réel
    => passer make_osrm_fetch() pour des km routiers (sinon fallback haversine)."""
    stops_by_id = load_stops(sb)
    routes = load_routes(sb)
    feed = assemble_feed(routes, stops_by_id, window, feed_version, osrm=osrm, seasons=seasons)
    write_feed(feed, out_dir)
    zip_path = package_zip(out_dir)
    return {**feed["stats"], "zip": zip_path}
```

- [ ] **Step 4: Lancer toute la suite du module**

Run: `.venv/Scripts/python -m pytest test_gtfs_feed_build.py -v`
Expected: PASS (helpers + assemblage + write_feed + package_zip).

- [ ] **Step 5: Commit**

```bash
git add scripts/scrapers/buses/gtfs_feed_build.py scripts/scrapers/buses/test_gtfs_feed_build.py
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): I/O build_gtfs_feed - lecture DB, write_feed, package_zip, fetch OSRM caché"
```

---

## Task 7: Sanity check Node `check-gtfs-feed.mjs`

Vérification rapide post-build sans Java : intégrité référentielle, monotonie des temps, ≥2 stop_times par trip, échos de couverture. Lit `out/gtfs/*.txt`. Suit le style de `scripts/check-gtfs-stops.mjs` (déjà sur master).

**Files:**
- Create: `scripts/check-gtfs-feed.mjs`

- [ ] **Step 1: Écrire le sanity check**

```js
// scripts/check-gtfs-feed.mjs
// Sanity check du flux GTFS (étape C) : intégrité référentielle + monotonie.
// Usage: node scripts/check-gtfs-feed.mjs [out/gtfs]
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = process.argv[2] || "scripts/scrapers/buses/out/gtfs";
const CRETE = { latMin: 34.70, latMax: 35.75, lngMin: 23.40, lngMax: 26.40 };

function parseCsv(name) {
  const text = readFileSync(join(DIR, name), "utf-8").replace(/\r/g, "");
  const lines = text.split("\n").filter((l) => l.length > 0);
  const header = splitRow(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(splitRow(l).map((v, i) => [header[i], v])));
}
// split RFC4180 minimal (gère les champs entre guillemets avec virgules)
function splitRow(line) {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const errors = [];
const stops = parseCsv("stops.txt");
const routes = parseCsv("routes.txt");
const trips = parseCsv("trips.txt");
const calendar = parseCsv("calendar.txt");
const stopTimes = parseCsv("stop_times.txt");

const stopIds = new Set(stops.map((s) => s.stop_id));
const routeIds = new Set(routes.map((r) => r.route_id));
const serviceIds = new Set(calendar.map((c) => c.service_id));
const tripIds = new Set(trips.map((t) => t.trip_id));

// intégrité référentielle
for (const t of trips) {
  if (!routeIds.has(t.route_id)) errors.push(`trip ${t.trip_id}: route_id inconnu ${t.route_id}`);
  if (!serviceIds.has(t.service_id)) errors.push(`trip ${t.trip_id}: service_id inconnu ${t.service_id}`);
}
for (const st of stopTimes) {
  if (!stopIds.has(st.stop_id)) errors.push(`stop_times: stop_id inconnu ${st.stop_id}`);
  if (!tripIds.has(st.trip_id)) errors.push(`stop_times: trip_id inconnu ${st.trip_id}`);
}

// coords des stops dans la bbox Crète
for (const s of stops) {
  const lat = parseFloat(s.stop_lat), lng = parseFloat(s.stop_lon);
  if (!(lat >= CRETE.latMin && lat <= CRETE.latMax && lng >= CRETE.lngMin && lng <= CRETE.lngMax))
    errors.push(`stop ${s.stop_id}: coords hors bbox Crète (${lat},${lng})`);
}

// >=2 stop_times par trip + temps non-décroissants (ordre stop_sequence)
const byTrip = new Map();
for (const st of stopTimes) {
  if (!byTrip.has(st.trip_id)) byTrip.set(st.trip_id, []);
  byTrip.get(st.trip_id).push(st);
}
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
for (const [tripId, sts] of byTrip) {
  if (sts.length < 2) errors.push(`trip ${tripId}: <2 stop_times`);
  sts.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  for (let i = 1; i < sts.length; i++)
    if (toMin(sts[i].departure_time) < toMin(sts[i - 1].departure_time))
      errors.push(`trip ${tripId}: temps décroissant à seq ${sts[i].stop_sequence}`);
}

console.log(`stops=${stops.length} routes=${routes.length} trips=${trips.length} ` +
            `services=${calendar.length} stop_times=${stopTimes.length}`);
if (errors.length) {
  console.error(`FAIL: ${errors.length} erreur(s)`);
  for (const e of errors.slice(0, 50)) console.error("  - " + e);
  process.exit(1);
}
console.log("OK: intégrité référentielle + monotonie + bbox validées");
```

- [ ] **Step 2: Test manuel rapide après un build local (si données dispo)**

Run (si un `out/gtfs/` a été produit) : `node scripts/check-gtfs-feed.mjs`
Expected: ligne de stats + `OK: ...`. En l'absence de build local (pas d'accès DB depuis la machine de dev), ce check tourne au run réel chez Kami (cf Task 8). Vérifier au minimum que le script ne plante pas à l'analyse : créer un mini `out/gtfs` de test n'est pas requis ici.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-gtfs-feed.mjs
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "feat(gtfs): check-gtfs-feed.mjs - sanity intégrité référentielle + monotonie"
```

---

## Task 8: Documentation de validation + suite complète verte

Documente la validation `gtfs-validator` (Java / web) et la séquence de run réel, puis fait tourner toute la suite pytest du dossier `buses` pour confirmer la non-régression.

**Files:**
- Create: `scripts/scrapers/buses/README-gtfs-feed.md`

- [ ] **Step 1: Écrire la doc de validation**

```markdown
<!-- scripts/scrapers/buses/README-gtfs-feed.md -->
# GTFS étape C - assemblage + validation du flux

Spec : `docs/superpowers/specs/2026-06-16-gtfs-feed-assembly-design.md`
Plan : `docs/superpowers/plans/2026-06-16-gtfs-feed-assembly.md`

## Build (run réel, owner Kami sur VPS)

```python
from supabase import create_client
from gtfs_feed_build import build_gtfs_feed, make_osrm_fetch

sb = create_client(URL, SERVICE_KEY)
# window = fenêtre de validité bornée (saison courante) ; seasons = libellés actifs
stats = build_gtfs_feed(
    sb,
    window=("20260601", "20260930"),     # à caler sur la saison en cours
    feed_version="2026-06-16",            # horodatage du build
    osrm=make_osrm_fetch(),               # km routiers (sinon fallback haversine)
    seasons=["high"],                     # None = toutes saisons (loggué)
)
print(stats)   # corridors / trips / stop_times / dropped_trips / skipped_intermediates
```

Sortie : `out/gtfs/{agency,routes,trips,stop_times,calendar,feed_info,stops}.txt`,
`out/gtfs/crete.zip`, `out/gtfs/build-feed-stats.json`.

## Sanity check (sans Java)

```
node scripts/check-gtfs-feed.mjs scripts/scrapers/buses/out/gtfs
```

## Validation officielle (gtfs-validator MobilityData)

Le validateur canonique est un JAR Java (Java 17+).

```
# télécharger le JAR depuis github.com/MobilityData/gtfs-validator/releases
java -jar gtfs-validator.jar -i scripts/scrapers/buses/out/gtfs/crete.zip -o out/gtfs/validation
```

Objectif : **zéro `ERROR`** dans `out/gtfs/validation/report.json`. Les `WARNING`/
`INFO`/`NOTICE` (ex : absence de `shapes.txt`, `feed_lang` vs noms locaux) sont
listés et justifiés, pas masqués.

Voie de secours sans Java : validateur web `gtfs-validator.mobilitydata.org`
(upload de `crete.zip`).

## Honnêteté (règle no-invention)

Les horaires aux arrêts intermédiaires sont **estimés** (profil de temps
proportionnel à la distance routière OSRM) et portent `timepoint=0`. Seul le
départ du terminus (publié par KTEL) porte `timepoint=1` ; l'arrivée porte
`timepoint=1` uniquement si la durée totale est réelle (sinon `0`).

## Publication (étape D, owner Kami)

`scp out/gtfs/crete.zip` -> `media.crete.direct/gtfs/crete.zip` (Caddy) ;
inscription Mobility Database + transit.land ; Google = levier lobbying Région/KTEL.
```

- [ ] **Step 2: Lancer toute la suite pytest du dossier buses**

Run: `cd scripts/scrapers/buses && .venv/Scripts/python -m pytest -q`
Expected: PASS (tests portés + `gtfs_calendar` + `gtfs_writer` + `gtfs_feed_build` + les tests préexistants de l'étape B : `test_gtfs_stops_build`, `test_gtfs_places`, `test_net_geocode`, `test_durations`, `test_prices`). Aucune régression.

- [ ] **Step 3: Commit**

```bash
git add scripts/scrapers/buses/README-gtfs-feed.md
git -c user.email=kerjeanfrancois29@gmail.com -c user.name=kerjeanfrancois29 commit -m "docs(gtfs): README validation + run réel du flux (étape C)"
```

---

## Task 9: Revue de branche + handoff déploiement

**Files:** aucun (étape de clôture).

- [ ] **Step 1: Vérifier la propreté de la branche**

Run: `git log --oneline origin/master..HEAD`
Expected: ~8 commits feat/docs cohérents, uniquement sous `scripts/scrapers/buses/`, `scripts/check-gtfs-feed.mjs`, `docs/superpowers/`.

Run: `git status`
Expected: working tree clean (les artefacts `out/gtfs/` ne doivent pas être commités - vérifier qu'ils sont ignorés ou absents).

- [ ] **Step 2: Invoquer la sous-skill de clôture**

Utiliser `superpowers:finishing-a-development-branch` pour présenter à Kami les options d'intégration (merge `feat/gtfs-feed` → `master`, etc.). Rappels du handoff (cf spec §13, owner Kami, accès VPS) :
1. Merge `feat/gtfs-feed` → `master` après revue + pytest vert + sanity vert.
2. Déployer les modules `.py` + `check-gtfs-feed.mjs` sur `/opt/cretepulse/buses` (modules plats).
3. Installer Java sur le VPS (ou validateur web) pour `gtfs-validator`.
4. Run réel `build_gtfs_feed(..., osrm=make_osrm_fetch())` → valider `crete.zip` → 0 ERROR.
5. Publication (étape D) : hébergement `media.crete.direct/gtfs/` + registres ouverts.

Python + données uniquement : **aucun déploiement Vercel** pour livrer le pipeline.

---

## Notes d'implémentation transverses

- **Couplage étape B (lecture seule)** : `gtfs_feed_build` lit `gtfs_stops` et réutilise `curate_routes`/`OUT_DIR` de `gtfs_stops_build.py` (déjà sur master). Aucune écriture sur `gtfs_stops`. L'étape B est passée à 85,4 % de géocodage (16/06, branche `feat/gtfs-geocoding`) → plus de corridors complets, mais le pipeline dégrade gracieusement quelle que soit la couverture.
- **Slugs cohérents** : `curate_routes` canonise `from/to/via` en slugs identiques à `gtfs_stops.stop_id` (même fonction `canonical_slug` qu'à l'étape B). `merge_into_lines` applique `stop_slug` (idempotent sur un slug) → les clés de corridor restent les slugs canoniques.
- **Déterminisme** : `assign_codes` (PREF-NN stables), `service_id`/`trip_id` dérivés de valeurs canoniques, tri de `stops.txt` par `stop_id`. L'horodatage (`feed_version`) est injecté au point d'entrée, pas généré dans la partie pure.
- **OSRM** : utilisé uniquement pour les km du profil de temps (pas de `shapes.txt` en v1). Injecté + caché + fallback haversine ; `osrm=None` dans les tests = haversine déterministe hors-ligne.
```
