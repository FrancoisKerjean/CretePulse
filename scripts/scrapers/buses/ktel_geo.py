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
            fwd = max(haversine_km(a, e1), haversine_km(b, e2))
            rev = max(haversine_km(a, e2), haversine_km(b, e1))
            cost = min(fwd, rev)
            if cost <= max_km and (best_cost is None or cost < best_cost):
                best_id, best_cost = line_id, cost
        if best_id is not None:
            matched[r["id"]] = best_id
    return matched
