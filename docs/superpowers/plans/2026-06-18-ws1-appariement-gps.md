# WS1 — Appariement bus KTEL↔OSM par GPS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rattacher les trajets KTEL aux lignes OSM par **proximité de coordonnées** (et non par identité de noms), pour rallumer les trajets/lignes aujourd'hui non appariés (≈165 trajets sans tracé, 64 lignes sans horaire — dont les axes touristiques Heraklion↔Rethymno, Elafonisi, Falasarna, Samaria, Preveli, Sfakia).

**Architecture :** On garde le matching strict par noms existant comme **passe 1** (rapide, correct quand les noms coïncident) et on ajoute une **passe 2 GPS** qui ne traite QUE les trajets non appariés (`gaps`). La passe 2 résout les coordonnées des deux terminus KTEL (cascade `PLACE_COORDS` → `cb_places` → Nominatim sous garde-fou) puis choisit la ligne OSM dont les deux extrémités sont les plus proches (haversine, sous seuil). Additif et réversible : la passe 2 ne fait qu'AJOUTER des `line_id` à des trajets qui en étaient dépourvus — elle ne peut pas casser un appariement existant.

**Tech Stack :** Python 3 + pytest. Pipeline bus sous `scripts/scrapers/buses/`. Déploiement = VPS `/opt/cretepulse` + cron `run_apparier.py` (PAS Vercel).

**Cible branche :** `feat/bus-network` (worktree `C:/Users/fkerj/cretepulse-bus-network`) — c'est là que vivent `ktel_match.py`/`ktel_resolve.py`/`ktel_apparier.py` (jamais mergés sur master). Créer une branche `feat/appariement-gps` PARTANT de `feat/bus-network`.

**Spec :** `docs/superpowers/specs/2026-06-17-near-me-arret-centre-design.md` §5 WS1 (approche révisée GPS).

---

## Contexte du code existant (vérifié 18/06)

- `ktel_match.py:9` — `match_routes_to_lines(routes, lines, stops_by_slug, aliases, place_coords) -> (matched: dict[route_id -> line_id], gaps: dict[key -> list[route]])`. Match strict : `index[(line["operator_id"], frozenset({line["origin"], line["dest"]}))] = line["id"]` ; pour chaque route, `a=resolve(from_place)`, `b=resolve(to_place)`, match si `index.get((operator, frozenset({a,b})))`. Non-match → `gaps`.
- `ktel_resolve.py:17` — `resolve(name, stops_by_slug, aliases, place_coords)` : cascade exact slug → alias JSON → `place_coords[_norm(name)]` → stop OSM le plus proche < `MAX_COORDS_KM=5.0`. Expose `haversine_km(a, b)`.
- `prices.py:73` — `PLACE_COORDS: dict[str, tuple[lat,lng]]` (~120 lieux, clé = `_norm(name)` = `name.lower().strip()`).
- `stops_by_slug` — `dict[slug -> {"slug","name","lat","lng",...}]` (coords OSM haute précision).
- `lines` (objets passés à match) — chaque ligne a `id, operator_id, origin (slug), dest (slug)`. Les coords des extrémités = `stops_by_slug[line["origin"]]` / `[line["dest"]]`.
- `ktel_apparier.py:19` — `assemble_apparier(...)` appelle `match_routes_to_lines(...)` puis écrit `sb.table("bus_routes").update({"line_id": line_id}).in_("id", route_ids)`.
- `gtfs_stops_build.py` — contient déjà une cascade de géocodage (`PLACE_COORDS` → `cb_places` → Nominatim `"<name>, Crete, Greece"` sous garde-fou de cohérence < 45 km d'un stop sûr de la même route). À réutiliser comme référence pour le geocode des terminus KTEL.
- Tests : pytest, fichiers `test_ktel_match.py`, `test_ktel_resolve.py`, `test_ktel_apparier.py`. Fixture `fixtures/ktel_routes_sample.json`.

---

## File Structure

- **Create** `scripts/scrapers/buses/ktel_geo.py` — module pur GPS : `endpoint_coords()` (cascade coords d'un nom KTEL) + `match_gaps_by_gps()` (appariement géométrique des trajets non résolus). Zéro I/O (le géocodage Nominatim est injecté en paramètre `geocode`).
- **Create** `scripts/scrapers/buses/test_ktel_geo.py` — pytest du module.
- **Modify** `scripts/scrapers/buses/ktel_apparier.py` — après la passe 1, exécuter la passe 2 GPS sur les `gaps`, fusionner les `matched`, logguer les compteurs.
- **Modify** `scripts/scrapers/buses/test_ktel_apparier.py` — couvrir l'enchaînement passe 1 + passe 2.

`ktel_match.py` / `ktel_resolve.py` ne sont PAS modifiés (passe 1 inchangée = non-régression).

---

## Task 1 : `ktel_geo.py` — coords d'un terminus KTEL

**Files:**
- Create: `scripts/scrapers/buses/ktel_geo.py`
- Test: `scripts/scrapers/buses/test_ktel_geo.py`

- [ ] **Step 1 : test qui échoue**

Create `scripts/scrapers/buses/test_ktel_geo.py` :

```python
from ktel_geo import endpoint_coords

PLACE = {"heraklion": (35.3387, 25.1442), "rethymno": (35.3647, 24.4737)}
CB = {"elafonisi": (35.2716, 23.5400)}

def test_endpoint_from_place_coords():
    assert endpoint_coords("Heraklion", PLACE, CB, None) == (35.3387, 25.1442)

def test_endpoint_norm_caseinsensitive():
    assert endpoint_coords("  RETHYMNO ", PLACE, CB, None) == (35.3647, 24.4737)

def test_endpoint_from_cb_fallback():
    assert endpoint_coords("Elafonisi", PLACE, CB, None) == (35.2716, 23.5400)

def test_endpoint_geocode_last_resort():
    called = {}
    def geocode(name):
        called["n"] = name
        return (35.51, 24.02)  # Falasarna approx
    assert endpoint_coords("Falasarna", PLACE, CB, geocode) == (35.51, 24.02)
    assert called["n"] == "Falasarna"

def test_endpoint_unknown_returns_none():
    assert endpoint_coords("Nowhere XYZ", PLACE, CB, None) is None
```

- [ ] **Step 2 : lancer → échec**

Run (depuis `scripts/scrapers/buses/`) : `python -m pytest test_ktel_geo.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'ktel_geo'`.

- [ ] **Step 3 : implémenter**

Create `scripts/scrapers/buses/ktel_geo.py` :

```python
"""Appariement GPS des trajets KTEL aux lignes OSM (passe 2, sur les non-résolus).
Pur : le géocodage réseau est injecté (param `geocode`), rien d'autre ne fait d'I/O.
La géographie remplace l'identité de noms (translittérations KTEL/OSM incohérentes).
"""
from ktel_resolve import haversine_km


def _norm(name):
    return name.lower().strip()


def endpoint_coords(name, place_coords, cb_coords=None, geocode=None):
    """Coordonnées (lat,lng) d'un terminus KTEL, cascade référentiel → cb → géocode.
    `geocode` : callable(name)->(lat,lng)|None, optionnel (Nominatim sous garde-fou)."""
    if not name:
        return None
    key = _norm(name)
    if key in place_coords:
        return place_coords[key]
    if cb_coords and key in cb_coords:
        return cb_coords[key]
    if geocode is not None:
        c = geocode(name)
        if c and c[0] is not None and c[1] is not None:
            return (c[0], c[1])
    return None
```

- [ ] **Step 4 : lancer → succès**

Run : `python -m pytest test_ktel_geo.py -q`
Expected: PASS (5 passed).

- [ ] **Step 5 : commit**

```bash
git add scripts/scrapers/buses/ktel_geo.py scripts/scrapers/buses/test_ktel_geo.py
git commit -m "feat(bus): ktel_geo.endpoint_coords (coords terminus KTEL, cascade referentiel/cb/geocode)"
```

---

## Task 2 : `match_gaps_by_gps()` — appariement géométrique des non-résolus

**Files:**
- Modify: `scripts/scrapers/buses/ktel_geo.py`
- Test: `scripts/scrapers/buses/test_ktel_geo.py`

- [ ] **Step 1 : test qui échoue**

Append to `test_ktel_geo.py` :

```python
from ktel_geo import match_gaps_by_gps

# 2 lignes OSM, coords d'extrémités via stops_by_slug
STOPS = {
    "erakleio":  {"slug": "erakleio",  "lat": 35.3387, "lng": 25.1442},
    "rethumno":  {"slug": "rethumno",  "lat": 35.3647, "lng": 24.4737},
    "khania":    {"slug": "khania",    "lat": 35.5138, "lng": 24.0180},
}
LINES = [
    {"id": 2, "operator_id": "ektel", "origin": "erakleio", "dest": "rethumno"},
    {"id": 3, "operator_id": "ektel", "origin": "rethumno", "dest": "khania"},
]
# Terminus KTEL orthographiés AUTREMENT que les slugs OSM, mais coords connues.
PLACE = {"heraklion": (35.3390, 25.1440), "rethymno": (35.3650, 24.4740),
         "chania": (35.5140, 24.0182)}

def route(rid, frm, to, op="ektel"):
    return {"id": rid, "operator_id": op, "from_place": frm, "to_place": to}

def test_gps_matches_despite_name_mismatch():
    # "Heraklion"/"Rethymno" (KTEL) -> ligne 2 (erakleio/rethumno OSM) par coords
    gaps = [route(10, "Heraklion", "Rethymno")]
    matched = match_gaps_by_gps(gaps, LINES, STOPS, PLACE, max_km=3.0)
    assert matched == {10: 2}

def test_gps_orientation_symmetric():
    # sens inverse -> même ligne
    matched = match_gaps_by_gps([route(11, "Rethymno", "Heraklion")], LINES, STOPS, PLACE, max_km=3.0)
    assert matched == {11: 2}

def test_gps_no_match_when_far():
    PLACE2 = {"heraklion": (35.3390, 25.1440), "faraway": (36.9, 22.0)}
    matched = match_gaps_by_gps([route(12, "Heraklion", "Faraway")], LINES, STOPS, PLACE2, max_km=3.0)
    assert matched == {}

def test_gps_operator_isolation():
    # route herlas ne matche pas une ligne ektel même si coords collent
    matched = match_gaps_by_gps([route(13, "Heraklion", "Rethymno", op="herlas")], LINES, STOPS, PLACE, max_km=3.0)
    assert matched == {}

def test_gps_unknown_coords_skipped():
    matched = match_gaps_by_gps([route(14, "Heraklion", "Nowhere")], LINES, STOPS, PLACE, max_km=3.0)
    assert matched == {}
```

- [ ] **Step 2 : lancer → échec**

Run : `python -m pytest test_ktel_geo.py -q`
Expected: FAIL — `cannot import name 'match_gaps_by_gps'`.

- [ ] **Step 3 : implémenter**

Append to `ktel_geo.py` :

```python
def _line_endpoints(line, stops_by_slug):
    """Coords (lat,lng) des 2 extrémités d'une ligne OSM, via ses slugs origin/dest."""
    o = stops_by_slug.get(line.get("origin"))
    d = stops_by_slug.get(line.get("dest"))
    if not o or not d:
        return None
    if o.get("lat") is None or d.get("lat") is None:
        return None
    return ((o["lat"], o["lng"]), (d["lat"], d["lng"]))


def match_gaps_by_gps(gap_routes, lines, stops_by_slug, place_coords,
                      cb_coords=None, geocode=None, max_km=3.0):
    """Apparie par GPS les trajets non résolus par le match strict.
    Pour chaque trajet : coords A/B des terminus KTEL ; on choisit la ligne du MÊME
    opérateur dont les 2 extrémités sont les plus proches de {A,B} (les deux paires
    sous `max_km`). Additif : ne renvoie QUE des (route_id -> line_id) nouveaux.
    """
    # pré-calcul des extrémités par opérateur
    by_op = {}
    for ln in lines:
        ep = _line_endpoints(ln, stops_by_slug)
        if ep:
            by_op.setdefault(ln["operator_id"], []).append((ln["id"], ep[0], ep[1]))

    matched = {}
    for r in gap_routes:
        a = endpoint_coords(r.get("from_place"), place_coords, cb_coords, geocode)
        b = endpoint_coords(r.get("to_place"), place_coords, cb_coords, geocode)
        if not a or not b:
            continue
        best_id, best_cost = None, None
        for line_id, e1, e2 in by_op.get(r.get("operator_id"), []):
            # 2 orientations possibles ; coût = somme des distances, chaque paire < max_km
            fwd = max(haversine_km(a, e1), haversine_km(b, e2))
            rev = max(haversine_km(a, e2), haversine_km(b, e1))
            cost = min(fwd, rev)
            if cost <= max_km and (best_cost is None or cost < best_cost):
                best_id, best_cost = line_id, cost
        if best_id is not None:
            matched[r["id"]] = best_id
    return matched
```

- [ ] **Step 4 : lancer → succès**

Run : `python -m pytest test_ktel_geo.py -q`
Expected: PASS (10 passed).

- [ ] **Step 5 : commit**

```bash
git add scripts/scrapers/buses/ktel_geo.py scripts/scrapers/buses/test_ktel_geo.py
git commit -m "feat(bus): match_gaps_by_gps (appariement geometrique des trajets non resolus)"
```

---

## Task 3 : brancher la passe 2 GPS dans `ktel_apparier.py`

**Files:**
- Modify: `scripts/scrapers/buses/ktel_apparier.py`
- Test: `scripts/scrapers/buses/test_ktel_apparier.py`

- [ ] **Step 1 : lire `ktel_apparier.py`** et repérer `assemble_apparier()` (≈ ligne 19) où `match_routes_to_lines(...)` est appelé et où `matched`/`gaps` sont produits.

- [ ] **Step 2 : test qui échoue**

Dans `test_ktel_apparier.py`, ajouter un cas : un trajet dont les noms ne résolvent PAS (donc `gaps` en passe 1) mais dont les coords matchent une ligne → après `assemble_apparier`, il a un `line_id`. Construire la fixture avec `stops_by_slug` coordonné + `place_coords` couvrant les terminus du trajet, et asserter que le `matched` final contient l'id du trajet. (Suivre le style des tests existants du fichier ; injecter `geocode=None`.)

Run : `python -m pytest test_ktel_apparier.py -q` → FAIL (le trajet reste non apparié, passe 2 absente).

- [ ] **Step 3 : implémenter le câblage**

Dans `assemble_apparier()`, juste après l'obtention de `(matched, gaps)` de la passe 1 et AVANT l'écriture DB, insérer :

```python
from ktel_geo import match_gaps_by_gps  # en tête de fichier avec les autres imports

# Passe 2 GPS : rattrape les trajets non résolus par le match strict.
gap_routes = [r for routes_list in gaps.values() for r in routes_list]
gps_matched = match_gaps_by_gps(
    gap_routes, osm_lines, stops_by_slug, place_coords,
    cb_coords=cb_coords, geocode=geocode_fn, max_km=3.0,
)
matched.update(gps_matched)  # additif : n'écrase aucun match de la passe 1
print(f"[apparier] passe1={len(matched) - len(gps_matched)} passe2_gps={len(gps_matched)} "
      f"restants={len(gap_routes) - len(gps_matched)}")
```

Notes d'intégration :
- `osm_lines`, `stops_by_slug`, `place_coords` sont déjà chargés dans `assemble_apparier` (ce sont les arguments de `match_routes_to_lines`). Réutiliser les mêmes variables.
- `cb_coords` : si un dict cb_places coords est déjà chargé dans le scope, le passer ; sinon `cb_coords=None` (Task 4 pourra l'enrichir).
- `geocode_fn` : passer `None` en v1 (pas de Nominatim runtime dans le matching — cohérent avec l'existant). Le hook est prêt pour l'activer plus tard.

- [ ] **Step 4 : lancer → succès**

Run : `python -m pytest test_ktel_apparier.py test_ktel_match.py test_ktel_resolve.py -q`
Expected: PASS (le nouveau cas passe ; les tests passe-1 existants restent verts = non-régression).

- [ ] **Step 5 : commit**

```bash
git add scripts/scrapers/buses/ktel_apparier.py scripts/scrapers/buses/test_ktel_apparier.py
git commit -m "feat(bus): apparier passe 2 GPS sur les trajets non resolus (additif, non-regression passe 1)"
```

---

## Task 4 : validation sur données prod + déploiement VPS

**Files:** aucun code (validation + ops).

- [ ] **Step 1 : suite pytest complète du dossier bus**

Run : `cd scripts/scrapers/buses && python -m pytest -q`
Expected: tout vert.

- [ ] **Step 2 : dry-run comptage sur un snapshot prod (sans écrire)**

Écrire un script jetable `scripts/scrapers/buses/_dryrun_gps.py` qui : charge `bus_routes` (line_id NULL), `bus_lines`, `stops_by_slug` depuis PostgREST prod (anon) ; lance passe 1 puis `match_gaps_by_gps` ; imprime `avant=212 / passe1 / passe2_gps / total / restants` et la **liste des trajets nouvellement appariés** (from_place→to_place + line code). NE PAS écrire en DB.
Critère : les axes touristiques attendus apparaissent dans les nouveaux matches — Heraklion↔Rethymno, Elafonisi↔Kissamos, Falasarna↔Kissamos, Chania↔Xyloskalo (Samaria), Plakias↔Preveli, Imbros↔Sfakia. **Vérifier 0 match aberrant** (distance > max_km ne devrait pas passer ; échantillonner 10 nouveaux matches et contrôler la cohérence géographique). Supprimer le script après.

- [ ] **Step 3 : ajuster `max_km` si besoin**

Si des matches aberrants apparaissent → baisser `max_km` (ex. 2.0). Si des axes évidents restent non appariés à cause de coords absentes → noter lesquels (candidats à ajouter à `PLACE_COORDS` dans une passe ultérieure, owner Kami). Re-dry-run jusqu'à un résultat propre. Documenter le `max_km` retenu dans un commit si modifié.

- [ ] **Step 4 : déploiement VPS (acte conscient, sur GO Kami)**

```bash
# copier les fichiers vers le VPS (mêmes chemins /opt/cretepulse/scripts/scrapers/buses/)
scp scripts/scrapers/buses/ktel_geo.py scripts/scrapers/buses/ktel_apparier.py kairos-vps:/opt/cretepulse/scripts/scrapers/buses/
# relancer SP2 manuellement une fois
ssh kairos-vps "cd /opt/cretepulse && python scripts/scrapers/buses/run_apparier.py"
```
Pas de gros job DB pendant un déploiement Vercel (contention VPS↔Vercel connue).

- [ ] **Step 5 : vérif post-déploiement (données prod)**

Via PostgREST prod (UA navigateur non requis, c'est l'API) : recompter `bus_routes?line_id=not.is.null` (attendu > 212) et `bus_lines` à horaire (attendu > 105). Spot-check : `bus_routes?or=(from_place.ilike.*herakl*,to_place.ilike.*rethymno*)&line_id=not.is.null` non vide. Sur le site : `/fr/live` (UA navigateur) — les lignes touristiques réparées doivent maintenant avoir un tracé (bus animés) ; `/fr/near-me` — couverture arrêts en hausse.

- [ ] **Step 6 : mémoire**

Append `session_log.md` : appariement GPS déployé, delta line_id avant/après, axes rallumés, `max_km` retenu, restants (coords manquantes).

---

## Self-Review

**Spec coverage :**
- Appariement par GPS (décision Kami 18/06) → Tasks 1-3. ✔
- Additif / non-régression (ne casse pas les matches existants) → passe 2 sur `gaps` uniquement + `matched.update` ; tests passe-1 conservés. ✔
- Rallume les axes touristiques (les 14 lignes WS1) → Task 4 step 2 critère de validation. ✔
- Bonus tracés `/live` (même `line_id`) → Task 4 step 5. ✔
- Limite assumée (coords KTEL ~120 lieux ; hôtels/POI sans coords non rattachés) → cascade `endpoint_coords` + note Task 4 step 3 (candidats `PLACE_COORDS`). ✔

**Placeholders :** Task 3 step 2 décrit le test à écrire « dans le style du fichier » sans coller le code exact (le fichier `test_ktel_apparier.py` n'a pas été lu intégralement) — l'exécutant DOIT lire `test_ktel_apparier.py` + `ktel_apparier.py` d'abord (Task 3 step 1) et calquer la fixture existante. C'est le seul point non-littéral, volontairement, car la structure exacte de `assemble_apparier` (noms de variables `cb_coords`/`geocode_fn`, signature) doit être confirmée à la lecture avant d'écrire le câblage.

**Cohérence des types :** `endpoint_coords(name, place_coords, cb_coords=None, geocode=None) -> (lat,lng)|None` et `match_gaps_by_gps(gap_routes, lines, stops_by_slug, place_coords, cb_coords=None, geocode=None, max_km=3.0) -> dict[route_id->line_id]` stables entre Tasks 1-3. `haversine_km(a, b)` réutilisé de `ktel_resolve`. `gaps` est `dict[key -> list[route]]` (confirmé par l'audit) → aplati en `gap_routes`.

**Attention exécutant :** confirmer en Task 3 step 1 que `assemble_apparier` expose bien `osm_lines`, `stops_by_slug`, `place_coords` dans son scope (noms exacts) et adapter l'appel ; confirmer la présence/forme d'un `cb_coords` (sinon `None`).
