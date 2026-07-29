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


MIDNIGHT_GAP_MIN = 60   # recul horaire au-dela duquel on considere un passage de minuit
SLOT_WINDOW_MIN = 240   # ecart max entre deux horaires du meme vol = un retard


def _minutes(sched_time):
    """'14:05' -> 845. None si l'heure est illisible."""
    try:
        h, m = sched_time.split(":")
        return int(h) * 60 + int(m)
    except (AttributeError, ValueError):
        return None


def assign_service_dates(rows, now_local):
    """Date chaque ligne du tableau HER a partir de l'heure de capture LOCALE.

    Le tableau couvre ~25 h glissantes et demarre 1 a 2 h dans le PASSE : il ne
    peut donc couvrir que deux dates civiles, celle d'ancrage et la suivante.

    L'entete "Last Update" n'est plus utilisee : elle datait tout le tableau du
    jour courant d'Athenes, y compris ses premieres lignes qui appartiennent a la
    veille lorsque la capture tombe entre minuit et ~02 h. Combinee a un
    incrementeur de minuit non borne, elle produisait jusqu'a quatre dates de
    service par capture et une journee fantome chaque nuit.
    """
    now_minutes = now_local.hour * 60 + now_local.minute
    day = now_local.date()
    first = next((m for m in (_minutes(r.get("sched_time")) for r in rows) if m is not None), None)
    if first is not None and first - now_minutes > MIDNIGHT_GAP_MIN:
        day -= timedelta(days=1)  # le tableau commence avant minuit : c'est hier
    prev, bumped = None, False
    for row in rows:
        minutes = _minutes(row.get("sched_time"))
        if (not bumped and prev is not None and minutes is not None
                and prev - minutes > MIDNIGHT_GAP_MIN):
            day += timedelta(days=1)
            bumped = True
        if minutes is not None:
            prev = minutes
        row["service_date"] = day
    return rows


def pick_slot(existing, sched_time, window_min=SLOT_WINDOW_MIN):
    """Retourne l'id du creneau existant que `sched_time` met a jour, sinon None.

    Un vol retarde reapparait sur le tableau avec une autre heure : c'est le MEME
    vol, pas une ligne de plus. Au-dela de la fenetre, c'est une seconde rotation
    reelle du meme numero dans la journee (GQ 560 vole a 00:15 puis 20:25).
    Pas de rapprochement par-dessus minuit : il rendrait ces deux rotations
    indistinguables d'un retard.
    """
    target = _minutes(sched_time)
    if target is None:
        return None
    best, best_gap = None, None
    for row_id, slot in existing:
        slot_minutes = _minutes(slot)
        if slot_minutes is None:
            continue
        gap = abs(slot_minutes - target)
        if gap <= window_min and (best_gap is None or gap < best_gap):
            best, best_gap = row_id, gap
    return best
