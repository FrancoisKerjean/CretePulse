"""Sonde de collecte : detecter le prochain trou sans qu'un humain le voie.

Le capteur HER n'a rien ecrit du 22 au 27/07/2026 pendant que le cron tournait
144 fois par jour. Rien ne l'a signale : log sans horodatage, aucun journal de
run, code de sortie avale par cron.
"""
from datetime import datetime, timedelta, timezone

from flux.watchdog import evaluate

NOW = datetime(2026, 7, 29, 12, 0, tzinfo=timezone.utc)
FLIGHTS = "flight_arrivals"
FRESH = {k: NOW - timedelta(minutes=8) for k in
         ((FLIGHTS, "HER", "arrival"), (FLIGHTS, "HER", "departure"),
          (FLIGHTS, "CHQ", "arrival"), (FLIGHTS, "CHQ", "departure"))}
SANE = {(FLIGHTS, "HER", "arrival"): 167, (FLIGHTS, "HER", "departure"): 163,
        (FLIGHTS, "CHQ", "arrival"): 66, (FLIGHTS, "CHQ", "departure"): 65}

FERRIES = "ferry_crossings"
# Releve reel GTP du 30/07/2026 : Heraklion 9 mouvements, Souda 2, Sitia 2.
FRESH.update({(FERRIES, port, direction): NOW - timedelta(hours=6)
              for port in ("HER", "SOU", "SIT")
              for direction in ("arrival", "departure")})
SANE.update({(FERRIES, port, direction): count
             for port, count in (("HER", 5), ("SOU", 1), ("SIT", 1))
             for direction in ("arrival", "departure")})


def test_tout_va_bien_aucune_alerte():
    assert evaluate(FRESH, SANE, NOW) == []


def test_capteur_muet_declenche_une_alerte():
    stale = {**FRESH, (FLIGHTS, "HER", "arrival"): NOW - timedelta(hours=5)}
    alerts = evaluate(stale, SANE, NOW)
    assert len(alerts) == 1
    assert "HER arrival" in alerts[0]
    assert "5" in alerts[0]  # l'anciennete est dans le message


def test_capteur_jamais_vu_declenche_une_alerte():
    never = {**FRESH, (FLIGHTS, "HER", "arrival"): None}
    alerts = evaluate(never, SANE, NOW)
    assert len(alerts) == 1
    assert "HER arrival" in alerts[0]


def test_retard_court_tolere():
    # Le cron tourne toutes les 10 min : 25 min de retard = un aleas reseau.
    ok = {**FRESH, (FLIGHTS, "CHQ", "arrival"): NOW - timedelta(minutes=25)}
    assert evaluate(ok, SANE, NOW) == []


def test_compte_journalier_gonfle_declenche_une_alerte():
    # 776 arrivees HER le 16/07 : la signature du bug de doublons.
    inflated = {**SANE, (FLIGHTS, "HER", "arrival"): 776}
    alerts = evaluate(FRESH, inflated, NOW)
    assert len(alerts) == 1
    assert "776" in alerts[0]


def test_compte_journalier_effondre_declenche_une_alerte():
    collapsed = {**SANE, (FLIGHTS, "HER", "departure"): 20}
    alerts = evaluate(FRESH, collapsed, NOW)
    assert len(alerts) == 1
    assert "20" in alerts[0]


def test_journee_absente_declenche_une_alerte():
    # Le cas du trou 19->26/07 : la journee de service n'existe simplement pas.
    missing = {k: v for k, v in SANE.items() if k != (FLIGHTS, "HER", "arrival")}
    alerts = evaluate(FRESH, missing, NOW)
    assert len(alerts) == 1
    assert "HER arrival" in alerts[0]


def test_le_port_et_l_aeroport_d_heraklion_sont_deux_capteurs_distincts():
    # HER designe un aeroport ET un port. Sans le collecteur dans la cle, la
    # fraicheur des ferries masquerait un capteur vols muet, et inversement.
    counts = {**SANE, (FLIGHTS, "HER", "arrival"): 776}
    alerts = evaluate(FRESH, counts, NOW)
    assert len(alerts) == 1
    assert "776" in alerts[0]


def test_capteur_ferries_muet_declenche_une_alerte():
    # Le cron ferries est quotidien : une journee sautee est une panne.
    stale = {**FRESH, (FERRIES, "HER", "arrival"): NOW - timedelta(hours=40)}
    alerts = evaluate(stale, SANE, NOW)
    assert len(alerts) == 1
    assert "HER arrival" in alerts[0]


def test_capteur_ferries_frais_a_vingt_heures_ne_declenche_rien():
    # A la difference des vols, un ferry collecte une fois par jour : 20 h sans
    # nouvelle passe est normal, pas une panne.
    recent = {**FRESH, (FERRIES, "SOU", "arrival"): NOW - timedelta(hours=20)}
    assert evaluate(recent, SANE, NOW) == []


def test_comptage_ferries_effondre_declenche_une_alerte():
    # Zero traversee a Heraklion en plein aout : GTP a change de forme ou le
    # parseur ne matche plus. C'est exactement le trou qu'on veut voir.
    collapsed = {**SANE, (FERRIES, "HER", "arrival"): 0}
    alerts = evaluate(FRESH, collapsed, NOW)
    assert len(alerts) == 1
    assert "traversees" in alerts[0]


def test_comptage_ferries_gonfle_declenche_une_alerte():
    # 60 traversees a Heraklion : la signature du regroupement d'escales qui
    # aurait lache (un navire compte une fois par port desservi).
    inflated = {**SANE, (FERRIES, "HER", "departure"): 60}
    alerts = evaluate(FRESH, inflated, NOW)
    assert len(alerts) == 1
    assert "60" in alerts[0]


def test_plusieurs_pannes_plusieurs_alertes():
    stale = {**FRESH, (FLIGHTS, "HER", "arrival"): None, (FLIGHTS, "HER", "departure"): None}
    assert len(evaluate(stale, SANE, NOW)) == 2
