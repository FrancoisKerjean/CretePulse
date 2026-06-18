# vps/test_crete_relevance.py — run: cd vps && pytest test_crete_relevance.py -v
import crete_relevance as cr


def test_cretaone_national_news_dropped():
    # Faux positif réel observé en prod (slug cretaone-129858) : fait divers
    # Thessalonique remonté par CretaOne -> ne doit PLUS passer.
    t = "Θεσσαλονίκη: Στα «μαλακά» 63χρονος που παρενόχλησε σεξουαλικά 8χρονη στις Συκιές"
    s = "Το Μονομελές Πλημμελειοδικείο Θεσσαλονίκης τον έκρινε ένοχο"
    assert cr.is_crete_relevant(t, s, "cretaone") is False


def test_cretaone_accented_crete_places_kept():
    # Insensibilité aux accents : ces formes DOIVENT matcher (sinon le rappel
    # CretaOne s'effondre).
    assert cr.is_crete_relevant("Ηράκλειο: νέο έργο στο λιμάνι", "", "cretaone") is True
    assert cr.is_crete_relevant("Κρήτη: τουριστικά ρεκόρ φέτος", "", "cretaone") is True
    assert cr.is_crete_relevant("Ρέθυμνο: πολιτιστικές εκδηλώσεις", "", "cretaone") is True
    assert cr.is_crete_relevant("Λασίθι: αγροτικά νέα", "", "cretaone") is True
    assert cr.is_crete_relevant("Σητεία: αναβάθμιση λιμανιού", "", "cretaone") is True
    assert cr.is_crete_relevant("Ιεράπετρα: θερμοκήπια", "", "cretaone") is True
    assert cr.is_crete_relevant("Χανιά: αύξηση τουρισμού", "", "cretaone") is True


def test_cretaone_athens_dropped():
    assert cr.is_crete_relevant("Αθήνα: απεργία στο μετρό", "Στην πρωτεύουσα", "cretaone") is False


def test_crete_only_sources_still_trusted():
    assert cr.is_crete_relevant("Οτιδήποτε τοπικό", "", "haniotika") is True
    assert cr.is_crete_relevant("anything", "", "google_crete_en") is True
    # flashnews garde le trust direct même sur un titre non-crétois.
    assert cr.is_crete_relevant("Θεσσαλονίκη", "", "flashnews") is True


def test_general_feed_greek_crete_kept_and_athens_dropped():
    # Bonus : le fix accents aide aussi les feeds généraux (naftemporiki).
    assert cr.is_crete_relevant("Επένδυση στην Κρήτη", "", "naftemporiki") is True
    assert cr.is_crete_relevant("Οικονομικά νέα Αθήνας", "", "naftemporiki") is False


def test_general_feed_latin_crete_kept():
    assert cr.is_crete_relevant("New hotel opening in Crete", "", "ekathimerini") is True
    assert cr.is_crete_relevant("Athens politics update", "", "ekathimerini") is False
