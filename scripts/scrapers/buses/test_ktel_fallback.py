from ktel_fallback import build_fallback_lines


def _fake_osrm_ok(coords):
    # renvoie un OSRM Ok minimal en `code: Ok`, route avec 1 leg dont la distance
    # est 30 km, géométrie en GeoJSON ([lng, lat] dans Overpass-style mais OSRM-friendly).
    return {"code": "Ok", "routes": [{
        "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
        "legs": [{"distance": 30_000.0}]}]}


def test_build_fallback_inserts_new_stops_and_one_line():
    gaps = {
        ("herlas", frozenset({"foo", "bar"})): [
            {"id": 1, "operator_id": "herlas", "from_place": "Foo", "to_place": "Bar", "duration": "1h"},
            {"id": 2, "operator_id": "herlas", "from_place": "Bar", "to_place": "Foo", "duration": "1h"},
        ],
    }
    # foo connu (déjà dans bus_stops) ; bar inconnu mais présent dans PLACE_COORDS
    stops_by_slug = {"foo": {"slug": "foo", "name": "Foo", "lat": 35.0, "lng": 25.0,
                              "prefecture": "HER", "osm_id": 999, "coords_source": "osm"}}
    place_coords = {"bar": (35.5, 25.5)}
    aliases = {}
    new_stops, new_lines, new_line_stops, fallback_matched = build_fallback_lines(
        gaps, stops_by_slug, aliases, place_coords, existing_codes={},
        fetch=lambda url: _fake_osrm_ok([(35.0, 25.0), (35.5, 25.5)]))
    # bar a été créé (foo déjà connu)
    assert len(new_stops) == 1
    assert new_stops[0]["slug"] == "bar"
    assert new_stops[0]["coords_source"] == "ktel"
    assert new_stops[0]["lat"] == 35.5 and new_stops[0]["lng"] == 25.5
    # une ligne créée
    assert len(new_lines) == 1
    line = new_lines[0]
    assert line["operator_id"] == "herlas"
    assert line["source"] == "ktel"
    assert line["code"].startswith(("HER-", "LAS-", "CHA-", "RET-"))
    assert line["code_official"] is None
    assert line["osm_id"] is None
    assert line["partial_geo"] is True
    # 2 line_stops (seq 0 origine, seq 1 destination)
    assert len(new_line_stops) == 2
    assert {ls["seq"] for ls in new_line_stops} == {0, 1}
    # les routes KTEL qui ont contribué reçoivent un line_id sentinel (sera résolu côté store)
    assert fallback_matched == {1: line["code"], 2: line["code"]}


def test_build_fallback_skips_pair_when_terminus_unresolvable():
    gaps = {
        ("herlas", frozenset({"ghost1", "ghost2"})): [
            {"id": 1, "operator_id": "herlas", "from_place": "Ghost1", "to_place": "Ghost2", "duration": "1h"},
        ],
    }
    stops_by_slug = {}
    place_coords = {}
    new_stops, new_lines, new_line_stops, fallback_matched = build_fallback_lines(
        gaps, stops_by_slug, aliases={}, place_coords=place_coords,
        existing_codes={}, fetch=lambda url: None)
    assert new_stops == []
    assert new_lines == []
    assert new_line_stops == []
    assert fallback_matched == {}


def test_build_fallback_uses_haversine_when_osrm_fails():
    gaps = {("herlas", frozenset({"a", "b"})): [
        {"id": 1, "operator_id": "herlas", "from_place": "A", "to_place": "B", "duration": "2h"},
    ]}
    stops_by_slug = {"a": {"slug": "a", "name": "A", "lat": 35.0, "lng": 25.0, "prefecture": "HER", "osm_id": 1, "coords_source": "osm"},
                     "b": {"slug": "b", "name": "B", "lat": 35.5, "lng": 25.5, "prefecture": "HER", "osm_id": 2, "coords_source": "osm"}}
    new_stops, new_lines, new_line_stops, _ = build_fallback_lines(
        gaps, stops_by_slug, aliases={}, place_coords={}, existing_codes={},
        fetch=lambda url: None)   # OSRM down -> haversine
    assert len(new_lines) == 1
    assert new_lines[0]["partial_geo"] is True
    assert new_lines[0]["length_km"] > 0    # haversine > 0


def test_build_fallback_assigns_codes_for_multiple_pairs_deterministically():
    gaps = {
        ("herlas", frozenset({"a", "b"})): [{"id": 1, "operator_id": "herlas", "from_place": "A", "to_place": "B", "duration": "1h"}],
        ("herlas", frozenset({"c", "d"})): [{"id": 2, "operator_id": "herlas", "from_place": "C", "to_place": "D", "duration": "1h"}],
    }
    stops = {k: {"slug": k, "name": k.upper(), "lat": 35.0 + i * 0.1, "lng": 25.0 + i * 0.1,
                 "prefecture": "HER", "osm_id": i + 1, "coords_source": "osm"}
             for i, k in enumerate(("a", "b", "c", "d"))}
    _, new_lines, _, _ = build_fallback_lines(
        gaps, stops, aliases={}, place_coords={}, existing_codes={},
        fetch=lambda url: None)
    codes = sorted(l["code"] for l in new_lines)
    assert len(codes) == 2 and codes[0] != codes[1]
