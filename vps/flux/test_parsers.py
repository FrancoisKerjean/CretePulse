#!/usr/bin/env python3
"""Tests de l'ancrage de journee du capteur vols (parsers.assign_service_dates).

Cette fonction a rate DEUX fois, dans les deux sens opposes :
  - 29/07/2026 : elle datait tout le tableau depuis l'entete "Last Update", donc du jour
    courant d'Athenes, y compris les lignes de la veille -- journee fantome chaque nuit.
  - 29/08/2026 : corrigee, elle reculait d'un jour des que le premier horaire depassait
    l'heure de capture de plus de 60 minutes. Une capture a 04:50, alors que HER n'a aucun
    vol avant 06:05 parce que l'aeroport dort, a suffi : 75 minutes d'ecart, tout le tableau
    recule, et les 106 vols du 29 ont ete dates du 28 EN PLUS des vrais vols du 28. Bilan
    avant correction : 10 journees d'arrivees et 18 de departs faussees depuis le 29/07,
    2 986 lignes en trop, une alerte de plausibilite a chaque fois.

  - 27/10/2026 : troisieme sens, le symetrique de la veille. A 23:03, plus aucun depart HER
    avant minuit (horaire d'hiver depuis le 25/10) : le tableau commencait a 00:25 LE
    LENDEMAIN. Rien ne prevoyait ce cas, et 54 departs du 28 ont ete dates du 27 -- ou ils
    se sont ajoutes aux vrais departs du 27 (126 au lieu de 70).

Aucun test n'existait. Ces cas figent la separation : un creux nocturne n'est ni une veille
ni un lendemain.

Lancer : .venv/bin/python3 test_parsers.py
"""

import sys
from datetime import date, datetime

from parsers import assign_service_dates

ANCRAGE = date(2026, 8, 29)


def dater(heure_capture, horaires):
    """Rend la liste des service_date attribues, dans l'ordre du tableau."""
    h, m = heure_capture.split(":")
    now = datetime(2026, 8, 29, int(h), int(m))
    rows = [{"sched_time": t} for t in horaires]
    return [r["service_date"] for r in assign_service_dates(rows, now)]


def cas_creux_nocturne_du_29_08():
    """LE bug : capture a 04:50, aucun vol avant 06:05. Ce n'est PAS la veille."""
    jours = dater("04:50", ["06:05", "07:35", "07:55", "08:00", "23:45"])
    return set(jours) == {ANCRAGE}


def cas_creux_nocturne_tot():
    """Meme forme, plus tot : capture a 03:00, premier vol a 05:00."""
    return set(dater("03:00", ["05:00", "09:00", "22:00"])) == {ANCRAGE}


def cas_vraie_veille_a_minuit_trente():
    """Le tableau demarre 1 a 2 h dans le passe : a 00:30, il commence vers 22:30 hier."""
    jours = dater("00:30", ["22:30", "23:10", "23:55"])
    return set(jours) == {date(2026, 8, 28)}


def cas_vraie_veille_a_une_heure():
    jours = dater("01:15", ["23:10", "23:40"])
    return set(jours) == {date(2026, 8, 28)}


def cas_journee_ordinaire():
    """Capture a 14:00, le tableau commence 2 h dans le passe."""
    return set(dater("14:00", ["12:00", "13:30", "18:00"])) == {ANCRAGE}


def cas_passage_de_minuit_dans_le_tableau():
    """Le tableau couvre ~25 h : il franchit minuit une fois, et une seule."""
    jours = dater("14:00", ["12:00", "18:00", "23:30", "00:20", "01:10"])
    return jours == [ANCRAGE, ANCRAGE, ANCRAGE,
                     date(2026, 8, 30), date(2026, 8, 30)]


def cas_veille_puis_passage_de_minuit():
    """Capture a 00:30 : le tableau commence hier soir et repasse minuit vers le jour J."""
    jours = dater("00:30", ["22:30", "23:40", "00:15", "06:00"])
    return jours == [date(2026, 8, 28), date(2026, 8, 28), ANCRAGE, ANCRAGE]


def cas_vrai_lendemain_a_23h03():
    """LE bug du 27/10 : a 23:03, le premier depart restant est a 00:25 demain."""
    jours = dater("23:03", ["00:25", "06:00", "14:00", "22:30"])
    return set(jours) == {date(2026, 8, 30)}


def cas_lendemain_puis_passage_de_minuit():
    """Le tableau couvre ~25 h : parti de demain 00:25, il peut toucher apres-demain."""
    jours = dater("23:30", ["00:25", "22:30", "23:55", "00:10"])
    return jours == [date(2026, 8, 30), date(2026, 8, 30), date(2026, 8, 30),
                     date(2026, 8, 31)]


def cas_vol_retarde_en_tete_de_soiree():
    """Un vol de 19:05 retarde reste en tete a 23:03 : c'est bien aujourd'hui."""
    jours = dater("23:03", ["19:05", "23:55", "00:25"])
    return jours == [ANCRAGE, ANCRAGE, date(2026, 8, 30)]


def cas_tableau_vide():
    return dater("04:50", []) == []


def cas_horaires_illisibles():
    """Une ligne sans horaire exploitable ne doit pas decaler le reste."""
    jours = dater("14:00", [None, "15:00", "16:00"])
    return set(jours) == {ANCRAGE}


CAS = [
    ("creux nocturne 04:50 (le bug du 29/08)", cas_creux_nocturne_du_29_08),
    ("creux nocturne 03:00", cas_creux_nocturne_tot),
    ("vraie veille, capture a 00:30", cas_vraie_veille_a_minuit_trente),
    ("vraie veille, capture a 01:15", cas_vraie_veille_a_une_heure),
    ("journee ordinaire, capture a 14:00", cas_journee_ordinaire),
    ("passage de minuit dans le tableau", cas_passage_de_minuit_dans_le_tableau),
    ("veille puis passage de minuit", cas_veille_puis_passage_de_minuit),
    ("vrai lendemain, capture a 23:03 (le bug du 27/10)", cas_vrai_lendemain_a_23h03),
    ("lendemain puis passage de minuit", cas_lendemain_puis_passage_de_minuit),
    ("vol retarde en tete de soiree", cas_vol_retarde_en_tete_de_soiree),
    ("tableau vide", cas_tableau_vide),
    ("horaires illisibles", cas_horaires_illisibles),
]


def main():
    echecs = 0
    print("Ancrage de journee : recul d'un jour au-dela de {} min d'ecart".format(
        __import__("parsers").ANCRAGE_VEILLE_MIN))
    print()
    for nom, fn in CAS:
        try:
            ok = bool(fn())
        except Exception as e:
            ok = False
            nom = "{} [{}]".format(nom, e)
        if not ok:
            echecs += 1
        print("[{v}] {n}".format(v="OK  " if ok else "ECHEC", n=nom))

    print()
    if echecs:
        print("{} ECHEC(S) sur {} cas".format(echecs, len(CAS)))
        return 1
    print("{} cas verts".format(len(CAS)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
