from osm_feed import line_shape, shape_id_for


def test_line_shape_swaps_lng_lat():
    line = {"geometry": [[25.14, 35.34], [25.39, 35.31]]}   # [lng, lat]
    assert line_shape(line) == [(35.34, 25.14), (35.31, 25.39)]


def test_line_shape_empty_when_no_geometry():
    assert line_shape({"geometry": None}) == []
    assert line_shape({}) == []


def test_shape_id_for_stable():
    assert shape_id_for(42) == "shp-42"
    assert shape_id_for(42) == shape_id_for(42)
