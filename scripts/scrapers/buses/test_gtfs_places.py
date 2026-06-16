from gtfs_places import status_of, canonical_slug, display_name


def test_allowlist_place_is_canonical():
    assert status_of("Heraklion") == "allowlist"
    assert canonical_slug("Heraklion") == "heraklion"


def test_named_hotel_or_poi_is_kept_as_stop():
    # En GTFS un arrêt est un arrêt : hôtels/POI nommés -> stop, JAMAIS drop.
    for name in ["Malia Palace", "University Gallou", "Botanical Garden", "Blue Bay", "Chania Express"]:
        assert status_of(name) == "stop", name
        assert canonical_slug(name) is not None, name


def test_structural_artifact_is_dropped():
    for name in ["A90", "90", "E75", "on the national road", "   ", ""]:
        assert status_of(name) == "drop", name
        assert canonical_slug(name) is None, name


def test_alias_typo_fixed():
    assert canonical_slug("rerhymno") == canonical_slug("Rethymno")


def test_display_name_titlecase():
    assert display_name("some village") == "Some Village"


def test_none_input_is_dropped_safely():
    # données sales (via_stops null) : pas de crash, traité comme drop
    assert status_of(None) == "drop"
    assert canonical_slug(None) is None
