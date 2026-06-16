from gtfs_feed_build import parse_duration_min, add_minutes

def test_parse_duration_hours_minutes():
    assert parse_duration_min("2h 30min") == 150
    assert parse_duration_min("50min") == 50
    assert parse_duration_min("1h") == 60

def test_parse_duration_none_when_absent_or_unreadable():
    assert parse_duration_min(None) is None
    assert parse_duration_min("") is None
    assert parse_duration_min("bientot") is None

def test_add_minutes_basic():
    assert add_minutes("08:00", 90) == "09:30:00"
    assert add_minutes("08:05", 0) == "08:05:00"

def test_add_minutes_after_midnight_exceeds_24h():
    # GTFS tolère >24:00:00 pour un trajet qui passe minuit
    assert add_minutes("23:30", 60) == "24:30:00"


from gtfs_feed_build import assemble_feed
from gtfs_calendar import days_to_weekdays, service_id_for

STOPS = {
    "heraklion":      {"stop_id": "heraklion",      "stop_name": "Heraklion",      "stop_lat": 35.3400, "stop_lon": 25.1400},
    "hersonissos":    {"stop_id": "hersonissos",    "stop_name": "Hersonissos",    "stop_lat": 35.3100, "stop_lon": 25.3900},
    "agios-nikolaos": {"stop_id": "agios-nikolaos", "stop_name": "Agios Nikolaos", "stop_lat": 35.1900, "stop_lon": 25.7100},
}
WINDOW = ("20260601", "20260831")

def _tbl(feed, name):
    header, rows = feed[name]
    return [dict(zip(header, r)) for r in rows]

def test_full_geocoded_route_emits_trip_and_stop_times():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Hersonissos"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    trips = _tbl(feed, "trips")
    st = _tbl(feed, "stop_times")
    assert len(trips) == 1
    assert trips[0]["service_id"] == service_id_for(days_to_weekdays("Mon-Fri"))
    assert len(st) == 3
    seq = [r for r in st if r["trip_id"] == trips[0]["trip_id"]]
    assert [r["stop_id"] for r in seq] == ["heraklion", "hersonissos", "agios-nikolaos"]
    assert [r["timepoint"] for r in seq] == [1, 0, 1]
    assert seq[0]["departure_time"] == "08:00:00"

def test_calendar_has_one_service_row():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    cal = _tbl(feed, "calendar")
    assert len(cal) == 1
    assert cal[0]["monday"] == 1 and cal[0]["saturday"] == 0
    assert cal[0]["start_date"] == "20260601" and cal[0]["end_date"] == "20260831"

def test_ungeocoded_intermediate_is_skipped_trip_kept():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Nowhere Village"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    st = _tbl(feed, "stop_times")
    assert [r["stop_id"] for r in st] == ["heraklion", "agios-nikolaos"]
    assert feed["stats"]["skipped_intermediates"] == ["nowhere-village"]

def test_trip_dropped_when_terminus_not_geocoded():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Ghost Town",
        "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    assert _tbl(feed, "trips") == []
    assert len(feed["stats"]["dropped_trips"]) == 1

def test_estimated_duration_marks_arrival_timepoint_zero():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": [], "duration": None,
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    st = _tbl(feed, "stop_times")
    assert [r["timepoint"] for r in st] == [1, 0]
    assert st[-1]["departure_time"] != "08:00:00"

def test_direction_id_zero_when_departing_from_canonical_origin():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Agios Nikolaos", "to_place": "Heraklion",
        "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    trips = _tbl(feed, "trips")
    # origine canonique du corridor = 'agios-nikolaos' (alpha 1er). Route part de
    # agios-nikolaos == origine => direction_id 0.
    assert trips[0]["direction_id"] == 0

def test_forward_direction_id_is_one():
    # 'agios-nikolaos' < 'heraklion' => origine canonique = agios-nikolaos.
    # Une route Heraklion -> Agios Nikolaos NE part PAS de l'origine => direction_id 1.
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    trips = _tbl(feed, "trips")
    assert trips[0]["direction_id"] == 1

def test_season_filter_excludes_other_seasons():
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
         "via_stops": [], "duration": "1h",
         "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": "low"},
    ]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None, seasons=["high"])
    assert _tbl(feed, "trips") == []

def test_referential_integrity_and_determinism():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Hersonissos"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    f1 = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    f2 = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    assert f1["trips"][1] == f2["trips"][1]
    stops_ids = {r[0] for r in f1["stops"][1]}
    st_ids = {r[3] for r in f1["stop_times"][1]}
    route_ids = {r[0] for r in f1["routes"][1]}
    assert st_ids <= stops_ids
    assert all(r[0] in route_ids for r in f1["trips"][1])


import os
import zipfile
from gtfs_feed_build import write_feed, package_zip, GTFS_FILES

def _mini_feed():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Hersonissos"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    return assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)

def test_write_feed_creates_all_files(tmp_path):
    feed = _mini_feed()
    write_feed(feed, str(tmp_path))
    for fname in GTFS_FILES:
        assert (tmp_path / fname).exists(), fname
    stops = (tmp_path / "stops.txt").read_text(encoding="utf-8")
    assert stops.startswith("stop_id,stop_name,stop_lat,stop_lon\n")
    notice = (tmp_path / "NOTICE.txt").read_text(encoding="utf-8")
    assert "timepoint=0" in notice and "ESTIMATES" in notice

def test_package_zip_contains_gtfs_files(tmp_path):
    feed = _mini_feed()
    write_feed(feed, str(tmp_path))
    zip_path = package_zip(str(tmp_path), str(tmp_path / "crete.zip"))
    with zipfile.ZipFile(zip_path) as z:
        names = set(z.namelist())
    assert {"agency.txt", "routes.txt", "trips.txt", "stop_times.txt",
            "calendar.txt", "feed_info.txt", "stops.txt"} <= names


def test_stop_in_water_is_excluded_from_feed():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Hersonissos"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    fake_on_land = lambda lat, lng: not (abs(lat - 35.31) < 1e-6 and abs(lng - 25.39) < 1e-6)
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None, on_land=fake_on_land)
    st = _tbl(feed, "stop_times")
    stop_ids = {r[0] for r in feed["stops"][1]}
    assert "hersonissos" not in stop_ids
    assert [r["stop_id"] for r in st] == ["heraklion", "agios-nikolaos"]

def test_terminus_in_water_drops_trip():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": [], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    fake_on_land = lambda lat, lng: not (abs(lat - 35.19) < 1e-6 and abs(lng - 25.71) < 1e-6)
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None, on_land=fake_on_land)
    assert _tbl(feed, "trips") == []
    assert len(feed["stats"]["dropped_trips"]) == 1

def test_on_land_none_keeps_all_stops():
    routes = [{
        "id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Agios Nikolaos",
        "via_stops": ["Hersonissos"], "duration": "1h",
        "departures_by_day": [{"days": "Mon-Fri", "times": ["08:00"]}], "season": None,
    }]
    feed = assemble_feed(routes, STOPS, WINDOW, "20260616", osrm=None)
    assert len(feed["stop_times"][1]) == 3
