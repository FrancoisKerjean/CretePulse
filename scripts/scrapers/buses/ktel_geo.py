"""Appariement GPS des trajets KTEL aux lignes OSM (passe 2, sur les non-résolus).
Pur : le géocodage réseau est injecté (param `geocode`), rien d'autre ne fait d'I/O.
La géographie remplace l'identité de noms (translittérations KTEL/OSM incohérentes).
"""
from prices import haversine_km


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
