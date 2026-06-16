# vps/test_push_sender.py — run: cd vps && pytest test_push_sender.py -v
import push_sender as ps


def test_build_news_payload_uses_locale():
    row = {
        "slug": "ktel-strike",
        "title_en": "KTEL strike", "title_fr": "Grève KTEL",
        "summary_en": "Buses halted", "summary_fr": "Bus à l'arrêt",
    }
    p = ps.build_news_payload(row, "fr")
    assert p["title"] == "Grève KTEL"
    assert p["body"] == "Bus à l'arrêt"
    assert p["url"].endswith("/fr/news/ktel-strike")
    assert p["tag"] == "news-ktel-strike"


def test_build_news_payload_falls_back_to_en():
    row = {"slug": "x", "title_en": "Storm", "title_el": "", "summary_en": "Bad"}
    p = ps.build_news_payload(row, "el")
    assert p["title"] == "Storm"          # el vide -> fallback en
    assert p["url"].endswith("/el/news/x")


def test_build_alert_payload():
    row = {"slug": "mods-2026", "title": "Route Kissamos modifiée", "url": "https://ktel/x"}
    p = ps.build_alert_payload(row, "fr")
    assert "Kissamos" in p["title"]
    assert p["url"].endswith("/fr/buses")
    assert p["tag"] == "alert-mods-2026"


def test_should_purge():
    assert ps.should_purge(404) is True
    assert ps.should_purge(410) is True
    assert ps.should_purge(201) is False
    assert ps.should_purge(500) is False


def test_subscription_to_info():
    row = {"endpoint": "https://fcm/x", "p256dh": "PK", "auth": "AU"}
    info = ps.subscription_to_info(row)
    assert info == {"endpoint": "https://fcm/x", "keys": {"p256dh": "PK", "auth": "AU"}}
