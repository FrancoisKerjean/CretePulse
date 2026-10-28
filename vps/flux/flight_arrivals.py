#!/usr/bin/env python3
"""Historise les arrivees ET les departs des aeroports cretois.

HER : tableaux HTML officiels screen.herairport.com (MAJ 15s). Chaque tableau
couvre ~25h glissantes et demarre 1 a 2h dans le PASSE : assign_service_dates
date les lignes a partir de l'heure de capture locale d'Athenes, jamais depuis
l'entete "Last Update" du tableau (cf. regression du 29/07/2026).
CHQ : JSON officiel Fraport (_jcr_content.arrivals/departures.json), datetimes
complets (pas de fenetre glissante), lu = heure reelle d'atterrissage.

Cron : */10 (4 combinaisons airport x direction).
Identite d'un vol = (airport, direction, service_date, flight_no, sched_slot),
ou sched_slot est l'horaire de sa premiere observation. Un vol retarde met a
jour sa ligne au lieu d'en creer une nouvelle.
"""
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from db import connect
from parsers import (assign_service_dates, parse_arrivals, parse_chq,
                     parse_departures, pick_slot, tableau_etranger)

URLS = {
    ("HER", "arrival"): "https://screen.herairport.com/arr2web.php",
    ("HER", "departure"): "https://screen.herairport.com/dep2web.php",
    ("CHQ", "arrival"): "https://www.chq-airport.gr/en/_jcr_content.arrivals.json",
    ("CHQ", "departure"): "https://www.chq-airport.gr/en/_jcr_content.departures.json",
}
UA = "Mozilla/5.0 (compatible; CreteDirectFlux/1.0; +https://crete.direct)"
AIRPORT_TZ = ZoneInfo("Europe/Athens")
FETCH_ATTEMPTS = 3
FETCH_BACKOFF_S = 5

SELECT_SLOTS_SQL = """
select id, sched_slot from flux_flight_arrivals
where airport = %(airport)s and direction = %(direction)s
  and service_date = %(service_date)s and flight_no = %(flight_no)s;
"""

INSERT_SQL = """
insert into flux_flight_arrivals
  (airport, direction, service_date, sched_slot, sched_time, flight_no,
   airline_code, origin, status, belt, landed_at)
values (%(airport)s, %(direction)s, %(service_date)s, %(sched_time)s, %(sched_time)s,
        %(flight_no)s, %(airline_code)s, %(origin)s, %(status)s, %(belt)s,
        coalesce(%(landed_at)s::timestamptz,
                 case when %(status)s = 'Landed' then now() end));
"""

UPDATE_SQL = """
update flux_flight_arrivals set
  sched_time = %(sched_time)s,
  status = coalesce(%(status)s, status),
  belt = coalesce(%(belt)s, belt),
  origin = coalesce(%(origin)s, origin),
  airline_code = coalesce(%(airline_code)s, airline_code),
  last_seen_at = now(),
  landed_at = coalesce(landed_at, %(landed_at)s::timestamptz,
                       case when %(status)s = 'Landed' then now() end)
where id = %(slot_id)s;
"""

# Vols rafraichis par les passages recents. 25 minutes = le passage precedent, et celui
# d'avant si le precedent a ete refuse : au troisieme refus de suite, plus rien a comparer,
# la liste est prise (voir GARDE_PART_MIN dans parsers.py).
PRECEDENTS_SQL = """
select distinct flight_no from flux_flight_arrivals
where airport = %s and direction = %s and last_seen_at > now() - interval '25 minutes';
"""

RUN_SQL = """
insert into flux_collector_runs
  (collector, airport, direction, ok, rows_seen, inserted, updated, error)
values ('flight_arrivals', %s, %s, %s, %s, %s, %s, %s);
"""


def log(msg):
    print(f"{datetime.now(timezone.utc).isoformat(timespec='seconds')} [flight_arrivals] {msg}",
          flush=True)


# Un echec isole n'est pas une panne : le collecteur repasse dans 10 minutes et rattrape.
# Mesure du 29/08/2026 sur 7 jours, 1 008 runs par capteur : CHQ departure echoue 34 fois
# (3,4 %), CHQ arrival 8 fois, HER arrival 1 fois -- et la plus longue serie d'echecs
# CONSECUTIFS est de 2 runs, soit 20 minutes. Aucun trou n'en resulte : les comptes
# journaliers CHQ restent entre 58 et 91, coherents entre arrivees et departs.
# Chacun de ces aleas ecrivait pourtant ERROR, que le cron_watchdog de kairos-guard remonte
# en « erreur detectee » a chaque cycle : du bruit permanent pour zero consequence, et du
# bruit qui use la lecture des vraies alertes.
#
# ERROR est garde des 3 echecs de suite, soit 30 minutes -- avant les 45 minutes au-dela
# desquelles watchdog.py declare le capteur muet. Une vraie panne reste donc annoncee deux
# fois, par deux chemins independants.
ECHECS_AVANT_ERREUR = 3

DERNIERS_RUNS_SQL = """
select ok from flux_collector_runs
where collector = 'flight_arrivals' and airport = %s and direction = %s
order by ran_at desc limit %s;
"""


def echecs_consecutifs(airport, direction, limite=ECHECS_AVANT_ERREUR):
    """Echecs de suite, celui qui vient d'etre enregistre compris."""
    try:
        conn = connect()
        with conn, conn.cursor() as cur:
            cur.execute(DERNIERS_RUNS_SQL, (airport, direction, limite))
            lignes = cur.fetchall()
        conn.close()
    except Exception:
        # Base injoignable : c'est deja une anomalie en soi, ne pas la transformer en
        # silence. On repond « au seuil » pour que la ligne parte en ERROR.
        return limite
    serie = 0
    for (ok,) in lignes:
        if ok:
            break
        serie += 1
    return serie


def fetch(url):
    """Recupere la source avec quelques reprises : une coupure de la source ne
    doit pas se traduire par un trou de collecte silencieux."""
    last = None
    for attempt in range(1, FETCH_ATTEMPTS + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read().decode("utf-8", errors="replace")
        except (urllib.error.URLError, OSError) as exc:
            last = exc
            log(f"tentative {attempt}/{FETCH_ATTEMPTS} echouee: {exc}")
            if attempt < FETCH_ATTEMPTS:
                time.sleep(FETCH_BACKOFF_S * attempt)
    raise last


def parse_her(raw, direction, now_local):
    parse = parse_arrivals if direction == "arrival" else parse_departures
    rows = assign_service_dates(parse(raw), now_local)
    for row in rows:
        row["landed_at"] = None  # HER : pose au passage du statut 'Landed'
    return rows


def record_run(airport, direction, ok, rows_seen, inserted, updated, error):
    try:
        conn = connect()
        conn.autocommit = True
        with conn, conn.cursor() as cur:
            cur.execute(RUN_SQL, (airport, direction, ok, rows_seen, inserted,
                                  updated, error))
        conn.close()
    except Exception as exc:  # le journal ne doit jamais masquer l'erreur reelle
        log(f"journal du run non ecrit: {exc}")


def vols_precedents(airport, direction):
    conn = connect()
    with conn, conn.cursor() as cur:
        cur.execute(PRECEDENTS_SQL, (airport, direction))
        vols = {r[0] for r in cur.fetchall()}
    conn.close()
    return vols


def store(rows):
    inserted = updated = 0
    conn = connect()
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        for row in rows:
            cur.execute(SELECT_SLOTS_SQL, row)
            slot_id = pick_slot(cur.fetchall(), row["sched_time"])
            if slot_id is None:
                cur.execute(INSERT_SQL, row)
                inserted += 1
            else:
                cur.execute(UPDATE_SQL, {**row, "slot_id": slot_id})
                updated += 1
    conn.close()
    return inserted, updated


def run(airport, direction):
    raw = fetch(URLS[(airport, direction)])
    if airport == "HER":
        rows = parse_her(raw, direction, datetime.now(AIRPORT_TZ))
    else:
        rows = parse_chq(json.loads(raw), direction)
    if not rows:
        raise RuntimeError("source lue mais 0 vol extrait (structure changee ?)")
    courants = {r["flight_no"] for r in rows}
    precedents = vols_precedents(airport, direction)
    if tableau_etranger(courants, precedents):
        raise RuntimeError(f"tableau refuse : {len(courants)} vols dont "
                           f"{len(courants & precedents)} vus au passage precedent "
                           f"(autre aeroport ?)")
    for row in rows:
        row["airport"] = airport
        row["direction"] = direction
        if direction == "departure":
            row["origin"] = row.pop("destination")  # meme colonne, sens = autre bout du vol
    inserted, updated = store(rows)
    log(f"{airport} {direction}: {len(rows)} vols lus, {inserted} crees, {updated} mis a jour")
    record_run(airport, direction, True, len(rows), inserted, updated, None)


if __name__ == "__main__":
    airport = "CHQ" if "--chq" in sys.argv else "HER"
    direction = "departure" if "--departures" in sys.argv else "arrival"
    try:
        run(airport, direction)
    except Exception as exc:  # cron : log horodate + trace en base + exit != 0
        # Enregistrer AVANT de compter : la serie doit inclure l'echec en cours.
        record_run(airport, direction, False, 0, 0, 0, str(exc)[:500])
        suite = echecs_consecutifs(airport, direction)
        if suite >= ECHECS_AVANT_ERREUR:
            log(f"ERROR {airport} {direction}: {exc} ({suite} echecs de suite)")
        else:
            log(f"INFO {airport} {direction}: tentative echouee, rattrapage au prochain "
                f"run dans 10 min ({suite}/{ECHECS_AVANT_ERREUR}) — {exc}")
        sys.exit(1)
