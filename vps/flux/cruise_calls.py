#!/usr/bin/env python3
"""Historise le calendrier officiel des escales croisieres du port d'Heraklion (PDF annuel).

Cron : 0 5 1 * * (mensuel, le PDF officiel est mis a jour en cours de saison).
Structure verifiee 10/07/2026 : colonnes [DATE, DAY, SHIP, ETA, ETD, PAX, LOA, BERTH],
date d/m/Y, PAX avec point separateur de milliers ('2.534').
"""
import re
import sys
import urllib.request
from datetime import datetime

import pdfplumber

from db import connect

PDF_URL = ("https://www.portheraklion.gr/images/3.attachments/cruise/"
           "CRUISE_SHIP_SCHEDULE_2026.pdf")
COL_DATE, COL_SHIP, COL_ETA, COL_ETD, COL_PAX = 0, 2, 3, 4, 5

UPSERT_SQL = """
insert into flux_cruise_calls (port, call_date, ship_name, eta, etd, pax_capacity, updated_at)
values ('heraklion', %s, %s, %s, %s, %s, now())
on conflict (port, call_date, ship_name) do update set
  eta = excluded.eta, etd = excluded.etd,
  pax_capacity = coalesce(excluded.pax_capacity, flux_cruise_calls.pax_capacity),
  updated_at = now();
"""


def parse_call_date(raw):
    try:
        return datetime.strptime((raw or "").strip(), "%d/%m/%Y").date()
    except ValueError:
        return None


def parse_pax(raw):
    m = re.search(r"\d[\d.,]*", raw or "")
    return int(re.sub(r"[.,]", "", m.group(0))) if m else None


def run():
    req = urllib.request.Request(PDF_URL, headers={"User-Agent": "CreteDirectFlux/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r, open("/tmp/cruise_schedule.pdf", "wb") as f:
        f.write(r.read())
    calls = []
    with pdfplumber.open("/tmp/cruise_schedule.pdf") as pdf:
        for page in pdf.pages:
            for row in page.extract_table() or []:
                if not row or len(row) <= COL_PAX:
                    continue
                day = parse_call_date(row[COL_DATE])
                ship = (row[COL_SHIP] or "").strip()
                if not day or not ship:  # header ou ligne vide
                    continue
                calls.append((day, ship,
                              (row[COL_ETA] or "").strip() or None,
                              (row[COL_ETD] or "").strip() or None,
                              parse_pax(row[COL_PAX])))
    conn = connect()
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        for call in calls:
            cur.execute(UPSERT_SQL, call)
    conn.close()
    print(f"croisieres heraklion: {len(calls)} escales upsert")


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:
        print(f"cruise_calls ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
