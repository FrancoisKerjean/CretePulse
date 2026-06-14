"""Parsing Overpass : arrêts translittérés + relations (séquences dédupliquées).
Aucun I/O réseau. unidecode est importé paresseusement (réseau-free)."""
from prices import haversine_km
from net_geocode import stop_slug


def transliterate(name_el, name_en=None):
    """name:en si présent, sinon translittération grec->latin (unidecode)."""
    if name_en and name_en.strip():
        return name_en.strip()
    if not name_el:
        return None
    from unidecode import unidecode
    out = unidecode(name_el).strip()
    return out or None


def normalize_operator(op):
    """Chaîne opérateur OSM (grec, variantes) -> id interne."""
    if not op:
        return "unknown"
    o = op.lower()
    if "ηρακλειου-λασιθιου" in o or "ηρακλείου-λασιθίου" in o:
        return "herlas"
    if "χανιων ρεθυμνου" in o or "χανίων ρεθύμνου" in o:
        return "ektel"
    if "αστικ" in o and ("ηρακλει" in o or "ηρακλεί" in o):
        return "urban-her"
    if "αστικ" in o and "χαν" in o:
        return "urban-cha"
    return "unknown"


def parse_stops(elements):
    """Tous les nodes Overpass -> {osm_id: {osm_id,name_el,name,lat,lng,slug}}."""
    out = {}
    for e in elements:
        if e.get("type") != "node":
            continue
        tags = e.get("tags", {})
        name_el = tags.get("name")
        name = transliterate(name_el, tags.get("name:en"))
        out[e["id"]] = {
            "osm_id": e["id"], "name_el": name_el, "name": name,
            "lat": e.get("lat"), "lng": e.get("lon"),
            "slug": stop_slug(name) if name else None,
        }
    return out


def _same_stop(a, b):
    """Deux nodes = le même arrêt physique (quai+point, ou même nom à <80 m)."""
    if a["name_el"] and a["name_el"] == b["name_el"]:
        return True
    if None not in (a["lat"], a["lng"], b["lat"], b["lng"]):
        return haversine_km((a["lat"], a["lng"]), (b["lat"], b["lng"])) * 1000 < 80
    return False


def parse_relation(rel, stops_by_id):
    """Relation route=bus -> métadonnées + séquence d'arrêts ordonnée dédupliquée.
    Les arrêts portent un rôle 'stop' ou 'platform' ; le quai (platform) prime
    quand un arrêt physique apparaît en double consécutif."""
    seq = []
    for m in rel.get("members", []):
        if m.get("type") != "node" or m.get("role") not in ("stop", "platform"):
            continue
        node = stops_by_id.get(m["ref"])
        if not node or not node["slug"]:
            continue
        if seq and _same_stop(seq[-1], node):
            if m["role"] == "platform":
                seq[-1] = node
            continue
        seq.append(node)
    tags = rel.get("tags", {})
    return {
        "osm_id": rel["id"],
        "ref": (tags.get("ref") or "").strip() or None,
        "operator": normalize_operator(tags.get("operator")),
        "from": tags.get("from"), "to": tags.get("to"),
        "stop_ids": [s["osm_id"] for s in seq],
        "stop_slugs": [s["slug"] for s in seq],
    }
