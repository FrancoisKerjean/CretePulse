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
