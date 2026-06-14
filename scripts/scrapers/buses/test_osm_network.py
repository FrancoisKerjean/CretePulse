import json, os
from osm_network import assemble_osm, should_build_osm, MIN_OSM_STOPS, MIN_OSM_LINES

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "osm_agnik_sitia.json")
def _elements():
    with open(FIX, encoding="utf-8") as f:
        return json.load(f)["elements"]

def _fake_osrm(coords):
    return {"code": "Ok", "routes": [{
        "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
        "legs": [{"distance": 5000.0} for _ in range(len(coords) - 1)]}]}

def test_assemble_builds_line_with_pachia_ammos():
    stops, lines, line_stops = assemble_osm(
        _elements(), fetch=lambda url: _fake_osrm([(0, 0)]))  # OSRM dégradé -> haversine
    assert len(lines) == 1
    line = lines[0]
    assert line["operator_id"] == "herlas"
    assert line["source"] == "osm"
    # un arrêt du réseau est Pachia Ammos, géolocalisé, source osm
    pa = [s for s in stops if s["name_el"] == "Παχειά Άμμος"]
    assert pa and pa[0]["coords_source"] == "osm" and pa[0]["lat"]
    # il est dans la séquence de la ligne (line_stops)
    slugs = [ls["stop_slug"] for ls in line_stops if ls["line_code"] == line["code"]]
    assert pa[0]["slug"] in slugs

def test_assemble_code_official_from_ref_or_prefnn():
    stops, lines, _ = assemble_osm(_elements(), fetch=lambda url: None)
    # la fixture Agios Nik<->Sitia n'a pas de ref -> code_official None, code PREF-NN
    assert lines[0]["code"].startswith(("HER-", "LAS-", "CHA-", "RET-"))
    assert lines[0]["code_official"] is None

def test_should_build_osm_guardrail():
    assert should_build_osm([{}] * MIN_OSM_STOPS, [{}] * MIN_OSM_LINES) is True
    assert should_build_osm([{}] * (MIN_OSM_STOPS - 1), [{}] * MIN_OSM_LINES) is False
