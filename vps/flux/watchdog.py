#!/usr/bin/env python3
"""Sonde des capteurs de flux : alerte Telegram des qu'une collecte decroche.

Le capteur HER n'a rien ecrit du 22 au 27/07/2026 alors que le cron tournait
144 fois par jour. Personne ne l'a vu : log sans horodatage, aucun journal de
run, code de sortie avale par cron. Cette sonde ferme ce trou.

Deux controles, sur la derniere journee de service COMPLETE :
  - fraicheur : un run reussi dans les 45 dernieres minutes (cron toutes les 10)
  - plausibilite : le compte du jour reste dans une bande realiste

Le message porte la NATURE du capteur et la CAUSE de la panne. Le 02/08/2026,
six capteurs de port muets ont ete annonces « HER arrival, SOU arrival... »
sous le titre « Capteurs vols », 96 fois de suite, sans jamais dire que GTP
avait cesse de repondre alors que l'erreur etait ecrite en base a chaque run.
La cle distingue le port de l'aeroport depuis le premier jour ; le libelle,
non. Meme lecon que le piege 7 du capteur ferries : une garde posee cote
calcul ne se propage pas toute seule cote affichage.

Cron : 20 * * * * (toutes les heures).
"""
import os
import sys
from datetime import date, datetime, timedelta, timezone

STALE_AFTER_MIN = 45
CAUSE_MAX_CHARS = 110

# HER designe un aeroport ET un port : le libelle doit dire lequel.
NATURES = {"flight_arrivals": "aéroport", "ferry_crossings": "port"}
SENS = {"arrival": "arrivées", "departure": "départs"}

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
    # ⛔ Les 6 capteurs ferries (HER/SOU/SIT x arrivée/départ) ont ete RETIRES le
    # 16/08/2026 : voir CAPTEUR FERRIES ABANDONNE plus bas. On ne surveille pas
    # ce qu on a decide de ne plus collecter.
)


# --- CAPTEUR FERRIES ABANDONNE le 16/08/2026 (arbitrage Francois) ------------
#
# La sourdine bornee posee le 03/08 expirait le 16/08 : c etait une promesse de
# reprise, pas une suppression, et les 6 alertes sont bien revenues seules ce
# jour-la. Le mecanisme a fait son travail, l arbitrage est tombe : abandon.
#
# Ce qui a porte la decision, mesure le 16/08 :
#   - GTP a LU le mail du 02/08 21:00 (statut Resend `ok lu`) et n a pas repondu
#     en 13 jours. Un mail ouvert puis ignore apres un ban delibere est une
#     reponse, pas un silence administratif.
#   - Le DROP sur l IPv4 du VPS tient a 17 jours : www.gtp.gr rend un timeout de
#     20 s depuis 89.167.115.63, avec ET sans UA navigateur, et 200 en 0,62 s
#     depuis Brest a la meme minute. La cause est hors de notre code.
#   - Les ferries pesent 14,0 % des arrivees (ELSTAT T3 2025 : 570 235
#     debarquements HER+SOU+SIT contre 3 487 622 arrivees aeriennes HER+CHQ).
#     L estimateur reste aerien et complet, il l a toujours ete.
#
# ⛔ Pas de sourdine cette fois : une sourdine est une promesse de reprise, et
# il n y en a plus. Une sonde qui crie pour une panne qu on ne repare pas est
# exactement le bruit que ce fichier existe pour eviter.
#
# ⛔ CE QUI N EST PAS SUPPRIME : la table `flux_ferry_crossings` et ses 168
# traversees du 29/07 restent en base. Elles sont figees, pas fausses, et
# effacer une mesure coute plus cher que de la garder.
#
# La mecanique de sourdine, elle, RESTE : elle resservira au prochain capteur en
# panne durable. Un test la tient.
MUTED_UNTIL = {}


def _key(feed):
    return (feed["collector"], feed["node"], feed["direction"])


def _label(feed):
    return (f"{feed['node']} ({NATURES[feed['collector']]}) "
            f"{SENS[feed['direction']]}")


def _is_muted(muted_until, key, now):
    until = (muted_until or {}).get(key)
    return until is not None and now.date() < until


def muted_feeds(muted_until, now):
    """-> lignes de journal pour les capteurs tus, avec leur date de reprise.

    Une sourdine invisible est un trou. Le run doit dire ce qu'il tait et
    jusqu'a quand, meme quand il n'envoie rien.
    """
    return [f"{_label(feed)} : en sourdine jusqu'au "
            f"{muted_until[_key(feed)]:%d/%m}"
            for feed in FEEDS if _is_muted(muted_until, _key(feed), now)]


def _cause(last_error, key, seen_at):
    """Suffixe ' — <cause>' si une erreur POSTERIEURE au dernier succes existe.

    Une erreur anterieure au dernier run reussi est deja reparee : l'afficher
    ferait accuser la mauvaise cause.
    """
    entry = (last_error or {}).get(key)
    if not entry:
        return ""
    failed_at, message = entry
    if not message or (seen_at is not None and failed_at <= seen_at):
        return ""
    text = " ".join(message.split())
    if len(text) > CAUSE_MAX_CHARS:
        text = text[:CAUSE_MAX_CHARS - 1] + "…"
    return f" — {text}"


def evaluate(last_ok, daily, now, last_error=None, muted_until=None,
             stale_after_min=None):
    """-> liste de messages d'alerte. Liste vide = tout va bien.

    last_ok     : {(collecteur, noeud, sens): datetime du dernier run reussi ou None}
    daily       : {(collecteur, noeud, sens): mouvements de la derniere journee pleine}
    last_error  : {(collecteur, noeud, sens): (datetime du dernier echec, message)}
    muted_until : {(collecteur, noeud, sens): date de reprise des alertes}
    """
    alerts = []
    for feed in FEEDS:
        key = _key(feed)
        if _is_muted(muted_until, key, now):
            continue
        label = _label(feed)
        limit = stale_after_min if stale_after_min is not None else feed["stale_after_min"]
        seen_at = last_ok.get(key)
        if seen_at is None:
            alerts.append(f"{label} : aucun run réussi enregistré"
                          + _cause(last_error, key, None))
            continue
        age_min = int((now - seen_at).total_seconds() // 60)
        if age_min > limit:
            hours, minutes = divmod(age_min, 60)
            alerts.append(f"{label} : muet depuis {hours} h {minutes:02d}"
                          + _cause(last_error, key, seen_at))
            continue
        count = daily.get(key)
        if count is None:
            alerts.append(f"{label} : aucune ligne pour la dernière journée pleine")
            continue
        low, high = feed["band"]
        if not low <= count <= high:
            alerts.append(f"{label} : {count} {feed['unit']} hier, hors bande {low}-{high}")
    return alerts


def merge_errors(rows):
    """(collecteur, noeud, sens|None, quand, message) -> {cle capteur: (quand, message)}.

    Le collecteur ferries echoue AVANT de savoir de quel sens il s'agit (GTP
    injoignable vaut pour le port entier) et journalise direction = NULL. Une
    erreur de noeud se propage donc a ses deux sens, mais ne recouvre jamais
    une erreur enregistree sur un sens precis.
    """
    node_level, exact = {}, {}
    for collector, node, direction, failed_at, message in rows:
        target = exact if direction else node_level
        key = (collector, node, direction) if direction else (collector, node)
        if key not in target or failed_at > target[key][0]:
            target[key] = (failed_at, message)
    merged = {}
    for (collector, node), value in node_level.items():
        for direction in SENS:
            merged[(collector, node, direction)] = value
    merged.update(exact)
    return merged


# --- acces base et notification (hors du perimetre teste) --------------------

LAST_ERROR_SQL = """
select collector, airport, direction, ran_at, error from flux_collector_runs
where not ok and error is not null
  and collector in ('flight_arrivals', 'ferry_crossings')
  and ran_at > now() - interval '30 days'
order by ran_at;
"""

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
        cur.execute(LAST_ERROR_SQL)
        last_error = merge_errors(cur.fetchall())
        cur.execute(PRUNE_SQL)  # ~580 runs/jour, on garde 30 jours
    return last_ok, daily, last_error


def notify(alerts, service_day):
    from dotenv import load_dotenv
    load_dotenv("/opt/cretepulse/.env")  # TG_TOKEN_CHIEF / TG_CHAT_ID
    sys.path.insert(0, "/opt/kairos-telegram")
    from kairos_telegram import Bot, Priority, send
    body = (f"Journée de service contrôlée : {service_day:%d/%m}\n\n"
            + "\n".join(f"- {a}" for a in alerts)
            + "\n\nCockpit : https://crete.direct/admin/flux")
    return send(Bot.CHIEF, "Capteurs flux crete.direct", body,
                priority=Priority.WARNING, msg_type="system")


def main():
    from db import connect
    service_day = date.today() - timedelta(days=1)
    conn = connect()
    try:
        last_ok, daily, last_error = collect(conn, service_day)
    finally:
        conn.close()
    now = datetime.now(timezone.utc)
    alerts = evaluate(last_ok, daily, now, last_error=last_error,
                      muted_until=MUTED_UNTIL)
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for ligne in muted_feeds(MUTED_UNTIL, now):
        print(f"{stamp} [flux_watchdog] SOURDINE {ligne}")
    if not alerts:
        watched = len(FEEDS) - len(muted_feeds(MUTED_UNTIL, now))
        print(f"{stamp} [flux_watchdog] {watched} capteurs frais, "
              f"comptes du {service_day} plausibles")
        return 0
    for alert in alerts:
        print(f"{stamp} [flux_watchdog] ALERTE {alert}")
    if os.environ.get("FLUX_WATCHDOG_DRY_RUN") != "1":
        notify(alerts, service_day)
    return 1


if __name__ == "__main__":
    sys.exit(main())
