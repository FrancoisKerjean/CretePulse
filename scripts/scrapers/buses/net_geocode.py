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
