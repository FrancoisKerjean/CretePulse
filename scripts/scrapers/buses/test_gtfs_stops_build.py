from gtfs_stops_build import (
    haversine_km, in_crete, curate_routes, collect_stops_with_count,
    _siblings_by_slug, prefecture_for, PREFECTURE_CENTERS,
)
from gtfs_stops_build import coherence_ok
from gtfs_stops_build import assemble_stops


def test_in_crete_bbox():
    assert in_crete(35.34, 25.14) is True       # Heraklion
    assert in_crete(37.98, 23.72) is False      # Athènes
    assert in_crete(None, None) is False


def test_haversine_km_known_distance():
    d = haversine_km((35.3387, 25.1442), (35.5138, 24.0180))  # Heraklion<->Chania
    assert 100 < d < 140


def test_prefecture_for_nearest():
    assert prefecture_for(35.5138, 24.0180) == "CHA"   # Chania
    assert prefecture_for(35.2078, 26.1029) == "LAS"   # Sitia -> Lasithi
    assert prefecture_for(None, None) is None


def test_curate_routes_keeps_hotels_drops_codes():
    routes = [{"from_place": "Heraklion", "to_place": "Malia Palace",
               "via_stops": ["A90", "Gouves"]}]
    curated, dropped = curate_routes(routes)
    assert len(curated) == 1
    r = curated[0]
    assert r["from_place"] == "heraklion"
    assert r["to_place"] == "malia-palace"     # hôtel gardé
    assert r["via_stops"] == ["gouves"]        # A90 droppé du via
    assert "A90" in dropped


def test_curate_routes_drops_route_with_artifact_terminus():
    routes = [{"from_place": "A90", "to_place": "Heraklion", "via_stops": None}]
    curated, dropped = curate_routes(routes)
    assert curated == []
    assert "A90" in dropped


def test_collect_stops_with_count():
    routes = [
        {"from_place": "heraklion", "to_place": "sitia", "via_stops": ["malia"]},
        {"from_place": "heraklion", "to_place": "malia", "via_stops": None},
    ]
    by = {s["slug"]: s for s in collect_stops_with_count(routes)}
    assert by["heraklion"]["route_count"] == 2
    assert by["malia"]["route_count"] == 2
    assert by["sitia"]["route_count"] == 1


def test_siblings_by_slug():
    routes = [{"from_place": "a", "to_place": "b", "via_stops": ["c"]}]
    adj = _siblings_by_slug(routes)
    assert adj["a"] == {"b", "c"}


def test_coherence_accepts_near_sibling():
    siblings = {"profitis-ilias": {"heraklion"}}
    high = {"heraklion": (35.3387, 25.1442)}
    # ~17 km de Heraklion, dans la bbox -> accepté
    assert coherence_ok("profitis-ilias", 35.20, 25.10, high, siblings) is True


def test_coherence_rejects_far_homonym():
    siblings = {"profitis-ilias": {"heraklion"}}
    high = {"heraklion": (35.3387, 25.1442)}
    # homonyme à >200 km (et hors bbox) -> rejet
    assert coherence_ok("profitis-ilias", 36.9, 22.0, high, siblings) is False


def test_coherence_rejects_outside_crete():
    siblings = {"x": {"heraklion"}}
    high = {"heraklion": (35.3387, 25.1442)}
    assert coherence_ok("x", 48.85, 2.35, high, siblings) is False   # Paris


def test_coherence_rejects_when_no_high_sibling():
    siblings = {"x": {"y"}}   # y n'a pas de coords sûres
    assert coherence_ok("x", 35.30, 25.10, {}, siblings) is False


def test_assemble_stops_cascade_and_guard_accepts_near():
    routes = [{"from_place": "Heraklion", "to_place": "Malia", "via_stops": ["Unknown Hamlet"]}]
    place_coords = {"heraklion": (35.3387, 25.1442), "malia": (35.2853, 25.4624)}

    def nomi(name):
        return (35.30, 25.40) if "hamlet" in name.lower() else None  # ~15km de Malia (sibling)

    stops, dropped = assemble_stops(routes, place_coords, {}, nominatim=nomi)
    by = {s["stop_id"]: s for s in stops}
    assert by["heraklion"]["coords_source"] == "referentiel"
    assert by["heraklion"]["coords_confidence"] == "high"
    assert by["heraklion"]["needs_review"] is False
    h = by["unknown-hamlet"]
    assert h["coords_source"] == "geocoded" and h["coords_confidence"] == "low"
    assert h["needs_review"] is True
    assert h["stop_lat"] is not None        # garde-fou OK (proche de Malia)
    assert h["prefecture"] in PREFECTURE_CENTERS


def test_assemble_stops_guard_rejects_far_nominatim():
    routes = [{"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Bad Match"]}]
    place_coords = {"heraklion": (35.3387, 25.1442), "sitia": (35.2078, 26.1029)}

    def nomi(name):
        return (40.0, 22.0) if "bad" in name.lower() else None   # hors Crète

    stops, _ = assemble_stops(routes, place_coords, {}, nominatim=nomi)
    bad = {s["stop_id"]: s for s in stops}["bad-match"]
    assert bad["stop_lat"] is None and bad["coords_source"] == "none"
    assert bad["needs_review"] is True
