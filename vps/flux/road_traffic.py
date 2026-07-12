#!/usr/bin/env python3
"""Sonde TomTom Traffic Flow sur les corridors pilotes.

Sans TOMTOM_API_KEY, aucun appel ni ecriture : utiliser --dry-run pour verifier
les sondes. L'activation reste volontaire afin de valider compte, cout et licence.
"""
import argparse
import os
import sys

import requests

try:  # execution directe VPS et import package dans pytest
    from .db import connect
except ImportError:
    from db import connect

ENDPOINT = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"


def normalize_flow(payload):
    data = payload.get("flowSegmentData") or {}
    return (
        data.get("currentSpeed"), data.get("freeFlowSpeed"),
        data.get("currentTravelTime"), data.get("freeFlowTravelTime"),
        data.get("confidence"), data.get("roadClosure"),
    )


def probes(conn):
    with conn.cursor() as cur:
        cur.execute("select id, point_lat, point_lng from flux_road_probes where active order by id")
        return cur.fetchall()


def run(dry_run=False):
    conn = connect()
    rows = probes(conn)
    if dry_run:
        conn.close()
        print(f"road_traffic dry-run: {len(rows)} sondes, zero appel API")
        return len(rows)
    api_key = os.environ.get("TOMTOM_API_KEY")
    if not api_key:
        conn.close()
        raise RuntimeError("TOMTOM_API_KEY absente ; collecte volontairement desactivee")
    session = requests.Session()
    inserted = 0
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        for probe_id, lat, lng in rows:
            response = session.get(ENDPOINT, params={"key": api_key, "point": f"{lat},{lng}", "unit": "kmph"}, timeout=20)
            response.raise_for_status()
            values = normalize_flow(response.json())
            cur.execute(
                """insert into flux_road_observations
                (probe_id, provider, current_speed_kmh, free_flow_speed_kmh,
                 current_travel_time_s, free_flow_travel_time_s, confidence, road_closed)
                values (%s, 'tomtom', %s, %s, %s, %s, %s, %s)""",
                (probe_id, *values),
            )
            inserted += 1
    conn.close()
    print(f"road_traffic: {inserted} observations")
    return inserted


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        run(args.dry_run)
    except Exception as exc:
        print(f"road_traffic ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
