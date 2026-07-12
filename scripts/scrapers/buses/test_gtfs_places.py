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


# --- Lot 3 : Homographes --- Platanias CHA vs RET ---

def test_platanias_maps_to_platanias_chania():
    """Platanias (sans suffixe) = Platanias Chania (ouest Chania, le plus fréquent)."""
    assert canonical_slug("Platanias") == "platanias-chania"


def test_platanias_rethymno_maps_to_platanias_rethymno():
    """Platanias Rethymno (suffixe explicite) = commune RET distincte."""
    assert canonical_slug("Platanias Rethymno") == "platanias-rethymno"


def test_platanias_chania_coords_in_prices():
    """prices.py doit connaître platanias-chania (clé renommée, CHA coords)."""
    from prices import PLACE_COORDS
    assert "platanias-chania" in PLACE_COORDS
    lat, lon = PLACE_COORDS["platanias-chania"]
    assert 35.4 < lat < 35.6 and 23.8 < lon < 24.1  # ouest Chania


def test_platanias_ambiguous_slug_removed_from_prices():
    """La clé ambiguë 'platanias' ne doit plus exister dans prices.py."""
    from prices import PLACE_COORDS
    assert "platanias" not in PLACE_COORDS
