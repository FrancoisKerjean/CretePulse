from ktel_geo import endpoint_coords

PLACE = {"heraklion": (35.3387, 25.1442), "rethymno": (35.3647, 24.4737)}
CB = {"elafonisi": (35.2716, 23.5400)}

def test_endpoint_from_place_coords():
    assert endpoint_coords("Heraklion", PLACE, CB, None) == (35.3387, 25.1442)

def test_endpoint_norm_caseinsensitive():
    assert endpoint_coords("  RETHYMNO ", PLACE, CB, None) == (35.3647, 24.4737)

def test_endpoint_from_cb_fallback():
    assert endpoint_coords("Elafonisi", PLACE, CB, None) == (35.2716, 23.5400)

def test_endpoint_geocode_last_resort():
    called = {}
    def geocode(name):
        called["n"] = name
        return (35.51, 24.02)
    assert endpoint_coords("Falasarna", PLACE, CB, geocode) == (35.51, 24.02)
    assert called["n"] == "Falasarna"

def test_endpoint_unknown_returns_none():
    assert endpoint_coords("Nowhere XYZ", PLACE, CB, None) is None


from ktel_geo import match_gaps_by_gps

STOPS = {
    "erakleio":  {"slug": "erakleio",  "lat": 35.3387, "lng": 25.1442},
    "rethumno":  {"slug": "rethumno",  "lat": 35.3647, "lng": 24.4737},
    "khania":    {"slug": "khania",    "lat": 35.5138, "lng": 24.0180},
}
LINES = [
    {"id": 2, "operator_id": "ektel", "origin": "erakleio", "dest": "rethumno"},
    {"id": 3, "operator_id": "ektel", "origin": "rethumno", "dest": "khania"},
]
PLACE_GPS = {"heraklion": (35.3390, 25.1440), "rethymno": (35.3650, 24.4740),
             "chania": (35.5140, 24.0182)}

def route(rid, frm, to, op="ektel"):
    return {"id": rid, "operator_id": op, "from_place": frm, "to_place": to}

def test_gps_matches_despite_name_mismatch():
    matched = match_gaps_by_gps([route(10, "Heraklion", "Rethymno")], LINES, STOPS, PLACE_GPS, max_km=3.0)
    assert matched == {10: 2}

def test_gps_orientation_symmetric():
    matched = match_gaps_by_gps([route(11, "Rethymno", "Heraklion")], LINES, STOPS, PLACE_GPS, max_km=3.0)
    assert matched == {11: 2}

def test_gps_no_match_when_far():
    PLACE2 = {"heraklion": (35.3390, 25.1440), "faraway": (36.9, 22.0)}
    matched = match_gaps_by_gps([route(12, "Heraklion", "Faraway")], LINES, STOPS, PLACE2, max_km=3.0)
    assert matched == {}

def test_gps_operator_isolation():
    matched = match_gaps_by_gps([route(13, "Heraklion", "Rethymno", op="herlas")], LINES, STOPS, PLACE_GPS, max_km=3.0)
    assert matched == {}

def test_gps_unknown_coords_skipped():
    matched = match_gaps_by_gps([route(14, "Heraklion", "Nowhere")], LINES, STOPS, PLACE_GPS, max_km=3.0)
    assert matched == {}
