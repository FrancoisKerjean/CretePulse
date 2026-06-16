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
