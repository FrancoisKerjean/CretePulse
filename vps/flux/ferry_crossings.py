#!/usr/bin/env python3
"""Comptage des traversees ferries aux ports cretois (source GTP).

Recon du 29/07/2026, voies testees :
  - aisstream.io (AIS temps reel) : creation de compte requise -> owner Kami
  - openseas.gr : port 443 refuse, SPA accessible en HTTP seulement -> ecarte
  - ferries.gtp.gr/Services (JSON) : la cle publique "Demo" ne rend qu'un
    sous-ensemble (2 arrivees/jour a Heraklion, navire "VESSEL TBA") -> ecarte
  - www.gtp.gr/RoutesForm.asp : toutes les compagnies, du 28/07/2026 au
    28/06/2028, sans compte -> RETENU

Une interrogation GTP porte sur UN couple origine-destination : le script
enumere les destinations desservies par chaque port (page de desambiguisation,
elle se met a jour seule quand une ligne ouvre ou ferme), interroge chaque
couple dans les deux sens, puis regroupe les escales d'un meme navire
(cf dedupe_ferry_movements) avant d'ecrire.

Chaque run est journalise dans flux_collector_runs : le capteur vols a rate
cinq jours pendant que son cron tournait 144 fois par jour, faute de journal.

Usage :
  ferry_crossings.py                      # aujourd'hui et demain (heure d'Athenes)
  ferry_crossings.py --days 30            # balayage, pour remplir le trimestre
  ferry_crossings.py --day 2026-08-15 --dry-run
"""
import argparse
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

import requests

try:  # execution directe VPS et import package dans pytest
    from .db import connect
    from .parsers import (FERRY_SLOT_WINDOW_MIN, GtpRateLimited, athens_day,
                          dedupe_ferry_movements, ferry_movements, parse_gtp_destinations,
                          parse_gtp_schedules, pick_slot, raise_if_gtp_refused)
except ImportError:
    from db import connect
    from parsers import (FERRY_SLOT_WINDOW_MIN, GtpRateLimited, athens_day,
                         dedupe_ferry_movements, ferry_movements, parse_gtp_destinations,
                         parse_gtp_schedules, pick_slot, raise_if_gtp_refused)

BASE = "https://www.gtp.gr/RoutesForm.asp"
UA = "crete.direct flux research/1.0 (ferry schedule counter; contact@crete.direct)"
# GTP plafonne les requetes et le fait savoir par une page 200 sans horaires.
# A 2 req/s avec 4 lecteurs, il a commence a refuser au bout de quelques
# centaines de requetes : Heraklion s'est retrouve ecrit a 4 traversees le
# 31/07/2026 au lieu de 11. Une requete par seconde, deux lecteurs, et le refus
# est desormais une erreur bruyante, jamais une journee vide.
WORKERS = 2
MIN_INTERVAL_S = 1.0
ATTEMPTS = 4
REFUSAL_BACKOFF_S = (30, 60, 120, 240)
LOCK_PATH = "/tmp/ferry_crossings.lock"

# Les trois ports cretois pour lesquels ELSTAT publie des passagers
# (flux_port_quarterly) : sans chiffre officiel, pas de calibration possible,
# donc pas de comptage exploitable. gtp_port_id = PortPage.asp?id=
PORTS = {
    "HER": {"gtp_code": "HER", "gtp_port_id": "1417", "elstat": "heraklion"},
    "SOU": {"gtp_code": "SOU", "gtp_port_id": "691", "elstat": "souda"},
    "SIT": {"gtp_code": "SIT", "gtp_port_id": "1703", "elstat": "sitia"},
}


class Throttle:
    """Plafond global de requetes, partage par tous les lecteurs."""

    def __init__(self, min_interval_s=MIN_INTERVAL_S):
        self.min_interval_s = min_interval_s
        self._lock = threading.Lock()
        self._next_at = 0.0

    def wait(self):
        with self._lock:
            now = time.monotonic()
            delay = max(0.0, self._next_at - now)
            self._next_at = max(now, self._next_at) + self.min_interval_s
        if delay:
            time.sleep(delay)


def _get(session, params, throttle):
    """GET avec reprises : une coupure reseau ne doit pas passer pour "0 traversee"."""
    last = None
    for attempt in range(ATTEMPTS):
        throttle.wait()
        try:
            response = session.get(BASE, params=params, timeout=45)
            response.raise_for_status()
            raise_if_gtp_refused(response.text)
            return response.text
        except GtpRateLimited as exc:
            # Refus de service : on attend vraiment, sinon on s'entete a plein
            # regime et toutes les requetes suivantes reviennent vides.
            last = exc
            time.sleep(REFUSAL_BACKOFF_S[min(attempt, len(REFUSAL_BACKOFF_S) - 1)])
        except requests.RequestException as exc:
            last = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"GTP injoignable ({params.get('OCode')}->{params.get('DCode')}) : {last}")


def _params(origin, destination, day):
    return {"SchDay": day.day, "SchMonth": day.month, "SchYear": day.year,
            "CompanyID": "0,2", "SortType": "1,2", "AroundDate": 0,
            "OCode": origin, "OName": "", "DCode": destination, "DName": ""}


def destinations(session, gtp_code, day, throttle):
    """Ports relies a celui-ci, d'apres la page de desambiguisation de GTP."""
    html = _get(session, _params(gtp_code, "", day), throttle)
    return [d["code"] for d in parse_gtp_destinations(html)]


def collect_port(session, port_code, day, throttle, cache=None):
    """Tous les mouvements a quai d'un port cretois pour une journee de service.

    GTP elargit parfois l'origine a la zone (« Initial location expanded to
    greater area ») et renvoie des traversees d'un autre port cretois. Le filtre
    porte donc sur gtp_port_id, jamais sur le code interroge.
    """
    port = PORTS[port_code]
    # La liste des liaisons ne change pas d'un jour a l'autre : une seule
    # interrogation par balayage suffit, au lieu d'une par journee.
    if cache is None or port_code not in cache:
        served = destinations(session, port["gtp_code"], day, throttle)
        if cache is not None:
            cache[port_code] = served
    else:
        served = cache[port_code]
    pairs = [(origin, target)
             for destination in served
             for origin, target in ((port["gtp_code"], destination),
                                    (destination, port["gtp_code"]))]

    def fetch(pair):
        schedules = parse_gtp_schedules(_get(session, _params(*pair, day), throttle))
        return ferry_movements(schedules, port["gtp_port_id"], day)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        movements = [m for batch in pool.map(fetch, pairs) for m in batch]
    # GTP filtre sur la date de DEPART de la traversee. Le ferry qui accoste a
    # Heraklion a 06:15 le 30 a quitte le Piree le 29 : il sort donc de la
    # requete du 29, pas de celle du 30. On garde tous les mouvements produits,
    # quelle que soit leur date, et le balayage part de la veille pour que les
    # arrivees de nuit d'aujourd'hui soient couvertes. Filtrer sur le jour
    # demande vidait les arrivees de moitie (3 arrivees pour 6 departs a
    # Heraklion le 30/07/2026, constate en dry-run avant deploiement).
    return dedupe_ferry_movements(movements)


SELECT_SLOTS = """
select id, sched_slot from flux_ferry_crossings
where port_code = %s and direction = %s and service_date = %s and company_code = %s;
"""

INSERT = """
insert into flux_ferry_crossings
  (port_code, gtp_port_id, direction, service_date, sched_slot, sched_time,
   company_code, company_name, ship_type, counterpart_port_id,
   counterpart_port_name, route_id, sched_id, legs_seen)
values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
"""

UPDATE = """
update flux_ferry_crossings set
  sched_time = %s, company_name = %s, ship_type = %s,
  counterpart_port_id = %s, counterpart_port_name = %s,
  route_id = %s, sched_id = %s, legs_seen = %s,
  seen_count = seen_count + 1, last_seen_at = now()
where id = %s;
"""

# service_date = la journee INTERROGEE, pas celle du run : un balayage couvre
# 90 journees en une seule passe.
RUN_LOG = """
insert into flux_collector_runs
  (collector, airport, direction, service_date, ok, rows_seen, inserted, updated, error)
values ('ferry_crossings', %s, %s, %s, %s, %s, %s, %s, %s);
"""


def persist(conn, port_code, movements):
    inserted = updated = 0
    with conn.cursor() as cur:
        for movement in movements:
            company = movement["company_code"] or "??"
            cur.execute(SELECT_SLOTS, (port_code, movement["direction"],
                                       movement["service_date"], company))
            slot_id = pick_slot(cur.fetchall(), movement["sched_slot"], FERRY_SLOT_WINDOW_MIN)
            payload = (movement["sched_slot"], movement["company_name"], movement["ship_type"],
                       movement["counterpart_port_id"], movement["counterpart_port_name"],
                       movement["route_id"], movement["sched_id"], movement["legs_seen"])
            if slot_id is None:
                cur.execute(INSERT, (port_code, PORTS[port_code]["gtp_port_id"],
                                     movement["direction"], movement["service_date"],
                                     movement["sched_slot"], movement["sched_slot"], company,
                                     *payload[1:]))
                inserted += 1
            else:
                cur.execute(UPDATE, (*payload, slot_id))
                updated += 1
    return inserted, updated


def run(days, start=None, dry_run=False):
    session = requests.Session()
    session.headers["User-Agent"] = UA
    session.mount("https://", requests.adapters.HTTPAdapter(pool_maxsize=WORKERS))
    throttle = Throttle()
    # On part de la VEILLE : les arrivees de nuit du jour courant sont publiees
    # sous la date de depart de la traversee, donc dans la requete d'hier.
    first = start or athens_day(datetime.now(timezone.utc)) - timedelta(days=1)
    conn = None if dry_run else connect()
    if conn:
        conn.autocommit = True
    totals = {"seen": 0, "inserted": 0, "updated": 0}
    served = {}
    try:
        for port_code in PORTS:
            for offset in range(days):
                day = first + timedelta(days=offset)
                stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
                try:
                    movements = collect_port(session, port_code, day, throttle, served)
                except Exception as exc:                     # noqa: BLE001 - journalise puis relance
                    if conn:
                        with conn.cursor() as cur:
                            cur.execute(RUN_LOG, (port_code, None, day, False, 0, 0, 0, str(exc)[:500]))
                    print(f"{stamp} [ferry_crossings] ERREUR {port_code} {day} : {exc}",
                          file=sys.stderr)
                    raise
                inserted = updated = 0
                if conn:
                    inserted, updated = persist(conn, port_code, movements)
                    for direction in ("arrival", "departure"):
                        seen = sum(1 for m in movements if m["direction"] == direction)
                        with conn.cursor() as cur:
                            cur.execute(RUN_LOG, (port_code, direction, day, True, seen, 0, 0, None))
                totals["seen"] += len(movements)
                totals["inserted"] += inserted
                totals["updated"] += updated
                print(f"{stamp} [ferry_crossings] {port_code} {day} : {len(movements)} traversees "
                      f"({inserted} creees, {updated} mises a jour)")
                if dry_run:
                    for m in sorted(movements, key=lambda m: (m["direction"], m["sched_slot"])):
                        print(f"    {m['direction']:9} {m['sched_slot']} {m['company_code']:3} "
                              f"{m['company_name'] or '':28} {m['counterpart_port_name'] or '':16} "
                              f"escales={m['legs_seen']}")
    finally:
        if conn:
            conn.close()
    print(f"ferry_crossings: {totals['seen']} traversees, "
          f"{totals['inserted']} creees, {totals['updated']} mises a jour")
    return totals


def _single_run_lock():
    """Empeche deux collectes simultanees.

    Le balayage hebdomadaire dure ~40 min et peut chevaucher la passe
    quotidienne. Deux processus qui ne trouvent pas de creneau existant
    inserent la meme traversee et la contrainte unique fait tomber l'un des
    deux : on prefere qu'une passe se retire proprement.
    """
    import fcntl
    handle = open(LOCK_PATH, "w")
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        handle.close()
        return None
    handle.write(f"{os.getpid()}\n")
    handle.flush()
    return handle


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=3, help="nombre de journees a partir du depart")
    parser.add_argument("--day", help="journee de depart YYYY-MM-DD (defaut : hier a Athenes)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    lock = None if args.dry_run else _single_run_lock()
    if not args.dry_run and lock is None:
        print("ferry_crossings: une collecte tourne deja, passe abandonnee")
        sys.exit(0)
    try:
        run(args.days,
            start=date.fromisoformat(args.day) if args.day else None,
            dry_run=args.dry_run)
    except Exception as exc:
        print(f"ferry_crossings ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        if lock is not None:
            lock.close()
