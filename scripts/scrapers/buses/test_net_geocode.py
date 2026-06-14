from net_geocode import collect_stops, stop_slug, geocode_stop

def test_stop_slug_normalises():
    assert stop_slug("Agios Nikolaos") == "agios-nikolaos"
    assert stop_slug("  HERAKLION ") == "heraklion"
    assert stop_slug("Chora Sfakion & Port") == "chora-sfakion-and-port"

def test_collect_stops_dedup_from_via_to():
    routes = [
        {"from_place": "Heraklion", "to_place": "Sitia", "via_stops": ["Malia", "Agios Nikolaos"]},
        {"from_place": "Heraklion", "to_place": "Malia",  "via_stops": None},
    ]
    stops = collect_stops(routes)
    slugs = sorted(s["slug"] for s in stops)
    assert slugs == ["agios-nikolaos", "heraklion", "malia", "sitia"]

def test_geocode_stop_referentiel_first():
    place_coords = {"heraklion": (35.3387, 25.1442)}
    lat, lng, source, conf = geocode_stop("Heraklion", place_coords, {}, nominatim=None)
    assert (round(lat, 2), round(lng, 2)) == (35.34, 25.14)
    assert source == "referentiel" and conf == "high"

def test_geocode_stop_cb_places_second():
    cb_index = {"some-village": (35.10, 25.50)}
    lat, lng, source, conf = geocode_stop("Some Village", {}, cb_index, nominatim=None)
    assert (lat, lng) == (35.10, 25.50)
    assert source == "cb_places" and conf == "high"

def test_geocode_stop_nominatim_third():
    called = {}
    def fake_nominatim(name):
        called["name"] = name
        return (35.0, 25.0)
    lat, lng, source, conf = geocode_stop("Unknown Hamlet", {}, {}, nominatim=fake_nominatim)
    assert (lat, lng) == (35.0, 25.0)
    assert source == "geocoded" and conf == "low"
    assert called["name"] == "Unknown Hamlet"

def test_geocode_stop_none_when_unresolvable():
    lat, lng, source, conf = geocode_stop("Nowhere", {}, {}, nominatim=lambda n: None)
    assert lat is None and lng is None and source == "none"
