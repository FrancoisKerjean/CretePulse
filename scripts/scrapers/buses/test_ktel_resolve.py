from ktel_resolve import resolve

# stops_by_slug : reproduit la signature DB (slug -> dict avec lat/lng)
STOPS = {
    "khania":   {"slug": "khania",   "lat": 35.5138, "lng": 24.0180},
    "erakleio": {"slug": "erakleio", "lat": 35.3387, "lng": 25.1442},
    "sitia":    {"slug": "sitia",    "lat": 35.2042, "lng": 26.1037},
    "perfectstop": {"slug": "perfectstop", "lat": 35.4000, "lng": 24.5000},
}
ALIASES = {"chania": "khania", "heraklion": "erakleio"}
PLACE_COORDS = {"newhub": (35.4001, 24.5001)}   # 11 m de perfectstop


def test_resolve_exact_match():
    # un slug KTEL identique à un slug OSM (Sitia) -> match direct
    assert resolve("Sitia", STOPS, ALIASES, PLACE_COORDS) == "sitia"


def test_resolve_alias_match():
    # Chania (KTEL) -> alias -> khania (OSM)
    assert resolve("Chania", STOPS, ALIASES, PLACE_COORDS) == "khania"
    assert resolve("Heraklion", STOPS, ALIASES, PLACE_COORDS) == "erakleio"


def test_resolve_coords_fallback_within_5km():
    # newhub (PLACE_COORDS) est à 11 m de perfectstop (stops OSM) -> match coords
    assert resolve("Newhub", STOPS, ALIASES, PLACE_COORDS) == "perfectstop"


def test_resolve_coords_no_match_beyond_5km():
    pc = {"faraway": (40.0, 30.0)}   # nulle part en Crète
    assert resolve("Faraway", STOPS, ALIASES, pc) is None


def test_resolve_returns_none_when_nothing_matches():
    assert resolve("UnknownVillage", STOPS, ALIASES, PLACE_COORDS) is None
    assert resolve("", STOPS, ALIASES, PLACE_COORDS) is None
    assert resolve(None, STOPS, ALIASES, PLACE_COORDS) is None


def test_resolve_alias_target_missing_falls_through_to_coords():
    # alias pointe vers un stop OSM absent -> on tente la cascade suivante
    aliases = {"newhub": "no_such_stop"}
    assert resolve("Newhub", STOPS, aliases, PLACE_COORDS) == "perfectstop"
