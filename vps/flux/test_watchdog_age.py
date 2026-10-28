#!/usr/bin/env python3
"""Tests de l'age porte par les alertes du watchdog flux.

Ce capteur a envoye 641 messages entre le 30/07 et le 29/08/2026, 23 a 47 par jour, tous
formules pareil, pendant qu'une corruption de donnees durait. Il avait RAISON des le
30/07 a 02:20, le lendemain de l'apparition du bug. Le 641e message etait identique au
premier, et le bandeau du canal `system` annonce « Surveillance automatique, rien a faire » :
le lecteur a eu raison de ne pas l'ouvrir.

Ces cas figent ce qui manquait : une alerte doit dire depuis quand elle dure, et cesser de
se presenter comme de la surveillance passive quand ca dure.

Le piege central est l'IDENTITE de l'alerte. Le texte porte des chiffres qui changent chaque
jour (« 279 vols hier » devient « 280 vols hier ») : s'en servir comme cle ferait repartir
le compteur a chaque run, et l'alerte n'aurait toujours pas d'age -- exactement le defaut
qu'on repare.

Lancer : python3 test_watchdog_age.py
"""

import sys
from datetime import date

from watchdog import JOURS_AVANT_ACTION, _cle_stable, dater_alertes

J1 = date(2026, 7, 30)
J31 = date(2026, 8, 29)

HER_279 = "HER (aéroport) arrivées : 279 vols hier, hors bande 100-260"
HER_280 = "HER (aéroport) arrivées : 280 vols hier, hors bande 100-260"
HER_MUET = "HER (aéroport) arrivées : muet depuis 3 h 20"
CHQ_HS = "CHQ (aéroport) départs : 12 vols hier, hors bande 40-140"


def cas_premier_envoi_sans_suffixe():
    """Une alerte neuve n'a pas d'age a annoncer : ne pas encombrer le message."""
    sorties, hist, jours = dater_alertes([HER_279], {}, J1)
    return sorties == [HER_279] and jours == 0 and len(hist) == 1


def cas_deuxieme_envoi_date():
    sorties, hist, _ = dater_alertes([HER_279], {}, J1)
    sorties, hist, jours = dater_alertes([HER_279], hist, J1)
    return sorties[0].endswith("[0 j, 2e envoi]") and jours == 0


def cas_le_chiffre_change_mais_lidentite_tient():
    """LE piege : 279 devient 280 le lendemain. Le compteur ne doit PAS repartir."""
    _, hist, _ = dater_alertes([HER_279], {}, J1)
    sorties, hist, jours = dater_alertes([HER_280], hist, date(2026, 7, 31))
    return sorties[0].endswith("[1 j, 2e envoi]") and jours == 1 and len(hist) == 1


def cas_un_mois_de_repetition():
    """Le scenario reel : 641 envois sur 30 jours. Le message doit le dire."""
    hist = {_cle_stable(HER_279): {"depuis": J1.isoformat(), "envois": 640}}
    sorties, _, jours = dater_alertes([HER_279], hist, J31)
    return sorties[0].endswith("[30 j, 641e envoi]") and jours == 30


def cas_seuil_daction():
    """Au-dela de JOURS_AVANT_ACTION, notify() bascule sur le canal ACTION."""
    hist = {_cle_stable(HER_279): {"depuis": J1.isoformat(), "envois": 5}}
    _, _, jours = dater_alertes([HER_279], hist, J1 + __import__("datetime").timedelta(
        days=JOURS_AVANT_ACTION))
    return jours >= JOURS_AVANT_ACTION


def cas_alerte_qui_cesse_disparait():
    """Une alerte resolue ne doit pas ressusciter avec son ancien compteur."""
    hist = {_cle_stable(HER_279): {"depuis": J1.isoformat(), "envois": 640},
            _cle_stable(CHQ_HS): {"depuis": J1.isoformat(), "envois": 3}}
    _, hist, _ = dater_alertes([CHQ_HS], hist, J31)
    return list(hist) == [_cle_stable(CHQ_HS)]


def cas_deux_alertes_ages_independants():
    hist = {_cle_stable(HER_279): {"depuis": J1.isoformat(), "envois": 100}}
    sorties, _, jours = dater_alertes([HER_279, CHQ_HS], hist, J31)
    return (sorties[0].endswith("[30 j, 101e envoi]")
            and sorties[1] == CHQ_HS      # neuve : pas de suffixe
            and jours == 30)              # l'age retenu est celui de la plus ancienne


def cas_muet_depuis_change_de_duree():
    """« muet depuis 3 h 20 » puis « 4 h 05 » : meme panne, pas deux alertes."""
    _, hist, _ = dater_alertes([HER_MUET], {}, J1)
    sorties, hist, _ = dater_alertes(
        ["HER (aéroport) arrivées : muet depuis 4 h 05"], hist, J1)
    return sorties[0].endswith("[0 j, 2e envoi]") and len(hist) == 1


def cas_historique_corrompu():
    """Une date illisible ne doit pas faire tomber le watchdog : il doit alerter."""
    hist = {_cle_stable(HER_279): {"depuis": "pas-une-date", "envois": 12}}
    sorties, _, jours = dater_alertes([HER_279], hist, J31)
    return sorties[0].endswith("[0 j, 13e envoi]") and jours == 0


CAS = [
    ("premier envoi : pas de suffixe", cas_premier_envoi_sans_suffixe),
    ("deuxieme envoi : date et compte", cas_deuxieme_envoi_date),
    ("le chiffre change, l'identite tient", cas_le_chiffre_change_mais_lidentite_tient),
    ("un mois de repetition : 30 j, 641e", cas_un_mois_de_repetition),
    ("seuil de bascule vers ACTION", cas_seuil_daction),
    ("alerte resolue : compteur efface", cas_alerte_qui_cesse_disparait),
    ("deux alertes, ages independants", cas_deux_alertes_ages_independants),
    ("« muet depuis » : duree qui change", cas_muet_depuis_change_de_duree),
    ("historique corrompu : alerte quand meme", cas_historique_corrompu),
]


def main():
    echecs = 0
    print("Age des alertes : bascule vers ACTION apres {} jours".format(JOURS_AVANT_ACTION))
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
