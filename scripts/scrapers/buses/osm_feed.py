"""Sous-flux OSM pour la fusion GTFS : charge les lignes OSM (bus_lines) et
projette leur géométrie routière en points GTFS pour shapes.txt. Lecture seule.
Pur hormis load_osm (lecture DB)."""


def load_osm(sb):
    """{line_id: line} pour les lignes OSM ayant une géométrie. Lecture seule."""
    rows = sb.table("bus_lines").select("id,code,color,geometry").execute().data
    return {r["id"]: r for r in rows if r.get("geometry") and len(r["geometry"]) >= 2}


def line_shape(line):
    """geometry [[lng, lat], ...] -> [(lat, lng), ...] (ordre GTFS). [] si vide."""
    geom = line.get("geometry") or []
    return [(c[1], c[0]) for c in geom]


def shape_id_for(line_id):
    """Identifiant de shape stable depuis l'id de ligne OSM."""
    return f"shp-{line_id}"
