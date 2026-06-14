"""Résolution d'un nom KTEL en slug OSM. Cascade :
  1. exact   : stop_slug(name) ∈ stops_by_slug
  2. alias   : aliases[stop_slug(name)] ∈ stops_by_slug
  3. coords  : place_coords[_norm(name)] -> stop OSM le plus proche, < 5 km
  4. None    : aucun match (loggable, candidat à un ajout dans ktel_to_osm.json)
Aucun I/O réseau."""
from prices import _norm, haversine_km
from net_geocode import stop_slug

MAX_COORDS_KM = 5.0


def resolve(name, stops_by_slug, aliases, place_coords):
    """Retourne le slug OSM correspondant à `name` (KTEL), ou None."""
    if not name:
        return None
    slug = stop_slug(name)
    if slug in stops_by_slug:
        return slug
    aliased = aliases.get(slug)
    if aliased and aliased in stops_by_slug:
        return aliased
    coords = place_coords.get(_norm(name))
    if coords:
        best, best_km = None, MAX_COORDS_KM
        for s in stops_by_slug.values():
            if s.get("lat") is None or s.get("lng") is None:
                continue
            d = haversine_km(coords, (s["lat"], s["lng"]))
            if d < best_km:
                best, best_km = s["slug"], d
        if best:
            return best
    return None
