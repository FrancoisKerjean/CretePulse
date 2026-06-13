"""Tests parsers KTEL sur fixtures HTML reelles (committees dans fixtures/).
Architecture reelle (cf. spec + decision Kami 21/05) :
  - herlas (est) = Next.js : index liste des liens detail `ds=`, page detail = blocs route.
  - ektel (ouest) = Joomla : index = groupes + dates 'valid from' (curation pour les routes).
"""
import json
import os
import re

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


def _columnized_text(words_json):
    """Charge une fixture mots (x0/x1/top par page) et renvoie le texte
    de-entrelace en colonnes, pret pour parse_ektel_pdf."""
    from parsers import columnize_words
    data = json.loads(_read(words_json))
    return "\n".join(columnize_words(p["words"], p["width"]) for p in data["pages"])


def _pairs(routes):
    out = {}
    for r in routes:
        out.setdefault((r["from_place"], r["to_place"]), r)
    return out


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
    # chaque depart = un seul horaire HH:MM exact (pas de conteneur colle '09:4515:15')
    assert all(re.match(r"^\d{1,2}:\d{2}$", t) for t in withtimes[0]["departures"])
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


# --- ektel PDF : arrets intermediaires (via_stops) ---------------------------
# Les noms de lignes PDF contiennent la sequence complete d'arrets
# ('CHANIA-GEORGIOUPOLIS-KAVROS-RETHYMNO-BALI-HERAKLION'). Avant le 13/06/2026
# on jetait les intermediaires ; desormais ils sont conserves dans via_stops.

def test_route_stops_extracts_full_sequence():
    from parsers import _route_stops
    stops = _route_stops("CHANIA-GEORGIOUPOLIS-KAVROS-RETHYMNO-BALI-HERAKLION")
    assert stops == ["Chania", "Georgioupolis", "Kavros", "Rethymno", "Bali", "Heraklion"]


def test_route_stops_aliases_xania_to_chania():
    # XANIA = translitteration grecque de Chania : c'est un VRAI terminus,
    # pas du bruit (bug pre-13/06 : il etait jete -> 'Maleme -> Creta Paradise').
    from parsers import _route_stops
    assert _route_stops("RETHYMNO-XANIA") == ["Rethymno", "Chania"]


def test_route_stops_aliases_truncated_museum():
    # PDF Rethymno 2 colonnes : le nom 'MUSEUM OF ANCIENT ELEFTHERNA' est
    # coupe au wrap de colonne -> les 2 formes pointent le meme lieu canonique.
    from parsers import _route_stops
    assert _route_stops("PANORMO-PERAMA-MARGARITES-MUSEUM OF ANCIENT") == \
        ["Panormo", "Perama", "Margarites", "Ancient Eleftherna Museum"]
    assert _route_stops("RETHYMNO-ARKADI-MUSEUM OF ANCIENT ELEFTHERNA") == \
        ["Rethymno", "Arkadi", "Ancient Eleftherna Museum"]


def test_route_stops_drops_hotel_stops():
    # Arrets hotels de la navette Maleme : jamais des terminus ni des vias.
    from parsers import _route_stops
    stops = _route_stops("MALEME-HOTELS AEGEAN PALACE-VILLA HELIOS-CRETA PARADISE-XANIA")
    assert stops == ["Maleme", "Chania"]
    # ligne entierement hotels sauf un bout -> pas une route exploitable
    assert _route_stops("CHANIA-CRETA PARADISE-VILLA HELIOS-AEGEAN PALACE HOTELS") is None


def test_route_stops_cleans_star_and_abbreviations():
    from parsers import _route_stops
    # KASTELI canonise en KISSAMOS (meme ville, alias 13/06) -> '*' retire aussi.
    stops = _route_stops("CHANIA-KASTELI*-PLATANOS-FALASARNA")
    assert stops == ["Chania", "Kissamos", "Platanos", "Falasarna"]
    stops = _route_stops("CHANIA - STALOS - AG. MARINA - PLATANIAS - GERANI - MALEME - TAVRONITIS - KAMISIANA - SKOYTELONAS - KOLYMBARI")
    assert stops is not None
    assert stops[0] == "Chania" and stops[-1] == "Kolymbari"
    assert "Agia Marina" in stops and "Platanias" in stops


def test_parse_ektel_pdf_real_fixture_emits_via_stops():
    from parsers import parse_ektel_pdf
    routes = parse_ektel_pdf(_read("ektel_chania_2026-06.txt"), source_url="x")
    # premiere occurrence par paire (l'EXPRESS Chania-Heraklion sans via vient apres)
    by_pair: dict = {}
    for r in routes:
        by_pair.setdefault((r["from_place"], r["to_place"]), r)
    # Ligne principale : vias conserves dans l'ordre
    main = by_pair[("Chania", "Heraklion")]
    assert main["via_stops"] == ["Georgioupolis", "Kavros", "Rethymno", "Bali"]
    # Retour symetrique
    back = by_pair[("Heraklion", "Chania")]
    assert back["via_stops"] == ["Bali", "Rethymno", "Kavros", "Georgioupolis"]
    # Route sans intermediaires -> via_stops None
    assert by_pair[("Rethymno", "Chania")]["via_stops"] is None
    # Plus aucun endpoint hotel (bruit pre-13/06)
    for f, t in by_pair:
        for w in ("Hotel", "Villa", "Palace", "Paradise"):
            assert w not in f and w not in t, (f, t)


def test_parse_ektel_pdf_real_fixture_no_regression():
    # La fixture reelle doit produire un volume plausible et que du Crete-only.
    from parsers import parse_ektel_pdf
    routes = parse_ektel_pdf(_read("ektel_chania_2026-06.txt"), source_url="x")
    assert len(routes) >= 15
    for r in routes:
        assert is_crete_route(r["from_place"], r["to_place"])
        assert r["departures"], r


# --- ektel PDF : bruit constate en prod le 10/06/2026 -------------------------

def test_parse_ektel_pdf_filters_mainland_footnotes_and_freq():
    from parsers import parse_ektel_pdf
    text = "\n".join([
        "XANIA-THESSALONIKH / CHANIA-THESSALONIKI",
        "KATHHMERINA / EVERY DAY 08:00",
        "XANIA-RETHYMNO / CHANIA-RETHYMNO",
        "KATHHMERINA / EVERY DAY 07:00 09:00",
        "/ MONDAY - FRIDAY 06:30",
        "/ DEPARTURE AFTER THE ARRIVAL OF THE FERRY BOAT FROM BALOS - GRAMVOUSA",
        "/ THROUGH MILONIANA - VARIPETRO",
        "/ PASSES THROUGH MYRTHIOS - MARIOU",
    ])
    routes = parse_ektel_pdf(text, source_url="x")
    names = {(r["from_place"], r["to_place"]) for r in routes}
    assert ("Chania", "Thessaloniki") not in names      # continent exclu
    assert all("Through" not in f and "Departure" not in f for f, _ in names)
    assert ("Monday", "Friday") not in names            # frequency, pas une route
    assert ("Chania", "Rethymno") in names
    # MONDAY - FRIDAY 06:30 = sous-grille de la route active, pas une route
    cr = next(r for r in routes if r["to_place"] == "Rethymno")
    assert any(g["days"].lower().startswith("monday") for g in cr["departures_by_day"])
    assert "06:30" in cr["departures"]


# --- ektel PDF : de-entrelacement 2 colonnes (columnize_words) ---------------
# Bug pre-13/06 : extract_text() aplatit 'ALLER ... RETOUR ...' sur une ligne
# -> horaires des paires cote a cote melanges (Elafonisi, Kissamos, Airport
# restaient sans horaires, repli sur CURATED_EKTEL = carte vide).

def test_columnize_mono_column_is_noop():
    # Une page mono-colonne (aucune gouttiere) ne doit jamais etre coupee.
    from parsers import columnize_words
    words = [
        {"text": "CHANIA-HERAKLION", "x0": 45, "x1": 200, "top": 10},
        {"text": "EVERY", "x0": 45, "x1": 80, "top": 24},
        {"text": "DAY", "x0": 82, "x1": 110, "top": 24},
        {"text": "08:00", "x0": 45, "x1": 75, "top": 38},
    ]
    out = columnize_words(words, page_width=595)
    assert out.splitlines() == ["CHANIA-HERAKLION", "EVERY DAY", "08:00"]


def test_columnize_recovers_elafonisi_and_kissamos_times():
    from parsers import parse_ektel_pdf
    routes = parse_ektel_pdf(_columnized_text("ektel_chania_words.json"), source_url="x")
    by = _pairs(routes)
    # Elafonissi (alias 1s->2s) : aller 09:00 (gauche), retour 16:00 (droite)
    assert ("Chania", "Elafonissi") in by
    assert "09:00" in by[("Chania", "Elafonissi")]["departures"]
    assert "16:00" in by[("Elafonissi", "Chania")]["departures"]
    # Kissamos (ex-"Kasteli (Kissamos)") : ligne reelle 06:00->21:30
    assert ("Chania", "Kissamos") in by
    deps = by[("Chania", "Kissamos")]["departures"]
    assert "06:00" in deps and "21:30" in deps


def test_columnize_airport_recovers_chania_airport_times():
    from parsers import parse_ektel_pdf
    routes = parse_ektel_pdf(_columnized_text("ektel_airport_words.json"), source_url="x")
    by = _pairs(routes)
    # PDF aeroport dedie : noms anglais sans '/' + 2 colonnes -> 0 route avant le fix
    assert ("Chania", "Chania Airport") in by
    assert len(by[("Chania", "Chania Airport")]["departures"]) >= 20
    assert ("Chania Airport", "Chania") in by


def test_pdf_seg_regex_captures_parenthesized_name():
    # Suffixe entre parentheses ne doit plus jeter la route (fix lookahead '(').
    from parsers import parse_ektel_pdf
    text = "\n".join([
        "XANIA-KAΣΤΕΛΙ/CHANIA-KASTELI (KISSAMOS)",
        "KAΘΕ ΜΕΡΑ/EVERY DAY",
        "06:00 07:00 21:30",
    ])
    by = _pairs(parse_ektel_pdf(text, source_url="x"))
    assert ("Chania", "Kissamos") in by
    assert "21:30" in by[("Chania", "Kissamos")]["departures"]
