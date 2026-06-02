import pytest
from lib.gsc_client import compute_score, classify_format, filter_candidates

def test_compute_score_higher_with_more_impressions():
    s_low = compute_score(impressions=50, position=10.0, ctr=0.01)
    s_high = compute_score(impressions=500, position=10.0, ctr=0.01)
    assert s_high > s_low

def test_compute_score_higher_with_lower_position():
    s_low_pos = compute_score(impressions=100, position=5.0, ctr=0.01)
    s_high_pos = compute_score(impressions=100, position=25.0, ctr=0.01)
    assert s_low_pos > s_high_pos

def test_classify_format_pillar_when_high_impressions_and_top_position():
    fmt = classify_format(impressions=80, position=8.0)
    assert fmt == "pillar"

def test_classify_format_mid_when_moderate():
    fmt = classify_format(impressions=30, position=15.0)
    assert fmt == "mid"

def test_classify_format_none_when_below_threshold():
    fmt = classify_format(impressions=5, position=15.0)
    assert fmt is None

def test_filter_candidates_excludes_existing_slugs():
    candidates = [
        {"query": "best beaches in crete", "impressions": 100, "position": 12.0, "ctr": 0.01},
        {"query": "crete in october worth visiting", "impressions": 50, "position": 8.0, "ctr": 0.02},
    ]
    existing_slugs = ["crete-october-november-worth-visiting"]
    out = filter_candidates(candidates, existing_slugs)
    assert len(out) == 1
    assert out[0]["query"] == "best beaches in crete"
