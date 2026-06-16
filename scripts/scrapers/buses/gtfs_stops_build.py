"""Référentiel d'arrêts GTFS (étape B) : extrait les lieux de bus_routes,
curate (GTFS), géocode en cascade sous garde-fou de cohérence, assemble
gtfs_stops + exporte stops.txt. Lancé par buses.py après le scrape.

Pur hormis le fetch Nominatim (injecté) et le store/export (I/O isolée).
"""
import csv
import json
import math
import os
import re
from collections import defaultdict

from prices import PLACE_COORDS, _norm
from net_geocode import coords_index_by_slug, geocode_slug, stop_slug
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


# Points hôteliers/POI dont le libellé KTEL porte la localité parente, mais que
# Nominatim ne trouve pas sous leur nom commercial.
_PARENT_HOTELS = re.compile(r"\(([a-z]+)-hotels?\)")


def parent_coords(slug, coords_index):
    """Coordonnées de la localité parente d'un point hôtelier/POI, sinon None.
    Dernier recours zone-level (donc confiance basse + needs_review) pour les
    arrêts introuvables par Nominatim mais dont le libellé porte la localité :
      - 'x-(analipsis-hotels)' / 'x-(anissaras-hotels)' -> Analipsis / Anissaras ;
      - 'a10-ag.pelagia-beach' / 'ag.pelagia(kapsis)'   -> Agia Pelagia.
    `coords_index` : {slug: (lat,lng)} déjà construit (référentiel + cb_places)."""
    m = _PARENT_HOTELS.search(slug)
    if m:
        parent = m.group(1)
    elif "ag.pelagia" in slug:
        parent = "agia-pelagia"
    else:
        return None
    return coords_index.get(parent)


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
        if source == "none":
            pc = parent_coords(slug, coords_index)
            if pc:
                lat, lng, source, conf = pc[0], pc[1], "parent", "low"
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
