"""Parsing pur des sources flux (testable sans reseau ni DB)."""
import hashlib
import re
from datetime import datetime, timedelta, timezone

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


def _parse_flight_rows(html, number_sel, place_key, belt_sel):
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for tr in soup.select("tr.line"):
        time_el = tr.select_one(".ScheduledTime")
        flight_el = tr.select_one(number_sel)
        if not time_el or not flight_el:
            continue
        airline = None
        img = tr.select_one(".logoarea img")
        if img and img.get("src"):
            m = re.search(r"/([A-Z0-9]{2,3})\.png$", img["src"])
            airline = m.group(1) if m else None
        place_el = tr.select_one(".DestinationNameEng")
        belt_el = tr.select_one(belt_sel)
        status_el = tr.select_one(".remtxt")
        # departs : le numero est un lien prefixe d'un emoji info (non-ASCII) -> strip
        flight_no = re.sub(r"^[^\x20-\x7E]+\s*", "", " ".join(flight_el.get_text(strip=True).split()))
        status = status_el.get_text(strip=True) if status_el else None
        rows.append({
            "sched_time": time_el.get_text(strip=True),
            "flight_no": flight_no,
            "airline_code": airline,
            place_key: place_el.get_text(strip=True) if place_el else None,
            "belt": (belt_el.get_text(strip=True) or None) if belt_el else None,
            "status": status or None,
        })
    return rows


def parse_arrivals(html):
    return _parse_flight_rows(html, ".flight_number_arr", "origin", ".checkins_arr")


def parse_departures(html):
    return _parse_flight_rows(html, ".flight_number", "destination", ".checkins")


def parse_chq(payload, direction):
    """JSON officiel Fraport CHQ (_jcr_content.arrivals/departures.json) -> lignes upsert.

    sched est un datetime complet : service_date fiable, pas de fenetre 24h glissante.
    lu = heure reelle d'atterrissage ; sentinelle '-0001-11-30 ...' = pas encore.
    """
    place_key = "origin" if direction == "arrival" else "destination"
    rows = []
    for f in (payload or {}).get("data", []):
        flight_no = (f.get("fnr") or "").strip()
        if not flight_no:
            continue
        try:
            sched = datetime.strptime(f.get("sched") or "", "%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue
        status = (f.get("status") or "").replace("&nbsp;", "").strip() or None
        lu = f.get("lu") or ""
        landed_at = lu if not lu.startswith("-") and lu.strip() else None
        rows.append({
            "service_date": sched.date(),
            "sched_time": sched.strftime("%H:%M"),
            "flight_no": flight_no,
            "airline_code": (f.get("al") or "").strip() or None,
            place_key: (f.get("apname") or "").strip() or None,
            "belt": (f.get("gate") or "").strip() or None,
            "status": status,
            "landed_at": landed_at,
        })
    return rows


def assign_service_dates(rows, board_date):
    """Le tableau couvre ~24h glissantes : un recul horaire > 60 min entre deux
    lignes (triees par heure) = passage de minuit -> jour suivant."""
    day = board_date
    prev = None
    for row in rows:
        try:
            h, m = row["sched_time"].split(":")
            minutes = int(h) * 60 + int(m)
        except (AttributeError, ValueError):
            minutes = None
        if prev is not None and minutes is not None and prev - minutes > 60:
            day = day + timedelta(days=1)
        if minutes is not None:
            prev = minutes
        row["service_date"] = day
    return rows
