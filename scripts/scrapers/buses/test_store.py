import types
from store import should_commit, MIN_ROUTES, normalize_for_db, replace_operator_routes, is_collapse


def test_should_commit_true_when_enough_routes():
    rows = [{"to_place": f"Town{i}"} for i in range(MIN_ROUTES + 1)]
    assert should_commit(rows) is True


def test_should_commit_false_when_too_few():
    assert should_commit([]) is False
    assert should_commit([{"to_place": "X"}]) is False
    assert should_commit("not a list") is False


def test_normalize_for_db_shapes_rows():
    rows = [{"from_place": "Heraklion", "to_place": "Rethymno", "departures": ["05:30"]}]
    out = normalize_for_db("herlas", "http://src", rows)
    r = out[0]
    assert r["operator_id"] == "herlas"
    assert r["source_url"] == "http://src"
    assert r["from_place"] == "Heraklion"
    assert r["season"] == "all"
    assert "scraped_at" in r and r["scraped_at"].endswith("+00:00") or "Z" in r["scraped_at"]
    assert r["price_eur"] is None  # absent -> None, pas d'invention
    assert r["price_estimated"] is False  # absent -> False, jamais None en DB


# --- Fraicheur honnete : preservation de scraped_at quand les horaires n'ont pas change ---

class _FakeQuery:
    def __init__(self, store):
        self._store, self._mode, self._payload = store, None, None

    def select(self, _cols):
        self._mode = "select"
        return self

    def delete(self):
        self._mode = "delete"
        return self

    def insert(self, payload):
        self._mode, self._payload = "insert", payload
        return self

    def eq(self, *_a):
        return self

    def execute(self):
        if self._mode == "select":
            return types.SimpleNamespace(data=self._store["existing"])
        if self._mode == "insert":
            self._store["inserted"] = self._payload
        return types.SimpleNamespace(data=None)


class _FakeSB:
    def __init__(self, existing):
        self.store = {"existing": existing, "inserted": None}

    def table(self, _name):
        return _FakeQuery(self.store)


OLD = "2026-06-01T00:00:00+00:00"


def _run(existing, rows):
    sb = _FakeSB(existing)
    replace_operator_routes(sb, "herlas", "http://src", rows)
    return {(r["from_place"], r["to_place"]): r for r in sb.store["inserted"]}


def test_preserve_scraped_at_when_timetable_unchanged():
    existing = [{"from_place": "Heraklion", "to_place": "Rethymno", "season": "all",
                 "departures": ["05:30", "07:00"], "scraped_at": OLD}]
    rows = [{"from_place": "Heraklion", "to_place": "Rethymno", "departures": ["05:30", "07:00"]},
            {"from_place": "Heraklion", "to_place": "Chania", "departures": ["06:00"]},
            {"from_place": "Heraklion", "to_place": "Sitia", "departures": ["08:00"]}]
    out = _run(existing, rows)
    # horaires identiques -> on garde l'ancien scraped_at (lastmod stable)
    assert out[("Heraklion", "Rethymno")]["scraped_at"] == OLD


def test_bump_scraped_at_when_timetable_changed():
    existing = [{"from_place": "Heraklion", "to_place": "Rethymno", "season": "all",
                 "departures": ["05:30"], "scraped_at": OLD}]
    rows = [{"from_place": "Heraklion", "to_place": "Rethymno", "departures": ["05:30", "09:00"]},
            {"from_place": "Heraklion", "to_place": "Chania", "departures": ["06:00"]},
            {"from_place": "Heraklion", "to_place": "Sitia", "departures": ["08:00"]}]
    out = _run(existing, rows)
    # horaires changes -> scraped_at neuf (!= ancien)
    assert out[("Heraklion", "Rethymno")]["scraped_at"] != OLD
    # route inconnue auparavant -> scraped_at neuf aussi
    assert out[("Heraklion", "Sitia")]["scraped_at"] != OLD


def test_preserve_fails_open_when_select_raises():
    class _Boom(_FakeSB):
        def table(self, _name):
            q = _FakeQuery(self.store)
            orig = q.execute
            def execute():
                if q._mode == "select":
                    raise RuntimeError("DB down")
                return orig()
            q.execute = execute
            return q
    sb = _Boom([])
    rows = [{"from_place": "A", "to_place": "B", "departures": ["1"]},
            {"from_place": "A", "to_place": "C", "departures": ["2"]},
            {"from_place": "A", "to_place": "D", "departures": ["3"]}]
    replace_operator_routes(sb, "herlas", "http://src", rows)  # ne leve pas
    assert len(sb.store["inserted"]) == 3  # comportement historique preserve


# --- Preservation de via_stops depuis le run précédent (enrichissement API) ---

def test_preserve_via_stops_when_route_was_enriched():
    """via_stops enrichis (herlas API) sont portés sur le nouveau payload.

    Le scrape hebdo supprime + recrée les routes (via_stops = None après le
    HTML parse). Sans preservation, l'enrichissement serait perdu chaque semaine.
    """
    existing = [
        {"from_place": "Heraklion", "to_place": "Matala", "season": "all",
         "departures": ["07:30"], "scraped_at": OLD,
         "via_stops": ["Benerato", "Avgeniki", "Faistos"]},
        {"from_place": "Heraklion", "to_place": "Rethymno", "season": "all",
         "departures": ["06:00"], "scraped_at": OLD,
         "via_stops": None},
    ]
    rows = [
        {"from_place": "Heraklion", "to_place": "Matala", "departures": ["07:30"]},
        {"from_place": "Heraklion", "to_place": "Rethymno", "departures": ["06:00"]},
        {"from_place": "Heraklion", "to_place": "Chania", "departures": ["06:00"]},
    ]
    out = _run(existing, rows)
    # via_stops enrichi -> préservé
    assert out[("Heraklion", "Matala")]["via_stops"] == ["Benerato", "Avgeniki", "Faistos"]
    # via_stops null dans l'ancien -> reste null (pas d'invention)
    assert out[("Heraklion", "Rethymno")]["via_stops"] is None
    # route nouvelle -> via_stops null
    assert out[("Heraklion", "Chania")]["via_stops"] is None


def test_preserve_via_stops_does_not_overwrite_freshly_parsed():
    """Si le scrape PDF ektel produit déjà via_stops, il ne faut pas l'écraser."""
    existing = [
        {"from_place": "Chania", "to_place": "Heraklion", "season": "all",
         "departures": ["06:00"], "scraped_at": OLD,
         "via_stops": ["Kavros", "Rethymno"]},  # ancien enrichissement
    ]
    rows = [
        {"from_place": "Chania", "to_place": "Heraklion", "departures": ["06:00"],
         "via_stops": ["Georgioupolis", "Kavros", "Rethymno", "Bali"]},  # PDF frais, plus complet
        {"from_place": "Chania", "to_place": "Rethymno", "departures": ["07:00"]},
        {"from_place": "Rethymno", "to_place": "Heraklion", "departures": ["08:00"]},
    ]
    out = _run(existing, rows)
    # Le nouveau via_stops (plus complet) l'emporte sur l'ancien
    assert out[("Chania", "Heraklion")]["via_stops"] == ["Georgioupolis", "Kavros", "Rethymno", "Bali"]


# --- Garde-fou d'effondrement (constat 25/11/2026) ---------------------------
# Refonte du site e-ktel : 0 PDF lu, 6 routes curées SANS horaire ont remplacé
# 150 routes horairées, en silence, pendant deux mois.

def _with_dep(n):
    return [{"from_place": "A", "to_place": f"P{i}", "departures": ["07:00"]} for i in range(n)]


def test_is_collapse_when_scrape_lost_most_timetables():
    rows = [{"from_place": "Chania", "to_place": f"P{i}", "departures": []} for i in range(6)]
    assert is_collapse(rows, existing_with_departures=150) is True


def test_is_collapse_false_on_seasonal_shrink():
    # herlas 222 -> 160 au passage à l'hiver : réduction légitime, on écrit.
    assert is_collapse(_with_dep(160), existing_with_departures=222) is False


def test_is_collapse_false_on_first_run():
    assert is_collapse(_with_dep(5), existing_with_departures=0) is False


def test_replace_refuses_collapse_and_keeps_previous_data():
    sb = _FakeSB(_with_dep(150))
    rows = [{"from_place": "Chania", "to_place": f"P{i}", "departures": []} for i in range(6)]
    try:
        replace_operator_routes(sb, "ektel", "http://src", rows)
        raise AssertionError("aurait dû refuser")
    except ValueError as e:
        assert "collapse" in str(e)
    assert sb.store["inserted"] is None  # rien d'écrit


def test_replace_collapse_can_be_forced():
    sb = _FakeSB(_with_dep(150))
    rows = [{"from_place": "Chania", "to_place": f"P{i}", "departures": []} for i in range(6)]
    replace_operator_routes(sb, "ektel", "http://src", rows, force=True)
    assert len(sb.store["inserted"]) == 6
