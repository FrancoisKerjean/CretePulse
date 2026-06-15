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
