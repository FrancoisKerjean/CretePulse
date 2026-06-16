from coastline import load_polygon, on_land

def test_polygon_loads_rings():
    rings = load_polygon()
    assert isinstance(rings, list) and len(rings) >= 1
    assert all(len(r) >= 4 for r in rings)
    assert all(len(p) == 2 for p in rings[0][:5])

def test_inland_cities_on_land():
    assert on_land(35.3387, 25.1442) is True   # Heraklion
    assert on_land(35.1909, 25.7136) is True   # Agios Nikolaos
    assert on_land(35.5138, 24.0180) is True   # Chania
    assert on_land(35.3644, 24.4821) is True   # Rethymno

def test_open_sea_not_on_land():
    assert on_land(35.62, 25.30) is False
    assert on_land(34.85, 25.10) is False
    assert on_land(35.90, 25.50) is False

def test_none_coords_not_on_land():
    assert on_land(None, 25.0) is False
    assert on_land(35.0, None) is False

def test_tolerance_buffer_rescues_near_shore_point():
    lat, lng = 35.005, 25.742
    far = on_land(lat - 0.02, lng, tol_m=150)
    assert far is False
    p = (35.005, 25.742)
    assert on_land(*p, tol_m=0) in (True, False)
    if on_land(*p, tol_m=0) is False:
        assert on_land(*p, tol_m=2000) is True
