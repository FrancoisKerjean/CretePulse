#!/usr/bin/env python3
"""Calibration passagers/traversee des ports cretois.

Numerateur : passagers officiels ELSTAT SMA06 par port et trimestre, deja
importes par elstat_ports.py dans flux_port_quarterly (source_url par ligne).
Denominateur : traversees programmees comptees par ferry_crossings.py.

    coef(trimestre) = pax officiels du trimestre / traversees du trimestre

Le meme trimestre d'une autre annee sert de reference, jamais le trimestre
voisin : le remplissage d'un ferry en juillet n'a rien a voir avec celui
d'octobre. Aucun coefficient n'est ecrit sans chiffre officiel derriere.

Usage : ferry_calibration.py [--dry-run]
"""
import argparse
import sys
from datetime import date

try:  # execution directe VPS et import package dans pytest
    from .db import connect
except ImportError:
    from db import connect

# ELSTAT compte des embarquements et des debarquements, GTP des departs et des
# arrivees : c'est le meme mouvement vu des deux cotes du quai.
PAX_DIRECTION = {"embarked": "departure", "disembarked": "arrival"}
METHOD = "elstat-quarterly"

# elstat_ports.py nomme les ports en toutes lettres, le capteur les code sur
# trois lettres. Un port ELSTAT sans code ici n'est simplement pas mesure.
ELSTAT_PORT_CODE = {"heraklion": "HER", "souda": "SOU", "sitia": "SIT"}


def _quarter_start(day):
    return date(day.year, 1 + 3 * ((day.month - 1) // 3), 1)


def _quarter_days(quarter):
    end = date(quarter.year + (quarter.month + 2) // 12, (quarter.month + 2) % 12 + 1, 1)
    return (end - quarter).days


def port_coefficients(pax_quarterly, crossings_daily):
    """-> lignes de calibration pretes a upserter dans flux_calibration.

    pax_quarterly  : [(trimestre, port, direction ELSTAT, passagers, source_url)]
    crossings_daily: {(port, direction GTP, jour): traversees de ce jour}

    La couverture est comptee en jours interroges, pas en jours ayant produit
    une traversee : Souda et Sitia ont des journees legitimement vides.
    """
    official = {}
    for quarter, port, pax_direction, passengers, source_url in pax_quarterly:
        direction = PAX_DIRECTION.get(pax_direction)
        if direction is None or not passengers:
            continue
        key = (port, direction, quarter.month)
        best = official.get(key)
        if best is None or quarter.year > best[0].year:
            official[key] = (quarter, passengers, source_url)

    quarters = {}
    for (port, direction, day), crossings in crossings_daily.items():
        quarters.setdefault((port, direction, _quarter_start(day)), {})[day] = crossings

    rows = []
    for (port, direction, quarter), days in quarters.items():
        reference = official.get((port, direction, quarter.month))
        if reference is None:
            continue  # pas de chiffre officiel pour ce trimestre : pas de coefficient
        source_quarter, passengers, source_url = reference
        total = sum(days.values())
        if not total:
            continue
        coef = passengers / total
        months = {}
        for day, crossings in days.items():
            months[date(day.year, day.month, 1)] = months.get(date(day.year, day.month, 1), 0) + crossings
        for month, crossings in sorted(months.items()):
            rows.append({
                "month": month,
                "scope": "port",
                "node": port,
                "direction": direction,
                "pax_official": round(passengers * crossings / total),
                "movements_official": crossings,
                "coef": coef,
                "method": METHOD,
                "source_url": source_url,
                "source_quarter": source_quarter,
                "quarter_days_covered": len(days),
                "quarter_days_total": _quarter_days(quarter),
            })
    return rows


# --- acces base (hors du perimetre teste) ------------------------------------

PAX_SQL = "select quarter, port, direction, passengers, source_url from flux_port_quarterly;"

# Le denominateur se compte par JOUR INTERROGE, pas par jour ayant produit une
# traversee : une journee vide a Souda est un resultat, pas un trou. Les jours
# interroges sont ceux ou le collecteur a tourne, lus dans flux_collector_runs.
CROSSINGS_SQL = """
with polled as (
  select distinct airport as port_code, direction, service_date
  from flux_collector_runs
  where collector = 'ferry_crossings' and ok
    and direction is not null and service_date is not null
),
-- Une journee n'est completement couverte que si la veille a AUSSI ete
-- interrogee : GTP date les traversees sur leur depart, donc les arrivees de
-- nuit d'un jour sortent de la requete de la veille.
covered as (
  select p.port_code, p.direction, p.service_date
  from polled p
  join polled v on v.port_code = p.port_code and v.direction = p.direction
               and v.service_date = p.service_date - 1
)
select c.port_code, c.direction, c.service_date, count(x.id)
from covered c
left join flux_ferry_crossings x
  on x.port_code = c.port_code and x.direction = c.direction
 and x.service_date = c.service_date
group by 1, 2, 3;
"""

UPSERT = """
insert into flux_calibration
  (month, scope, airport, direction, pax_official, flights_official, coef,
   method, source_url, quarter_days_covered, quarter_days_total)
values (%(month)s, %(scope)s, %(node)s, %(direction)s, %(pax_official)s,
        %(movements_official)s, %(coef)s, %(method)s, %(source_url)s,
        %(quarter_days_covered)s, %(quarter_days_total)s)
on conflict (month, scope, airport, direction) do update set
  pax_official = excluded.pax_official,
  flights_official = excluded.flights_official,
  coef = excluded.coef,
  method = excluded.method,
  source_url = excluded.source_url,
  quarter_days_covered = excluded.quarter_days_covered,
  quarter_days_total = excluded.quarter_days_total,
  updated_at = now();
"""


def run(dry_run=False):
    conn = connect()
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(PAX_SQL)
            pax = [(q, ELSTAT_PORT_CODE[port], d, n, url)
                   for q, port, d, n, url in cur.fetchall()
                   if port in ELSTAT_PORT_CODE]
            cur.execute(CROSSINGS_SQL)
            crossings = {(p, d, m): n for p, d, m, n in cur.fetchall()}
        rows = port_coefficients(pax, crossings)
        if dry_run:
            for row in sorted(rows, key=lambda r: (r["node"], r["direction"], r["month"])):
                print(f"{row['month']} {row['node']:12} {row['direction']:9} "
                      f"pax={row['pax_official']:>8} traversees={row['movements_official']:>4} "
                      f"coef={row['coef']:.1f} "
                      f"couverture={row['quarter_days_covered']}/{row['quarter_days_total']} j")
            return len(rows)
        with conn.cursor() as cur:
            cur.executemany(UPSERT, rows)
    finally:
        conn.close()
    print(f"ferry_calibration: {len(rows)} lignes upsert")
    return len(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        run(args.dry_run)
    except Exception as exc:
        print(f"ferry_calibration ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
