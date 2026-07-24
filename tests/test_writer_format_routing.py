import pytest
import sys
sys.path.insert(0, "/opt/cretepulse-content")
from writer import FORMAT_CONFIG, get_format_config

def test_pillar_routes_to_opus():
    cfg = get_format_config("pillar")
    assert cfg["model"] == "opus"
    assert cfg["min_words"] == 2000
    assert cfg["max_words"] == 3000
    assert cfg["prompt_path"].endswith("writer-pillar.md")

def test_mid_routes_to_sonnet():
    cfg = get_format_config("mid")
    assert cfg["model"] == "sonnet"
    assert cfg["min_words"] == 1000
    assert cfg["max_words"] == 1500

def test_short_routes_to_haiku():
    cfg = get_format_config("short")
    assert cfg["model"] == "haiku"
    assert cfg["min_words"] == 500
    assert cfg["max_words"] == 800

def test_unknown_format_raises():
    with pytest.raises(ValueError, match="unknown format"):
        get_format_config("xxl")
