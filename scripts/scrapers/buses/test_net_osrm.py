from net_osrm import osrm_route, build_geometry

def _fake_osrm_response(coords):
    # OSRM driving renvoie geometry GeoJSON [lng,lat] + legs[].distance (mètres)
    return {
        "code": "Ok",
        "routes": [{
            "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
            "legs": [{"distance": 10000.0} for _ in range(len(coords) - 1)],
        }],
    }

def test_osrm_route_parses_geometry_and_legs():
    coords = [(35.34, 25.14), (35.19, 25.71)]
    out = osrm_route(coords, fetch=lambda url: _fake_osrm_response(coords))
    assert out["geometry"] == [[25.14, 35.34], [25.71, 35.19]]
    assert out["leg_km"] == [10.0]

def test_osrm_route_returns_none_on_error():
    out = osrm_route([(35.0, 25.0), (35.1, 25.1)], fetch=lambda url: {"code": "NoRoute"})
    assert out is None

def test_build_geometry_uses_osrm_when_all_coords_present():
    stops = [{"slug": "a", "lat": 35.34, "lng": 25.14}, {"slug": "b", "lat": 35.19, "lng": 25.71}]
    geo = build_geometry(stops, fetch=lambda url: _fake_osrm_response([(35.34, 25.14), (35.19, 25.71)]))
    assert geo["partial"] is False
    assert geo["leg_km"] == [10.0]
    assert geo["length_km"] == 10.0

def test_build_geometry_falls_back_to_haversine_when_osrm_fails():
    stops = [{"slug": "a", "lat": 35.0, "lng": 25.0}, {"slug": "b", "lat": 35.0, "lng": 25.1}]
    geo = build_geometry(stops, fetch=lambda url: None)  # OSRM indisponible
    assert geo["partial"] is True
    assert len(geo["geometry"]) == 2          # segments droits = arrêts eux-mêmes
    assert geo["leg_km"][0] > 0               # haversine non nul

def test_build_geometry_partial_when_a_stop_lacks_coords():
    stops = [{"slug": "a", "lat": 35.0, "lng": 25.0}, {"slug": "b", "lat": None, "lng": None}]
    geo = build_geometry(stops, fetch=lambda url: None)
    assert geo["partial"] is True
    # segment vers un arrêt non géocodé : distance 0, pas de crash
    assert geo["leg_km"] == [0.0]
