"""Sonde de collecte : detecter le prochain trou sans qu'un humain le voie.

Le capteur HER n'a rien ecrit du 22 au 27/07/2026 pendant que le cron tournait
144 fois par jour. Rien ne l'a signale : log sans horodatage, aucun journal de
run, code de sortie avale par cron.
"""
from datetime import datetime, timedelta, timezone

from flux.watchdog import evaluate

NOW = datetime(2026, 7, 29, 12, 0, tzinfo=timezone.utc)
FRESH = {k: NOW - timedelta(minutes=8) for k in
         (("HER", "arrival"), ("HER", "departure"),
          ("CHQ", "arrival"), ("CHQ", "departure"))}
SANE = {("HER", "arrival"): 167, ("HER", "departure"): 163,
        ("CHQ", "arrival"): 66, ("CHQ", "departure"): 65}


def test_tout_va_bien_aucune_alerte():
    assert evaluate(FRESH, SANE, NOW) == []


def test_capteur_muet_declenche_une_alerte():
    stale = {**FRESH, ("HER", "arrival"): NOW - timedelta(hours=5)}
    alerts = evaluate(stale, SANE, NOW)
    assert len(alerts) == 1
    assert "HER arrival" in alerts[0]
    assert "5" in alerts[0]  # l'anciennete est dans le message


def test_capteur_jamais_vu_declenche_une_alerte():
    never = {**FRESH, ("HER", "arrival"): None}
    alerts = evaluate(never, SANE, NOW)
    assert len(alerts) == 1
    assert "HER arrival" in alerts[0]


def test_retard_court_tolere():
    # Le cron tourne toutes les 10 min : 25 min de retard = un aleas reseau.
    ok = {**FRESH, ("CHQ", "arrival"): NOW - timedelta(minutes=25)}
    assert evaluate(ok, SANE, NOW) == []


def test_compte_journalier_gonfle_declenche_une_alerte():
    # 776 arrivees HER le 16/07 : la signature du bug de doublons.
    inflated = {**SANE, ("HER", "arrival"): 776}
    alerts = evaluate(FRESH, inflated, NOW)
    assert len(alerts) == 1
    assert "776" in alerts[0]


def test_compte_journalier_effondre_declenche_une_alerte():
    collapsed = {**SANE, ("HER", "departure"): 20}
    alerts = evaluate(FRESH, collapsed, NOW)
    assert len(alerts) == 1
    assert "20" in alerts[0]


def test_journee_absente_declenche_une_alerte():
    # Le cas du trou 19->26/07 : la journee de service n'existe simplement pas.
    missing = {k: v for k, v in SANE.items() if k != ("HER", "arrival")}
    alerts = evaluate(FRESH, missing, NOW)
    assert len(alerts) == 1
    assert "HER arrival" in alerts[0]


def test_plusieurs_pannes_plusieurs_alertes():
    stale = {**FRESH, ("HER", "arrival"): None, ("HER", "departure"): None}
    assert len(evaluate(stale, SANE, NOW)) == 2
