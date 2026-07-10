#!/usr/bin/env python3
"""Extrait les agregats quotidiens d'intentions depuis ClickHouse (Plausible) vers Postgres.

Cron : 50 4 * * * (traite J-1). Backfill : intent_extract.py --backfill 90
Schema verifie 10/07/2026 : events_v2(name, site_id=1, timestamp, meta.key/meta.value Array(String)).
"""
import subprocess
import sys
from datetime import date, timedelta

from db import connect

CH_CONTAINER = "plausible-plausible_events_db-1"
SITE_ID = 1  # crete.direct

# (event_name stocke, prop_key stocke, expression valeur, filtre supplementaire)
PROP = "arrayElement(meta.value, indexOf(meta.key, '{k}'))"
SPECS = [
    ("bus_search",      "od",      f"concat({PROP.format(k='from')}, '→', {PROP.format(k='to')})",
     f"{PROP.format(k='results')} != '0'"),
    ("bus_search_zero", "od",      f"concat({PROP.format(k='from')}, '→', {PROP.format(k='to')})",
     f"{PROP.format(k='results')} = '0'"),
    ("ticket_intent",   "od",      f"concat({PROP.format(k='from')}, '→', {PROP.format(k='to')})", None),
    ("search_query",    "query",   PROP.format(k="query"), None),
    ("explore_search",  "query",   PROP.format(k="query"), None),
    ("Car Lead",        "zone",    PROP.format(k="zone"), None),
    ("Taxi Call",       "zone",    PROP.format(k="zone"), None),
    ("Near Me",         "section", PROP.format(k="section"), None),
    ("Activity Lead",   "total",   "'all'", None),
]

UPSERT_SQL = """
insert into flux_intent_daily (day, event_name, prop_key, prop_value, events_count)
values (%s, %s, %s, %s, %s)
on conflict (day, event_name, prop_key, prop_value)
do update set events_count = excluded.events_count;
"""


def ch(query):
    out = subprocess.run(
        ["docker", "exec", CH_CONTAINER, "clickhouse-client",
         "--database", "plausible_events_db", "-q", query],
        capture_output=True, text=True, check=True)
    return [line.split("\t") for line in out.stdout.strip().split("\n") if line]


def extract_day(day):
    rows = []
    for stored_name, prop_key, value_expr, extra in SPECS:
        event = stored_name.replace("_zero", "")  # bus_search_zero lit l'event bus_search
        where = (f"name = '{event}' AND toDate(timestamp) = '{day.isoformat()}'"
                 f" AND site_id = {SITE_ID}")
        if extra:
            where += f" AND {extra}"
        q = (f"SELECT {value_expr} AS v, count() AS c FROM events_v2"
             f" WHERE {where} GROUP BY v HAVING v != '' AND v != '→' FORMAT TSV")
        for parts in ch(q):
            if len(parts) != 2:
                continue
            v, c = parts
            rows.append((day, stored_name, prop_key, v[:120], int(c)))
    return rows


def run(days):
    conn = connect()
    conn.autocommit = True
    total = 0
    with conn, conn.cursor() as cur:
        for day in days:
            for row in extract_day(day):
                cur.execute(UPSERT_SQL, row)
                total += 1
    conn.close()
    print(f"intent: {total} agregats sur {len(days)} jour(s)")


if __name__ == "__main__":
    try:
        if "--backfill" in sys.argv:
            n = int(sys.argv[sys.argv.index("--backfill") + 1])
            run([date.today() - timedelta(days=i) for i in range(1, n + 1)])
        else:
            run([date.today() - timedelta(days=1)])
    except Exception as exc:
        print(f"intent_extract ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
