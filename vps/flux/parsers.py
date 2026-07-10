"""Parsing pur des sources flux (testable sans reseau ni DB)."""
import hashlib
import re
from datetime import datetime, timezone

from bs4 import BeautifulSoup


def vehicle_key(raw) -> str:
    return hashlib.sha256(str(raw).encode()).hexdigest()[:12]


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def normalize_agn(payload, route):
    """JSON agncitybus -> tuples (source, line, vkey, lat, lng, speed, bearing)."""
    rows = []
    for b in payload or []:
        lat, lng = _f(b.get("latitude")), _f(b.get("longitude"))
        if lat is None or lng is None:
            continue
        if not (34.5 < lat < 36.0 and 23.0 < lng < 26.5):  # bbox Crete
            continue
        rows.append(("agncitybus", str(route), vehicle_key(b.get("imei") or b.get("number")),
                     lat, lng, _f(b.get("speed")), _f(b.get("direction"))))
    return rows


def normalize_citybus_vehicles(payload, source):
    """JSON rest.citybus.gr stops/live -> tuples. lat/lng strings, '0' = pas de GPS."""
    rows = {}
    for v in (payload or {}).get("vehicles", []):
        lat, lng = _f(v.get("latitude")), _f(v.get("longitude"))
        if not lat or not lng:  # 0.0 ou None -> vehicule sans GPS
            continue
        code = v.get("vehicleCode") or ""
        rows[code] = (source, str(v.get("lineCode") or ""), vehicle_key(code),
                      lat, lng, None, None)
    return list(rows.values())


def parse_service_date(html):
    m = re.search(r"Last Update:\s*(\d{1,2} \w+ \d{4})", html)
    if not m:
        return datetime.now(timezone.utc).date()
    return datetime.strptime(m.group(1), "%d %B %Y").date()


def parse_arrivals(html):
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for tr in soup.select("tr.line"):
        time_el = tr.select_one(".ScheduledTime")
        flight_el = tr.select_one(".flight_number_arr")
        if not time_el or not flight_el:
            continue
        airline = None
        img = tr.select_one(".logoarea img")
        if img and img.get("src"):
            m = re.search(r"/([A-Z0-9]{2,3})\.png$", img["src"])
            airline = m.group(1) if m else None
        origin_el = tr.select_one(".DestinationNameEng")
        belt_el = tr.select_one(".checkins_arr")
        status_el = tr.select_one(".remtxt")
        rows.append({
            "sched_time": time_el.get_text(strip=True),
            "flight_no": " ".join(flight_el.get_text(strip=True).split()),
            "airline_code": airline,
            "origin": origin_el.get_text(strip=True) if origin_el else None,
            "belt": (belt_el.get_text(strip=True) or None) if belt_el else None,
            "status": status_el.get_text(strip=True) if status_el else None,
        })
    return rows
