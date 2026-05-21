"""Tests parsers KTEL sur fixtures HTML reelles (committees dans fixtures/).
Architecture reelle (cf. spec + decision Kami 21/05) :
  - herlas (est) = Next.js : index liste des liens detail `ds=`, page detail = blocs route.
  - ektel (ouest) = Joomla : index = groupes + dates 'valid from' (curation pour les routes).
"""
import os

from parsers import (
    parse_herlas_index,
    parse_herlas_detail,
    parse_ektel_index,
    is_crete_route,
    CURATED_EKTEL,
)

FIXDIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _read(name):
    with open(os.path.join(FIXDIR, name), encoding="utf-8") as f:
        return f.read()


# --- herlas (est) -----------------------------------------------------------

def test_parse_herlas_index_returns_detail_urls():
    urls = parse_herlas_index(_read("herlas_timetables.html"))
    assert isinstance(urls, list)
    assert len(urls) > 0
    # chaque url pointe vers une page detail timetable parametree par stations
    assert all("/timetables/timetable" in u and "ds=" in u for u in urls)
    # absolues (fetchables tel quel)
    assert all(u.startswith("http") for u in urls)


def test_parse_herlas_detail_returns_normalized_routes():
    routes = parse_herlas_detail(_read("herlas_route_detail.html"))
    assert isinstance(routes, list)
    assert len(routes) > 0
    r = routes[0]
    assert set(["from_place", "to_place", "duration", "price_eur", "frequency", "departures"]).issubset(r.keys())
    assert isinstance(r["from_place"], str) and r["from_place"]
    assert isinstance(r["to_place"], str) and r["to_place"]
    # le detail fixture contient au moins HERAKLION - RETHYMNO
    pairs = {(r["from_place"].upper(), r["to_place"].upper()) for r in routes}
    assert ("HERAKLION", "RETHYMNO") in pairs
    # departures = liste d'heures HH:MM si presentes
    withtimes = [r for r in routes if r["departures"]]
    assert withtimes, "au moins une route avec des horaires"
    assert all(":" in t for t in withtimes[0]["departures"])
    assert withtimes[0]["price_eur"] is None or isinstance(withtimes[0]["price_eur"], (int, float))


# --- ektel (ouest) ----------------------------------------------------------

def test_parse_ektel_index_returns_groups_with_dates():
    groups = parse_ektel_index(_read("ektel_timetables.html"))
    assert isinstance(groups, list)
    assert len(groups) > 0
    g = groups[0]
    assert "label" in g and "valid_from" in g
    # au moins un groupe mentionne CHANIA
    assert any("CHANIA" in (gr["label"] or "").upper() for gr in groups)
    # au moins une date valid_from au format ISO (YYYY-MM-DD) extraite
    assert any(gr["valid_from"] and len(gr["valid_from"]) == 10 for gr in groups)


def test_is_crete_route_excludes_mainland():
    # intra-Crete : garde
    assert is_crete_route("Heraklion", "Rethymno") is True
    assert is_crete_route("Sitia", "Ierapetra") is True
    # liaisons continent (via ferry) : exclu
    assert is_crete_route("Thessaloniki", "Heraklion") is False
    assert is_crete_route("Heraklion", "Athens") is False
    assert is_crete_route("Patra", "Heraklion") is False


def test_herlas_detail_keeps_only_crete_routes():
    routes = parse_herlas_detail(_read("herlas_route_detail.html"))
    for r in routes:
        assert is_crete_route(r["from_place"], r["to_place"])


def test_curated_ektel_is_usable_west_seed():
    # curation des routes ouest connues du terrain (Chania/Rethymno/Heraklion + airport)
    assert isinstance(CURATED_EKTEL, list) and len(CURATED_EKTEL) >= 3
    r = CURATED_EKTEL[0]
    assert set(["from_place", "to_place", "frequency"]).issubset(r.keys())
