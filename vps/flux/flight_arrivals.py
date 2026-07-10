#!/usr/bin/env python3
"""Historise les arrivees ET les departs de l'aeroport d'Heraklion (tableaux officiels, MAJ 15s).

Cron : */10 * * * * (arrivees) + */10 * * * * avec --departures.
Chaque tableau couvre ~24h glissantes : assign_service_dates date les lignes
apres minuit au jour suivant. Upsert par (airport, direction, service_date, flight_no, sched_time).
"""
import sys
import urllib.request

from db import connect
from parsers import (assign_service_dates, parse_arrivals, parse_departures,
                     parse_service_date)

URLS = {
    "arrival": "https://screen.herairport.com/arr2web.php",
    "departure": "https://screen.herairport.com/dep2web.php",
}
UA = "Mozilla/5.0 (compatible; CreteDirectFlux/1.0; +https://crete.direct)"

UPSERT_SQL = """
insert into flux_flight_arrivals
  (airport, direction, service_date, sched_time, flight_no, airline_code, origin, status, belt, landed_at)
values ('HER', %(direction)s, %(service_date)s, %(sched_time)s, %(flight_no)s, %(airline_code)s,
        %(origin)s, %(status)s, %(belt)s,
        case when %(status)s = 'Landed' then now() end)
on conflict (airport, direction, service_date, flight_no, sched_time) do update set
  status = coalesce(excluded.status, flux_flight_arrivals.status),
  belt = coalesce(excluded.belt, flux_flight_arrivals.belt),
  last_seen_at = now(),
  landed_at = coalesce(flux_flight_arrivals.landed_at, excluded.landed_at);
"""


def run(direction):
    req = urllib.request.Request(URLS[direction], headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        html = r.read().decode("utf-8", errors="replace")
    day = parse_service_date(html)
    parse = parse_arrivals if direction == "arrival" else parse_departures
    rows = assign_service_dates(parse(html), day)
    for row in rows:
        row["direction"] = direction
        if direction == "departure":
            row["origin"] = row.pop("destination")  # meme colonne, sens = autre bout du vol
    conn = connect()
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        for row in rows:
            cur.execute(UPSERT_SQL, row)
    conn.close()
    print(f"HER {direction} {day}: {len(rows)} vols upsert")


if __name__ == "__main__":
    try:
        run("departure" if "--departures" in sys.argv else "arrival")
    except Exception as exc:  # cron : log et exit != 0
        print(f"flight_arrivals ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
