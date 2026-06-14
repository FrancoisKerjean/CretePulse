import json
import os

from ktel_match import match_routes_to_lines

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "ktel_routes_sample.json")


def _load_routes():
    with open(FIX, encoding="utf-8") as f:
        return json.load(f)


def test_match_strict_operator_and_termini():
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Matala", "duration": "2h"},
        {"id": 2, "operator_id": "herlas", "from_place": "Matala", "to_place": "Heraklion", "duration": "2h"},
    ]
    lines = [
        {"id": 100, "operator_id": "herlas", "origin": "erakleio", "dest": "matala"},
    ]
    aliases = {"heraklion": "erakleio"}
    stops_by_slug = {"erakleio": {"slug": "erakleio", "lat": 35.34, "lng": 25.14},
                     "matala":   {"slug": "matala",   "lat": 34.99, "lng": 24.74}}
    matched, gaps = match_routes_to_lines(routes, lines, stops_by_slug, aliases, place_coords={})
    assert matched == {1: 100, 2: 100}
    assert gaps == {}


def test_match_strict_different_operators_dont_match():
    routes = [{"id": 1, "operator_id": "herlas", "from_place": "A", "to_place": "B", "duration": "1h"}]
    lines = [{"id": 200, "operator_id": "ektel", "origin": "a", "dest": "b"}]
    stops_by_slug = {"a": {"slug": "a", "lat": 35.0, "lng": 25.0},
                     "b": {"slug": "b", "lat": 35.1, "lng": 25.1}}
    matched, gaps = match_routes_to_lines(routes, lines, stops_by_slug, aliases={}, place_coords={})
    assert matched == {}
    assert ("herlas", frozenset({"a", "b"})) in gaps
    assert gaps[("herlas", frozenset({"a", "b"}))] == [routes[0]]


def test_match_unresolved_terminus_goes_to_gaps_when_other_resolved():
    routes = [{"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "UnknownVillage", "duration": "1h"}]
    lines = []
    stops_by_slug = {"erakleio": {"slug": "erakleio", "lat": 35.34, "lng": 25.14}}
    aliases = {"heraklion": "erakleio"}
    matched, gaps = match_routes_to_lines(routes, lines, stops_by_slug, aliases, place_coords={})
    # un terminus non résolu (UnknownVillage) -> route ignorée (ni match ni gap)
    assert matched == {}
    assert gaps == {}


def test_match_groups_gaps_by_operator_and_termini_pair():
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Foo", "to_place": "Bar", "duration": "1h"},
        {"id": 2, "operator_id": "herlas", "from_place": "Bar", "to_place": "Foo", "duration": "1h"},
        {"id": 3, "operator_id": "herlas", "from_place": "Foo", "to_place": "Baz", "duration": "2h"},
    ]
    stops_by_slug = {"foo": {"slug": "foo", "lat": 35.0, "lng": 25.0},
                     "bar": {"slug": "bar", "lat": 35.1, "lng": 25.1},
                     "baz": {"slug": "baz", "lat": 35.2, "lng": 25.2}}
    matched, gaps = match_routes_to_lines(routes, lines=[], stops_by_slug=stops_by_slug, aliases={}, place_coords={})
    assert ("herlas", frozenset({"foo", "bar"})) in gaps
    assert len(gaps[("herlas", frozenset({"foo", "bar"}))]) == 2
    assert ("herlas", frozenset({"foo", "baz"})) in gaps
    assert len(gaps[("herlas", frozenset({"foo", "baz"}))]) == 1


def test_match_against_real_fixture_doesnt_explode():
    # smoke : la fixture réelle doit charger et matcher sans exception
    routes = _load_routes()
    lines = [{"id": 10, "operator_id": "herlas", "origin": "erakleio", "dest": "matala"}]
    stops = {"erakleio": {"slug": "erakleio", "lat": 35.34, "lng": 25.14},
             "matala":   {"slug": "matala",   "lat": 34.99, "lng": 24.74}}
    aliases = {"heraklion": "erakleio"}
    matched, gaps = match_routes_to_lines(routes, lines, stops, aliases, place_coords={})
    # au moins une route Heraklion↔Matala matche la ligne 10 (alias résout les deux terminus)
    assert 10 in matched.values()
