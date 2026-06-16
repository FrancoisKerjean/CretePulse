from net_nomenclature import prefecture_for, assign_codes, color_for

def test_prefecture_for_nearest_center():
    assert prefecture_for(35.34, 25.14) == "HER"   # Heraklion ville
    assert prefecture_for(35.19, 25.71) == "LAS"   # Agios Nikolaos
    assert prefecture_for(35.51, 24.02) == "CHA"   # Chania
    assert prefecture_for(35.36, 24.48) == "RET"   # Rethymno

def test_prefecture_for_none_when_no_coords():
    assert prefecture_for(None, None) is None

def test_assign_codes_deterministic_and_prefixed():
    lines = [
        {"key": "heraklion|sitia|herlas",  "origin_lat": 35.34, "origin_lng": 25.14, "length_km": 130.0},
        {"key": "heraklion|anogeia|herlas","origin_lat": 35.34, "origin_lng": 25.14, "length_km": 55.0},
        {"key": "chania|kissamos|ektel",   "origin_lat": 35.51, "origin_lng": 24.02, "length_km": 40.0},
    ]
    codes = assign_codes(lines)
    assert codes["heraklion|sitia|herlas"] == "HER-01"   # la plus longue de HER d'abord
    assert codes["heraklion|anogeia|herlas"] == "HER-02"
    assert codes["chania|kissamos|ektel"] == "CHA-01"

def test_assign_codes_stable_with_existing_mapping():
    lines = [
        {"key": "heraklion|sitia|herlas",  "origin_lat": 35.34, "origin_lng": 25.14, "length_km": 130.0},
        {"key": "heraklion|anogeia|herlas","origin_lat": 35.34, "origin_lng": 25.14, "length_km": 55.0},
    ]
    existing = {"heraklion|anogeia|herlas": "HER-01"}  # déjà numérotée HER-01
    codes = assign_codes(lines, existing=existing)
    assert codes["heraklion|anogeia|herlas"] == "HER-01"   # conservée
    assert codes["heraklion|sitia|herlas"] == "HER-02"     # nouveau code, rang libre

def test_color_for_stable():
    assert color_for("HER-01") == color_for("HER-01")
    assert color_for("HER-01") != color_for("LAS-01")
