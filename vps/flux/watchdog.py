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

# Un capteur = (collecteur, noeud, sens). Le collecteur fait partie de la cle
# parce que HER designe a la fois un aeroport et un port : sans lui, la sonde
# des ferries masquerait celle des vols.
#
# Bandes vols calees sur les journees propres observees (HER ~150-190 vols/jour,
# CHQ ~65-93), elargies pour ne se declencher que sur une vraie panne.
# Bandes ferries calees sur le releve GTP du 30/07/2026 (cf CALIBRATION du
# capteur) et volontairement larges : l'offre maritime s'effondre hors saison.
FEEDS = (
    {"collector": "flight_arrivals", "node": "HER", "direction": "arrival",
     "band": (100, 260), "stale_after_min": 45, "unit": "vols"},
    {"collector": "flight_arrivals", "node": "HER", "direction": "departure",
     "band": (100, 260), "stale_after_min": 45, "unit": "vols"},
    {"collector": "flight_arrivals", "node": "CHQ", "direction": "arrival",
     "band": (40, 140), "stale_after_min": 45, "unit": "vols"},
    {"collector": "flight_arrivals", "node": "CHQ", "direction": "departure",
     "band": (40, 140), "stale_after_min": 45, "unit": "vols"},
    # Ferries : cron 2 fois par jour, donc 26 h de silence = une journee sautee.
    # Bande haute a 25 pour Heraklion : au-dela, c'est le regroupement d'escales
    # qui a lache et un navire est compte une fois par port desservi.
    # Bande basse a 0 pour Souda et Sitia : leurs lignes ne partent pas tous les
    # jours, une journee vide y est normale et n'est pas une panne.
    {"collector": "ferry_crossings", "node": "HER", "direction": "arrival",
     "band": (1, 25), "stale_after_min": 1560, "unit": "traversees"},
    {"collector": "ferry_crossings", "node": "HER", "direction": "departure",
     "band": (1, 25), "stale_after_min": 1560, "unit": "traversees"},
    {"collector": "ferry_crossings", "node": "SOU", "direction": "arrival",
     "band": (0, 10), "stale_after_min": 1560, "unit": "traversees"},
    {"collector": "ferry_crossings", "node": "SOU", "direction": "departure",
     "band": (0, 10), "stale_after_min": 1560, "unit": "traversees"},
    {"collector": "ferry_crossings", "node": "SIT", "direction": "arrival",
     "band": (0, 10), "stale_after_min": 1560, "unit": "traversees"},
    {"collector": "ferry_crossings", "node": "SIT", "direction": "departure",
     "band": (0, 10), "stale_after_min": 1560, "unit": "traversees"},
)


def _key(feed):
    return (feed["collector"], feed["node"], feed["direction"])


def evaluate(last_ok, daily, now, stale_after_min=None):
    """-> liste de messages d'alerte. Liste vide = tout va bien.

    last_ok : {(collecteur, noeud, sens): datetime du dernier run reussi ou None}
    daily   : {(collecteur, noeud, sens): mouvements de la derniere journee pleine}
    """
    alerts = []
    for feed in FEEDS:
        key = _key(feed)
        label = f"{feed['node']} {feed['direction']}"
        limit = stale_after_min if stale_after_min is not None else feed["stale_after_min"]
        seen_at = last_ok.get(key)
        if seen_at is None:
            alerts.append(f"{label} : aucun run reussi enregistre")
            continue
        age_min = int((now - seen_at).total_seconds() // 60)
        if age_min > limit:
            hours, minutes = divmod(age_min, 60)
            alerts.append(f"{label} : muet depuis {hours} h {minutes:02d}")
            continue
        count = daily.get(key)
        if count is None:
            alerts.append(f"{label} : aucune ligne pour la derniere journee pleine")
            continue
        low, high = feed["band"]
        if not low <= count <= high:
            alerts.append(f"{label} : {count} {feed['unit']} hier, hors bande {low}-{high}")
    return alerts


# --- acces base et notification (hors du perimetre teste) --------------------

LAST_OK_SQL = """
select collector, airport, direction, max(ran_at) from flux_collector_runs
where collector in ('flight_arrivals', 'ferry_crossings') and ok and direction is not null
  and (collector <> 'flight_arrivals' or rows_seen > 0)
group by 1, 2, 3;
"""

DAILY_FLIGHTS_SQL = """
select airport, direction, count(*) from flux_flight_arrivals
where service_date = %s group by 1, 2;
"""

# Zero traversee est un resultat legitime a Souda et Sitia : le port doit
# apparaitre a zero, pas disparaitre, sinon la sonde crie "journee absente".
DAILY_FERRIES_SQL = """
select p.port_code, p.direction, count(c.id)
from (select port_code, direction
      from unnest(array['HER', 'SOU', 'SIT']) as port_code
      cross join unnest(array['arrival', 'departure']) as direction) p
left join flux_ferry_crossings c
  on c.port_code = p.port_code and c.direction = p.direction and c.service_date = %s
group by 1, 2;
"""

PRUNE_SQL = "delete from flux_collector_runs where ran_at < now() - interval '30 days';"


def collect(conn, service_day):
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(LAST_OK_SQL)
        last_ok = {(c, a, d): t for c, a, d, t in cur.fetchall()}
        cur.execute(DAILY_FLIGHTS_SQL, (service_day,))
        daily = {("flight_arrivals", a, d): n for a, d, n in cur.fetchall()}
        cur.execute(DAILY_FERRIES_SQL, (service_day,))
        daily.update({("ferry_crossings", p, d): n for p, d, n in cur.fetchall()})
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
        print(f"{stamp} [flux_watchdog] {len(FEEDS)} capteurs frais, "
              f"comptes du {service_day} plausibles")
        return 0
    for alert in alerts:
        print(f"{stamp} [flux_watchdog] ALERTE {alert}")
    if os.environ.get("FLUX_WATCHDOG_DRY_RUN") != "1":
        notify(alerts, service_day)
    return 1


if __name__ == "__main__":
    sys.exit(main())
