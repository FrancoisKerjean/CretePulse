"""Parsing pur des sources flux (testable sans reseau ni DB)."""
import hashlib
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup

CRETE_TZ = ZoneInfo("Europe/Athens")


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


def parse_gtp_destinations(html):
    """Page de desambiguisation GTP -> destinations desservies par le port.

    GTP refuse une recherche sans destination et renvoie la liste des ports
    relies : c'est notre enumeration des liaisons, elle se met a jour toute
    seule quand une compagnie ouvre ou ferme une ligne.
    """
    soup = BeautifulSoup(html, "html.parser")
    select = soup.select_one("select[name=selectdestination]")
    if not select:
        return []
    destinations = []
    for option in select.find_all("option"):
        label = " ".join(option.get_text(strip=True).split())
        match = re.match(r"^(.*?)\s*\(([A-Z]{3})\),\s*(.*)$", label)
        if not match:
            continue
        parts = (option.get("value") or "").split(",")
        destinations.append({
            "code": match.group(2),
            "name": match.group(1),
            "area": match.group(3),
            "gtp_id": parts[1] if len(parts) > 1 else None,
        })
    return destinations


def _gtp_port(cell):
    """(heure, id du port, nom) depuis une cellule depart ou arrivee."""
    time_el = cell.select_one("span.fs-4")
    link = cell.select_one("a[href*='PortPage.asp']")
    if not time_el or not link:
        return None
    port_id = re.search(r"id=(\d+)", link.get("href") or "")
    return (time_el.get_text(strip=True),
            port_id.group(1) if port_id else None,
            link.get_text(strip=True))


def parse_gtp_schedules(html):
    """Resultats RoutesForm.asp -> une entree par traversee programmee.

    GTP filtre deja sur la date demandee (SchDay/SchMonth/SchYear) : les lignes
    rendues sont celles qui operent ce jour-la, motif hebdomadaire et periode de
    validite deja appliques. Le parseur n'a donc pas a reinterpreter les cases
    M T W T F S S ni les mentions "Even days" / "Effective until".
    """
    soup = BeautifulSoup(html, "html.parser")
    schedules = []
    for table in soup.find_all("table"):
        cells = table.select("td.d-md-table-cell.fw-bold.fs-5")
        if len(cells) < 2:
            continue
        departure, arrival = _gtp_port(cells[0]), _gtp_port(cells[1])
        if not departure or not arrival:
            continue
        company = table.select_one("a[href*='tdirectorydetails.asp']")
        ship_type = table.select_one("a[data-bs-target='#ship-type-help']")
        details = table.select_one("a[href*='RoutesDetails.asp']")
        href = details.get("href") if details else ""
        company_id = re.search(r"id=(\d+)", company.get("href") or "") if company else None
        overnight = re.search(r"After\s+(\d+)\s+days?", arrival[0] and cells[1].get_text(" ", strip=True) or "")
        schedules.append({
            "dep_time": departure[0], "dep_port_id": departure[1], "dep_port_name": departure[2],
            "arr_time": arrival[0], "arr_port_id": arrival[1], "arr_port_name": arrival[2],
            "plus_days": int(overnight.group(1)) if overnight else 0,
            "company_code": company.get_text(strip=True) if company else None,
            "company_name": (company.get("title") or None) if company else None,
            "company_id": company_id.group(1) if company_id else None,
            "ship_type": ship_type.get_text(strip=True) if ship_type else None,
            "route_id": (re.search(r"routeid=(\d+)", href) or [None, None])[1] if href else None,
            "sched_id": (re.search(r"schedid=(\d+)", href) or [None, None])[1] if href else None,
        })
    return schedules


def ferry_movements(schedules, port_id, service_date):
    """Traversees GTP -> mouvements ancres sur le port cretois interroge.

    Le mouvement est date et horodate a QUAI : heure de depart pour un depart,
    heure d'accostage pour une arrivee. Une traversee de nuit partie le 30 a
    21:00 accoste le 31 : la dater au 30 gonflerait la veille et viderait le
    lendemain, exactement le defaut corrige sur les vols HER le 29/07/2026.
    """
    movements = []
    for schedule in schedules:
        if schedule["dep_port_id"] == port_id:
            direction, slot, day = "departure", schedule["dep_time"], service_date
            counterpart = (schedule["arr_port_id"], schedule["arr_port_name"])
        elif schedule["arr_port_id"] == port_id:
            direction, slot = "arrival", schedule["arr_time"]
            day = service_date + timedelta(days=schedule["plus_days"])
            counterpart = (schedule["dep_port_id"], schedule["dep_port_name"])
        else:
            continue
        start, end = _minutes(schedule["dep_time"]), _minutes(schedule["arr_time"])
        movements.append({
            "direction": direction,
            "service_date": day,
            "sched_slot": slot,
            "counterpart_port_id": counterpart[0],
            "counterpart_port_name": counterpart[1],
            "company_code": schedule["company_code"],
            "company_name": schedule["company_name"],
            "ship_type": schedule["ship_type"],
            "route_id": schedule["route_id"],
            "sched_id": schedule["sched_id"],
            "duration_min": (None if start is None or end is None
                             else end + 1440 * schedule["plus_days"] - start),
        })
    return movements


def dedupe_ferry_movements(movements):
    """Regroupe les escales d'un meme navire en un seul mouvement a quai.

    Une interrogation GTP porte sur un couple origine-destination : le SeaJets
    qui quitte Heraklion a 08:00 pour Santorin, Naxos, Mykonos puis le Piree
    apparait dans quatre pages. Ce sont quatre escales d'UN navire, pas quatre
    departs. Sans ce regroupement, les entrees maritimes seraient multipliees
    par le nombre d'escales de la ligne.

    Le mouvement conserve l'escale la plus longue, c'est-a-dire le terminus :
    c'est elle qui decrit ou va (ou d'ou vient) le navire.
    """
    grouped = {}
    for movement in movements:
        key = (movement["direction"], movement["service_date"],
               movement["company_code"], movement["sched_slot"])
        current = grouped.get(key)
        if current is None:
            grouped[key] = dict(movement, legs_seen=1)
            continue
        current["legs_seen"] += 1
        if (movement["duration_min"] or 0) > (current["duration_min"] or 0):
            grouped[key] = dict(movement, legs_seen=current["legs_seen"])
    return list(grouped.values())


def athens_day(now_utc):
    """Journee de service en cours a Athenes pour une capture horodatee en UTC.

    Les crons du VPS tournent en UTC : a 22:10 UTC on est deja le lendemain a
    Athenes. Dater la capture sur l'horloge UTC creerait une journee decalee,
    le meme mode de panne que l'entete "Last Update" sur les vols HER.
    """
    return now_utc.astimezone(CRETE_TZ).date()


# Deux traversees de la meme compagnie vers le meme port sont espacees d'au
# moins 11 h sur les liaisons cretoises observees (Blue Star Heraklion-Piraeus
# 09:00 puis 21:00). Trois heures separent donc sans ambiguite un horaire
# republie d'une seconde rotation reelle.
FERRY_SLOT_WINDOW_MIN = 180

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
