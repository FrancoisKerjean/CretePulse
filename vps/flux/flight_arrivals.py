#!/usr/bin/env python3
"""Historise les arrivees de l'aeroport d'Heraklion (tableau officiel, MAJ 15s).

Cron : */10 * * * *. Upsert par (airport, service_date, flight_no, sched_time).
"""
import sys
import urllib.request

from db import connect
from parsers import parse_arrivals, parse_service_date

URL = "https://screen.herairport.com/arr2web.php"
UA = "Mozilla/5.0 (compatible; CreteDirectFlux/1.0; +https://crete.direct)"

UPSERT_SQL = """
insert into flux_flight_arrivals
  (airport, service_date, sched_time, flight_no, airline_code, origin, status, belt, landed_at)
values ('HER', %(service_date)s, %(sched_time)s, %(flight_no)s, %(airline_code)s,
        %(origin)s, %(status)s, %(belt)s,
        case when %(status)s = 'Landed' then now() end)
on conflict (airport, service_date, flight_no, sched_time) do update set
  status = excluded.status,
  belt = coalesce(excluded.belt, flux_flight_arrivals.belt),
  last_seen_at = now(),
  landed_at = coalesce(flux_flight_arrivals.landed_at, excluded.landed_at);
"""


def run():
    req = urllib.request.Request(URL, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        html = r.read().decode("utf-8", errors="replace")
    day = parse_service_date(html)
    rows = parse_arrivals(html)
    for row in rows:
        row["service_date"] = day
    conn = connect()
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        for row in rows:
            cur.execute(UPSERT_SQL, row)
    conn.close()
    print(f"HER {day}: {len(rows)} vols upsert")


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:  # cron : log et exit != 0
        print(f"flight_arrivals ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
