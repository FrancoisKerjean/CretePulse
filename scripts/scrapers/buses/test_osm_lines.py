from osm_lines import merge_osm_lines

def _rel(osm_id, op, slugs, ref=None):
    return {"osm_id": osm_id, "ref": ref, "operator": op, "from": None, "to": None,
            "stop_ids": list(range(len(slugs))), "stop_slugs": slugs}

def test_merge_directions_into_one_line():
    rels = [
        _rel(1, "herlas", ["agios-nikolaos", "gournia", "sitia"]),
        _rel(2, "herlas", ["sitia", "gournia", "agios-nikolaos"]),
    ]
    lines = merge_osm_lines(rels)
    assert len(lines) == 1
    assert lines[0]["origin"] == "agios-nikolaos" and lines[0]["dest"] == "sitia"
    assert lines[0]["stops"] == ["agios-nikolaos", "gournia", "sitia"]
    assert sorted(lines[0]["osm_ids"]) == [1, 2]

def test_merge_keeps_ref_when_present():
    rels = [_rel(1, "herlas", ["a", "b"], ref="ΗΚ-ΑΡΧ"), _rel(2, "herlas", ["b", "a"])]
    assert merge_osm_lines(rels)[0]["ref"] == "ΗΚ-ΑΡΧ"

def test_merge_distinct_operators_or_termini_stay_separate():
    rels = [_rel(1, "herlas", ["a", "b"]), _rel(2, "ektel", ["a", "b"]),
            _rel(3, "herlas", ["a", "c"])]
    assert len(merge_osm_lines(rels)) == 3

def test_merge_drops_too_short():
    assert merge_osm_lines([_rel(1, "herlas", ["a"])]) == []
