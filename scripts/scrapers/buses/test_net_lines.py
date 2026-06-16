from net_lines import route_sequence, merge_into_lines

def test_route_sequence_from_via_to():
    r = {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Malia", "Agios Nikolaos"]}
    assert route_sequence(r) == ["heraklion", "malia", "agios-nikolaos", "sitia"]

def test_merge_same_terminus_keeps_longest():
    routes = [
        {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
        {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Malia", "Agios Nikolaos"], "operator_id": "herlas"},
    ]
    lines = merge_into_lines(routes)
    assert len(lines) == 1
    assert lines[0]["stops"] == ["heraklion", "malia", "agios-nikolaos", "sitia"]

def test_merge_bidirectional_is_one_line():
    routes = [
        {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
        {"from_place": "Sitia", "to_place": "Heraklion", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
    ]
    lines = merge_into_lines(routes)
    assert len(lines) == 1
    # orientation canonique = terminus alphabétiquement premier (invariant testé)
    assert lines[0]["origin"] == "heraklion"
    assert lines[0]["dest"] == "sitia"

def test_merge_distinct_corridors_stay_separate():
    routes = [
        {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
        {"from_place": "Chania", "to_place": "Kissamos", "via_stops": None, "operator_id": "ektel"},
    ]
    lines = merge_into_lines(routes)
    assert len(lines) == 2

def test_merge_tracks_route_ids():
    routes = [
        {"id": 11, "from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
        {"id": 12, "from_place": "Sitia", "to_place": "Heraklion", "via_stops": ["Agios Nikolaos"], "operator_id": "herlas"},
    ]
    lines = merge_into_lines(routes)
    assert sorted(lines[0]["route_ids"]) == [11, 12]
