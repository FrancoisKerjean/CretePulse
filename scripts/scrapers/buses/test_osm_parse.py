import json, os
from osm_parse import transliterate, normalize_operator

def test_transliterate_prefers_name_en():
    assert transliterate("Παχειά Άμμος", "Pachia Ammos") == "Pachia Ammos"

def test_transliterate_falls_back_to_unidecode():
    out = transliterate("Παχειά Άμμος", None)
    assert out and out.isascii() and "Ammos" in out   # translittération latine non vide

def test_transliterate_none_when_empty():
    assert transliterate(None, None) is None

def test_normalize_operator():
    assert normalize_operator("ΚΤΕΛ ΗΡΑΚΛΕΙΟΥ-ΛΑΣΙΘΙΟΥ ΑΕ") == "herlas"
    assert normalize_operator("ΚΤΕΛ ΧΑΝΙΩΝ ΡΕΘΥΜΝΟΥ ΑΕ") == "ektel"
    assert normalize_operator("Αστικό ΚΤΕΛ Ηρακλείου") == "urban-her"
    assert normalize_operator("Αστικό Κ.Τ.Ε.Λ. Χανίων Α.Ε.") == "urban-cha"
    assert normalize_operator(None) == "unknown"
    assert normalize_operator("KTEL") == "unknown"


from osm_parse import parse_stops, parse_relation

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "osm_agnik_sitia.json")
def _elements():
    with open(FIX, encoding="utf-8") as f:
        return json.load(f)["elements"]

def test_parse_stops_indexes_nodes_with_coords_and_translit():
    stops = parse_stops(_elements())
    # le node Pachia Ammos (grec) est présent, géolocalisé, slug latin
    pa = [s for s in stops.values() if s["name_el"] == "Παχειά Άμμος"]
    assert pa, "Pachia Ammos node absent de la fixture parse"
    s = pa[0]
    assert s["lat"] and s["lng"] and s["slug"] and s["slug"].isascii()

def test_parse_relation_sequence_includes_pachia_ammos_ordered():
    els = _elements()
    stops = parse_stops(els)
    rel = next(e for e in els if e["type"] == "relation" and e["id"] == 12320727)
    parsed = parse_relation(rel, stops)
    assert parsed["operator"] == "herlas"
    assert "ΝΙΚΟΛΑΟΣ" in (parsed["from"] or "") and "ΣΗΤΕΙΑ" in (parsed["to"] or "")
    # séquence dédupliquée (platform+stop fusionnés) : pas le double brut
    seq_names = [stops[i]["name_el"] for i in parsed["stop_ids"]]
    assert 12 <= len(seq_names) <= 24, f"séquence anormale: {len(seq_names)}"
    assert "Παχειά Άμμος" in seq_names
    # ordre : Pachia Ammos après Gournia, avant Kavousi
    i_g = seq_names.index("ΓΟΥΡΝΙΑ"); i_p = seq_names.index("Παχειά Άμμος")
    assert i_g < i_p

def test_parse_relation_dedups_consecutive_platform_stop():
    # deux nodes quasi colocalisés (platform puis stop) = un seul arrêt
    stops = {
        1: {"osm_id": 1, "name_el": "Α", "name": "A", "lat": 35.10, "lng": 25.10, "slug": "a"},
        2: {"osm_id": 2, "name_el": "Α", "name": "A", "lat": 35.1001, "lng": 25.1001, "slug": "a"},
        3: {"osm_id": 3, "name_el": "Β", "name": "B", "lat": 35.20, "lng": 25.20, "slug": "b"},
    }
    rel = {"id": 99, "tags": {"operator": "ΚΤΕΛ ΗΡΑΚΛΕΙΟΥ-ΛΑΣΙΘΙΟΥ ΑΕ", "from": "A", "to": "B"},
           "members": [
               {"type": "node", "ref": 1, "role": "platform"},
               {"type": "node", "ref": 2, "role": "stop"},
               {"type": "node", "ref": 3, "role": "platform"},
           ]}
    parsed = parse_relation(rel, stops)
    assert parsed["stop_slugs"] == ["a", "b"]   # le doublon a/a fusionné
