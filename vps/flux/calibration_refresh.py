#!/usr/bin/env python3
"""Recalage automatique de la calibration pax/vol (flux_calibration).

Cron : 40 4 * * * (quotidien, leger).
1. Reprend les nouveaux mois officiels HCAA depuis hcaa_crete_monthly (source ypa.gr).
2. Des qu'un mois civil est integralement couvert par notre comptage
   flux_flight_arrivals, pose flights_counted ; si le pax officiel du meme mois
   existe, coef = pax_official / flights_counted (method 'measured', prioritaire
   sur 'hcaa-movements' car meme perimetre que le capteur).
"""
import sys

from db import connect

SEED_FROM_HCAA_SQL = """
insert into flux_calibration
  (month, airport, direction, pax_official, flights_official, coef, method, source_url)
select make_date(h.year, h.month, 1), h.airport_iata, d.direction,
       case d.direction when 'arrival' then h.pax_disembark else h.pax_embark end,
       h.aircraft_total / 2,
       (case d.direction when 'arrival' then h.pax_disembark else h.pax_embark end)::double precision
         / nullif(h.aircraft_total / 2, 0),
       'hcaa-movements', h.source_xlsx_url
from hcaa_crete_monthly h
cross join (values ('arrival'), ('departure')) as d(direction)
where h.airport_iata in ('HER', 'CHQ') and h.aircraft_total > 0
on conflict (month, airport, direction) do update set
  pax_official = excluded.pax_official,
  flights_official = excluded.flights_official,
  coef = case when flux_calibration.method = 'measured' then flux_calibration.coef else excluded.coef end,
  source_url = excluded.source_url,
  updated_at = now();
"""

RECALIBRATE_FROM_COUNTS_SQL = """
with counted as (
  select airport, direction, date_trunc('month', service_date)::date as month,
         count(*) as flights, count(distinct service_date) as days_seen
  from flux_flight_arrivals
  group by 1, 2, 3
)
insert into flux_calibration (month, airport, direction, flights_counted, method)
select month, airport, direction, flights, 'counted-only'
from counted
where days_seen = extract(day from (month + interval '1 month' - interval '1 day'))
on conflict (month, airport, direction) do update set
  flights_counted = excluded.flights_counted,
  coef = case when flux_calibration.pax_official is not null
              then flux_calibration.pax_official::double precision
                   / nullif(excluded.flights_counted, 0)
              else flux_calibration.coef end,
  method = case when flux_calibration.pax_official is not null
               then 'measured' else flux_calibration.method end,
  updated_at = now();
"""


def run():
    conn = connect()
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        cur.execute(SEED_FROM_HCAA_SQL)
        cur.execute(RECALIBRATE_FROM_COUNTS_SQL)
        cur.execute("select method, count(*) from flux_calibration group by 1 order by 1")
        summary = ", ".join(f"{m}={n}" for m, n in cur.fetchall())
    conn.close()
    print(f"calibration: {summary or 'vide'}")


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:  # cron : log et exit != 0
        print(f"calibration_refresh ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
