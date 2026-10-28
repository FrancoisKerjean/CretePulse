#!/usr/bin/env python3
"""Tests des bandes saisonnieres du watchdog flux.

Du 25 au 28/10/2026, les bandes fixes d'ete ont envoye 72 alertes : l'horaire d'hiver IATA
fait passer CHQ de ~50 a ~26 vols par jour, ce qui n'est pas une panne. Dans le meme
temps, le tableau HER avait reellement gele (34 a 45 vols au lieu de ~100) : la vraie panne
et la fausse alerte arrivaient melangees, dans le meme message.

Ces cas figent la separation, sur les chiffres reels de ces journees et la reference HCAA.

Lancer : python3 test_watchdog_saison.py
"""

import sys
from datetime import date, datetime, timezone

from watchdog import bandes_saisonnieres, evaluate, reference_du_jour

# Vols par jour officiels HCAA (2025 pour sept-dec, 2026 pour jan-aout), arrondis.
HER = {1: 17.5, 2: 17.4, 3: 22.0, 4: 70.2, 5: 116.3, 6: 150.5, 7: 172.1, 8: 177.1,
       9: 157.5, 10: 126.8, 11: 36.5, 12: 23.9}
CHQ = {1: 9.1, 2: 9.3, 3: 10.9, 4: 28.2, 5: 51.7, 6: 67.5, 7: 75.6, 8: 72.6,
       9: 64.3, 10: 50.0, 11: 12.0, 12: 9.9}
K_HER = ("flight_arrivals", "HER", "arrival")
K_CHQ = ("flight_arrivals", "CHQ", "arrival")
REFS = {K_HER: HER, K_CHQ: CHQ}
NOW = datetime(2026, 10, 28, 1, 20, tzinfo=timezone.utc)


def alertes(jour, comptes):
    """Alertes de plausibilite seules : tous les capteurs frais."""
    bandes = bandes_saisonnieres(REFS, jour)
    tous = {("flight_arrivals", n, d) for n in ("HER", "CHQ") for d in ("arrival", "departure")}
    daily = {k: 0 for k in tous}
    daily.update(comptes)
    sortie = evaluate({k: NOW for k in tous}, daily, NOW, bandes=bandes)
    return [a for a in sortie if a.startswith(("HER (aéroport) arrivées", "CHQ (aéroport) arrivées"))]


def cas_milieu_de_mois_vaut_le_mois():
    return round(reference_du_jour(HER, date(2026, 10, 15)), 1) == 126.8


def cas_interpolation_entre_deux_mois():
    """Le 31/10 est a mi-chemin du 15/10 et du 15/11 : ni octobre, ni novembre."""
    ref = reference_du_jour(HER, date(2026, 10, 31))
    return 36.5 < ref < 126.8 and abs(ref - (126.8 + 36.5) / 2) < 5


def cas_passage_d_annee():
    """Le 05/01 s'interpole entre le 15/12 et le 15/01, sans planter sur le mois 0."""
    ref = reference_du_jour(HER, date(2027, 1, 5))
    return 17.5 <= ref <= 23.9


def cas_mois_manquant():
    return reference_du_jour({10: 126.8}, date(2026, 10, 28)) is None


def cas_bascule_hiver_chq_ne_sonne_plus():
    """LE faux positif du 26/10 : CHQ a 25 vols, horaire d'hiver, pas une panne."""
    return alertes(date(2026, 10, 26), {K_HER: 90, K_CHQ: 25}) == []


def cas_gel_her_sonne():
    """LA vraie panne du 26/10 : le tableau HER n'affichait plus que 34 vols."""
    sortie = alertes(date(2026, 10, 26), {K_HER: 34, K_CHQ: 25})
    return len(sortie) == 1 and sortie[0].startswith("HER (aéroport) arrivées : 34 vols")


def cas_janvier_ordinaire_ne_sonne_pas():
    """L'hiver profond : 18 vols a HER et 9 a CHQ un jour de janvier, c'est normal."""
    return alertes(date(2027, 1, 20), {K_HER: 18, K_CHQ: 9}) == []


def cas_doublons_d_ete_sonnent():
    """Le bug du 29/08 : 279 vols comptes a HER au lieu de 173."""
    return len(alertes(date(2026, 8, 28), {K_HER: 279, K_CHQ: 72})) == 1


def cas_repli_sur_la_bande_fixe():
    """Sans reference, la bande fixe reprend la main : la sonde ne devient pas muette."""
    tous = {("flight_arrivals", n, d) for n in ("HER", "CHQ") for d in ("arrival", "departure")}
    daily = {k: 120 for k in tous}
    daily[K_HER] = 30
    sortie = evaluate({k: NOW for k in tous}, daily, NOW, bandes={})
    return sortie == ["HER (aéroport) arrivées : 30 vols hier, hors bande 100-260"]


CAS = [
    ("milieu de mois = valeur du mois", cas_milieu_de_mois_vaut_le_mois),
    ("interpolation entre deux mois", cas_interpolation_entre_deux_mois),
    ("passage d'annee", cas_passage_d_annee),
    ("mois manquant -> pas de reference", cas_mois_manquant),
    ("bascule d'hiver CHQ 26/10 : silence", cas_bascule_hiver_chq_ne_sonne_plus),
    ("gel du tableau HER 26/10 : alerte", cas_gel_her_sonne),
    ("janvier ordinaire : silence", cas_janvier_ordinaire_ne_sonne_pas),
    ("doublons d'ete 29/08 : alerte", cas_doublons_d_ete_sonnent),
    ("repli sur la bande fixe", cas_repli_sur_la_bande_fixe),
]


def main():
    echecs = 0
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
