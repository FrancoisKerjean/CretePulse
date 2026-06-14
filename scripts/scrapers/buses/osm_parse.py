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
