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


# ── push_ready_urgent : push découplé de l'insertion ────────────────────────
# Régression du bug "notif -> /news/<slug> en 404" : la notif partait à
# l'insertion (news.py), avant que le writer ne traduise (title_en="") ou ne
# garde l'article (category != 'filtered'). La page /news/<slug>
# (getNewsBySlug) masque exactement ces lignes -> lien mort + body vide.
# push_ready_urgent ne pousse QUE les lignes que la page rendrait.

class _FakeExec:
    def __init__(self, data):
        self.data = data


class _FakeQuery:
    """Chaîne supabase-py minimale : ignore les filtres (la sélection des lignes
    est testée via l'invariant, pas via une vraie évaluation des filtres) et
    enregistre les UPDATE pour vérifier le marquage pushed=true."""
    def __init__(self, store):
        self.store = store
        self._update_payload = None
        self._slug = None

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        if a and a[0] == "slug":
            self._slug = a[1]
        return self

    def neq(self, *a, **k):
        return self

    def gte(self, *a, **k):
        return self

    def order(self, *a, **k):
        return self

    def limit(self, *a, **k):
        return self

    def update(self, payload):
        self._update_payload = payload
        return self

    def execute(self):
        if self._update_payload is not None:
            self.store["updated"].append((self._slug, self._update_payload))
            return _FakeExec([])
        return _FakeExec(self.store["rows"])


class _FakeSB:
    def __init__(self, rows):
        self.store = {"rows": rows, "updated": []}

    def table(self, _name):
        return _FakeQuery(self.store)


def test_push_ready_urgent_pushes_and_marks(monkeypatch):
    rows = [{
        "slug": "wildfire-near-sitia", "title_en": "Wildfire near Sitia",
        "summary_en": "...", "is_urgent": True, "pushed": False,
        "category": "tourism",
    }]
    sb = _FakeSB(rows)
    calls = []
    monkeypatch.setattr(
        ps, "send_topic",
        lambda supabase, topic, row, build: calls.append((topic, row["slug"])) or 1,
    )
    n = ps.push_ready_urgent(sb)
    assert n == 1
    assert calls == [("urgent_news", "wildfire-near-sitia")]
    assert sb.store["updated"] == [("wildfire-near-sitia", {"pushed": True})]


def test_push_ready_urgent_no_rows(monkeypatch):
    sb = _FakeSB([])
    monkeypatch.setattr(ps, "send_topic", lambda *a, **k: 0)
    assert ps.push_ready_urgent(sb) == 0
    assert sb.store["updated"] == []
