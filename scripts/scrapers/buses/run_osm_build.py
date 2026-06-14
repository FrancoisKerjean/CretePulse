#!/usr/bin/env python3
"""Entree cron du build OSM hebdo : fetch Overpass -> assemble -> store.
Alerte Telegram sur erreur (RuntimeError = Overpass down ; ValueError = garde-fou).
Cron : 0 2 * * 0 (dimanche 02:00 Athens, en marge des autres jobs)."""
import os
import sys
import time

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def log(msg: str) -> None:
    print(f"[osm_build] {msg}", flush=True)


def send_telegram(text: str) -> None:
    try:
        from kairos_telegram import send, Bot  # type: ignore
        send(Bot.PLUME, "OSM Bus Build", text)
    except Exception as e:
        log(f"Telegram error: {e}")


def main() -> int:
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    from osm_network import build_osm_network
    t0 = time.time()
    try:
        n_stops, n_lines, n_ls = build_osm_network(sb)
    except RuntimeError as e:
        log(f"FAIL Overpass: {e}")
        send_telegram(f"OSM build FAIL (Overpass): {e}")
        return 1
    except ValueError as e:
        log(f"FAIL garde-fou: {e}")
        send_telegram(f"OSM build FAIL (garde-fou): {e}")
        return 1
    except Exception as e:
        log(f"FAIL inattendu: {e}")
        send_telegram(f"OSM build FAIL (inattendu): {e}")
        return 1
    dt = time.time() - t0
    log(f"OK {n_stops} stops / {n_lines} lines / {n_ls} line_stops in {dt:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
