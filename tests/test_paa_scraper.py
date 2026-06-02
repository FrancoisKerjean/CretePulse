from pathlib import Path
from lib.paa_scraper import extract_paa_questions, fetch_autocomplete

def test_extract_paa_questions_from_fixture():
    html = (Path(__file__).parent / "fixtures" / "google_serp_sample.html").read_text(encoding="utf-8")
    questions = extract_paa_questions(html)
    assert len(questions) >= 3
    assert any("best time to visit" in q.lower() for q in questions)

def test_extract_paa_questions_empty_html():
    assert extract_paa_questions("<html></html>") == []

def test_fetch_autocomplete_returns_list(monkeypatch):
    import lib.paa_scraper as paa
    monkeypatch.setattr(paa, "_http_get_json", lambda url, headers=None: ["seed", ["seed query 1", "seed query 2", "seed query 3"]])
    out = fetch_autocomplete("seed")
    assert out == ["seed query 1", "seed query 2", "seed query 3"]
