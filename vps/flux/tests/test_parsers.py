from datetime import date
from pathlib import Path

from flux.parsers import (assign_service_dates, normalize_agn,
                          normalize_citybus_vehicles, parse_arrivals,
                          parse_departures, parse_service_date)

FIXTURE = (Path(__file__).parent / "fixtures" / "arr2web_sample.html").read_text(encoding="utf-8")
DEP_FIXTURE = (Path(__file__).parent / "fixtures" / "dep2web_sample.html").read_text(encoding="utf-8")


def test_parse_service_date():
    assert parse_service_date(FIXTURE) == date(2026, 7, 10)


def test_parse_arrivals():
    rows = parse_arrivals(FIXTURE)
    assert len(rows) == 2
    assert rows[0]["sched_time"] == "11:05"
    assert rows[0]["flight_no"] == "TB 2281"
    assert rows[0]["airline_code"] == "TB"
    assert rows[0]["origin"] == "Ostende"
    assert rows[0]["status"] == "Landed"
    assert rows[0]["belt"] is None
    assert rows[1]["belt"] == "01"


def test_parse_departures():
    rows = parse_departures(DEP_FIXTURE)
    assert len(rows) == 4
    assert rows[0]["sched_time"] == "13:55"
    assert rows[0]["flight_no"] == "U2 8216"  # prefixe lien (emoji info) nettoye
    assert rows[0]["airline_code"] == "U2"
    assert rows[0]["destination"] == "London Gatwick"
    assert rows[0]["status"] == "Final Call"
    assert rows[0]["belt"] == "01"  # comptoir check-in (meme colonne que belt)
    assert rows[1]["belt"] is None
    assert rows[3]["status"] is None  # remtxt vide -> None


def test_assign_service_dates_wraps_midnight():
    # Le tableau couvre ~24h glissantes : les lignes apres minuit sont J+1.
    rows = [{"sched_time": t} for t in ("13:55", "23:55", "05:40", "14:20")]
    out = assign_service_dates(rows, date(2026, 7, 10))
    assert [r["service_date"] for r in out] == [
        date(2026, 7, 10), date(2026, 7, 10), date(2026, 7, 11), date(2026, 7, 11)]


def test_assign_service_dates_ignores_small_jitter():
    # Un recul < 60 min (tri imparfait) ne doit PAS declencher un saut de jour.
    rows = [{"sched_time": t} for t in ("14:20", "14:15", "22:00")]
    out = assign_service_dates(rows, date(2026, 7, 10))
    assert all(r["service_date"] == date(2026, 7, 10) for r in out)


def test_normalize_agn():
    payload = [
        {"latitude": "35.1907", "longitude": "25.7161", "speed": "32",
         "direction": "103.5", "route": "1", "imei": "35745", "pinakida": "HKZ 3297"},
        {"latitude": "0", "longitude": "0", "imei": "junk"},          # hors Crete -> drop
        {"latitude": "garbage", "longitude": "25.7", "imei": "bad"},  # invalide -> drop
    ]
    rows = normalize_agn(payload, 1)
    assert len(rows) == 1
    src, line, vkey, lat, lng, speed, bearing = rows[0]
    assert (src, line) == ("agncitybus", "1")
    assert abs(lat - 35.1907) < 1e-6
    assert speed == 32.0 and bearing == 103.5
    assert len(vkey) == 12 and "35745" not in vkey  # anonymise


def test_normalize_citybus_vehicles():
    payload = {"vehicles": [
        {"lineCode": "06", "latitude": "35.336066", "longitude": "25.128713", "vehicleCode": "V42"},
        {"lineCode": "12", "latitude": "0", "longitude": "0", "vehicleCode": "V99"},  # sans GPS -> drop
        {"lineCode": "06", "latitude": "35.336070", "longitude": "25.128799", "vehicleCode": "V42"},  # dedup
    ]}
    rows = normalize_citybus_vehicles(payload, "citybus-her")
    assert len(rows) == 1
    src, line, vkey, lat, lng, speed, bearing = rows[0]
    assert (src, line) == ("citybus-her", "06")
    assert lat > 35.0 and "V42" not in vkey
    assert normalize_citybus_vehicles({}, "citybus-her") == []
    assert normalize_citybus_vehicles(None, "citybus-her") == []
