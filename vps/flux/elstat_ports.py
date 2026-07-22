#!/usr/bin/env python3
"""Importe les passagers ferries ELSTAT par port et trimestre.

Source officielle : publication SMA06, tableaux embarques/debarques par port.
Usage : elstat_ports.py --years 2024,2025 [--dry-run]
Dependances : requests, beautifulsoup4, xlrd.
"""
import argparse
import io
import re
import sys
from datetime import date

import requests
import xlrd
from bs4 import BeautifulSoup

try:  # execution directe VPS et import package dans pytest
    from .db import connect
except ImportError:
    from db import connect

PAGE = "https://www.statistics.gr/en/statistics/-/publication/SMA06/{year}-Q{quarter}"
LINK_LABELS = {
    "embarked": "Passengers embarked, by ports",
    "disembarked": "Passengers disembarked, by ports",
}
PORT_ALIASES = {
    "heraklio": "heraklion",
    "heraklion": "heraklion",
    "souda bay": "souda",
    "souda": "souda",
    "sitia": "sitia",
    "agios nikolaos": "agios-nikolaos",
    "ierapetra": "ierapetra",
}
UA = "crete.direct flux research/1.0 (official statistics importer)"


def _norm(value):
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def extract_crete_ports(rows):
    """Extrait (port, passagers) depuis les lignes brutes d'un classeur ELSTAT."""
    found = []
    for row in rows:
        cells = list(row)
        if len(cells) < 3:
            continue
        english_name = _norm(cells[-1])
        port = PORT_ALIASES.get(english_name)
        if not port:
            continue
        values = [v for v in cells[1:-1] if isinstance(v, (int, float))]
        found.append((port, int(round(sum(values)))))
    return found


def workbook_rows(content):
    book = xlrd.open_workbook(file_contents=content)
    sheet = book.sheet_by_index(0)
    return [[sheet.cell_value(r, c) for c in range(sheet.ncols)] for r in range(sheet.nrows)]


def table_links(session, year, quarter):
    page_url = PAGE.format(year=year, quarter=quarter)
    response = session.get(page_url, timeout=45)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    links = {}
    for direction, prefix in LINK_LABELS.items():
        anchor = next((a for a in soup.find_all("a") if prefix in a.get_text(" ", strip=True)), None)
        if anchor and anchor.get("href"):
            links[direction] = anchor["href"]
    return links


def collect(years):
    session = requests.Session()
    session.headers["User-Agent"] = UA
    records = []
    for year in years:
        for quarter in range(1, 5):
            links = table_links(session, year, quarter)
            if len(links) != 2:
                continue
            quarter_date = date(year, 1 + (quarter - 1) * 3, 1)
            for direction, source_url in links.items():
                response = session.get(source_url, timeout=60)
                response.raise_for_status()
                for port, passengers in extract_crete_ports(workbook_rows(response.content)):
                    records.append((quarter_date, port, direction, passengers, source_url))
    return records


UPSERT = """
insert into flux_port_quarterly (quarter, port, direction, passengers, source_url)
values (%s, %s, %s, %s, %s)
on conflict (quarter, port, direction) do update set
  passengers = excluded.passengers, source_url = excluded.source_url, updated_at = now()
"""


def run(years, dry_run=False):
    rows = collect(years)
    if not rows:
        raise RuntimeError("aucune ligne ELSTAT trouvee")
    if dry_run:
        for row in rows:
            print("|".join(map(str, row[:4])))
        return len(rows)
    conn = connect()
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        cur.executemany(UPSERT, rows)
    conn.close()
    print(f"elstat_ports: {len(rows)} lignes upsert")
    return len(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--years", help="ex: 2024,2025 ; defaut = annee courante et precedente")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        years = ([int(y) for y in args.years.split(",") if y.strip()]
                 if args.years else [date.today().year - 1, date.today().year])
        run(years, args.dry_run)
    except Exception as exc:
        print(f"elstat_ports ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
