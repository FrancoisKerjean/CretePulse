"""Tests scraper alertes service KTEL Est sur fixtures HTML réelles."""
import os

from alerts import parse_alerts_index, match_places, _to_iso

FIXDIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _read(name):
    with open(os.path.join(FIXDIR, name), encoding="utf-8") as f:
        return f.read()


def test_to_iso_parses_dotted_date():
    assert _to_iso("28.05.2026") == "2026-05-28"
    assert _to_iso("rien") is None


def test_match_places_detects_lines_in_title():
    assert match_places("BUS ROUTE CHANGES FOR EXPRESS HERAKLEION - CHANIA") == ["Heraklion", "Chania"]
    assert match_places("MATALA BEACH FEST") == ["Matala"]
    assert match_places("generic title") == []


def test_parse_alerts_index_real_fixture_mods():
    items = parse_alerts_index(_read("herlas_alerts_mods.html"), "mods")
    assert len(items) > 0
    it = items[0]
    assert set(["slug", "title", "category", "published_date", "url", "matched_routes"]).issubset(it.keys())
    assert it["category"] == "mods"
    # url absolue vers l'annonce officielle
    assert all(i["url"].startswith("https://www.ktelherlas.gr/en/news/") for i in items)
    # chaque slug unique
    assert len(set(i["slug"] for i in items)) == len(items)


def test_parse_alerts_keeps_real_disruptions():
    items = parse_alerts_index(_read("herlas_alerts_mods.html"), "mods")
    titles = " || ".join(i["title"].upper() for i in items)
    # vraies perturbations conservées
    assert "ROADWORKS" in titles or "ROUTE CHANGES" in titles
    assert any("HOLY SPIRIT" in i["title"].upper() for i in items)


def test_parse_alerts_filters_out_promo():
    items = parse_alerts_index(_read("herlas_alerts_mods.html"), "mods")
    titles = [i["title"].upper() for i in items]
    # promo / bruit jamais en alerte
    assert not any("BEACH FEST" in t for t in titles)
    assert not any("SANTORINI" in t for t in titles)
    assert not any(t.strip().isdigit() for t in titles)  # slug numérique vide


def test_parse_alerts_extra_routes_fixture():
    items = parse_alerts_index(_read("herlas_alerts_extra.html"), "extra_routes")
    assert all(i["category"] == "extra_routes" for i in items)
    # toutes datées au format ISO ou None, jamais le format brut
    for i in items:
        assert i["published_date"] is None or len(i["published_date"]) == 10
