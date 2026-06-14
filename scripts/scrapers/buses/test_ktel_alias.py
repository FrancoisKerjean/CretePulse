import json
import os
import tempfile

from ktel_alias import load_aliases, lookup_alias


def test_load_default_returns_dict():
    a = load_aliases()
    assert isinstance(a, dict)
    # seed connu : la translittération OSM officielle de Heraklion
    assert a.get("heraklion") == "erakleio"
    assert a.get("chania") == "khania"


def test_lookup_alias_returns_target_or_none():
    a = {"chania": "khania", "heraklion": "erakleio"}
    assert lookup_alias("chania", a) == "khania"
    assert lookup_alias("CHANIA", a) == "khania"   # case-insensitive
    assert lookup_alias("unknown-village", a) is None
    assert lookup_alias(None, a) is None


def test_load_aliases_explicit_path(tmp_path):
    p = tmp_path / "custom.json"
    p.write_text('{"foo": "bar"}', encoding="utf-8")
    a = load_aliases(str(p))
    assert a == {"foo": "bar"}


def test_load_aliases_missing_file_returns_empty(tmp_path):
    p = tmp_path / "nope.json"
    assert load_aliases(str(p)) == {}
