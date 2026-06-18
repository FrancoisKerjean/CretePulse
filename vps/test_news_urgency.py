# vps/test_news_urgency.py — run: cd vps && pytest test_news_urgency.py -v
import news_urgency as nu


def test_urgent_examples_true():
    assert nu.classify_urgency("KTEL bus strike paralyses Heraklion") is True
    assert nu.classify_urgency("Wildfire forces road closure near Chania") is True
    assert nu.classify_urgency("Grève des ferries à destination de la Crète") is True
    assert nu.classify_urgency("Σεισμός 5.2 ανοιχτά της Κρήτης") is True
    assert nu.classify_urgency("Shark sighting closes beach in Rethymno") is True
    assert nu.classify_urgency("Red flag warning: flooding expected") is True


def test_banal_examples_false():
    assert nu.classify_urgency("Best tavernas in Chania for 2026") is False
    assert nu.classify_urgency("New archaeological exhibition opens in Heraklion") is False
    assert nu.classify_urgency("Sunny weather expected this weekend") is False
    assert nu.classify_urgency("Hotel review: a calm stay in Elounda") is False


def test_uses_summary_too():
    assert nu.classify_urgency("Travel update", "Airport closed due to storm") is True


# ── Faux positifs de sous-chaine grecque (precision > rappel) ───────────────
# Les stems grecs trop courts matchaient des mots sans rapport :
#  - πλημμ (inondation) matchait Πλημμελειοδικειο (tribunal correctionnel)
#  - φωτι (incendie) matche φωτισμος (eclairage)
# Cas reel observe en prod (slug cretaone-129858) : fait divers Thessalonique.

THESSALONIKI_TITLE = "Θεσσαλονίκη: Στα «μαλακά» 63χρονος που παρενόχλησε σεξουαλικά 8χρονη στις Συκιές"
THESSALONIKI_SUMMARY = "Το Μονομελές Πλημμελειοδικείο Θεσσαλονίκης τον έκρινε ένοχο για προσβολή γενετήσιας αξιοπρέπειας ανηλίκου"


def test_thessaloniki_court_not_urgent():
    # Πλημμελειοδικείο (tribunal) ne doit PAS declencher l'urgence inondation.
    assert nu.classify_urgency(THESSALONIKI_TITLE, THESSALONIKI_SUMMARY) is False


def test_greek_flood_still_urgent():
    assert nu.classify_urgency("Πλημμύρες στο Ηράκλειο μετά την καταιγίδα") is True


def test_greek_court_not_urgent():
    assert nu.classify_urgency("Στο Πλημμελειοδικείο ο 40χρονος για κλοπή") is False


def test_greek_fire_still_urgent():
    assert nu.classify_urgency("Μεγάλη φωτιά στα Χανιά") is True
    assert nu.classify_urgency("Πυρκαγιά κοντά στο Ρέθυμνο") is True


def test_greek_lighting_not_urgent():
    assert nu.classify_urgency("Νέος φωτισμός στην παλιά πόλη του Ηρακλείου") is False
