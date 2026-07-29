#!/usr/bin/env python3
"""Sonde des capteurs vols : alerte Telegram des qu'une collecte decroche.

Le capteur HER n'a rien ecrit du 22 au 27/07/2026 alors que le cron tournait
144 fois par jour. Personne ne l'a vu : log sans horodatage, aucun journal de
run, code de sortie avale par cron. Cette sonde ferme ce trou.

Deux controles, sur la derniere journee de service COMPLETE :
  - fraicheur : un run reussi dans les 45 dernieres minutes (cron toutes les 10)
  - plausibilite : le compte du jour reste dans une bande realiste

Cron : 20 * * * * (toutes les heures).
"""
import os
import sys
from datetime import date, datetime, timedelta, timezone

STALE_AFTER_MIN = 45

# Bandes calees sur les journees propres observees (HER ~150-190 vols/jour,
# CHQ ~65-93), elargies pour ne se declencher que sur une vraie panne.
BANDS = {
    ("HER", "arrival"): (100, 260),
    ("HER", "departure"): (100, 260),
    ("CHQ", "arrival"): (40, 140),
    ("CHQ", "departure"): (40, 140),
}
FEEDS = tuple(BANDS)


def evaluate(last_ok, daily, now, stale_after_min=STALE_AFTER_MIN):
    """-> liste de messages d'alerte. Liste vide = tout va bien.

    last_ok : {(airport, direction): datetime du dernier run reussi ou None}
    daily   : {(airport, direction): nombre de vols de la derniere journee pleine}
    """
    alerts = []
    for feed in FEEDS:
        airport, direction = feed
        label = f"{airport} {direction}"
        seen_at = last_ok.get(feed)
        if seen_at is None:
            alerts.append(f"{label} : aucun run reussi enregistre")
            continue
        age_min = int((now - seen_at).total_seconds() // 60)
        if age_min > stale_after_min:
            hours, minutes = divmod(age_min, 60)
            alerts.append(f"{label} : muet depuis {hours} h {minutes:02d}")
            continue
        count = daily.get(feed)
        if count is None:
            alerts.append(f"{label} : aucune ligne pour la derniere journee pleine")
            continue
        low, high = BANDS[feed]
        if not low <= count <= high:
            alerts.append(f"{label} : {count} vols hier, hors bande {low}-{high}")
    return alerts


# --- acces base et notification (hors du perimetre teste) --------------------

LAST_OK_SQL = """
select airport, direction, max(ran_at) from flux_collector_runs
where collector = 'flight_arrivals' and ok and rows_seen > 0
group by 1, 2;
"""

DAILY_SQL = """
select airport, direction, count(*) from flux_flight_arrivals
where service_date = %s group by 1, 2;
"""


PRUNE_SQL = "delete from flux_collector_runs where ran_at < now() - interval '30 days';"


def collect(conn, service_day):
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(LAST_OK_SQL)
        last_ok = {(a, d): t for a, d, t in cur.fetchall()}
        cur.execute(DAILY_SQL, (service_day,))
        daily = {(a, d): n for a, d, n in cur.fetchall()}
        cur.execute(PRUNE_SQL)  # ~580 runs/jour, on garde 30 jours
    return last_ok, daily


def notify(alerts, service_day):
    from dotenv import load_dotenv
    load_dotenv("/opt/cretepulse/.env")  # TG_TOKEN_CHIEF / TG_CHAT_ID
    sys.path.insert(0, "/opt/kairos-telegram")
    from kairos_telegram import Bot, Priority, send
    body = (f"Journee de service controlee : {service_day:%d/%m}\n\n"
            + "\n".join(f"- {a}" for a in alerts)
            + "\n\nCockpit : https://crete.direct/admin/flux")
    return send(Bot.CHIEF, "Capteurs vols crete.direct", body,
                priority=Priority.WARNING, msg_type="system")


def main():
    from db import connect
    service_day = date.today() - timedelta(days=1)
    conn = connect()
    try:
        last_ok, daily = collect(conn, service_day)
    finally:
        conn.close()
    alerts = evaluate(last_ok, daily, datetime.now(timezone.utc))
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    if not alerts:
        print(f"{stamp} [flux_watchdog] 4 capteurs frais, comptes du {service_day} plausibles")
        return 0
    for alert in alerts:
        print(f"{stamp} [flux_watchdog] ALERTE {alert}")
    if os.environ.get("FLUX_WATCHDOG_DRY_RUN") != "1":
        notify(alerts, service_day)
    return 1


if __name__ == "__main__":
    sys.exit(main())
