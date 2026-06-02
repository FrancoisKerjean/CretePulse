import pytest
from lib.aeo_check import check_aeo_compliance, AEOFailure

def test_passes_with_h1_question_and_number_and_table():
    html = """<h1>Can you drink tap water in Crete?</h1>
    <p>Yes, tap water in Crete is safe to drink in 95% of villages as of 2026.</p>
    <table><tr><td>A</td></tr><tr><td>B</td></tr><tr><td>C</td></tr><tr><td>D</td></tr></table>"""
    faq_jsonld = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": "Q1", "acceptedAnswer": {"@type": "Answer", "text": "A1"}},
        {"@type": "Question", "name": "Q2", "acceptedAnswer": {"@type": "Answer", "text": "A2"}},
        {"@type": "Question", "name": "Q3", "acceptedAnswer": {"@type": "Answer", "text": "A3"}},
    ]}
    result = check_aeo_compliance(html, faq_jsonld)
    assert result.passed is True

def test_fails_when_no_question_in_h1_or_h2():
    html = """<h1>Crete water</h1><p>It is fine 95% of the time.</p>
    <table><tr><td>A</td></tr><tr><td>B</td></tr><tr><td>C</td></tr><tr><td>D</td></tr></table>"""
    faq = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "Q", "acceptedAnswer": {"@type": "Answer", "text": "A"}}] * 3}
    result = check_aeo_compliance(html, faq)
    assert result.passed is False
    assert "no_question_heading" in result.failures

def test_fails_when_no_number_in_first_100_words():
    html = """<h1>Can you drink tap water in Crete?</h1>
    <p>""" + ("safe water everywhere always good " * 30) + """</p>
    <table><tr><td>A</td></tr><tr><td>B</td></tr><tr><td>C</td></tr><tr><td>D</td></tr></table>"""
    faq = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "Q", "acceptedAnswer": {"@type": "Answer", "text": "A"}}] * 3}
    result = check_aeo_compliance(html, faq)
    assert result.passed is False
    assert "no_number_in_intro" in result.failures

def test_fails_when_no_table_and_no_long_list():
    html = """<h1>Can you drink tap water in Crete?</h1>
    <p>Yes 95% of the time.</p><ul><li>one</li><li>two</li></ul>"""
    faq = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "Q", "acceptedAnswer": {"@type": "Answer", "text": "A"}}] * 3}
    result = check_aeo_compliance(html, faq)
    assert result.passed is False
    assert "no_table_or_long_list" in result.failures

def test_fails_when_faq_under_3_entries():
    html = """<h1>Can you drink tap water in Crete?</h1>
    <p>Yes 95% of the time.</p>
    <table><tr><td>A</td></tr><tr><td>B</td></tr><tr><td>C</td></tr><tr><td>D</td></tr></table>"""
    faq = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": "Q1", "acceptedAnswer": {"@type": "Answer", "text": "A1"}},
        {"@type": "Question", "name": "Q2", "acceptedAnswer": {"@type": "Answer", "text": "A2"}},
    ]}
    result = check_aeo_compliance(html, faq)
    assert result.passed is False
    assert "faq_too_short" in result.failures
