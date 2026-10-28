#!/usr/bin/env python3
"""Tests de la garde contre un tableau qui n'est pas celui de l'aeroport.

Le JSON Fraport de Chania a servi DEUX fois, le temps d'un seul passage, la liste d'un
autre aeroport : 71 arrivees le 10/08/2026 a 11:45, 45 departs le 09/10 a 13:37. Aucun de
ces numeros de vol n'apparait a Chania a +/- 3 jours, les provenances ne collent pas
(Zakynthos, Larnaca), et aucun n'a ete revu au passage suivant. Le JSON ne porte pas le
code de l'aeroport : rien dans la reponse ne permet de les refuser. Ces journees ont ete
comptees a 143 et 108 vols au lieu de ~72 et ~63.

Ce qui les trahit, c'est la continuite : d'un passage a l'autre, dix minutes plus tard, le
tableau glisse de quelques vols. Un tableau qui ne partage presque rien avec le passage
precedent n'est pas le meme tableau.

Lancer : python3 test_garde_tableau.py
"""

import sys

from parsers import tableau_etranger


def vols(prefixe, n):
    return {f"{prefixe}{i}" for i in range(n)}


def cas_le_10_08_chq():
    """LE cas : 71 vols, aucun vu au passage precedent qui en comptait 19."""
    return tableau_etranger(vols("X", 71), vols("A", 19))


def cas_glissement_ordinaire():
    """Dix minutes plus tard, 2 vols sortent et 2 entrent : meme tableau."""
    precedent = vols("A", 19)
    courant = (precedent - {"A0", "A1"}) | {"B0", "B1"}
    return not tableau_etranger(courant, precedent)


def cas_reprise_apres_gel_her_27_10():
    """Le tableau HER revient de 27 a 95 vols : 27 deja vus, c'est une reprise."""
    precedent = vols("A", 27)
    return not tableau_etranger(precedent | vols("B", 68), precedent)


def cas_pas_de_passage_precedent():
    """Premier passage, ou collecte interrompue : rien a comparer, on prend."""
    return not tableau_etranger(vols("X", 71), set())


def cas_petit_tableau_de_nuit():
    """Tres peu de vols de part et d'autre : trop peu pour juger, on prend."""
    return not tableau_etranger(vols("X", 4), vols("A", 3))


def cas_tableau_vide():
    return not tableau_etranger(set(), vols("A", 19))


CAS = [
    ("tableau etranger du 10/08 (CHQ)", cas_le_10_08_chq),
    ("glissement ordinaire de 10 minutes", cas_glissement_ordinaire),
    ("reprise apres le gel HER du 27/10", cas_reprise_apres_gel_her_27_10),
    ("pas de passage precedent", cas_pas_de_passage_precedent),
    ("petit tableau de nuit", cas_petit_tableau_de_nuit),
    ("tableau vide", cas_tableau_vide),
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
