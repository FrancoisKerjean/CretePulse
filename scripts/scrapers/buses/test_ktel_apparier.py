from ktel_apparier import assemble_apparier, MIN_BUS_LINES, should_run

# stubs pour le pipeline : on teste assemble (pur), pas store (Supabase requis).


def _fake_osrm(coords):
    return {"code": "Ok", "routes": [{
        "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
        "legs": [{"distance": 30_000.0} for _ in range(len(coords) - 1)]}]}


def test_assemble_apparier_matches_osm_and_emits_fallback():
    # 4 routes : 2 vers une ligne OSM existante (Heraklion<->Matala) ; 2 vers une paire orpheline (Heraklion<->Mires)
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Matala", "duration": "2h"},
        {"id": 2, "operator_id": "herlas", "from_place": "Matala", "to_place": "Heraklion", "duration": "2h"},
        {"id": 3, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Mires", "duration": "1h"},
        {"id": 4, "operator_id": "herlas", "from_place": "Mires", "to_place": "Heraklion", "duration": "1h"},
    ]
    osm_lines = [
        {"id": 50, "operator_id": "herlas", "origin": "erakleio", "dest": "matala", "code": "HER-10"},
    ]
    stops_by_slug = {
        "erakleio": {"slug": "erakleio", "name": "Erakleio", "lat": 35.3387, "lng": 25.1442, "prefecture": "HER", "osm_id": 1, "coords_source": "osm"},
        "matala":   {"slug": "matala",   "name": "Matala",   "lat": 34.9970, "lng": 24.7470, "prefecture": "HER", "osm_id": 2, "coords_source": "osm"},
    }
    aliases = {"heraklion": "erakleio"}
    place_coords = {"mires": (35.0700, 24.8525)}
    existing_codes = {}
    result = assemble_apparier(
        routes, osm_lines, stops_by_slug, aliases, place_coords, existing_codes, fetch=_fake_osrm)
    # 2 routes matchées à HER-10
    assert result["matched_to_osm"] == {1: 50, 2: 50}
    # 1 nouveau stop ('mires' créé), 1 nouvelle ligne fallback, 2 line_stops, 2 routes matchées au fallback
    assert len(result["new_stops"]) == 1
    assert result["new_stops"][0]["slug"] == "mires"
    assert len(result["new_lines"]) == 1
    assert result["new_lines"][0]["source"] == "ktel"
    assert len(result["new_line_stops"]) == 2
    assert set(result["matched_to_fallback"].keys()) == {3, 4}


def test_should_run_guards_against_empty_bus_lines():
    assert should_run([{}] * MIN_BUS_LINES) is True
    assert should_run([{}] * (MIN_BUS_LINES - 1)) is False
    assert should_run([]) is False


def test_assemble_apparier_ignores_routes_with_unresolved_terminus():
    routes = [{"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "GhostlyVillage", "duration": "1h"}]
    osm_lines = []
    stops_by_slug = {"erakleio": {"slug": "erakleio", "name": "Erakleio", "lat": 35.34, "lng": 25.14, "prefecture": "HER", "osm_id": 1, "coords_source": "osm"}}
    aliases = {"heraklion": "erakleio"}
    place_coords = {}
    result = assemble_apparier(routes, osm_lines, stops_by_slug, aliases, place_coords, existing_codes={}, fetch=lambda url: None)
    assert result["matched_to_osm"] == {}
    assert result["matched_to_fallback"] == {}
    assert result["new_lines"] == []
