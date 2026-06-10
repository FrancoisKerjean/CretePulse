from store import should_commit, MIN_ROUTES, normalize_for_db


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
