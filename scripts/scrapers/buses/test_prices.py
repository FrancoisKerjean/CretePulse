"""Tests du module prices (plan B : cures + estimation au km)."""
from prices import (
    BASE_FARE,
    CURATED_PRICES,
    EUR_PER_KM,
    PLACE_COORDS,
    enrich_prices,
    estimate_price,
    haversine_km,
    lookup_curated,
)


def test_lookup_curated_is_symmetric():
    assert lookup_curated("Heraklion", "Malia") == lookup_curated("Malia", "Heraklion")
    assert lookup_curated("Heraklion", "Malia") is not None


def test_estimate_price_known_coords_plausible():
    # Heraklion -> Siteia ~ 90 km a vol d'oiseau : prix entre 8 et 20 EUR, arrondi 0.10
    p = estimate_price("Heraklion", "Siteia")
    assert p is not None and 8.0 <= p <= 20.0
    assert round(p * 10) == p * 10


def test_estimate_price_unknown_place_returns_none():
    assert estimate_price("Heraklion", "A1 Super Market Nowhere") is None


def test_enrich_keeps_official_price():
    routes = [{"from_place": "Chania", "to_place": "Rethymno", "price_eur": 6.2}]
    enrich_prices(routes)
    assert routes[0]["price_eur"] == 6.2
    assert routes[0]["price_estimated"] is False


def test_enrich_prefers_curated_over_estimate():
    routes = [{"from_place": "Heraklion", "to_place": "Malia", "price_eur": None}]
    enrich_prices(routes)
    assert routes[0]["price_eur"] == lookup_curated("Heraklion", "Malia")
    assert routes[0]["price_estimated"] is False


def test_enrich_estimates_when_no_curated():
    routes = [{"from_place": "Heraklion", "to_place": "Mochos", "price_eur": None}]
    enrich_prices(routes)
    assert routes[0]["price_eur"] is not None
    assert routes[0]["price_estimated"] is True


def test_enrich_leaves_none_when_unknown_coords():
    routes = [{"from_place": "Blue Bay", "to_place": "Zorbas Village", "price_eur": None}]
    enrich_prices(routes)
    assert routes[0]["price_eur"] is None
    assert routes[0]["price_estimated"] is False


def test_west_curated_and_estimation():
    # Cure ouest (greeka 10/06/2026)
    assert lookup_curated("Chania", "Paleochora") == 8.30
    assert lookup_curated("Plakias", "Rethymno") == 5.00  # symetrique
    # Estimation ouest : Chania -> Omalos (pas de prix cure, coords connues)
    routes = [{"from_place": "Chania", "to_place": "Omalos", "price_eur": None}]
    enrich_prices(routes)
    assert routes[0]["price_estimated"] is True
    assert 2.0 <= routes[0]["price_eur"] <= 10.0


def test_eur_per_km_calibration():
    """EUR_PER_KM doit rester proche du ratio moyen des prix cures (±25 %)."""
    ratios = []
    for (a, b), price in CURATED_PRICES.items():
        if a in PLACE_COORDS and b in PLACE_COORDS:
            km = haversine_km(PLACE_COORDS[a], PLACE_COORDS[b])
            if km > 5:
                ratios.append((price - BASE_FARE) / km)
    mean = sum(ratios) / len(ratios)
    assert abs(EUR_PER_KM - mean) / mean < 0.25, f"recalibrer EUR_PER_KM ~ {mean:.3f}"
