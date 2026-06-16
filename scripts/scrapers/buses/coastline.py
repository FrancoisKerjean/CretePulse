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
    dlat = tol_m / 111320.0
    dlng = tol_m / (111320.0 * max(0.1, math.cos(math.radians(lat))))
    for dla in (-dlat, 0.0, dlat):
        for dln in (-dlng, 0.0, dlng):
            if dla == 0.0 and dln == 0.0:
                continue
            if _inside_any(lng + dln, lat + dla, rings):
                return True
    return False
