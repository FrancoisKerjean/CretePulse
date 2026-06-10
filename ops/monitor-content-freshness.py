#!/usr/bin/env python3
"""CretePulse content-freshness watchdog.

Alerts on Telegram when any content pipeline goes stale -- the exact failure
mode that silently froze the site for ~7 weeks (a cron dies, content stops,
nobody notices). Checks DATA freshness in Postgres (the real symptom), not log
mtimes, so it catches the freeze whatever the cause.

Cron: every 3h. `--report` always sends the current status (for testing /
periodic all-green pings); normal mode only pings when something is stale.
"""
import os, sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")
sys.path.insert(0, "/opt/cretepulse")

DB = dict(host="localhost", port=5433, dbname="cretepulse",
          user="postgres", password=os.environ["POSTGRES_PASSWORD"])

NOW = datetime.now(timezone.utc)

# (label, SQL returning one timestamptz, max_age_hours before stale)
CHECKS = [
    ("News scraper (news.py /30min)",
     "SELECT max(created_at) FROM news", 4),
    ("News translation (writer-v2 /1h)",
     "SELECT max(published_at) FROM news WHERE rewritten = true "
     "AND category IS NOT NULL AND category <> 'filtered' "
     "AND coalesce(title_en,'') <> ''", 12),
    ("Guide writer (guide-writer 2x/j)",
     "SELECT max(created_at) FROM guides", 30),
    ("Weather cache (weather.py /1h)",
     "SELECT max(fetched_at) FROM weather_cache", 4),
]


def main():
    report = "--report" in sys.argv
    conn = psycopg2.connect(**DB)
    lines, stale = [], []
    with conn.cursor() as cur:
        for label, sql, max_h in CHECKS:
            try:
                cur.execute(sql)
                ts = cur.fetchone()[0]
            except Exception as e:
                conn.rollback()
                lines.append(f"\U0001F7E0 {label}: erreur requete ({e})")
                stale.append(label)
                continue
            if ts is None:
                age_h, ok = None, False
            else:
                age_h = (NOW - ts).total_seconds() / 3600
                ok = age_h <= max_h
            mark = "✅" if ok else "\U0001F534"
            age_str = "jamais" if age_h is None else f"{age_h:.1f}h"
            lines.append(f"{mark} {label}: {age_str} (seuil {max_h}h)")
            if not ok:
                stale.append(label)
    conn.close()

    if stale or report:
        head = ("\U0001F534 <b>CretePulse — contenu fige</b>" if stale
                else "✅ <b>CretePulse — tout frais</b>")
        msg = head + "\n\n" + "\n".join(lines)
        if stale:
            msg += ("\n\n⚠️ Verifier le cron concerne sur le VPS "
                    "(logs /var/log/cretepulse-*.log).")
        import telegram
        telegram.send_telegram_message(msg)
        print("ALERT sent" if stale else "report sent")
    else:
        print("all fresh, no alert. " + " | ".join(lines))


if __name__ == "__main__":
    main()
