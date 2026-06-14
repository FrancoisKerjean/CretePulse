#!/usr/bin/env python3
"""Entrée cron SP2 : charge DB -> apparie KTEL aux lignes -> fallback paires absentes.
Alerte Telegram sur erreur (ValueError = garde-fou ; Exception = inattendu).
Crons : 45 4 * * * (quotidien, 15 min après alerts.py)
       15 2 * * 0 (dimanche, après run_osm_build.py de 02:00)."""
import os
import sys
import time

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def log(msg: str) -> None:
    print(f"[apparier] {msg}", flush=True)


def send_telegram(text: str) -> None:
    try:
        from kairos_telegram import send, Bot  # type: ignore
        send(Bot.PLUME, "KTEL Apparier", text)
    except Exception as e:
        log(f"Telegram error: {e}")


def main() -> int:
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    from ktel_apparier import run_apparier
    t0 = time.time()
    try:
        counters = run_apparier(sb)
    except ValueError as e:
        log(f"FAIL garde-fou: {e}")
        send_telegram(f"SP2 FAIL (garde-fou): {e}")
        return 1
    except Exception as e:
        log(f"FAIL inattendu: {e}")
        send_telegram(f"SP2 FAIL (inattendu): {e}")
        return 1
    dt = time.time() - t0
    log(
        f"OK matched_osm={counters['matched_to_osm']} "
        f"fallback_lines={counters['fallback_lines']} "
        f"fallback_stops={counters['fallback_stops']} "
        f"route_updates={counters['route_line_id_updates']} "
        f"in {dt:.1f}s"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
