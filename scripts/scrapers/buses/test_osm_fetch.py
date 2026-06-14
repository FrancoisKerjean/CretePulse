from osm_fetch import fetch_overpass, OVERPASS_QUERY, MIRRORS

def test_query_targets_crete_bus_relations():
    assert 'route"="bus' in OVERPASS_QUERY and "node(r)" in OVERPASS_QUERY

def test_fetch_returns_elements_on_success():
    calls = []
    def fake(url, q):
        calls.append(url)
        return {"elements": [{"type": "node", "id": 1}]}
    out = fetch_overpass(fetch=fake)
    assert out == [{"type": "node", "id": 1}] and len(calls) == 1

def test_fetch_falls_back_to_mirror():
    def fake(url, q):
        return None if url == MIRRORS[0] else {"elements": [{"type": "relation", "id": 9}]}
    out = fetch_overpass(fetch=fake)
    assert out == [{"type": "relation", "id": 9}]

def test_fetch_none_when_all_fail_or_empty():
    assert fetch_overpass(fetch=lambda url, q: None) is None
    assert fetch_overpass(fetch=lambda url, q: {"elements": []}) is None
