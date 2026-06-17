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
