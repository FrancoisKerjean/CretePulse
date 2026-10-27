"""« La Crète en chiffres » : rendu déterministe des 4 locales depuis un relevé figé (octobre 2026)."""
import importlib.util
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("chiffres", ROOT / "chiffres-mensuels.py")
cm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cm)

DATA = json.loads((ROOT / "tests/fixtures/chiffres-2026-10.json").read_text(encoding="utf-8"))
GUIDE = cm.build_guide(DATA)


def test_formats_par_locale():
    assert cm.fmt_int(1531109, "en") == "1,531,109"
    assert cm.fmt_int(1531109, "fr") == "1\u202f531\u202f109"
    assert cm.fmt_int(1531109, "de") == "1.531.109"
    assert cm.fmt_pct(3.88, "en") == "+3.9%"
    assert cm.fmt_pct(-10.66, "fr") == "−10,7\u202f%"
    assert cm.fmt_pct(-24.8, "fr", signed=False) == "24,8\u202f%"  # jamais « baisse de −24,8 % »
    assert cm.fmt_eur(128, "en") == "€128" and cm.fmt_eur(128, "de") == "128\u202f€"


def test_quatre_locales_distinctes_et_indexables():
    assert GUIDE["slug"] == "crete-in-numbers-2026-10"
    assert GUIDE["category"] == "data" and GUIDE["format"] == "long"
    contents = GUIDE["contents"]
    assert set(contents) == {"en", "fr", "de", "el"}
    assert len({c.strip() for c in contents.values()}) == 4  # isGuideTranslated exige ≠ EN
    for loc, html in contents.items():
        assert "{" not in html and "}" not in html, f"gabarit non rempli en {loc}"
        h2 = re.findall(r"<h2 id=\"([a-z]+)\">", html)
        assert h2[:2] == ["airports", "flights"] and h2[-1] == "method", loc
        assert html.count("source-attribution") >= 5, loc
        assert len(GUIDE["faqs"][loc]) == 3


def test_chiffres_sources_presents():
    fr = GUIDE["contents"]["fr"]
    assert "2\u202f203\u202f062" in fr and "+5,1\u202f%" in fr  # total HCAA sept 2026 vs 2025
    assert "4\u202f657" in fr and "baisse de 24,8\u202f%" in fr  # arrivées 1-26 oct vs 1-26 sept
    assert "38</strong> escales" in fr and "48\u202f268" in fr
    assert "27\u202f381" in fr and "128\u202f€" in fr and "96,6\u202f%" in fr
    assert "1\u202f017" in fr


def test_grammaire_fr_et_grec():
    fr = GUIDE["contents"]["fr"]
    assert "Chiffres d'octobre 2026" in fr and "de octobre" not in fr
    assert "millions</strong> de visites" in fr
    el = GUIDE["contents"]["el"]
    assert "είναι ο <strong>Σεπτέμβριος 2026" in el          # nominatif après l'article
    assert "τον Οκτώβριο 2026" in el and "τον Οκτωβρίου" not in el  # accusatif après « τον »
    assert "Σεπτεμβρίου 2026.</em>" in el                      # génitif dans la source
    assert "Σεπτέμβριο 2026;" in GUIDE["faqs"]["el"][0]["q"]


def test_titres_et_meta():
    assert GUIDE["titles"]["fr"].startswith("La Crète en chiffres, octobre 2026")
    assert GUIDE["titles"]["el"].startswith("Η Κρήτη σε αριθμούς, Οκτώβριος 2026")
    for loc in cm.LOCALES:
        assert 60 < len(GUIDE["meta_descs"][loc]) < 320
    assert GUIDE["read_time"] >= 3
