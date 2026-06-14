from net_places import status_of, canonical_slug, display_name, load_allowlist

def test_allowlist_loaded_from_shared_json():
    al = load_allowlist()
    assert al["Heraklion"] == "heraklion"
    assert al["Anogia"] == "anogeia-west" and al["Anogeia"] == "anogeia"  # distincts

def test_status_allowlist():
    assert status_of("Heraklion") == "allowlist"
    assert status_of("Agios Nikolaos") == "allowlist"

def test_status_noise_hotels_supermarkets_codes():
    assert status_of("Hotel Serita (Anissaras Hotels)") == "noise"
    assert status_of("Zorbas Village (Analipsis Hotels)") == "noise"
    assert status_of("A1 Super Market") == "noise"
    assert status_of("A10 Ag.Pelagia Beach") == "noise"
    assert status_of("Malia Palace ,On The National R") == "noise"

def test_status_admitted_real_village():
    assert status_of("Garazo") == "admitted"
    assert status_of("Dafnes") == "admitted"

def test_canonical_slug_allowlist_and_aliases():
    assert canonical_slug("Heraklion") == "heraklion"
    assert canonical_slug("Elafonisi") == "elafonissi"
    assert canonical_slug("Kasteli") == "kissamos"

def test_canonical_slug_typo_fix():
    assert canonical_slug("Rerhymno") == "rethymno"
    assert canonical_slug("Chromonastiti") == canonical_slug("Chromonastiri")

def test_canonical_slug_noise_is_none():
    assert canonical_slug("A1 Super Market") is None
    assert canonical_slug("Hotel Serita (Anissaras Hotels)") is None

def test_canonical_slug_admitted_slugified():
    assert canonical_slug("Garazo") == "garazo"

def test_display_name_prefers_clean():
    assert display_name("Heraklion") == "Heraklion"
    assert display_name("Plaka(Ag.Nikolaos)") == "Plaka"
    assert display_name("Garazo") == "Garazo"
