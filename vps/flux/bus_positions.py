#!/usr/bin/env python3
"""Historise les positions GPS des bus urbains.

- agncitybus (Agios Nikolaos)  : positions completes routes 1-3   -> cron * 4-19 * * * (UTC)
- citybus HER/CHA (--citybus)  : vehicules vus aux arrets hubs    -> cron */5 4-20 * * *

Hubs = arrets desservis par le plus de lignes (requete bus_line_stops du 10/07/2026)
+ arrets verifies en prod (HER 0122, CHA 74003).
"""
import json
import re
import sys
import urllib.error
import urllib.request

from db import insert_rows
from parsers import normalize_agn, normalize_citybus_vehicles

UA = "Mozilla/5.0 (compatible; CreteDirectFlux/1.0; +https://crete.direct)"
AGN_URL = "https://www.agncitybus.gr/map/get_location_route.php?route={r}"
CITYBUS_REST = "https://rest.citybus.gr/api/v1"
TOKEN_RE = re.compile(r"const token\s*=\s*'([^']+)'")  # aligne sur citybus-live/[stop]/route.ts

CITYBUS = {
    "citybus-her": {
        "subdomain": "irakleio", "agency": "110",
        "stops": ["1928", "0111", "0110", "2215", "0216", "1303",
                  "0114", "0115", "0119", "0116", "0120", "0118", "0122"],
    },
    "citybus-cha": {
        "subdomain": "chania", "agency": "120",
        "stops": ["74036", "74443", "74004", "74154", "74368", "74369",
                  "74126", "74322", "74092", "74127", "74367", "74124", "74003"],
    },
}

INSERT_SQL = ("insert into flux_bus_positions"
              " (source, line_code, vehicle_key, lat, lng, speed_kmh, bearing)"
              " values (%s,%s,%s,%s,%s,%s,%s)")


def http_get(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def run_agn():
    rows = []
    for r in (1, 2, 3):
        try:
            rows += normalize_agn(json.loads(http_get(AGN_URL.format(r=r))), r)
        except Exception as exc:
            print(f"agn route {r}: {exc}", file=sys.stderr)
    print(f"agncitybus: {insert_rows(INSERT_SQL, rows)} positions")


def run_citybus():
    for source, cfg in CITYBUS.items():
        page = f"https://{cfg['subdomain']}.citybus.gr/el/stops"
        try:
            token = TOKEN_RE.search(http_get(page)).group(1)
        except Exception as exc:
            print(f"{source} token: {exc}", file=sys.stderr)
            continue
        headers = {"Authorization": f"Bearer {token}",
                   "Referer": f"https://{cfg['subdomain']}.citybus.gr/"}
        rows = {}
        for code in cfg["stops"]:
            url = f"{CITYBUS_REST}/el/{cfg['agency']}/stops/live/{code}"
            try:
                payload = json.loads(http_get(url, headers))
            except urllib.error.HTTPError as exc:
                if exc.code == 404:  # arret sans passage imminent = normal
                    continue
                print(f"{source} stop {code}: HTTP {exc.code}", file=sys.stderr)
                continue
            except Exception as exc:
                print(f"{source} stop {code}: {exc}", file=sys.stderr)
                continue
            for row in normalize_citybus_vehicles(payload, source):
                rows[row[2]] = row  # dedup par vehicle_key entre arrets
        print(f"{source}: {insert_rows(INSERT_SQL, list(rows.values()))} positions")


if __name__ == "__main__":
    if "--citybus" in sys.argv:
        run_citybus()
    else:
        run_agn()
