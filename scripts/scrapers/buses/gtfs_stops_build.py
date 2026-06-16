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
