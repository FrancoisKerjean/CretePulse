"""Référentiel d'arrêts : extraction depuis bus_routes, dédup par slug, géocodage
en cascade (PLACE_COORDS référentiel -> cb_places -> Nominatim -> none).
Le lookup Nominatim est injecté (None en test, fonction cachée en prod)."""
from prices import _norm

try:
    from unidecode import unidecode
except ImportError:  # dégradation gracieuse si la dépendance n'est pas installée
    def unidecode(s):
        return s


def stop_slug(name):
    return unidecode(_norm(name)).replace("&", "and").replace("  ", " ").strip().replace(" ", "-")


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


def coords_index_by_slug(place_coords, cb_by_name, names_by_slug=None):
    """Construit {slug: (lat,lng)} en fusionnant :
    - PLACE_COORDS réindexé par stop_slug(nom) (référentiel main, prioritaire) ;
    - cb_places (dict {nom_normalisé: (lat,lng)}) matché au nom d'affichage du slug.
    `names_by_slug` : {slug: display_name} pour résoudre le nom à matcher dans cb_by_name.
    """
    idx = {}
    for name, coords in place_coords.items():
        idx[stop_slug(name)] = coords
    if cb_by_name and names_by_slug:
        for slug, disp in names_by_slug.items():
            if slug in idx:
                continue
            hit = cb_by_name.get(_norm(disp))
            if hit:
                idx[slug] = hit
    return idx


def geocode_slug(slug, display, coords_index, nominatim=None):
    """Géocode un slug : index (référentiel/cb_places) puis Nominatim.
    Retourne (lat, lng, source, confidence)."""
    if slug in coords_index:
        lat, lng = coords_index[slug]
        return lat, lng, "referentiel", "high"
    if nominatim is not None:
        hit = nominatim(display)
        if hit:
            return hit[0], hit[1], "geocoded", "low"
    return None, None, "none", "low"
