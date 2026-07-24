"""Tests durées plan B (chantier 2, 13/06/2026)."""
import re

from durations import (
    CURATED_DURATIONS,
    enrich_durations,
    estimate_duration,
    lookup_curated_duration,
    BASE_MIN,
    MIN_PER_KM,
)
from prices import PLACE_COORDS, haversine_km


def _to_min(s):
    h = re.search(r"(\d+)\s*h", s)
    m = re.search(r"(\d+)\s*min", s)
    return (int(h.group(1)) * 60 if h else 0) + (int(m.group(1)) if m else 0)


def test_lookup_is_symmetric():
    assert lookup_curated_duration("Rethymno", "Plakias") == "40min"
    assert lookup_curated_duration("Plakias", "Rethymno") == "40min"
    assert lookup_curated_duration("Nulle", "Part") is None


def test_duration_envelope_calibration():
    """L'estimateur doit etre une ENVELOPPE : jamais en dessous de la duree
    reelle sur les paires de reference (sous-estimer = bus rate). References =
    durees operateur (CURATED_HERLAS/EKTEL) + grandes liaisons greeka."""
    refs = {
        ("chania", "rethymno"): 60,
        ("chania", "heraklion"): 150,
        ("rethymno", "heraklion"): 90,
        ("heraklion", "agios nikolaos"): 90,
        ("heraklion", "siteia"): 210,
        ("heraklion", "ierapetra"): 150,
        ("agios nikolaos", "siteia"): 105,
        ("agios nikolaos", "ierapetra"): 40,
        ("rethymno", "plakias"): 40,
        ("rethymno", "agia galini"): 55,
    }
    for (a, b), real_min in refs.items():
        if a not in PLACE_COORDS or b not in PLACE_COORDS:
            continue
        km = haversine_km(PLACE_COORDS[a], PLACE_COORDS[b])
        est = BASE_MIN + km * MIN_PER_KM
        assert est >= real_min, f"{a}-{b}: estimation {est:.0f}min < reel {real_min}min"


def test_estimate_format_and_unknown():
    s = estimate_duration("Heraklion", "Makry Gyalos")
    assert s is not None and re.fullmatch(r"(\d+h( \d+min)?|\d+min)", s)
    assert estimate_duration("Heraklion", "Vasia Hotel-Supermarket") is None


def test_enrich_priorities():
    routes = [
        # deja scrape/overlay -> intouche, pas estime
        {"from_place": "Chania", "to_place": "Rethymno", "duration": "1h"},
        # cure greeka -> applique, flag False
        {"from_place": "Rethymno", "to_place": "Plakias", "duration": None},
        # ni cure ni scrape mais coords -> estime, flag True
        {"from_place": "Heraklion", "to_place": "Makry Gyalos", "duration": None},
        # coords inconnues -> rien
        {"from_place": "Heraklion", "to_place": "Vasia Hotel-Supermarket", "duration": None},
    ]
    enrich_durations(routes)
    assert routes[0]["duration"] == "1h" and routes[0]["duration_estimated"] is False
    assert routes[1]["duration"] == "40min" and routes[1]["duration_estimated"] is False
    assert routes[2]["duration"] is not None and routes[2]["duration_estimated"] is True
    assert routes[3]["duration"] is None and routes[3]["duration_estimated"] is False


def test_curated_no_operator_conflict():
    """Les paires deja couvertes par les grilles operateur (overlay applique
    AVANT enrich_durations) ne doivent pas etre redefinies ici : l'operateur
    prime sur greeka."""
    from parsers import CURATED_HERLAS_DURATIONS_PRICES, CURATED_EKTEL
    operator_pairs = set(CURATED_HERLAS_DURATIONS_PRICES)
    for c in CURATED_EKTEL:
        operator_pairs.add((c["from_place"].lower(), c["to_place"].lower()))
    for pair in CURATED_DURATIONS:
        assert pair not in operator_pairs and (pair[1], pair[0]) not in operator_pairs, pair
