import json

import partner_report as pr


def test_build_car_email_with_leads_has_no_outbound_clicks_line():
    # #3 : la metrique "clics outbound" (structurellement 0, aucun lien sortant
    # rendu) a ete retiree. #2 : commission rendue depuis la source unique.
    partner = {
        "name": "Auto Smart Car Rental",
        "email": "x@y.gr",
        "commission": "10%",
        "zoneLabel": "Chania & the west, Rethymno",
    }
    rows = [
        {"pickup_slug": "chania", "status": "sent"},
        {"pickup_slug": "chania", "status": "sent"},
        {"pickup_slug": "rethymno", "status": "email_failed"},
    ]
    email = pr.build_car_email(partner, rows, ["2026-05-01", "2026-05-31"])
    body = email["text"]
    assert "Rental requests forwarded to you: 2" in body
    assert "email failed" in body
    assert "chania (2)" in body
    assert "Clicks from crete.direct" not in body
    assert "10% referral commission" in body
    assert email["to"] == ["x@y.gr"]
    assert email["subject"].endswith("2026-05")


def test_build_car_email_no_leads():
    partner = {"name": "Auto Smart", "email": "x@y.gr",
               "commission": "10%", "zoneLabel": "Chania"}
    email = pr.build_car_email(partner, [], ["2026-05-01", "2026-05-31"])
    assert "No leads this month." in email["text"]
    assert "Clicks from crete.direct" not in email["text"]


def test_load_car_partners_from_json(tmp_path, monkeypatch):
    data = {
        "zones": [
            {"id": "chania-west", "label": "Chania & the west", "pickups": []},
            {"id": "rethymno", "label": "Rethymno", "pickups": []},
        ],
        "partners": [
            {"zoneIds": ["chania-west", "rethymno"], "name": "Auto Smart",
             "email": "x@y.gr", "commission": 0.1, "since": "2026-05-12"},
        ],
    }
    (tmp_path / "car-partners.json").write_text(json.dumps(data), encoding="utf-8")
    monkeypatch.setattr(pr, "BASE", tmp_path)
    partners = pr.load_car_partners()
    assert len(partners) == 1
    p = partners[0]
    assert p["name"] == "Auto Smart"
    assert p["email"] == "x@y.gr"
    assert p["commission"] == "10%"  # 0.1 (number) -> "10%"
    assert p["zoneLabel"] == "Chania & the west, Rethymno"


def test_load_car_partners_missing_file_returns_empty(tmp_path, monkeypatch):
    # Pas encore deploye sur le VPS -> [] (section voiture sautee, pas d'echec).
    monkeypatch.setattr(pr, "BASE", tmp_path)
    assert pr.load_car_partners() == []
