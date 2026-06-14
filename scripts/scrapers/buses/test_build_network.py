from build_network import assemble_network, should_build_network, MIN_STOPS, MIN_LINES

def _fake_osrm(coords):
    return {"code": "Ok", "routes": [{
        "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
        "legs": [{"distance": 20000.0} for _ in range(len(coords) - 1)],
    }]}

def test_assemble_builds_stops_lines_linestops():
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Sitia",
         "via_stops": ["Agios Nikolaos"], "duration": "3h"},
    ]
    place_coords = {"heraklion": (35.34, 25.14), "agios nikolaos": (35.19, 25.71), "sitia": (35.21, 26.10)}
    stops, lines, line_stops = assemble_network(
        routes, place_coords, cb_index={}, fetch=lambda url: _fake_osrm(
            [(35.34, 25.14), (35.19, 25.71), (35.21, 26.10)]))
    assert {s["slug"] for s in stops} == {"heraklion", "agios-nikolaos", "sitia"}
    assert len(lines) == 1
    line = lines[0]
    assert line["code"].startswith("HER-")
    assert line["total_minutes"] == 180        # "3h"
    ls = sorted([x for x in line_stops if x["line_code"] == line["code"]], key=lambda x: x["seq"])
    assert [x["seq"] for x in ls] == [0, 1, 2]
    assert ls[0]["cumulative_minutes"] == 0 and ls[-1]["cumulative_minutes"] == 180

def test_assemble_prefecture_and_name():
    routes = [{"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Sitia",
               "via_stops": None, "duration": "3h"}]
    place_coords = {"heraklion": (35.34, 25.14), "sitia": (35.21, 26.10)}
    _, lines, _ = assemble_network(routes, place_coords, {}, fetch=lambda url: _fake_osrm(
        [(35.34, 25.14), (35.21, 26.10)]))
    assert lines[0]["prefecture"] == "HER"
    assert "Heraklion" in lines[0]["name"] and "Sitia" in lines[0]["name"]

def test_should_build_network_guardrail():
    assert should_build_network([{}] * MIN_STOPS, [{}] * MIN_LINES) is True
    assert should_build_network([{}] * (MIN_STOPS - 1), [{}] * MIN_LINES) is False
    assert should_build_network([{}] * MIN_STOPS, []) is False

from build_network import curate_routes

def test_curate_drops_noise_terminus():
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion",
         "to_place": "Hotel Serita (Anissaras Hotels)", "via_stops": None, "duration": "10min"},
    ]
    out = curate_routes(routes)
    assert out == []

def test_curate_strips_noise_via_keeps_route():
    routes = [
        {"id": 2, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Malia",
         "via_stops": ["A1 Super Market", "Gouves"], "duration": "45min"},
    ]
    out = curate_routes(routes)
    assert len(out) == 1
    assert out[0]["from_place"] == "heraklion"
    assert out[0]["to_place"] == "malia"
    assert out[0]["via_stops"] == ["gouves"]

def test_curate_canonises_aliases_and_typos():
    routes = [
        {"id": 3, "operator_id": "ektel", "from_place": "Rerhymno", "to_place": "Elafonisi",
         "via_stops": None, "duration": "1h"},
    ]
    out = curate_routes(routes)
    assert out[0]["from_place"] == "rethymno"
    assert out[0]["to_place"] == "elafonissi"

def test_assemble_bridges_allowlist_slug_divergent_from_placecoords():
    # "Siteia" est dans PLACE_COORDS sous _norm("Siteia")="siteia", mais son slug
    # canonique allowlist est "sitia" -> le pont allowlist doit quand même le géocoder.
    routes = curate_routes([{"id": 1, "operator_id": "herlas", "from_place": "Heraklion",
                             "to_place": "Siteia", "via_stops": None, "duration": "3h"}])
    place_coords = {"heraklion": (35.34, 25.14), "siteia": (35.21, 26.10)}
    stops, _, _ = assemble_network(
        routes, place_coords, {}, fetch=lambda url: _fake_osrm([(35.34, 25.14), (35.21, 26.10)]))
    sitia = next(s for s in stops if s["slug"] == "sitia")
    assert sitia["lat"] == 35.21 and sitia["coords_source"] == "referentiel"
